import { Suspense } from "react";
import type { Metadata } from "next";
import InviteScene from "@/components/quest/InviteScene";
import { decodeQuestBundle } from "@/lib/questCodec";
import { bundleToQuestData } from "@/lib/questDefaults";
import { difficultyOptions } from "@/lib/questDefaults";

type SearchParams = Promise<{ q?: string }>;

/**
 * Dynamic metadata so link unfurlers (iMessage, Slack, WhatsApp, Twitter)
 * show the actual quest title and recipient, with a custom OG image
 * rendered by /og?q=...
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const { q } = await searchParams;
  const bundle = q ? decodeQuestBundle(q) : null;

  if (!bundle) {
    return {
      title: "Quest Invite",
      description: "Open this link to see your quest.",
      openGraph: {
        title: "Quest Invite",
        description: "Open this link to see your quest.",
        images: ["/og"],
      },
      twitter: {
        card: "summary_large_image",
        title: "Quest Invite",
        description: "Open this link to see your quest.",
        images: ["/og"],
      },
    };
  }

  const first = bundleToQuestData(bundle, 0);
  const recipient = bundle.recipientName.trim() || "you";
  const sender = bundle.senderName.trim() || "a friend";
  const difficultyLabel =
    difficultyOptions.find((d) => d.value === bundle.difficulty)?.label ?? "";

  const titleLine = `${first.title}${
    bundle.options.length > 1 ? ` (+ ${bundle.options.length - 1} more)` : ""
  }`;
  const description = `${recipient}, ${sender} has summoned you to ${first.activity} — ${bundle.dateTimeText}. ${
    difficultyLabel ? `Difficulty: ${difficultyLabel}.` : ""
  }`.trim();

  const ogImageUrl = `/og?q=${encodeURIComponent(q ?? "")}`;

  return {
    title: `${titleLine} — Quest Invite`,
    description,
    openGraph: {
      title: titleLine,
      description,
      images: [{ url: ogImageUrl, width: 1200, height: 630 }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: titleLine,
      description,
      images: [ogImageUrl],
    },
  };
}

export default function InvitePage() {
  return (
    <Suspense fallback={<InviteFallback />}>
      <InviteScene />
    </Suspense>
  );
}

function InviteFallback() {
  return (
    <main className="mx-auto flex min-h-[80svh] w-full max-w-md flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      {/* Skeleton card silhouette — same shape + proportions as a real
          QuestCard, but blank and shimmering so the recipient knows
          something is loading rather than that the page is broken. */}
      <div className="w-full max-w-xs rounded-[28px] bg-gradient-to-b from-[#3a2412] via-[#2a1709] to-[#1a0e05] p-3 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.7)] ring-1 ring-black/40">
        <div className="rounded-[22px] bg-gradient-to-b from-gold/30 via-ember/15 to-gold/30 p-[2px]">
          <div className="relative h-[280px] overflow-hidden rounded-[20px] bg-gradient-to-b from-parchment to-parchment-deep">
            {/* Shimmer sweep */}
            <div
              aria-hidden
              className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/35 to-transparent"
            />
            {/* Skeleton bars */}
            <div className="flex h-full flex-col gap-3 p-6">
              <div className="h-3 w-1/3 rounded-full bg-ink/15" />
              <div className="mt-2 h-6 w-3/4 rounded-full bg-ink/20" />
              <div className="h-6 w-1/2 rounded-full bg-ink/20" />
              <div className="mt-4 h-2 w-full rounded-full bg-ink/10" />
              <div className="h-2 w-5/6 rounded-full bg-ink/10" />
              <div className="h-2 w-2/3 rounded-full bg-ink/10" />
            </div>
          </div>
        </div>
      </div>
      <div className="font-display text-[11px] uppercase tracking-[0.3em] text-gold/70">
        Unrolling the parchment…
      </div>
    </main>
  );
}
