/**
 * Location-note helper.
 *
 * A location note is just two strings (place + address) that ride inside
 * the share URL like any other text. We don't embed a map — that would
 * need an API key / backend, which QuestBoard doesn't have. Instead we
 * build a universal Google Maps search link from whatever the sender
 * typed; it opens the right place in any maps app on any device.
 */

/**
 * Build an "Open in Maps" URL. When the sender pinned an exact spot
 * (lat/lng from the map or "Use my location") we use the coordinates so
 * it lands precisely; otherwise we fall back to a text search of the
 * place + address. Returns null when there's nothing to point at yet,
 * so callers can hide the link rather than render a dead one.
 */
export function buildMapsUrl(
  place: string,
  address: string,
  lat?: number,
  lng?: number,
): string | null {
  if (typeof lat === "number" && typeof lng === "number") {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }
  const query = [place.trim(), address.trim()].filter(Boolean).join(", ");
  if (!query) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
