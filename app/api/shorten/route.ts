import { NextResponse } from "next/server";

/**
 * `/api/shorten` — server-side shortener.
 *
 * We deliberately use a single strategy: stash the encoded bundle on
 * JSONblob (a free anonymous JSON storage service) and return a tiny
 * `${origin}/invite?s=<id>` URL. The recipient page resolves the ID
 * via `/api/stash/<id>` and decodes the bundle.
 *
 * Why not also try public URL shorteners (TinyURL/CleanURI)? They
 * have become unreliable or deprecated for our use case — TinyURL
 * intermittently refuses, and CleanURI rate-limits aggressively. The
 * stash path produces equally short URLs (the host + ~10 chars) for
 * every quest, including image-note quests too big for any free
 * shortener to carry. One strategy, consistent behavior, no fallback
 * cliff.
 *
 * Runs on the Edge runtime so it's cheap and globally distributed.
 *
 * Limits: bundle payload over 200 KB is rejected outright — that's a
 * massive image and we don't want to abuse JSONblob's free tier.
 */
export const runtime = "edge";

type ShortenSuccess = { shortUrl: string };
type ShortenFailure = { error: string };

const STASH_MAX_PAYLOAD = 200_000;

export async function POST(req: Request): Promise<NextResponse> {
  let url: string | undefined;
  try {
    const body = (await req.json()) as { url?: unknown };
    if (typeof body.url === "string") url = body.url.trim();
  } catch {
    return jsonError("That request couldn't be parsed.", 400);
  }

  if (!url) return jsonError("Missing url.", 400);
  if (!/^https?:\/\//.test(url)) {
    return jsonError("Only http(s) URLs can be shortened.", 400);
  }

  // Extract the `?q=` payload — that's the chunk of data we persist.
  let encoded: string | null = null;
  let origin = "";
  try {
    const parsed = new URL(url);
    encoded = parsed.searchParams.get("q");
    origin = parsed.origin;
  } catch {
    return jsonError("Malformed URL.", 400);
  }

  if (!encoded) {
    return jsonError(
      "This URL has no ?q= payload to shorten.",
      400,
    );
  }
  if (encoded.length > STASH_MAX_PAYLOAD) {
    return jsonError(
      "This quest is too large to share. Try removing the image note.",
      413,
    );
  }

  const stashId = await stashOnJsonBlob(encoded);
  if (!stashId) {
    return jsonError(
      "Couldn't reach the storage service just now. Try again in a moment.",
      502,
    );
  }

  const shortUrl = `${origin}/invite?s=${stashId}`;
  return NextResponse.json<ShortenSuccess>({ shortUrl });
}

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json<ShortenFailure>({ error: message }, { status });
}

/**
 * Stash the encoded bundle on JSONblob. The service accepts arbitrary
 * JSON anonymously and returns a Location header pointing at the new
 * blob (e.g. `/api/jsonBlob/abc123…`). We extract just the ID; the
 * sibling route `/api/stash/[id]` resolves it back at render time.
 *
 * Returns null on any failure (network, non-2xx, missing Location).
 */
async function stashOnJsonBlob(encoded: string): Promise<string | null> {
  try {
    const res = await fetch("https://jsonblob.com/api/jsonBlob", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      // Wrap the encoded string so the blob is valid JSON and we can
      // attach metadata later without a breaking change.
      body: JSON.stringify({ encoded, v: 1 }),
    });
    if (!res.ok) return null;
    const location = res.headers.get("Location");
    if (!location) return null;
    const id = location.split("/").filter(Boolean).pop();
    return id && /^[A-Za-z0-9_-]+$/.test(id) ? id : null;
  } catch {
    return null;
  }
}
