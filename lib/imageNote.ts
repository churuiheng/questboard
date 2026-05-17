"use client";

/**
 * Image-note compression.
 *
 * QuestBoard has no backend — the entire quest travels inside the share
 * URL. So an image note can't reference an uploaded file; the picture
 * itself has to be embedded as a base64 data-URL inside the bundle.
 *
 * Raw phone photos are megabytes; a data-URL that big would produce a
 * multi-hundred-KB link no app would carry. So we aggressively shrink:
 * scale the longest edge down, re-encode as JPEG, and step quality (then
 * dimension) down until the data-URL fits a byte budget. This trades
 * image fidelity for a link that can actually be sent — a deliberate
 * tradeoff of the no-backend design. The budget is tight on purpose;
 * even so, an image link is far longer than a text one (the
 * GenerateLinkPanel warning copy reflects this).
 */

/**
 * Max characters allowed in the image data-URL. base64 inflates bytes
 * ~1.37×, and the whole thing is base64'd again by questCodec, so even
 * this "small" budget yields a long link. Kept low deliberately.
 */
export const MAX_IMAGE_DATAURL_CHARS = 24_000;

/** Hard cap on the original file we'll even attempt (pre-compression). */
export const MAX_SOURCE_BYTES = 12 * 1024 * 1024;

export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

/** Longest-edge sizes we try, largest first, before lowering quality further. */
const DIMENSION_STEPS = [400, 320, 256, 192, 144];
const QUALITY_STEPS = [0.7, 0.58, 0.46, 0.36, 0.28];

export type ImageNoteError =
  | "not-an-image"
  | "too-large"
  | "decode-failed"
  | "cannot-compress";

export function isImageNoteError(value: unknown): value is ImageNoteError {
  return (
    value === "not-an-image" ||
    value === "too-large" ||
    value === "decode-failed" ||
    value === "cannot-compress"
  );
}

export function describeImageNoteError(err: ImageNoteError): string {
  switch (err) {
    case "not-an-image":
      return "That file isn't an image. Try a JPG, PNG, or WebP.";
    case "too-large":
      return "That image is enormous — pick one under 12 MB.";
    case "decode-failed":
      return "Couldn't read that image. It may be corrupt.";
    case "cannot-compress":
      return "That image is too detailed to fit in a shareable link. Try a simpler or smaller one.";
  }
}

/**
 * Decode `file`, shrink it, and return a JPEG data-URL guaranteed to be
 * ≤ MAX_IMAGE_DATAURL_CHARS. Rejects with an `ImageNoteError` string.
 *
 * Browser-only (canvas + Image). Callers are "use client" components.
 */
export function fileToImageNoteDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject("not-an-image" as ImageNoteError);
      return;
    }
    if (file.size > MAX_SOURCE_BYTES) {
      reject("too-large" as ImageNoteError);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      try {
        const dataUrl = compressLoadedImage(img);
        if (dataUrl) resolve(dataUrl);
        else reject("cannot-compress" as ImageNoteError);
      } catch {
        reject("decode-failed" as ImageNoteError);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject("decode-failed" as ImageNoteError);
    };

    img.src = objectUrl;
  });
}

/**
 * Scale the longest edge to `maxEdge`, paint onto a white background
 * (JPEG has no alpha — flattening avoids black fringes from PNG/WebP
 * transparency), and return a JPEG data-URL at `quality`.
 */
function encodeAtSize(
  img: HTMLImageElement,
  maxEdge: number,
  quality: number,
): string | null {
  const longest = Math.max(img.naturalWidth, img.naturalHeight);
  const scale = longest > maxEdge ? maxEdge / longest : 1;
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}

function compressLoadedImage(img: HTMLImageElement): string | null {
  let smallestSoFar: string | null = null;

  for (const dim of DIMENSION_STEPS) {
    for (const q of QUALITY_STEPS) {
      const candidate = encodeAtSize(img, dim, q);
      if (!candidate) continue;
      if (candidate.length <= MAX_IMAGE_DATAURL_CHARS) return candidate;
      if (!smallestSoFar || candidate.length < smallestSoFar.length) {
        smallestSoFar = candidate;
      }
    }
  }
  // Even the smallest setting overflowed the budget. Refuse rather than
  // emit a link no messaging app would carry.
  return null;
}
