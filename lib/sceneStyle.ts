import type { SceneStyle, ScenePhase } from "@/types/sceneStyle";

/**
 * Defaults match the procedural toon ramp originally hardcoded in
 * `components/scene/toonGradient.ts` and the outline params in
 * `CustomGLBModel.tsx`. Senders who never visit /admin/scene get this
 * exact look, byte-for-byte.
 */
export const DEFAULT_SCENE_STYLE: SceneStyle = {
  toonStops: [0.22, 0.62, 1.0],
  outlineThickness: 0.025,
  outlineColor: "#1a0e05",
  phase: "auto",
};

const PHASE_VALUES: ScenePhase[] = ["auto", "night", "dawn", "day", "dusk"];

/**
 * Whether a style equals the defaults. Used by the encoder so we
 * don't bake a `?style=` param onto links when the sender hasn't
 * customized anything (keeps URLs as short as possible).
 */
export function isDefaultStyle(style: SceneStyle): boolean {
  return (
    style.phase === DEFAULT_SCENE_STYLE.phase &&
    style.outlineThickness === DEFAULT_SCENE_STYLE.outlineThickness &&
    style.outlineColor === DEFAULT_SCENE_STYLE.outlineColor &&
    style.toonStops[0] === DEFAULT_SCENE_STYLE.toonStops[0] &&
    style.toonStops[1] === DEFAULT_SCENE_STYLE.toonStops[1] &&
    style.toonStops[2] === DEFAULT_SCENE_STYLE.toonStops[2]
  );
}

/**
 * Clamp + validate a raw value (from URL or localStorage) into a
 * legal `SceneStyle`. Bad input falls back to the matching default
 * field — we never throw, because the source is user/URL data and
 * a broken style shouldn't break the whole scene.
 */
function clamp(n: unknown, min: number, max: number, fallback: number): number {
  if (typeof n !== "number" || !Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function validatePhase(p: unknown): ScenePhase {
  return typeof p === "string" && (PHASE_VALUES as string[]).includes(p)
    ? (p as ScenePhase)
    : DEFAULT_SCENE_STYLE.phase;
}

function validateColor(c: unknown): string {
  // Accept "#rrggbb" or "#rgb". Anything else falls back.
  if (typeof c !== "string") return DEFAULT_SCENE_STYLE.outlineColor;
  if (/^#[0-9a-fA-F]{6}$/.test(c) || /^#[0-9a-fA-F]{3}$/.test(c)) return c;
  return DEFAULT_SCENE_STYLE.outlineColor;
}

export function validateStyle(raw: unknown): SceneStyle {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const stopsRaw = Array.isArray(obj.toonStops) ? obj.toonStops : [];
  const s0 = clamp(stopsRaw[0], 0, 1, DEFAULT_SCENE_STYLE.toonStops[0]);
  const s1 = clamp(stopsRaw[1], 0, 1, DEFAULT_SCENE_STYLE.toonStops[1]);
  const s2 = clamp(stopsRaw[2], 0, 1, DEFAULT_SCENE_STYLE.toonStops[2]);
  // Enforce strict ascending order — required by the toon shader, and
  // tiny floating-point noise in user input shouldn't break shading.
  const sorted: [number, number, number] = [s0, s1, s2].sort(
    (a, b) => a - b,
  ) as [number, number, number];
  return {
    toonStops: sorted,
    outlineThickness: clamp(
      obj.outlineThickness,
      0,
      0.1,
      DEFAULT_SCENE_STYLE.outlineThickness,
    ),
    outlineColor: validateColor(obj.outlineColor),
    phase: validatePhase(obj.phase),
  };
}

/* ----------------------------------- URL encoding (compact base64url) */

/**
 * Encode for use in a URL query param. Returns `null` when the style
 * matches defaults — keeps share URLs minimal. We use URL-safe base64
 * (`-` and `_` instead of `+` and `/`, no `=` padding) so the value
 * never needs further escaping in `?style=…`.
 */
export function encodeSceneStyle(style: SceneStyle | null): string | null {
  if (!style || isDefaultStyle(style)) return null;
  const json = JSON.stringify(style);
  if (typeof btoa === "undefined") return null;
  return btoa(json).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeSceneStyle(param: string | null): SceneStyle | null {
  if (!param) return null;
  if (typeof atob === "undefined") return null;
  try {
    const b64 = param.replace(/-/g, "+").replace(/_/g, "/");
    // Re-add base64 padding so atob is happy.
    const padded = b64 + "===".slice((b64.length + 3) % 4);
    const json = atob(padded);
    return validateStyle(JSON.parse(json));
  } catch {
    return null;
  }
}

/* --------------------------------------------- localStorage (sender's) */

const STORAGE_KEY = "questboard:scene-style";

export function loadSceneStyle(): SceneStyle | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return validateStyle(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveSceneStyle(style: SceneStyle): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(style));
  } catch {
    /* private mode or quota — silently drop */
  }
}

export function clearSceneStyle(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
