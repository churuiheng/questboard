/**
 * Display-only URL shortening. Returns a visually compact version of a
 * URL — origin + path-start + ellipsis + path-end — suitable for
 * rendering in a UI element that has limited horizontal space.
 *
 * The original URL is NOT modified or replaced. Callers must keep the
 * full URL around for clipboard copies, navigation, and QR encoding;
 * this helper is purely cosmetic.
 *
 * Examples:
 *   truncateUrl("https://questboard.app/invite?q=eyJhbGciOiJI...VeryLongJWT")
 *     → "questboard.app/invite?q=eyJhbG…JWT"
 *   truncateUrl("https://short.io/abc123") → "short.io/abc123"  (already short)
 *
 * Behavior:
 *   - Strips the URL scheme ("https://", "http://") for compactness.
 *   - Keeps the start of the path/query (so the recipient can recognise
 *     the route) and the tail (so the long opaque token still looks
 *     identifiable).
 *   - If the URL is already shorter than the target length, it's
 *     returned unchanged (modulo the scheme strip).
 */
export function truncateUrl(url: string, maxLength = 48): string {
  if (!url) return url;
  // Strip scheme for compactness — "https://" is visual noise in a
  // shortlink-style display.
  const stripped = url.replace(/^https?:\/\//, "");
  if (stripped.length <= maxLength) return stripped;

  // Reserve room for the leading head + ellipsis + trailing tail.
  // Bias toward the head — recipients need to see the origin/route
  // (e.g. "questboard.app/invite?q=") so the link reads as trustworthy.
  const ellipsis = "…";
  const tailLength = 6;
  const headLength = maxLength - tailLength - ellipsis.length;
  if (headLength <= 0) {
    // Defensive: an absurdly small maxLength — just return the tail.
    return `${ellipsis}${stripped.slice(-tailLength)}`;
  }
  return `${stripped.slice(0, headLength)}${ellipsis}${stripped.slice(-tailLength)}`;
}
