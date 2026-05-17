"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";

/**
 * A short-lived radial burst of golden particles. Mounts when triggered
 * (via React's key change) and animates out. Pure DOM/CSS, no canvas.
 *
 * Usage: pass a unique `triggerKey` that changes when you want a fresh burst.
 */
export function SparkleBurst({
  triggerKey,
  count = 14,
  radius = 80,
  durationMs = 900,
}: {
  triggerKey: number | string;
  count?: number;
  radius?: number;
  durationMs?: number;
}) {
  // Deterministic but varied particle angles so each burst feels organic
  // without being random across re-renders. Re-derive when triggerKey changes
  // so the next burst gets a different scatter.
  const particles = useMemo(() => {
    const seed = String(triggerKey).length + 1;
    return Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2 + (seed % 7) * 0.13;
      const dist = radius * (0.7 + ((i * seed) % 5) / 12);
      return {
        id: i,
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist,
        delay: (i % 4) * 0.03,
        size: 4 + ((i + seed) % 4),
      };
    });
  }, [triggerKey, count, radius]);

  return (
    <span
      key={triggerKey}
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
    >
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute rounded-full bg-gold-soft shadow-[0_0_8px_rgba(230,179,82,0.9)]"
          style={{ width: p.size, height: p.size, left: -p.size / 2, top: -p.size / 2 }}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
          animate={{
            x: p.dx,
            y: p.dy,
            opacity: [0, 1, 0],
            scale: [0.4, 1.1, 0.6],
          }}
          transition={{
            duration: durationMs / 1000,
            delay: p.delay,
            ease: "easeOut",
          }}
        />
      ))}
    </span>
  );
}
