"use client";

import { Canvas } from "@react-three/fiber";
import { Environment, OrbitControls } from "@react-three/drei";
import { AssetSlot } from "./AssetSlot";
import { ProceduralQuestBoard } from "./ProceduralQuestBoard";
import type { QuestData } from "@/types/quest";

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
  className = "",
}: Props) {
  // When an HDRI is configured we want to dial down the procedural
  // lights — but that decision depends on the file actually existing.
  // We can't `useAssetExists` here anymore (AssetSlot handles that
  // internally), so we just assume an HDRI is in play when a URL is
  // set. The downside is that the procedural lights stay dimmed even
  // if the file 404s; in practice users either ship an HDRI or don't.
  const envPresent = Boolean(environmentUrl);

  return (
    <div className={className} aria-hidden>
      <Canvas
        // Pulled back from the previous setup and a wider FOV so the
        // whole quest board fits the frame on first load.
        camera={{ position: [0, 0.4, 7.5], fov: 45 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
      >
        {/* When an HDRI is in play, dial the procedural lights down so
            the scene isn't over-exposed. The HDRI provides most of the
            ambient + bounced light on its own. */}
        <ambientLight intensity={envPresent ? 0.25 : 0.9} color="#f0d28a" />
        <directionalLight
          position={[3, 4, 2]}
          intensity={envPresent ? 1.0 : 2.0}
          color="#ffb96b"
          castShadow
        />
        <directionalLight
          position={[-2, 1, -2]}
          intensity={envPresent ? 0.2 : 0.55}
          color="#a07ac2"
        />
        <pointLight
          position={[0, -1.6, 2]}
          intensity={envPresent ? 0.5 : 1.2}
          color="#d96b34"
          distance={8}
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
          enabled={controlsEnabled}
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
          />
        </group>
      </Canvas>
    </div>
  );
}
