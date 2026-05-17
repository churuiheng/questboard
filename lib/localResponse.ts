import type { BundleResponse, QuestBundle } from "@/types/quest";

// We don't have a backend, so responses live in the recipient's
// own localStorage. The sender never sees them. The MVP just lets a
// returning recipient see (and revisit) their own previous choice.

const STORAGE_PREFIX = "quest-response:";

/* ------------------------------------------------------------ Bundle id */

/**
 * Stable identifier for a bundle. Two bundles with identical shared
 * fields will share a key — that's fine, since "same quest from same
 * sender" really is the same quest from the recipient's perspective.
 */
export function getBundleId(bundle: QuestBundle): string {
  return `${bundle.senderName}|${bundle.recipientName}|${bundle.createdAt}`;
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

/* ----------------------------------------- BundleResponse: encode + IO */

/**
 * On-disk format is intentionally human-readable:
 *   "accepted:0"   → accepted option index 0
 *   "accepted:2"   → accepted option index 2
 *   "maybe_later"  → deferred
 *
 * This avoids JSON round-tripping for a value that's just two fields.
 */
function serializeResponse(r: BundleResponse): string {
  if (r.kind === "maybe_later") return "maybe_later";
  return `accepted:${r.optionIndex}`;
}

function parseResponse(s: string | null): BundleResponse | null {
  if (!s) return null;
  if (s === "maybe_later") return { kind: "maybe_later" };
  if (s.startsWith("accepted:")) {
    const idx = parseInt(s.slice("accepted:".length), 10);
    if (Number.isFinite(idx) && idx >= 0) {
      return { kind: "accepted", optionIndex: idx };
    }
  }
  return null;
}

/**
 * Cache of `(bundleId, rawString) → parsed response` so that repeated
 * calls to `getBundleResponse` for the same value return the same
 * object reference. This is load-bearing: `useSyncExternalStore` uses
 * `Object.is` to compare snapshots, and a fresh `{ kind, optionIndex }`
 * object each render would cause an infinite re-render loop.
 *
 * Only one entry per bundleId is retained — when the raw value changes
 * we evict and re-parse.
 */
const parsedCache = new Map<
  string,
  { raw: string | null; parsed: BundleResponse | null }
>();

function getCachedParsedResponse(
  bundleId: string,
  raw: string | null,
): BundleResponse | null {
  const cached = parsedCache.get(bundleId);
  if (cached && cached.raw === raw) return cached.parsed;
  const parsed = parseResponse(raw);
  parsedCache.set(bundleId, { raw, parsed });
  return parsed;
}

export function saveBundleResponse(
  bundleId: string,
  response: BundleResponse,
): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(
      `${STORAGE_PREFIX}${bundleId}`,
      serializeResponse(response),
    );
    // Drop the cached parse so the next getBundleResponse() re-reads
    // and produces a fresh reference reflecting the write.
    parsedCache.delete(bundleId);
  } catch {
    /* private mode or quota; silently ignore */
  }
}

export function getBundleResponse(bundleId: string): BundleResponse | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${bundleId}`);
    return getCachedParsedResponse(bundleId, raw);
  } catch {
    return null;
  }
}

export function clearBundleResponse(bundleId: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(`${STORAGE_PREFIX}${bundleId}`);
    parsedCache.delete(bundleId);
  } catch {
    /* ignore */
  }
}
