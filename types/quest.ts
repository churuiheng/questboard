// Core data model for a Quest Invite.
// `QuestBundle` is the shareable unit — one URL holds one bundle, which
// in turn may contain 1–3 `QuestOption` alternatives the recipient picks
// between. Each option is fully self-contained (title, activity, when,
// reward, message, difficulty), so the sender can offer "Ramen Friday"
// alongside "Hike Saturday" with totally different vibes.
//
// Only recipient/sender identity and visual theme are shared across the
// whole bundle.

export type QuestDifficulty = "cozy" | "normal" | "legendary" | "secret";

export type QuestTheme = "tavern" | "forest" | "pixel";

/**
 * Per-option fields. Each scroll on the board is one of these.
 * Every option carries its own title, activity, when, reward, message,
 * and difficulty.
 */
export type QuestOption = {
  title: string;
  activity: string;
  dateTimeText: string;
  reward: string;
  message: string;
  difficulty: QuestDifficulty;
};

/** The full shareable unit, encoded into the `?q=` URL parameter. */
export type QuestBundle = {
  recipientName: string;
  senderName: string;
  theme: QuestTheme;
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
