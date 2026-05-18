"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

/**
 * Renders a quest link as a scannable QR code, themed in the app's
 * parchment + ink palette so it sits naturally inside the share panel
 * instead of looking like a stock library widget.
 *
 * We render to a data-URL PNG (rather than a live SVG/canvas) because
 * QRCode.toDataURL is the simplest cross-browser path and the image is
 * trivially small. The PNG is rebuilt whenever `value` changes — which
 * the parent keys by the encoded bundle, so edits get a fresh QR on
 * autosave.
 *
 * QR error-correction level is "M" (medium) — enough room for ~15% of
 * the modules to be obscured, which lets us tolerate a slightly fuzzy
 * camera angle without compromising data capacity.
 *
 * URL length cap: this component still works on long URLs, but if the
 * payload is over ~2900 chars QR encoding fails because the protocol
 * itself maxes out. The component shows a friendly message in that
 * case rather than throwing.
 */
export function QrCode({
  value,
  size = 168,
}: {
  value: string;
  size?: number;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [tooLong, setTooLong] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // The set calls live inside queueMicrotask to stay clear of React
    // 19's "no setState in effect body" rule — they run in the next
    // microtask, which still happens before paint.
    queueMicrotask(() => {
      if (cancelled) return;
      setTooLong(false);
      setSrc(null);
    });

    QRCode.toDataURL(value, {
      // Margin: a thin quiet zone around the modules. Smaller than the
      // library default (4) so the QR doesn't drown in whitespace
      // inside our compact panel.
      margin: 2,
      width: size * 2, // 2× for crisp rendering on HiDPI screens
      errorCorrectionLevel: "M",
      color: {
        // Parchment ground, ink modules — matches the rest of the app.
        light: "#f3e1bb",
        dark: "#2a1a0c",
      },
    })
      .then((dataUrl) => {
        if (!cancelled) setSrc(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setTooLong(true);
      });

    return () => {
      cancelled = true;
    };
  }, [value, size]);

  if (tooLong) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-parchment/15 bg-ink/40 p-4 text-center text-[11px] text-parchment/55"
        style={{ width: size, height: size }}
      >
        QR too dense — trim the message or use a text note.
      </div>
    );
  }

  if (!src) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-parchment/15 bg-ink/40 text-[10px] uppercase tracking-[0.2em] text-parchment/35"
        style={{ width: size, height: size }}
      >
        Drawing…
      </div>
    );
  }

  return (
    <div
      className="overflow-hidden rounded-lg bg-parchment p-1.5 shadow-[0_8px_18px_-6px_rgba(0,0,0,0.55)] ring-1 ring-black/30"
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="QR code for the quest link — scan to open"
        width={size - 12}
        height={size - 12}
        className="block"
      />
    </div>
  );
}
