"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BufferAttribute, CircleGeometry, Group } from "three";
import { useToonGradient } from "./SceneStyleContext";

/**
 * Atmospheric decor under and around the quest board: a circular
 * dirt-and-moss floor, a ring of low-poly grass tufts, scattered
 * stones, and a few gently drifting fireflies. Pure procedural
 * geometry — no shaders, no GLB assets — so the scene stays
 * lightweight even on phones.
 *
 * Everything is deterministically seeded by index so React re-renders
 * don't reshuffle the layout. Tuned for the board's intro-dolly
 * resting view (camera around y=0.2, z=5.6 looking at origin), so
 * the floor sits at y=-4.15 — just below the base of the quest board
 * GLB model (whose geometry bottoms out at y≈-4.08), leaving a
 * shallow visible plane that the board reads as planted on top of.
 *
 * Palette: all elements share a single warm-earth family — the floor,
 * stones, and grass are mostly variations of the same brown, with the
 * only true accent being the firefly glow. Previously the scene mixed
 * green moss, saturated grass, and gray stones; that read as busy and
 * fought the tavern's warm lighting.
 */
export function GroundDecor() {
  return (
    <group position={[0, -4.15, 0]}>
      <Floor />
      <Stones />
      <GrassTufts />
      <Fireflies />
    </group>
  );
}

/**
 * The dirt floor. A single mesh — no stacked discs, no visible seam.
 * Vertex-color alpha fades smoothly from fully opaque at the center
 * to fully transparent at the rim, giving a soft natural edge instead
 * of a hard circle boundary. Base color is a warm mid-brown ("dirt
 * under torchlight") rather than the espresso-dark previous tone,
 * which was reading as a puddle.
 */
function Floor() {
  const toon = useToonGradient();
  // Build the geometry imperatively so we can attach a per-vertex
  // alpha that falls off with radius. CircleGeometry lays out one
  // center vertex + N rim vertices; we want the center fully opaque
  // and the rim fully transparent. Re-used across renders via useMemo
  // so we're not rebuilding the buffer every frame.
  const geometry = useMemo(() => {
    const radius = 6;
    const segments = 96;
    const geom = new CircleGeometry(radius, segments);
    const posAttr = geom.getAttribute("position") as BufferAttribute;
    const colors = new Float32Array(posAttr.count * 4); // RGBA
    // Slightly off-white seed — the actual color comes from the
    // material; vertex colors here are just (1,1,1,alpha) so they
    // multiply through cleanly without tinting the base color.
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i);
      const r = Math.sqrt(x * x + y * y);
      // Falloff: ~80% alpha through the inner half, then smooth out
      // to 0 at the rim. Pow > 1 keeps the visible disk feeling
      // substantial instead of fading too early.
      const t = Math.min(1, r / radius);
      const alpha = Math.pow(1 - t, 1.8);
      colors[i * 4 + 0] = 1;
      colors[i * 4 + 1] = 1;
      colors[i * 4 + 2] = 1;
      colors[i * 4 + 3] = alpha;
    }
    geom.setAttribute("color", new BufferAttribute(colors, 4));
    return geom;
  }, []);

  return (
    <group rotation={[-Math.PI / 2, 0, 0]}>
      <mesh geometry={geometry} receiveShadow>
        <meshToonMaterial
          // Warm mid-brown — reads as dirt under tavern light. The
          // cel-shading gradient quantizes the lambert term into a
          // few bands so the ground reads as illustration rather
          // than photorealistic dirt.
          color="#6b4a2c"
          transparent
          vertexColors
          gradientMap={toon}
        />
      </mesh>
    </group>
  );
}

/**
 * A ring of small grass tufts around the front of the board. Each
 * tuft is 4-5 cone "blades" clustered together. Deterministic
 * positions keep the layout stable across renders.
 *
 * Distribution is biased toward the front (z > 0) so the camera
 * actually sees most of the grass; the back of the board is
 * usually offscreen behind the floor.
 */
function GrassTufts() {
  const tufts = useMemo(() => generateTufts(14), []);
  return (
    <group>
      {tufts.map((tuft) => (
        <Tuft key={tuft.id} {...tuft} />
      ))}
    </group>
  );
}

type TuftSpec = {
  id: number;
  x: number;
  z: number;
  bladeCount: number;
  scale: number;
  rotation: number;
};

function generateTufts(count: number): TuftSpec[] {
  const out: TuftSpec[] = [];
  for (let i = 0; i < count; i++) {
    // Distribute around a forward-biased arc — most tufts in the
    // front-left and front-right of the board, a few behind.
    const angle = -Math.PI / 2 + ((i / count) - 0.5) * Math.PI * 1.5;
    const r = 1.6 + ((i * 17) % 7) * 0.18;
    const seed = (i * 37) % 11;
    out.push({
      id: i,
      x: Math.cos(angle) * r,
      z: Math.sin(angle) * r,
      bladeCount: 3 + (seed % 3),
      scale: 0.7 + (seed % 5) * 0.08,
      rotation: (seed / 11) * Math.PI * 2,
    });
  }
  return out;
}

function Tuft({ x, z, bladeCount, scale, rotation }: TuftSpec) {
  // Hook at top so the same gradient instance flows into all blades
  // (cached by stops via SceneStyleContext, so this is cheap).
  const toon = useToonGradient();
  // Each blade is a thin cone leaning slightly outward from the
  // cluster center, evoking real grass tufts.
  return (
    <group position={[x, 0, z]} scale={scale} rotation={[0, rotation, 0]}>
      {Array.from({ length: bladeCount }, (_, i) => {
        const t = i / bladeCount;
        const ang = t * Math.PI * 2;
        const offset = 0.04;
        const lean = 0.18;
        return (
          <mesh
            key={i}
            position={[Math.cos(ang) * offset, 0.09, Math.sin(ang) * offset]}
            rotation={[Math.cos(ang) * lean, 0, Math.sin(ang) * lean]}
          >
            <coneGeometry args={[0.03, 0.2, 4]} />
            <meshToonMaterial
              // Muted olive-brown that reads as dry grass under
              // warm tavern light. Toon shading on the cone shape
              // gives each blade a hand-painted facet look.
              color="#5a4a28"
              gradientMap={toon}
            />
          </mesh>
        );
      })}
    </group>
  );
}

/**
 * A handful of small stones nestled near the board's base. Subtle
 * grounding detail — gives the eye something to land on between the
 * floor and the dramatic board.
 */
function Stones() {
  const stones = useMemo(() => generateStones(6), []);
  const toon = useToonGradient();
  return (
    <group>
      {stones.map((s) => (
        <mesh
          key={s.id}
          position={[s.x, s.y, s.z]}
          rotation={[0, s.rotation, 0]}
          scale={s.scale}
        >
          <boxGeometry args={[0.18, 0.1, 0.22]} />
          <meshToonMaterial
            // Warm dark stone — close enough to the floor tone that
            // the stones read as part of the earth rather than a
            // separate gray element.
            color="#3a2e22"
            gradientMap={toon}
          />
        </mesh>
      ))}
    </group>
  );
}

type StoneSpec = {
  id: number;
  x: number;
  y: number;
  z: number;
  scale: number;
  rotation: number;
};

function generateStones(count: number): StoneSpec[] {
  const out: StoneSpec[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 1.4 - Math.PI * 0.7;
    const r = 1.4 + ((i * 23) % 5) * 0.22;
    const seed = (i * 41) % 13;
    out.push({
      id: i,
      x: Math.cos(angle) * r,
      y: 0.04,
      z: Math.sin(angle) * r + 0.4,
      scale: 0.6 + (seed % 4) * 0.18,
      rotation: (seed / 13) * Math.PI * 2,
    });
  }
  return out;
}

/**
 * Floating ember/firefly particles. Each one drifts on a slow
 * sinusoidal path so they feel alive without being distracting.
 * `useFrame` updates positions; no React state changes per frame.
 */
function Fireflies() {
  const groupRef = useRef<Group>(null);
  const flies = useMemo(() => generateFlies(5), []);

  useFrame((state) => {
    const g = groupRef.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    g.children.forEach((child, i) => {
      const f = flies[i];
      if (!f) return;
      // Each firefly bobs on its own sine + slow horizontal drift.
      const y = f.y + Math.sin(t * f.bobSpeed + f.phase) * 0.18;
      const x = f.x + Math.sin(t * f.driftSpeed + f.phase) * 0.25;
      child.position.set(x, y, f.z);
    });
  });

  return (
    <group ref={groupRef}>
      {flies.map((f) => (
        <mesh key={f.id} position={[f.x, f.y, f.z]}>
          <sphereGeometry args={[0.025, 8, 8]} />
          <meshBasicMaterial color="#ffd47a" />
        </mesh>
      ))}
    </group>
  );
}

type FlySpec = {
  id: number;
  x: number;
  y: number;
  z: number;
  bobSpeed: number;
  driftSpeed: number;
  phase: number;
};

function generateFlies(count: number): FlySpec[] {
  const out: FlySpec[] = [];
  for (let i = 0; i < count; i++) {
    const seed = (i * 53) % 17;
    out.push({
      id: i,
      x: -1.4 + (i / count) * 2.8 + (seed % 5) * 0.1,
      y: 0.6 + (seed % 4) * 0.15,
      z: 0.4 + (seed % 3) * 0.4,
      bobSpeed: 1.2 + (seed % 5) * 0.2,
      driftSpeed: 0.4 + (seed % 4) * 0.15,
      phase: (seed / 17) * Math.PI * 2,
    });
  }
  return out;
}
