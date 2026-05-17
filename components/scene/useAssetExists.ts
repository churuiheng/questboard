"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

export type AssetStatus = "unknown" | "present" | "missing";

/**
 * Lightweight "does this URL exist?" probe.
 *
 * Why this exists: Drei's `useTexture` / `useGLTF` suspend and then throw
 * on 404 — and Next.js's dev error overlay surfaces the throw even when
 * an `ErrorBoundary` catches it. By HEAD-checking the URL first we can
 * skip the load attempt entirely when the file isn't there, keeping the
 * dev overlay quiet for the "no custom asset yet" case.
 *
 * Results are memoized in a module-level cache so multiple scrolls
 * sharing the same URL only issue one HEAD request.
 */

const cache = new Map<string, AssetStatus>();
const subscribers = new Map<string, Set<() => void>>();
const inflight = new Set<string>();

function notify(url: string) {
  subscribers.get(url)?.forEach((cb) => cb());
}

function startProbe(url: string) {
  if (cache.has(url)) return;
  if (inflight.has(url)) return;
  inflight.add(url);
  // We intentionally don't await — failure paths set "missing" and
  // notify subscribers, which re-renders any consumer that's waiting.
  fetch(url, { method: "HEAD" })
    .then((res) => {
      cache.set(url, res.ok ? "present" : "missing");
    })
    .catch(() => {
      cache.set(url, "missing");
    })
    .finally(() => {
      inflight.delete(url);
      notify(url);
    });
}

function createSubscribe(url: string) {
  return (callback: () => void) => {
    if (!subscribers.has(url)) subscribers.set(url, new Set());
    subscribers.get(url)!.add(callback);
    startProbe(url);
    return () => {
      subscribers.get(url)?.delete(callback);
    };
  };
}

export function useAssetExists(url: string | undefined): AssetStatus {
  // Stable references so useSyncExternalStore doesn't tear.
  const subscribe = useMemo(
    () => (url ? createSubscribe(url) : () => () => {}),
    [url],
  );
  const getSnapshot = useCallback(
    () => (url ? cache.get(url) ?? "unknown" : "missing"),
    [url],
  );
  const getServerSnapshot = useCallback(() => "unknown" as AssetStatus, []);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Returns the first URL in `urls` that is `present`, or `undefined` if
 * none have resolved as present yet. HEAD-probes them all in parallel.
 *
 * Useful for "try this list of candidate filenames" patterns — e.g.,
 * font slots that accept `.ttf`, `.otf`, or `.woff` interchangeably.
 *
 * Uses a single `useSyncExternalStore` so the rules-of-hooks linter is
 * happy regardless of how many candidates you pass.
 */
export function useFirstPresentUrl(
  urls: readonly string[],
): string | undefined {
  // Serialize the URL list so we can use it as a dep — avoids creating
  // a fresh subscribe/getSnapshot pair on every render even when the
  // caller passes a new array each time.
  const key = urls.join("\n");

  const subscribe = useMemo(
    () => (cb: () => void) => {
      const unsubs: Array<() => void> = [];
      for (const url of urls) {
        unsubs.push(createSubscribe(url)(cb));
      }
      return () => unsubs.forEach((fn) => fn());
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );

  const getSnapshot = useCallback(() => {
    for (const url of urls) {
      if (cache.get(url) === "present") return url;
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const getServerSnapshot = useCallback(() => undefined, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
