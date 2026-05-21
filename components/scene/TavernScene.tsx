"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, OrbitControls } from "@react-three/drei";
import { Vector3, type PointLight } from "three";
import { AssetSlot } from "./AssetSlot";
import { ProceduralQuestBoard } from "./ProceduralQuestBoard";
import { GroundDecor } from "./GroundDecor";
import { SCROLL_LAYOUTS } from "@/lib/scrollLayouts";
import type { QuestData } from "@/types/quest";

/**
 * Screen-space anchor written into a shared ref by `ScreenProjector`
 * and read by `KeyboardScrollNav`'s rAF loop. The `visible` flag is
 * false when the scroll has been projected behind the camera so the
 * focus ring can be hidden in that case.
 */
export type ScrollScreenAnchor = {
  x: number;
  y: number;
  visible: boolean;
};

/**
 * Time-of-day phase. Determined from the user's local hour at mount.
 * Drives the four light intensities + colors so the same tavern reads
 * differently morning vs. evening vs. midnight.
 */
type Phase = "night" | "dawn" | "day" | "dusk";

type PhaseLights = {
  ambientIntensity: number;
  ambientColor: string;
  /** "Sun" — the primary key light. Repurposed at night as moonlight. */
  sunIntensity: number;
  sunColor: string;
  /** Cooler rim fill from behind. */
  rimIntensity: number;
  rimColor: string;
  /** The hearth/candle pointlight. Stronger at night, soft by day. */
  emberIntensity: number;
  emberColor: string;
  /** When true, the ember pointlight gets a noisy flicker (see useFrame). */
  flicker: boolean;
};

const PHASE_LIGHTS: Record<Phase, PhaseLights> = {
  // Late-evening tavern. We want "nocturnal but lived-in" — not "dark
  // cave at midnight". The hearth is doing most of the work, with
  // enough moonlight + lantern ambient to keep the scrolls clearly
  // legible. Earlier tuning leaned too far into dark/moody and made
  // the board hard to read.
  night: {
    ambientIntensity: 1.0,
    ambientColor: "#b8a8cf",
    sunIntensity: 1.15,
    sunColor: "#c0a0c8",
    rimIntensity: 0.7,
    rimColor: "#8a72b0",
    emberIntensity: 2.4,
    emberColor: "#e8753a",
    flicker: true,
  },
  // Early morning: warm low sun, ember still alive.
  dawn: {
    ambientIntensity: 0.75,
    ambientColor: "#f3b888",
    sunIntensity: 1.4,
    sunColor: "#ffc080",
    rimIntensity: 0.4,
    rimColor: "#b07ac2",
    emberIntensity: 0.9,
    emberColor: "#d96b34",
    flicker: true,
  },
  // Bright midday: sun-driven, candles barely noticeable.
  day: {
    ambientIntensity: 1.05,
    ambientColor: "#fff0d4",
    sunIntensity: 2.2,
    sunColor: "#fff0c8",
    rimIntensity: 0.3,
    rimColor: "#a0c0e0",
    emberIntensity: 0.3,
    emberColor: "#d96b34",
    flicker: false,
  },
  // Golden hour / cozy evening — the original tuning of the scene.
  dusk: {
    ambientIntensity: 0.9,
    ambientColor: "#f0d28a",
    sunIntensity: 2.0,
    sunColor: "#ffb96b",
    rimIntensity: 0.55,
    rimColor: "#a07ac2",
    emberIntensity: 1.2,
    emberColor: "#d96b34",
    flicker: true,
  },
};

function phaseForHour(hour: number): Phase {
  if (hour >= 21 || hour < 5) return "night";
  if (hour < 8) return "dawn";
  if (hour < 17) return "day";
  return "dusk";
}

type Props = {
  /**
   * The quest options to render on the board. When provided, each
   * scroll shows its own title + activity + "for [recipient]" text. If
   * omitted, falls back to plain (text-less) scrolls per `questCount`.
   */
  quests?: QuestData[];
  questCount?: number;
  onSelectQuest?: (optionIndex: number) => void;

  /* ----- Camera controls ----- */
  /**
   * Whether the recipient can orbit/zoom. Pass `false` while the quest
   * card overlay is open so a drag on the backdrop closes the card
   * instead of rotating the scene.
   */
  controlsEnabled?: boolean;

  /* ----- Custom 3D assets (auto-discovered) ----- */
  boardUrl?: string;
  boardScale?: number;
  boardRotation?: [number, number, number];

  noteUrl?: string;
  noteScale?: number;
  noteRotation?: [number, number, number];

  /**
   * Optional image (PNG/JPG, transparent recommended) used as the hover
   * visual on each scroll. Defaults to `/textures/note_hover.png` — drop
   * a file there and it'll auto-appear. Falls back to a procedural gold
   * ring if the file is missing or fails to load.
   */
  noteHoverImageUrl?: string;
  /** Size of the hover image plane in world units. Default 0.75. */
  noteHoverImageSize?: number;

  /**
   * Optional environment map (HDRI). Provides realistic ambient lighting
   * and reflections on shiny materials. Defaults to `/hdri/tavern.hdr` —
   * drop an .hdr file there and it'll auto-appear. Falls back to plain
   * directional + ambient lights if absent.
   */
  environmentUrl?: string;
  /** When true, the HDRI is also rendered as the scene background. Default false. */
  environmentBackground?: boolean;

  /** Konami easter-egg flag — when true, scrolls cycle through rainbow hues. */
  rainbow?: boolean;

  /**
   * When set, the scroll at this index gets a sonar-style pulse ring
   * to draw the eye on first visit. Pass `null` (or omit) once the
   * recipient has interacted.
   */
  firstHintIndex?: number | null;
  /** Called the first time any scroll is hovered — used to clear the hint. */
  onAnyHover?: () => void;

  /**
   * Optional shared ref the screen-space scroll anchors get written
   * into each frame. `KeyboardScrollNav` reads from this to keep its
   * invisible focus targets pinned to the scrolls even as the user
   * orbits the camera.
   */
  screenAnchorsRef?: React.MutableRefObject<ScrollScreenAnchor[]>;

  className?: string;
};

/**
 * 3D backdrop for the invite page. Orbit + zoom enabled by default so
 * the recipient can spin around the board and pull out to see the
 * whole quest board.
 */
export function TavernScene({
  quests,
  questCount = 1,
  onSelectQuest,
  controlsEnabled = true,
  boardUrl,
  boardScale,
  boardRotation,
  noteUrl,
  noteScale,
  noteRotation,
  noteHoverImageUrl,
  noteHoverImageSize,
  environmentUrl = "/hdri/tavern.hdr",
  environmentBackground = false,
  rainbow = false,
  firstHintIndex = null,
  onAnyHover,
  screenAnchorsRef,
  className = "",
}: Props) {
  // When an HDRI is configured we want to dial down the procedural
  // lights — but that decision depends on the file actually existing.
  // We can't `useAssetExists` here anymore (AssetSlot handles that
  // internally), so we just assume an HDRI is in play when a URL is
  // set. The downside is that the procedural lights stay dimmed even
  // if the file 404s; in practice users either ship an HDRI or don't.
  const envPresent = Boolean(environmentUrl);

  // `introDone` flips once the opening camera dolly finishes. Until then
  // we keep OrbitControls disabled so the user can't fight the camera
  // mid-animation. The camera intro itself lives in <CameraIntro/>.
  const [introDone, setIntroDone] = useState(false);

  // Pick the time-of-day phase once at mount. `prefers-color-scheme:
  // light` forces "day" so users who've opted into a brighter UI don't
  // get a midnight tavern. We don't react to clock ticks — the scene
  // mood that greets the user on open is the mood the whole session
  // stays in. Server snapshot is "dusk" so SSR + first paint match.
  const phase = useMemo<Phase>(() => {
    if (typeof window === "undefined") return "dusk";
    if (window.matchMedia?.("(prefers-color-scheme: light)").matches) {
      return "day";
    }
    return phaseForHour(new Date().getHours());
  }, []);
  const lights = PHASE_LIGHTS[phase];

  // When an HDRI is in play we dial all procedural lights back so the
  // scene isn't double-lit. Different multipliers per light type — the
  // ambient is what an HDRI fundamentally replaces, so it goes lowest.
  const ambient = envPresent ? lights.ambientIntensity * 0.28 : lights.ambientIntensity;
  const sun = envPresent ? lights.sunIntensity * 0.5 : lights.sunIntensity;
  const rim = envPresent ? lights.rimIntensity * 0.4 : lights.rimIntensity;
  const ember = envPresent ? lights.emberIntensity * 0.4 : lights.emberIntensity;

  return (
    <div className={className} aria-hidden>
      <Canvas
        // Start far out — the whole tavern board is in frame on first
        // paint, then `<CameraIntro/>` pans inward to where the notes
        // are readable. Wider FOV (45) so even the start position
        // includes a comfortable margin around the board.
        camera={{ position: [0, 0.55, 10.5], fov: 45 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
      >
        <CameraIntro
          from={[0, 0.55, 10.5]}
          to={[0, 0.2, 5.6]}
          target={[0, 0, 0]}
          duration={2.4}
          onDone={() => setIntroDone(true)}
        />

        {screenAnchorsRef ? (
          <ScreenProjector
            count={quests?.length ?? questCount}
            anchorsRef={screenAnchorsRef}
          />
        ) : null}
        {/* Lights are keyed to the time-of-day phase (see `PHASE_LIGHTS`
            above). Reading the wall clock once at mount keeps the scene
            stable for the whole session — a recipient who opens at 8pm
            doesn't watch the candles dim out underneath them. */}
        <ambientLight intensity={ambient} color={lights.ambientColor} />
        <directionalLight
          position={[3, 4, 2]}
          intensity={sun}
          color={lights.sunColor}
          castShadow
        />
        <directionalLight
          position={[-2, 1, -2]}
          intensity={rim}
          color={lights.rimColor}
        />
        <EmberPointLight
          intensity={ember}
          color={lights.emberColor}
          flicker={lights.flicker}
        />

        <AssetSlot url={environmentUrl} fallback={null}>
          {environmentUrl ? (
            <Environment
              files={environmentUrl}
              background={environmentBackground}
            />
          ) : null}
        </AssetSlot>

        <OrbitControls
          enabled={controlsEnabled && introDone}
          enableRotate
          enableZoom
          enablePan={false}
          enableDamping
          dampingFactor={0.08}
          // Keep the camera from flipping under the floor or pointing
          // straight up at the sky — bounds the experience to a
          // pleasant view-from-the-front arc.
          minPolarAngle={Math.PI / 3.2}
          maxPolarAngle={Math.PI / 1.9}
          minAzimuthAngle={-Math.PI / 2.2}
          maxAzimuthAngle={Math.PI / 2.2}
          minDistance={3}
          maxDistance={14}
          // Look at the center of the board, not the world origin.
          target={[0, 0, 0]}
        />

        {/* Atmospheric ground decor — dirt floor + grass tufts +
            stones + drifting fireflies. Pure procedural geometry so
            no asset cost; deterministic placement so re-renders
            don't reshuffle the scene. */}
        <GroundDecor />

        <group position={[0, 0, 0]} scale={1}>
          <ProceduralQuestBoard
            quests={quests}
            count={quests?.length ?? questCount}
            onSelect={onSelectQuest}
            boardUrl={boardUrl}
            boardScale={boardScale}
            boardRotation={boardRotation}
            noteUrl={noteUrl}
            noteScale={noteScale}
            noteRotation={noteRotation}
            noteHoverImageUrl={noteHoverImageUrl}
            noteHoverImageSize={noteHoverImageSize}
            rainbow={rainbow}
            firstHintIndex={firstHintIndex}
            onAnyHover={onAnyHover}
          />
        </group>
      </Canvas>
    </div>
  );
}

/**
 * Camera dolly that runs once on mount. Eases the camera from `from`
 * to `to` over `duration` seconds while keeping `target` framed, then
 * fires `onDone` so the parent can hand control back to OrbitControls.
 *
 * Lives inside the Canvas (it needs `useThree`/`useFrame`). We pull
 * `clock.elapsedTime` for the timebase so the animation matches r3f's
 * own loop and isn't tied to wall-clock variations.
 *
 * If `useReducedMotion` users land here we still need to position the
 * camera correctly, so we snap to `to` and immediately call `onDone`
 * rather than animating.
 */
function CameraIntro({
  from,
  to,
  target,
  duration = 2.4,
  onDone,
}: {
  from: [number, number, number];
  to: [number, number, number];
  target: [number, number, number];
  duration?: number;
  onDone: () => void;
}) {
  const { camera } = useThree();
  const startedAt = useRef<number | null>(null);
  const finished = useRef(false);
  const fromV = useMemo(() => new Vector3(...from), [from]);
  const toV = useMemo(() => new Vector3(...to), [to]);
  const targetV = useMemo(() => new Vector3(...target), [target]);

  // Honor the OS-level "reduce motion" preference. If on, skip the
  // animation entirely — the user lands at the close-up position
  // immediately.
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) {
      camera.position.copy(toV);
      camera.lookAt(targetV);
      finished.current = true;
      onDone();
    } else {
      camera.position.copy(fromV);
      camera.lookAt(targetV);
    }
    // We intentionally only react to mount + initial values; subsequent
    // changes to from/to/target shouldn't restart the intro.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame(({ clock }) => {
    if (finished.current) return;
    if (startedAt.current === null) {
      // First frame establishes the start time; the previous render
      // already placed the camera at `from`, so we let the user see
      // that pose for one frame before the easing kicks in.
      startedAt.current = clock.elapsedTime;
      return;
    }
    const elapsed = clock.elapsedTime - startedAt.current;
    const t = Math.min(1, elapsed / duration);
    const eased = easeInOutCubic(t);
    camera.position.lerpVectors(fromV, toV, eased);
    camera.lookAt(targetV);
    if (t >= 1) {
      finished.current = true;
      onDone();
    }
  });

  return null;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Projects each scroll's world-space position to screen-space pixel
 * coordinates on every frame and writes them into a shared ref. Lives
 * inside the Canvas so it can read the live camera + viewport via
 * `useThree`. Doesn't trigger React re-renders — the ref is mutated
 * directly and `KeyboardScrollNav` consumes it from a rAF loop.
 *
 * The `visible` flag flips false when a scroll has been projected
 * behind the camera (NDC z > 1), so the keyboard focus ring can be
 * hidden when the user has orbited the camera past the board.
 */
function ScreenProjector({
  count,
  anchorsRef,
}: {
  count: number;
  anchorsRef: React.MutableRefObject<ScrollScreenAnchor[]>;
}) {
  const { camera, size } = useThree();
  const clamped = Math.min(3, Math.max(1, count));
  const layouts = SCROLL_LAYOUTS[clamped];
  // Scratch vector reused per-frame so we don't allocate in the hot path.
  const tmp = useMemo(() => new Vector3(), []);

  useFrame(() => {
    if (anchorsRef.current.length !== layouts.length) {
      // Re-size the array if the option count changed.
      anchorsRef.current = layouts.map(() => ({ x: 0, y: 0, visible: false }));
    }
    for (let i = 0; i < layouts.length; i++) {
      const [x, y, z] = layouts[i];
      tmp.set(x, y, z);
      tmp.project(camera);
      const px = (tmp.x + 1) * 0.5 * size.width;
      const py = (1 - tmp.y) * 0.5 * size.height;
      // After project(), z > 1 means behind the camera; x/y outside
      // [-1, 1] means off-screen. We hide the anchor on either.
      const onScreen =
        tmp.z < 1 && tmp.x > -1.2 && tmp.x < 1.2 && tmp.y > -1.2 && tmp.y < 1.2;
      const anchor = anchorsRef.current[i];
      anchor.x = px;
      anchor.y = py;
      anchor.visible = onScreen;
    }
  });

  return null;
}

/**
 * Hearth/candle pointlight. When `flicker` is on (night, dawn, dusk),
 * its intensity wobbles around a base value driven by two phase-offset
 * sine waves — gives a "candle wax tremor" feel instead of a steady
 * lamp. Day phase passes `flicker={false}` and gets a flat light.
 *
 * Lives inside the Canvas so it can hook `useFrame` for per-frame
 * intensity updates without re-rendering the whole tree.
 */
function EmberPointLight({
  intensity,
  color,
  flicker,
}: {
  intensity: number;
  color: string;
  flicker: boolean;
}) {
  const ref = useRef<PointLight>(null);

  useFrame((state) => {
    if (!ref.current) return;
    if (!flicker) {
      ref.current.intensity = intensity;
      return;
    }
    // Two out-of-phase sines + a tiny seeded offset. Multipliers chosen
    // so the swing stays in roughly ±18% of the base — readable as
    // candle flicker without becoming a strobe.
    const t = state.clock.elapsedTime;
    const wobble =
      1 + 0.12 * Math.sin(t * 6.3) + 0.07 * Math.sin(t * 13.1 + 1.2);
    ref.current.intensity = intensity * wobble;
  });

  return (
    <pointLight
      ref={ref}
      position={[0, -1.6, 2]}
      intensity={intensity}
      color={color}
      distance={8}
    />
  );
}
