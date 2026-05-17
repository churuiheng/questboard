import type { QuestDifficulty } from "@/types/quest";

const styles: Record<
  QuestDifficulty,
  { label: string; bg: string; ring: string; text: string }
> = {
  cozy: {
    label: "Cozy",
    bg: "bg-moss/85",
    ring: "ring-moss/60",
    text: "text-parchment",
  },
  normal: {
    label: "Normal",
    bg: "bg-gold/90",
    ring: "ring-gold/60",
    text: "text-ink",
  },
  legendary: {
    label: "Legendary",
    bg: "bg-ember/90",
    ring: "ring-ember/60",
    text: "text-parchment",
  },
  secret: {
    label: "Secret Mission",
    bg: "bg-rune/90",
    ring: "ring-rune/60",
    text: "text-parchment",
  },
};

export function DifficultyBadge({
  difficulty,
  size = "md",
}: {
  difficulty: QuestDifficulty;
  size?: "sm" | "md";
}) {
  const s = styles[difficulty];
  const padding = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-display font-semibold uppercase tracking-[0.18em] ring-1 ${s.bg} ${s.ring} ${s.text} ${padding}`}
    >
      <span aria-hidden>◆</span>
      {s.label}
    </span>
  );
}
