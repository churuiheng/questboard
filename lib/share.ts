"use client";

import type { QuestData } from "@/types/quest";

export type ShareResult = "shared" | "copied" | "failed" | "cancelled";

/**
 * Constructs a friendly acceptance message and attempts to share it via
 * the device's native share sheet (Web Share API on iOS/Android, plus
 * recent Chrome / Safari on desktop). Falls back to the clipboard when
 * the Share API isn't available, returning "copied" so the caller can
 * show a confirmation toast.
 *
 * Example output:
 *   "Hey Tomás — quest accepted: ⚔ The Great Ramen Expedition! I'm in.
 *    See you Friday night — don't be late, hero. 🤍"
 */
export async function shareAcceptance({
  quest,
  url,
}: {
  quest: QuestData;
  url: string;
}): Promise<ShareResult> {
  const text = buildAcceptanceText(quest);

  // Native share sheet — the right experience on mobile.
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({
        title: "Quest accepted",
        text,
        url,
      });
      return "shared";
    } catch (err) {
      const name = (err as DOMException | undefined)?.name;
      if (name === "AbortError") return "cancelled";
      // For any other error (NotAllowedError, etc.) we'll fall through
      // and try the clipboard.
    }
  }

  // Clipboard fallback — desktop browsers without Share API support.
  const clipboardText = `${text}\n${url}`;
  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard?.writeText
  ) {
    try {
      await navigator.clipboard.writeText(clipboardText);
      return "copied";
    } catch {
      return "failed";
    }
  }

  return "failed";
}

/** Build the shareable text. Exported so tests + previews can render it. */
export function buildAcceptanceText(quest: QuestData): string {
  const senderRaw = quest.senderName.trim();
  // "A friend" is our default — strip it so we don't say "Hey A friend".
  const sender =
    senderRaw && senderRaw.toLowerCase() !== "a friend" ? senderRaw : "";
  const title = quest.title.trim() || "the quest";
  const when = quest.dateTimeText.trim();

  const opener = sender ? `Hey ${sender} —` : "Hey —";
  const middle = `quest accepted: ⚔ ${title}! I'm in.`;
  const closer = when
    ? `See you ${when} — don't be late, hero. 🤍`
    : "Adventure awaits. 🤍";

  return [opener, middle, closer].filter(Boolean).join(" ");
}
