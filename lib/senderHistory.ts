"use client";

/**
 * Sender history — a tiny localStorage-backed list of recent quests the
 * sender has shared. Lets them re-open / duplicate something they sent
 * yesterday without digging through chat threads.
 *
 * Privacy: everything lives on the sender's own device. Nothing is sent
 * anywhere. Cleared by clicking "Forget all" on /create, or by
 * normal browser site-data clears.
 *
 * Cap is small (8) so the localStorage budget stays modest — a bundle
 * with an image note can be 20KB+, and we don't want a single
 * over-eager creator to blow past the 5MB browser quota.
 *
 * The store is best-effort: every read is wrapped in try/catch, writes
 * silently drop on quota errors. The form keeps working either way.
 */

const STORAGE_KEY = "questboard:history:v1";
const MAX_ENTRIES = 8;

export type HistoryEntry = {
  /** Encoded bundle suitable for `/invite?q=`. */
  encoded: string;
  /** Recipient name at the time of recording (for the chip label). */
  recipientName: string;
  /** How many quest options were in the bundle, for the chip subtitle. */
  optionCount: number;
  /** ISO 8601 timestamp of when the entry was recorded. */
  savedAt: string;
};

function isBrowser(): boolean {
  return (
    typeof window !== "undefined" && typeof window.localStorage !== "undefined"
  );
}

// `useSyncExternalStore` requires the snapshot to be referentially
// stable between calls when the underlying store hasn't changed — if
// we return a fresh `[]` (or a freshly-parsed array) every time, React
// detects "the value changed" on every render and loops forever.
//
// We cache the parsed array keyed by the raw JSON string in localStorage:
// same raw → same array reference, parsed only on first read after a
// change. The `notify()` writer path doesn't need to invalidate this
// cache explicitly — the raw string itself changes, so the next read
// re-parses naturally.
let cachedRaw: string | null | undefined = undefined;
let cachedEntries: HistoryEntry[] = [];
const EMPTY_ENTRIES: HistoryEntry[] = [];

/**
 * Read all entries, newest first. Returns `[]` on any error or if the
 * payload doesn't match the expected shape — we never want a malformed
 * record to crash the form. The empty `[]` is the same module-level
 * constant on each call, satisfying `useSyncExternalStore`'s referential
 * stability requirement.
 */
export function loadHistory(): HistoryEntry[] {
  if (!isBrowser()) return EMPTY_ENTRIES;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return EMPTY_ENTRIES;
  }
  if (raw === cachedRaw) {
    return cachedEntries;
  }
  cachedRaw = raw;
  if (!raw) {
    cachedEntries = EMPTY_ENTRIES;
    return cachedEntries;
  }
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      cachedEntries = EMPTY_ENTRIES;
      return cachedEntries;
    }
    cachedEntries = parsed.filter(isValidEntry).slice(0, MAX_ENTRIES);
    return cachedEntries;
  } catch {
    cachedEntries = EMPTY_ENTRIES;
    return cachedEntries;
  }
}

/**
 * Record a sent quest. If an entry with the same `encoded` exists, it
 * gets promoted to the top instead of duplicated — repeated copies of
 * the same link don't blow the budget.
 */
export function recordSend(entry: Omit<HistoryEntry, "savedAt">): void {
  if (!isBrowser()) return;
  if (!entry.encoded) return;
  try {
    const existing = loadHistory();
    const filtered = existing.filter((e) => e.encoded !== entry.encoded);
    const next: HistoryEntry[] = [
      { ...entry, savedAt: new Date().toISOString() },
      ...filtered,
    ].slice(0, MAX_ENTRIES);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    notify();
  } catch {
    /* quota exceeded, private mode, etc. — silently drop */
  }
}

/** Remove a single entry by its encoded value. */
export function removeFromHistory(encoded: string): void {
  if (!isBrowser()) return;
  try {
    const next = loadHistory().filter((e) => e.encoded !== encoded);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    notify();
  } catch {
    /* ignore */
  }
}

/** Wipe the history entirely. Surfaced by the "Forget all" button. */
export function clearHistory(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    notify();
  } catch {
    /* ignore */
  }
}

/* -------- Subscription so the UI re-renders on writes -------- */

// Hand-rolled pub/sub so a `recordSend` from one component (e.g. the
// link panel) re-renders another (the history rail) without props
// drilling. Same pattern as `lib/audio.ts`.

type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribeHistory(cb: Listener): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function notify(): void {
  listeners.forEach((cb) => {
    try {
      cb();
    } catch {
      /* listener errors shouldn't break the writer */
    }
  });
}

/* ----------------------- Validation ----------------------- */

function isValidEntry(value: unknown): value is HistoryEntry {
  if (!value || typeof value !== "object") return false;
  const e = value as Record<string, unknown>;
  return (
    typeof e.encoded === "string" &&
    e.encoded.length > 0 &&
    typeof e.recipientName === "string" &&
    typeof e.optionCount === "number" &&
    typeof e.savedAt === "string"
  );
}

/* ----------------------- Time formatting ----------------------- */

/**
 * Same friendly format as `lib/draft.ts:formatSavedAt`, copy-pasted
 * deliberately so we don't import a draft-specific function into the
 * history surface area.
 */
export function formatHistoryAt(savedAt: string): string {
  const then = new Date(savedAt).getTime();
  if (Number.isNaN(then)) return "earlier";
  const diff = Date.now() - then;
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours === 1 ? "an hour ago" : `${hours} hours ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return days === 1 ? "yesterday" : `${days} days ago`;
  return new Date(savedAt).toLocaleDateString();
}
