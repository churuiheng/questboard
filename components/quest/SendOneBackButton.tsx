"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import type { QuestData } from "@/types/quest";

/**
 * "Send one back" — the viral loop. A recipient who's just accepted is
 * the warmest audience the app will ever see; this CTA hands them a
 * one-tap path to make their own quest and reply with it.
 *
 * We navigate to `/create` with the roles SWAPPED as query params:
 *   - `from` (the new sender)   ← the original recipient
 *   - `to`   (the new recipient) ← the original sender
 *
 * `/create` reads these at mount and merges them in only for fields
 * that are still at their defaults, so an in-progress draft is never
 * clobbered.
 *
 * Lives next to the calendar/share buttons on the accepted footer.
 */
export function SendOneBackButton({ quest }: { quest: QuestData }) {
  const router = useRouter();

  function handleClick() {
    // Drop empty params entirely so we never emit `?from=&to=`.
    const recipient = quest.recipientName.trim();
    const sender = quest.senderName.trim();
    // "A friend" is the default sender stub — treat it as no-sender so
    // we don't prefill the new quest with a generic label.
    const isStubSender =
      sender.length === 0 || sender.toLowerCase() === "a friend";

    const params = new URLSearchParams();
    if (recipient) params.set("from", recipient);
    if (!isStubSender) params.set("to", sender);
    const qs = params.toString();
    router.push(`/create${qs ? `?${qs}` : ""}`);
  }

  return (
    <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
      <Button
        variant="ghost-ink"
        size="md"
        onClick={handleClick}
        aria-label="Make your own quest and send it back"
      >
        Send one back ↗
      </Button>
    </motion.div>
  );
}
