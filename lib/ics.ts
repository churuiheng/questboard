"use client";

import type { QuestData } from "@/types/quest";

/**
 * Best-effort .ics generator for a quest. The `dateTimeText` field is
 * deliberately a freeform string so the form stays casual ("Friday
 * night around 7"), which means we have to do some parsing to put it
 * onto a real calendar.
 *
 * Parsing strategy, in order:
 *   1. Native `Date.parse` — handles ISO dates and many locale strings
 *      ("Fri, Nov 21 7:00 PM" usually works).
 *   2. Known preset chips — Tonight, Tomorrow, Friday night, etc. —
 *      each maps to a sensible default time.
 *   3. Day-of-week mentions (regex) — "wednesday", "fri" → next
 *      matching weekday at 7pm.
 *   4. Fallback — today at 7:30pm if nothing matched. Better to give
 *      the user *something* than refuse to export.
 *
 * Returned events default to a 2-hour duration. The user can drag the
 * end after import.
 */

const DEFAULT_DURATION_MS = 2 * 60 * 60 * 1000;
const DEFAULT_HOUR = 19; // 7pm
const DEFAULT_NIGHT_HOUR = 19;
const DEFAULT_WEEKEND_HOUR = 12;

const WEEKDAY_INDEX: Record<string, number> = {
  sun: 0, sunday: 0,
  mon: 1, monday: 1,
  tue: 2, tues: 2, tuesday: 2,
  wed: 3, weds: 3, wednesday: 3,
  thu: 4, thurs: 4, thursday: 4,
  fri: 5, friday: 5,
  sat: 6, saturday: 6,
};

/** Parse the freeform `dateTimeText` to an actual Date, best effort. */
export function parseWhen(text: string, now: Date = new Date()): Date {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return nextWeekdayAt(now, now.getDay(), DEFAULT_HOUR);
  }

  // 1. Try native parsing first — covers ISO, and many locale formats
  //    we ourselves produce via `toLocaleDateString` + `toLocaleTimeString`.
  //    `Date.parse` is famously inconsistent across browsers, but on
  //    modern engines it handles the formats we emit just fine.
  //
  //    We also handle the "·" separator we use ("Fri, Nov 21 · 7:00 PM")
  //    by stripping it before parsing.
  const sanitized = trimmed.replace(/·/g, " ").replace(/\s+/g, " ");
  const direct = Date.parse(sanitized);
  if (!Number.isNaN(direct)) {
    const d = new Date(direct);
    // If the parse landed in the past (e.g. "Friday" parsed as last
    // Friday), nudge it forward a week so the calendar entry is in
    // the future.
    if (d.getTime() < now.getTime() - 60 * 60 * 1000) {
      d.setDate(d.getDate() + 7);
    }
    return d;
  }

  const lower = trimmed.toLowerCase();

  // 2. Known preset phrases.
  if (lower === "tonight") return atHour(now, DEFAULT_NIGHT_HOUR);
  if (lower === "tomorrow") return atHour(addDays(now, 1), DEFAULT_HOUR);
  if (lower === "this weekend") {
    return nextWeekdayAt(now, 6, DEFAULT_WEEKEND_HOUR); // next Saturday noon
  }
  if (lower === "next week") {
    return nextWeekdayAt(now, 1, DEFAULT_HOUR); // next Monday 7pm
  }
  if (lower === "friday night") {
    return nextWeekdayAt(now, 5, DEFAULT_NIGHT_HOUR);
  }
  if (lower === "saturday") {
    return nextWeekdayAt(now, 6, DEFAULT_WEEKEND_HOUR);
  }

  // 3. Mention of a weekday anywhere in the text — pick the next one.
  //    "Wednesday lunch", "see you sat", etc.
  const dayMatch = lower.match(
    /\b(sun|sunday|mon|monday|tue|tues|tuesday|wed|weds|wednesday|thu|thurs|thursday|fri|friday|sat|saturday)\b/,
  );
  if (dayMatch) {
    const dayIdx = WEEKDAY_INDEX[dayMatch[1]];
    const isNight = /night|evening|dinner|late/.test(lower);
    return nextWeekdayAt(now, dayIdx, isNight ? DEFAULT_NIGHT_HOUR : DEFAULT_HOUR);
  }

  // 4. Pure fallback — today, 7:30pm.
  const fallback = new Date(now);
  fallback.setHours(DEFAULT_HOUR, 30, 0, 0);
  if (fallback.getTime() < now.getTime()) {
    fallback.setDate(fallback.getDate() + 1);
  }
  return fallback;
}

function atHour(d: Date, hour: number): Date {
  const out = new Date(d);
  out.setHours(hour, 0, 0, 0);
  return out;
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

/**
 * Return the next occurrence of `targetDay` (0=Sun…6=Sat) at `hour`.
 * If `now` is already that weekday but past the hour, jumps a full week.
 */
function nextWeekdayAt(now: Date, targetDay: number, hour: number): Date {
  const d = atHour(now, hour);
  let diff = (targetDay - d.getDay() + 7) % 7;
  if (diff === 0 && d.getTime() <= now.getTime()) {
    diff = 7;
  }
  d.setDate(d.getDate() + diff);
  return d;
}

/**
 * Format a Date as the basic UTC form .ics expects:
 *   20261120T190000Z
 */
function formatIcsDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getUTCFullYear() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

/**
 * Escape per RFC 5545 — commas, semicolons, backslashes, newlines.
 */
function escapeIcs(input: string): string {
  return input
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

/**
 * Wrap long lines to <=75 octets per RFC 5545. Cheap heuristic that
 * works for ASCII and most UTF-8.
 */
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  let i = 0;
  while (i < line.length) {
    if (i === 0) {
      chunks.push(line.slice(i, i + 75));
      i += 75;
    } else {
      // Continuation lines start with a single space.
      chunks.push(" " + line.slice(i, i + 74));
      i += 74;
    }
  }
  return chunks.join("\r\n");
}

export type IcsInput = {
  quest: QuestData;
  /** Optional override for "now" — useful for tests. */
  now?: Date;
};

/**
 * Build a VCALENDAR string for a single quest. The recipient is
 * the calendar owner (their device), so we omit ATTENDEE entirely —
 * this is a "I'm planning to do this" entry, not a meeting invite.
 */
export function buildIcs({ quest, now = new Date() }: IcsInput): string {
  const start = parseWhen(quest.dateTimeText, now);
  const end = new Date(start.getTime() + DEFAULT_DURATION_MS);
  const dtstamp = formatIcsDate(now);
  const uid = `${dtstamp}-${Math.random().toString(36).slice(2, 10)}@questboard`;

  const summary = quest.title.trim() || "A QuestBoard quest";
  const descriptionParts: string[] = [];
  if (quest.activity.trim()) descriptionParts.push(quest.activity.trim());
  if (quest.reward.trim()) descriptionParts.push(`Reward: ${quest.reward.trim()}`);
  // Location notes carry their own place/address; text notes just become
  // a flavor paragraph in the description.
  if (quest.note.kind === "text" && quest.note.text.trim()) {
    descriptionParts.push(quest.note.text.trim());
  }
  if (quest.senderName.trim()) {
    descriptionParts.push(`From: ${quest.senderName.trim()}`);
  }
  const description = descriptionParts.join("\n\n");

  const location =
    quest.note.kind === "location"
      ? [quest.note.place, quest.note.address].filter((s) => s.trim()).join(", ")
      : "";

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//QuestBoard//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${formatIcsDate(start)}`,
    `DTEND:${formatIcsDate(end)}`,
    `SUMMARY:${escapeIcs(summary)}`,
    description ? `DESCRIPTION:${escapeIcs(description)}` : null,
    location ? `LOCATION:${escapeIcs(location)}` : null,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter((l): l is string => l !== null);

  // CRLF line endings + folding per spec.
  return lines.map(foldLine).join("\r\n") + "\r\n";
}

/**
 * Trigger a download of the .ics file in the browser. Filename uses
 * a safe slug of the quest title.
 */
export function downloadQuestIcs(quest: QuestData): void {
  if (typeof window === "undefined") return;
  const ics = buildIcs({ quest });
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const filename = slugify(quest.title.trim() || "quest") + ".ics";

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  // Some browsers require the anchor to be in the DOM before .click().
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Give the browser a tick to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "quest"
  );
}
