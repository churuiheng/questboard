import { CanvasTexture } from "three";

/**
 * Generates an aged-parchment texture on the fly via Canvas2D. One
 * texture is reused across all scrolls — they share the same look,
 * which is fine (and avoids 3× the GPU memory). Memoized so the canvas
 * is only painted once per page load.
 */
let cached: CanvasTexture | null = null;
export function getParchmentTexture(): CanvasTexture {
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    // Should never happen on a real browser; just hand back an empty texture.
    cached = new CanvasTexture(canvas);
    return cached;
  }

  // Deterministic pseudo-random so the texture is stable across sessions.
  let prngState = 1337;
  const rand = () => {
    prngState = (prngState * 1664525 + 1013904223) >>> 0;
    return prngState / 0xffffffff;
  };

  // Base radial gradient — brighter in the center, aged toward the edges.
  const base = ctx.createRadialGradient(256, 256, 80, 256, 256, 360);
  base.addColorStop(0, "#f6e8c6");
  base.addColorStop(0.55, "#eddbab");
  base.addColorStop(1, "#c8a76b");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 512, 512);

  // Grain — fewer, lighter dots so the parchment reads aged but the
  // text overlay stays crisp.
  for (let i = 0; i < 500; i++) {
    const a = rand() * 0.08;
    ctx.fillStyle = `rgba(74, 47, 23, ${a})`;
    const x = rand() * 512;
    const y = rand() * 512;
    const r = 0.4 + rand() * 1.2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // A few soft warm stains, kept toward the edges so they don't
  // collide with the central text region.
  for (let i = 0; i < 3; i++) {
    const angle = rand() * Math.PI * 2;
    const dist = 150 + rand() * 80;
    const x = 256 + Math.cos(angle) * dist;
    const y = 256 + Math.sin(angle) * dist;
    const r = 40 + rand() * 50;
    const stain = ctx.createRadialGradient(x, y, 0, x, y, r);
    stain.addColorStop(0, "rgba(168, 67, 26, 0.08)");
    stain.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = stain;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Edge vignette — darker outer ring sells age and frames the content.
  const vignette = ctx.createRadialGradient(256, 256, 190, 256, 256, 360);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(74, 47, 23, 0.5)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, 512, 512);

  cached = new CanvasTexture(canvas);
  cached.needsUpdate = true;
  return cached;
}
