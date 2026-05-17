# Along — UX Principles

> **Read this before starting any new feature.**
> User experience is the highest-priority lens for every decision in this codebase.

---

## The mandate

User experience is top priority. Every interaction must feel natural and meet
or go beyond user expectations. If a feature works but feels clunky, it isn't
done.

When in doubt, pick the option that's quieter, warmer, and more forgiving.

---

## Core principles

### 1. Quiet by default

Along is a memory keeper, not a chat partner. The product wins when users
forget the bot exists until something meaningful surfaces.

- Don't send a chat message when a reaction will do
- Don't send a notification when silence will do
- Don't make the user dismiss a confirmation unless the action is destructive
- One message per save, never two

### 2. Warm copy, never robotic

Everything the bot or dashboard says should sound like a thoughtful friend,
not a notification system.

- "Saved 💛" not "Memory saved successfully"
- "Forgotten 🤍" not "Deletion complete"
- "A quiet week. That's okay." not "0 memories logged this week"
- Use emoji sparingly but meaningfully (🤍 💛 🌅 ✨ 🎉 etc.)

### 3. Reactions over messages where possible

Telegram reactions sit on the user's own message and don't clutter the chat.
Use them for routine confirmations. Reserve chat replies for things that
genuinely deserve a sentence (errors, badge unlocks, backfill dates).

### 4. Feedback is mandatory but invisible-first

The user should always know what's happening, but in the least intrusive way
possible.

- "Working..." indicators (Telegram chat actions, page-level loading) before
  any action that takes >500ms
- ❤️ reactions for silent success
- Explicit replies only when there's information to convey
- Errors must explain *why* and suggest a next step ("That file's too big —
  try a shorter one", not "Upload failed")

### 5. Destructive actions get a real confirmation

Use a styled in-app modal that matches the cream/parchment palette. Never use
`window.confirm()` — it breaks immersion and looks like a system error.

- Title in `font-display`
- Warm body copy that names what will happen
- Two buttons: ghost cancel + accent-color destructive action
- Esc and backdrop click close the modal
- Disabled state during the action

### 6. Couples-only privacy is non-negotiable

Every data-bearing route must enforce session-based auth. Strangers must never
see a couple's data, even at the /api/media level. Use the same error response
for "not authenticated" and "not your couple" so we don't leak the existence of
specific couples.

### 7. Forgive the user, never blame them

When something goes wrong, the bot should never make the user feel like they
did something stupid.

- Photo too big → suggest a shorter version
- Couple not linked → "you'll need to create your space first" not "no couple
  found"
- Wrong invite code → "I couldn't find that one — double-check the spelling?"

### 8. Never lose user data silently

If a memory was sent but couldn't be saved, the bot must tell the user. If a
caption is being edited, autosave or warn before navigating away. If a delete
runs, confirm the delete UI matched the action.

### 9. Match the existing palette and rhythm

New UI must use the established colors:

- `cream` (#FBF6EE) — page background
- `parchment` (#F4ECDD) — secondary surfaces
- `ink` (#3B2F2F) — text
- `rose` (#E8A3A0) — accent / destructive
- `sage` / `sun` — secondary accents

Typography:

- `font-display` (Cormorant Garamond) for headings and emphasis
- `font-sans` (Inter) for body and UI

### 10. Idempotency over speed

For background work (cron jobs, retries, webhooks), idempotency is a UX
feature. A user who sends a photo twice should not see it on the timeline
twice. A cron job that fires twice should not double-send a notification.

Use unique constraints, dedup tables, and sentinel rows freely. Slow-but-
correct beats fast-but-confusing.

### 11. Gamification rewards presence, never punishes absence

No streaks that break. No "you haven't saved in 3 days" guilt. Badges unlock
based on what a couple HAS done, never on what they haven't.

XP rewards good behavior. There is no XP penalty for anything.

### 12. Mobile-first

Couples open the dashboard on their phones during quiet moments — in bed, on
the bus, in line for coffee. Every new screen must work flawlessly at ~380px
width before we care about desktop polish.

---

## Patterns to keep using

- **Telegram chat actions** before slow operations (`upload_photo`, `typing`)
- **Heart reactions** on successful saves
- **Magic-link auth** for dashboard access (bot mints a session token, URL
  hands off to a cookie)
- **Empty states with warmth** ("A quiet week. That's okay.")
- **Per-feature timezones** read from `Couple.timezone` (never the server's
  UTC clock)
- **Dedup tables** for crons (DailyDigest, RecapLog with sentinels, Throwback,
  CountdownReminder)

## Anti-patterns to avoid

- `alert()`, `confirm()`, `prompt()` — never. Use styled modals.
- "Successfully updated" toasts — say the actual outcome instead
- Streaks that punish absence
- Multi-step wizards when one form will do
- Asking the user for things we can infer (their TZ from their location, their
  birthday year from their birthday)
- Public-facing routes that reveal data without auth

---

## When introducing a new feature, ask:

1. Does this respect "quiet by default"? Could it be a reaction instead of a
   message?
2. Does the copy sound like a thoughtful friend?
3. If it fails, does the user understand why AND what to do next?
4. Is there a destructive action that needs a styled confirmation?
5. Does it work on a phone first?
6. Does it match the existing color palette and typography?
7. Is it idempotent if it runs twice?
8. Does it punish absence in any way? (If yes, redesign.)
9. Are private data routes properly auth-gated?
10. Does any new copy match the warmth of the rest of the product?

If any answer is "no" or "I don't know," the feature isn't ready.
