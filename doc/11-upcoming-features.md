# Upcoming Features

A running backlog of suggested next-step features for QuestBoard, in
roughly the order I'd ship them. Each entry has:

- **Why** — the user-facing reason it earns its slot.
- **Sketch** — enough implementation notes to start without re-deriving
  the design from scratch.
- **Status** — `todo` / `in progress` / `done`.

When a feature ships, leave its entry here with `done` and a short note
on where it landed — this doc doubles as a lightweight changelog for
non-trivial behaviour.

---

## 1. "Make one back" CTA after Accept

**Status:** todo

**Why.** A recipient who just accepted is the warmest audience the app
will ever see. Right now their experience ends at the share-back
button; adding a single "Send a quest of your own ↗" CTA on the
accepted screen turns every recipient into a candidate sender. It's
the cheapest growth lever the app has and we already have all the
pieces.

**Sketch.**

- New button alongside `ShareReplyButton` + `CalendarExportButton`
  in `QuestCardOverlay`'s `thisAccepted` footer.
- Click → navigate to `/create` with optional query params:
  - `?from=<recipientName>` → fills `senderName` for the new bundle.
  - `?to=<senderName>` → fills `recipientName` for the new bundle.
- `/create` reads those once at mount and merges them into the
  default bundle (only if the corresponding draft field is empty,
  so we don't clobber a restored draft).
- Microcopy on the button: "Send one back" (or "Reply with a quest").

---

## 2. Sender history (local-only)

**Status:** todo

**Why.** Senders typically make several quests over weeks. Today there's
no way to find what they sent yesterday — they have to dig through
chat threads to recover the link. A small rail on `/create` listing
recent quests gives them a re-open / duplicate path, with zero
backend.

**Sketch.**

- New `lib/senderHistory.ts` with a tiny localStorage-backed list:
  `{ encoded: string; recipientName: string; createdAt: string; }`.
- Cap at, say, 8 entries; FIFO on overflow.
- Append on every successful `Copy link` in `GenerateLinkPanel`
  (also on `Open as recipient` for power users).
- New `SenderHistory` component rendered on `/create` (collapsed by
  default into a "Your recent quests" summary).
- Each entry: small parchment chip showing recipient name + relative
  time. Click → opens `/invite?q=<encoded>` (re-preview) or "Edit a
  copy" which decodes and seeds the form.
- "Forget all" button for privacy.

---

## 3. Themed wax seals on Accept

**Status:** todo

**Why.** The wax stamp in `AcceptedBanner` always shows `⚔`. Tying its
glyph to the chosen difficulty makes each acceptance feel specific to
the choice. Tiny change, "they thought of everything" energy.

**Sketch.**

- Map: `cozy → 🌿`, `normal → ⚔`, `legendary → 🐉`, `secret → 🗝`.
  (These were originally on the deleted `DifficultyPicker` icons.)
- Or: switch to SVG glyphs to avoid the "no emoji" rule the form
  follows. The acceptance moment is celebratory, so emoji is fine
  here, but match the project's preference.
- Wax-pin color could also shift to match `DIFFICULTY_STRIPE_COLOR`
  in `ScrollLabel.tsx` (cozy=green wax, secret=purple wax). Subtle,
  optional.
- Lives in `QuestCardOverlay`'s `AcceptedBanner` — single switch on
  `quest.difficulty`.

---

## 4. Day/night lighting in the tavern

**Status:** todo

**Why.** Same scene, two moods — quietly delightful. The tavern is
candlelit at night and warmly lit by morning, depending on the user's
local hour.

**Sketch.**

- Read `new Date().getHours()` at scene mount.
- Map to a "phase" — `night | dusk | day | morning` — and adjust
  the four light intensities + colors in `TavernScene.tsx`
  accordingly.
- Night: dim `directionalLight`, bump `pointLight` ember intensity,
  push ambient toward warm orange.
- Day: stronger directional warm light, less ember, cooler ambient.
- Smooth transition isn't needed (one-shot at mount), but a small
  intensity sway from `useFrame` would sell candle flicker.
- Respect `prefers-color-scheme: light` as a "force day" override
  for accessibility.

---

## 5. Keyboard navigation in the 3D scene

**Status:** todo

**Why.** Today the only path to opening a quest is clicking a 3D mesh.
That excludes keyboard-only users, screen-reader users, and power
users who'd rather press Enter. Adding focusable overlays gives
everyone a real on-ramp.

**Sketch.**

- Render invisible focusable buttons in a DOM layer above the
  `<Canvas>` (`pointer-events-none` on the wrapper, `auto` on the
  buttons), positioned to roughly cover each scroll's screen-space
  bounds.
  - For static layouts (1/2/3 scrolls), hardcoded `top/left/width/height`
    on each button is fine — we don't need real 3D-to-screen
    projection for this MVP.
- `aria-label`: "Open quest 1: The Great Ramen Expedition".
- Tab order: in option order.
- Enter / Space → calls the same `openAt(index)` already used by
  the 3D click handler.
- Visible focus state: matches the hover ring in the 3D scene
  (a thin gold ring on the focused button).

---

## 6. PWA + offline support

**Status:** todo

**Why.** Recipients often want to revisit a quest on the day —
opening it from a chat link costs data and friction. A PWA install
gives them a home-screen icon, and an offline-first service worker
means re-opens work even without signal.

**Sketch.**

- `public/manifest.webmanifest` with name, short_name, icons (need
  192 + 512 PNGs in `public/icons/`), theme + background colors
  from the parchment/ink palette, `display: "standalone"`.
- `<link rel="manifest">` in `app/layout.tsx`.
- Service worker via `next-pwa` or a hand-rolled
  `public/sw.js` registered from `app/layout.tsx`.
- Strategy:
  - Shell (JS/CSS/fonts) → `staleWhileRevalidate`.
  - HTML → `networkFirst` (so the bundle in the URL still drives
    fresh content).
  - Assets in `/audio/`, `/models/`, `/textures/` →
    `cacheFirst`.
- "Add to Home Screen" prompt on second-visit only, via the
  `beforeinstallprompt` event.
- Worth gating behind a feature flag during initial roll-out — SW
  bugs in production are painful.

---

## Backlog (less concrete, here so we don't forget)

- **Reminder via Web Notifications** — opt-in "remind me day-of" that
  schedules a local Notification at the parsed event time. Browser
  support is patchy on iOS (it works in installed PWAs only).
- **Theme variants** — wire up `forest` and `pixel` themes
  (`types/quest.ts` already declares them; only `tavern` is built).
- **Template gallery** — preloaded full bundles on `/create` ("Date
  night", "Birthday surprise", "Study buddy") as one-click seeds.
- **Embed mode** — a slim iframe-friendly route for blog posts.
- **About page** — origin story + no-tracking pledge + GitHub link.
- **Optional photo memory follow-up** — sender can attach a photo after
  the event as a "remembering [quest]" follow-up link.
