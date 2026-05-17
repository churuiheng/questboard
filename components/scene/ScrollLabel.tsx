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
 * Renders the quest's text content directly onto the scroll. Uses Drei's
 * `<Text>` (Troika) so the glyphs stay crisp as the camera zooms.
 *
 * Positions are tuned for the procedural scroll's 0.42 × 0.55 size; if
 * a custom note `.glb` is in use, the text floats roughly in the same
 * spot — usually still readable.
 *
 * Display font candidates live in `lib/fonts.ts` so the CSS @font-face
 * slots and the 3D Troika slot share one source of truth.
 */
export function ScrollLabel({ quest }: { quest: QuestData }) {
  const title = truncate(quest.title.trim() || "An Untitled Quest", 28);
  const activity = truncate(quest.activity.trim() || "A side quest", 24);
  const difficultyColor = DIFFICULTY_STRIPE_COLOR[quest.difficulty];

  const fontUrl = useFirstPresentUrl(DISPLAY_FONT_CANDIDATES);
  const Z = 0.025;
  const ORDER = 10;
  const PARCH_W = 0.42;
  const PARCH_H = 0.55;

  return (
    <group>
      {/* Aged underlay — a slightly larger tan plane peeking from behind. */}
      <mesh position={[0.012, -0.014, Z - 0.002]} renderOrder={ORDER - 2}>
        <planeGeometry args={[PARCH_W + 0.02, PARCH_H + 0.024]} />
        <meshBasicMaterial
          color={PARCHMENT_AGED}
          transparent
          opacity={0.55}
          depthTest={false}
        />
      </mesh>

      {/* Soft drop shadow behind the parchment. */}
      <mesh position={[0.022, -0.025, Z - 0.003]} renderOrder={ORDER - 3}>
        <planeGeometry args={[PARCH_W + 0.04, PARCH_H + 0.05]} />
        <meshBasicMaterial
          color="#1a0e05"
          transparent
          opacity={0.4}
          depthTest={false}
        />
      </mesh>

      {/* Top + bottom gold rule, like a quest-poster border. */}
      <mesh position={[0, 0.245, Z]} renderOrder={ORDER}>
        <planeGeometry args={[PARCH_W * 0.78, 0.004]} />
        <meshBasicMaterial color={GOLD} depthTest={false} />
      </mesh>
      <mesh position={[0, -0.245, Z]} renderOrder={ORDER}>
        <planeGeometry args={[PARCH_W * 0.78, 0.004]} />
        <meshBasicMaterial color={GOLD} depthTest={false} />
      </mesh>

      {/* Brass nail heads at each parchment corner. */}
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

      {/* Difficulty marker — small gold-ringed colored dot just below the top rule. */}
      <DifficultyMarker color={difficultyColor} z={Z} order={ORDER} />

      {/* Title — vertically centered, bold so it carries the composition. */}
      <Text
        position={[0, 0, Z]}
        renderOrder={ORDER}
        font={fontUrl}
        fontSize={0.052}
        fontWeight={700}
        maxWidth={0.37}
        anchorX="center"
        anchorY="middle"
        color={INK}
        material-depthTest={false}
        material-transparent
      >
        {title}
      </Text>

      {/* Minimalist divider — just a centered star, sits beneath the title. */}
      <Text
        position={[0, -0.115, Z]}
        renderOrder={ORDER}
        font={fontUrl}
        fontSize={0.022}
        color={GOLD}
        anchorX="center"
        anchorY="middle"
        material-depthTest={false}
        material-transparent
      >
        ✦
      </Text>

      {/* Activity — rendered as solid ink-redacted blocks. */}
      <MysteryBlocks
        text={activity}
        position={[0, -0.18, Z]}
        color={INK}
        opacity={0.78}
        renderOrder={ORDER}
      />
    </group>
  );
}

/** Small wax-pin badge at the top of the scroll. */
function DifficultyMarker({
  color,
  z,
  order,
}: {
  color: string;
  z: number;
  order: number;
}) {
  return (
    <group position={[0, 0.225, z]}>
      {/* Outer gold ring */}
      <mesh renderOrder={order}>
        <ringGeometry args={[0.016, 0.024, 32]} />
        <meshBasicMaterial color={GOLD} depthTest={false} />
      </mesh>
      {/* Inner colored dot */}
      <mesh renderOrder={order + 1}>
        <circleGeometry args={[0.014, 24]} />
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
      {/* Iron rim / shadow */}
      <mesh renderOrder={order}>
        <circleGeometry args={[0.0085, 20]} />
        <meshBasicMaterial color="#1a0e05" depthTest={false} />
      </mesh>
      {/* Brass body */}
      <mesh position={[0, 0, 0.0005]} renderOrder={order + 1}>
        <circleGeometry args={[0.0065, 20]} />
        <meshBasicMaterial color={GOLD} depthTest={false} />
      </mesh>
      {/* Subtle highlight */}
      <mesh position={[-0.002, 0.002, 0.001]} renderOrder={order + 2}>
        <circleGeometry args={[0.002, 12]} />
        <meshBasicMaterial color="#f0d28a" depthTest={false} />
      </mesh>
    </group>
  );
}

/**
 * Renders a string as a row of small rectangles — one per "word" — sized
 * proportional to that word's length. Looks like loading-skeleton bars or
 * redacted text. Heights jitter slightly per word for an organic feel.
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
        w: Math.max(0.018, charCount * charWidth),
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
