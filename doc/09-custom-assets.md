# Custom Asset Reference

Single-page lookup for every file path the QuestBoard scene auto-discovers. Drop a file at one of these paths, refresh, done — no code change required.

## How auto-discovery works

Every slot below uses the same pattern in code:

1. A `HEAD` request probes the URL on mount (`components/scene/useAssetExists.ts`).
2. If the file exists → load it (3D model, texture, audio) and use it.
3. If absent → silently render the procedural fallback. No 404 errors, no dev overlay noise.

Cached at the module level, so multiple components reading the same URL only ping the server once.

---

## Quick reference

| Path                                 | What it replaces                          | Format        | Recommended size |
| ------------------------------------ | ----------------------------------------- | ------------- | ---------------- |
| `public/models/quest_board.glb`      | Wooden quest board frame                  | `.glb`        | ≤ 2 MB           |
| `public/models/quest_note.glb`       | Each scroll on the board (1–3 instances)  | `.glb`        | ≤ 500 KB         |
| `public/textures/note_hover.png`     | Gold ring shown on scroll hover           | `.png` (RGBA) | 512×512          |
| `public/hdri/tavern.hdr`             | Ambient lighting + reflections            | `.hdr` / `.exr` | 1K or 2K (≤ 4 MB) |
| `public/audio/scroll_open.mp3`       | SFX when a scroll is tapped               | `.mp3`        | ≤ 50 KB          |
| `public/audio/quest_accepted.mp3`    | SFX when Accept Quest is hit              | `.mp3`        | ≤ 50 KB          |
| `public/audio/ambient_tavern.mp3`    | Background ambience while invite is open  | `.mp3` (mono) | ≤ 1 MB           |
| `app/icon.png`                       | Browser tab favicon + link-unfurl icon    | `.png`        | 512×512          |
| `app/apple-icon.png`                 | iOS home-screen / pinned-tab icon         | `.png`        | 180×180          |

---

## 3D models

### `public/models/quest_board.glb` — The wooden frame

Replaces the procedural posts, plank, crossbeam, rivets, finial, and sconces.

- **Pivot** at the center of the board, facing `+Z`
- **Procedural reference size**: 1.9 wide × 1.6 tall (so your model fits the existing scroll layout)
- **Materials**: standard PBR — metallic/roughness workflow is fine

Tuning props on `<TavernScene>` (passed from `InviteScene.tsx`):

```tsx
<TavernScene
  boardScale={1.0}                  // shrink/enlarge
  boardRotation={[0, 0, 0]}         // [x, y, z] in radians
/>
```

Common Blender fixes:

- Model faces away → `boardRotation={[0, Math.PI, 0]}`
- Lying flat (Z-up vs Y-up) → enable `Transform → +Y Up` on export, or `boardRotation={[Math.PI / 2, 0, 0]}`
- Way too big or small → `boardScale={0.4}` (etc.), tune by eye

### `public/models/quest_note.glb` — The scroll mesh

Instanced once per quest option (1, 2, or 3 copies on the board). Same fallback chain.

- **Pivot** at the center, front face toward `+Z`
- **Procedural reference size**: roughly 0.42 wide × 0.55 tall

Tuning props:

```tsx
<TavernScene
  noteScale={0.55}
  noteRotation={[0, 0, 0]}
/>
```

A scroll/parchment shape works best — anything visually busier competes with the 2D quest card that overlays it on click.

### Empty `.glb` files

If your `.glb` exports successfully but has no geometry inside, the loader detects that silently and falls back to the procedural visual. A one-time `console.info` message tells you to re-export. Check `file public/models/your_model.glb` — a real model is at least a few KB, not 132 bytes.

---

## Textures

### `public/textures/note_hover.png` — Hover indicator

Replaces the procedural gold ring that appears when you hover a scroll.

- **Transparent PNG**, square, 512×512 or 1024×1024 is plenty
- Centered on the scroll at world size **0.75 × 0.75** by default — anything outside that bounding box gets cropped
- Rendered with `meshBasicMaterial` → no lighting affects it, colors render exactly as drawn

Tuning props:

```tsx
<TavernScene
  noteHoverImageUrl="/textures/my_hover.png"   // override default path
  noteHoverImageSize={0.9}                      // larger glow
/>
```

Good patterns: glowing halo, wax-stamp ring, "Tap me!" stamp, torn-paper border, animated arrow indicator.

---

## HDRI environment

### `public/hdri/tavern.hdr` — Lighting + optional backdrop

A single HDRI does three things at once:

1. Tints every surface with realistic ambient color (warm tavern reds + golds, etc.)
2. Adds proper reflections to shiny materials on your `.glb` models
3. Auto-dims the procedural directional lights so the scene isn't over-exposed

When the HDRI is loaded, the existing `ambient` + `directional` lights drop to ~25–50% intensity.

Tuning props:

```tsx
<TavernScene
  environmentUrl="/hdri/tavern.hdr"   // override default path
  environmentBackground={true}         // use the HDRI as the visible backdrop too
/>
```

Where to grab free CC0 HDRIs:

- **https://polyhaven.com/hdris** — filter by **Indoor → Restaurant/Pub** for tavern vibes
- **https://hdri-haven.com/**

Aim for **1K or 2K** for an interior scene — 4K+ wastes bandwidth and most browsers will downsample anyway.

---

## Audio

All three audio slots are independent — drop any one without the others. The mute toggle in the top-right of `/invite` appears automatically as soon as one audio file is present.

### `public/audio/scroll_open.mp3` — Scroll-tap SFX

Fires every time the recipient taps a scroll on the board. Cloned `<audio>` elements per play, so rapid taps don't cancel each other.

- **Target**: mono, 128 kbps, ≤ 50 KB
- **Suggested**: paper unrolling, soft chime, parchment crinkle

### `public/audio/quest_accepted.mp3` — Accept SFX

Fires once when the recipient hits the Accept Quest button.

- **Target**: mono, 128 kbps, ≤ 100 KB
- **Suggested**: short fanfare, level-up jingle, satisfying *ka-ching*

### `public/audio/ambient_tavern.mp3` — Background loop

Loops continuously in the background while the invite is open.

- **Target**: mono, 96 kbps, ≤ 1 MB
- **Format**: loop point should be seamless — test by listening to the first and last second back-to-back
- **Duration**: 10–30s loops feel surprisingly natural; longer is fine but eats bandwidth

Browsers block autoplay until the recipient interacts with the page. The ambient track is configured on mount but only starts playing after the first click or touch on the document. No code change needed — the first interaction triggers it automatically.

### Mute persistence

The mute state is stored in `localStorage` as `questboard:muted` (`"1"` for muted, `"0"` for sound on). It applies to all three audio slots together.

### Tuning volume

Currently set in `lib/audio.ts`:

- **SFX**: 70% (`getOrLoadSfx`)
- **Ambient**: 35% (`configureAmbient`)

If your assets are quiet, raise these. If they're hot, lower them.

---

## App icons

Standard Next.js conventions — no code needed.

### `app/icon.png`

Used as the favicon (browser tab), the icon in iMessage / Slack / WhatsApp link unfurls, and the bookmark icon. 512×512 PNG with transparent background works for every platform.

### `app/apple-icon.png`

Used by Safari and iOS for the home-screen "Add to Home Screen" pin. 180×180 PNG, square, with a small inset (~10% padding) since iOS rounds the corners.

Drop both files into `app/` and Next.js auto-generates the right `<link rel="…">` tags in the page `<head>`.

---

## Not yet wired — but possible

These would each be ~30–60 lines of code to add if you want them later. The patterns mirror the slots above.

| Path                                      | What it would replace                       |
| ----------------------------------------- | ------------------------------------------- |
| `public/textures/parchment.png`           | CSS-gradient parchment on the 2D quest card |
| `public/textures/ember.png`               | Floating ember particles                    |
| `public/textures/sparkle.png`             | Accept-button sparkle burst                 |
| `public/textures/logo.png`                | The "✦ QuestBoard" wordmark                 |
| `public/icons/difficulty_{cozy,…}.png`    | Emoji difficulty icons                      |
| `public/fonts/cinzel.woff2` (self-hosted) | Cinzel loaded via CSS @import currently     |

---

## Typography & color

### Custom fonts — universal drop-in

QuestBoard has three font roles that auto-discover files from `public/fonts/`:

| Drop a file here                | Used by                                                                  |
| ------------------------------- | ------------------------------------------------------------------------ |
| `public/fonts/display.*`        | `font-display` Tailwind utility **and** the 3D scroll text in `<Text>` |
| `public/fonts/body.*`           | `font-sans` utility (default body text)                                  |
| `public/fonts/mono.*`           | `font-mono` utility (URL display, code-like UI)                          |

`.*` accepts `.woff2`, `.ttf`, `.otf`, or `.woff`. CSS `@font-face`
cascades through formats so any single one works; 3D text loads TTF
most reliably.

**Fallback when a slot is empty:**

1. The browser silently skips the @font-face for that role.
2. The font stack in `tailwind.config.ts` falls through to **Cinzel /
   Inter / JetBrains Mono** loaded from Google Fonts via the
   `<link rel="stylesheet">` in `app/layout.tsx`.
3. If those are unreachable too, it falls through to system fonts.

To swap the display font (heading + button + 3D scroll text) in one
move, drop `display.ttf` into `public/fonts/` and refresh — every
surface picks it up.

The slot config lives in `lib/fonts.ts` (3D side) and `app/globals.css`
(2D `@font-face` rules). Tailwind stacks are in `tailwind.config.ts`.

### Colors

Edit `app/globals.css` — every theme color is an R G B triplet so opacity modifiers keep working:

```css
:root {
  --parchment: 244 228 191;
  --ember: 217 107 52;
  --gold: 230 179 82;
  /* … */
}
```

Change the triplets and the entire app retones instantly.

---

## Tuning where assets get rendered

If your custom board lands at the wrong size or your scrolls float off the front, the wrapper that positions everything is in `components/scene/TavernScene.tsx`:

```tsx
<group position={[0, 0, 0]} scale={1}>
  <ProceduralQuestBoard … />
</group>
```

That `position` and `scale` apply to **both** the board and the scrolls together, so they stay locked relative to each other. Change `scale={1}` to `scale={0.7}` to shrink everything in the scene at once.

Camera defaults:

```tsx
<Canvas camera={{ position: [0, 0.4, 7.5], fov: 45 }}>
```

Same file. Pull back to `7.5`, fov `45` is the current setup — tweak for closer/wider shots.

---

## Verifying a drop-in

After placing any file:

1. **Hard refresh** (⌘⇧R / Ctrl⇧R) so Drei's GLTF/texture cache invalidates
2. Watch the dev console — a helpful `console.info` prints if a file loads but is empty (e.g., a Blender export with no selection)
3. Compare file size: a real `.glb` is at least a few KB; a real PNG/HDR is at least a few hundred KB

If nothing appears, check the Network tab in DevTools for the URL — a `200` means it loaded successfully and the issue is probably in the asset (empty mesh, transparent texture, etc.). A `404` means the path is off.
