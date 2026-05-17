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
  /** Rendered when the asset is missing, still loading, or fails. */
  fallback: ReactNode;
  /** Loaded asset content. */
  children: ReactNode;
};

/**
 * Three-in-one pattern wrapper for every auto-discovered asset slot.
 *
 *   1. HEAD-checks the URL via `useAssetExists` — if it 404s, the
 *      loader inside `children` never gets mounted, so Drei doesn't
 *      throw and Next.js dev mode stays quiet.
 *   2. Wraps the loader in `<Suspense fallback>` so the procedural
 *      fallback shows while the asset is being fetched.
 *   3. Wraps it in `<ErrorBoundary fallback>` so any runtime failure
 *      (corrupt GLB, parse error, etc.) gracefully falls back instead
 *      of taking down the rest of the scene.
 *
 * Use this anywhere you have an optional `.glb` / `.png` / `.hdr` and
 * a procedural fallback.
 */
export function AssetSlot({ url, fallback, children }: Props) {
  const status = useAssetExists(url);
  if (status !== "present") return <>{fallback}</>;
  return (
    <ErrorBoundary fallback={fallback}>
      <Suspense fallback={fallback}>{children}</Suspense>
    </ErrorBoundary>
  );
}
