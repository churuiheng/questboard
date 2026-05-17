# Fonts

Drop self-hosted font files here to swap any of QuestBoard's three font
roles. The 2D UI (Tailwind utilities) and the 3D scroll text both read
from the same paths, so one file customizes both.

## Slots

| Drop a file here                | Used by                                                |
| ------------------------------- | ------------------------------------------------------ |
| `public/fonts/display.*`        | `font-display` utility (headings, badges, buttons) **and** 3D scroll text |
| `public/fonts/body.*`           | `font-sans` utility (default body text)                |
| `public/fonts/mono.*`           | `font-mono` utility (URL display, code-like UI)        |

`.*` means any of `.woff2`, `.ttf`, `.otf`, `.woff` — drop whichever
format you have. The CSS `@font-face` declarations and the 3D `<Text>`
loader cascade through formats so any single one works.

## How fallback works

If you don't drop a file, the slot is empty and the cascade falls
through to:

1. `display` → **Cinzel** (loaded from Google Fonts via CSS @import in
   `app/layout.tsx`)
2. `body` → **Inter**
3. `mono` → **JetBrains Mono**

If those are unreachable too (offline, blocked, etc.), the cascade ends
at system fonts (serif / sans-serif / monospace).

## Quick recipes

### Replace Cinzel with Cormorant Garamond

1. Download Cormorant Garamond from Google Fonts.
2. Pick a weight (e.g., `CormorantGaramond-SemiBold.ttf`).
3. Rename it to `display.ttf` and drop it here.
4. Hard-refresh (⌘⇧R).

Done — every heading, badge, button label, *and* the 3D scroll titles
now render in Cormorant.

### Use a tighter sans for body text

1. Drop `Manrope-Regular.ttf` here → rename to `body.ttf`.

### Match the 3D scroll text exactly to the 2D card

The 3D scroll automatically uses whatever's at `public/fonts/display.*`.
Drop one file and both surfaces match.

## Legacy auto-discovery (still supported)

Files with the old, Cinzel-specific names also work. The 3D `<Text>`
loader probes these as fallbacks **after** the generic slots:

- `Cinzel.ttf`
- `Cinzel-VariableFont_wght.ttf` (Google's "Download family" zip ships this)
- `Cinzel-Regular.ttf`

If you previously dropped one of those, it still works.

## File format notes

- **TTF / OTF**: most reliable for Troika (the 3D text engine). Variable
  fonts (single file with a weight axis) are supported.
- **WOFF2**: smallest file size, fully supported in modern browsers for
  2D CSS. Drei's `<Text>` (Troika) may not handle WOFF2 — if your 3D
  text doesn't pick up your font but the 2D UI does, try a TTF instead.
- **WOFF**: works for 2D and 3D, larger than WOFF2.

## Where the slot config lives

All paths are centralized in `lib/fonts.ts` (3D side) and
`app/globals.css` (2D `@font-face` rules). If you want to add a fourth
role or rename a slot, those are the two files to edit.
