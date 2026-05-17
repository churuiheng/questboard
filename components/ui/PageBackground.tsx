"use client";

import { useFirstPresentUrl } from "@/components/scene/useAssetExists";

const BACKGROUND_CANDIDATES = [
  "/textures/background.webp",
  "/textures/background.jpg",
  "/textures/background.jpeg",
  "/textures/background.png",
];

/**
 * Single seamless backdrop for the whole app.
 *
 *   1. Drop an image at `public/textures/background.{webp|jpg|jpeg|png}`
 *      → it's used as a `cover`-sized fixed background.
 *   2. No image present → a viewport-fixed radial gradient is rendered
 *      instead. Either way the backdrop stays anchored to the viewport
 *      as the user scrolls, so there's never a visible seam.
 *
 * Mounted once in `app/layout.tsx` so it sits behind every route.
 */
export function PageBackground() {
  const imageUrl = useFirstPresentUrl(BACKGROUND_CANDIDATES);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat"
      style={
        imageUrl
          ? { backgroundImage: `url(${imageUrl})` }
          : {
              // Bounding ellipse 140% × 120% so the gradient's outer
              // edge sits offscreen — no visible shoreline at any
              // viewport size or scroll position.
              background:
                "radial-gradient(140% 120% at 50% 0%, #2a1a0c 0%, #1a1209 50%, #0d0905 100%)",
            }
      }
    />
  );
}
