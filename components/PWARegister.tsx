"use client";

import { useEffect } from "react";

/**
 * Registers the QuestBoard service worker on mount. Renders nothing.
 *
 * Gated by `NEXT_PUBLIC_ENABLE_SW`:
 *   - When unset → registers automatically in production builds and
 *     skips in development (where the SW would aggressively cache
 *     stale bundles and make hot-reload painful).
 *   - When set to `"1"` → forces registration in any environment.
 *   - When set to `"0"` → forces it off in any environment.
 *
 * Bumps to the SW file are picked up automatically: browsers compare
 * the byte content of `/sw.js` and re-install on any change.
 */
export function PWARegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const flag = process.env.NEXT_PUBLIC_ENABLE_SW;
    const enabled =
      flag === "1" ||
      (flag !== "0" && process.env.NODE_ENV === "production");
    if (!enabled) return;

    // Slight delay to keep registration off the critical path —
    // letting the page paint + the 3D scene boot before we ask
    // the browser to spin up a worker.
    const id = window.setTimeout(() => {
      navigator.serviceWorker
        .register("/sw.js")
        .catch(() => {
          /* swallow — offline support is a nice-to-have, not load-blocking */
        });
    }, 800);

    return () => {
      window.clearTimeout(id);
    };
  }, []);

  return null;
}
