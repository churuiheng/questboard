"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Text, useTexture } from "@react-three/drei";
import {
  Color,
  Group,
  MathUtils,
  type MeshBasicMaterial,
  type MeshToonMaterial,
} from "three";
import { AssetSlot } from "./AssetSlot";
import { CustomGLBModel } from "./CustomGLBModel";
import { ErrorBoundary } from "./ErrorBoundary";
import { ScrollLabel } from "./ScrollLabel";
import { useFirstPresentUrl } from "./useAssetExists";
import { useToonGradient } from "./SceneStyleContext";
import { getParchmentTexture } from "@/lib/parchmentTexture";
import { DISPLAY_FONT_CANDIDATES } from "@/lib/fonts";
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
  /**
   * When true, the procedural scroll cycles through rainbow hues — fired
   * by the Konami-code easter egg in InviteScene. No-op for custom GLB
   * notes (their materials aren't ours to mutate).
   */
  rainbow?: boolean;
  /**
   * When true, a sonar-style pulsing gold ring expands around the
   * scroll to nudge first-time visitors to tap it. Decays at the
   * parent level on hover/click or after a few seconds.
   */
  firstHint?: boolean;
};

/**
 * One scroll on the quest board. Wraps:
 *   - The visible scroll (custom GLB or procedural fallback)
 *   - The text overlay (ScrollLabel)
 *   - An invisible interaction plane for click/hover/long-press
 *   - A hover indicator (custom image or procedural ring)
 *   - An optional numbered dot for multi-quest bundles
 *
 * Float animation, hover lift, and long-press flip are all done here.
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
  rainbow = false,
  firstHint = false,
}: SlotProps) {
  const groupRef = useRef<Group>(null);
  const toon = useToonGradient();

  // ── Long-press flip ────────────────────────────────────────────
  // Holding a scroll for 500ms flips it 180° on Y, revealing the
  // "this side intentionally left blank" easter egg. Quick taps go
  // through to onClick as normal.
  const [flipped, setFlipped] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);
  const autoRevertTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearLongPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  // Cleanup on unmount so a pending timer doesn't fire into a dead component.
  useEffect(() => {
    return () => {
      clearLongPress();
      if (autoRevertTimer.current) clearTimeout(autoRevertTimer.current);
    };
  }, []);

  // Subtle independent float + hover lift + flip animation in a single
  // useFrame so everything stays interpolated together.
  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime + position[0];
    groupRef.current.position.y = position[1] + Math.sin(t * 1.1) * 0.012;
    // While flipped we kill the Z tilt so the back face reads cleanly;
    // otherwise keep the gentle sway.
    groupRef.current.rotation.z = flipped
      ? groupRef.current.rotation.z * 0.85
      : Math.sin(t * 0.4) * 0.025;
    const targetZ = position[2] + (hovered && !flipped ? 0.06 : 0);
    groupRef.current.position.z += (targetZ - groupRef.current.position.z) * 0.18;

    // Smoothly approach the target Y rotation. lerp factor 0.12 gives a
    // satisfying half-second flip without snapping.
    const targetRotY = flipped ? Math.PI : 0;
    groupRef.current.rotation.y = MathUtils.lerp(
      groupRef.current.rotation.y,
      targetRotY,
      0.12,
    );
  });

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    longPressFired.current = false;
    clearLongPress();
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      setFlipped((cur) => !cur);
      // Auto-revert after a few seconds so the user can read the joke
      // and then go back to a normal-looking board.
      if (autoRevertTimer.current) clearTimeout(autoRevertTimer.current);
      autoRevertTimer.current = setTimeout(() => setFlipped(false), 3000);
    }, 500);
  };

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    clearLongPress();
    if (longPressFired.current) {
      // Swallow the click — this was a long-press, not a tap.
      longPressFired.current = false;
      return;
    }
    if (onClick) onClick();
  };

  // If the pointer leaves the scroll mid-press, cancel — they were
  // probably aborting and we don't want to fire a flip from off-target.
  const handlePointerOut = () => {
    clearLongPress();
    if (onPointerOut) onPointerOut();
  };

  const handleOver = onPointerOver
    ? (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        onPointerOver();
      }
    : undefined;

  const proceduralVisual = (
    <ProceduralScrollVisual hovered={hovered} rainbow={rainbow} />
  );
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

      {/* Quest text overlay on the FRONT face. Hidden when flipped so
          the back face stays clean. Wrapped in ErrorBoundary +
          Suspense in case the font has a hiccup loading. */}
      {quest && !flipped ? (
        <ErrorBoundary fallback={null}>
          <Suspense fallback={null}>
            <ScrollLabel quest={quest} />
          </Suspense>
        </ErrorBoundary>
      ) : null}

      {/* Back-face inscription — appears only when flipped. Rotated 180°
          on Y so the glyphs read the right way around once the parent
          group has rotated. */}
      {flipped ? (
        <BackFaceInscription />
      ) : null}

      {/* Invisible interaction plane. Captures pointer events for
          hover + click + long-press. */}
      <mesh
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerOver={handleOver}
        onPointerOut={handlePointerOut}
      >
        <planeGeometry args={[0.5, 0.65]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Hover visual — custom image when present, procedural ring otherwise. */}
      <AssetSlot url={noteHoverImageUrl} fallback={proceduralHoverRing}>
        <CustomHoverPlane
          url={noteHoverImageUrl}
          size={noteHoverImageSize}
          hovered={hovered && !flipped}
        />
      </AssetSlot>

      {/* First-time hint pulse — fires only on the very first scroll
          for new visitors, decays on first hover anywhere. */}
      {firstHint && !flipped ? <FirstHintPulse /> : null}

      {/* Numbered indicator dot */}
      {highlightNumber !== null && !flipped ? (
        <mesh position={[0, -0.42, 0.02]}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshToonMaterial
            color="#e6b352"
            emissive="#e6b352"
            emissiveIntensity={0.55}
            gradientMap={toon}
          />
        </mesh>
      ) : null}
    </group>
  );
}

/* ----------------- Back-face inscription ----------------- */

/**
 * The "this side intentionally left blank" gag printed on the back of
 * the scroll. Faint italic Cinzel so it reads as an in-world annotation
 * rather than UI chrome. Rotated 180° on Y because the parent group is
 * flipped, and we want the text legible from the camera once flipped.
 */
function BackFaceInscription() {
  const fontUrl = useFirstPresentUrl(DISPLAY_FONT_CANDIDATES);
  return (
    <group rotation={[0, Math.PI, 0]} position={[0, 0, -0.026]}>
      <Text
        font={fontUrl}
        fontSize={0.026}
        fontStyle="italic"
        maxWidth={0.34}
        lineHeight={1.15}
        textAlign="center"
        anchorX="center"
        anchorY="middle"
        color="#3a2412"
        material-depthTest={false}
        material-transparent
        material-opacity={0.65}
      >
        This side intentionally left blank.
      </Text>
    </group>
  );
}

/* ----------------- First-time hint pulse ----------------- */

/**
 * Sonar-style expanding ring that loops every ~1.6s — the visual "look
 * here" nudge for first-time recipients. Two rings staggered out of
 * phase give the effect of continuous pulses rather than a single
 * heartbeat. Material is non-depth-tested so the ring renders even if
 * the scroll is slightly in front of geometry.
 */
function FirstHintPulse() {
  const ringARef = useRef<MeshBasicMaterial>(null);
  const ringBRef = useRef<MeshBasicMaterial>(null);
  const groupA = useRef<Group>(null);
  const groupB = useRef<Group>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const period = 1.6;
    const a = (t % period) / period;
    const b = ((t + period / 2) % period) / period;
    if (groupA.current) {
      const scale = 0.4 + a * 1.3;
      groupA.current.scale.set(scale, scale, 1);
    }
    if (ringARef.current) {
      ringARef.current.opacity = (1 - a) * 0.85;
    }
    if (groupB.current) {
      const scale = 0.4 + b * 1.3;
      groupB.current.scale.set(scale, scale, 1);
    }
    if (ringBRef.current) {
      ringBRef.current.opacity = (1 - b) * 0.85;
    }
  });

  return (
    <group position={[0, 0, 0.015]}>
      <group ref={groupA}>
        <mesh>
          <ringGeometry args={[0.32, 0.345, 48]} />
          <meshBasicMaterial
            ref={ringARef}
            color="#e6b352"
            transparent
            depthTest={false}
            depthWrite={false}
          />
        </mesh>
      </group>
      <group ref={groupB}>
        <mesh>
          <ringGeometry args={[0.32, 0.345, 48]} />
          <meshBasicMaterial
            ref={ringBRef}
            color="#e6b352"
            transparent
            depthTest={false}
            depthWrite={false}
          />
        </mesh>
      </group>
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

/**
 * The fallback parchment scroll, used when no custom GLB note model is
 * present. When `rainbow` is on (Konami easter egg), the material's
 * emissive cycles through the hue wheel so the parchment glows in
 * every color of the spectrum. Otherwise it stays in the warm ember
 * palette.
 */
function ProceduralScrollVisual({
  hovered,
  rainbow,
}: {
  hovered: boolean;
  rainbow: boolean;
}) {
  const texture = useMemo(() => getParchmentTexture(), []);
  const matRef = useRef<MeshToonMaterial>(null);
  const toon = useToonGradient();
  // Stable scratch colors so we don't allocate per-frame.
  const scratch = useMemo(() => new Color(), []);

  useFrame((state) => {
    const mat = matRef.current;
    if (!mat) return;
    if (rainbow) {
      // Hue cycles once every ~3 seconds. Hot-shift the emissive so the
      // parchment itself isn't dyed (that would look like a printer
      // error) — only the lit glow shifts.
      const hue = (state.clock.elapsedTime * 0.32) % 1;
      scratch.setHSL(hue, 0.85, 0.55);
      mat.emissive.copy(scratch);
      mat.emissiveIntensity = hovered ? 0.95 : 0.7;
    } else {
      // Ease back to the default ember glow when the easter egg ends.
      const targetIntensity = hovered ? 0.45 : 0.12;
      scratch.set("#e6b352");
      mat.emissive.lerp(scratch, 0.12);
      mat.emissiveIntensity = MathUtils.lerp(
        mat.emissiveIntensity,
        targetIntensity,
        0.12,
      );
    }
  });

  return (
    <group>
      <mesh>
        <planeGeometry args={[0.42, 0.55]} />
        <meshToonMaterial
          ref={matRef}
          map={texture}
          emissive="#e6b352"
          emissiveIntensity={hovered ? 0.45 : 0.12}
          gradientMap={toon}
        />
      </mesh>

      <mesh position={[0, 0.3, 0.01]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.04, 0.04, 0.46, 14]} />
        <meshToonMaterial
          color="#caa066"
          gradientMap={toon}
        />
      </mesh>
      <mesh position={[0, -0.3, 0.01]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.04, 0.04, 0.46, 14]} />
        <meshToonMaterial
          color="#caa066"
          gradientMap={toon}
        />
      </mesh>
    </group>
  );
}
