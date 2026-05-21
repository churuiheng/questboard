"use client";

import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { QuestCard } from "./QuestCard";
import { QuestLobbyCard } from "./QuestLobbyCard";
import { pickAcceptanceCheer } from "@/lib/questDefaults";
import type { QuestData } from "@/types/quest";

type Props = {
  /** The quest being previewed. */
  quest: QuestData;
  /** Optional content rendered inside the front face's footer slot. */
  frontFooter?: ReactNode;
};

/**
 * A live preview card the sender can tap to flip front↔back.
 *
 * Front face: the standard `<QuestCard variant="scene" />` they'd ship
 * to the recipient, with whatever footer the parent passes (typically
 * the "A message" banner).
 *
 * Back face: the `<QuestLobbyCard />` the recipient sees after Accept,
 * with `canChangeMind={false}` so the only footer action is "Flip
 * card" — which here just flips back to the front.
 *
 * The flip mechanic is intentionally simpler than the one in
 * `QuestCardOverlay`:
 *   - No accept/reset/celebration state — this is only a preview.
 *   - One click anywhere on the card flips it. Buttons inside the
 *     card (Maps link, Share button on the back, etc.) stop
 *     propagation so they still work without unintentionally flipping.
 *   - No `prefers-reduced-motion` branch yet — the animation is short
 *     (~600ms) and matches what the recipient actually sees.
 *
 * Why share QuestCard + QuestLobbyCard instead of bespoke previews:
 * the sender now sees the *real* surfaces they're shipping. Any visual
 * change to either card automatically shows up in the preview, so we
 * can't drift between "what the preview shows" and "what the recipient
 * gets." This is what let us delete the static EndingPreview chip in
 * the form — its job is now covered by flipping this card.
 */
export function FlippablePreviewCard({ quest, frontFooter }: Props) {
  const [flipped, setFlipped] = useState(false);

  // Deterministic cheer keyed to the quest title, mirroring the
  // production behavior on QuestCardOverlay. The sender previews the
  // same line the recipient will see.
  const cheer = pickAcceptanceCheer(quest.title);

  return (
    <div className="relative" style={{ perspective: "1400px" }}>
      <motion.div
        // CSS preserve-3d lets the rotation actually flip the two
        // faces in 3D space (not just a 2D scale trick).
        className="relative grid w-full [grid-template-areas:'stack']"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.6, ease: [0.45, 0.05, 0.25, 1] }}
      >
        {/* Front face — the quest as shipped. Tap-to-flip lives on
            the outer button so the whole face is the affordance. */}
        <button
          type="button"
          onClick={() => setFlipped(true)}
          aria-label="Tap to preview the post-accept view"
          style={{ backfaceVisibility: "hidden", gridArea: "stack" }}
          className="block w-full cursor-pointer rounded-[28px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
          aria-pressed={flipped}
          // Hide the front from screen readers when the back is up.
          aria-hidden={flipped}
          // The disabled attribute keeps the button non-interactive
          // while it's facing away — without this, a sighted user
          // could focus-trigger it via Tab while looking at the back.
          disabled={flipped}
        >
          <QuestCard data={quest} variant="scene" footer={frontFooter} />
          <FlipHint side="front" visible={!flipped} />
        </button>

        {/* Back face — the lobby card. Pre-rotated 180° on its own
            axis so it lands upright when the parent reaches 180°. */}
        <div
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            gridArea: "stack",
          }}
          aria-hidden={!flipped}
        >
          <QuestLobbyCard
            quest={quest}
            cheer={cheer}
            canChangeMind={false}
            onResetResponse={() => {
              // Not reachable when canChangeMind is false — QuestLobbyCard
              // renders the Flip card button in that case — but the prop
              // is required by the component contract.
            }}
            onFlipBack={() => setFlipped(false)}
          />
          <FlipHint side="back" visible={flipped} />
        </div>
      </motion.div>
    </div>
  );
}

/**
 * Tiny "tap to flip" hint floating just below whichever face is
 * currently visible. Fades out on hover so it doesn't clutter the
 * read of the card itself.
 */
function FlipHint({
  side,
  visible,
}: {
  side: "front" | "back";
  visible: boolean;
}) {
  if (!visible) return null;
  return (
    <p
      aria-hidden
      className="pointer-events-none mt-2 text-center font-display text-[10px] uppercase tracking-[0.28em] text-parchment/45"
    >
      {side === "front"
        ? "Tap card to preview the accepted view ↻"
        : "Tap “Flip card” to see the front ↺"}
    </p>
  );
}
