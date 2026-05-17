# Claude Development Prompt - Quest Invite MVP

Use this prompt when asking Claude Code or another coding assistant to help develop the MVP.

```md
You are helping me build a frontend-only MVP called Quest Invite.

Quest Invite is a playful, game-inspired invitation builder where users turn real-life plans into tiny RPG quests and share them through a link.

Tech stack:
- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- React Three Fiber
- Drei
- Framer Motion
- Zustand if needed
- Vercel deployment

Important constraints:
- No backend
- No database
- No auth
- No AI API
- No paid APIs
- No cloud storage
- No user uploads stored on a server
- All quest data should be stored in a URL-safe encoded string
- Recipient response can be saved locally using localStorage

Core routes:
- `/` landing page
- `/create` quest creation page
- `/invite?q=...` recipient invite page

Core data model:

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

MVP user flow:
1. User visits landing page.
2. User clicks Create Quest.
3. User fills in quest details.
4. Live preview updates.
5. User generates and copies shareable link.
6. Recipient opens `/invite?q=...`.
7. App decodes the quest data.
8. Recipient sees a game-like quest card.
9. Recipient clicks Accept Quest or Maybe Later.
10. Response is saved in localStorage.

Please help me implement this incrementally.

Development rules:
- Keep components clean and reusable.
- Use TypeScript types properly.
- Keep the design mobile-friendly.
- Use Tailwind for styling.
- Use Framer Motion for simple transitions.
- Do not over-engineer.
- Do not add backend logic.
- Do not add dependencies unless necessary.
- Prioritize a polished MVP loop over extra features.

First task:
Create the project structure, quest data types, default quest data, URL encode/decode helpers, and the basic `/create` page with a form and live preview.
```
