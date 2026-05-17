"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { BundleResponse } from "@/types/quest";
import {
  clearBundleResponse,
  getBundleResponse,
  saveBundleResponse,
} from "./localResponse";

const RESPONSE_EVENT = "questboard:response-changed";

/**
 * React hook that mirrors a bundle's response (`accepted:N` or
 * `maybe_later`) from localStorage and writes back to it.
 *
 * Uses `useSyncExternalStore` so the initial render matches SSR (no
 * hydration mismatch). The same-tab pub/sub via a custom DOM event
 * fans out updates within the page; cross-tab updates ride the native
 * `storage` event.
 */
export function usePersistedBundleResponse(
  bundleId: string,
): [BundleResponse | null, (next: BundleResponse | null) => void] {
  const subscribe = useCallback(
    (cb: () => void) => {
      const key = `quest-response:${bundleId}`;
      const onStorage = (e: StorageEvent) => {
        if (e.key === key || e.key === null) cb();
      };
      const onLocal = () => cb();
      window.addEventListener("storage", onStorage);
      window.addEventListener(RESPONSE_EVENT, onLocal);
      return () => {
        window.removeEventListener("storage", onStorage);
        window.removeEventListener(RESPONSE_EVENT, onLocal);
      };
    },
    [bundleId],
  );

  const value = useSyncExternalStore(
    subscribe,
    () => getBundleResponse(bundleId),
    () => null,
  );

  const setValue = useCallback(
    (next: BundleResponse | null) => {
      if (next === null) {
        clearBundleResponse(bundleId);
      } else {
        saveBundleResponse(bundleId, next);
      }
      window.dispatchEvent(new Event(RESPONSE_EVENT));
    },
    [bundleId],
  );

  return [value, setValue];
}
