"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { DataTexture } from "three";
import type { SceneStyle } from "@/types/sceneStyle";
import { DEFAULT_SCENE_STYLE } from "@/lib/sceneStyle";
import { buildToonGradient } from "./toonGradient";

/**
 * React context carrying the current visual style for the 3D scene.
 *
 * The provider sits inside `<TavernScene>` (or anywhere a
 * style-aware subtree wants to be rooted). All descendant scene
 * components — `GroundDecor`, `ProceduralQuestBoard`, `ScrollSlot`,
 * `CustomGLBModel` — read from this context instead of importing a
 * hardcoded default. Without a provider, the default style applies.
 *
 * This is the plumbing layer behind /admin/scene: editing a knob
 * there saves a new `SceneStyle` to localStorage, which gets baked
 * into outgoing share links as a `?style=…` param. When a recipient
 * opens that link, `InviteScene` decodes the param and passes it to
 * `TavernScene`, which feeds it into this provider — so every visual
 * pulled from the context picks up the sender's chosen look.
 */
const SceneStyleContext = createContext<SceneStyle>(DEFAULT_SCENE_STYLE);

export function SceneStyleProvider({
  style,
  children,
}: {
  /** Active style; falls back to defaults when null/undefined. */
  style?: SceneStyle | null;
  children: ReactNode;
}) {
  return (
    <SceneStyleContext.Provider value={style ?? DEFAULT_SCENE_STYLE}>
      {children}
    </SceneStyleContext.Provider>
  );
}

export function useSceneStyle(): SceneStyle {
  return useContext(SceneStyleContext);
}

/**
 * Per-stops cache of toon gradient textures. Different scenes
 * (admin live preview + recipient invite, in the same tab) often
 * share the same stops, so caching by serialized key returns the
 * same WebGL texture handle and saves a re-upload.
 *
 * We never evict — the cache is bounded by how many distinct stop
 * combinations the user tries, which in practice is a handful.
 */
const gradientCache = new Map<string, DataTexture>();

function getCachedToonGradient(stops: readonly number[]): DataTexture {
  const key = stops.join(",");
  let tex = gradientCache.get(key);
  if (!tex) {
    tex = buildToonGradient(stops);
    gradientCache.set(key, tex);
  }
  return tex;
}

/**
 * Hook that returns the toon gradient texture for the current scene
 * style. Use this in materials instead of the legacy
 * `getDefaultToonGradient()` so the texture updates when the user
 * tweaks stops in /admin/scene.
 *
 *   <meshToonMaterial gradientMap={useToonGradient()} color="#5a3818" />
 */
export function useToonGradient(): DataTexture {
  const style = useSceneStyle();
  // useMemo just keeps the same texture reference between renders —
  // the real caching lives in `gradientCache` so other components
  // with the same stops get the same handle.
  return useMemo(
    () => getCachedToonGradient(style.toonStops),
    [style.toonStops],
  );
}
