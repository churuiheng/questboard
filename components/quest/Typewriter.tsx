"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

/**
 * Lightweight typewriter. Respects prefers-reduced-motion by rendering
 * the full text immediately. No external library needed for this one effect.
 */
export function Typewriter({
  text,
  speedMs = 28,
  startDelayMs = 200,
  className = "",
}: {
  text: string;
  speedMs?: number;
  startDelayMs?: number;
  className?: string;
}) {
  const prefersReducedMotion = usePrefersReducedMotion();
  // When reduced motion is on, render the whole string immediately.
  // Otherwise grow it character-by-character via a chain of setTimeouts.
  const [shown, setShown] = useState(() => (prefersReducedMotion ? text : ""));

  useEffect(() => {
    if (prefersReducedMotion) return;

    let cursor = 0;
    let tickTimer: ReturnType<typeof setTimeout> | null = null;

    const tick = () => {
      cursor++;
      setShown(text.slice(0, cursor));
      if (cursor < text.length) {
        tickTimer = setTimeout(tick, speedMs);
      }
    };

    const startTimer = setTimeout(() => {
      tickTimer = setTimeout(tick, speedMs);
    }, startDelayMs);

    return () => {
      clearTimeout(startTimer);
      if (tickTimer) clearTimeout(tickTimer);
    };
  }, [text, speedMs, startDelayMs, prefersReducedMotion]);

  return (
    <span className={className}>
      {shown}
      {shown.length < text.length ? (
        <span className="ml-0.5 inline-block w-[1ch] -translate-y-[1px] animate-pulse text-ember-deep">
          ▍
        </span>
      ) : null}
    </span>
  );
}

// Reads the prefers-reduced-motion media query as an external store.
// useSyncExternalStore handles the SSR snapshot cleanly without falling
// foul of the new "no setState in effect" rule.
function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false, // SSR fallback: assume motion is OK
  );
}
