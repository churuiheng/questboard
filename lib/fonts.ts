// Central font-slot config.
//
// QuestBoard uses three font roles — `display` for headings & badges,
// `body` for prose, and `mono` for code/URLs — plus the same `display`
// for Drei's 3D scroll text. Each role auto-discovers a file from
// `public/fonts/` so you can swap typography by dropping files in,
// without touching code.
//
// File-name conventions (per role):
//
//   public/fonts/display.{woff2,ttf,otf,woff}
//   public/fonts/body.{woff2,ttf,otf,woff}
//   public/fonts/mono.{woff2,ttf,otf,woff}
//
// The candidate lists below are the order the runtime probes. The first
// existing file wins. If none are present, the CSS font stack falls
// back to the Google-Fonts-loaded defaults (Cinzel / Inter / JetBrains
// Mono), and the 3D scrolls use Drei's bundled sans.

/** 2D CSS font names — match the @font-face declarations in globals.css. */
export const CSS_FONT_NAMES = {
  display: "QB Display",
  body: "QB Body",
  mono: "QB Mono",
} as const;

/**
 * Display font candidates probed by 3D `<Text>` in `ScrollLabel`.
 * Generic slot names come first, then legacy Cinzel-specific names.
 *
 * To use a different display font: drop your file at
 * `public/fonts/display.ttf` (or .woff2/.otf) and refresh.
 */
export const DISPLAY_FONT_CANDIDATES = [
  "/fonts/display.woff2",
  "/fonts/display.ttf",
  "/fonts/display.otf",
  "/fonts/display.woff",
  // Backward-compat with older drop-ins:
  "/fonts/Cinzel.ttf",
  "/fonts/Cinzel-VariableFont_wght.ttf",
  "/fonts/Cinzel-Regular.ttf",
] as const;
