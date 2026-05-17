"use client";

import { Text } from "@react-three/drei";
import { useFirstPresentUrl } from "./useAssetExists";
import { DISPLAY_FONT_CANDIDATES } from "@/lib/fonts";
import type { QuestData, QuestDifficulty } from "@/types/quest";

const DIFFICULTY_STRIPE_COLOR: Record<QuestDifficulty, string> = {
  cozy: "#6f8c4a",
  normal: "#e6b352",
  legendary: "#d96b34",
  secret: "#6e4a86",
};

const INK = "#2a1a0c";
const GOLD = "#c9a060";
const PARCHMENT_AGED = "#caa066";

function truncate(input: string, max: number): string {
  if (input.length <= max) return input;
  return input.slice(0, max - 1).trimEnd() + "…";
}

/**
 * Pick a Drei `<Text>` fontSize that lets a title fit nicely on the
 * parchment. Cinzel is wide, so short titles get a punchy display size
 * and longer ones shrink to keep everything readable without
 * truncating mid-word.
 *
 * Sizes were tuned against the 0.36-wide title block — at each step
 * the title fits on at most two lines for plausible quest titles.
 */
function fitTitleSize(title: string): number {
  const len = title.length;
  if (len <= 14) return 0.04;
  if (len <= 22) return 0.034;
  if (len <= 32) return 0.028;
  if (len <= 44) return 0.024;
  return 0.021;
}

/**
 * Minimal wireframe poster pinned to the tavern board. The scroll's job
 * is to whisper enough to make the recipient curious — not to render
 * the full quest card. The full card opens on click.
 *
 *   ┌─────────────────┐
 *   │       ●         │  ← difficulty marker (tiny, top-center)
 *   │                 │
 *   │     TITLE       │  ← only readable text, centered
 *   │      ✦          │  ← star divider
 *   │                 │
 *   │  ▆▆  ▆▆▆  ▆▆▆   │  ← 3 stat wireframes (reward tinted ember)
 *   │                 │
 *   └─────────────────┘
 *
 * Everything else from the QuestCard (Quest Notice eyebrow, "for X"
 * line, message banner) is intentionally omitted: at this scale it just
 * reads as noise, and the overlay already shows all of it in full.
 */
export function ScrollLabel({ quest }: { quest: QuestData }) {
  // We avoid truncating: long titles just get a smaller font (see
  // `fitTitleSize`) and may wrap to two lines, which still reads cleanly
  // because the title is the only text on the scroll. A hard cap at 60
  // chars stops a worst-case "paste the whole story" title from
  // running off the parchment, but anything reasonable comes through
  // intact.
  const title = truncate(quest.title.trim() || "An Untitled Quest", 60);
  const titleFontSize = fitTitleSize(title);
  const activity = quest.activity.trim() || "an activity";
  const when = quest.dateTimeText.trim() || "when";
  const reward = quest.reward.trim() || "a reward";
  const difficultyColor = DIFFICULTY_STRIPE_COLOR[quest.difficulty];

  const fontUrl = useFirstPresentUrl(DISPLAY_FONT_CANDIDATES);
  const Z = 0.025;
  const ORDER = 10;
  const PARCH_W = 0.42;
  const PARCH_H = 0.55;

  return (
    <group>
      {/* Aged underlay peeking from behind. */}
      <mesh position={[0.012, -0.014, Z - 0.002]} renderOrder={ORDER - 2}>
        <planeGeometry args={[PARCH_W + 0.02, PARCH_H + 0.024]} />
        <meshBasicMaterial
          color={PARCHMENT_AGED}
          transparent
          opacity={0.55}
          depthTest={false}
        />
      </mesh>

      {/* Soft drop shadow. */}
      <mesh position={[0.022, -0.025, Z - 0.003]} renderOrder={ORDER - 3}>
        <planeGeometry args={[PARCH_W + 0.04, PARCH_H + 0.05]} />
        <meshBasicMaterial color="#1a0e05" transparent opacity={0.4} depthTest={false} />
      </mesh>

      {/* Brass nail heads at each corner. */}
      {(
        [
          [-PARCH_W / 2 + 0.024, PARCH_H / 2 - 0.024],
          [PARCH_W / 2 - 0.024, PARCH_H / 2 - 0.024],
          [-PARCH_W / 2 + 0.024, -PARCH_H / 2 + 0.024],
          [PARCH_W / 2 - 0.024, -PARCH_H / 2 + 0.024],
        ] as const
      ).map(([x, y], i) => (
        <BrassNail key={i} x={x} y={y} z={Z} order={ORDER} />
      ))}

      {/* Difficulty marker — small dot near the top, centered. */}
      <DifficultyMarker color={difficultyColor} position={[0, 0.185, Z]} order={ORDER} />

      {/* Title — the only readable element. Centered. Font size scales
          with title length (see `fitTitleSize`). Allowed to wrap to two
          lines for long titles; `anchorY="middle"` keeps it vertically
          balanced around its position no matter how many lines. */}
      <Text
        position={[0, 0.075, Z]}
        renderOrder={ORDER}
        font={fontUrl}
        fontSize={titleFontSize}
        fontWeight={700}
        maxWidth={0.36}
        lineHeight={1.05}
        textAlign="center"
        anchorX="center"
        anchorY="middle"
        color={INK}
        material-depthTest={false}
        material-transparent
      >
        {title}
      </Text>

      {/* Star divider — sits beneath the title. */}
      <Text
        position={[0, -0.01, Z]}
        renderOrder={ORDER}
        font={fontUrl}
        fontSize={0.024}
        color={GOLD}
        anchorX="center"
        anchorY="middle"
        material-depthTest={false}
        material-transparent
      >
        ✦
      </Text>

      {/* Three stat wireframes — single row, evenly spaced. */}
      <MysteryBlocks
        text={activity}
        position={[-0.115, -0.115, Z]}
        color={INK}
        opacity={0.7}
        renderOrder={ORDER}
        charWidth={0.0055}
        baseHeight={0.011}
        wordGap={0.012}
      />
      <MysteryBlocks
        text={when}
        position={[0, -0.115, Z]}
        color={INK}
        opacity={0.7}
        renderOrder={ORDER}
        charWidth={0.0055}
        baseHeight={0.011}
        wordGap={0.012}
      />
      <MysteryBlocks
        text={reward}
        position={[0.115, -0.115, Z]}
        color={INK}
        opacity={0.7}
        renderOrder={ORDER}
        charWidth={0.0055}
        baseHeight={0.011}
        wordGap={0.012}
      />
    </group>
  );
}

/** Small wax-pin badge — gold ring with a colored center dot. */
function DifficultyMarker({
  color,
  position,
  order,
}: {
  color: string;
  position: [number, number, number];
  order: number;
}) {
  return (
    <group position={position}>
      {/* Outer gold ring */}
      <mesh renderOrder={order}>
        <ringGeometry args={[0.014, 0.022, 32]} />
        <meshBasicMaterial color={GOLD} depthTest={false} />
      </mesh>
      {/* Inner colored dot */}
      <mesh renderOrder={order + 1}>
        <circleGeometry args={[0.012, 24]} />
        <meshBasicMaterial color={color} depthTest={false} />
      </mesh>
    </group>
  );
}

/** Small brass nail head — outer dark ring, brass body, light specular dot. */
function BrassNail({
  x,
  y,
  z,
  order,
}: {
  x: number;
  y: number;
  z: number;
  order: number;
}) {
  return (
    <group position={[x, y, z]}>
      <mesh renderOrder={order}>
        <circleGeometry args={[0.0085, 20]} />
        <meshBasicMaterial color="#1a0e05" depthTest={false} />
      </mesh>
      <mesh position={[0, 0, 0.0005]} renderOrder={order + 1}>
        <circleGeometry args={[0.0065, 20]} />
        <meshBasicMaterial color={GOLD} depthTest={false} />
      </mesh>
      <mesh position={[-0.002, 0.002, 0.001]} renderOrder={order + 2}>
        <circleGeometry args={[0.002, 12]} />
        <meshBasicMaterial color="#f0d28a" depthTest={false} />
      </mesh>
    </group>
  );
}

/**
 * Renders a string as a row of small rectangles — one segment per
 * sub-piece of a word — sized proportional to the word's length. Looks
 * like loading-skeleton bars or redacted text. Heights jitter slightly
 * per word for an organic feel. Always center-anchored at `position`.
 */
function MysteryBlocks({
  text,
  position,
  color,
  renderOrder = 0,
  charWidth = 0.013,
  intraGap = 0.004,
  wordGap = 0.018,
  baseHeight = 0.014,
  opacity = 0.5,
}: {
  text: string;
  position: [number, number, number];
  color: string;
  renderOrder?: number;
  charWidth?: number;
  /** Gap between sub-blocks within a single word. */
  intraGap?: number;
  /** Gap between word groups. */
  wordGap?: number;
  baseHeight?: number;
  opacity?: number;
}) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;

  // For each word, generate 2-4 sub-block widths summing to roughly
  // the word's visual length.
  const layout = words.flatMap((word, wordIndex) => {
    const seed = (word.length * 31 + wordIndex * 17) % 11;
    const segments = 2 + (seed % 3);
    const totalChar = Math.max(2, word.length);

    const splits: number[] = [];
    let remaining = totalChar;
    for (let i = 0; i < segments - 1; i++) {
      const share = Math.max(
        1,
        Math.round(remaining / (segments - i)) + ((seed + i) % 3) - 1,
      );
      splits.push(share);
      remaining -= share;
    }
    splits.push(Math.max(1, remaining));

    return splits.map((charCount, segIndex) => {
      const heightJitter = ((seed + segIndex * 7) % 5) / 30;
      return {
        wordIndex,
        segIndex,
        w: Math.max(0.012, charCount * charWidth),
        h: baseHeight * (0.85 + heightJitter),
        alphaJitter: ((seed + segIndex * 3) % 7) / 30,
      };
    });
  });

  const totalWidth = layout.reduce((acc, block, i) => {
    if (i === 0) return acc + block.w;
    const isNewWord = layout[i - 1].wordIndex !== block.wordIndex;
    return acc + block.w + (isNewWord ? wordGap : intraGap);
  }, 0);

  const placed = layout.reduce<
    Array<{ x: number; w: number; h: number; opacity: number }>
  >((acc, block, i) => {
    const prev = acc[i - 1];
    const isNewWord = i > 0 && layout[i - 1].wordIndex !== block.wordIndex;
    const prevRight = prev ? prev.x + prev.w / 2 : -totalWidth / 2;
    const lead = prev ? (isNewWord ? wordGap : intraGap) : 0;
    const x = prevRight + lead + block.w / 2;
    acc.push({
      x,
      w: block.w,
      h: block.h,
      opacity: Math.max(0.25, opacity - block.alphaJitter),
    });
    return acc;
  }, []);

  return (
    <group position={position}>
      {placed.map((b, i) => (
        <mesh key={i} position={[b.x, 0, 0]} renderOrder={renderOrder}>
          <planeGeometry args={[b.w, b.h]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={b.opacity}
            depthTest={false}
          />
        </mesh>
      ))}
    </group>
  );
}
