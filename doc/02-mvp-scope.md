# Quest Invite MVP Scope

## MVP goal
Build the smallest useful version of Quest Invite that can be shared publicly and tested with real users.

## Core MVP flow
1. User lands on homepage.
2. User clicks "Create Quest".
3. User fills in a simple quest form.
4. App generates a preview.
5. User copies a shareable link.
6. Recipient opens the link.
7. Recipient sees the quest invite scene.
8. Recipient clicks "Accept Quest" or "Maybe Later".

## Must-have features

### 1. Quest creation form
Fields:
- Quest title
- Recipient name
- Sender name
- Location or activity
- Date/time text
- Reward text
- Difficulty level
- Short message
- Theme selection

Example difficulty values:
- Cozy
- Normal
- Legendary
- Secret Mission

Example themes:
- Fantasy Tavern
- Cozy Forest
- Pixel Adventure

For MVP, start with one theme only.

### 2. Live quest preview
Show a game-like card preview while the user edits.

Preview should include:
- title
- recipient name
- reward
- difficulty
- message
- call-to-action buttons

### 3. Shareable link generation
No backend required.

Use encoded data inside the URL.

Example structure:

```txt
/invite?q=ENCODED_QUEST_DATA
```

The app decodes the URL data and renders the invitation page.

### 4. Recipient invite page
The recipient sees a polished game-like screen.

Scene structure:
- animated background
- quest board / quest card
- typewriter message
- accept button
- maybe later button
- small celebration animation when accepted

### 5. Local response state
Since there is no backend, responses are not sent back to the creator.

For MVP:
- Store recipient choice in localStorage on recipient's device.
- Show a simple accepted state after clicking.

Example:

> Quest Accepted!

## Nice-to-have features, not MVP
Do not build these first:
- accounts
- database
- real RSVP tracking
- image uploads
- AI message generation
- payment
- multiplayer
- email sending
- calendar integration
- analytics

## MVP constraints
- No backend
- No database
- No paid APIs
- No AI API
- No user account system
- No cloud storage
- No file upload storage
- Must work on mobile
- Must be fast to load
- Must be easily deployable to Vercel

## Suggested first build target
Build only one theme first:

> Fantasy Tavern Quest Board

This keeps the MVP focused and lets your 3D asset style shine.

## MVP quality bar
The MVP does not need many features.

It needs to feel:
- polished
- charming
- fast
- understandable
- easy to share

A small polished experience is better than a large unfinished app.
