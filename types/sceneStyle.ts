/**
 * User-tweakable visual style for the 3D tavern scene.
 *
 * Lives in localStorage on the sender's machine and rides along on
 * every generated invite link as a `?style=` URL param, so recipients
 * see the scene styled the way the sender configured it.
 *
 * Keep this shape minimal — every field bumps the URL length, and
 * very long URLs start tripping messaging-app limits. Three knobs is
 * a good ceiling for now.
 */
export type ScenePhase = "auto" | "night" | "dawn" | "day" | "dusk";

export type SceneStyle = {
  /**
   * Three brightness stops in [0, 1] driving the toon-shader gradient.
   * Must be strictly ascending — shadow, midtone, highlight — or the
   * cel bands invert and the scene reads as broken.
   */
  toonStops: [number, number, number];
  /**
   * Inverted-hull outline thickness, in object-space scale. 0 disables
   * outlines entirely (toon shading still works, just without the
   * dark contour band).
   *
   * Practical range: 0 – 0.06. Above that the outlines start
   * swallowing small features on the board.
   */
  outlineThickness: number;
  /** Outline color as a hex string (e.g. "#1a0e05"). */
  outlineColor: string;
  /**
   * Forced time-of-day phase, or "auto" to detect from the wall clock
   * (the original behavior — night at 9pm+, day from 8–17, etc.).
   */
  phase: ScenePhase;
};
