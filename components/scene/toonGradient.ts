import { DataTexture, NearestFilter, RedFormat, UnsignedByteType } from "three";

/**
 * Procedural 1D gradient map for `MeshToonMaterial`. The texture is a
 * single column of N pixels; each pixel's red channel encodes a
 * lighting level. The toon shader looks up brightness at each fragment
 * and snaps to the nearest pixel — that snap is what creates the
 * characteristic cel-shading bands.
 *
 * NearestFilter on both min/mag is critical: without it the texture
 * gets bilinearly interpolated and the bands blur back into a smooth
 * gradient (i.e. you've reinvented Lambert shading and wasted a
 * texture). RedFormat halves memory vs RGB; the toon shader only
 * reads .r anyway.
 *
 * We expose one builder that produces a fresh texture per call (so
 * callers can dispose without affecting others) and one module-level
 * default for the common 3-step ramp shared across the scene.
 */
export function buildToonGradient(stops: readonly number[]): DataTexture {
  if (stops.length === 0) {
    throw new Error("buildToonGradient: need at least one stop");
  }
  const data = new Uint8Array(stops.length);
  for (let i = 0; i < stops.length; i++) {
    // Clamp to [0, 1] then quantize to a byte — protects against
    // accidental over/under values from callers.
    const clamped = Math.max(0, Math.min(1, stops[i]));
    data[i] = Math.round(clamped * 255);
  }
  const tex = new DataTexture(
    data,
    stops.length,
    1,
    RedFormat,
    UnsignedByteType,
  );
  tex.magFilter = NearestFilter;
  tex.minFilter = NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Shared 3-step ramp tuned for the tavern's warm lighting:
 *
 *   shadow     ~22%   — dark side, still readable on the brown ground
 *   midtone    ~62%   — bulk of each surface (the "color" the eye reads)
 *   highlight  100%   — small slice facing the hearth / sun
 *
 * Three bands keep silhouettes legible while still feeling like a
 * shaded illustration. Two bands read flat-cartoon (great for UI
 * decoration, less great for a 3D scene); four+ start looking like
 * smooth shading again. Three is the sweet spot.
 */
let cached: DataTexture | null = null;
export function getDefaultToonGradient(): DataTexture {
  if (cached === null) {
    cached = buildToonGradient([0.22, 0.62, 1.0]);
  }
  return cached;
}
