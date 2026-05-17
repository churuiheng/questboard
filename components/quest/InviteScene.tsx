"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { QuestCardOverlay } from "./QuestCardOverlay";
import { TavernScene } from "@/components/scene/TavernScene";
import { AmbientStarter } from "@/components/scene/AmbientStarter";
import { MuteToggle } from "@/components/scene/MuteToggle";
import { useSfx } from "@/components/scene/useSfx";
import { decodeQuestBundle } from "@/lib/questCodec";
import { bundleToQuestData } from "@/lib/questDefaults";
import { getBundleId } from "@/lib/localResponse";
import { usePersistedBundleResponse } from "@/lib/usePersistedBundleResponse";
import type { BundleResponse, QuestBundle } from "@/types/quest";

export default function InviteScene() {
  const searchParams = useSearchParams();
  const encoded = searchParams.get("q");

  const bundle: QuestBundle | null = useMemo(() => {
    if (!encoded) return null;
    return decodeQuestBundle(encoded);
  }, [encoded]);

  if (!bundle) {
    return <MissingQuest hasParam={Boolean(encoded)} />;
  }

  return <InviteScreen bundle={bundle} />;
}

function InviteScreen({ bundle }: { bundle: QuestBundle }) {
  const bundleId = getBundleId(bundle);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isCardOpen, setIsCardOpen] = useState(false);
  const [response, setResponse] = usePersistedBundleResponse(bundleId);

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

  function openAt(index: number) {
    setActiveIndex(index);
    setIsCardOpen(true);
    playScrollOpen();
  }

  function accept(optionIndex: number) {
    setResponse({ kind: "accepted", optionIndex });
    playQuestAccepted();
  }

  function deferAll() {
    setResponse({ kind: "maybe_later" });
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
      />

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
            onDefer={deferAll}
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

function MissingQuest({ hasParam }: { hasParam: boolean }) {
  return (
    <main className="mx-auto flex min-h-[80svh] w-full max-w-md flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="font-display text-6xl text-gold/80" aria-hidden>
        ✦
      </div>
      <h1 className="font-display text-2xl uppercase tracking-[0.2em]">
        {hasParam ? "Hmm — this scroll's a bit smudged" : "Nothing here yet"}
      </h1>
      <p className="text-sm leading-relaxed text-parchment/65">
        {hasParam
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
