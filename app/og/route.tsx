import { ImageResponse } from "next/og";
import { decodeQuestBundle } from "@/lib/questCodec";
import { bundleToQuestData } from "@/lib/questDefaults";
import { DISPLAY_FONT_CANDIDATES } from "@/lib/fonts";
import type { QuestBundle, QuestDifficulty } from "@/types/quest";

// Edge runtime keeps cold-starts snappy when link unfurlers fetch the image.
export const runtime = "edge";

// Standard Open Graph dimensions. Most platforms (iMessage, Slack,
// WhatsApp, Twitter/X, Facebook, LinkedIn) crop into this 1.91:1 frame.
const WIDTH = 1200;
const HEIGHT = 630;

const DISPLAY_FONT = "Cinzel";

/**
 * Tries each candidate font URL in `lib/fonts.ts` order and returns the
 * first one that responds with 2xx. Returns null when no font file is
 * present in `public/fonts/` — Satori falls back to its bundled font.
 *
 * Cached per cold start via the edge runtime's module scope.
 */
let cachedFontPromise: Promise<ArrayBuffer | null> | null = null;
async function loadDisplayFont(request: Request): Promise<ArrayBuffer | null> {
  if (cachedFontPromise) return cachedFontPromise;
  cachedFontPromise = (async () => {
    for (const path of DISPLAY_FONT_CANDIDATES) {
      try {
        const res = await fetch(new URL(path, request.url));
        if (res.ok) return await res.arrayBuffer();
      } catch {
        /* try next candidate */
      }
    }
    return null;
  })();
  return cachedFontPromise;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const encoded = searchParams.get("q");
  const bundle = encoded ? decodeQuestBundle(encoded) : null;

  const fontData = await loadDisplayFont(request);
  const fonts = fontData
    ? [
        {
          name: DISPLAY_FONT,
          data: fontData,
          weight: 700 as const,
          style: "normal" as const,
        },
      ]
    : undefined;

  return new ImageResponse(
    bundle ? <QuestPreview bundle={bundle} /> : <DefaultPreview />,
    { width: WIDTH, height: HEIGHT, fonts },
  );
}

/* ----------------- Default (no quest data) preview ----------------- */

function DefaultPreview() {
  return (
    <div
      style={{
        ...rootStyle,
        ...stackVertical,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ display: "flex", ...wordmarkStyle }}>✦ QuestBoard</div>
      <div
        style={{
          display: "flex",
          fontSize: 72,
          color: "#f4e4bf",
          marginTop: 24,
          fontFamily: DISPLAY_FONT,
          textAlign: "center",
          maxWidth: 900,
        }}
      >
        Turn any invite into a tiny RPG quest.
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 28,
          color: "#e6b352aa",
          marginTop: 18,
        }}
      >
        Open this link to see your quest.
      </div>
    </div>
  );
}

/* ----------------- Quest preview (real bundle) ----------------- */

function QuestPreview({ bundle }: { bundle: QuestBundle }) {
  const first = bundleToQuestData(bundle, 0);
  const optionCount = bundle.options.length;
  const titleText = safe(first.title, "An Untitled Quest");
  const recipientText = safe(bundle.recipientName, "Brave soul");
  const senderText = safe(bundle.senderName, "A friend");
  const activityText = safe(first.activity, "A side quest");
  const whenText = safe(first.dateTimeText, "Soon");
  const rewardText = safe(first.reward, "Glory");

  return (
    <div style={{ ...rootStyle, ...stackVertical }}>
      {/* Wordmark */}
      <div
        style={{
          display: "flex",
          position: "absolute",
          top: 36,
          left: 48,
          ...wordmarkStyle,
        }}
      >
        ✦ QuestBoard
      </div>

      {/* Option count chip */}
      {optionCount > 1 ? (
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: 40,
            right: 48,
            padding: "10px 22px",
            borderRadius: 999,
            background: "rgba(230, 179, 82, 0.18)",
            color: "#f0d28a",
            fontSize: 24,
            letterSpacing: 4,
            textTransform: "uppercase",
            border: "1px solid rgba(230, 179, 82, 0.4)",
            fontFamily: DISPLAY_FONT,
          }}
        >
          {optionCount} quests
        </div>
      ) : null}

      {/* Centered parchment card */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          margin: "auto",
          marginTop: 110,
          marginBottom: 60,
          width: 940,
          padding: 56,
          borderRadius: 36,
          background:
            "linear-gradient(180deg, #f4e4bf 0%, #e6cf95 100%)",
          border: "8px solid #3a2412",
          color: "#2a1a0c",
          boxShadow: "0 30px 80px rgba(0, 0, 0, 0.5)",
        }}
      >
        {/* Top row: Quest Notice + difficulty badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 22,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: "#4a2f17aa",
            fontFamily: DISPLAY_FONT,
          }}
        >
          <span style={{ display: "flex" }}>Quest Notice</span>
          <DifficultyBadge difficulty={first.difficulty} />
        </div>

        {/* Title */}
        <div
          style={{
            display: "flex",
            marginTop: 18,
            fontSize: 76,
            lineHeight: 1.05,
            fontFamily: DISPLAY_FONT,
            color: "#2a1a0c",
            fontWeight: 700,
          }}
        >
          {titleText}
        </div>

        {/* Recipient */}
        <div
          style={{
            display: "flex",
            marginTop: 10,
            fontSize: 24,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: "#4a2f17aa",
            fontFamily: DISPLAY_FONT,
          }}
        >
          For&nbsp;<span style={{ color: "#a8431a" }}>{recipientText}</span>
        </div>

        {/* Divider */}
        <div
          style={{
            display: "flex",
            marginTop: 28,
            marginBottom: 28,
            height: 1,
            background: "rgba(74, 47, 23, 0.3)",
          }}
        />

        {/* Stat row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 24,
          }}
        >
          <StatBlock label="Activity" value={activityText} />
          <StatBlock label="When" value={whenText} />
          <StatBlock label="Reward" value={rewardText} accent />
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            marginTop: 36,
            fontSize: 24,
            color: "#4a2f17aa",
            letterSpacing: 2,
            fontFamily: DISPLAY_FONT,
          }}
        >
          From&nbsp;<span style={{ color: "#2a1a0c" }}>{senderText}</span>
        </div>
      </div>
    </div>
  );
}

/* ----------------- Helper components ----------------- */

function DifficultyBadge({ difficulty }: { difficulty: QuestDifficulty }) {
  const palette: Record<QuestDifficulty, { bg: string; fg: string; label: string }> = {
    cozy: { bg: "#6f8c4a", fg: "#f4e4bf", label: "Cozy" },
    normal: { bg: "#e6b352", fg: "#2a1a0c", label: "Normal" },
    legendary: { bg: "#d96b34", fg: "#f4e4bf", label: "Legendary" },
    secret: { bg: "#6e4a86", fg: "#f4e4bf", label: "Secret" },
  };
  const p = palette[difficulty];
  return (
    <div
      style={{
        display: "flex",
        padding: "10px 22px",
        borderRadius: 999,
        background: p.bg,
        color: p.fg,
        fontSize: 24,
        letterSpacing: 4,
        fontFamily: DISPLAY_FONT,
      }}
    >
      ◆ {p.label}
    </div>
  );
}

function StatBlock({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", flexShrink: 1 }}>
      <div
        style={{
          display: "flex",
          fontSize: 18,
          letterSpacing: 4,
          textTransform: "uppercase",
          color: "#4a2f17aa",
          fontFamily: DISPLAY_FONT,
        }}
      >
        {label}
      </div>
      <div
        style={{
          display: "flex",
          marginTop: 4,
          fontSize: 30,
          color: accent ? "#a8431a" : "#2a1a0c",
        }}
      >
        {value}
      </div>
    </div>
  );
}

/* ----------------- Shared styles ----------------- */

const rootStyle = {
  width: "100%",
  height: "100%",
  display: "flex",
  color: "#f4e4bf",
  background:
    "radial-gradient(120% 80% at 50% 0%, #2a1a0c 0%, #1a1209 55%, #0d0905 100%)",
} as const;

const stackVertical = {
  flexDirection: "column" as const,
};

const wordmarkStyle = {
  fontSize: 28,
  letterSpacing: 8,
  color: "#e6b352",
  textTransform: "uppercase" as const,
  fontFamily: DISPLAY_FONT,
};

function safe(value: string, fallback: string): string {
  return value.trim() || fallback;
}
