"use client";

import { useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import { getMuted, setMuted, subscribeMuted } from "@/lib/audio";
import { useAssetExists } from "./useAssetExists";

const AUDIO_PATHS = [
  "/audio/ambient_tavern.mp3",
  "/audio/scroll_open.mp3",
  "/audio/quest_accepted.mp3",
];

/**
 * Pill button in the corner of the invite screen for toggling sound.
 * Hidden entirely when no audio asset is present so the UI stays clean.
 */
export function MuteToggle({ className = "" }: { className?: string }) {
  const ambient = useAssetExists(AUDIO_PATHS[0]);
  const click = useAssetExists(AUDIO_PATHS[1]);
  const accept = useAssetExists(AUDIO_PATHS[2]);
  const anyAvailable = [ambient, click, accept].some((s) => s === "present");

  const muted = useSyncExternalStore(subscribeMuted, getMuted, () => false);

  if (!anyAvailable) return null;

  return (
    <motion.button
      type="button"
      onClick={() => setMuted(!muted)}
      whileTap={{ scale: 0.92 }}
      aria-label={muted ? "Unmute audio" : "Mute audio"}
      className={
        "pointer-events-auto flex items-center gap-2 rounded-full bg-ink/60 px-3 py-1.5 ring-1 ring-parchment/15 backdrop-blur transition-colors hover:bg-ink/80 hover:ring-gold/40 " +
        className
      }
    >
      <span aria-hidden className="text-base leading-none">
        {muted ? "🔇" : "🔊"}
      </span>
      <span className="font-display text-[10px] uppercase tracking-[0.22em] text-parchment/75">
        {muted ? "Muted" : "Sound"}
      </span>
    </motion.button>
  );
}
