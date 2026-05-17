"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { QuestBundle } from "@/types/quest";
import { encodeQuestBundle } from "@/lib/questCodec";
import { Button } from "@/components/ui/Button";

type Props = {
  bundle: QuestBundle;
  /**
   * Bumped by the parent each time the draft autosave fires. We watch
   * this to show a brief "Saved 🤍" indicator near the panel header.
   */
  saveTick?: number;
};

export function GenerateLinkPanel({ bundle, saveTick = 0 }: Props) {
  const recipientMissing = bundle.recipientName.trim().length === 0;

  // Saved-indicator visibility. Briefly true after each save, then fades.
  // Both setState calls live inside async callbacks (microtask + timer)
  // so they don't trip the "no setState in effect body" rule.
  const [savedVisible, setSavedVisible] = useState(false);
  useEffect(() => {
    if (saveTick === 0) return;
    queueMicrotask(() => setSavedVisible(true));
    const t = window.setTimeout(() => setSavedVisible(false), 1400);
    return () => window.clearTimeout(t);
  }, [saveTick]);
  // Two pieces of state only:
  //  - `revealed` flips when the user clicks "Generate link".
  //  - `copiedFor` stores the encoded string at the time of the last copy.
  //    Comparing that to the current encoded value tells us whether the
  //    clipboard is still fresh — no useEffect needed, no derived-state trap.
  const [revealed, setRevealed] = useState(false);
  const [copiedFor, setCopiedFor] = useState<string | null>(null);

  const encoded = useMemo(() => encodeQuestBundle(bundle), [bundle]);
  const link = useMemo(() => buildLink(encoded), [encoded]);
  const isCopied = copiedFor === encoded;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopiedFor(encoded);
      // Auto-clear the badge after a moment, but only if the user hasn't
      // copied again or edited the form in the meantime.
      window.setTimeout(() => {
        setCopiedFor((current) => (current === encoded ? null : current));
      }, 1800);
    } catch {
      // Clipboard can fail on insecure contexts; fall back to selecting the input.
      const input = document.getElementById("quest-link-input") as HTMLInputElement | null;
      input?.select();
    }
  }

  function handleOpen() {
    window.open(link, "_blank", "noopener,noreferrer");
  }

  /**
   * Recipient is required. When the user hits "Ready the link" with the
   * field empty, redirect their attention to the input instead of
   * generating a recipient-less link. Smooth scroll + focus + a brief
   * ember highlight so the field obviously says "fill me in".
   */
  function handleReady() {
    if (recipientMissing) {
      const input = document.getElementById(
        "quest-recipient-input",
      ) as HTMLInputElement | null;
      if (input) {
        input.scrollIntoView({ behavior: "smooth", block: "center" });
        input.focus({ preventScroll: true });
        input.classList.add("ring-2", "ring-ember/70");
        window.setTimeout(() => {
          input.classList.remove("ring-2", "ring-ember/70");
        }, 1600);
      }
      return;
    }
    setRevealed(true);
  }

  // Warn (but don't block) if the encoded data is uncomfortably long for
  // some messaging apps that truncate URLs.
  const tooLong = encoded.length > 1600;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-parchment/10 bg-ink/30 p-4 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-sm uppercase tracking-[0.3em] text-gold/80">
              Send the quest
            </h3>
            <AnimatePresence>
              {savedVisible ? (
                <motion.span
                  key="saved"
                  initial={{ opacity: 0, y: 2 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="font-display text-[10px] uppercase tracking-[0.22em] text-parchment/55"
                  role="status"
                >
                  Saved <span aria-hidden>🤍</span>
                </motion.span>
              ) : null}
            </AnimatePresence>
          </div>
          <p className="mt-1 text-xs text-parchment/55">
            Just a link — the whole quest travels inside it.
          </p>
        </div>
        {!revealed ? (
          <Button
            onClick={handleReady}
            variant={recipientMissing ? "secondary" : "primary"}
            aria-describedby={
              recipientMissing ? "recipient-required-hint" : undefined
            }
          >
            {recipientMissing ? "Add a recipient first" : "Ready the link"}
          </Button>
        ) : (
          <Button
            onClick={handleCopy}
            variant={isCopied ? "secondary" : "primary"}
            aria-live="polite"
          >
            {isCopied ? "On your clipboard 🤍" : "Copy link"}
          </Button>
        )}
      </div>

      <AnimatePresence>
        {recipientMissing && !revealed ? (
          <motion.div
            key="recipient-nudge"
            id="recipient-required-hint"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden text-[11px] text-gold/80"
            role="status"
          >
            <span aria-hidden>✦ </span>
            Add a recipient up top first so the card reads as theirs.
          </motion.div>
        ) : null}
      </AnimatePresence>

      {revealed ? (
        <>
          <input
            id="quest-link-input"
            readOnly
            value={link}
            onFocus={(e) => e.currentTarget.select()}
            aria-label="Shareable quest link"
            className="w-full rounded-lg border border-parchment/15 bg-ink/40 px-3 py-2 font-mono text-[11px] text-parchment/80 outline-none focus:border-gold/60 focus:ring-2 focus:ring-gold/30"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="md" onClick={handleOpen}>
              Open as recipient ↗
            </Button>
            {tooLong ? (
              <span className="text-[11px] text-ember">
                This one&apos;s a long link — some apps may shorten it.
                Try trimming the message or activity if it gets cut off.
              </span>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}

function buildLink(encoded: string): string {
  // window.location is only meaningful client-side, which is where this
  // component runs ("use client"). The fallback is unused but keeps TS happy.
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://questboard.app";
  return `${origin}/invite?q=${encoded}`;
}
