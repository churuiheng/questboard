import type { QuestData, QuestDifficulty, QuestNote } from "@/types/quest";
import { buildMapsUrl } from "@/lib/location";

type Props = {
  data: QuestData;
  /** "preview" is for the create-page card; "scene" is for the invite page (slightly larger). */
  variant?: "preview" | "scene";
  /** Optional content slot rendered below the body (e.g., Accept buttons). */
  footer?: React.ReactNode;
};

/**
 * The visual centerpiece: a piece of parchment with a quest on it.
 *
 * This card was getting noisy — a Quest Notice eyebrow, a difficulty
 * chip, a ✦ divider, a wood-grain frame ring. We've stripped all that
 * chrome back. The card now reads as: title, a quiet sub-line that
 * names the recipient and whispers the difficulty, three stats, and
 * any footer. The difficulty signal is the same color the wax seal
 * uses on Accept, so the recipient gets a hint of "what flavor of
 * quest" without a chip.
 *
 * Empty fields still show low-opacity italic placeholders so the card
 * never reads as "done" until the sender has filled it in.
 */
export function QuestCard({ data, variant = "preview", footer }: Props) {
  const sizing =
    variant === "scene"
      ? "max-w-xl text-base sm:text-lg"
      : "max-w-md text-sm sm:text-base";

  return (
    <div
      className={`relative w-full ${sizing} mx-auto select-none`}
      role="group"
      aria-label="Quest card"
    >
      {/* Outer wooden frame */}
      <div className="relative rounded-[28px] bg-gradient-to-b from-[#3a2412] via-[#2a1709] to-[#1a0e05] p-3 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.7)] ring-1 ring-black/40">
        {/* Parchment poster */}
        <div className="paper-noise relative overflow-hidden rounded-[20px] bg-gradient-to-b from-parchment to-parchment-deep px-7 py-8 sm:px-10 sm:py-10 text-ink">
          {/* Iron nails in corners */}
          <Nail className="absolute left-3 top-3" />
          <Nail className="absolute right-3 top-3" />
          <Nail className="absolute left-3 bottom-3" />
          <Nail className="absolute right-3 bottom-3" />

          <Heading value={data.title} placeholder="your quest title" />

          <SubLine
            recipientName={data.recipientName}
            difficulty={data.difficulty}
          />

          {/*
            Centerpiece — the visual zone between the sub-line and
            the stats. Its shape changes with the note type so the
            card *feels* different for an image quest vs. a place
            quest vs. a plain message:

              - text  → a thin gold rule (the note text shows below
                        the stats as italic quote, current behavior)
              - image → the actual image, framed in parchment, becomes
                        the focal point of the poster
              - place → a tinted "destination" callout with the pin,
                        place name, and address takes centerstage

            Empty image / location notes fall back to the thin rule
            so the card still reads cleanly while the sender is
            mid-edit. Scene variant skips this entirely — the
            QuestCardOverlay banner shows the note separately there.
          */}
          {variant === "preview" ? (
            <Centerpiece note={data.note} />
          ) : (
            <div className="my-5 h-px w-full bg-ink/15" />
          )}

          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Stat label="Activity" value={data.activity} placeholder="an activity" />
            <Stat label="When" value={data.dateTimeText} placeholder="when" />
            <Stat label="Reward" value={data.reward} placeholder="a reward" />
          </dl>

          {/* Text notes still surface their quoted message below the
              stats. Image/location notes already had their content
              promoted into the centerpiece above, so no second
              rendering is needed for those. */}
          {variant === "preview" && shouldShowFooterNote(data.note) ? (
            <div className="mt-6">
              <NoteLine note={data.note} />
            </div>
          ) : null}

          {footer ? <div className="mt-6">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}

/** Title — solid ink when filled, italic placeholder when not. */
function Heading({
  value,
  placeholder,
}: {
  value: string;
  placeholder: string;
}) {
  const filled = value.trim().length > 0;
  return (
    <h2
      className={
        "font-display text-3xl sm:text-4xl font-bold leading-[1.05] " +
        (filled ? "text-ink" : "italic font-medium text-ink/35")
      }
    >
      {filled ? value : placeholder}
    </h2>
  );
}

/**
 * One quiet line under the title:  "for Alice · cozy"
 *
 * Replaces the old Quest Notice eyebrow + difficulty chip. The
 * difficulty word is tinted in its wax-seal color so the recipient
 * still gets a visual hint (green for cozy, purple for secret, etc.)
 * without chrome.
 */
function SubLine({
  recipientName,
  difficulty,
}: {
  recipientName: string;
  difficulty: QuestDifficulty;
}) {
  const tone = DIFFICULTY_TONE[difficulty];
  const hasRecipient = recipientName.trim().length > 0;
  return (
    <p className="mt-3 font-display text-[11px] uppercase tracking-[0.28em] text-ink-soft">
      {hasRecipient ? (
        <>
          for{" "}
          <span className="text-ink">{recipientName}</span>
          <span className="px-2 text-ink/30" aria-hidden>
            ·
          </span>
        </>
      ) : (
        <>
          <span className="italic tracking-normal text-ink/35">
            (their name)
          </span>
          <span className="px-2 text-ink/30" aria-hidden>
            ·
          </span>
        </>
      )}
      <span style={{ color: tone.color }}>{tone.label}</span>
    </p>
  );
}

const DIFFICULTY_TONE: Record<QuestDifficulty, { label: string; color: string }> = {
  cozy: { label: "cozy", color: "#4d6b2c" },
  normal: { label: "normal", color: "#8a3a16" },
  legendary: { label: "legendary", color: "#6b1f10" },
  secret: { label: "secret mission", color: "#3d2150" },
};

/**
 * The card's visual centerpiece, between the sub-line and the stats.
 * Switches shape based on the note kind:
 *
 *   - filled image     → ImageCenterpiece (the photo IS the focal point)
 *   - filled location  → LocationCenterpiece (a destination callout)
 *   - anything else    → a thin gold rule, same as the old layout
 *
 * Empty image/location notes fall through to the rule so the card
 * keeps reading cleanly while the sender is mid-edit; the placeholder
 * nudge ("Add an image…", "Add a place…") still appears below the
 * stats via `NoteLine`.
 */
function Centerpiece({ note }: { note: QuestNote }) {
  if (note.kind === "image" && note.image) {
    return <ImageCenterpiece note={note} />;
  }
  if (note.kind === "location" && note.place.trim().length > 0) {
    return <LocationCenterpiece note={note} />;
  }
  return <div className="my-5 h-px w-full bg-ink/15" />;
}

/**
 * Whether to repeat the note's content below the stats. We promote
 * image + location into the centerpiece above the stats, so the
 * footer repetition isn't needed for those when they're filled in.
 * Empty states still show their placeholder text below, and text
 * notes always show their quote below.
 */
function shouldShowFooterNote(note: QuestNote): boolean {
  if (note.kind === "image") return !note.image;
  if (note.kind === "location") return note.place.trim().length === 0;
  return true;
}

/**
 * The image as the focal point of the card. Sits between the sub-line
 * and the stats. A pair of hairline rules above and below frame it
 * like a printed photo on a poster; the caption (if any) sits beneath.
 */
function ImageCenterpiece({
  note,
}: {
  note: Extract<QuestNote, { kind: "image" }>;
}) {
  return (
    <figure className="m-0 my-5">
      <div className="h-px w-full bg-ink/15" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={note.image}
        alt={note.caption.trim() || "A picture from the sender"}
        className="my-3 max-h-72 w-full rounded-lg object-contain ring-1 ring-ink/15"
      />
      {note.caption.trim().length > 0 ? (
        <figcaption className="text-center font-serif italic leading-relaxed text-ink-soft">
          {note.caption}
        </figcaption>
      ) : null}
      <div className="h-px w-full bg-ink/15" />
    </figure>
  );
}

/**
 * Location callout — a parchment-tinted block highlighting the place,
 * its address, and a quick "open in Maps" deep link. Reads as "this is
 * where you're going" rather than just a label.
 */
function LocationCenterpiece({
  note,
}: {
  note: Extract<QuestNote, { kind: "location" }>;
}) {
  const mapsUrl = buildMapsUrl(note.place, note.address, note.lat, note.lng);
  return (
    <div className="my-5 flex items-start gap-3 rounded-lg border border-ink/15 bg-ink/[0.04] px-4 py-3 text-ink-soft">
      <PinGlyph />
      <div className="min-w-0 flex-1">
        <p className="font-display text-[10px] uppercase tracking-[0.22em] text-ink-soft/70">
          Destination
        </p>
        <p className="mt-0.5 truncate font-display text-base font-semibold text-ink">
          {note.place}
        </p>
        {note.address.trim().length > 0 ? (
          <p className="font-serif italic leading-snug text-ink-soft">
            {note.address}
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
  );
}

/**
 * Renders whichever note variant the option carries. Text mirrors the
 * old quoted-italic look; image shows the picture with an optional
 * caption. Empty states keep the same low-opacity placeholder nudge so
 * the card never reads as "done" before the sender fills it in.
 */
function NoteLine({ note }: { note: QuestNote }) {
  if (note.kind === "image") {
    if (!note.image) {
      return (
        <p className="font-serif italic leading-relaxed text-ink/35">
          Add an image the recipient will see…
        </p>
      );
    }
    return (
      <figure className="m-0">
        {/* Data-URL image baked into the quest; next/image adds nothing. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={note.image}
          alt={note.caption.trim() || "A picture from the sender"}
          className="max-h-72 w-full rounded-lg object-contain ring-1 ring-ink/15"
        />
        {note.caption.trim().length > 0 ? (
          <figcaption className="mt-1.5 font-serif italic leading-relaxed text-ink-soft">
            {note.caption}
          </figcaption>
        ) : null}
      </figure>
    );
  }

  if (note.kind === "location") {
    if (note.place.trim().length === 0) {
      return (
        <p className="font-serif italic leading-relaxed text-ink/35">
          Add a place the recipient should meet you at…
        </p>
      );
    }
    const mapsUrl = buildMapsUrl(note.place, note.address, note.lat, note.lng);
    return (
      <div className="flex items-start gap-2 text-ink-soft">
        <PinGlyph />
        <div className="min-w-0">
          <p className="font-display text-sm font-semibold text-ink">
            {note.place}
          </p>
          {note.address.trim().length > 0 ? (
            <p className="font-serif italic leading-snug text-ink-soft">
              {note.address}
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
    );
  }

  const filled = note.text.trim().length > 0;
  return (
    <p
      className={
        "font-serif italic leading-relaxed " +
        (filled ? "text-ink-soft" : "text-ink/35")
      }
    >
      {filled ? `“${note.text}”` : "Add a note that the recipient will read…"}
    </p>
  );
}

/** Map-pin glyph in SVG so it inherits the parchment ink color. */
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

function Stat({
  label,
  value,
  placeholder,
}: {
  label: string;
  value: string;
  placeholder: string;
}) {
  const filled = value.trim().length > 0;
  return (
    // Vertical stack: label above value, value wraps freely. All stats
    // render in the same ink color — the old ember accent on Reward
    // is gone, since difficulty already gets a color cue on the
    // sub-line and a second source of color was reading as noise.
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="font-display text-[10px] uppercase tracking-[0.22em] text-ink-soft">
        {label}
      </dt>
      <dd
        className={
          "break-words font-medium leading-snug " +
          (filled ? "text-ink" : "italic text-ink/35")
        }
        title={filled ? value : placeholder}
      >
        {filled ? value : placeholder}
      </dd>
    </div>
  );
}

function Nail({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`h-2.5 w-2.5 rounded-full bg-[radial-gradient(circle_at_30%_30%,#7a5a3a,#2a1709_70%)] shadow-inner ring-1 ring-black/30 ${className}`}
    />
  );
}
