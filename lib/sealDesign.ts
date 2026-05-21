import type { QuestDifficulty } from "@/types/quest";

/**
 * Wax-seal palette keyed to difficulty. Shared between the corner
 * stamp that lands on the front of the card when a quest is accepted
 * and the "Quest Accepted" heading + accents on the lobby card's
 * back face — both need to read in the same hue so the recipient
 * connects "the wax stamp" with "the lobby color." Pulled into its
 * own module so we don't duplicate the constant in three files.
 *
 * Gradients tuned so a parchment-cream glyph stays legible on the
 * wax — outer (dark) color around L*30, inner highlight around L*60.
 */
export type SealDesign = {
  gradient: string;
  /** Deep accent color used for "Quest Accepted" headings + chrome. */
  deep: string;
  ariaLabel: string;
};

export const SEAL_DESIGN: Record<QuestDifficulty, SealDesign> = {
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
