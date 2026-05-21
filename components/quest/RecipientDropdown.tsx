"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { TextInput } from "@/components/ui/Field";
import { fieldLimits } from "@/lib/questDefaults";

type Props = {
  value: string;
  onChange: (next: string) => void;
};

/**
 * Recipient picker, styled to match `VibeDropdown` and
 * `CalendarDropdown` — same parchment/ink/gold popover treatment so
 * the three pickers along the top of the form feel like siblings.
 *
 * Replaces the earlier native <select> + conditional text input.
 *
 * Modes:
 *   - "preset"  → user picked My Friend or My Love. Bundle's
 *                 `recipientName` stores the preset label verbatim.
 *   - "custom"  → user picked "Custom name…" (or arrived with a draft
 *                 or `?to=` seed that doesn't match a preset). A
 *                 TextInput appears below for free-form entry.
 *
 * Mode is derived from the current value (no separate state needed)
 * so restored drafts and URL seeds round-trip cleanly without a flash.
 */

type PresetOption = {
  /** The string stored verbatim in `recipientName`. */
  value: string;
  /** Display label in the dropdown row. */
  label: string;
  /** One-line blurb under the label, mirroring VibeDropdown. */
  blurb: string;
};

const PRESETS: readonly PresetOption[] = [
  {
    value: "My Friend",
    label: "My Friend",
    blurb: "A casual hang or favor.",
  },
  {
    value: "My Love",
    label: "My Love",
    blurb: "Something just for the two of you.",
  },
] as const;

const CUSTOM_SENTINEL = "__custom__";

export function RecipientDropdown({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close on outside click + Escape — same pattern as VibeDropdown.
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

  // Mode detection: an exact (trimmed) preset match is preset mode;
  // anything else (including empty) is custom mode. This lets a
  // restored draft with a freeform name like "Tomás" land in custom
  // mode automatically without us tracking a separate flag.
  const trimmed = value.trim();
  const matchedPreset = PRESETS.find((p) => p.value === trimmed);
  const isCustom = matchedPreset === undefined;

  function pick(next: string) {
    if (next === CUSTOM_SENTINEL) {
      // Switching INTO custom from a preset: clear the field so the
      // input below is empty and ready to type into. If the user was
      // already in custom mode we preserve whatever they had typed.
      if (!isCustom) onChange("");
    } else {
      onChange(next);
    }
    setOpen(false);
  }

  // Button display: show the preset label, or "Custom name…" / typed
  // value when in custom mode.
  const buttonLabel = isCustom
    ? trimmed.length > 0
      ? trimmed
      : "Custom name…"
    : (matchedPreset?.label ?? "Pick a recipient");

  return (
    <div className="flex flex-col gap-2">
      <div ref={wrapRef} className="relative">
        <motion.button
          type="button"
          onClick={() => setOpen((o) => !o)}
          whileTap={{ scale: 0.985 }}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label="Pick a recipient"
          className={
            "flex h-11 w-full items-center justify-between gap-3 rounded-lg border bg-ink/40 px-3 py-2 text-base text-parchment outline-none transition focus-visible:ring-2 focus-visible:ring-gold/30 " +
            (open
              ? "border-gold/60 bg-ink/60 ring-2 ring-gold/30"
              : "border-parchment/15 hover:border-gold/40")
          }
        >
          <span className="flex min-w-0 items-center gap-2.5">
            {/* Tiny ✦ glyph — same family as VibeDropdown's wax dot
                but in gold, so the two pickers visually rhyme without
                stealing the wax-color signal. */}
            <span
              aria-hidden
              className="text-gold/80 text-sm leading-none"
            >
              ✦
            </span>
            <span className="truncate font-display text-sm uppercase tracking-[0.18em]">
              {buttonLabel}
            </span>
          </span>
          <CaretGlyph open={open} />
        </motion.button>

        <AnimatePresence>
          {open ? (
            <motion.div
              key="recipient-popover"
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 360, damping: 26 }}
              role="listbox"
              aria-label="Recipient options"
              className="absolute left-0 right-0 top-12 z-30 overflow-hidden rounded-xl border border-gold/30 bg-ink/95 p-2 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.7)] backdrop-blur"
            >
              <ul className="flex flex-col gap-1">
                {PRESETS.map((option) => {
                  const isActive = matchedPreset?.value === option.value;
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
                          className="mt-1 shrink-0 text-base leading-none text-gold/80"
                        >
                          ✦
                        </span>
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
                {/* Custom escape hatch — picks the sentinel value so
                    pick() can branch into "reveal the text input"
                    rather than write a literal "__custom__" to the
                    bundle. */}
                <li>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isCustom}
                    onClick={() => pick(CUSTOM_SENTINEL)}
                    className={
                      "flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 " +
                      (isCustom
                        ? "bg-gold/15 ring-1 ring-gold/40"
                        : "hover:bg-parchment/5")
                    }
                  >
                    <span
                      aria-hidden
                      className="mt-1 shrink-0 text-base leading-none text-gold/80"
                    >
                      ✎
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={
                          "block font-display text-sm uppercase tracking-[0.18em] " +
                          (isCustom ? "text-gold" : "text-parchment")
                        }
                      >
                        Custom name…
                      </span>
                      <span className="block text-[11px] leading-snug text-parchment/55">
                        Type their actual name.
                      </span>
                    </span>
                  </button>
                </li>
              </ul>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {isCustom ? (
        <TextInput
          id="quest-recipient-input"
          value={value}
          maxLength={fieldLimits.recipientName}
          placeholder="Their name…"
          onChange={(e) => onChange(e.target.value)}
          className="text-lg"
          required
          aria-required="true"
          aria-label="Recipient's name"
          autoComplete="off"
          autoCapitalize="words"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="next"
        />
      ) : null}

      {trimmed.length === 0 ? (
        <p className="text-[11px] text-parchment/45">
          Their name shows up on every scroll.
        </p>
      ) : null}
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
