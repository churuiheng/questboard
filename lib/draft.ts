"use client";

import type { QuestBundle, QuestOption } from "@/types/quest";

/**
 * Tiny draft-persistence layer for the /create form.
 *
 * UX principle in play: never lose user data silently. If someone fills
 * out a quest and accidentally closes the tab, hits refresh, or comes
 * back the next day, we want their draft to still be there.
 *
 * Everything is best-effort — private mode, quota errors, JSON parse
 * failures all degrade silently. The form keeps working either way.
 *
 * The storage key is versioned. When the bundle shape changes in a
 * non-backward-compatible way (e.g. moving a field from shared to
 * per-option), bump the version suffix — old drafts then silently
 * become unreadable rather than crashing the form with missing fields.
 */

// v3: `message: string` became `note: QuestNote` (text | image). Old v2
// drafts have no `note`, so `isValidOptionShape` would reject them
// anyway — the version bump just skips the doomed parse entirely.
const STORAGE_KEY = "questboard:draft:v3";

export type DraftEnvelope = {
  bundle: QuestBundle;
  /** ISO 8601 timestamp of the last edit. */
  savedAt: string;
};

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

/** Save the current bundle. Called by the form on every edit. */
export function saveDraft(bundle: QuestBundle): void {
  if (!isBrowser()) return;
  try {
    const envelope: DraftEnvelope = {
      bundle,
      savedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
  } catch {
    /* private mode, quota — silently ignore */
  }
}

/**
 * Read the most-recent draft, if any. Returns null if there's no draft
 * stored, the payload is malformed, the bundle shape doesn't match
 * what the current code expects (schema migration), or the bundle is
 * just a brand-new default (no actual user input yet).
 */
export function loadDraft(): DraftEnvelope | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DraftEnvelope;
    if (!parsed?.bundle || typeof parsed.savedAt !== "string") return null;
    if (!isValidBundleShape(parsed.bundle)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Friendly "5 minutes ago" / "yesterday" formatter. Falls back to the
 * full date for anything older than a week.
 */
export function formatSavedAt(savedAt: string): string {
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

/**
 * Heuristic: is this bundle the freshly-created default, or has the
 * user actually customized it? We only treat it as a "real draft"
 * once the user has touched at least one user-meaningful field.
 */
export function isDraftWorthRestoring(bundle: QuestBundle): boolean {
  if (!isValidBundleShape(bundle)) return false;
  return (
    bundle.recipientName.trim().length > 0 ||
    bundle.options.length > 1 ||
    bundle.options.some(
      (opt) => opt.title.trim() !== "" && opt.activity.trim() !== "",
    )
  );
}

/**
 * Runtime shape guard. Catches drafts that were saved under an older
 * schema (e.g. before per-option fields) and rejects them so the form
 * never reads a missing property.
 */
function isValidBundleShape(bundle: unknown): bundle is QuestBundle {
  if (!bundle || typeof bundle !== "object") return false;
  const b = bundle as Record<string, unknown>;
  if (typeof b.recipientName !== "string") return false;
  if (typeof b.senderName !== "string") return false;
  if (typeof b.createdAt !== "string") return false;
  if (!Array.isArray(b.options) || b.options.length === 0) return false;
  return b.options.every(isValidOptionShape);
}

function isValidOptionShape(option: unknown): option is QuestOption {
  if (!option || typeof option !== "object") return false;
  const o = option as Record<string, unknown>;
  return (
    typeof o.title === "string" &&
    typeof o.activity === "string" &&
    typeof o.dateTimeText === "string" &&
    typeof o.reward === "string" &&
    isValidNoteShape(o.note) &&
    typeof o.difficulty === "string"
  );
}

function isValidNoteShape(note: unknown): boolean {
  if (!note || typeof note !== "object") return false;
  const n = note as Record<string, unknown>;
  if (n.kind === "text") return typeof n.text === "string";
  if (n.kind === "image") {
    return typeof n.image === "string" && typeof n.caption === "string";
  }
  if (n.kind === "location") {
    return typeof n.place === "string" && typeof n.address === "string";
  }
  return false;
}
