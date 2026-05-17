"use client";

import { useEffect } from "react";
import { configureAmbient, tryStartAmbient } from "@/lib/audio";
import { useAssetExists } from "./useAssetExists";

/**
 * Mounts the ambient track when the file is present, and tries to start
 * playback. Browsers usually block autoplay until the first user
 * gesture, so we also listen for the first click/touch on the document
 * and retry then.
 *
 * Renders nothing.
 */
export function AmbientStarter({ url }: { url: string }) {
  const status = useAssetExists(url);

  useEffect(() => {
    if (status !== "present") return;
    configureAmbient(url);
    tryStartAmbient();

    const onGesture = () => {
      tryStartAmbient();
    };
    document.addEventListener("click", onGesture, { passive: true, once: false });
    document.addEventListener("touchstart", onGesture, {
      passive: true,
      once: false,
    });
    return () => {
      document.removeEventListener("click", onGesture);
      document.removeEventListener("touchstart", onGesture);
    };
  }, [status, url]);

  return null;
}
