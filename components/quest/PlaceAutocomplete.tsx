"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export type PlacePick = {
  /** Short friendly name (the first segment of Photon's "name" or
   *  the display label). What the recipient sees as "where". */
  place: string;
  /** Remaining detail (street, city, region) for the smaller line on
   *  the lobby card. */
  address: string;
  /** Pinned coords, used to build a precise "Open in Maps" link. */
  lat: number;
  lng: number;
};

type Props = {
  value: string;
  onChange: (place: string) => void;
  /** Called when the user picks one of the autocomplete suggestions —
   *  fills place + address + lat/lng in one go. Plain typing only
   *  calls `onChange(place)`. */
  onSelectSuggestion: (pick: PlacePick) => void;
  placeholder?: string;
  maxLength?: number;
};

type PhotonProperties = {
  name?: string;
  street?: string;
  housenumber?: string;
  city?: string;
  state?: string;
  country?: string;
  osm_value?: string;
};

type PhotonFeature = {
  geometry: { coordinates: [number, number] };
  properties: PhotonProperties;
};

/**
 * Place input with Photon (OSM-backed, CORS-friendly, no API key)
 * autocomplete. Replaces the old place + address pair on the Ending
 * form — one input, the recipient still sees both place and address
 * on the lobby card because the picked suggestion auto-populates both
 * fields plus the map pin.
 *
 * Photon (https://photon.komoot.io/) is the lightest free path that
 * works directly from the browser. Nominatim (the OSM canonical
 * geocoder) requires a User-Agent header that browsers refuse to set;
 * Photon doesn't and supports CORS.
 *
 * Debounced 350ms to be polite. Cap of 5 suggestions to keep the
 * dropdown small enough that it doesn't dominate the form.
 */
export function PlaceAutocomplete({
  value,
  onChange,
  onSelectSuggestion,
  placeholder = "Search a place — e.g. The Cozy Ramen Spot",
  maxLength,
}: Props) {
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<PhotonFeature[]>([]);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  // Inflight AbortController so a fast typer cancels stale requests.
  const inflightRef = useRef<AbortController | null>(null);

  // Debounced fetch. We intentionally don't search until the user has
  // typed ≥ 3 chars — single letters return tens of thousands of hits
  // and Photon throttles aggressive callers. The setState calls are
  // deferred via queueMicrotask to stay clear of React 19's
  // "no setState in effect body" rule.
  useEffect(() => {
    const trimmed = value.trim();
    if (trimmed.length < 3) {
      queueMicrotask(() => {
        setSuggestions([]);
        setLoading(false);
      });
      return;
    }
    queueMicrotask(() => setLoading(true));
    const t = window.setTimeout(() => {
      // Cancel any prior inflight before starting a new one.
      inflightRef.current?.abort();
      const ctrl = new AbortController();
      inflightRef.current = ctrl;

      const url =
        "https://photon.komoot.io/api/?" +
        new URLSearchParams({ q: trimmed, limit: "5" }).toString();
      fetch(url, { signal: ctrl.signal })
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { features?: PhotonFeature[] } | null) => {
          if (ctrl.signal.aborted) return;
          setSuggestions(data?.features ?? []);
          setLoading(false);
        })
        .catch(() => {
          if (!ctrl.signal.aborted) setLoading(false);
        });
    }, 350);
    return () => window.clearTimeout(t);
  }, [value]);

  // Close the dropdown on outside click + Escape.
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function handlePick(feat: PhotonFeature) {
    const pick = featureToPick(feat);
    onSelectSuggestion(pick);
    setOpen(false);
  }

  return (
    <div ref={wrapRef} className="relative">
      <input
        type="text"
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        aria-label="Place name"
        aria-autocomplete="list"
        // aria-expanded only applies to combobox role; left off the
        // plain text input to silence the a11y linter.
        className="w-full min-h-[44px] rounded-lg border border-parchment/15 bg-ink/40 px-3 py-2 text-base text-parchment placeholder-parchment/30 outline-none transition focus:border-gold/60 focus:bg-ink/60 focus:ring-2 focus:ring-gold/30"
      />

      <AnimatePresence>
        {open && (suggestions.length > 0 || loading) ? (
          <motion.ul
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            role="listbox"
            aria-label="Place suggestions"
            className="absolute left-0 right-0 top-12 z-30 max-h-72 overflow-auto rounded-xl border border-gold/30 bg-ink/95 p-1.5 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.7)] backdrop-blur"
          >
            {loading && suggestions.length === 0 ? (
              <li className="px-3 py-2 text-[11px] uppercase tracking-[0.2em] text-parchment/40">
                Searching…
              </li>
            ) : null}
            {suggestions.map((feat, i) => {
              const pick = featureToPick(feat);
              return (
                <li
                  key={`${pick.lat}-${pick.lng}-${i}`}
                  role="option"
                  aria-selected={false}
                >
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handlePick(feat)}
                    className="flex w-full flex-col gap-0.5 rounded-lg px-3 py-2 text-left transition hover:bg-parchment/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
                  >
                    <span className="font-display text-sm text-parchment">
                      {pick.place}
                    </span>
                    {pick.address ? (
                      <span className="truncate text-[11px] text-parchment/55">
                        {pick.address}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </motion.ul>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/**
 * Project a Photon feature into the structured shape the rest of the
 * app uses. We split into a short "place" line (best human name) and
 * a longer "address" suffix (street, city, country) so the lobby
 * card can show both on two lines.
 */
function featureToPick(feat: PhotonFeature): PlacePick {
  const props = feat.properties;
  const place =
    props.name ||
    [props.housenumber, props.street].filter(Boolean).join(" ") ||
    props.city ||
    "Unnamed place";

  const addressParts = [
    // Only include street if it wasn't already the place name.
    props.name && [props.housenumber, props.street].filter(Boolean).join(" "),
    props.city,
    props.state,
    props.country,
  ].filter((s): s is string => Boolean(s && s.length));
  const address = addressParts.join(", ");

  const [lng, lat] = feat.geometry.coordinates;
  return { place, address, lat, lng };
}
