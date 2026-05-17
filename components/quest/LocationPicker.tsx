"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  LeafletMouseEvent,
  Map as LeafletMap,
  Marker as LeafletMarker,
} from "leaflet";
import "leaflet/dist/leaflet.css";

type Coords = { lat: number; lng: number };

type Props = {
  /** Current pin, if the sender has set one. */
  value: { lat?: number; lng?: number };
  /** Fired when the sender drops/drags the pin or uses geolocation. */
  onChange: (coords: Coords) => void;
  /** Fired when the sender removes the pin. */
  onClear: () => void;
};

/**
 * Map pin picker for the location note.
 *
 * Leaflet touches `window` at import time, so we never import it at
 * module scope — it's pulled in with a dynamic `import()` inside an
 * effect, which only runs in the browser. We drive Leaflet
 * imperatively (no react-leaflet) to avoid another dependency with
 * React 19 peer-range risk, and to keep full control of the parchment
 * styling.
 *
 * The default marker image is replaced with a themed SVG divIcon — the
 * stock PNG markers break under bundlers (their URLs resolve relative
 * to the CSS), and a custom pin matches the app anyway.
 *
 * No reverse geocoding: coordinates feed the Maps link and let the pin
 * restore; the place/address text stays the sender's to type. That
 * keeps everything backend-free and avoids a third-party geocoder.
 */
export function LocationPicker({ value, onChange, onClear }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  // Latest onChange without forcing the init effect to re-run.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const [geoState, setGeoState] = useState<"idle" | "locating" | "denied" | "unavailable">(
    "idle",
  );

  const hasPin =
    typeof value.lat === "number" && typeof value.lng === "number";

  // Add or move the draggable pin. Stable (only touches refs), so it's
  // safe in the effects' dependency lists.
  const placeMarker = useCallback(
    (
      L: typeof import("leaflet"),
      map: LeafletMap,
      lat: number,
      lng: number,
    ) => {
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
        return;
      }
      const icon = L.divIcon({
        className: "",
        html: PIN_SVG,
        iconSize: [28, 28],
        iconAnchor: [14, 26],
      });
      const marker = L.marker([lat, lng], { draggable: true, icon }).addTo(
        map,
      );
      marker.on("dragend", () => {
        const p = marker.getLatLng();
        onChangeRef.current({ lat: p.lat, lng: p.lng });
      });
      markerRef.current = marker;
    },
    [],
  );

  // One-time map init. Leaflet is loaded lazily here.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const L = await import("leaflet");
      if (cancelled || !containerRef.current || mapRef.current) return;

      const start: Coords = hasPin
        ? { lat: value.lat as number, lng: value.lng as number }
        : { lat: 20, lng: 0 };

      const map = L.map(containerRef.current, {
        center: [start.lat, start.lng],
        zoom: hasPin ? 15 : 2,
        zoomControl: true,
        attributionControl: true,
      });
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);

      if (hasPin) {
        placeMarker(L, map, start.lat, start.lng);
      }

      map.on("click", (e: LeafletMouseEvent) => {
        const L2 = L;
        placeMarker(L2, map, e.latlng.lat, e.latlng.lng);
        onChangeRef.current({ lat: e.latlng.lat, lng: e.latlng.lng });
      });
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // Init once; external value changes are handled by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the marker in sync if the pin is changed/cleared from outside
  // (e.g. toggling the note variant restores a stashed location).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    let cancelled = false;
    (async () => {
      const L = await import("leaflet");
      if (cancelled || !mapRef.current) return;
      if (hasPin) {
        placeMarker(L, map, value.lat as number, value.lng as number);
      } else if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [value.lat, value.lng, hasPin, placeMarker]);

  function useMyLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoState("unavailable");
      return;
    }
    setGeoState("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setGeoState("idle");
        const map = mapRef.current;
        if (map) map.setView([latitude, longitude], 16);
        onChange({ lat: latitude, lng: longitude });
      },
      (err) => {
        setGeoState(
          err.code === err.PERMISSION_DENIED ? "denied" : "unavailable",
        );
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={useMyLocation}
          disabled={geoState === "locating"}
          className="inline-flex items-center gap-1.5 rounded-full border border-parchment/15 bg-ink/40 px-3 py-1.5 font-display text-[10px] uppercase tracking-[0.2em] text-gold transition hover:border-gold/60 hover:bg-ink/60 disabled:opacity-60"
        >
          <span aria-hidden>◎</span>
          {geoState === "locating" ? "Locating…" : "Use my location"}
        </button>
        {hasPin ? (
          <button
            type="button"
            onClick={onClear}
            className="rounded-full px-3 py-1.5 font-display text-[10px] uppercase tracking-[0.2em] text-parchment/55 hover:text-ember"
          >
            Clear pin
          </button>
        ) : (
          <span className="text-[11px] text-parchment/45">
            Tap the map to drop a pin
          </span>
        )}
      </div>

      {geoState === "denied" ? (
        <p className="text-[11px] text-ember" role="alert">
          Location permission was blocked — drop a pin on the map instead.
        </p>
      ) : geoState === "unavailable" ? (
        <p className="text-[11px] text-ember" role="alert">
          Couldn&apos;t get your location — drop a pin on the map instead.
        </p>
      ) : null}

      <div
        ref={containerRef}
        className="h-56 w-full overflow-hidden rounded-lg border border-parchment/15 bg-ink/40"
        // Leaflet panes must sit above nothing in particular here, but
        // keep them below the app's popovers/overlays.
        style={{ zIndex: 0 }}
        aria-label="Map — tap to place the meeting pin"
      />
    </div>
  );
}

/** Themed teardrop pin (ember fill) used for the draggable marker. */
const PIN_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28"
  fill="#d96b34" stroke="#2a1709" stroke-width="1.4" stroke-linejoin="round"
  style="filter: drop-shadow(0 2px 3px rgba(0,0,0,0.5));">
  <path d="M12 22s-7-6-7-12a7 7 0 0 1 14 0c0 6-7 12-7 12Z"/>
  <circle cx="12" cy="10" r="2.6" fill="#2a1709" stroke="none"/>
</svg>`;
