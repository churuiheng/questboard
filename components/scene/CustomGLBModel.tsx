"use client";

import { useMemo, type ReactNode } from "react";
import { useGLTF } from "@react-three/drei";
import type { ThreeElements } from "@react-three/fiber";
import {
  BackSide,
  Color,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  MeshToonMaterial,
  type Material,
  type Object3D,
} from "three";
import { buildToonGradient } from "./toonGradient";
import { useSceneStyle } from "./SceneStyleContext";

type Props = {
  /** Path to the `.glb` to load, relative to the public folder root. */
  url: string;
  /**
   * Rendered in place of the loaded model when the file exists but
   * contains no meshes (a Blender export with an empty selection, for
   * instance). We render inline so the dev error overlay stays quiet —
   * genuine load failures (404 / parse) still bubble to the nearest
   * `<ErrorBoundary>`.
   */
  fallback?: ReactNode;
} & Omit<ThreeElements["primitive"], "object">;

/**
 * Generic auto-discovered `.glb` loader. Used for both the quest board
 * model and the scroll/note model — they had identical bodies. Drei
 * caches by URL so multiple instances pointing at the same file only
 * download once; we `.clone(true)` the scene so each instance is
 * independent.
 *
 * After cloning we run a one-time material substitution pass that
 * replaces every `MeshStandardMaterial` on the model with a
 * `MeshToonMaterial` carrying the scene-wide gradient ramp. This is
 * what gives an imported PBR-textured `.glb` the cel-shaded look the
 * rest of the scene uses, without re-exporting the model.
 *
 * Mount this inside `<AssetSlot url={...} fallback={...}>` and the URL
 * is HEAD-checked before mounting — so a missing file silently shows
 * the fallback instead of throwing.
 */
export function CustomGLBModel({ url, fallback, ...props }: Props) {
  const gltf = useGLTF(url);
  const style = useSceneStyle();

  // The clone (with toon materials + outlines) is keyed to BOTH the
  // GLB scene AND the style fields it depends on — so when the
  // sender tweaks toon stops or outline params in /admin/scene, the
  // GLB rebuilds with the new visual treatment. Without these deps
  // the cloned scene would freeze at the initial style.
  const sceneClone = useMemo(() => {
    const cloned = gltf.scene.clone(true);
    applyToonMaterials(cloned, style.toonStops);
    if (style.outlineThickness > 0) {
      addInvertedHullOutlines(cloned, {
        color: style.outlineColor,
        thickness: style.outlineThickness,
      });
    }
    return cloned;
  }, [gltf.scene, style.toonStops, style.outlineThickness, style.outlineColor]);
  const empty = useMemo(() => !hasAnyMesh(sceneClone), [sceneClone]);

  if (empty) {
    if (process.env.NODE_ENV !== "production") {
      logEmptyOnce(url);
    }
    return <>{fallback ?? null}</>;
  }

  return <primitive object={sceneClone} {...props} />;
}

/**
 * Walks an imported scene and replaces each `MeshStandardMaterial`
 * with a `MeshToonMaterial`. We carry across the bits MeshToon
 * actually uses (color, map, normalMap, alphaMap, emissive,
 * transparent, opacity, side) and drop the PBR-only props
 * (roughness, metalness, envMap) since they have no analog in toon.
 *
 * Handles both single materials and material arrays (multi-material
 * meshes from Blender). Skips meshes that already use a non-standard
 * material — they were either custom-set elsewhere or unlit-by-design
 * and we don't want to silently rewrite them.
 */
function applyToonMaterials(root: Object3D, stops: readonly number[]) {
  // Build a fresh gradient per GLB instance — the cost is trivial
  // (3 bytes + a tiny WebGL handle) and it sidesteps any subtle bugs
  // around sharing a DataTexture across scenes with different
  // dispose lifecycles.
  const gradientMap = buildToonGradient(stops);
  root.traverse((node) => {
    if (!(node instanceof Mesh)) return;
    const mat = node.material as Material | Material[];
    if (Array.isArray(mat)) {
      node.material = mat.map((m) => convertOne(m, gradientMap));
    } else {
      node.material = convertOne(mat, gradientMap);
    }
  });
}

function convertOne(
  mat: Material,
  gradientMap: ReturnType<typeof buildToonGradient>,
): Material {
  if (!(mat instanceof MeshStandardMaterial)) return mat;
  const toon = new MeshToonMaterial({
    color: mat.color,
    map: mat.map ?? undefined,
    alphaMap: mat.alphaMap ?? undefined,
    normalMap: mat.normalMap ?? undefined,
    emissive: mat.emissive,
    emissiveIntensity: mat.emissiveIntensity,
    emissiveMap: mat.emissiveMap ?? undefined,
    transparent: mat.transparent,
    opacity: mat.opacity,
    alphaTest: mat.alphaTest,
    side: mat.side,
    gradientMap,
  });
  toon.name = mat.name;
  return toon;
}

/**
 * Inverted-hull cel-shading outline.
 *
 * For each Mesh in the tree, attach a sibling Mesh that:
 *   - shares the original geometry
 *   - uses a dark MeshBasicMaterial with `side: BackSide`
 *   - is scaled slightly larger (1 + thickness)
 *
 * Because only back-facing triangles render, the silhouette appears
 * as a dark band around the original mesh — the same trick games
 * like Borderlands and Genshin use when they don't want to ship a
 * full post-processing edge-detect pass.
 *
 * Caveats:
 *   - Doubles draw calls (acceptable for this scene's polycount).
 *   - Concave shapes can show interior outlines where surfaces
 *     overlap. Our board is convex-ish so this is fine.
 *   - The outline is uniformly thick in *object* space, so very
 *     small features show proportionally thicker outlines. Tune
 *     `thickness` against the model's bounding scale (0.025 reads
 *     well for the board GLB's ~7-unit width).
 *
 * We collect meshes first, then attach — modifying children while
 * traversing would visit the outline children we just added.
 */
function addInvertedHullOutlines(
  root: Object3D,
  { color, thickness }: { color: string; thickness: number },
) {
  const outlineMaterial = new MeshBasicMaterial({
    color: new Color(color),
    side: BackSide,
  });
  const targets: Mesh[] = [];
  root.traverse((node) => {
    if (node instanceof Mesh && node.geometry) targets.push(node);
  });
  for (const mesh of targets) {
    const outline = new Mesh(mesh.geometry, outlineMaterial);
    // Attaching as a child means the outline inherits the parent's
    // world transform automatically. Scale slightly > 1 along all
    // axes pushes the shell outward; BackSide hides the front-facing
    // triangles so only the silhouette remains visible.
    outline.scale.setScalar(1 + thickness);
    // Outlines must NEVER be hit-tested — they'd block clicks on the
    // real mesh underneath.
    outline.raycast = () => undefined;
    outline.userData.__outline = true;
    mesh.add(outline);
  }
}

/* ------------- helpers ------------- */

const warnedEmptyUrls = new Set<string>();
function logEmptyOnce(url: string) {
  if (warnedEmptyUrls.has(url)) return;
  warnedEmptyUrls.add(url);
  console.info(
    `[QuestBoard] ${url} loaded but has no meshes — using procedural fallback. ` +
      `Check your Blender export.`,
  );
}

/** Recursively scan the scene graph for at least one renderable mesh. */
function hasAnyMesh(object: {
  children?: { type?: string }[];
  type?: string;
}): boolean {
  if (object.type === "Mesh") return true;
  for (const child of object.children ?? []) {
    if (hasAnyMesh(child as typeof object)) return true;
  }
  return false;
}
