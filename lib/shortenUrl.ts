"use client";

/**
 * Thin client wrapper around `/api/shorten`. Returns either the short
 * URL on success or a human-readable error string on failure. Never
 * throws — every failure mode produces an `{ error }` result so call
 * sites don't have to manage exceptions.
 */

export type ShortenResult =
  | { ok: true; shortUrl: string }
  | { ok: false; error: string };

export async function shortenUrl(url: string): Promise<ShortenResult> {
  try {
    const res = await fetch("/api/shorten", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    let data: { shortUrl?: string; error?: string } = {};
    try {
      data = await res.json();
    } catch {
      /* body wasn't JSON — fall through to the generic error below */
    }

    if (res.ok && data.shortUrl) {
      return { ok: true, shortUrl: data.shortUrl };
    }
    return {
      ok: false,
      error: data.error || "Couldn't shorten the link just now.",
    };
  } catch {
    return {
      ok: false,
      error: "Couldn't reach the shortener. Check your connection and try again.",
    };
  }
}
