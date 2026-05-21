"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { shareAcceptance } from "@/lib/share";
import type { QuestData } from "@/types/quest";

/**
 * "Share ↗" — opens the device's native share sheet (iOS/Android, plus
 * Chrome/Safari desktop) prefilled with a friendly acceptance message
 * so the recipient can forward the quest link to anyone. Falls back to
 * clipboard with a brief confirmation if the Share API isn't available.
 *
 * Label used to be "Tell [sender]" but the From field was removed from
 * the form — without an explicitly-typed sender name, personalising
 * the button could only ever read as "Tell A friend" or pick up stale
 * data from old links. A neutral "Share" reads cleanly in every case.
 */
export function ShareReplyButton({ quest }: { quest: QuestData }) {
  const [status, setStatus] = useState<"idle" | "shared" | "copied" | "failed">(
    "idle",
  );

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
          : "Share ↗";

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
