import type { QuestData, QuestNote } from "@/types/quest";
import { buildMapsUrl } from "@/lib/location";
import { DifficultyBadge } from "./DifficultyBadge";

type Props = {
  data: QuestData;
  /** "preview" is for the create-page card; "scene" is for the invite page (slightly larger). */
  variant?: "preview" | "scene";
  /** Optional content slot rendered below the body (e.g., Accept buttons). */
  footer?: React.ReactNode;
};

/**
 * The visual centerpiece. It looks like a wooden quest board with a
 * parchment poster nailed to it. Shared between the create page's
 * live preview and the recipient invite page.
 *
 * Empty fields show low-opacity italic placeholders that nudge the
 * sender about what goes there (e.g. "your quest title"), so the
 * card never reads as "done" until they've actually filled it in.
 */
export function QuestCard({ data, variant = "preview", footer }: Props) {
  const sizing = variant === "scene"
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
        {/* Inner gold/ember rim */}
        <div className="relative rounded-[22px] bg-gradient-to-b from-gold/30 via-ember/15 to-gold/30 p-[2px]">
          {/* Parchment poster */}
          <div className="paper-noise relative overflow-hidden rounded-[20px] bg-gradient-to-b from-parchment to-parchment-deep px-6 py-6 sm:px-8 sm:py-7 text-ink">
            {/* Iron nails in corners */}
            <Nail className="absolute left-3 top-3" />
            <Nail className="absolute right-3 top-3" />
            <Nail className="absolute left-3 bottom-3" />
            <Nail className="absolute right-3 bottom-3" />

            {/* Header strip */}
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="font-display text-[10px] uppercase tracking-[0.32em] text-ink-soft">
                Quest Notice
              </span>
              <DifficultyBadge difficulty={data.difficulty} size="sm" />
            </div>

            <Heading value={data.title} placeholder="your quest title" />

            <RecipientLine value={data.recipientName} />

            <Divider />

            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
              <Stat label="Activity" value={data.activity} placeholder="an activity" />
              <Stat label="When" value={data.dateTimeText} placeholder="when" />
              <Stat label="Reward" value={data.reward} placeholder="a reward" accent />
            </dl>

            {/* Message — only shown on the /create live preview. On the
                /invite overlay (variant="scene") the typewriter banner
                in QuestCardOverlay shows "A message from [sender]" with
                the message text, so showing it here too would duplicate. */}
            {variant === "preview" ? (
              <>
                <Divider />
                <NoteLine note={data.note} />
              </>
            ) : null}

            {footer ? <div className="mt-5">{footer}</div> : null}
          </div>
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
        "font-display text-2xl sm:text-3xl font-bold leading-tight " +
        (filled
          ? "text-ink"
          : "italic font-medium text-ink/35")
      }
    >
      {filled ? value : placeholder}
    </h2>
  );
}

function RecipientLine({ value }: { value: string }) {
  const filled = value.trim().length > 0;
  return (
    <p className="mt-1 font-display text-xs uppercase tracking-[0.22em] text-ink-soft">
      For{" "}
      {filled ? (
        <span className="text-ember-deep">{value}</span>
      ) : (
        <span className="italic tracking-normal text-ink/35">
          (their name)
        </span>
      )}
    </p>
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
    const mapsUrl = buildMapsUrl(note.place, note.address);
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
  accent = false,
}: {
  label: string;
  value: string;
  placeholder: string;
  accent?: boolean;
}) {
  const filled = value.trim().length > 0;
  return (
    // Vertical stack: label sits above the value so long values can wrap
    // onto multiple lines instead of being truncated mid-word. `break-words`
    // lets a single very long word (e.g. an unbroken URL or username) wrap
    // gracefully rather than overflow its column.
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="font-display text-[10px] uppercase tracking-[0.2em] text-ink-soft">
        {label}
      </dt>
      <dd
        className={
          "break-words font-medium leading-snug " +
          (filled
            ? accent
              ? "text-ember-deep"
              : "text-ink"
            : "italic text-ink/35")
        }
        title={filled ? value : placeholder}
      >
        {filled ? value : placeholder}
      </dd>
    </div>
  );
}

function Divider() {
  return (
    <div className="my-3 flex items-center gap-2 text-ink-soft/60">
      <span className="h-px flex-1 bg-ink-soft/30" />
      <span aria-hidden>✦</span>
      <span className="h-px flex-1 bg-ink-soft/30" />
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
