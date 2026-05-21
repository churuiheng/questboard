"use client";

import { motion } from "framer-motion";
import { SEAL_DESIGN } from "@/lib/sealDesign";
import type { QuestDifficulty } from "@/types/quest";

/**
 * The wax stamp that lands on the top-right corner of the quest card
 * when the recipient accepts. Animated in from above with a spring
 * overshoot + small rotation so it reads as a real stamp pressed onto
 * paper.
 *
 * Lives in QuestCardOverlay (positioned absolutely over the front of
 * the card) so it survives the 3D flip — the back face has its own
 * content, and we don't want a duplicate stamp on both sides.
 */
export function CornerWaxStamp({
  difficulty,
}: {
  difficulty: QuestDifficulty;
}) {
  const design = SEAL_DESIGN[difficulty];
  return (
    <motion.div
      initial={{ scale: 1.8, rotate: -28, opacity: 0, y: -32 }}
      animate={{ scale: 1, rotate: -10, opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 1.15, transition: { duration: 0.22 } }}
      transition={{ type: "spring", stiffness: 480, damping: 17, mass: 0.85 }}
      role="img"
      aria-label={design.ariaLabel}
      className="relative flex h-16 w-16 items-center justify-center rounded-full text-parchment shadow-[0_5px_14px_-2px_rgba(0,0,0,0.5),inset_0_1px_5px_rgba(255,255,255,0.28),inset_0_-3px_7px_rgba(0,0,0,0.38)] ring-2"
      style={{
        backgroundImage: design.gradient,
        ["--tw-ring-color" as string]: `${design.deep}aa`,
      }}
    >
      {/* Scalloped wax rim */}
      <span
        aria-hidden
        className="absolute inset-0 rounded-full border border-dashed border-parchment/30"
      />
      {/* The theme's signature ✦ — cream-on-wax. */}
      <span
        aria-hidden
        className="font-display text-2xl font-bold leading-none text-parchment drop-shadow"
      >
        ✦
      </span>
    </motion.div>
  );
}
