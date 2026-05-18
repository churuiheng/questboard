import { NextResponse } from "next/server";

/**
 * `/api/shorten` — server-side proxy for URL shortening.
 *
 * Why a proxy? The popular free shorteners (TinyURL, CleanURI) don't
 * set CORS headers, so calling them from the browser fails. Routing
 * through this endpoint sidesteps CORS entirely and gives us one place
 * to add fallbacks, validation, and rate-limiting later if needed.
 *
 * Two providers, tried in order:
 *   1. TinyURL — simple GET, fast, returns the short URL as plain text.
 *      Reliable for URLs up to ~5–10 KB; rejects very long ones.
 *   2. CleanURI — POST with a form body, returns JSON. Documented to
 *      handle longer URLs, useful as a fallback when TinyURL refuses.
 *
 * Runs on the Edge runtime so it's cheap and globally distributed.
 *
 * Limits: refuses URLs over 30 KB outright — no free shortener will
 * carry an image-note bundle of that scale, and we'd rather fail fast
 * with a friendly message than 502 after a slow fetch.
 */
export const runtime = "edge";

type ShortenSuccess = { shortUrl: string };
type ShortenFailure = { error: string };

const MAX_URL_LENGTH = 30_000;

export async function POST(req: Request): Promise<NextResponse> {
  let url: string | undefined;
  try {
    const body = (await req.json()) as { url?: unknown };
    if (typeof body.url === "string") url = body.url.trim();
  } catch {
    return jsonError("That request couldn't be parsed.", 400);
  }

  if (!url) {
    return jsonError("Missing url.", 400);
  }
  if (!/^https?:\/\//.test(url)) {
    return jsonError("Only http(s) URLs can be shortened.", 400);
  }
  if (url.length > MAX_URL_LENGTH) {
    return jsonError(
      "This link is too long for the free shorteners. Try removing the image note, or switch it to a text note.",
      413,
    );
  }

  // Try TinyURL first — it's fastest when it works.
  const tiny = await tryTinyUrl(url);
  if (tiny) {
    return NextResponse.json<ShortenSuccess>({ shortUrl: tiny });
  }

  // Fall back to CleanURI — slower but tolerates longer URLs.
  const clean = await tryCleanUri(url);
  if (clean) {
    return NextResponse.json<ShortenSuccess>({ shortUrl: clean });
  }

  return jsonError(
    "Couldn't reach the URL shorteners just now. Try again in a moment.",
    502,
  );
}

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json<ShortenFailure>({ error: message }, { status });
}

async function tryTinyUrl(longUrl: string): Promise<string | null> {
  try {
    const target =
      "https://tinyurl.com/api-create.php?" +
      new URLSearchParams({ url: longUrl }).toString();
    const res = await fetch(target, { method: "GET" });
    if (!res.ok) return null;
    const text = (await res.text()).trim();
    return /^https?:\/\//.test(text) ? text : null;
  } catch {
    return null;
  }
}

async function tryCleanUri(longUrl: string): Promise<string | null> {
  try {
    const res = await fetch("https://cleanuri.com/api/v1/shorten", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ url: longUrl }).toString(),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { result_url?: string };
    if (typeof data.result_url === "string" && /^https?:\/\//.test(data.result_url)) {
      return data.result_url;
    }
    return null;
  } catch {
    return null;
  }
}
