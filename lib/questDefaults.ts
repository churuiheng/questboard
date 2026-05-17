import type {
  DifficultyOption,
  QuestBundle,
  QuestData,
  QuestOption,
  ThemeOption,
} from "@/types/quest";

export const difficultyOptions: (DifficultyOption & { icon: string })[] = [
  {
    value: "cozy",
    label: "Cozy",
    blurb: "A gentle outing. Low stakes, high vibes.",
    icon: "🌿",
  },
  {
    value: "normal",
    label: "Normal",
    blurb: "An honest adventure with a clear quest.",
    icon: "⚔",
  },
  {
    value: "legendary",
    label: "Legendary",
    blurb: "A tale they'll tell for ages.",
    icon: "🐉",
  },
  {
    value: "secret",
    label: "Secret Mission",
    blurb: "Tell no one. Bring snacks.",
    icon: "🗝",
  },
];

/**
 * Activity presets carry suggested title + reward pairings. Picking
 * an activity chip auto-fills both, so the user only has to type if
 * they want something custom.
 */
export type ActivityPreset = {
  label: string;       // shown on the chip
  activity: string;    // QuestData.activity
  title: string;       // QuestData.title (auto-suggested)
  reward: string;      // QuestData.reward (auto-suggested)
  icon: string;
};

export const activityPresets: ActivityPreset[] = [
  { label: "Ramen", icon: "🍜", activity: "Ramen dinner", title: "The Great Ramen Expedition", reward: "+50 Happiness" },
  { label: "Coffee", icon: "☕", activity: "Coffee run", title: "A Caffeinated Quest", reward: "+10 Caffeine" },
  { label: "Movie", icon: "🎬", activity: "Movie night", title: "Operation Popcorn", reward: "+1 Memory" },
  { label: "Hike", icon: "🥾", activity: "A wilderness hike", title: "The Wilderness Calls", reward: "Rare loot" },
  { label: "Boba", icon: "🧋", activity: "Boba walk", title: "Boba Patrol", reward: "Snack of legend" },
  { label: "Study", icon: "📚", activity: "Library study", title: "Study Hall Showdown", reward: "+100 XP" },
  { label: "Games", icon: "🎲", activity: "Game night", title: "Tabletop Trials", reward: "Bragging rights" },
  { label: "Picnic", icon: "🧺", activity: "Picnic in the park", title: "The Cozy Clearing", reward: "+1 Friendship" },
];

export const datePresets: string[] = [
  "Tonight",
  "Tomorrow",
  "Friday night",
  "Saturday",
  "This weekend",
  "Next week",
];

export const rewardPresets: string[] = [
  "+50 Happiness",
  "+1 Friendship",
  "+100 XP",
  "Rare loot",
  "A cozy memory",
  "Snack of legend",
];

/**
 * Message templates — the recipient sees one of these as italicized
 * prose on the card. Clicking a template fills the textarea, and the
 * user can still customize from there.
 */
export const messageTemplates: { label: string; text: string }[] = [
  {
    label: "Classic",
    text: "Your presence is requested for a delicious side quest.",
  },
  {
    label: "Heartfelt",
    text: "It would honestly make my day if you came along. No pressure.",
  },
  {
    label: "Dramatic",
    text: "Brave adventurer, the tavern awaits. Your party is incomplete without you.",
  },
  {
    label: "Cozy",
    text: "Just two friends, one excellent plan. Save me a seat.",
  },
  {
    label: "Playful",
    text: "A quest has appeared. Bring snacks. Decline if you dare.",
  },
];

export const themeOptions: ThemeOption[] = [
  {
    value: "tavern",
    label: "Fantasy Tavern",
    blurb: "Warm lanterns, parchment, candle glow.",
  },
];

export function makeDefaultQuestData(): QuestData {
  return {
    title: activityPresets[0].title,
    recipientName: "",
    senderName: "A friend",
    activity: activityPresets[0].activity,
    dateTimeText: datePresets[2],
    reward: activityPresets[0].reward,
    difficulty: "cozy",
    message: messageTemplates[0].text,
    theme: "tavern",
    createdAt: new Date().toISOString(),
  };
}

export function makeDefaultQuestBundle(): QuestBundle {
  return {
    recipientName: "",
    senderName: "A friend",
    message: messageTemplates[0].text,
    theme: "tavern",
    difficulty: "cozy",
    dateTimeText: datePresets[2],
    reward: activityPresets[0].reward,
    createdAt: new Date().toISOString(),
    options: [
      { title: activityPresets[0].title, activity: activityPresets[0].activity },
    ],
  };
}

/** Project one option of a bundle into the QuestData shape that QuestCard expects. */
export function bundleToQuestData(
  bundle: QuestBundle,
  optionIndex: number,
): QuestData {
  const option: QuestOption =
    bundle.options[optionIndex] ?? bundle.options[0];
  return {
    title: option.title,
    activity: option.activity,
    recipientName: bundle.recipientName,
    senderName: bundle.senderName,
    message: bundle.message,
    theme: bundle.theme,
    difficulty: bundle.difficulty,
    dateTimeText: bundle.dateTimeText,
    reward: bundle.reward,
    createdAt: bundle.createdAt,
  };
}

/** Maximum number of options a sender can stack into one bundle. */
export const MAX_OPTIONS = 3;

// Length cap for individual fields to keep encoded URLs reasonable.
// URLs over ~2000 chars start misbehaving on some platforms; this gives
// us comfortable headroom even after base64 encoding.
export const fieldLimits = {
  title: 60,
  recipientName: 40,
  senderName: 40,
  activity: 80,
  dateTimeText: 60,
  reward: 60,
  message: 240,
} as const;
