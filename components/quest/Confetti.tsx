"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";
import type { QuestDifficulty } from "@/types/quest";

/**
 * A short-lived confetti rain mounted when a quest is accepted. The
 * palette is keyed to the quest's difficulty so each acceptance feels
 * specific — a cozy ramen night showers in greens, a legendary trek in
 * embers, a secret mission in purples.
 *
 * Pure DOM/CSS via framer-motion (no canvas, no extra deps). Each
 * particle is a small rotating rectangle that flies outward + upward
 * then falls under faux gravity to feel weighty rather than sparkly.
 *
 * Usage: pass a unique `triggerKey` that changes when you want a fresh
 * burst (we change it on each accept tap), plus the active quest's
 * difficulty for the palette.
 */

const PALETTES: Record<QuestDifficulty, string[]> = {
  cozy: ["#6f8c4a", "#a3c065", "#4d6b2c", "#c4d488", "#8fb24a"],
  normal: ["#e6b352", "#f0d28a", "#c98a30", "#fce0a4", "#d4a04a"],
  legendary: ["#d96b34", "#f08850", "#b04a18", "#fcb088", "#e89060"],
  secret: ["#6e4a86", "#9a7ab0", "#4e2e62", "#c0a0d4", "#8a64a4"],
};

export function Confetti({
  triggerKey,
  difficulty,
  count = 36,
  durationMs = 1900,
  /**
   * Distance (in px) the particles spread sideways and how high they
   * launch before gravity wins. Tuned for the quest-card footprint.
   */
  spread = 220,
  lift = 140,
}: {
  triggerKey: number | string;
  difficulty: QuestDifficulty;
  count?: number;
  durationMs?: number;
  spread?: number;
  lift?: number;
}) {
  const palette = PALETTES[difficulty];

  // Deterministic-per-trigger so each burst is varied but stable across
  // renders within the same burst. Mixing in `triggerKey` gives a fresh
  // scatter on each Accept tap.
  const particles = useMemo(() => {
    const seed =
      String(triggerKey).length + (String(triggerKey).charCodeAt(0) || 1);
    return Array.from({ length: count }, (_, i) => {
      // Angle skewed upward — confetti starts going up-and-out, then
      // falls back down. Angles between ~120° and 60° (in screen
      // coords, so negative dy = upward).
      const angle = -Math.PI / 2 + ((i / count) - 0.5) * 1.4;
      const power = 0.6 + ((i * seed) % 11) / 14;
      const dx = Math.cos(angle) * spread * power;
      const dyUp = Math.sin(angle) * lift * power; // negative -> upward
      // After the lift, particles fall further down — total Y journey.
      const dyDown = 360 + ((i * seed) % 9) * 18;
      return {
        id: i,
        // Particle drifts outward and floats up, then keeps falling.
        // We model this with a keyframed y so we don't need an actual
        // physics step.
        dx,
        dyUp,
        dyDown,
        size: 6 + ((i + seed) % 5),
        // Most pieces are short rectangles; a few are squares for variety.
        ratio: ((i + seed) % 4 === 0 ? 1 : 0.45) as number,
        rotation: ((i * seed) % 360) - 180,
        rotationEnd: ((i * seed * 3 + 90) % 720) - 360,
        delay: (i % 6) * 0.025,
        color: palette[(i + seed) % palette.length],
      };
    });
  }, [triggerKey, count, spread, lift, palette]);

  return (
    <span
      key={triggerKey}
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
    >
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute block"
          style={{
            width: p.size,
            height: p.size * p.ratio,
            left: -p.size / 2,
            top: -(p.size * p.ratio) / 2,
            backgroundColor: p.color,
            // Subtle shadow + slight rounding so pieces don't read as
            // sharp pixels on dark backdrops.
            borderRadius: 1,
            boxShadow: "0 1px 2px rgba(0,0,0,0.25)",
          }}
          initial={{ x: 0, y: 0, opacity: 0, rotate: p.rotation, scale: 0.7 }}
          animate={{
            // Two-stage path: up-and-out, then a longer fall down. The
            // keyframe times pin the launch peak to ~30% of the total
            // duration so the rest is gravity.
            x: [0, p.dx * 0.5, p.dx],
            y: [0, p.dyUp, p.dyUp + p.dyDown],
            opacity: [0, 1, 1, 0],
            rotate: [p.rotation, p.rotation + 60, p.rotationEnd],
            scale: [0.7, 1, 0.9],
          }}
          transition={{
            duration: durationMs / 1000,
            delay: p.delay,
            // Custom easing per axis would be nice, but a single
            // easeOut feels close enough — the bigger dyDown leg
            // dominates so the fall reads as gravity.
            ease: "easeOut",
            times: [0, 0.25, 0.95, 1],
          }}
        />
      ))}
    </span>
  );
}
