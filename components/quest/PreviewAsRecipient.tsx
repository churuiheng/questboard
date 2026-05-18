"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { InviteScreen } from "./InviteScene";
import type { QuestBundle } from "@/types/quest";

/**
 * "Preview as recipient" — a full-screen modal that mounts the actual
 * /invite experience (3D tavern + scroll cards + Accept/Maybe Later)
 * over the /create page, so the sender can see exactly what they're
 * about to ship before they share. The flat live preview catches title
 * and stat issues; this one catches "the message wraps weird in the
 * scene" or "this scroll looks empty from far away" issues.
 *
 * The modal reuses `<InviteScreen/>` directly with a snapshot of the
 * current draft bundle — by snapshotting on open, the preview stays
 * stable while the sender plays with it (typing in the form behind it
 * doesn't make the scene flicker).
 *
 * A small caveat: InviteScreen persists Accept responses to localStorage
 * under the draft's bundleId. In practice this is fine — every keystroke
 * changes the bundleId so old preview responses orphan themselves, and
 * if the sender's own preview-accept happens to leak through to their
 * later visit-as-recipient, that's a tiny easter egg, not a bug.
 */
export function PreviewAsRecipient({ bundle }: { bundle: QuestBundle }) {
  const [open, setOpen] = useState(false);
  // Frozen snapshot — only refreshes when the modal is (re)opened.
  const [snapshot, setSnapshot] = useState<QuestBundle | null>(null);
  // Latched so the snapshot only takes once per open transition.
  const recipientMissing = bundle.recipientName.trim().length === 0;

  function handleOpen() {
    setSnapshot(bundle);
    setOpen(true);
  }

  // Escape closes the preview. We attach in the capture phase so we
  // beat InviteScene's own Escape handler, otherwise hitting Escape
  // would just close the quest card and leave the preview chrome up.
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

  // Lock body scroll while the modal is open so the user can't
  // accidentally scroll the underlying /create page.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <Button
        variant="ghost"
        size="md"
        onClick={handleOpen}
        disabled={recipientMissing}
        aria-disabled={recipientMissing}
        title={
          recipientMissing
            ? "Add a recipient name first to preview the card"
            : "See the quest the way your recipient will"
        }
      >
        Preview as recipient
      </Button>

      <AnimatePresence>
        {open && snapshot ? (
          <motion.div
            key="preview-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            // Above everything else on /create, including the floating
            // mobile-only "See preview" button.
            className="fixed inset-0 z-50 flex flex-col bg-[#0d0905]"
            role="dialog"
            aria-modal="true"
            aria-label="Preview the quest as your recipient will see it"
          >
            {/* Top banner — keeps the sender oriented so they don't
                forget they're in preview mode. */}
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 py-3 sm:px-6">
              <span className="pointer-events-auto rounded-full bg-ink/70 px-3 py-1 font-display text-[10px] uppercase tracking-[0.28em] text-gold/85 ring-1 ring-gold/30 backdrop-blur">
                Previewing as recipient
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close preview"
                className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-ink/80 text-parchment ring-1 ring-parchment/20 backdrop-blur transition-colors hover:bg-ember hover:text-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
              >
                <span aria-hidden className="text-xl leading-none">×</span>
              </button>
            </div>

            {/* The actual recipient screen — full-bleed. */}
            <div className="relative flex-1">
              <InviteScreen bundle={snapshot} />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
