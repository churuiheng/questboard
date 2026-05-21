"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { QuestCardOverlay } from "./QuestCardOverlay";
import { KeyboardScrollNav } from "./KeyboardScrollNav";
import { TavernScene, type ScrollScreenAnchor } from "@/components/scene/TavernScene";
import { AmbientStarter } from "@/components/scene/AmbientStarter";
import { MuteToggle } from "@/components/scene/MuteToggle";
import { useSfx } from "@/components/scene/useSfx";
import { decodeQuestBundle } from "@/lib/questCodec";
import { bundleToQuestData } from "@/lib/questDefaults";
import { getBundleId } from "@/lib/localResponse";
import { useKonamiCode } from "@/lib/useKonamiCode";
import type { BundleResponse, QuestBundle } from "@/types/quest";

export default function InviteScene() {
  const searchParams = useSearchParams();
  const inlineEncoded = searchParams.get("q");
  const stashId = searchParams.get("s");

  // Two ways into a quest:
  //   - `?q=<encoded>` — the bundle is right in the URL, decode sync
  //   - `?s=<id>`      — the bundle is stashed on the server, fetch async
  //
  // We prefer the inline form when both are present (no round-trip).
  // The stash flow exists for image-note bundles too big for the
  // free URL shorteners — Shorten ↗ in /create routes those through
  // /api/shorten which calls /api/stash and returns this short form.
  const initialResolved: ResolvedState = inlineEncoded
    ? { kind: "ready", encoded: inlineEncoded }
    : stashId
      ? { kind: "loading" }
      : { kind: "ready", encoded: null };
  const [resolved, setResolved] = useState<ResolvedState>(initialResolved);

  useEffect(() => {
    // Only fetch when we're in stash mode with no inline data.
    if (inlineEncoded || !stashId) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(
          `/api/stash/${encodeURIComponent(stashId)}`,
          { cache: "force-cache" },
        );
        const data = (await res.json().catch(() => ({}))) as {
          encoded?: string;
          error?: string;
        };
        if (cancelled) return;
        if (res.ok && typeof data.encoded === "string") {
          setResolved({ kind: "ready", encoded: data.encoded });
        } else {
          setResolved({
            kind: "error",
            message: data.error || "Couldn't open that quest link.",
          });
        }
      } catch {
        if (!cancelled) {
          setResolved({ kind: "error", message: "Network error opening quest." });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [stashId, inlineEncoded]);

  const bundle: QuestBundle | null = useMemo(() => {
    if (resolved.kind !== "ready" || !resolved.encoded) return null;
    return decodeQuestBundle(resolved.encoded);
  }, [resolved]);

  if (resolved.kind === "loading") {
    return <UnrollingScroll />;
  }
  if (resolved.kind === "error") {
    return <MissingQuest hasParam errorMessage={resolved.message} />;
  }
  if (!bundle) {
    return <MissingQuest hasParam={Boolean(inlineEncoded || stashId)} />;
  }

  return <InviteScreen bundle={bundle} />;
}

/**
 * Tristate for the `?s=` resolve flow:
 *   - "ready"   — we have an encoded string (or know there isn't one)
 *   - "loading" — fetching from /api/stash
 *   - "error"   — fetch failed or returned a malformed payload
 */
type ResolvedState =
  | { kind: "ready"; encoded: string | null }
  | { kind: "loading" }
  | { kind: "error"; message: string };

/**
 * "Unrolling the scroll…" placeholder shown while the stash fetch is
 * in flight. Matches the parchment/ink palette so the page doesn't
 * flash a blank dark screen before the scene mounts.
 */
function UnrollingScroll() {
  return (
    <main className="relative flex min-h-[100svh] w-full items-center justify-center px-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <span className="font-display text-[10px] uppercase tracking-[0.36em] text-gold/70">
          Unrolling the scroll
        </span>
        <span
          aria-hidden
          className="block h-1 w-32 overflow-hidden rounded-full bg-ink/40"
        >
          <motion.span
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
            className="block h-full w-1/3 bg-gold/70"
          />
        </span>
      </div>
    </main>
  );
}

export function InviteScreen({ bundle }: { bundle: QuestBundle }) {
  const bundleId = getBundleId(bundle);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isCardOpen, setIsCardOpen] = useState(false);
  // Response lives in component state only — every fresh page load
  // (refresh, new tab, return-from-history) starts clean. Senders
  // re-share the same link to ask "what do you think?" and a stale
  // "you said yes yesterday" banner would short-circuit the question.
  // We deliberately don't read or write localStorage here. (The old
  // `usePersistedBundleResponse` hook still exists for any future
  // callers that want cross-session persistence.)
  const [response, setResponse] = useState<BundleResponse | null>(null);

  // Sound effects — silent no-op when the file isn't present.
  const playScrollOpen = useSfx("/audio/scroll_open.mp3");
  const playQuestAccepted = useSfx("/audio/quest_accepted.mp3");

  const total = bundle.options.length;
  const hasMultiple = total > 1;
  const activeQuest = useMemo(
    () => bundleToQuestData(bundle, activeIndex),
    [bundle, activeIndex],
  );

  // Pre-project every option once so the 3D scene can render their text.
  const allQuests = useMemo(
    () => bundle.options.map((_, i) => bundleToQuestData(bundle, i)),
    [bundle],
  );

  // Keyboard shortcuts: Escape closes, ←/→ paginate when card is open.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setIsCardOpen(false);
      if (hasMultiple && isCardOpen) {
        if (e.key === "ArrowRight") setActiveIndex((i) => (i + 1) % total);
        if (e.key === "ArrowLeft")
          setActiveIndex((i) => (i - 1 + total) % total);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hasMultiple, isCardOpen, total]);

  // First-time hint: a pulsing ring around the first scroll and a brief
  // banner explaining what to do. Decays on first hover/click (handled
  // in openAt + setHovered below) or after 6 seconds, whichever comes
  // first. The user only needs to be told once.
  const [firstHintVisible, setFirstHintVisible] = useState(true);
  useEffect(() => {
    if (!firstHintVisible) return;
    const t = window.setTimeout(() => setFirstHintVisible(false), 6000);
    return () => window.clearTimeout(t);
  }, [firstHintVisible]);

  // Shared mutable array: `<ScreenProjector>` inside the Canvas writes
  // each scroll's screen-space pixel position here every frame;
  // `<KeyboardScrollNav>` mirrors those values onto its invisible
  // focusable buttons via a rAF loop. No React state involved, so this
  // tracks the camera without re-rendering anything.
  const screenAnchorsRef = useRef<ScrollScreenAnchor[]>([]);

  // Konami easter egg — ↑↑↓↓←→←→BA flips the scrolls into rainbow mode
  // for 10 seconds. Strictly cosmetic; nothing about the quest changes.
  const [rainbowMode, setRainbowMode] = useState(false);
  const rainbowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useKonamiCode(() => {
    setRainbowMode(true);
    if (rainbowTimer.current) clearTimeout(rainbowTimer.current);
    rainbowTimer.current = setTimeout(() => setRainbowMode(false), 10_000);
  });
  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      if (rainbowTimer.current) clearTimeout(rainbowTimer.current);
    };
  }, []);

  function openAt(index: number) {
    setActiveIndex(index);
    setIsCardOpen(true);
    setFirstHintVisible(false);
    playScrollOpen();
  }

  function accept(optionIndex: number) {
    setResponse({ kind: "accepted", optionIndex });
    playQuestAccepted();
  }

  function reset() {
    setResponse(null);
  }

  const acceptedIndex =
    response?.kind === "accepted" ? response.optionIndex : null;

  return (
    <main className="relative flex min-h-[100svh] w-full flex-col items-center justify-center overflow-hidden">
      <TavernScene
        className="absolute inset-0"
        quests={allQuests}
        onSelectQuest={openAt}
        controlsEnabled={!isCardOpen}
        rainbow={rainbowMode}
        // Only highlight the very first scroll, and only while the
        // first-time hint is live. Any hover or open clears it.
        firstHintIndex={firstHintVisible ? 0 : null}
        onAnyHover={() => setFirstHintVisible(false)}
        screenAnchorsRef={screenAnchorsRef}
      />

      {/* DOM-layer keyboard on-ramp. Tab cycles invisible buttons
          pinned to each scroll via the shared screen-anchor ref;
          Enter / Space opens the card. Hidden while a card is already
          open so Tab doesn't steal focus from the overlay's buttons. */}
      {!isCardOpen ? (
        <KeyboardScrollNav
          count={total}
          quests={allQuests}
          onSelectQuest={openAt}
          onAnyFocus={() => setFirstHintVisible(false)}
          screenAnchorsRef={screenAnchorsRef}
        />
      ) : null}

      {/* Audio — silent no-ops when files are absent. */}
      <AmbientStarter url="/audio/ambient_tavern.mp3" />
      <div className="pointer-events-none absolute right-4 top-4 z-10">
        <MuteToggle />
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-[10%] h-[60%] bg-[radial-gradient(50%_50%_at_50%_30%,rgba(230,179,82,0.18),transparent_70%)]"
      />
      <FloatingEmbers />

      <AnimatePresence>
        {!isCardOpen ? (
          <BoardHint
            bundle={bundle}
            response={response}
            onOpenFirst={() => openAt(0)}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {isCardOpen ? (
          <QuestCardOverlay
            key={`${activeIndex}-${bundleId}`}
            quest={activeQuest}
            index={activeIndex}
            total={total}
            acceptedIndex={acceptedIndex}
            response={response}
            onClose={() => setIsCardOpen(false)}
            onAccept={() => accept(activeIndex)}
            onResetResponse={reset}
            onPrev={
              hasMultiple
                ? () => setActiveIndex((i) => (i - 1 + total) % total)
                : undefined
            }
            onNext={
              hasMultiple
                ? () => setActiveIndex((i) => (i + 1) % total)
                : undefined
            }
          />
        ) : null}
      </AnimatePresence>
    </main>
  );
}

/* ----------------- Hint banner shown when card is closed ----------------- */

function BoardHint({
  bundle,
  response,
  onOpenFirst,
}: {
  bundle: QuestBundle;
  response: BundleResponse | null;
  onOpenFirst: () => void;
}) {
  const total = bundle.options.length;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.35 }}
      className="pointer-events-none absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2"
    >
      <span className="font-display text-[10px] uppercase tracking-[0.32em] text-parchment/60">
        For {bundle.recipientName.trim() || "you"}
      </span>
      <button
        type="button"
        onClick={onOpenFirst}
        className="pointer-events-auto ember-pulse inline-flex items-center gap-2 rounded-full bg-ember/90 px-5 py-2 font-display text-xs uppercase tracking-[0.2em] text-parchment shadow-[0_6px_20px_-4px_rgba(217,107,52,0.6)] hover:bg-ember"
      >
        {total > 1
          ? "Tap a scroll to see the quest"
          : "Tap the parchment to see your quest"}
      </button>
      {total > 1 ? (
        <span className="text-[11px] text-parchment/55">
          {total} quests to pick from
        </span>
      ) : null}
      {response ? (
        <span className="text-[11px] text-gold/80">
          {response.kind === "accepted"
            ? `✓ You said yes to quest ${response.optionIndex + 1}`
            : "Saved for later"}
        </span>
      ) : null}
    </motion.div>
  );
}

function MissingQuest({
  hasParam,
  errorMessage,
}: {
  hasParam: boolean;
  /**
   * Optional override for the body copy — used when the stash flow
   * surfaces a specific reason (404, network, malformed payload).
   * Falls back to the generic "smudged scroll" / "nothing here" copy.
   */
  errorMessage?: string;
}) {
  return (
    <main className="mx-auto flex min-h-[80svh] w-full max-w-md flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="font-display text-6xl text-gold/80" aria-hidden>
        ✦
      </div>
      <h1 className="font-display text-2xl uppercase tracking-[0.2em]">
        {hasParam ? "Hmm — this scroll's a bit smudged" : "Nothing here yet"}
      </h1>
      <p className="text-sm leading-relaxed text-parchment/65">
        {errorMessage
          ? errorMessage
          : hasParam
            ? "The invite link looks like it got snipped along the way. Ask whoever sent it to share a fresh one — links sometimes lose their tail when they're forwarded."
            : "There's no quest at this link — but you can forge your own in about two minutes."}
      </p>
      <Link
        href="/create"
        className="rounded-full bg-ember px-6 py-3 font-display text-xs uppercase tracking-[0.22em] text-parchment shadow-[0_8px_24px_-6px_rgba(217,107,52,0.6)] hover:bg-ember-deep"
      >
        Forge a quest
      </Link>
    </main>
  );
}

/* ----------------- Floating embers ----------------- */

function FloatingEmbers() {
  const embers = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => ({
        id: i,
        left: 8 + ((i * 13) % 84),
        delay: (i % 4) * 0.6,
        duration: 6 + (i % 3) * 1.5,
        size: 4 + (i % 3),
      })),
    [],
  );

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {embers.map((e) => (
        <motion.span
          key={e.id}
          className="absolute rounded-full bg-ember/70 blur-[1px]"
          style={{
            left: `${e.left}%`,
            bottom: "-2%",
            width: e.size,
            height: e.size,
          }}
          initial={{ y: 0, opacity: 0 }}
          animate={{ y: -600, opacity: [0, 0.9, 0] }}
          transition={{
            duration: e.duration,
            delay: e.delay,
            repeat: Infinity,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
}
