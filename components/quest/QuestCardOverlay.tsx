"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { QuestCard } from "./QuestCard";
import { Typewriter } from "./Typewriter";
import { SparkleBurst } from "./SparkleBurst";
import { ShareReplyButton } from "./ShareReplyButton";
import { Button } from "@/components/ui/Button";
import { buildMapsUrl } from "@/lib/location";
import type { BundleResponse, QuestData } from "@/types/quest";

type Props = {
  quest: QuestData;
  index: number;
  total: number;
  acceptedIndex: number | null;
  response: BundleResponse | null;
  onClose: () => void;
  onAccept: () => void;
  onDefer: () => void;
  onResetResponse: () => void;
  onPrev?: () => void;
  onNext?: () => void;
};

/**
 * Full-screen overlay rendered when the recipient clicks a scroll on
 * the 3D board. Shows the parchment quest card with a typewriter
 * reveal of the message, the accept / maybe-later buttons, and (if
 * the bundle has multiple options) a pagination strip.
 *
 * Closes on:
 *   - The × button in the top-right
 *   - A click on the dimming backdrop
 *   - The Escape key (handled by the parent)
 */
export function QuestCardOverlay({
  quest,
  index,
  total,
  acceptedIndex,
  response,
  onClose,
  onAccept,
  onDefer,
  onResetResponse,
  onPrev,
  onNext,
}: Props) {
  const [revealStage, setRevealStage] = useState<"card" | "message" | "choices">(
    "card",
  );
  const [sparkleKey, setSparkleKey] = useState(0);

  // Pagination remounts this component via the parent's `key` prop, so
  // `revealStage` resets to "card" naturally — we just need to schedule
  // the timed transitions.
  useEffect(() => {
    const t1 = window.setTimeout(() => setRevealStage("message"), 450);
    const t2 = window.setTimeout(() => setRevealStage("choices"), 1100);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  function handleAccept() {
    onAccept();
    setSparkleKey((k) => k + 1);
  }

  // Decide what footer state to show on this option.
  let footerState: "idle" | "thisAccepted" | "otherAccepted" | "deferred";
  if (response === null) footerState = "idle";
  else if (response.kind === "maybe_later") footerState = "deferred";
  else if (response.optionIndex === index) footerState = "thisAccepted";
  else footerState = "otherAccepted";

  const mapsUrl =
    quest.note.kind === "location"
      ? buildMapsUrl(quest.note.place, quest.note.address)
      : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="absolute inset-0 z-20 flex items-center justify-center px-4 py-12 sm:py-16"
    >
      {/* Dimming backdrop — clicking it closes the card. */}
      <button
        type="button"
        aria-label="Close quest"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/55 backdrop-blur-[2px]"
      />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.96 }}
        transition={{ type: "spring", stiffness: 130, damping: 20, mass: 0.9 }}
        className="relative w-full max-w-xl"
      >
        {sparkleKey > 0 ? <SparkleBurst triggerKey={sparkleKey} /> : null}

        <QuestCard
          data={quest}
          variant="scene"
          footer={
            <div className="flex flex-col gap-4">
              <AnimatePresence mode="wait">
                {revealStage !== "card" ? (
                  <motion.div
                    key="message"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4 }}
                    className="rounded-lg bg-ink/5 px-3 py-2 text-sm text-ink-soft"
                  >
                    <span className="block font-display text-[10px] uppercase tracking-[0.22em] text-ink-soft/70">
                      A message from {quest.senderName.trim() || "the sender"}
                    </span>
                    {quest.note.kind === "image" && quest.note.image ? (
                      <figure className="m-0 mt-1.5">
                        {/* Data-URL image carried inside the quest. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={quest.note.image}
                          alt={
                            quest.note.caption.trim() ||
                            "A picture from the sender"
                          }
                          className="max-h-72 w-full rounded-md object-contain ring-1 ring-ink/15"
                        />
                        {quest.note.caption.trim().length > 0 ? (
                          <Typewriter
                            text={quest.note.caption}
                            className="mt-1.5 block font-serif italic"
                          />
                        ) : null}
                      </figure>
                    ) : quest.note.kind === "location" &&
                      quest.note.place.trim().length > 0 ? (
                      <div className="mt-1.5 flex items-start gap-2">
                        <span aria-hidden className="mt-0.5 text-ember-deep">
                          📍
                        </span>
                        <div className="min-w-0">
                          <p className="font-display text-sm font-semibold text-ink">
                            {quest.note.place}
                          </p>
                          {quest.note.address.trim().length > 0 ? (
                            <p className="font-serif italic leading-snug text-ink-soft">
                              {quest.note.address}
                            </p>
                          ) : null}
                          {mapsUrl ? (
                            <a
                              href={mapsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-1 inline-block font-display text-[10px] uppercase tracking-[0.2em] text-ember-deep underline-offset-2 hover:underline"
                            >
                              Open in Maps ↗
                            </a>
                          ) : null}
                        </div>
                      </div>
                    ) : (
                      <Typewriter
                        text={
                          quest.note.kind === "text" &&
                          quest.note.text.trim().length > 0
                            ? quest.note.text
                            : "Your presence is requested."
                        }
                        className="mt-1 block font-serif italic"
                      />
                    )}
                  </motion.div>
                ) : null}
              </AnimatePresence>

              <AnimatePresence mode="wait">
                {revealStage === "choices" && footerState === "idle" ? (
                  <motion.div
                    key="choices"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35 }}
                    className="flex flex-col gap-2 sm:flex-row sm:justify-end"
                  >
                    <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                      <Button variant="ghost-ink" size="lg" onClick={onDefer}>
                        Maybe later
                      </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        variant="primary"
                        size="lg"
                        className="ember-pulse"
                        onClick={handleAccept}
                      >
                        ⚔ Accept this quest
                      </Button>
                    </motion.div>
                  </motion.div>
                ) : null}

                {footerState === "thisAccepted" ? (
                  <motion.div
                    key="accepted"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="flex flex-col items-end gap-2"
                  >
                    <AcceptedBanner />
                    <ShareReplyButton quest={quest} />
                    <button
                      onClick={onResetResponse}
                      className="self-end font-display text-[10px] uppercase tracking-[0.2em] text-ink-soft/60 underline-offset-2 hover:text-ink-soft hover:underline"
                    >
                      Change my mind
                    </button>
                  </motion.div>
                ) : null}

                {footerState === "otherAccepted" ? (
                  <motion.div
                    key="otherAccepted"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="flex flex-col items-end gap-2"
                  >
                    <p className="text-xs text-ink-soft/70">
                      You picked quest {(acceptedIndex ?? 0) + 1} of {total}.
                    </p>
                    <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                      <Button variant="primary" size="md" onClick={handleAccept}>
                        Pick this one instead
                      </Button>
                    </motion.div>
                  </motion.div>
                ) : null}

                {footerState === "deferred" ? (
                  <motion.div
                    key="deferred"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="flex flex-col items-end gap-2"
                  >
                    <DeferredBanner />
                    <button
                      onClick={onResetResponse}
                      className="self-end font-display text-[10px] uppercase tracking-[0.2em] text-ink-soft/60 underline-offset-2 hover:text-ink-soft hover:underline"
                    >
                      Change my mind
                    </button>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          }
        />

        {/* Close button — top right of the card */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close quest"
          className="absolute -right-2 -top-2 flex h-9 w-9 items-center justify-center rounded-full bg-ink text-parchment shadow-[0_4px_12px_rgba(0,0,0,0.5)] ring-1 ring-parchment/20 transition-colors hover:bg-ember hover:text-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
        >
          <span aria-hidden className="text-lg leading-none">×</span>
        </button>

        {/* Pagination — arrow buttons flanking animated dot indicators. */}
        {total > 1 ? (
          <div
            className="mt-4 flex items-center justify-center gap-4"
            role="navigation"
            aria-label="Quest pagination"
          >
            <motion.button
              type="button"
              onClick={onPrev}
              whileTap={{ scale: 0.92 }}
              whileHover={{ x: -2 }}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-ink/70 text-parchment ring-1 ring-parchment/15 hover:bg-ink"
              aria-label="Previous quest"
            >
              ◀
            </motion.button>
            <ol
              className="flex items-center gap-2"
              aria-label={`Quest ${index + 1} of ${total}`}
            >
              {Array.from({ length: total }, (_, i) => {
                const active = i === index;
                return (
                  <li key={i}>
                    <motion.span
                      aria-current={active ? "true" : undefined}
                      animate={{
                        width: active ? 22 : 8,
                        opacity: active ? 1 : 0.45,
                      }}
                      transition={{ type: "spring", stiffness: 320, damping: 24 }}
                      className={
                        "block h-2 rounded-full " +
                        (active ? "bg-gold" : "bg-parchment/60")
                      }
                    />
                  </li>
                );
              })}
            </ol>
            <motion.button
              type="button"
              onClick={onNext}
              whileTap={{ scale: 0.92 }}
              whileHover={{ x: 2 }}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-ink/70 text-parchment ring-1 ring-parchment/15 hover:bg-ink"
              aria-label="Next quest"
            >
              ▶
            </motion.button>
          </div>
        ) : null}
      </motion.div>
    </motion.div>
  );
}

/* ----------------- Banners ----------------- */

function AcceptedBanner() {
  return (
    <div className="flex items-center gap-3 rounded-full bg-ember/15 px-4 py-2 ring-1 ring-ember/40">
      <span aria-hidden className="text-ember-deep">✓</span>
      <div className="text-right">
        <div className="font-display text-sm uppercase tracking-[0.22em] text-ember-deep">
          You&apos;re in
        </div>
        <div className="text-[11px] text-ink-soft/80">An adventure awaits 🤍</div>
      </div>
    </div>
  );
}

function DeferredBanner() {
  return (
    <div className="flex items-center gap-3 rounded-full bg-ink/10 px-4 py-2 ring-1 ring-ink-soft/30">
      <span aria-hidden className="text-ink-soft/70">⌛</span>
      <div className="text-right">
        <div className="font-display text-sm uppercase tracking-[0.22em] text-ink-soft">
          Saved for later
        </div>
        <div className="text-[11px] text-ink-soft/80">
          The adventure can wait.
        </div>
      </div>
    </div>
  );
}
