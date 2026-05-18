"use client";

import { useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";

/**
 * Tongue-in-cheek "Quest Failed" screen shown when the recipient taps
 * "Maybe later" on the quest card. The whole app is RPG-flavored, so a
 * defer reads better as a humorous fail state than as a silent shrug.
 *
 * Nothing is persisted — this is a momentary screen. Pressing F or
 * Escape (the keyboard easter egg) revives them straight back to the
 * card with both buttons still live, so the Accept path is one tap
 * away. The card never sees an actual "deferred" response.
 *
 * Renders at z-30, above the QuestCardOverlay (z-20).
 */
const FAILURE_LINES = [
  "Your party feels lighter without you.",
  "The tavern doors close softly behind you.",
  "Somewhere, a side quest weeps quietly.",
  "The dice did not roll in your favor.",
  "The bard begins a sad song about this.",
  "Achievement unlocked: Master of Convenient Excuses.",
  "A goblin laughs in the distance.",
];

/** Deterministic flavor pick — same quest always shows the same line. */
function pickLine(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return FAILURE_LINES[Math.abs(hash) % FAILURE_LINES.length];
}

export function QuestFailedOverlay({
  seed,
  onTryAgain,
}: {
  /** Stable key (e.g. quest title + index) so the flavor line doesn't shuffle. */
  seed: string;
  onTryAgain: () => void;
}) {
  // F = revive (riff on the "Press F to pay respects" meme — only here
  // it brings you back to life). Escape also revives so the screen
  // doesn't trap people who instinctively reach for it. We capture in
  // the capture phase so the parent's Escape handler doesn't fire and
  // close the whole quest card.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "f" || e.key === "F" || e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onTryAgain();
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onTryAgain]);

  const line = useMemo(() => pickLine(seed), [seed]);

  return (
    <motion.div
      key="quest-failed"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="absolute inset-0 z-30 flex items-center justify-center px-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="quest-failed-title"
    >
      {/* Dark backdrop with a faint blood-red vignette — sets the
          "something has gone wrong" tone without leaving the palette. */}
      <div
        aria-hidden
        className="absolute inset-0 backdrop-blur-[3px]"
        style={{
          background:
            "radial-gradient(circle at 50% 38%, rgba(160,32,32,0.42) 0%, rgba(0,0,0,0.88) 70%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.92 }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
          // Quick horizontal shake on mount — the "you fumbled it" beat.
          x: [-8, 8, -4, 4, 0],
        }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{
          type: "spring",
          stiffness: 220,
          damping: 18,
          mass: 0.8,
          x: { duration: 0.45, ease: "easeOut" },
        }}
        className="relative w-full max-w-md rounded-2xl border border-ember/50 bg-ink/95 px-8 py-9 text-center shadow-[0_30px_60px_-12px_rgba(0,0,0,0.85)]"
      >
        <span className="block font-display text-[10px] uppercase tracking-[0.32em] text-ember/80">
          A critical fumble
        </span>

        <h2
          id="quest-failed-title"
          className="mt-2 font-display text-4xl font-bold uppercase tracking-[0.05em] text-ember-deep sm:text-5xl"
          style={{
            textShadow:
              "0 0 24px rgba(217,107,52,0.45), 0 4px 8px rgba(0,0,0,0.6)",
          }}
        >
          Quest Failed
        </h2>

        <p className="mt-4 font-serif italic text-parchment/80">{line}</p>

        <div className="mt-7 flex flex-col items-center gap-3">
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
            <Button
              variant="primary"
              size="lg"
              className="ember-pulse"
              onClick={onTryAgain}
            >
              ↻ Try again
            </Button>
          </motion.div>
          <p className="font-display text-[10px] uppercase tracking-[0.28em] text-parchment/45">
            Press{" "}
            <kbd className="rounded border border-gold/40 bg-ink/60 px-1.5 py-0.5 font-display text-[10px] text-gold">
              F
            </kbd>{" "}
            to revive
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
