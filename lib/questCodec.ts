import LZString from "lz-string";
import type { QuestBundle, QuestNote, QuestOption } from "@/types/quest";

/*
 * Wire format: the whole quest rides inside `?q=`. We LZ-compress the
 * JSON before encoding, which roughly halves text/location links (and
 * trims even image links a little).
 *
 * Compression is synchronous on purpose — every decode site
 * (InviteScene's useMemo, the OG edge route, generateMetadata) stays
 * sync, so adding compression didn't ripple through the app.
 *
 * The wire string uses lz-string's *base64* output run through the
 * url-safe substitution below. We deliberately do NOT use
 * `compressToEncodedURIComponent`: its alphabet contains `+`, which
 * `URLSearchParams` (what `useSearchParams().get("q")` uses) turns into
 * a space — silently corrupting the payload. base64url has no `+`.
 *
 * `decodeQuestBundle` also accepts the pre-compression format (plain
 * base64url JSON) so links shared before this change still open.
 */

/** Standard base64 → url-safe (no `+` `/` `=`). */
function b64ToUrlSafe(b64: string): string {
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Url-safe → standard base64 (re-pad for atob-based decoders). */
function urlSafeToB64(value: string): string {
  const padded = value.padEnd(
    value.length + ((4 - (value.length % 4)) % 4),
    "=",
  );
  return padded.replace(/-/g, "+").replace(/_/g, "/");
}

/** Legacy decoder: base64url → UTF-8 string (pre-compression links). */
function fromBase64Url(value: string): string {
  const base64 = urlSafeToB64(value);
  if (typeof atob === "function" && typeof globalThis.TextDecoder !== "undefined") {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  }
  if (typeof Buffer !== "undefined") {
    return Buffer.from(base64, "base64").toString("utf-8");
  }
  return decodeURIComponent(escape(atob(base64)));
}

/* ----------------- QuestBundle wire format ----------------- */

export function encodeQuestBundle(bundle: QuestBundle): string {
  return b64ToUrlSafe(LZString.compressToBase64(JSON.stringify(bundle)));
}

export function decodeQuestBundle(encoded: string): QuestBundle | null {
  // Current format: lz-compressed.
  try {
    const json = LZString.decompressFromBase64(urlSafeToB64(encoded));
    if (json) {
      const parsed = JSON.parse(json);
      if (isQuestBundle(parsed)) return parsed;
    }
  } catch {
    /* not a compressed payload — try the legacy path below */
  }

  // Legacy format: plain base64url JSON (links shared before
  // compression landed).
  try {
    const parsed = JSON.parse(fromBase64Url(encoded));
    return isQuestBundle(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/* ----------------- Runtime validation ----------------- */

function isQuestNote(value: unknown): value is QuestNote {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (v.kind === "text") {
    return typeof v.text === "string";
  }
  if (v.kind === "image") {
    return typeof v.image === "string" && typeof v.caption === "string";
  }
  if (v.kind === "location") {
    if (typeof v.place !== "string" || typeof v.address !== "string") {
      return false;
    }
    // lat/lng are optional; reject only if present and non-numeric.
    if (v.lat !== undefined && typeof v.lat !== "number") return false;
    if (v.lng !== undefined && typeof v.lng !== "number") return false;
    return true;
  }
  return false;
}

function isQuestOption(value: unknown): value is QuestOption {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  const requiredStrings = ["title", "activity", "dateTimeText", "reward"];
  for (const k of requiredStrings) {
    if (typeof v[k] !== "string") return false;
  }
  if (!isQuestNote(v.note)) return false;
  if (!isDifficulty(v.difficulty)) return false;
  return true;
}

function isQuestBundle(value: unknown): value is QuestBundle {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  const requiredStrings = ["recipientName", "senderName", "createdAt"];
  for (const k of requiredStrings) {
    if (typeof v[k] !== "string") return false;
  }
  if (!isTheme(v.theme)) return false;
  if (!Array.isArray(v.options) || v.options.length === 0) return false;
  if (!v.options.every(isQuestOption)) return false;
  // `ending` is optional (legacy links omit it); reject only if present
  // and malformed.
  if (v.ending !== undefined && !isQuestEnding(v.ending)) return false;
  return true;
}

function isQuestEnding(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (typeof v.message !== "string" || typeof v.image !== "string") {
    return false;
  }
  // Location is optional. Reject only when present-and-malformed.
  if (v.location !== undefined) {
    const loc = v.location as Record<string, unknown> | null;
    if (!loc || typeof loc !== "object") return false;
    if (typeof loc.place !== "string" || typeof loc.address !== "string") {
      return false;
    }
    if (loc.lat !== undefined && typeof loc.lat !== "number") return false;
    if (loc.lng !== undefined && typeof loc.lng !== "number") return false;
  }
  return true;
}

function isDifficulty(v: unknown): boolean {
  return v === "cozy" || v === "normal" || v === "legendary" || v === "secret";
}

function isTheme(v: unknown): boolean {
  return v === "tavern" || v === "forest" || v === "pixel";
}
