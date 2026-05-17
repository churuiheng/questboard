"use client";

/**
 * A row of quick-fill chips. Clicking a chip emits its label as the new
 * value — the parent input is the source of truth, so users can still
 * type freely after picking a chip.
 */
export function ChipPicker({
  options,
  currentValue,
  onPick,
  label,
}: {
  options: readonly string[];
  currentValue: string;
  onPick: (value: string) => void;
  label?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <span className="text-[10px] uppercase tracking-[0.2em] text-parchment/45">
          {label}
        </span>
      ) : null}
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const isActive = currentValue.trim() === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onPick(option)}
              className={
                "rounded-full px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 " +
                (isActive
                  ? "bg-gold text-ink ring-1 ring-gold-soft"
                  : "bg-ink/40 text-parchment/75 ring-1 ring-parchment/15 hover:bg-ink/60 hover:text-parchment hover:ring-gold/40")
              }
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
