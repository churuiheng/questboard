"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Group } from "three";
import { AssetSlot } from "./AssetSlot";
import { CustomGLBModel } from "./CustomGLBModel";
import { ScrollSlot } from "./ScrollSlot";
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
};

const SCROLL_LAYOUTS: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [
    [-0.5, 0],
    [0.5, 0],
  ],
  3: [
    [-0.65, 0],
    [0, 0],
    [0.65, 0],
  ],
};

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
}: Props) {
  const sceneRef = useRef<Group>(null);
  const clampedCount = Math.min(3, Math.max(1, count));
  const positions = SCROLL_LAYOUTS[clampedCount];

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
          onPointerOver={() => setHoveredIndex(index)}
          onPointerOut={() => setHoveredIndex((curr) => (curr === index ? null : curr))}
          onClick={onSelect ? () => onSelect(index) : undefined}
          noteUrl={noteUrl}
          noteScale={noteScale}
          noteRotation={noteRotation}
          noteHoverImageUrl={noteHoverImageUrl}
          noteHoverImageSize={noteHoverImageSize}
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

  return (
    <group>
      {/* Vertical posts */}
      {[-0.95, 0.95].map((x) => (
        <mesh key={x} position={[x, 0, -0.05]} castShadow>
          <boxGeometry args={[0.14, 2.3, 0.14]} />
          <meshStandardMaterial color={woodDark} roughness={0.85} metalness={0} />
        </mesh>
      ))}

      {/* Crossbeam */}
      <mesh position={[0, 1.0, -0.05]} castShadow>
        <boxGeometry args={[2.2, 0.18, 0.16]} />
        <meshStandardMaterial color={woodDark} roughness={0.85} metalness={0} />
      </mesh>

      {/* Plank */}
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[1.9, 1.6, 0.07]} />
        <meshStandardMaterial color={woodMid} roughness={0.8} metalness={0} />
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
          <meshStandardMaterial color="#2a1709" roughness={0.35} metalness={0.7} />
        </mesh>
      ))}

      {/* Gold finial */}
      <mesh position={[0, 1.22, -0.05]}>
        <coneGeometry args={[0.18, 0.26, 5]} />
        <meshStandardMaterial
          color="#e6b352"
          emissive="#e6b352"
          emissiveIntensity={0.25}
          roughness={0.3}
          metalness={0.55}
        />
      </mesh>

      {/* Sconces on top of the posts */}
      {[-0.95, 0.95].map((x) => (
        <mesh key={`sconce-${x}`} position={[x, 1.18, -0.05]}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshStandardMaterial
            color={woodLight}
            emissive="#d96b34"
            emissiveIntensity={0.15}
            roughness={0.5}
            metalness={0.2}
          />
        </mesh>
      ))}
    </group>
  );
}
