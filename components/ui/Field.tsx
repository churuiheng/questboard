import type { ReactNode } from "react";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block font-display text-[11px] uppercase tracking-[0.22em] text-parchment/70">
        {label}
      </span>
      {children}
      {hint ? (
        <span className="mt-1 block text-[11px] text-parchment/45">{hint}</span>
      ) : null}
    </label>
  );
}

// min-h-[44px] gives a comfortable mobile tap target (iOS guideline);
// 16px font on inputs prevents Safari's auto-zoom on focus.
const baseInput =
  "w-full min-h-[44px] rounded-lg border border-parchment/15 bg-ink/40 px-3 py-2 text-base text-parchment placeholder-parchment/30 outline-none transition focus:border-gold/60 focus:bg-ink/60 focus:ring-2 focus:ring-gold/30";

export function TextInput(
  props: React.InputHTMLAttributes<HTMLInputElement>,
) {
  const { className, ...rest } = props;
  return <input type="text" className={`${baseInput} ${className ?? ""}`} {...rest} />;
}

export function TextArea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  const { className, ...rest } = props;
  return (
    <textarea
      className={`${baseInput} min-h-[88px] resize-y leading-relaxed ${className ?? ""}`}
      {...rest}
    />
  );
}

export function Select(
  props: React.SelectHTMLAttributes<HTMLSelectElement>,
) {
  const { className, children, ...rest } = props;
  return (
    <select
      className={`${baseInput} appearance-none bg-[length:14px] bg-[right_0.75rem_center] bg-no-repeat pr-9 ${className ?? ""}`}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12' fill='none' stroke='%23e6b352' stroke-width='1.5'><path d='M2 4l4 4 4-4'/></svg>\")",
      }}
      {...rest}
    >
      {children}
    </select>
  );
}
