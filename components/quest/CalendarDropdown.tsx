"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { datePresets } from "@/lib/questDefaults";

type Props = {
  /** Currently-displayed When value. We don't parse it back, but accept
   *  it so an active quick-pick chip can highlight. */
  value: string;
  /** Called with the formatted string ("Friday night", "Fri, Nov 21 ·
   *  7:00 PM", etc.) when the user picks something. */
  onPick: (formatted: string) => void;
};

/**
 * The When picker. Two affordances in one popover:
 *
 *   1. Quick-pick chips (Tonight, Tomorrow, …) for the casual path.
 *   2. A fully in-house month calendar + time selector for "I want a
 *      specific Friday at 7".
 *
 * Everything is rendered by us and styled in the parchment / ink / gold
 * palette — there is deliberately NO native `datetime-local`, whose OS
 * picker (the iOS wheel especially) can't be themed and broke the look.
 * Closes on click-outside, Escape, and after a quick-pick selection;
 * the calendar path closes when the user confirms with the Set button.
 */
export function CalendarDropdown({ value, onPick }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const today = useMemo(() => startOfDay(new Date()), []);
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState<Date | null>(null);
  // Default to a "Friday night around 7" vibe so the time is sensible
  // before the user touches it.
  const [hour12, setHour12] = useState(7);
  const [minute, setMinute] = useState(0);
  const [ampm, setAmPm] = useState<"AM" | "PM">("PM");

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

  function pickPreset(formatted: string) {
    onPick(formatted);
    setOpen(false);
  }

  function commitDateTime() {
    if (!selected) return;
    const d = new Date(selected);
    d.setHours(to24h(hour12, ampm), minute, 0, 0);
    onPick(formatDateTime(d));
    setOpen(false);
  }

  const grid = useMemo(() => monthGrid(viewMonth), [viewMonth]);
  const monthLabel = viewMonth.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
  // Don't let the user page back before the current month — quests are
  // always for "soon", never the past.
  const canGoPrev =
    startOfMonth(viewMonth).getTime() > startOfMonth(today).getTime();

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
            className="absolute right-0 top-12 z-30 w-80 rounded-xl border border-gold/30 bg-ink/95 p-3 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.7)] backdrop-blur"
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
                    onClick={() => pickPreset(d)}
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

            {/* Calendar header */}
            <div className="mb-2 flex items-center justify-between">
              <NavButton
                aria-label="Previous month"
                disabled={!canGoPrev}
                onClick={() => setViewMonth((m) => addMonths(m, -1))}
              >
                ‹
              </NavButton>
              <span className="font-display text-[11px] uppercase tracking-[0.18em] text-parchment/85">
                {monthLabel}
              </span>
              <NavButton
                aria-label="Next month"
                onClick={() => setViewMonth((m) => addMonths(m, 1))}
              >
                ›
              </NavButton>
            </div>

            {/* Weekday header */}
            <div className="grid grid-cols-7 gap-1">
              {WEEKDAYS.map((w) => (
                <span
                  key={w}
                  className="py-1 text-center font-display text-[9px] uppercase tracking-[0.12em] text-parchment/40"
                >
                  {w}
                </span>
              ))}
            </div>

            {/* Day grid */}
            <div className="mt-1 grid grid-cols-7 gap-1">
              {grid.map((day, i) =>
                day === null ? (
                  <span key={`pad-${i}`} aria-hidden />
                ) : (
                  <DayCell
                    key={day.getTime()}
                    day={day}
                    disabled={day.getTime() < today.getTime()}
                    selected={selected !== null && sameDay(day, selected)}
                    isToday={sameDay(day, today)}
                    onSelect={() => setSelected(day)}
                  />
                ),
              )}
            </div>

            <div className="my-3 h-px bg-parchment/10" />

            {/* Time row */}
            <div className="flex items-center gap-2">
              <span className="font-display text-[10px] uppercase tracking-[0.22em] text-gold/75">
                Time
              </span>
              <div className="flex flex-1 items-center gap-1.5">
                <TimeSelect
                  aria-label="Hour"
                  value={hour12}
                  onChange={(e) => setHour12(Number(e.target.value))}
                >
                  {Array.from({ length: 12 }, (_, n) => n + 1).map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </TimeSelect>
                <span className="text-parchment/50">:</span>
                <TimeSelect
                  aria-label="Minute"
                  value={minute}
                  onChange={(e) => setMinute(Number(e.target.value))}
                >
                  {Array.from({ length: 12 }, (_, n) => n * 5).map((m) => (
                    <option key={m} value={m}>
                      {String(m).padStart(2, "0")}
                    </option>
                  ))}
                </TimeSelect>
                <TimeSelect
                  aria-label="AM or PM"
                  value={ampm}
                  onChange={(e) => setAmPm(e.target.value as "AM" | "PM")}
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </TimeSelect>
              </div>
            </div>

            <button
              type="button"
              onClick={commitDateTime}
              disabled={!selected}
              className="mt-3 w-full rounded-lg bg-gold px-3 py-2 font-display text-[11px] uppercase tracking-[0.2em] text-ink transition hover:bg-gold-soft disabled:cursor-not-allowed disabled:bg-parchment/15 disabled:text-parchment/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
            >
              {selected
                ? `Set ${selected.toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })} · ${hour12}:${String(minute).padStart(2, "0")} ${ampm}`
                : "Pick a day first"}
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/* ----------------- pieces ----------------- */

function DayCell({
  day,
  disabled,
  selected,
  isToday,
  onSelect,
}: {
  day: Date;
  disabled: boolean;
  selected: boolean;
  isToday: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={day.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      })}
      className={
        "flex h-9 items-center justify-center rounded-md text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 " +
        (disabled
          ? "cursor-not-allowed text-parchment/20"
          : selected
            ? "bg-gold font-semibold text-ink ring-1 ring-gold-soft"
            : isToday
              ? "text-gold ring-1 ring-gold/40 hover:bg-ink/60"
              : "text-parchment/85 hover:bg-ink/60 hover:text-parchment")
      }
    >
      {day.getDate()}
    </button>
  );
}

function NavButton({
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...rest}
      className="flex h-7 w-7 items-center justify-center rounded-md border border-parchment/15 bg-ink/40 text-gold transition hover:border-gold/60 hover:bg-ink/60 disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
    >
      {children}
    </button>
  );
}

/** Compact palette-matched select — used for the hour/minute/AM-PM row. */
function TimeSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { className, children, ...rest } = props;
  return (
    <select
      className={
        "min-h-[34px] flex-1 appearance-none rounded-md border border-parchment/15 bg-ink/50 px-2 py-1 text-center text-sm text-parchment outline-none transition focus:border-gold/60 focus:ring-2 focus:ring-gold/30 " +
        (className ?? "")
      }
      {...rest}
    >
      {children}
    </select>
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

/* ----------------- date helpers ----------------- */

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, delta: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1);
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function to24h(hour12: number, ampm: "AM" | "PM"): number {
  const h = hour12 % 12;
  return ampm === "PM" ? h + 12 : h;
}

/**
 * A flat 7-wide grid for `month`: leading `null`s pad the first row so
 * the 1st lands under its real weekday, then every day of the month.
 */
function monthGrid(month: Date): (Date | null)[] {
  const first = startOfMonth(month);
  const lead = first.getDay();
  const daysInMonth = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0,
  ).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(month.getFullYear(), month.getMonth(), d));
  }
  return cells;
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
