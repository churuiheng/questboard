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
 * The note the recipient reads on a scroll. A tagged union so we can add
 * more variations over time without reshaping QuestOption again:
 *
 *   - `text`     — the original short written note (typewriter-revealed
 *                  on the invite page).
 *   - `image`    — a picture note. Because the whole quest travels
 *                  inside the share URL (no backend), the image is
 *                  stored as a compressed data-URL — see
 *                  `lib/imageNote.ts`. `caption` is optional flavor
 *                  text shown beneath it ("" when none).
 *   - `location` — a place note: `place` name + optional `address`.
 *                  Rendered with an auto-built "Open in Maps" link
 *                  (`lib/location.ts`). Pure text, tiny URL footprint.
 *
 * To add a variation later, add a member here and handle its `kind` in
 * the codec guard (questCodec), the draft guard (draft.ts), the form
 * editor (QuestForm NoteEditor), and the three render sites (QuestCard,
 * create-page MessageBanner, QuestCardOverlay).
 */
export type QuestNote =
  | { kind: "text"; text: string }
  | { kind: "image"; image: string; caption: string }
  | { kind: "location"; place: string; address: string };

export type QuestNoteKind = QuestNote["kind"];

/**
 * Per-option fields. Each scroll on the board is one of these.
 * Every option carries its own title, activity, when, reward, note,
 * and difficulty.
 */
export type QuestOption = {
  title: string;
  activity: string;
  dateTimeText: string;
  reward: string;
  note: QuestNote;
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
  note: QuestNote;
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
