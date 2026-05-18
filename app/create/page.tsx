"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { QuestForm } from "@/components/quest/QuestForm";
import { QuestCard } from "@/components/quest/QuestCard";
import { GenerateLinkPanel } from "@/components/quest/GenerateLinkPanel";
import { PreviewAsRecipient } from "@/components/quest/PreviewAsRecipient";
import { SenderHistory } from "@/components/quest/SenderHistory";
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
import { buildMapsUrl } from "@/lib/location";
import type { QuestBundle, QuestData } from "@/types/quest";

export default function CreatePage() {
  // First render is always the default bundle so server and client
  // produce identical HTML — reading localStorage in the state
  // initializer would create a hydration mismatch.
  const [bundle, setBundle] = useState<QuestBundle>(() => makeDefaultQuestBundle());
  const [restoredAt, setRestoredAt] = useState<string | null>(null);
  const [hintVisible, setHintVisible] = useState(false);

  // Read `?from=…&to=…` seed params from the URL. Set by the "Send one
  // back" CTA on the /invite page — when an accepted recipient wants to
  // reply with their own quest, we prefill the roles swapped.
  const searchParams = useSearchParams();
  const seedFrom = searchParams.get("from");
  const seedTo = searchParams.get("to");

  // Post-hydration: pull the draft out of localStorage, then merge in
  // any URL-param seeds. Wrapped in queueMicrotask so the setState
  // calls are async w.r.t. the effect body (keeps the rules-of-hooks
  // linter happy) AND React batches the updates before the first
  // paint, so there's no flicker.
  //
  // Precedence rules:
  //  1. Start from default bundle.
  //  2. If a draft is worth restoring, that wins for everything.
  //  3. Then layer URL seeds ON TOP — but only for empty/default
  //     fields, so we never clobber a restored draft's recipient or
  //     sender just because the URL still has stale params.
  useEffect(() => {
    queueMicrotask(() => {
      const draft = loadDraft();
      let next: QuestBundle | null = null;
      if (draft && isDraftWorthRestoring(draft.bundle)) {
        next = draft.bundle;
        setRestoredAt(draft.savedAt);
        setHintVisible(true);
      }
      const base = next ?? makeDefaultQuestBundle();
      const fromTrim = seedFrom?.trim() ?? "";
      const toTrim = seedTo?.trim() ?? "";
      const recipientIsBlank = base.recipientName.trim().length === 0;
      // "A friend" is the default; treat that as still-empty for seed.
      const senderIsBlank =
        base.senderName.trim().length === 0 ||
        base.senderName.trim() === "A friend";
      const patched: QuestBundle = {
        ...base,
        recipientName:
          toTrim.length > 0 && recipientIsBlank ? toTrim : base.recipientName,
        senderName:
          fromTrim.length > 0 && senderIsBlank ? fromTrim : base.senderName,
      };
      // Only call setBundle if anything actually changed — avoids a
      // wasted render when the URL has no seeds and there's no draft.
      if (next !== null || patched !== base) {
        setBundle(patched);
      }
    });
    // We deliberately key this to mount only; URL changes shouldn't
    // re-seed the form mid-edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          className="order-2 lg:order-1 flex flex-col gap-4"
        >
          {/* Recent-quests rail. Hidden when empty so first-time
              senders aren't greeted with a "Your recent quests · 0"
              header. */}
          <SenderHistory
            onEditCopy={(seed) => {
              setBundle(seed);
              // Dismiss the draft hint if it happened to be open —
              // the user has explicitly chosen a different starting
              // point, so the "we restored your draft" banner is
              // no longer accurate.
              setRestoredAt(null);
              setHintVisible(false);
            }}
          />
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

            {/* Full-fidelity preview — opens the actual /invite scene
                with this draft, so the sender can sanity-check the 3D
                tavern view (long titles, message wrapping in the
                typewriter, image notes) before they share. */}
            <div className="flex justify-center">
              <PreviewAsRecipient bundle={bundle} />
            </div>
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
  const senderLabel = quest.senderName.trim() || "a friend";
  const { note } = quest;
  return (
    <div className="rounded-lg bg-ink/5 px-3 py-2 text-sm text-ink-soft">
      <span className="block font-display text-[10px] uppercase tracking-[0.22em] text-ink-soft/70">
        A message from {senderLabel}
      </span>
      {note.kind === "image" ? (
        note.image ? (
          <figure className="m-0 mt-2">
            {/* Data-URL preview baked into the quest. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={note.image}
              alt={note.caption.trim() || "A picture from the sender"}
              className="max-h-56 w-full rounded-md object-contain ring-1 ring-ink/15"
            />
            {note.caption.trim().length > 0 ? (
              <figcaption className="mt-1 block font-serif italic text-ink-soft">
                {note.caption}
              </figcaption>
            ) : null}
          </figure>
        ) : (
          <p className="mt-1 block font-serif italic text-ink/40">
            Pick an image and it&apos;ll appear here for the recipient.
          </p>
        )
      ) : note.kind === "location" ? (
        note.place.trim().length > 0 ? (
          <div className="mt-1 text-ink-soft">
            <p className="font-display text-sm font-semibold text-ink">
              📍 {note.place}
            </p>
            {note.address.trim().length > 0 ? (
              <p className="font-serif italic leading-snug">{note.address}</p>
            ) : null}
            {buildMapsUrl(note.place, note.address, note.lat, note.lng) ? (
              <span className="mt-0.5 inline-block font-display text-[10px] uppercase tracking-[0.2em] text-ember-deep">
                Open in Maps ↗
              </span>
            ) : null}
          </div>
        ) : (
          <p className="mt-1 block font-serif italic text-ink/40">
            Add a place and it&apos;ll show here with a Maps link.
          </p>
        )
      ) : (
        <p
          className={
            "mt-1 block font-serif italic " +
            (note.text.trim().length > 0 ? "text-ink-soft" : "text-ink/40")
          }
        >
          {note.text.trim().length > 0
            ? note.text
            : "A note from you will appear here — keep it short and warm."}
        </p>
      )}
    </div>
  );
}
