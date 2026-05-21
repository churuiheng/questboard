"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";

type Props = {
  src: string;
  alt: string;
  /** Class applied to the inline thumbnail. */
  thumbnailClassName?: string;
};

/**
 * An image that renders inline as a banner thumbnail and expands into
 * a full-screen lightbox on click. The thumbnail is cropped
 * (`object-cover`) so it fits the card cleanly; the lightbox shows
 * the *whole* image with `object-contain` so the recipient can see
 * everything the sender chose without the banner crop hiding parts.
 *
 * A small ⤢ glyph in the bottom-right corner signals expandability
 * without needing a separate "expand" button. The whole thumbnail is
 * the tap target — `cursor-zoom-in` reinforces it.
 *
 * Closes on: × button, backdrop click, Escape key.
 */
export function ExpandableImage({
  src,
  alt,
  thumbnailClassName = "block w-full max-h-40 object-cover",
}: Props) {
  const [open, setOpen] = useState(false);
  // Track when we're client-side; createPortal needs `document.body`,
  // which doesn't exist during SSR. The `queueMicrotask` keeps the
  // set call clear of React 19's no-setState-in-effect rule.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  // Escape closes. Captured in the capture phase so the parent
  // overlay's own Escape handler doesn't also fire (which would
  // close the quest card itself, not the lightbox).
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        e.preventDefault();
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open]);

  // The lightbox is rendered through a portal to `document.body`.
  // Why: the lobby card lives inside a 3D-transformed ancestor
  // (the flip container has `transformStyle: preserve-3d` and the
  // back face has its own rotateY transform). Any descendant with
  // `position: fixed` is positioned relative to the nearest
  // transformed ancestor, NOT the viewport — which means without a
  // portal, the lightbox would only cover the back face of the
  // card, and the quest card's own × in the top-right would peek
  // through underneath. Portaling out to <body> escapes the
  // transform context entirely.
  const lightbox = (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          // z-[60] so the lightbox sits above the QuestCardOverlay
          // (z-20), QuestFailedOverlay (z-30), and any inner stamp
          // overlays (z-10).
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-6 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Full image"
        >
          {/* The image itself swallows clicks so backdrop-tap-to-
              close still works only on the backdrop. */}
          <motion.img
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 24 }}
            src={src}
            alt={alt}
            onClick={(e) => e.stopPropagation()}
            className="block max-h-[88vh] max-w-[92vw] rounded-md object-contain shadow-[0_24px_60px_-10px_rgba(0,0,0,0.7)] ring-1 ring-parchment/15"
          />
          {/* Close button in the top-right, same look as the quest
              card's × so it reads as part of the same vocabulary. */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
            aria-label="Close full image"
            className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-ink/80 text-parchment shadow-[0_4px_12px_rgba(0,0,0,0.5)] ring-1 ring-parchment/20 transition-colors hover:bg-ember"
          >
            <span aria-hidden className="text-xl leading-none">
              ×
            </span>
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="View full image"
        className="group relative block w-full cursor-zoom-in overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className={thumbnailClassName} loading="lazy" />
        {/* Small expand glyph in the corner — quiet at rest, gains
            a halo on hover. */}
        <span
          aria-hidden
          className="absolute bottom-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-ink/70 text-parchment opacity-80 ring-1 ring-parchment/20 transition-all group-hover:bg-ink/90 group-hover:opacity-100"
        >
          <ExpandGlyph />
        </span>
      </button>
      {mounted ? createPortal(lightbox, document.body) : null}
    </>
  );
}

function ExpandGlyph() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      width={14}
      height={14}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Two L-shaped corners pointing outward — universally reads
          as "expand". */}
      <path d="M3 6V3h3" />
      <path d="M13 10v3h-3" />
      <path d="M10 3h3v3" />
      <path d="M6 13H3v-3" />
    </svg>
  );
}
