"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Group } from "three";
import { AssetSlot } from "./AssetSlot";
import { CustomGLBModel } from "./CustomGLBModel";
import { ScrollSlot } from "./ScrollSlot";
import { useToonGradient } from "./SceneStyleContext";
import { SCROLL_LAYOUTS } from "@/lib/scrollLayouts";
import type { QuestData } from "@/types/quest";

type Props = {
  /**
   * Per-option quest data. When provided, each scroll renders its own
   * title + activity preview directly on the parchment.
   */
  quests?: QuestData[];
  count?: number;
  onSelect?: (optionIndex: number) => void;

  /* ----- Custom board model ----- */
  boardUrl?: string;
  boardScale?: number;
  boardRotation?: [number, number, number];

  /* ----- Custom note model ----- */
  noteUrl?: string;
  noteScale?: number;
  noteRotation?: [number, number, number];

  /* ----- Custom note hover visual ----- */
  noteHoverImageUrl?: string;
  noteHoverImageSize?: number;

  /** Konami easter-egg flag: when true, scrolls cycle through rainbow hues. */
  rainbow?: boolean;

  /** Index of the scroll to highlight with a first-time hint pulse. */
  firstHintIndex?: number | null;
  /** Fires when any scroll is hovered — used to clear the first-time hint. */
  onAnyHover?: () => void;
};

// 2D version derived from the shared 3D layouts (drops the Z). The
// shared file in lib/ is the single source of truth so the keyboard
// nav's screen projector stays in sync with what's actually rendered.
const SCROLL_LAYOUTS_2D: Record<number, [number, number][]> = Object.fromEntries(
  Object.entries(SCROLL_LAYOUTS).map(([k, positions]) => [
    k,
    positions.map(([x, y]) => [x, y] as [number, number]),
  ]),
) as Record<number, [number, number][]>;

/**
 * Top-level quest board scene. Renders:
 *   - The wooden board frame (custom GLB or procedural fallback)
 *   - N scroll slots laid out across the board
 *
 * Per-scroll geometry, hover, click, and text overlay live inside
 * <ScrollSlot/>. Procedural texture for the parchment lives in
 * `lib/parchmentTexture.ts`.
 */
export function ProceduralQuestBoard({
  quests,
  count = 1,
  onSelect,
  boardUrl = "/models/quest_board.glb",
  boardScale = 1,
  boardRotation = [0, 0, 0],
  noteUrl = "/models/quest_note.glb",
  noteScale = 0.55,
  noteRotation = [0, 0, 0],
  noteHoverImageUrl = "/textures/note_hover.png",
  noteHoverImageSize = 0.75,
  rainbow = false,
  firstHintIndex = null,
  onAnyHover,
}: Props) {
  const sceneRef = useRef<Group>(null);
  const clampedCount = Math.min(3, Math.max(1, count));
  const positions = SCROLL_LAYOUTS_2D[clampedCount];

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Cursor feedback while hovering any clickable scroll.
  useEffect(() => {
    if (!onSelect) return;
    document.body.style.cursor = hoveredIndex !== null ? "pointer" : "auto";
    return () => {
      document.body.style.cursor = "auto";
    };
  }, [hoveredIndex, onSelect]);

  // Gentle idle sway of the whole board.
  useFrame((state) => {
    if (!sceneRef.current) return;
    const t = state.clock.elapsedTime;
    sceneRef.current.rotation.y = Math.sin(t * 0.25) * 0.04;
    sceneRef.current.position.y = Math.sin(t * 0.6) * 0.015;
  });

  const proceduralBoard = <ProceduralBoardFrame />;

  return (
    <group ref={sceneRef}>
      {/* Wooden frame — custom model when present, procedural fallback. */}
      <AssetSlot url={boardUrl} fallback={proceduralBoard}>
        <CustomGLBModel
          url={boardUrl}
          scale={boardScale}
          rotation={boardRotation}
          fallback={proceduralBoard}
        />
      </AssetSlot>

      {/* Scrolls render on top of whatever board is in use. */}
      {positions.map(([x, y], index) => (
        <ScrollSlot
          key={index}
          position={[x, y, 0.05]}
          hovered={hoveredIndex === index}
          highlightNumber={clampedCount > 1 ? index + 1 : null}
          quest={quests?.[index]}
          onPointerOver={() => {
            setHoveredIndex(index);
            // First hover anywhere clears the first-time hint.
            onAnyHover?.();
          }}
          onPointerOut={() => setHoveredIndex((curr) => (curr === index ? null : curr))}
          onClick={onSelect ? () => onSelect(index) : undefined}
          noteUrl={noteUrl}
          noteScale={noteScale}
          noteRotation={noteRotation}
          noteHoverImageUrl={noteHoverImageUrl}
          noteHoverImageSize={noteHoverImageSize}
          rainbow={rainbow}
          firstHint={firstHintIndex === index}
        />
      ))}
    </group>
  );
}

/* ----------------- Procedural wooden frame (board fallback) ----------------- */

function ProceduralBoardFrame() {
  const woodDark = "#5a3818";
  const woodMid = "#8a5a2e";
  const woodLight = "#a06a38";
  // Shared cel-shading ramp so the procedural fallback matches the
  // toon style applied to the rest of the scene (GroundDecor, the
  // imported GLB, etc.). MeshToonMaterial discards roughness/metalness
  // — we keep `color` + `emissive` + `gradientMap` and let the band
  // texture do the shading work. Sourced via the SceneStyleContext
  // so /admin/scene tweaks flow through here automatically.
  const toon = useToonGradient();

  return (
    <group>
      {/* Vertical posts */}
      {[-0.95, 0.95].map((x) => (
        <mesh key={x} position={[x, 0, -0.05]} castShadow>
          <boxGeometry args={[0.14, 2.3, 0.14]} />
          <meshToonMaterial color={woodDark} gradientMap={toon} />
        </mesh>
      ))}

      {/* Crossbeam */}
      <mesh position={[0, 1.0, -0.05]} castShadow>
        <boxGeometry args={[2.2, 0.18, 0.16]} />
        <meshToonMaterial color={woodDark} gradientMap={toon} />
      </mesh>

      {/* Plank */}
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[1.9, 1.6, 0.07]} />
        <meshToonMaterial color={woodMid} gradientMap={toon} />
      </mesh>

      {/* Iron rivets */}
      {[
        [-0.9, 0.5],
        [0.9, 0.5],
        [-0.9, -0.5],
        [0.9, -0.5],
      ].map(([x, y]) => (
        <mesh
          key={`rivet-${x},${y}`}
          position={[x, y, 0.06]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <cylinderGeometry args={[0.04, 0.04, 0.025, 12]} />
          <meshToonMaterial color="#2a1709" gradientMap={toon} />
        </mesh>
      ))}

      {/* Gold finial */}
      <mesh position={[0, 1.22, -0.05]}>
        <coneGeometry args={[0.18, 0.26, 5]} />
        <meshToonMaterial
          color="#e6b352"
          emissive="#e6b352"
          emissiveIntensity={0.25}
          gradientMap={toon}
        />
      </mesh>

      {/* Sconces on top of the posts */}
      {[-0.95, 0.95].map((x) => (
        <mesh key={`sconce-${x}`} position={[x, 1.18, -0.05]}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshToonMaterial
            color={woodLight}
            emissive="#d96b34"
            emissiveIntensity={0.15}
            gradientMap={toon}
          />
        </mesh>
      ))}
    </group>
  );
}
