"use client";

import { motion } from "framer-motion";
import { ShareReplyButton } from "./ShareReplyButton";
import { QuestCountdown } from "./QuestCountdown";
import { ExpandableImage } from "./ExpandableImage";
import { SEAL_DESIGN } from "@/lib/sealDesign";
import { buildMapsUrl } from "@/lib/location";
import type { QuestEnding, QuestData } from "@/types/quest";

type Props = {
  quest: QuestData;
  /** Pre-picked cheer string from the parent (deterministic per quest). */
  cheer: string;
  /**
   * When true (multi-quest bundles), the footer offers "Change my mind"
   * which clears the response and lets the recipient pick a different
   * scroll. When false (single-quest bundles), changing your mind makes
   * no sense — there's nothing else to pick — so we offer "Flip card"
   * instead, a purely visual toggle back to the front face that
   * preserves the accepted state.
   */
  canChangeMind: boolean;
  /** Clears the response. Only invoked when `canChangeMind` is true. */
  onResetResponse: () => void;
  /**
   * Flips the card back to the front face without clearing the
   * acceptance. Used for the single-quest "Flip card" affordance.
   */
  onFlipBack: () => void;
};

/**
 * The "back of the card" view shown once a quest is accepted. Same
 * parchment frame as the QuestCard so the recipient feels like they're
 * still looking at the same poster — the *content* swaps out for an
 * anticipation lobby:
 *
 *   ┌──────────────────────────────────┐
 *   │  QUEST ACCEPTED        🟢 stamp  │
 *   │  The Great Ramen Expedition      │
 *   │  cheer line in italic            │
 *   │  ───────────────────────────     │
 *   │  Quest begins in                 │
 *   │  09 : 37 : 04                    │
 *   │  Roll for fortune                │
 *   │  ───────────────────────────     │
 *   │  [Calendar] [Tell sender] [Back] │
 *   │  change my mind                  │
 *   └──────────────────────────────────┘
 *
 * Lives inside `QuestCardOverlay` and gets swapped in via
 * AnimatePresence (mode="wait") when the recipient hits Accept,
 * replacing the original QuestCard without changing the card's outer
 * frame size or position.
 */
export function QuestLobbyCard({
  quest,
  cheer,
  canChangeMind,
  onResetResponse,
  onFlipBack,
}: Props) {
  const design = SEAL_DESIGN[quest.difficulty];
  const line = quest.ending.message.trim() || cheer;

  return (
    <div
      className="relative mx-auto w-full max-w-xl select-none"
      role="group"
      aria-label="Quest lobby"
    >
      {/* Outer wooden frame — identical to QuestCard so the swap reads
          as the same card, with new content. */}
      <div className="relative rounded-[28px] bg-gradient-to-b from-[#3a2412] via-[#2a1709] to-[#1a0e05] p-3 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.7)] ring-1 ring-black/40">
        {/* Tighter vertical padding than the front-card (was py-8
            sm:py-10) — the lobby holds more sections (heading +
            countdown + reveal card + buttons), so the whole stack
            needs to fit a phone viewport without orphaning Change
            My Mind below the fold. */}
        <div className="paper-noise relative overflow-hidden rounded-[20px] bg-gradient-to-b from-parchment to-parchment-deep px-7 py-6 sm:px-10 sm:py-7 text-ink">
          {/* Iron nails in corners */}
          <Nail className="absolute left-3 top-3" />
          <Nail className="absolute right-3 top-3" />
          <Nail className="absolute left-3 bottom-3" />
          <Nail className="absolute right-3 bottom-3" />

          {/* No stamp on the back — the stamp lives on the front
              (see QuestCardOverlay's flip wrapper). The recipient
              watches it land, then the card flips to reveal this
              lobby on the other side. */}

          {/* Heading row */}
          <div>
            <span
              className="block font-display text-[10px] uppercase tracking-[0.3em]"
              style={{ color: design.deep }}
            >
              Quest Accepted
            </span>
            <h2 className="mt-1.5 font-display text-2xl font-bold leading-tight text-ink sm:text-3xl">
              {quest.title.trim() || "An Untitled Quest"}
            </h2>
            <p className="mt-2 font-serif text-[13px] italic leading-snug text-ink-soft">
              {line}
            </p>
          </div>

          {/* Thin gold rule — same divider the QuestCard uses.
              Tighter `my-4` here so the section gaps add up to a
              card height that fits the typical phone viewport. */}
          <div className="my-4 h-px w-full bg-ink/15" />

          {/* Live countdown — the engagement centerpiece. */}
          <QuestCountdown dateTimeText={quest.dateTimeText} />

          {/* Reveals reserved for the moment of accept: celebration
              image + meeting place. Stacked tight so the lobby card
              doesn't balloon. */}
          <EndingReveals ending={quest.ending} />

          <div className="mt-5 h-px w-full bg-ink/15" />

          {/* Action row — kept lean: just Share. Calendar export and
              "Send one back" were removed per design feedback to keep
              the post-accept moment focused on the choice the user
              just made. */}
          <div className="mt-4 flex flex-col items-center gap-3">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <ShareReplyButton quest={quest} />
            </div>
            {/* Footer:
                - "Flip card" is always available — purely visual,
                  toggles back to the front face while keeping the
                  accepted state. Lets the recipient peek at the
                  original quest details again without committing.
                - "Change my mind" is gated to multi-quest bundles
                  (canChangeMind) — it actually clears the response so
                  the recipient can pick a different scroll. On a
                  single-quest bundle there's nothing else to pick, so
                  the option is hidden. */}
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
              <button
                type="button"
                onClick={onFlipBack}
                className="font-display text-[10px] uppercase tracking-[0.22em] text-ink-soft/55 underline-offset-2 hover:text-ink-soft hover:underline"
              >
                Flip card
              </button>
              {canChangeMind ? (
                <>
                  <span aria-hidden className="text-ink-soft/30 text-[10px]">
                    ·
                  </span>
                  <button
                    type="button"
                    onClick={onResetResponse}
                    className="font-display text-[10px] uppercase tracking-[0.22em] text-ink-soft/55 underline-offset-2 hover:text-ink-soft hover:underline"
                  >
                    Change my mind
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------------- Ending reveals: image + location ----------------- */

/**
 * "Destination card" — the unified reveal shown once the quest is
 * accepted. Image becomes a hero header that fills the card's full
 * width (no more tiny photo floating in a wide blank slot), and the
 * meeting place renders as a padded caption-footer beneath it. Both
 * are wrapped in one parchment-tinted card with a thin ink ring + a
 * soft inner shadow for depth, so the recipient reads "the
 * destination" as one piece, not two stacked things.
 *
 *   ┌────────────────────────────────┐
 *   │  [hero image, w-full]          │  ← full-bleed photo header
 *   ├────────────────────────────────┤
 *   │  📍 The Cozy Ramen Spot        │  ← location caption footer
 *   │      123 Main St               │
 *   │      Open in Maps ↗            │
 *   └────────────────────────────────┘
 *
 * Either side is optional: text-only quests get no card; image-only
 * gets a hero photo card with no caption; location-only gets just the
 * caption footer (same outer frame). When both are present, a thin
 * ink rule divides them inside the card.
 */
function EndingReveals({ ending }: { ending: QuestEnding }) {
  const hasImage = ending.image.length > 0;
  const location = ending.location;
  const hasLocation = !!location && location.place.trim().length > 0;
  if (!hasImage && !hasLocation) return null;

  const mapsUrl =
    location && hasLocation
      ? buildMapsUrl(
          location.place,
          location.address,
          location.lat,
          location.lng,
        )
      : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: 0.5,
        type: "spring",
        stiffness: 220,
        damping: 24,
      }}
      className="mt-4 overflow-hidden rounded-xl border border-ink/15 bg-ink/[0.03] shadow-[inset_0_1px_2px_rgba(0,0,0,0.06),0_2px_8px_-2px_rgba(0,0,0,0.12)]"
    >
      {hasImage ? (
        <figure className="m-0">
          {/* Banner-style header — `object-cover` so the image fills
              the card edge-to-edge, capped at max-h-40 so it stays a
              header thumbnail and doesn't push the action buttons
              below the fold. Tap-to-expand opens a full-screen
              lightbox where the uncropped image shows via
              object-contain — the banner is the preview, the
              lightbox is the full reveal. */}
          <ExpandableImage
            src={ending.image}
            alt="A celebration from the sender"
          />
        </figure>
      ) : null}

      {hasImage && hasLocation ? (
        <div aria-hidden className="h-px w-full bg-ink/10" />
      ) : null}

      {hasLocation && location ? (
        <div className="flex items-start gap-3 px-4 py-3 text-ink-soft">
          <PinGlyph />
          <div className="min-w-0 flex-1">
            <p className="font-display text-[9px] uppercase tracking-[0.22em] text-ink-soft/70">
              Meeting place
            </p>
            <p className="mt-0.5 truncate font-display text-base font-semibold text-ink">
              {location.place}
            </p>
            {location.address.trim().length > 0 ? (
              <p className="truncate font-serif italic leading-snug text-ink-soft">
                {location.address}
              </p>
            ) : null}
            {mapsUrl ? (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1.5 inline-block font-display text-[10px] uppercase tracking-[0.2em] text-ember-deep underline-offset-2 hover:underline"
              >
                Open in Maps ↗
              </a>
            ) : null}
          </div>
        </div>
      ) : null}
    </motion.div>
  );
}

function PinGlyph() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      width={16}
      height={16}
      className="mt-0.5 shrink-0 text-ember-deep"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 21s-6.5-5.4-6.5-10A6.5 6.5 0 0 1 18.5 11c0 4.6-6.5 10-6.5 10Z" />
      <circle cx="12" cy="11" r="2.4" />
    </svg>
  );
}

/* ----------------- Nail (same as QuestCard's) ----------------- */

function Nail({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`h-2.5 w-2.5 rounded-full bg-[radial-gradient(circle_at_30%_30%,#7a5a3a,#2a1709_70%)] shadow-inner ring-1 ring-black/30 ${className}`}
    />
  );
}
