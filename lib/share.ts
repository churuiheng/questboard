"use client";

import type { QuestData } from "@/types/quest";

export type ShareResult = "shared" | "copied" | "failed" | "cancelled";

/**
 * Constructs a short, generic acceptance message and attempts to share
 * it via the device's native share sheet (Web Share API on iOS/Android,
 * plus recent Chrome / Safari on desktop). Falls back to the clipboard
 * when the Share API isn't available, returning "copied" so the caller
 * can show a confirmation toast.
 *
 * Example output:
 *   "Quest accepted ⚔ — The Great Ramen Expedition"
 *
 * Used to include sender + recipient names + a closing line ("Hey
 * Tomás — see you Friday, don't be late, hero. 🤍"). That was too long
 * to read at a glance and the personalization felt awkward when the
 * sender field was generic ("Hey boyfriend"). Shorter is sharper.
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

/**
 * Build the shareable text. Exported so tests + previews can render it.
 *
 * Generic, short, no personalization (sender/recipient names are not
 * referenced) — the URL appended below this in the share sheet
 * provides the full context to whoever receives it.
 */
export function buildAcceptanceText(quest: QuestData): string {
  const title = quest.title.trim();
  return title ? `Quest accepted ⚔ — ${title}` : "Quest accepted ⚔";
}
