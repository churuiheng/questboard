"use client";

import { useEffect, useRef } from "react";

/**
 * Classic Konami code: ↑ ↑ ↓ ↓ ← → ← → B A.
 *
 * `useKonamiCode(onMatch)` listens on window keydown and fires `onMatch`
 * once the full sequence has been entered in order. Any non-matching
 * key resets the progress, so the user has to nail the whole code.
 *
 * Bound on the keyboard layer (not specific to an element) so the user
 * doesn't need to click into anything first — they just start typing.
 */
const KONAMI: readonly string[] = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
];

export function useKonamiCode(onMatch: () => void): void {
  // Stash the callback in a ref so we don't re-bind the effect on every
  // parent render (otherwise we'd reset the progress on every state
  // update — easy way to make this never trigger).
  const onMatchRef = useRef(onMatch);
  useEffect(() => {
    onMatchRef.current = onMatch;
  }, [onMatch]);

  useEffect(() => {
    let progress = 0;
    function onKey(e: KeyboardEvent) {
      // We match against `e.key` (case-insensitive for B/A) rather than
      // `e.code` so non-QWERTY layouts still work.
      const expected = KONAMI[progress];
      const got =
        e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (got === expected) {
        progress += 1;
        if (progress === KONAMI.length) {
          progress = 0;
          onMatchRef.current();
        }
      } else {
        // Be forgiving: if they bumped the *first* key by accident,
        // restart from 1 rather than 0 so the next correct key still
        // moves them forward.
        progress = got === KONAMI[0] ? 1 : 0;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
