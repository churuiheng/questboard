import type { Config } from "tailwindcss";

// Tailwind 3 config — no lightningcss, no native binaries, just JS+PostCSS.
//
// All theme tokens are referenced through `rgb(var(--x) / <alpha-value>)` so
// opacity modifiers like `bg-parchment/85` and `text-ink-soft/70` work
// correctly. The actual numeric channels live in `app/globals.css` as
// space-separated `R G B` triplets.

const rgb = (varName: string) => `rgb(var(${varName}) / <alpha-value>)`;

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: rgb("--background"),
        foreground: rgb("--foreground"),

        parchment: {
          DEFAULT: rgb("--parchment"),
          deep: rgb("--parchment-deep"),
        },
        ink: {
          DEFAULT: rgb("--ink"),
          soft: rgb("--ink-soft"),
        },
        ember: {
          DEFAULT: rgb("--ember"),
          deep: rgb("--ember-deep"),
        },
        gold: {
          DEFAULT: rgb("--gold"),
          soft: rgb("--gold-soft"),
        },
        moss: rgb("--moss"),
        rune: rgb("--rune"),
      },
      fontFamily: {
        // Each stack leads with the local @font-face slot defined in
        // globals.css. If the file at public/fonts/<role>.* is missing,
        // the browser silently skips and falls back to the next entry —
        // typically the Google-Fonts-loaded face, then a system font.
        sans: [
          '"QB Body"',
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "sans-serif",
        ],
        mono: [
          '"QB Mono"',
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "SF Mono",
          "Menlo",
          "Consolas",
          "Liberation Mono",
          "monospace",
        ],
        display: [
          '"QB Display"',
          "Cinzel",
          "Iowan Old Style",
          "Apple Garamond",
          "Georgia",
          "Times New Roman",
          "serif",
        ],
      },
      animation: {
        "ember-pulse": "ember-pulse 2.4s ease-out infinite",
        flicker: "flicker 3.6s ease-in-out infinite",
        shimmer: "shimmer 1.6s ease-in-out infinite",
      },
      keyframes: {
        "ember-pulse": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(217, 107, 52, 0.55)" },
          "50%": { boxShadow: "0 0 0 12px rgba(217, 107, 52, 0)" },
        },
        flicker: {
          "0%, 100%": { opacity: "0.85", transform: "translateY(0)" },
          "50%": { opacity: "1", transform: "translateY(-1px)" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
