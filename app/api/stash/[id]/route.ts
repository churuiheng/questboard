import { NextResponse } from "next/server";

/**
 * `/api/stash/[id]` — resolve a JSONblob ID back into the encoded
 * quest bundle. Called from `InviteScene` when the URL has `?s=<id>`
 * instead of (or in addition to) `?q=<encoded>`.
 *
 * Format mirrors the upload site in `/api/shorten`: the stored JSON
 * is `{ encoded: "<string>", v: 1 }`, and we return `{ encoded }` to
 * the client. The client then runs the existing decode pipeline.
 *
 * Same edge runtime as the writer for symmetry and cheap fan-out.
 */
export const runtime = "edge";

type Resolved = { encoded: string };
type ResolveError = { error: string };

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await ctx.params;
  if (!id || !/^[A-Za-z0-9_-]{1,64}$/.test(id)) {
    return NextResponse.json<ResolveError>(
      { error: "Bad stash id." },
      { status: 400 },
    );
  }

  try {
    const res = await fetch(`https://jsonblob.com/api/jsonBlob/${id}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      // Stashed bundles don't change; let the platform cache.
      cache: "force-cache",
    });
    if (res.status === 404) {
      return NextResponse.json<ResolveError>(
        { error: "That quest link couldn't be found — it may have expired." },
        { status: 404 },
      );
    }
    if (!res.ok) {
      return NextResponse.json<ResolveError>(
        { error: "Couldn't reach the storage service. Try again in a moment." },
        { status: 502 },
      );
    }
    const data = (await res.json()) as { encoded?: unknown };
    if (typeof data.encoded !== "string" || data.encoded.length === 0) {
      return NextResponse.json<ResolveError>(
        { error: "Stashed payload is malformed." },
        { status: 502 },
      );
    }
    return NextResponse.json<Resolved>({ encoded: data.encoded });
  } catch {
    return NextResponse.json<ResolveError>(
      { error: "Couldn't reach the storage service." },
      { status: 502 },
    );
  }
}
