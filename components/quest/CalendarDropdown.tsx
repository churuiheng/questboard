"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { datePresets } from "@/lib/questDefaults";

type Props = {
  /** Currently-displayed When value (we don't read it, but accept it so
   *  the parent can decide to highlight an active preset later if it
   *  wants). */
  value: string;
  /** Called with the formatted string ("Friday night", "Fri, Nov 21 ·
   *  7:00 PM", etc.) when the user picks something. */
  onPick: (formatted: string) => void;
};

/**
 * A small calendar-style popover that opens beside the When input. It
 * folds two affordances into one place:
 *
 *   1. Quick-pick chips (Tonight, Tomorrow, Friday night, …) for the
 *      common "make plans casually" path.
 *   2. A native datetime-local input for the "I want a specific Friday
 *      at 7" path.
 *
 * The popover is styled with the same parchment / ink palette as the
 * rest of the form so it feels like part of the app instead of a
 * floating system widget. Closes on click outside, on Escape, and
 * after any selection.
 */
export function CalendarDropdown({ value, onPick }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close on outside click + Escape — same pattern as a real menu.
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

  function pick(formatted: string) {
    onPick(formatted);
    setOpen(false);
  }

  function handleNativeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    if (!raw) return;
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return;
    pick(formatDateTime(date));
  }

  return (
    <div ref={wrapRef} className="relative inline-flex">
      <motion.button
        type="button"
        onClick={() => setOpen((o) => !o)}
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.94, y: 0 }}
        transition={{ type: "spring", stiffness: 340, damping: 22 }}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Pick a date and time"
        // Square button to mirror the randomize squares on the other
        // fields. Slightly taller to match the input height alongside.
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-parchment/15 bg-ink/40 text-gold transition hover:border-gold/60 hover:bg-ink/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
      >
        <CalendarGlyph />
      </motion.button>

      <AnimatePresence>
        {open ? (
          <motion.div
            key="calendar-popover"
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 360, damping: 26 }}
            role="dialog"
            aria-label="Pick a date"
            // Anchored to the right edge so the popover doesn't push off
            // the form on narrow screens.
            className="absolute right-0 top-12 z-30 w-72 rounded-xl border border-gold/30 bg-ink/95 p-3 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.7)] backdrop-blur"
          >
            <p className="mb-2 font-display text-[10px] uppercase tracking-[0.22em] text-gold/75">
              Quick picks
            </p>
            <div className="flex flex-wrap gap-1.5">
              {datePresets.map((d) => {
                const active = value === d;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => pick(d)}
                    aria-pressed={active}
                    className={
                      "inline-flex min-h-[34px] items-center rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 " +
                      (active
                        ? "bg-gold text-ink ring-gold-soft"
                        : "bg-ink/40 text-parchment/85 ring-parchment/15 hover:bg-ink/60 hover:ring-gold/40")
                    }
                  >
                    {d}
                  </button>
                );
              })}
            </div>

            <div className="my-3 h-px bg-parchment/10" />

            <label className="block">
              <span className="mb-1.5 block font-display text-[10px] uppercase tracking-[0.22em] text-gold/75">
                Or pick a specific day
              </span>
              <input
                type="datetime-local"
                onChange={handleNativeChange}
                aria-label="Pick a date and time"
                // Style the native control with our palette. iOS still
                // owns the picker UI, but the trigger looks right.
                className="w-full rounded-lg border border-parchment/15 bg-ink/50 px-3 py-2 text-sm text-parchment outline-none transition focus:border-gold/60 focus:ring-2 focus:ring-gold/30 [color-scheme:dark]"
              />
            </label>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/** Simple parchment-friendly calendar glyph drawn in SVG so it inherits color. */
function CalendarGlyph() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      width={18}
      height={18}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3.5" y="5.5" width="17" height="15" rx="2.5" />
      <path d="M3.5 10h17" />
      <path d="M8 3.5v3.5" />
      <path d="M16 3.5v3.5" />
    </svg>
  );
}

function formatDateTime(date: Date): string {
  const datePart = date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const timePart = date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${datePart} · ${timePart}`;
}
