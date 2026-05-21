"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { QuestCard } from "./QuestCard";
import { QuestLobbyCard } from "./QuestLobbyCard";
import { CornerWaxStamp } from "./CornerWaxStamp";
import { Typewriter } from "./Typewriter";
import { SparkleBurst } from "./SparkleBurst";
import { Confetti } from "./Confetti";
import { QuestFailedOverlay } from "./QuestFailedOverlay";
import { Button } from "@/components/ui/Button";
import { useSfx } from "@/components/scene/useSfx";
import { buildMapsUrl } from "@/lib/location";
import { pickAcceptanceCheer } from "@/lib/questDefaults";
import type { BundleResponse, QuestData } from "@/types/quest";

type Props = {
  quest: QuestData;
  index: number;
  total: number;
  acceptedIndex: number | null;
  response: BundleResponse | null;
  onClose: () => void;
  onAccept: () => void;
  onResetResponse: () => void;
  onPrev?: () => void;
  onNext?: () => void;
};

/**
 * Full-screen overlay rendered when the recipient clicks a scroll on
 * the 3D board. Shows the parchment quest card with a typewriter
 * reveal of the message, the accept / maybe-later buttons, and (if
 * the bundle has multiple options) a pagination strip.
 *
 * Closes on:
 *   - The × button in the top-right
 *   - A click on the dimming backdrop
 *   - The Escape key (handled by the parent)
 */
export function QuestCardOverlay({
  quest,
  index,
  total,
  acceptedIndex,
  response,
  onClose,
  onAccept,
  onResetResponse,
  onPrev,
  onNext,
}: Props) {
  const [revealStage, setRevealStage] = useState<"card" | "message" | "choices">(
    "card",
  );
  const [sparkleKey, setSparkleKey] = useState(0);
  // When true, the "Quest Failed · Press F to revive" easter egg covers
  // the card. Maybe Later flips this on locally — nothing is persisted
  // until the user explicitly accepts. Try Again flips it back off and
  // the user is right back at the live buttons.
  const [questFailed, setQuestFailed] = useState(false);

  // Soft quill-scribble plays once when the typewriter starts. HEAD-
  // checked via useSfx, so it's silent if the asset isn't present.
  const playQuill = useSfx("/audio/quill_scribble.mp3");

  // Pagination remounts this component via the parent's `key` prop, so
  // `revealStage` resets to "card" naturally — we just need to schedule
  // the timed transitions.
  // playQuill is a stable callback from useSfx; including it would
  // re-bind the effect on every re-render, restarting the reveal
  // animation. We want this to run exactly once per mount.
  useEffect(() => {
    const t1 = window.setTimeout(() => {
      setRevealStage("message");
      playQuill();
    }, 450);
    const t2 = window.setTimeout(() => setRevealStage("choices"), 1100);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Decide what footer state to show on this option.
  let footerState: "idle" | "thisAccepted" | "otherAccepted" | "deferred";
  if (response === null) footerState = "idle";
  else if (response.kind === "maybe_later") footerState = "deferred";
  else if (response.optionIndex === index) footerState = "thisAccepted";
  else footerState = "otherAccepted";

  // Three-phase flip sequence for the accept moment:
  //
  //   "front"     — quest details visible, no stamp
  //   "stamping"  — wax stamp is animating in on the front; back is
  //                 still hidden by the card not having flipped yet
  //   "flipped"   — card has rotated 180° on Y; lobby content (back
  //                 face) is now facing the camera
  //
  // The initial value is keyed to the persisted response — a recipient
  // returning to an already-accepted quest lands directly on "flipped"
  // (no replay of the stamp animation), while a fresh Accept click runs
  // through stamping → flipped over ~750ms.
  const [flipPhase, setFlipPhase] = useState<
    "front" | "stamping" | "flipped"
  >(() => (footerState === "thisAccepted" ? "flipped" : "front"));

  function handleAccept() {
    onAccept();
    setSparkleKey((k) => k + 1);
    // Sequence the dramatic moment: stamp lands, holds for a beat so
    // the eye registers it, then the card turns over.
    setFlipPhase("stamping");
    window.setTimeout(() => setFlipPhase("flipped"), 750);
  }

  /**
   * "Change my mind" wraps the parent's onResetResponse so the card
   * gets to flip back to the front *first* — otherwise the lobby
   * content would pop out of view as the response clears, which
   * looks abrupt. We trigger the flip immediately and delay the
   * actual reset until the rotation finishes (~600ms).
   */
  function handleResetWithFlip() {
    setFlipPhase("front");
    window.setTimeout(() => onResetResponse(), 620);
  }

  const mapsUrl =
    quest.note.kind === "location"
      ? buildMapsUrl(
          quest.note.place,
          quest.note.address,
          quest.note.lat,
          quest.note.lng,
        )
      : null;

  // Deterministic so it doesn't reshuffle on every re-render, but still
  // varies per quest.
  const cheer = pickAcceptanceCheer(`${quest.title}:${index}`);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      // `items-center` centers the card when it fits the viewport;
      // when the lobby card runs taller than the viewport (image +
      // location + buttons), the browser would otherwise clip the
      // top edge — `overflow-y-auto` falls back to a scrollable
      // modal so the whole card stays reachable.
      className="absolute inset-0 z-20 flex items-center justify-center overflow-y-auto px-4 py-12 sm:py-16"
    >
      {/* Dimming backdrop — clicking it closes the card. */}
      <button
        type="button"
        aria-label="Close quest"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/55 backdrop-blur-[2px]"
      />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.96 }}
        transition={{ type: "spring", stiffness: 130, damping: 20, mass: 0.9 }}
        className="relative w-full max-w-xl"
      >
        {sparkleKey > 0 ? (
          <>
            {/* Two stacked bursts: SparkleBurst gives the fast golden
                "stamp" flash next to the wax seal, Confetti rains down
                in the quest's difficulty color for the choice-specific
                payoff. */}
            <SparkleBurst triggerKey={sparkleKey} />
            <Confetti
              triggerKey={sparkleKey}
              difficulty={quest.difficulty}
            />
          </>
        ) : null}

        {/* True 3D card flip. The parent has `perspective` set so
            child rotateY produces depth. The inner rotates from 0°
            (front facing camera) to 180° (back facing camera). Front
            and back each have `backfaceVisibility: hidden`, so only
            one is visible at a time during the rotation. The back is
            pre-rotated 180° on its own axis so it appears upright
            once the parent reaches 180°.
            Sizing: both faces share a single grid cell (`grid-area:
            stack`) so the container takes the height of whichever
            face is taller. This stops the card from shifting size or
            position between front (quest details) and back (lobby) —
            the recipient sees the same outer frame turn over in
            place. */}
        <div className="relative" style={{ perspective: "1400px" }}>
          <motion.div
            className="relative grid w-full [grid-template-areas:'stack']"
            style={{ transformStyle: "preserve-3d" }}
            animate={{ rotateY: flipPhase === "flipped" ? 180 : 0 }}
            transition={{ duration: 0.72, ease: [0.45, 0.05, 0.25, 1] }}
          >
            {/* Front face */}
            <div
              style={{ backfaceVisibility: "hidden", gridArea: "stack" }}
              className="relative"
              aria-hidden={flipPhase === "flipped"}
            >
        <QuestCard
          data={quest}
          variant="scene"
          footer={
            <div className="flex flex-col gap-4">
              <AnimatePresence mode="wait">
                {revealStage !== "card" ? (
                  <motion.div
                    key="message"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4 }}
                    className="rounded-lg bg-ink/5 px-3 py-2 text-sm text-ink-soft"
                  >
                    <span className="block font-display text-[10px] uppercase tracking-[0.22em] text-ink-soft/70">
                      A message
                    </span>
                    {quest.note.kind === "image" && quest.note.image ? (
                      <figure className="m-0 mt-1.5">
                        {/* Data-URL image carried inside the quest. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={quest.note.image}
                          alt={
                            quest.note.caption.trim() ||
                            "A picture from the sender"
                          }
                          className="max-h-72 w-full rounded-md object-contain ring-1 ring-ink/15"
                        />
                        {quest.note.caption.trim().length > 0 ? (
                          <Typewriter
                            text={quest.note.caption}
                            className="mt-1.5 block font-serif italic"
                          />
                        ) : null}
                      </figure>
                    ) : quest.note.kind === "location" &&
                      quest.note.place.trim().length > 0 ? (
                      <div className="mt-1.5 flex items-start gap-2">
                        <span aria-hidden className="mt-0.5 text-ember-deep">
                          📍
                        </span>
                        <div className="min-w-0">
                          <p className="font-display text-sm font-semibold text-ink">
                            {quest.note.place}
                          </p>
                          {quest.note.address.trim().length > 0 ? (
                            <p className="font-serif italic leading-snug text-ink-soft">
                              {quest.note.address}
                            </p>
                          ) : null}
                          {mapsUrl ? (
                            <a
                              href={mapsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-1 inline-block font-display text-[10px] uppercase tracking-[0.2em] text-ember-deep underline-offset-2 hover:underline"
                            >
                              Open in Maps ↗
                            </a>
                          ) : null}
                        </div>
                      </div>
                    ) : (
                      <Typewriter
                        text={
                          quest.note.kind === "text" &&
                          quest.note.text.trim().length > 0
                            ? quest.note.text
                            : "Your presence is requested."
                        }
                        className="mt-1 block font-serif italic"
                      />
                    )}
                  </motion.div>
                ) : null}
              </AnimatePresence>

              <AnimatePresence mode="wait">
                {revealStage === "choices" && footerState === "idle" ? (
                  <motion.div
                    key="choices"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35 }}
                    className="flex flex-col gap-2 sm:flex-row sm:justify-end"
                  >
                    <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                      <Button
                        variant="ghost-ink"
                        size="lg"
                        onClick={() => setQuestFailed(true)}
                      >
                        Maybe later
                      </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        variant="primary"
                        size="lg"
                        className="ember-pulse"
                        onClick={handleAccept}
                      >
                        ⚔ Accept this quest
                      </Button>
                    </motion.div>
                  </motion.div>
                ) : null}

                {/* The accepted state used to render inside this footer
                    (and inside the card). The big "Quest Accepted"
                    panel now lives on the BACK face of the flipped
                    card (QuestLobbyCard). When the recipient flips
                    back to the front while still accepted, we just
                    surface a quiet "Flip card" link so they know how
                    to return to the lobby — no other footer buttons
                    are needed since accept already happened. */}
                {footerState === "thisAccepted" ? (
                  <motion.div
                    key="thisAccepted"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="flex flex-col items-end gap-2"
                  >
                    <button
                      type="button"
                      onClick={() => setFlipPhase("flipped")}
                      className="font-display text-[10px] uppercase tracking-[0.22em] text-ink-soft/55 underline-offset-2 hover:text-ink-soft hover:underline"
                    >
                      Flip card ↻
                    </button>
                  </motion.div>
                ) : null}

                {footerState === "otherAccepted" ? (
                  <motion.div
                    key="otherAccepted"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="flex flex-col items-end gap-2"
                  >
                    <p className="text-xs text-ink-soft/70">
                      You picked quest {(acceptedIndex ?? 0) + 1} of {total}.
                    </p>
                    <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                      <Button variant="primary" size="md" onClick={handleAccept}>
                        Pick this one instead
                      </Button>
                    </motion.div>
                  </motion.div>
                ) : null}

                {footerState === "deferred" ? (
                  <motion.div
                    key="deferred"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="flex flex-col items-end gap-2"
                  >
                    <DeferredBanner />
                    <button
                      onClick={onResetResponse}
                      className="self-end font-display text-[10px] uppercase tracking-[0.2em] text-ink-soft/60 underline-offset-2 hover:text-ink-soft hover:underline"
                    >
                      Change my mind
                    </button>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          }
        />

              {/* Wax stamp lands on the FRONT of the card top-right
                  while the flip phase is "stamping" or "flipped".
                  Wrapper is pointer-events-none + z-10 so it overlays
                  the card without intercepting clicks. */}
              <AnimatePresence>
                {flipPhase !== "front" ? (
                  <div
                    key="front-stamp"
                    className="pointer-events-none absolute right-5 top-5 z-10 sm:right-7 sm:top-6"
                  >
                    <CornerWaxStamp difficulty={quest.difficulty} />
                  </div>
                ) : null}
              </AnimatePresence>
            </div>

            {/* Back face — pre-rotated 180° on Y so the lobby reads
                upright once the parent has rotated. Shares the same
                grid cell as the front so the wrapper's height is
                max(front, back) — no size jump between faces. */}
            <div
              style={{
                backfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
                gridArea: "stack",
              }}
              aria-hidden={flipPhase !== "flipped"}
            >
              <QuestLobbyCard
                quest={quest}
                cheer={cheer}
                canChangeMind={total > 1}
                onResetResponse={handleResetWithFlip}
                onFlipBack={() => setFlipPhase("front")}
              />
            </div>
          </motion.div>
        </div>

        {/* Close button — top right of the card */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close quest"
          className="absolute -right-2 -top-2 flex h-9 w-9 items-center justify-center rounded-full bg-ink text-parchment shadow-[0_4px_12px_rgba(0,0,0,0.5)] ring-1 ring-parchment/20 transition-colors hover:bg-ember hover:text-parchment focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
        >
          <span aria-hidden className="text-lg leading-none">×</span>
        </button>

        {/* Quest Failed easter egg — covers the card when Maybe Later
            is tapped. Closes (back to the live card) on Try Again, F,
            or Escape. Stays scoped to this overlay so the rest of the
            scene isn't affected. */}
        <AnimatePresence>
          {questFailed ? (
            <QuestFailedOverlay
              seed={`${quest.title}:${index}`}
              onTryAgain={() => setQuestFailed(false)}
            />
          ) : null}
        </AnimatePresence>

        {/* Pagination — arrow buttons flanking animated dot indicators. */}
        {total > 1 ? (
          <div
            className="mt-4 flex items-center justify-center gap-4"
            role="navigation"
            aria-label="Quest pagination"
          >
            <motion.button
              type="button"
              onClick={onPrev}
              whileTap={{ scale: 0.92 }}
              whileHover={{ x: -2 }}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-ink/70 text-parchment ring-1 ring-parchment/15 hover:bg-ink"
              aria-label="Previous quest"
            >
              ◀
            </motion.button>
            <ol
              className="flex items-center gap-2"
              aria-label={`Quest ${index + 1} of ${total}`}
            >
              {Array.from({ length: total }, (_, i) => {
                const active = i === index;
                return (
                  <li key={i}>
                    <motion.span
                      aria-current={active ? "true" : undefined}
                      animate={{
                        width: active ? 22 : 8,
                        opacity: active ? 1 : 0.45,
                      }}
                      transition={{ type: "spring", stiffness: 320, damping: 24 }}
                      className={
                        "block h-2 rounded-full " +
                        (active ? "bg-gold" : "bg-parchment/60")
                      }
                    />
                  </li>
                );
              })}
            </ol>
            <motion.button
              type="button"
              onClick={onNext}
              whileTap={{ scale: 0.92 }}
              whileHover={{ x: 2 }}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-ink/70 text-parchment ring-1 ring-parchment/15 hover:bg-ink"
              aria-label="Next quest"
            >
              ▶
            </motion.button>
          </div>
        ) : null}
      </motion.div>
    </motion.div>
  );
}

/* ----------------- Banners ----------------- */

/**
 * Wax-seal design keyed to each difficulty. The glyph + gradient + ring
 * together convey "this acceptance is for *this kind of quest*", so a
 * cozy ramen accept reads in deep green with a leaf, a legendary quest
 * stamps a dragon in deep ember, a secret mission seals in royal
 * purple with an old key. The "Quest Accepted" label inherits the same
 * deep-tone color so the whole banner reads as one piece.
 *
 * Gradients tuned to keep enough contrast for a parchment-white glyph
 * — the outer (darker) color sits around L*30, the inner highlight
 * around L*60.
 */
/**
 * Wax-seal palette keyed to difficulty. The glyph is the same ✦ star
 * the rest of the theme uses for dividers — emoji glyphs (🌿🐉🗝)
 * felt out of place against the Cinzel/parchment aesthetic, so we
 * lean on color alone to whisper which kind of quest got accepted.
 *
 * Gradients tuned to keep enough contrast for a parchment-cream
 * glyph — the outer (darker) color sits around L*30, the inner
 * highlight around L*60.
 */
function DeferredBanner() {
  return (
    <div className="flex items-center gap-3 rounded-full bg-ink/10 px-4 py-2 ring-1 ring-ink-soft/30">
      <span aria-hidden className="text-ink-soft/70">⌛</span>
      <div className="text-right">
        <div className="font-display text-sm uppercase tracking-[0.22em] text-ink-soft">
          Saved for later
        </div>
        <div className="text-[11px] text-ink-soft/80">
          The adventure can wait.
        </div>
      </div>
    </div>
  );
}
