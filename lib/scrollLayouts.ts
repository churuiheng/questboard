/**
 * Canonical world-space positions for the 1 / 2 / 3 scroll layouts on
 * the quest board. Lives here (rather than locally in
 * ProceduralQuestBoard) so the keyboard-nav screen projector can read
 * the same authoritative source — keeps the focus rings glued to the
 * scrolls even as the camera orbits.
 */
export const SCROLL_LAYOUTS: Record<number, [number, number, number][]> = {
  1: [[0, 0, 0.05]],
  2: [
    [-0.5, 0, 0.05],
    [0.5, 0, 0.05],
  ],
  3: [
    [-0.65, 0, 0.05],
    [0, 0, 0.05],
    [0.65, 0, 0.05],
  ],
};
