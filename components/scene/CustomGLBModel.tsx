"use client";

import { useMemo, type ReactNode } from "react";
import { useGLTF } from "@react-three/drei";
import type { ThreeElements } from "@react-three/fiber";

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
 * Mount this inside `<AssetSlot url={...} fallback={...}>` and the URL
 * is HEAD-checked before mounting — so a missing file silently shows
 * the fallback instead of throwing.
 */
export function CustomGLBModel({ url, fallback, ...props }: Props) {
  const gltf = useGLTF(url);

  const sceneClone = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  const empty = useMemo(() => !hasAnyMesh(sceneClone), [sceneClone]);

  if (empty) {
    if (process.env.NODE_ENV !== "production") {
      logEmptyOnce(url);
    }
    return <>{fallback ?? null}</>;
  }

  return <primitive object={sceneClone} {...props} />;
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
