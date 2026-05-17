"use client";

import type { QuestBundle } from "@/types/quest";

/**
 * Tiny draft-persistence layer for the /create form.
 *
 * UX principle in play: never lose user data silently. If someone fills
 * out a quest and accidentally closes the tab, hits refresh, or comes
 * back the next day, we want their draft to still be there.
 *
 * Everything is best-effort — private mode, quota errors, JSON parse
 * failures all degrade silently. The form keeps working either way.
 */

const STORAGE_KEY = "questboard:draft";

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
 * stored, the payload is malformed, or the bundle is just a brand-new
 * default (no actual user input yet — we don't surface "Draft restored"
 * for those).
 */
export function loadDraft(): DraftEnvelope | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DraftEnvelope;
    if (!parsed?.bundle || typeof parsed.savedAt !== "string") return null;
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
  return (
    bundle.recipientName.trim().length > 0 ||
    bundle.options.length > 1 ||
    bundle.options.some(
      (opt) => opt.title.trim() !== "" && opt.activity.trim() !== "",
    )
  );
}
