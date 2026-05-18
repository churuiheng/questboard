"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { downloadQuestIcs } from "@/lib/ics";
import type { QuestData } from "@/types/quest";

/**
 * "Add to calendar" — generates an .ics file from the quest's data and
 * triggers a download. The OS handler then offers to import it into the
 * default calendar app (Apple Calendar, Google Calendar via Chrome
 * helper, Outlook, etc.).
 *
 * After download we briefly flash "Saved ✓" so the user has feedback
 * that something happened, then revert to the default label for repeat
 * taps (sometimes a calendar reschedule import is desirable).
 */
export function CalendarExportButton({ quest }: { quest: QuestData }) {
  const [status, setStatus] = useState<"idle" | "downloaded">("idle");

  function handleClick() {
    downloadQuestIcs(quest);
    setStatus("downloaded");
    window.setTimeout(() => setStatus("idle"), 2200);
  }

  const label = status === "downloaded" ? "Saved ✓" : "Add to calendar";

  return (
    <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
      <Button
        variant={status === "downloaded" ? "secondary" : "ghost-ink"}
        size="md"
        onClick={handleClick}
        aria-label="Download a calendar invite for this quest"
      >
        {label}
      </Button>
    </motion.div>
  );
}
