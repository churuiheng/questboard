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
 * Build an "Open in Maps" URL from the place + address. Returns null
 * when there's nothing to search for yet (so callers can hide the link
 * rather than render a dead one).
 */
export function buildMapsUrl(place: string, address: string): string | null {
  const query = [place.trim(), address.trim()].filter(Boolean).join(", ");
  if (!query) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
