"use client";

import { Suspense, type ReactNode } from "react";
import { ErrorBoundary } from "./ErrorBoundary";
import { useAssetExists } from "./useAssetExists";

type Props = {
  /**
   * URL to probe. When the HEAD request succeeds we render `children`
   * (which is presumably a Drei loader like `useGLTF` or `useTexture`).
   * When the URL is `undefined`, missing, or fails to load, we render
   * `fallback` instead.
   */
  url: string | undefined;
  /**
   * Rendered when the asset is genuinely missing (404) or errors out
   * during load. This is the "no custom asset shipped" state — for
   * the quest board, that's the procedural wooden frame.
   */
  fallback: ReactNode;
  /**
   * Rendered briefly *while* the asset is loading or its existence
   * is still being probed. Defaults to `null` (render nothing during
   * the load window) so we don't flash the procedural fallback before
   * the real GLB pops in. Callers that prefer a placeholder during
   * load — e.g., a wireframe silhouette — can opt in by passing one.
   *
   * Why separate from `fallback`: showing the procedural board during
   * the ~100–400ms GLB fetch made every page refresh feel like two
   * boards loading sequentially, which read as broken. The genuine
   * "no asset shipped" case is rare in production, so its fallback
   * should NOT also be the loading state.
   */
  loadingFallback?: ReactNode;
  /** Loaded asset content. */
  children: ReactNode;
};

/**
 * Three-in-one pattern wrapper for every auto-discovered asset slot.
 *
 *   1. HEAD-checks the URL via `useAssetExists` — if it 404s, the
 *      loader inside `children` never gets mounted, so Drei doesn't
 *      throw and Next.js dev mode stays quiet.
 *   2. Wraps the loader in `<Suspense fallback>` so the loading
 *      placeholder shows while the asset is being fetched.
 *   3. Wraps it in `<ErrorBoundary fallback>` so any runtime failure
 *      (corrupt GLB, parse error, etc.) gracefully falls back instead
 *      of taking down the rest of the scene.
 *
 * Use this anywhere you have an optional `.glb` / `.png` / `.hdr` and
 * a procedural fallback.
 */
export function AssetSlot({
  url,
  fallback,
  loadingFallback = null,
  children,
}: Props) {
  const status = useAssetExists(url);
  // Asset is genuinely missing (404 or no URL) → procedural fallback.
  if (status === "missing") return <>{fallback}</>;
  // Still probing — don't flash the procedural board; just render
  // the loading placeholder (default: nothing) until the HEAD
  // resolves. The rest of the scene (ground, lights, scrolls) keeps
  // the canvas from looking empty during this brief window.
  if (status === "unknown") return <>{loadingFallback}</>;
  // Present — let Drei suspend on the actual asset load. Use the
  // loading placeholder here too so we get a single, consistent
  // "still loading" silhouette rather than briefly showing the
  // procedural fallback only to swap it for the GLB.
  return (
    <ErrorBoundary fallback={fallback}>
      <Suspense fallback={loadingFallback}>{children}</Suspense>
    </ErrorBoundary>
  );
}
