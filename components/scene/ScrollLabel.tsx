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
 * parchment. Cinzel is wide, so short titles get a punchy display
 * size and longer ones shrink to keep everything readable without
 * truncating mid-word.
 */
function fitTitleSize(title: string): number {
  const len = title.length;
  if (len <= 14) return 0.046;
  if (len <= 22) return 0.038;
  if (len <= 32) return 0.032;
  if (len <= 44) return 0.026;
  return 0.022;
}

/**
 * The scroll pinned to the tavern board. We've stripped this back to
 * just the two things a recipient needs at a glance:
 *
 *   ┌─────────────────┐
 *   │       ●         │  ← tiny difficulty dot
 *   │                 │
 *   │     TITLE       │  ← the only readable element
 *   │                 │
 *   └─────────────────┘
 *
 * Everything else (activity blocks, dividers, ✦ ornaments) was reading
 * as noise at this scale. The full quest details open on click in the
 * 2D card; the scroll is just a hook to invite the click.
 */
export function ScrollLabel({ quest }: { quest: QuestData }) {
  const title = truncate(quest.title.trim() || "An Untitled Quest", 60);
  const titleFontSize = fitTitleSize(title);
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

      {/* Difficulty dot — tiny, top-center. The whole "what kind of
          quest" signal lives here now. */}
      <DifficultyMarker color={difficultyColor} position={[0, 0.17, Z]} order={ORDER} />

      {/* Title — the only readable element. Centered. Font size scales
          with title length (see `fitTitleSize`). Allowed to wrap to two
          lines for long titles. */}
      <Text
        position={[0, 0, Z]}
        renderOrder={ORDER}
        font={fontUrl}
        fontSize={titleFontSize}
        fontWeight={700}
        maxWidth={0.36}
        lineHeight={1.08}
        textAlign="center"
        anchorX="center"
        anchorY="middle"
        color={INK}
        material-depthTest={false}
        material-transparent
      >
        {title}
      </Text>
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
        <ringGeometry args={[0.012, 0.02, 32]} />
        <meshBasicMaterial color={GOLD} depthTest={false} />
      </mesh>
      {/* Inner colored dot */}
      <mesh renderOrder={order + 1}>
        <circleGeometry args={[0.01, 24]} />
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
