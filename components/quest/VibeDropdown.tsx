"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { difficultyOptions } from "@/lib/questDefaults";
import type { QuestDifficulty } from "@/types/quest";

type Props = {
  value: QuestDifficulty;
  onChange: (next: QuestDifficulty) => void;
};

/**
 * Vibe (difficulty) picker, styled to match `CalendarDropdown`.
 *
 * The previous implementation was a native `<select>` — cross-platform
 * but visually inconsistent with the in-house calendar popover next
 * door. This one is a custom popover with the same parchment/ink/gold
 * palette and motion treatment, so the two pickers feel like
 * siblings.
 *
 * Each option row shows the difficulty's label + one-line blurb.
 * Selecting closes the popover. Outside click and Escape both close.
 *
 * The dropdown is rendered into a wax-tinted color stripe on the left
 * edge that mirrors the wax-seal palette — a quiet visual hook back
 * to the moment-of-accept stamp.
 */
const DIFFICULTY_STRIPE_COLOR: Record<QuestDifficulty, string> = {
  cozy: "#6f8c4a",
  normal: "#e6b352",
  legendary: "#d96b34",
  secret: "#6e4a86",
};

export function VibeDropdown({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close on outside click + Escape — same pattern as CalendarDropdown.
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pick(next: QuestDifficulty) {
    onChange(next);
    setOpen(false);
  }

  const active = difficultyOptions.find((d) => d.value === value);
  const activeColor = DIFFICULTY_STRIPE_COLOR[value];

  return (
    <div ref={wrapRef} className="relative">
      <motion.button
        type="button"
        onClick={() => setOpen((o) => !o)}
        whileTap={{ scale: 0.985 }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Pick a vibe"
        className={
          "flex h-11 w-full items-center justify-between gap-3 rounded-lg border bg-ink/40 px-3 py-2 text-base text-parchment outline-none transition focus-visible:ring-2 focus-visible:ring-gold/30 " +
          (open
            ? "border-gold/60 bg-ink/60 ring-2 ring-gold/30"
            : "border-parchment/15 hover:border-gold/40")
        }
      >
        <span className="flex min-w-0 items-center gap-2.5">
          {/* Wax-color dot — same palette as the seal on Accept. */}
          <span
            aria-hidden
            className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/30"
            style={{ backgroundColor: activeColor }}
          />
          <span className="truncate font-display text-sm uppercase tracking-[0.18em]">
            {active?.label ?? "Vibe"}
          </span>
        </span>
        <CaretGlyph open={open} />
      </motion.button>

      <AnimatePresence>
        {open ? (
          <motion.div
            key="vibe-popover"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 360, damping: 26 }}
            role="listbox"
            aria-label="Vibe options"
            className="absolute left-0 right-0 top-12 z-30 overflow-hidden rounded-xl border border-gold/30 bg-ink/95 p-2 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.7)] backdrop-blur"
          >
            <ul className="flex flex-col gap-1">
              {difficultyOptions.map((option) => {
                const isActive = option.value === value;
                const dot = DIFFICULTY_STRIPE_COLOR[option.value];
                return (
                  <li key={option.value}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      onClick={() => pick(option.value)}
                      className={
                        "flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 " +
                        (isActive
                          ? "bg-gold/15 ring-1 ring-gold/40"
                          : "hover:bg-parchment/5")
                      }
                    >
                      <span
                        aria-hidden
                        className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/30"
                        style={{ backgroundColor: dot }}
                      />
                      <span className="min-w-0 flex-1">
                        <span
                          className={
                            "block font-display text-sm uppercase tracking-[0.18em] " +
                            (isActive ? "text-gold" : "text-parchment")
                          }
                        >
                          {option.label}
                        </span>
                        <span className="block text-[11px] leading-snug text-parchment/55">
                          {option.blurb}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/** Small caret glyph that flips when the dropdown opens. */
function CaretGlyph({ open }: { open: boolean }) {
  return (
    <motion.svg
      aria-hidden
      viewBox="0 0 12 12"
      width={14}
      height={14}
      animate={{ rotate: open ? 180 : 0 }}
      transition={{ type: "spring", stiffness: 360, damping: 24 }}
      className="shrink-0 text-gold"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 4l4 4 4-4" />
    </motion.svg>
  );
}
