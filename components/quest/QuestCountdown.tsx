"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { parseWhen } from "@/lib/ics";

type Props = {
  /** The freeform When string from the quest. Parsed via `parseWhen`. */
  dateTimeText: string;
};

/**
 * Live "QUEST BEGINS IN — Xd Yh Zm" countdown shown in the
 * AcceptedPanel. We piggy-back on `parseWhen` from `lib/ics.ts` —
 * the same routine the calendar export uses, so the countdown lines
 * up with whatever .ics file the recipient downloaded.
 *
 * Re-renders every second when the event is within an hour (so
 * minutes/seconds tick visibly), and every minute otherwise (a daily
 * countdown doesn't need to flicker the page once a second). If the
 * parse fails or the event is already in the past, returns null so
 * the panel stays uncluttered.
 */
export function QuestCountdown({ dateTimeText }: Props) {
  // Parse once. The result is a Date in local time. parseWhen always
  // succeeds with a fallback ("today 7:30pm"), so the only "no
  // countdown" path is when the parsed date is in the past.
  const eventAt = useMemo(() => parseWhen(dateTimeText), [dateTimeText]);

  // `now` starts null so the SSR snapshot and the first client render
  // produce identical HTML (both render `null` from the early-return
  // below). If we initialized with `Date.now()` directly, the server
  // and client would resolve "now" at different moments — sometimes a
  // minute apart — and React would error: "server text didn't match
  // client" on the countdown digits + aria-label. The first useEffect
  // bumps `now` to the real time, then the interval takes over.
  const [now, setNow] = useState<number | null>(null);

  // Tick interval: 1s when close, 60s when distant. We re-derive it
  // each render so the moment the event passes the "within an hour"
  // threshold, the next interval automatically becomes 1s. While
  // `now` is null (pre-mount) we don't tick at all.
  const tickMs = useMemo(() => {
    if (now === null) return 60_000; // unused — guarded below
    const diff = eventAt.getTime() - now;
    return diff < 60 * 60 * 1000 ? 1000 : 60_000;
  }, [eventAt, now]);

  useEffect(() => {
    // Mount: snap `now` to real time. This triggers a re-render that
    // exposes the countdown body, but the SSR HTML it replaces was
    // identical (null) so React doesn't flag a mismatch.
    //
    // queueMicrotask wrapper keeps the lint rule happy ("no sync
    // setState in effect body") — same pattern used by the saveTick
    // and auto-shorten effects elsewhere in the codebase.
    queueMicrotask(() => setNow(Date.now()));
  }, []);

  useEffect(() => {
    if (now === null) return;
    const id = window.setInterval(() => setNow(Date.now()), tickMs);
    return () => window.clearInterval(id);
  }, [tickMs, now]);

  if (now === null) return null;
  const diffMs = eventAt.getTime() - now;
  if (diffMs <= 0) return null;

  const parts = formatDelta(diffMs);

  // Colors are tuned for the lobby card's parchment background — ink
  // for the digits, soft ink for the unit labels, ember-deep for the
  // "QUEST BEGINS IN" eyebrow so it visually echoes the wax-seal hue.
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.45 }}
      role="timer"
      aria-live="off"
      aria-label={`Quest begins in ${parts.spokenLabel}`}
      className="flex flex-col items-center gap-2"
    >
      <span className="font-display text-[10px] uppercase tracking-[0.32em] text-ember-deep/80">
        Quest begins in
      </span>
      <div className="flex items-baseline gap-4 font-display text-ink">
        {parts.cells.map((cell) => (
          <div key={cell.label} className="flex flex-col items-center">
            <span className="text-3xl font-bold tabular-nums leading-none sm:text-4xl">
              {cell.value}
            </span>
            <span className="mt-1.5 text-[9px] uppercase tracking-[0.22em] text-ink-soft/65">
              {cell.label}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

type DeltaParts = {
  cells: Array<{ label: string; value: string }>;
  spokenLabel: string;
};

/**
 * Format a ms delta as 2-3 "cells" of (number, unit) shown side by
 * side. We pick the three biggest non-zero units so a "T-minus 4 days"
 * doesn't waste space on seconds, and a "T-minus 3 minutes" doesn't
 * waste space on days. Always trims to at most three cells.
 */
function formatDelta(ms: number): DeltaParts {
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  const candidates: Array<{ label: string; value: number }> = [
    { label: "Days", value: days },
    { label: "Hours", value: hours },
    { label: "Min", value: minutes },
    { label: "Sec", value: seconds },
  ];

  // Drop leading zeros — start at the first nonzero unit, then keep
  // exactly three cells (or however many remain).
  const firstNonZero = candidates.findIndex((c) => c.value > 0);
  const start = firstNonZero === -1 ? candidates.length - 2 : firstNonZero;
  const sliced = candidates.slice(start, start + 3);

  const cells = sliced.map((c) => ({
    label: c.label,
    value: String(c.value).padStart(2, "0"),
  }));

  const spokenLabel = sliced
    .map((c) => `${c.value} ${c.label.toLowerCase()}`)
    .join(", ");

  return { cells, spokenLabel };
}
