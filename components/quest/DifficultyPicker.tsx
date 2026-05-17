"use client";

import { motion } from "framer-motion";
import { difficultyOptions } from "@/lib/questDefaults";
import type { QuestDifficulty } from "@/types/quest";

/**
 * 2×2 grid of difficulty cards. Each shows an icon, label, and a
 * one-line blurb. The selected one lifts slightly, gets a gold ring,
 * and a small ✦ marker in the corner so the choice reads at a glance.
 */
export function DifficultyPicker({
  value,
  onChange,
}: {
  value: QuestDifficulty;
  onChange: (next: QuestDifficulty) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {difficultyOptions.map((option) => {
        const isActive = option.value === value;
        return (
          <motion.button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97, y: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 22 }}
            className={
              "relative flex flex-col items-start gap-1 overflow-hidden rounded-xl border px-3 py-2.5 text-left transition-[background-color,border-color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 " +
              (isActive
                ? "border-gold/70 bg-gradient-to-b from-ember/25 to-ember/5 shadow-[0_8px_22px_-10px_rgba(217,107,52,0.6)]"
                : "border-parchment/10 bg-ink/40 hover:border-parchment/25 hover:bg-ink/60")
            }
            aria-pressed={isActive}
          >
            {/* Gold corner marker for the selected card */}
            {isActive ? (
              <motion.span
                aria-hidden
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 360, damping: 18 }}
                className="absolute right-2 top-2 text-[10px] text-gold"
              >
                ✦
              </motion.span>
            ) : null}

            <div className="flex items-center gap-2">
              <span className="text-base leading-none" aria-hidden>
                {option.icon}
              </span>
              <span
                className={
                  "font-display text-xs uppercase tracking-[0.18em] " +
                  (isActive ? "text-gold-soft" : "text-parchment")
                }
              >
                {option.label}
              </span>
            </div>
            <span className="text-[11px] leading-snug text-parchment/55">
              {option.blurb}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
