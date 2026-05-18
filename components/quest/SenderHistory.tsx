"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  clearHistory,
  formatHistoryAt,
  loadHistory,
  removeFromHistory,
  subscribeHistory,
  type HistoryEntry,
} from "@/lib/senderHistory";
import { decodeQuestBundle } from "@/lib/questCodec";
import type { QuestBundle } from "@/types/quest";

type Props = {
  /**
   * Called when the user picks "Edit a copy" on a chip. The parent
   * (the /create page) decides what to do — usually swap the form's
   * state to the decoded bundle, optionally with a confirmation if
   * an in-progress draft would be clobbered.
   */
  onEditCopy: (bundle: QuestBundle) => void;
};

// Stable empty array for the SSR snapshot. `useSyncExternalStore`
// requires `getServerSnapshot` to return a referentially identical
// value across calls — a fresh `[]` literal would trip the infinite-
// loop detector. Lives at module scope so the same reference is
// returned forever.
const EMPTY_SSR_SNAPSHOT: HistoryEntry[] = [];
const getServerSnapshot = () => EMPTY_SSR_SNAPSHOT;

/**
 * A rail on /create listing the sender's most recent quests, pulled
 * from localStorage via `lib/senderHistory.ts`. Subscribed to the
 * store so it updates live when `GenerateLinkPanel` records a new
 * send.
 *
 * Each entry shows:
 *   - The recipient name (or "(unnamed)" as a fallback)
 *   - A relative timestamp ("yesterday")
 *   - Two actions: "Edit a copy" (loads the bundle into the form) and
 *     "Open" (opens the invite link in a new tab)
 *   - A small × to forget just that entry
 *
 * Empty state is just absence — no entries means no rail. This keeps
 * /create uncluttered for first-time visitors.
 */
export function SenderHistory({ onEditCopy }: Props) {
  // Subscribe to the history store. `useSyncExternalStore` calls
  // `loadHistory` on every render — that one caches its result keyed
  // by the raw localStorage string, so the array reference stays
  // stable between renders. The SSR snapshot is a module-level empty
  // array for the same reason.
  const entries = useSyncExternalStore(
    subscribeHistory,
    loadHistory,
    getServerSnapshot,
  );

  // Confirmation step on "Forget all" — destructive action, easy to
  // hit by accident. Two-tap pattern: first tap arms, second tap
  // commits. Resets after 4s.
  const [confirmClear, setConfirmClear] = useState(false);
  useEffect(() => {
    if (!confirmClear) return;
    const t = window.setTimeout(() => setConfirmClear(false), 4000);
    return () => window.clearTimeout(t);
  }, [confirmClear]);

  if (entries.length === 0) {
    // Render nothing at all — first-time sender shouldn't see an
    // empty "your recent quests" header.
    return null;
  }

  function handleClearClick() {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    clearHistory();
    setConfirmClear(false);
  }

  function handleEdit(entry: HistoryEntry) {
    const bundle = decodeQuestBundle(entry.encoded);
    if (bundle) onEditCopy(bundle);
  }

  function handleOpen(entry: HistoryEntry) {
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://questboard.app";
    window.open(
      `${origin}/invite?q=${entry.encoded}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  return (
    <section
      className="rounded-2xl border border-parchment/10 bg-ink/25 p-4 sm:p-5"
      aria-label="Recent quests you've sent"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-display text-[11px] uppercase tracking-[0.28em] text-gold/75">
          Your recent quests · {entries.length}
        </h3>
        <button
          type="button"
          onClick={handleClearClick}
          className={
            "font-display text-[10px] uppercase tracking-[0.22em] transition-colors " +
            (confirmClear
              ? "text-ember"
              : "text-parchment/45 hover:text-parchment")
          }
        >
          {confirmClear ? "Tap again to forget" : "Forget all"}
        </button>
      </div>

      <ul className="flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {entries.map((entry) => (
            <motion.li
              key={entry.encoded}
              layout
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-3 rounded-xl border border-parchment/10 bg-ink/20 px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-xs uppercase tracking-[0.18em] text-parchment/85">
                  For {entry.recipientName.trim() || "(unnamed)"}
                </p>
                <p className="text-[10px] text-parchment/45">
                  {formatHistoryAt(entry.savedAt)}
                  {entry.optionCount > 1
                    ? ` · ${entry.optionCount} options`
                    : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleEdit(entry)}
                className="rounded-full px-2.5 py-1 font-display text-[10px] uppercase tracking-[0.18em] text-gold/85 ring-1 ring-gold/30 transition-colors hover:bg-gold/10 hover:text-gold"
                aria-label={`Edit a copy of the quest for ${entry.recipientName.trim() || "this recipient"}`}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => handleOpen(entry)}
                className="rounded-full px-2.5 py-1 font-display text-[10px] uppercase tracking-[0.18em] text-parchment/75 ring-1 ring-parchment/15 transition-colors hover:bg-parchment/5 hover:text-parchment"
                aria-label="Open this quest as the recipient would see it"
              >
                Open ↗
              </button>
              <button
                type="button"
                onClick={() => removeFromHistory(entry.encoded)}
                className="text-parchment/40 transition-colors hover:text-ember"
                aria-label="Forget this entry"
                title="Forget this entry"
              >
                <span aria-hidden className="text-base leading-none">
                  ×
                </span>
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </section>
  );
}
