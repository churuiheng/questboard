"use client";

import { useEffect, useRef } from "react";
import type { ScrollScreenAnchor } from "@/components/scene/TavernScene";
import type { QuestData } from "@/types/quest";

type Props = {
  /** 1, 2, or 3 — matches the ProceduralQuestBoard layouts. */
  count: number;
  /** Pre-projected quest data, used for descriptive aria-labels. */
  quests: QuestData[];
  /** Called when a button is activated (click, Enter, or Space). */
  onSelectQuest: (index: number) => void;
  /**
   * Fires on the first focus, so the page can clear the first-time
   * hint pulse — focusing in with Tab counts as engagement.
   */
  onAnyFocus?: () => void;
  /**
   * Shared ref written by `ScreenProjector` inside the Canvas. Holds
   * the live screen-space position of each scroll. We poll this in a
   * rAF loop and write straight to button DOM, so the focus rings
   * track the meshes even as the user orbits the camera.
   */
  screenAnchorsRef: React.MutableRefObject<ScrollScreenAnchor[]>;
};

/**
 * A DOM-layer keyboard-and-screen-reader on-ramp into the 3D scene.
 *
 * The 3D tavern's only interaction path is clicking a mesh, which
 * excludes keyboard-only and assistive-tech users entirely. This
 * component sits over the Canvas and renders one invisible focusable
 * button per scroll, kept pinned to the live mesh position via the
 * shared `screenAnchorsRef` (written each frame by `ScreenProjector`
 * inside the Canvas).
 *
 * Tab walks through the buttons in option order; Enter or Space opens
 * that quest, calling the same `openAt` that the 3D click handler
 * already uses. Focus shows a thin gold rounded ring sized like a
 * scroll, so a keyboard user gets clear "you're hovering quest 2 of
 * 3" feedback. If the user has orbited the camera so a scroll is
 * behind them, its button gets `visibility: hidden` so the focus ring
 * doesn't float on empty space — and `tabIndex={-1}` so Tab skips it.
 */
export function KeyboardScrollNav({
  count,
  quests,
  onSelectQuest,
  onAnyFocus,
  screenAnchorsRef,
}: Props) {
  const clamped = Math.min(3, Math.max(1, count));
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // rAF pump that mirrors the shared anchor ref onto each button's
  // inline style. We do this imperatively (no React state) so the
  // update never triggers a re-render — keeps it cheap at 60 fps.
  useEffect(() => {
    let raf = 0;
    function tick() {
      const anchors = screenAnchorsRef.current;
      for (let i = 0; i < buttonRefs.current.length; i++) {
        const btn = buttonRefs.current[i];
        const a = anchors[i];
        if (!btn) continue;
        if (!a || !a.visible) {
          // Keep it focusable=no and out-of-flow visually. We don't
          // unmount because keeping the DOM node stable preserves
          // focus order across orbits.
          btn.style.visibility = "hidden";
          btn.tabIndex = -1;
          continue;
        }
        btn.style.visibility = "visible";
        btn.tabIndex = 0;
        btn.style.left = `${a.x}px`;
        btn.style.top = `${a.y}px`;
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [screenAnchorsRef]);

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[5]"
      aria-label="Keyboard quest picker"
    >
      {Array.from({ length: clamped }).map((_, i) => {
        const title = quests[i]?.title?.trim() || "Untitled quest";
        const label =
          clamped > 1
            ? `Open quest ${i + 1} of ${clamped}: ${title}`
            : `Open quest: ${title}`;
        return (
          <button
            key={i}
            ref={(el) => {
              buttonRefs.current[i] = el;
            }}
            type="button"
            onClick={() => onSelectQuest(i)}
            onFocus={onAnyFocus}
            aria-label={label}
            // Start off-screen until the first projector frame paints
            // — buttons are invisible at rest, so a one-frame
            // initial position at (-9999, -9999) is imperceptible.
            style={{ left: -9999, top: -9999, visibility: "hidden" }}
            // Size approximates a scroll's screen footprint at the
            // intro dolly's resting camera. Slight overshoot is fine
            // — the focus ring just reads as "this scroll".
            className="pointer-events-auto absolute h-[26vmin] w-[18vmin] max-h-[260px] max-w-[180px] -translate-x-1/2 -translate-y-1/2 rounded-[20px] bg-transparent outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-gold/85 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
          />
        );
      })}
    </div>
  );
}
