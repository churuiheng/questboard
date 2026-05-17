# Quest Invite Data Model and URL Encoding

## QuestData type

```ts
export type QuestDifficulty = "cozy" | "normal" | "legendary" | "secret";

export type QuestTheme = "tavern" | "forest" | "pixel";

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
```

## Default data

```ts
export const defaultQuestData: QuestData = {
  title: "The Great Ramen Expedition",
  recipientName: "Player Two",
  senderName: "Player One",
  activity: "Ramen dinner",
  dateTimeText: "Friday night",
  reward: "+50 Happiness",
  difficulty: "cozy",
  message: "Your presence is requested for a delicious side quest.",
  theme: "tavern",
  createdAt: new Date().toISOString(),
};
```

## Encoding strategy
Use JSON, URI encoding, and base64url.

The goal is to store small quest data directly inside the URL.

## Example codec file

```ts
// lib/questCodec.ts
import type { QuestData } from "@/types/quest";

function toBase64Url(value: string) {
  return btoa(unescape(encodeURIComponent(value)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64Url(value: string) {
  const padded = value.padEnd(value.length + ((4 - (value.length % 4)) % 4), "=");
  const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  return decodeURIComponent(escape(atob(base64)));
}

export function encodeQuestData(data: QuestData): string {
  const json = JSON.stringify(data);
  return toBase64Url(json);
}

export function decodeQuestData(encoded: string): QuestData | null {
  try {
    const json = fromBase64Url(encoded);
    return JSON.parse(json) as QuestData;
  } catch {
    return null;
  }
}
```

## Link generation

```ts
const encoded = encodeQuestData(questData);
const inviteUrl = `${window.location.origin}/invite?q=${encoded}`;
```

## Invite page decoding

```ts
const searchParams = useSearchParams();
const encodedQuest = searchParams.get("q");
const questData = encodedQuest ? decodeQuestData(encodedQuest) : null;
```

## Local response type

```ts
export type QuestResponse = "accepted" | "maybe_later";
```

## Local response storage

```ts
export function saveQuestResponse(questId: string, response: QuestResponse) {
  localStorage.setItem(`quest-response:${questId}`, response);
}

export function getQuestResponse(questId: string): QuestResponse | null {
  return localStorage.getItem(`quest-response:${questId}`) as QuestResponse | null;
}
```

## Generating a simple quest ID
Use encoded data or createdAt as a lightweight ID.

```ts
export function getQuestId(data: QuestData) {
  return `${data.senderName}-${data.title}-${data.createdAt}`;
}
```

## Limitations
This MVP does not notify the sender when a quest is accepted.

That is intentional.

Reason:
- no backend
- no storage cost
- no auth
- easier to ship

## Data safety note
Do not put private or sensitive information in the quest link.

Anything inside the URL can be seen by people who receive the link.
