import type {
  DifficultyOption,
  QuestBundle,
  QuestData,
  QuestEnding,
  QuestNote,
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
  activity: string;    // QuestOption.activity
  title: string;       // QuestOption.title (auto-suggested)
  reward: string;      // QuestOption.reward (auto-suggested)
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

/**
 * Light-hearted one-liners shown on the wax seal the moment the
 * recipient accepts. There's no backend to notify the sender, so the
 * payoff is the fun of the moment itself — keep these grin-worthy.
 */
export const acceptanceCheers: string[] = [
  "The party grows stronger. ⚔️",
  "A new legend begins. 🗺️",
  "Snacks have been morally secured. 🥟",
  "Destiny: successfully rescheduled to be awesome.",
  "+1 to the friendship stat. 🤍",
  "The tavern erupts in distant cheering.",
  "Quest log updated. Don't be late, hero.",
  "Critical hit on a good time. 🎲",
];

/**
 * Pick a cheer deterministically from a seed (quest title + option
 * index) so it stays stable across re-renders — no flicker, but still
 * varies between quests.
 */
export function pickAcceptanceCheer(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return acceptanceCheers[h % acceptanceCheers.length];
}

export const themeOptions: ThemeOption[] = [
  {
    value: "tavern",
    label: "Fantasy Tavern",
    blurb: "Warm lanterns, parchment, candle glow.",
  },
];

/**
 * A single QuestOption preset matching the canonical "Great Ramen
 * Expedition" example. Used as the starter option on /create.
 */
/** A fresh text note seeded with the first template. */
export function makeDefaultNote(): QuestNote {
  return { kind: "text", text: messageTemplates[0].text };
}

/**
 * Switching note type in the form shouldn't lose what the user already
 * had, but the two variants share no fields, so we just hand back a
 * clean note of the requested kind. The form keeps the previous note in
 * its own state if it wants to restore on toggle-back.
 */
export function makeEmptyNote(kind: QuestNote["kind"]): QuestNote {
  switch (kind) {
    case "image":
      return { kind: "image", image: "", caption: "" };
    case "location":
      return { kind: "location", place: "", address: "" };
    default:
      return { kind: "text", text: "" };
  }
}

export function makeDefaultQuestOption(): QuestOption {
  return {
    title: activityPresets[0].title,
    activity: activityPresets[0].activity,
    dateTimeText: datePresets[2],
    reward: activityPresets[0].reward,
    note: makeDefaultNote(),
    difficulty: "cozy",
  };
}

/** A blank custom ending (falls back to a random cheer at render time). */
export function makeDefaultEnding(): QuestEnding {
  return { message: "", image: "" };
}

export function makeDefaultQuestBundle(): QuestBundle {
  return {
    recipientName: "",
    senderName: "A friend",
    theme: "tavern",
    createdAt: new Date().toISOString(),
    options: [makeDefaultQuestOption()],
    ending: makeDefaultEnding(),
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
    dateTimeText: option.dateTimeText,
    reward: option.reward,
    note: option.note,
    difficulty: option.difficulty,
    // Bundle-level, so every projected option carries the same ending.
    // Legacy bundles have none — hand back a blank one.
    ending: bundle.ending ?? makeDefaultEnding(),
    recipientName: bundle.recipientName,
    senderName: bundle.senderName,
    theme: bundle.theme,
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
  // `message` caps the text-note variant. `caption` caps the optional
  // line under an image note. `place`/`address` cap the location note.
  // All ride in the URL, so all stay short.
  message: 240,
  caption: 120,
  // `endingMessage` caps the sender's custom accept-celebration line.
  endingMessage: 160,
  place: 60,
  address: 120,
} as const;
