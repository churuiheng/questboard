import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "ghost-ink";
type Size = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-display font-semibold uppercase tracking-[0.18em] transition-transform duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:ring-gold/70";

const variants: Record<Variant, string> = {
  primary:
    "bg-ember text-parchment shadow-[0_8px_24px_-6px_rgba(217,107,52,0.6)] hover:bg-ember-deep",
  secondary:
    "bg-parchment text-ink hover:bg-parchment-deep",
  // Ghost on dark surfaces (page background, ink panels).
  ghost:
    "bg-transparent text-parchment/80 hover:text-parchment hover:bg-parchment/5 ring-1 ring-parchment/20",
  // Ghost on the parchment card — uses ink-colored text so it doesn't
  // fade into the cream background. Pair with `variant="ghost-ink"`
  // anywhere a ghost button sits on the parchment quest card.
  "ghost-ink":
    "bg-transparent text-ink-soft hover:text-ink hover:bg-ink/5 ring-1 ring-ink-soft/30",
};

const sizes: Record<Size, string> = {
  md: "px-5 py-2 text-xs",
  lg: "px-7 py-3 text-sm",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className ?? ""}`}
      {...rest}
    />
  );
}
