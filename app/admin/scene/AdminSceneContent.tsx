"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TavernScene } from "@/components/scene/TavernScene";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import {
  DEFAULT_SCENE_STYLE,
  clearSceneStyle,
  encodeSceneStyle,
  loadSceneStyle,
  saveSceneStyle,
} from "@/lib/sceneStyle";
import type { ScenePhase, SceneStyle } from "@/types/sceneStyle";

const PHASE_OPTIONS: { value: ScenePhase; label: string; blurb: string }[] = [
  { value: "auto", label: "Auto", blurb: "Match the recipient's local clock." },
  { value: "night", label: "Night", blurb: "Dim, ember-driven." },
  { value: "dawn", label: "Dawn", blurb: "Warm low sun, cool sky." },
  { value: "day", label: "Day", blurb: "Bright sun-driven look." },
  { value: "dusk", label: "Dusk", blurb: "Golden hour cozy." },
];

/**
 * Admin editor for the 3D scene's visual style. Senders open this
 * page, tweak knobs, hit Save — the resulting `SceneStyle` is
 * persisted to localStorage and baked into every future invite link
 * they generate as a `?style=…` URL param.
 *
 * Layout: controls on the left, a live `<TavernScene>` preview on the
 * right that mounts with the in-progress `draft` style so tweaks
 * show up immediately without needing to Save first.
 *
 * Save vs. draft: we keep two pieces of state. `draft` is the
 * in-progress edit (what the preview shows). `savedAt` is the
 * timestamp of the last successful localStorage write — used to show
 * a brief "Saved 🤍" confirmation. The store-of-record stays the
 * localStorage value; the page only ever writes to it on Save.
 */
export function AdminSceneContent() {
  // Until mount we render the defaults so SSR + first paint match.
  // After mount we read localStorage; a re-render then snaps to the
  // sender's saved style (or stays on defaults if nothing was saved).
  const [draft, setDraft] = useState<SceneStyle>(DEFAULT_SCENE_STYLE);
  const [mounted, setMounted] = useState(false);
  // Pulse a brief confirmation chip after Save / Reset. Using a
  // counter + timeout instead of comparing Date.now() in render —
  // calling Date.now() during render is impure (lint catches it).
  const [savedTick, setSavedTick] = useState(0);
  const [savedVisible, setSavedVisible] = useState(false);
  useEffect(() => {
    if (savedTick === 0) return;
    queueMicrotask(() => setSavedVisible(true));
    const t = window.setTimeout(() => setSavedVisible(false), 2400);
    return () => window.clearTimeout(t);
  }, [savedTick]);

  useEffect(() => {
    // queueMicrotask wrapper for the no-sync-setState lint rule.
    queueMicrotask(() => {
      const loaded = loadSceneStyle();
      if (loaded) setDraft(loaded);
      setMounted(true);
    });
  }, []);

  function patch(next: Partial<SceneStyle>) {
    setDraft((prev) => ({ ...prev, ...next }));
  }

  function patchStop(index: 0 | 1 | 2, value: number) {
    const stops = [...draft.toonStops] as [number, number, number];
    stops[index] = value;
    // Enforce ascending order in-place so a slider can never drag a
    // shadow stop past the midtone (which would invert the bands).
    if (index === 0 && stops[0] > stops[1]) stops[0] = stops[1];
    if (index === 1) {
      if (stops[1] < stops[0]) stops[1] = stops[0];
      if (stops[1] > stops[2]) stops[1] = stops[2];
    }
    if (index === 2 && stops[2] < stops[1]) stops[2] = stops[1];
    patch({ toonStops: stops });
  }

  function handleSave() {
    saveSceneStyle(draft);
    setSavedTick((n) => n + 1);
  }

  function handleReset() {
    setDraft(DEFAULT_SCENE_STYLE);
    clearSceneStyle();
    setSavedTick((n) => n + 1);
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 flex items-center justify-between gap-4">
        <Link
          href="/"
          className="font-display text-xs uppercase tracking-[0.32em] text-parchment/60 hover:text-parchment"
        >
          ← QuestBoard
        </Link>
        <span className="font-display text-[10px] uppercase tracking-[0.3em] text-gold/70">
          Scene Style · Admin
        </span>
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        {/* CONTROLS */}
        <section className="flex flex-col gap-5">
          <div className="rounded-2xl border border-parchment/10 bg-ink/25 p-5">
            <h2 className="font-display text-sm uppercase tracking-[0.28em] text-gold/80">
              Toon shading bands
            </h2>
            <p className="mt-1 text-[11px] text-parchment/55">
              Brightness of each cel-shading band, 0 (dark) to 1 (bright). Must be ascending.
            </p>
            <div className="mt-4 flex flex-col gap-4">
              <Slider
                label="Shadow"
                value={draft.toonStops[0]}
                min={0}
                max={1}
                step={0.01}
                onChange={(v) => patchStop(0, v)}
              />
              <Slider
                label="Midtone"
                value={draft.toonStops[1]}
                min={0}
                max={1}
                step={0.01}
                onChange={(v) => patchStop(1, v)}
              />
              <Slider
                label="Highlight"
                value={draft.toonStops[2]}
                min={0}
                max={1}
                step={0.01}
                onChange={(v) => patchStop(2, v)}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-parchment/10 bg-ink/25 p-5">
            <h2 className="font-display text-sm uppercase tracking-[0.28em] text-gold/80">
              Outline
            </h2>
            <p className="mt-1 text-[11px] text-parchment/55">
              Dark contour band around the board. Set thickness to 0 to disable.
            </p>
            <div className="mt-4 flex flex-col gap-4">
              <Slider
                label="Thickness"
                value={draft.outlineThickness}
                min={0}
                max={0.06}
                step={0.001}
                format={(v) => v.toFixed(3)}
                onChange={(v) => patch({ outlineThickness: v })}
              />
              <Field label="Outline color">
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={draft.outlineColor}
                    onChange={(e) => patch({ outlineColor: e.target.value })}
                    className="h-10 w-14 cursor-pointer rounded border border-parchment/20 bg-ink/40"
                    aria-label="Outline color"
                  />
                  <code className="font-mono text-xs text-parchment/70">
                    {draft.outlineColor}
                  </code>
                </div>
              </Field>
            </div>
          </div>

          <div className="rounded-2xl border border-parchment/10 bg-ink/25 p-5">
            <h2 className="font-display text-sm uppercase tracking-[0.28em] text-gold/80">
              Time of day
            </h2>
            <p className="mt-1 text-[11px] text-parchment/55">
              Override the auto-detected mood. &quot;Auto&quot; uses the recipient&apos;s
              local hour.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {PHASE_OPTIONS.map((opt) => {
                const active = draft.phase === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => patch({ phase: opt.value })}
                    aria-pressed={active}
                    title={opt.blurb}
                    className={
                      "rounded-full px-3 py-1.5 font-display text-[11px] uppercase tracking-[0.18em] transition " +
                      (active
                        ? "bg-gold text-ink ring-1 ring-gold-soft"
                        : "bg-ink/40 text-parchment/75 ring-1 ring-parchment/15 hover:bg-ink/60 hover:text-parchment")
                    }
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ACTIONS */}
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={handleSave} variant="primary">
              Save
            </Button>
            <Button onClick={handleReset} variant="ghost">
              Reset to defaults
            </Button>
            {savedVisible ? (
              <span
                className="font-display text-[10px] uppercase tracking-[0.22em] text-gold/80"
                role="status"
              >
                Saved <span aria-hidden>🤍</span>
              </span>
            ) : null}
          </div>

          {/* SHARE URL — shows the encoded query so the user can
              attach the same style to any link manually if desired. */}
          <SharePreview style={draft} mounted={mounted} />
        </section>

        {/* LIVE PREVIEW — TavernScene mounted with the draft style.
            The Canvas needs an explicit height since it's
            position-relative here rather than the absolute-inset
            placement on /invite. */}
        <section className="relative h-[60vh] min-h-[420px] overflow-hidden rounded-2xl border border-parchment/10 bg-ink/30 lg:h-auto">
          <TavernScene
            className="absolute inset-0"
            questCount={3}
            controlsEnabled
            style={draft}
          />
          <span className="pointer-events-none absolute left-3 top-3 z-10 rounded-full bg-ink/70 px-3 py-1 font-display text-[9px] uppercase tracking-[0.28em] text-gold/80 backdrop-blur">
            Live preview
          </span>
        </section>
      </div>
    </main>
  );
}

/**
 * Shows the compact `?style=…` param the current draft produces. If
 * the draft matches defaults the encoder returns null and we surface
 * a helpful "nothing custom" message instead of an empty param.
 */
function SharePreview({
  style,
  mounted,
}: {
  style: SceneStyle;
  mounted: boolean;
}) {
  const [copied, setCopied] = useState(false);
  if (!mounted) return null;

  const param = encodeSceneStyle(style);

  async function handleCopy() {
    if (!param) return;
    try {
      await navigator.clipboard.writeText(`?style=${param}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* silently ignore — clipboard may not be available */
    }
  }

  return (
    <div className="rounded-2xl border border-parchment/10 bg-ink/25 p-4">
      <h3 className="font-display text-[10px] uppercase tracking-[0.28em] text-gold/75">
        URL param
      </h3>
      {param ? (
        <>
          <p className="mt-1 text-[11px] text-parchment/55">
            This rides on every link you generate from /create. Saved
            settings apply automatically — this is the literal param if
            you ever need to attach it by hand.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="block flex-1 truncate rounded bg-ink/50 px-2 py-1.5 font-mono text-[11px] text-parchment/75">
              ?style={param}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-full bg-gold/15 px-3 py-1 font-display text-[10px] uppercase tracking-[0.18em] text-gold ring-1 ring-gold/40 hover:bg-gold/25"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </>
      ) : (
        <p className="mt-1 text-[11px] text-parchment/55">
          No custom style yet — links will use the built-in tavern look.
        </p>
      )}
    </div>
  );
}

/**
 * Simple labeled range input + numeric readout, styled to match the
 * rest of the form chrome.
 */
function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format = (v) => v.toFixed(2),
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (next: number) => void;
  format?: (v: number) => string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <span className="font-display text-[10px] uppercase tracking-[0.22em] text-parchment/70">
          {label}
        </span>
        <code className="font-mono text-[11px] tabular-nums text-parchment/55">
          {format(value)}
        </code>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-ink/60 accent-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
        aria-label={label}
      />
    </div>
  );
}
