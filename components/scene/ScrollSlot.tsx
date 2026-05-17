"use client";

import { Suspense, useMemo, useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { Group } from "three";
import { AssetSlot } from "./AssetSlot";
import { CustomGLBModel } from "./CustomGLBModel";
import { ErrorBoundary } from "./ErrorBoundary";
import { ScrollLabel } from "./ScrollLabel";
import { getParchmentTexture } from "@/lib/parchmentTexture";
import type { QuestData } from "@/types/quest";

type SlotProps = {
  position: [number, number, number];
  hovered: boolean;
  highlightNumber: number | null;
  /** Quest data for this slot. When provided, the text overlay is rendered. */
  quest?: QuestData;
  onClick?: () => void;
  onPointerOver?: () => void;
  onPointerOut?: () => void;
  noteUrl: string;
  noteScale: number;
  noteRotation: [number, number, number];
  noteHoverImageUrl: string;
  noteHoverImageSize: number;
};

/**
 * One scroll on the quest board. Wraps:
 *   - The visible scroll (custom GLB or procedural fallback)
 *   - The text overlay (ScrollLabel)
 *   - An invisible interaction plane for click/hover
 *   - A hover indicator (custom image or procedural ring)
 *   - An optional numbered dot for multi-quest bundles
 *
 * Float animation + hover lift are handled here.
 */
export function ScrollSlot({
  position,
  hovered,
  highlightNumber,
  quest,
  onClick,
  onPointerOver,
  onPointerOut,
  noteUrl,
  noteScale,
  noteRotation,
  noteHoverImageUrl,
  noteHoverImageSize,
}: SlotProps) {
  const groupRef = useRef<Group>(null);

  // Subtle independent float + hover lift.
  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime + position[0];
    groupRef.current.position.y = position[1] + Math.sin(t * 1.1) * 0.012;
    groupRef.current.rotation.z = Math.sin(t * 0.4) * 0.025;
    const targetZ = position[2] + (hovered ? 0.06 : 0);
    groupRef.current.position.z += (targetZ - groupRef.current.position.z) * 0.18;
  });

  const handleClick = onClick
    ? (e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        onClick();
      }
    : undefined;
  const handleOver = onPointerOver
    ? (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        onPointerOver();
      }
    : undefined;

  const proceduralVisual = <ProceduralScrollVisual hovered={hovered} />;
  const proceduralHoverRing = <ProceduralHoverRing hovered={hovered} />;

  return (
    <group ref={groupRef} position={position}>
      {/* Visible scroll — custom model when present, procedural fallback. */}
      <AssetSlot url={noteUrl} fallback={proceduralVisual}>
        <CustomGLBModel
          url={noteUrl}
          scale={noteScale}
          rotation={noteRotation}
          fallback={proceduralVisual}
        />
      </AssetSlot>

      {/* Quest text overlay. Wrapped so a font-load hiccup doesn't take
          down the rest of the scene (no URL to HEAD-check, so we use
          plain ErrorBoundary + Suspense rather than AssetSlot). */}
      {quest ? (
        <ErrorBoundary fallback={null}>
          <Suspense fallback={null}>
            <ScrollLabel quest={quest} />
          </Suspense>
        </ErrorBoundary>
      ) : null}

      {/* Invisible interaction plane */}
      <mesh
        onClick={handleClick}
        onPointerOver={handleOver}
        onPointerOut={onPointerOut}
      >
        <planeGeometry args={[0.5, 0.65]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Hover visual — custom image when present, procedural ring otherwise. */}
      <AssetSlot url={noteHoverImageUrl} fallback={proceduralHoverRing}>
        <CustomHoverPlane
          url={noteHoverImageUrl}
          size={noteHoverImageSize}
          hovered={hovered}
        />
      </AssetSlot>

      {/* Numbered indicator dot */}
      {highlightNumber !== null ? (
        <mesh position={[0, -0.42, 0.02]}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshStandardMaterial
            color="#e6b352"
            emissive="#e6b352"
            emissiveIntensity={0.55}
            roughness={0.3}
            metalness={0.3}
          />
        </mesh>
      ) : null}
    </group>
  );
}

/* ----------------- Custom hover plane (image) ----------------- */

function CustomHoverPlane({
  url,
  size,
  hovered,
}: {
  url: string;
  size: number;
  hovered: boolean;
}) {
  // useTexture suspends until the image loads. We always call the hook
  // (so the texture is ready as soon as the first hover) but only
  // render the mesh when hovered.
  const texture = useTexture(url);
  if (!hovered) return null;
  return (
    <mesh position={[0, 0, 0.025]}>
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} />
    </mesh>
  );
}

/* ----------------- Procedural fallbacks ----------------- */

function ProceduralHoverRing({ hovered }: { hovered: boolean }) {
  if (!hovered) return null;
  return (
    <mesh position={[0, 0, 0.025]}>
      <ringGeometry args={[0.32, 0.36, 48]} />
      <meshBasicMaterial color="#e6b352" transparent opacity={0.65} />
    </mesh>
  );
}

function ProceduralScrollVisual({ hovered }: { hovered: boolean }) {
  const texture = useMemo(() => getParchmentTexture(), []);
  return (
    <group>
      <mesh>
        <planeGeometry args={[0.42, 0.55]} />
        <meshStandardMaterial
          map={texture}
          emissive="#e6b352"
          emissiveIntensity={hovered ? 0.45 : 0.12}
          roughness={0.7}
          metalness={0}
        />
      </mesh>

      <mesh position={[0, 0.3, 0.01]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.04, 0.04, 0.46, 14]} />
        <meshStandardMaterial color="#caa066" roughness={0.55} metalness={0.05} />
      </mesh>
      <mesh position={[0, -0.3, 0.01]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.04, 0.04, 0.46, 14]} />
        <meshStandardMaterial color="#caa066" roughness={0.55} metalness={0.05} />
      </mesh>
    </group>
  );
}
