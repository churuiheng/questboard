// Core data model for a Quest Invite.
// `QuestBundle` is the shareable unit — one URL holds one bundle, which
// in turn may contain 1–3 `QuestOption` alternatives the recipient picks
// between. Fields like `dateTimeText`, `reward`, `difficulty` and the
// personal `message` are shared across options.

export type QuestDifficulty = "cozy" | "normal" | "legendary" | "secret";

export type QuestTheme = "tavern" | "forest" | "pixel";

/** Per-option fields. Each scroll on the board is one of these. */
export type QuestOption = {
  title: string;
  activity: string;
};

/** The full shareable unit, encoded into the `?q=` URL parameter. */
export type QuestBundle = {
  recipientName: string;
  senderName: string;
  message: string;
  theme: QuestTheme;
  difficulty: QuestDifficulty;
  dateTimeText: string;
  reward: string;
  createdAt: string;
  options: QuestOption[];
};

/**
 * The "single quest" view that QuestCard renders. Derived from a
 * QuestBundle + an optionIndex via `bundleToQuestData`. We keep this
 * type around so the card component doesn't need to know about bundles.
 */
export type QuestData = {
  title: string;
  recipientName: string;
  senderName: string;
  activity: string;
  dateTimeText: string;
  reward: string;
  difficulty: QuestDifficulty;
  message: string;
  theme: QuestTheme;
  createdAt: string;
};

/** Recipient's response to the whole bundle. Stored in localStorage. */
export type BundleResponse =
  | { kind: "accepted"; optionIndex: number }
  | { kind: "maybe_later" };

export type DifficultyOption = {
  value: QuestDifficulty;
  label: string;
  blurb: string;
};

export type ThemeOption = {
  value: QuestTheme;
  label: string;
  blurb: string;
};
