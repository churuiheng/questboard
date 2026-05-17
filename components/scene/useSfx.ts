"use client";

import { useCallback } from "react";
import { playSfx } from "@/lib/audio";
import { useAssetExists } from "./useAssetExists";

/**
 * Hook that returns a play() function for a one-shot sound effect.
 * HEAD-checks the URL so missing files are silent and 404-free.
 */
export function useSfx(url: string): () => void {
  const status = useAssetExists(url);
  return useCallback(() => {
    if (status === "present") playSfx(url);
  }, [status, url]);
}
