// Downloads display fonts used by Drei's <Text> (Troika) into public/fonts/.
//
// Troika can't share CSS-loaded webfonts, so we self-host one TTF per
// font that the 3D scene actually renders. Run this once after cloning
// the repo (or whenever you want to refresh the font version):
//
//   npm run fonts
//
// Why a script instead of committing the font binary? It keeps the repo
// slim and lets each contributor pull the latest version from Google
// Fonts. Cinzel is OFL-1.1 licensed — bundling is allowed if you'd
// rather commit the file directly.

import { mkdir, writeFile, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..");
const FONTS_DIR = join(PROJECT_ROOT, "public", "fonts");

// Google Fonts serves different file formats depending on the User-Agent
// it sees. Old IE → TTF/EOT, modern → WOFF2. Drei/Troika handles TTF
// and WOFF reliably, so we ask for TTF by pretending to be IE.
const IE_USER_AGENT = "Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.0)";

/**
 * Fonts to fetch. Add more entries here if you swap to a different
 * display face — the script will mirror them all into public/fonts/.
 */
const FONTS = [
  {
    family: "Cinzel",
    weight: 600,
    outputName: "Cinzel.ttf",
  },
];

async function main() {
  await mkdir(FONTS_DIR, { recursive: true });

  for (const font of FONTS) {
    const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
      font.family,
    )}:wght@${font.weight}&display=swap`;

    process.stdout.write(`→ ${font.family} ${font.weight}: fetching CSS… `);
    const cssRes = await fetch(cssUrl, {
      headers: { "User-Agent": IE_USER_AGENT },
    });
    if (!cssRes.ok) {
      throw new Error(`CSS request failed (${cssRes.status} ${cssRes.statusText})`);
    }
    const css = await cssRes.text();

    // The CSS contains one or more `src: url(...) format(...)` blocks.
    // Pick the first URL we recognize (.ttf preferred).
    const urlMatch =
      css.match(/url\((https:[^)]+\.ttf)\)/) ??
      css.match(/url\((https:[^)]+\.woff2?)\)/);
    if (!urlMatch) {
      throw new Error(
        `No font URL found in CSS for ${font.family}. CSS preview:\n${css.slice(0, 200)}`,
      );
    }
    const fontUrl = urlMatch[1];

    process.stdout.write(`downloading… `);
    const fontRes = await fetch(fontUrl);
    if (!fontRes.ok) {
      throw new Error(`Font request failed (${fontRes.status})`);
    }
    const buffer = Buffer.from(await fontRes.arrayBuffer());

    const outputPath = join(FONTS_DIR, font.outputName);
    await writeFile(outputPath, buffer);
    process.stdout.write(`✓ ${(buffer.length / 1024).toFixed(1)} KB\n`);
  }

  console.log("\nDone. Hard-refresh your browser so the new fonts load.");
}

main().catch((err) => {
  console.error("\n✗ Font download failed:", err.message);
  console.error(
    "\nTip: this script reaches out to fonts.googleapis.com. If you're " +
      "behind a strict proxy or VPN that blocks it, download Cinzel manually " +
      "from https://fonts.google.com/specimen/Cinzel and drop the .ttf at " +
      "public/fonts/Cinzel.ttf.",
  );
  process.exit(1);
});
