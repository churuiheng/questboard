import Link from "next/link";
import { QuestCard } from "@/components/quest/QuestCard";
import { LandingHero } from "@/components/quest/LandingHero";
import {
  bundleToQuestData,
  makeDefaultQuestBundle,
} from "@/lib/questDefaults";

export default function Home() {
  // The sample card on the landing page is a static projection of the
  // default bundle's first option — keeps the example in sync with the
  // real default users see when they hit /create.
  const defaultBundle = makeDefaultQuestBundle();
  const sample = {
    ...bundleToQuestData(defaultBundle, 0),
    recipientName: "Player Two",
    createdAt: "sample",
  };

  return (
    <main className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col items-center px-4 py-12 sm:py-20">
      {/* Soft ambient glow behind hero */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(217,107,52,0.18),transparent_70%)]"
      />

      <header className="mb-12 flex w-full items-center justify-between">
        <span className="font-display text-sm uppercase tracking-[0.32em] text-gold">
          ✦ QuestBoard
        </span>
        <Link
          href="/create"
          className="font-display text-[10px] uppercase tracking-[0.28em] text-parchment/60 hover:text-parchment"
        >
          Create →
        </Link>
      </header>

      <LandingHero sampleCard={<QuestCard data={sample} />} />

      <footer className="mt-20 w-full border-t border-parchment/10 pt-6 text-center text-xs text-parchment/40">
        Made for playful invitations. Built with Next.js + Three.js.
      </footer>
    </main>
  );
}
