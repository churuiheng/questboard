"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { QuestCard } from "./QuestCard";
import { Typewriter } from "./Typewriter";
import { SparkleBurst } from "./SparkleBurst";
import { Confetti } from "./Confetti";
import { ShareReplyButton } from "./ShareReplyButton";
import { CalendarExportButton } from "./CalendarExportButton";
import { SendOneBackButton } from "./SendOneBackButton";
import { QuestFailedOverlay } from "./QuestFailedOverlay";
import { Button } from "@/components/ui/Button";
import { useSfx } from "@/components/scene/useSfx";
import { buildMapsUrl } from "@/lib/location";
import { pickAcceptanceCheer } from "@/lib/questDefaults";
import type { BundleResponse, QuestData, QuestDifficulty } from "@/types/quest";

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

  function handleAccept() {
    onAccept();
    setSparkleKey((k) => k + 1);
  }

  // Decide what footer state to show on this option.
  let footerState: "idle" | "thisAccepted" | "otherAccepted" | "deferred";
  if (response === null) footerState = "idle";
  else if (response.kind === "maybe_later") footerState = "deferred";
  else if (response.optionIndex === index) footerState = "thisAccepted";
  else footerState = "otherAccepted";

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
      className="absolute inset-0 z-20 flex items-center justify-center px-4 py-12 sm:py-16"
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
                      A message from {quest.senderName.trim() || "the sender"}
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

                {footerState === "thisAccepted" ? (
                  <motion.div
                    key="accepted"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="flex flex-col items-center gap-3"
                  >
                    <AcceptedBanner
                      ending={quest.ending}
                      cheer={cheer}
                      difficulty={quest.difficulty}
                    />
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <CalendarExportButton quest={quest} />
                      <ShareReplyButton quest={quest} />
                      <SendOneBackButton quest={quest} />
                    </div>
                    <button
                      onClick={onResetResponse}
                      className="font-display text-[10px] uppercase tracking-[0.2em] text-ink-soft/60 underline-offset-2 hover:text-ink-soft hover:underline"
                    >
                      Change my mind
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
const SEAL_DESIGN: Record<
  QuestDifficulty,
  { gradient: string; deep: string; ariaLabel: string }
> = {
  cozy: {
    gradient: "radial-gradient(circle at 35% 30%,#a3c065,#4d6b2c 70%)",
    deep: "#3e5a22",
    ariaLabel: "Cozy quest accepted",
  },
  normal: {
    gradient: "radial-gradient(circle at 35% 30%,#e8854b,#c0521f 70%)",
    deep: "#8a3a16",
    ariaLabel: "Quest accepted",
  },
  legendary: {
    gradient: "radial-gradient(circle at 35% 30%,#e36c3e,#8a2a14 70%)",
    deep: "#6b1f10",
    ariaLabel: "Legendary quest accepted",
  },
  secret: {
    gradient: "radial-gradient(circle at 35% 30%,#a78dc4,#4e2e62 70%)",
    deep: "#3d2150",
    ariaLabel: "Secret mission accepted",
  },
};

/**
 * The payoff. Since nothing is sent to a server, the reward for
 * accepting is the moment itself: a wax seal "stamps" down onto the
 * parchment with a spring overshoot. The seal is themed by difficulty
 * (see `SEAL_DESIGN`) so each acceptance feels specific. The sender
 * can customize the line + image via the bundle's `ending`.
 * (SparkleBurst + difficulty-tinted Confetti fire alongside this from
 * the parent.)
 */
function AcceptedBanner({
  ending,
  cheer,
  difficulty,
}: {
  ending: QuestData["ending"];
  cheer: string;
  difficulty: QuestDifficulty;
}) {
  const line = ending.message.trim() || cheer;
  const design = SEAL_DESIGN[difficulty];
  return (
    <div className="flex flex-col items-center gap-2 self-center text-center">
      <motion.div
        initial={{ scale: 1.7, rotate: -16, opacity: 0 }}
        animate={{ scale: 1, rotate: -6, opacity: 1 }}
        transition={{ type: "spring", stiffness: 520, damping: 17, mass: 0.7 }}
        aria-label={design.ariaLabel}
        role="img"
        className="relative flex h-20 w-20 items-center justify-center rounded-full text-parchment shadow-[0_6px_16px_-4px_rgba(0,0,0,0.55),inset_0_2px_6px_rgba(255,255,255,0.25),inset_0_-4px_8px_rgba(0,0,0,0.35)] ring-2"
        style={{
          backgroundImage: design.gradient,
          // Tailwind can't do dynamic ring colors with arbitrary hex,
          // so we set it via CSS variable here (Tailwind reads
          // --tw-ring-color).
          ["--tw-ring-color" as string]: `${design.deep}99`,
        }}
      >
        {/* Scalloped wax rim */}
        <span
          aria-hidden
          className="absolute inset-0 rounded-full border border-dashed border-parchment/30"
        />
        {/* The theme's signature ✦ star — same dingbat used as
            dividers across the card. Cream-on-wax. */}
        <span
          aria-hidden
          className="font-display text-3xl font-bold leading-none text-parchment drop-shadow"
        >
          ✦
        </span>
      </motion.div>
      <div>
        <div
          className="font-display text-sm uppercase tracking-[0.26em]"
          style={{ color: design.deep }}
        >
          Quest Accepted
        </div>
        <div className="mt-0.5 max-w-[18rem] font-serif text-[12px] italic text-ink-soft/85">
          {line}
        </div>
      </div>
      {ending.image ? (
        <motion.figure
          initial={{ opacity: 0, scale: 0.9, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.28, type: "spring", stiffness: 260, damping: 22 }}
          className="m-0 mt-1"
        >
          {/* Sender-supplied celebratory image, baked into the bundle. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ending.image}
            alt="A celebration from the sender"
            className="max-h-52 w-full rounded-md object-contain ring-1 ring-ink/15"
          />
        </motion.figure>
      ) : null}
    </div>
  );
}

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
