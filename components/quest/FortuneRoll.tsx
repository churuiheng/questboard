"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { QuestDifficulty } from "@/types/quest";

type Props = {
  /** Stable key (e.g. bundleId + ":" + optionIndex) so the roll
   *  result persists across reloads and reset-then-reaccept. */
  seed: string;
  difficulty: QuestDifficulty;
};

/**
 * One-tap "Roll for fortune" wax die. On first tap, animates a brief
 * tumble and reveals a themed buff drawn deterministically from
 * `(seed + difficulty)` — so a given quest always rolls the same
 * fortune, but two different quests roll differently. Persists in
 * localStorage keyed by seed so the result sticks across reloads and
 * "Change my mind" round-trips.
 *
 * Lives in the AcceptedPanel beside the live countdown. Pure flavor;
 * never affects state outside this widget.
 */

const FORTUNES_BY_DIFFICULTY: Record<QuestDifficulty, string[]> = {
  cozy: [
    "+2 Comfort — small joys multiply today.",
    "Today's omen: warm light through the window.",
    "The dice say: snacks acquired.",
    "+1 Patience — the night will not be rushed.",
    "A gentle wind carries good company.",
  ],
  normal: [
    "+1 Charisma — your puns will land.",
    "Today's omen: favorable winds.",
    "The dice say: bring a story to share.",
    "+2 Curiosity — ask the second question.",
    "Someone will laugh at exactly the right moment.",
  ],
  legendary: [
    "+3 Courage — the dragon is smaller than it looks.",
    "Today's omen: dragon weather.",
    "The dice say: pack water and a plan.",
    "Loot drop pending. Pack lightly.",
    "An old map flutters open in your mind.",
  ],
  secret: [
    "+1 Cunning — the dice favor the quiet.",
    "Today's omen: keys jingle in dark corners.",
    "Tell no one, but the stars are aligned.",
    "+2 Stealth — the world will not see you coming.",
    "A passphrase will occur to you precisely when needed.",
  ],
};

/** Deterministic hash so a given seed always selects the same fortune. */
function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function pickFortune(seed: string, difficulty: QuestDifficulty): string {
  const pool = FORTUNES_BY_DIFFICULTY[difficulty];
  return pool[hashSeed(seed) % pool.length];
}

const STORAGE_PREFIX = "questboard:fortune:v1:";

export function FortuneRoll({ seed, difficulty }: Props) {
  // Computed once: what this quest would roll if invoked. Stable per
  // (seed, difficulty), so it survives reloads without persistence —
  // localStorage only stores "has rolled yet" / "the rolled value".
  const willRoll = useMemo(
    () => pickFortune(seed, difficulty),
    [seed, difficulty],
  );

  // `rolled` holds the revealed fortune string. Null until the user
  // taps. Initialized post-mount from localStorage so SSR + first
  // render stay matched.
  const [rolled, setRolled] = useState<string | null>(null);
  const [rolling, setRolling] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Deferred via queueMicrotask to keep clear of React 19's
    // "no setState in effect body" rule — same pattern used by
    // /create's draft restore.
    queueMicrotask(() => {
      try {
        const saved = window.localStorage.getItem(STORAGE_PREFIX + seed);
        if (saved) setRolled(saved);
      } catch {
        /* ignore */
      }
    });
  }, [seed]);

  function handleRoll() {
    if (rolled || rolling) return;
    setRolling(true);
    // Short tumble before reveal, to sell the moment.
    window.setTimeout(() => {
      setRolled(willRoll);
      setRolling(false);
      try {
        window.localStorage.setItem(STORAGE_PREFIX + seed, willRoll);
      } catch {
        /* private mode / quota — fine, just won't persist */
      }
    }, 700);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.55 }}
      className="flex flex-col items-center gap-2"
    >
      {/* Colors tuned for the lobby card's parchment background —
          ember-deep text + ink chrome. The revealed fortune sits in a
          subtle ink-tinted panel so it reads as a contained moment. */}
      {!rolled ? (
        <motion.button
          type="button"
          onClick={handleRoll}
          disabled={rolling}
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Roll for daily fortune"
          className="group flex items-center gap-2 rounded-full border border-ember/40 bg-ink/[0.04] px-4 py-2 font-display text-[11px] uppercase tracking-[0.22em] text-ember-deep transition hover:border-ember hover:bg-ink/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/50"
        >
          <DieGlyph spinning={rolling} />
          {rolling ? "Rolling…" : "Roll for fortune"}
        </motion.button>
      ) : (
        <motion.div
          key="fortune"
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 280, damping: 22 }}
          role="status"
          className="flex max-w-[22rem] items-center gap-3 rounded-xl border border-ember/25 bg-ink/[0.05] px-4 py-3 text-ember-deep"
        >
          <DieGlyph spinning={false} settled />
          <p className="flex-1 text-left font-serif text-[12px] italic leading-snug text-ink-soft">
            {rolled}
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}

/**
 * Tiny SVG die that spins while the user holds the button and lands
 * with a quick wobble when the fortune is revealed.
 */
function DieGlyph({
  spinning,
  settled = false,
}: {
  spinning: boolean;
  settled?: boolean;
}) {
  return (
    <motion.svg
      aria-hidden
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      animate={
        spinning
          ? { rotate: [0, 360, 720, 1080] }
          : settled
            ? { rotate: [0, -12, 8, 0] }
            : { rotate: 0 }
      }
      transition={
        spinning
          ? { duration: 0.7, ease: "easeInOut" }
          : settled
            ? { duration: 0.5, ease: "easeOut" }
            : { duration: 0 }
      }
    >
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <circle cx="8.5" cy="8.5" r="0.9" fill="currentColor" />
      <circle cx="15.5" cy="15.5" r="0.9" fill="currentColor" />
      <circle cx="12" cy="12" r="0.9" fill="currentColor" />
    </motion.svg>
  );
}
