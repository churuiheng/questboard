# QuestBoard

Turn any invite into a tiny RPG quest. Build a playful quest card, share
a link, watch your friend tap a parchment on a 3D tavern board to
accept.

Frontend-only — no backend, no accounts, no databases. The whole quest
lives inside the URL.

## Stack

- **Next.js 16** (App Router) + React 19 + TypeScript
- **React Three Fiber** + **Drei** for the 3D scene
- **Framer Motion** for 2D motion polish
- **Tailwind CSS 3** for styling
- **next/og** for dynamic Open Graph image generation

## Quick start

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

Three routes:

| Route                | What it is                                    |
| -------------------- | --------------------------------------------- |
| `/`                  | Landing page with sample quest card           |
| `/create`            | Chip-driven quest builder + live preview      |
| `/invite?q=…`        | Recipient experience — 3D board, click-to-reveal quest, Accept / Maybe Later |

Workflow: build a quest on `/create`, hit **Generate link**, then
**Preview as recipient ↗** to open the invite in a new tab.

---

## Customizing the look — everything is drop-in

QuestBoard is designed so you can theme it without touching code. Every
visual asset is auto-discovered from a known path under `public/` and
falls back to a procedural / Google-Fonts default when absent.

### 3D assets

| Path                                 | What it replaces                        |
| ------------------------------------ | --------------------------------------- |
| `public/models/quest_board.glb`      | Wooden board frame (posts + plank + finial) |
| `public/models/quest_note.glb`       | Each scroll on the board                |
| `public/textures/note_hover.png`     | Gold ring shown when hovering a scroll  |
| `public/hdri/tavern.hdr`             | Ambient lighting + reflections          |

### Audio

| Path                                 | When it plays                           |
| ------------------------------------ | --------------------------------------- |
| `public/audio/scroll_open.mp3`       | Tapping a scroll                        |
| `public/audio/quest_accepted.mp3`    | Hitting Accept Quest                    |
| `public/audio/ambient_tavern.mp3`    | Background loop                         |

A **🔊 Sound / 🔇 Muted** toggle appears in the top-right of `/invite`
as soon as any audio file is present.

### Fonts — one file customizes everything

Three font roles, each auto-discovered from `public/fonts/`:

| Drop a file here              | Used by                                                              |
| ----------------------------- | -------------------------------------------------------------------- |
| `public/fonts/display.*`      | `font-display` Tailwind utility **and** the 3D scroll text           |
| `public/fonts/body.*`         | `font-sans` utility (default body text)                              |
| `public/fonts/mono.*`         | `font-mono` utility (URL display, code-like UI)                      |

`.*` accepts `.woff2`, `.ttf`, `.otf`, or `.woff`. CSS `@font-face`
cascades through formats; the 3D `<Text>` loader probes each in order.

**To swap typography**, drop one file. Example — to replace Cinzel with
Cormorant Garamond app-wide *and* in the 3D scrolls:

1. Download Cormorant Garamond
2. Rename `CormorantGaramond-SemiBold.ttf` → `display.ttf`
3. Drop into `public/fonts/`
4. Hard-refresh

Done. Every heading, badge, button, and the 3D scroll titles all
change. There's also a one-liner to pull Cinzel automatically:

```bash
npm run fonts
```

**Fallback when slots are empty**: the browser silently skips missing
@font-face URLs and falls through the stack — `QB Display` → `Cinzel`
(CDN) → system serif. So the app keeps looking right whether you ship
zero, one, two, or all three custom fonts.

See `public/fonts/README.md` for the detailed recipe and legacy filename
support.

### App icons

Standard Next.js conventions — drop and forget:

| Path                | Used by                                       |
| ------------------- | --------------------------------------------- |
| `app/icon.png`      | Browser tab favicon + link-unfurl thumbnail   |
| `app/apple-icon.png`| iOS home-screen / Safari pinned-tab icon      |

### Colors

Every theme color is an `R G B` triplet in `app/globals.css` so opacity
modifiers like `bg-parchment/80` keep working:

```css
:root {
  --parchment: 244 228 191;
  --ember: 217 107 52;
  --gold: 230 179 82;
  /* … */
}
```

Change the triplets and the whole app retones instantly.

---

## How it works

- **No backend**: a `QuestBundle` (1–3 quest options + shared metadata)
  is base64url-encoded into the `?q=` URL parameter. Decoded on the
  invite page.
- **Recipient responses** (Accept / Maybe Later, plus which of the
  options was picked) live in the recipient's own `localStorage`.
  Sender never sees them by design.
- **3D scene** is React Three Fiber. Procedural posts / plank / scrolls
  are the default; any `.glb` you drop replaces them. The scrolls
  always render on top with quest text overlaid so the recipient knows
  which option is which.
- **HEAD-checked asset loading** (`useAssetExists` hook) — we never
  attempt to load a custom asset until a `HEAD` request confirms it
  exists, so missing files cause zero 404 errors or dev overlay noise.

---

## Project layout

```
app/
  page.tsx                 Landing
  create/page.tsx          Quest builder
  invite/page.tsx          Recipient page (+ generateMetadata for OG)
  og/route.tsx             Dynamic OG image generator (1200×630)
  layout.tsx               Root layout, metadata, font @import
  globals.css              Tailwind + theme tokens + @font-face slots

components/
  quest/                   Quest card, form, link panel, invite overlay
  scene/                   R3F components — board, scrolls, mute toggle…
  ui/                      Buttons, fields, chips

lib/
  audio.ts                 Audio runtime (SFX + ambient + mute store)
  fonts.ts                 Central font-slot config
  questCodec.ts            Base64url encode/decode for QuestBundle
  questDefaults.ts         Defaults, chip presets, bundle helpers
  localResponse.ts         localStorage helpers for responses

public/
  models/   textures/   hdri/   audio/   fonts/    ← drop-in asset slots

doc/                       Numbered design docs (product vision through
                           custom asset reference)
```

---

## Documentation

- `doc/01-product-vision.md` — what the product is and isn't
- `doc/02-mvp-scope.md` — what's in/out of the MVP
- `doc/03-ux-flow.md` — page-by-page UX
- `doc/04-technical-architecture.md` — stack rationale
- `doc/05-data-model-and-url-encoding.md` — the codec
- `doc/06-3d-asset-pipeline.md` — Blender export checklist
- `doc/07-development-milestones.md` — original roadmap
- `doc/08-claude-development-prompt.md` — original brief
- `doc/09-custom-assets.md` — **complete asset reference (recommended)**
- `doc/10-deployment.md` — **Vercel deploy walkthrough + verification**

---

## Deploy

```bash
npm run build         # verify production build locally
git push              # to GitHub
```

Then **vercel.com/new** → import the repo → click Deploy. Default
settings are correct (Next.js auto-detected, no special build config).

Set `NEXT_PUBLIC_SITE_URL=https://your-domain.com` in the project's env
vars if you have a custom domain, so OG image URLs resolve to absolute
URLs in link unfurls.

Full walkthrough including post-deploy verification checklist:
[`doc/10-deployment.md`](./doc/10-deployment.md).
