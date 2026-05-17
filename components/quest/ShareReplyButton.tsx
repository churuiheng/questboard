"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { shareAcceptance } from "@/lib/share";
import type { QuestData } from "@/types/quest";

/**
 * "Tell [sender] you accepted" — opens the device's native share sheet
 * (iOS/Android, plus Chrome/Safari desktop) prefilled with a friendly
 * acceptance message. Falls back to clipboard with a brief confirmation
 * if the Share API isn't available.
 */
export function ShareReplyButton({ quest }: { quest: QuestData }) {
  const [status, setStatus] = useState<"idle" | "shared" | "copied" | "failed">(
    "idle",
  );

  // Friendly label using the sender's name, with sensible fallbacks
  // for the default ("A friend") and blank cases.
  const senderRaw = quest.senderName.trim();
  const senderLabel =
    senderRaw && senderRaw.toLowerCase() !== "a friend" ? senderRaw : "them";

  async function handleShare() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const result = await shareAcceptance({ quest, url });
    if (result === "shared" || result === "copied" || result === "failed") {
      setStatus(result);
      // Briefly show the confirmation, then revert so the button can
      // be tapped again (e.g., to share with a second person).
      window.setTimeout(() => setStatus("idle"), 2200);
    }
  }

  const label =
    status === "shared"
      ? "Sent ✓"
      : status === "copied"
        ? "Copied ✓"
        : status === "failed"
          ? "Try again"
          : `Tell ${senderLabel} ↗`;

  return (
    <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
      <Button
        variant={status === "idle" || status === "failed" ? "primary" : "secondary"}
        size="md"
        onClick={handleShare}
      >
        {label}
      </Button>
    </motion.div>
  );
}
