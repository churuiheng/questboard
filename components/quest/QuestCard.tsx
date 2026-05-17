import type { QuestData } from "@/types/quest";
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

            <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Stat label="Activity" value={data.activity} placeholder="an activity" />
              <Stat label="When" value={data.dateTimeText} placeholder="when" />
              <Stat label="Reward" value={data.reward} placeholder="a reward" accent />
              <Stat label="From" value={data.senderName} placeholder="a friend" />
            </dl>

            <Divider />

            <MessageLine value={data.message} />

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

function MessageLine({ value }: { value: string }) {
  const filled = value.trim().length > 0;
  return (
    <p
      className={
        "font-serif italic leading-relaxed " +
        (filled ? "text-ink-soft" : "text-ink/35")
      }
    >
      {filled ? `“${value}”` : "Add a note that the recipient will read…"}
    </p>
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
    <div className="flex items-baseline gap-2">
      <dt className="shrink-0 font-display text-[10px] uppercase tracking-[0.2em] text-ink-soft">
        {label}
      </dt>
      <dd
        className={
          "truncate font-medium " +
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
