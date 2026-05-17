import type { QuestBundle, QuestOption } from "@/types/quest";

// Base64url is base64 with URL-safe characters and no padding.
// We use it so the entire quest payload fits inline in `?q=`.

function toBase64Url(value: string): string {
  const utf8 =
    typeof globalThis.TextEncoder !== "undefined"
      ? new TextEncoder().encode(value)
      : null;

  let base64: string;
  if (utf8 && typeof btoa === "function") {
    let binary = "";
    for (let i = 0; i < utf8.length; i++) {
      binary += String.fromCharCode(utf8[i]);
    }
    base64 = btoa(binary);
  } else if (typeof Buffer !== "undefined") {
    base64 = Buffer.from(value, "utf-8").toString("base64");
  } else {
    base64 = btoa(unescape(encodeURIComponent(value)));
  }

  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): string {
  const padded = value.padEnd(
    value.length + ((4 - (value.length % 4)) % 4),
    "=",
  );
  const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");

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
  return toBase64Url(JSON.stringify(bundle));
}

export function decodeQuestBundle(encoded: string): QuestBundle | null {
  try {
    const json = fromBase64Url(encoded);
    const parsed = JSON.parse(json);
    return isQuestBundle(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/* ----------------- Runtime validation ----------------- */

function isQuestOption(value: unknown): value is QuestOption {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.title === "string" && typeof v.activity === "string";
}

function isQuestBundle(value: unknown): value is QuestBundle {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  const requiredStrings = [
    "recipientName",
    "senderName",
    "message",
    "dateTimeText",
    "reward",
    "createdAt",
  ];
  for (const k of requiredStrings) {
    if (typeof v[k] !== "string") return false;
  }
  if (!isDifficulty(v.difficulty)) return false;
  if (!isTheme(v.theme)) return false;
  if (!Array.isArray(v.options) || v.options.length === 0) return false;
  if (!v.options.every(isQuestOption)) return false;
  return true;
}

function isDifficulty(v: unknown): boolean {
  return v === "cozy" || v === "normal" || v === "legendary" || v === "secret";
}

function isTheme(v: unknown): boolean {
  return v === "tavern" || v === "forest" || v === "pixel";
}
