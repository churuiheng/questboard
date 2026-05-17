"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { QuestForm } from "@/components/quest/QuestForm";
import { QuestCard } from "@/components/quest/QuestCard";
import { GenerateLinkPanel } from "@/components/quest/GenerateLinkPanel";
import {
  bundleToQuestData,
  makeDefaultQuestBundle,
} from "@/lib/questDefaults";
import {
  clearDraft,
  formatSavedAt,
  isDraftWorthRestoring,
  loadDraft,
  saveDraft,
} from "@/lib/draft";
import type { QuestBundle, QuestData } from "@/types/quest";

export default function CreatePage() {
  // First render is always the default bundle so server and client
  // produce identical HTML — reading localStorage in the state
  // initializer would create a hydration mismatch.
  const [bundle, setBundle] = useState<QuestBundle>(() => makeDefaultQuestBundle());
  const [restoredAt, setRestoredAt] = useState<string | null>(null);
  const [hintVisible, setHintVisible] = useState(false);

  // Post-hydration: pull the draft out of localStorage. Wrapped in
  // queueMicrotask so the setState calls are async w.r.t. the effect
  // body (keeps the rules-of-hooks linter happy) AND React batches the
  // updates before the first paint, so there's no flicker.
  useEffect(() => {
    queueMicrotask(() => {
      const draft = loadDraft();
      if (draft && isDraftWorthRestoring(draft.bundle)) {
        setBundle(draft.bundle);
        setRestoredAt(draft.savedAt);
        setHintVisible(true);
      }
    });
  }, []);

  // Auto-dismiss the hint after a moment so it doesn't sit in the way.
  useEffect(() => {
    if (!hintVisible) return;
    const t = window.setTimeout(() => setHintVisible(false), 6000);
    return () => window.clearTimeout(t);
  }, [hintVisible]);

  // Tiny "Saved 🤍" indicator that the GenerateLinkPanel surfaces.
  // We just bump a counter each time autosave fires; the panel uses it
  // to trigger a short fade animation.
  const [saveTick, setSaveTick] = useState(0);

  // Debounced autosave: we don't need to write on every keystroke, just
  // often enough that we never lose more than a second of work.
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (isDraftWorthRestoring(bundle)) {
        saveDraft(bundle);
        setSaveTick((n) => n + 1);
      }
    }, 400);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [bundle]);

  function handleStartFresh() {
    clearDraft();
    setBundle(makeDefaultQuestBundle());
    setRestoredAt(null);
    setHintVisible(false);
  }

  // Which option's card is shown in the live preview. Auto-clamped if
  // the sender removes an option.
  const [previewIndex, setPreviewIndex] = useState(0);
  const safePreviewIndex = Math.min(previewIndex, bundle.options.length - 1);

  const previewQuest = useMemo(
    () => bundleToQuestData(bundle, safePreviewIndex),
    [bundle, safePreviewIndex],
  );

  const pulseKey = useMemo(
    () =>
      `${previewQuest.title}|${previewQuest.difficulty}|${previewQuest.recipientName}|${previewQuest.reward}|${safePreviewIndex}`,
    [previewQuest, safePreviewIndex],
  );

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 flex items-center justify-between gap-4">
        <Link
          href="/"
          className="font-display text-xs uppercase tracking-[0.32em] text-parchment/60 hover:text-parchment"
        >
          ← QuestBoard
        </Link>
        <span className="font-display text-[10px] uppercase tracking-[0.3em] text-gold/70">
          Forge a quest
        </span>
      </header>

      {/* Draft-restored hint, auto-dismisses */}
      <AnimatePresence>
        {hintVisible && restoredAt ? (
          <motion.div
            key="draft-hint"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="mx-auto mb-6 flex w-full max-w-md items-center justify-between gap-3 rounded-full border border-gold/20 bg-gold/5 px-4 py-2 text-xs text-parchment/75"
            role="status"
            aria-live="polite"
          >
            <span>
              Picked up your draft from {formatSavedAt(restoredAt)}{" "}
              <span aria-hidden>🤍</span>
            </span>
            <button
              type="button"
              onClick={handleStartFresh}
              className="font-display text-[10px] uppercase tracking-[0.22em] text-gold/80 hover:text-gold"
            >
              Start fresh
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-12">
        <motion.section
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: "spring", stiffness: 160, damping: 22 }}
          className="order-2 lg:order-1"
        >
          <QuestForm value={bundle} onChange={setBundle} />
        </motion.section>

        <motion.section
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: "spring", stiffness: 160, damping: 22, delay: 0.05 }}
          className="order-1 lg:order-2"
          id="quest-preview"
        >
          <div className="lg:sticky lg:top-8 flex flex-col gap-5">
            {/* Preview switcher — only appears when there's more than one option */}
            {bundle.options.length > 1 ? (
              <div className="flex items-center justify-center gap-1.5">
                {bundle.options.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setPreviewIndex(i)}
                    aria-label={`Preview quest ${i + 1}`}
                    className={
                      "h-9 w-9 rounded-full font-display text-[12px] transition-colors " +
                      (i === safePreviewIndex
                        ? "bg-gold text-ink ring-1 ring-gold-soft"
                        : "bg-ink/40 text-parchment/70 ring-1 ring-parchment/15 hover:bg-ink/60 hover:text-parchment")
                    }
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            ) : null}

            {/* The preview uses `variant="scene"` so the sender sees the
                same parchment card that opens for the recipient on the
                /invite page. We add the same "message from a friend"
                banner the overlay does (minus the accept/decline
                buttons) so what they see is exactly what they ship. */}
            <motion.div
              key={pulseKey}
              initial={{ scale: 0.985 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 220, damping: 20 }}
            >
              <QuestCard
                data={previewQuest}
                variant="scene"
                footer={<MessageBanner quest={previewQuest} />}
              />
            </motion.div>
            <GenerateLinkPanel bundle={bundle} saveTick={saveTick} />
          </div>
        </motion.section>
      </div>

      {/* Mobile-only floating jump-to-preview button. Below `lg` the
          preview section sits ABOVE the form, but on a tall phone the
          user scrolls past it as they edit — this brings them back. */}
      <a
        href="#quest-preview"
        className="fixed bottom-5 right-5 z-30 inline-flex items-center gap-2 rounded-full bg-ember px-4 py-2.5 font-display text-[11px] uppercase tracking-[0.18em] text-parchment shadow-[0_8px_24px_-6px_rgba(217,107,52,0.7)] hover:bg-ember-deep lg:hidden"
        aria-label="Scroll to your quest preview"
      >
        <span aria-hidden>▲</span>
        See preview
      </a>
    </main>
  );
}

/**
 * The "A message from a friend" banner that appears under the stats grid
 * inside the scene-variant card. The /invite overlay animates this in
 * with a typewriter; in the /create preview we render it statically so
 * the sender sees the final composition. Stays in sync with
 * `QuestCardOverlay`'s message block — same wrapper styles, same
 * placeholders, just no animation.
 */
function MessageBanner({ quest }: { quest: QuestData }) {
  const filled = quest.message.trim().length > 0;
  const senderLabel = quest.senderName.trim() || "a friend";
  return (
    <div className="rounded-lg bg-ink/5 px-3 py-2 text-sm text-ink-soft">
      <span className="block font-display text-[10px] uppercase tracking-[0.22em] text-ink-soft/70">
        A message from {senderLabel}
      </span>
      <p
        className={
          "mt-1 block font-serif italic " +
          (filled ? "text-ink-soft" : "text-ink/40")
        }
      >
        {filled
          ? quest.message
          : "A note from you will appear here — keep it short and warm."}
      </p>
    </div>
  );
}
