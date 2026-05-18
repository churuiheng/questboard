"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { QuestBundle } from "@/types/quest";
import { encodeQuestBundle } from "@/lib/questCodec";
import { recordSend } from "@/lib/senderHistory";
import { shortenUrl } from "@/lib/shortenUrl";
import { Button } from "@/components/ui/Button";
import { QrCode } from "./QrCode";

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
  // QR is opt-in — not everyone needs it, and it takes vertical space.
  const [qrVisible, setQrVisible] = useState(false);

  // Shortener state: pairs the produced short URL with the encoded
  // bundle it was generated from. When the form changes (encoded
  // updates), the short URL automatically becomes stale and the UI
  // reverts to the long link.
  const [shortFor, setShortFor] = useState<{ encoded: string; url: string } | null>(
    null,
  );
  const [shortenStatus, setShortenStatus] = useState<
    "idle" | "loading" | "error"
  >("idle");
  const [shortenError, setShortenError] = useState<string | null>(null);

  const encoded = useMemo(() => encodeQuestBundle(bundle), [bundle]);
  const link = useMemo(() => buildLink(encoded), [encoded]);
  // Display the short link only if it was generated FROM the current
  // encoded bundle — otherwise the short URL points at a stale draft.
  const displayLink =
    shortFor && shortFor.encoded === encoded ? shortFor.url : link;
  const isCopied = copiedFor === encoded;
  const isShortened = shortFor !== null && shortFor.encoded === encoded;

  /**
   * Record this quest in the sender's local history. Called from both
   * copy and open-as-recipient, since either action indicates the
   * sender treats this draft as "real" and is about to share. recordSend
   * de-dupes by encoded value, so repeated copies of the same link
   * just promote the existing entry to the top.
   */
  function noteShared() {
    recordSend({
      encoded,
      recipientName: bundle.recipientName,
      optionCount: bundle.options.length,
    });
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(displayLink);
      setCopiedFor(encoded);
      noteShared();
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
    noteShared();
    window.open(displayLink, "_blank", "noopener,noreferrer");
  }

  /**
   * Request a short version of the current link via the `/api/shorten`
   * proxy. Loading state guards against double-clicks; errors render
   * inline beside the panel rather than via a toast (less invasive,
   * and the panel already owns a footprint for status text).
   */
  async function handleShorten() {
    if (shortenStatus === "loading") return;
    setShortenStatus("loading");
    setShortenError(null);
    const result = await shortenUrl(link);
    if (result.ok) {
      setShortFor({ encoded, url: result.shortUrl });
      setShortenStatus("idle");
      // Clear any prior "Copied" badge so the user doesn't think the
      // clipboard already holds the new short URL.
      setCopiedFor(null);
    } else {
      setShortenStatus("error");
      setShortenError(result.error);
    }
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
  // some messaging apps that truncate URLs. An image note is inherently
  // heavy (the picture rides inside the link as a data-URL), so we use a
  // looser threshold and different copy for that case — a 1600-char
  // warning on every image link would just be noise.
  const hasImageNote = bundle.options.some(
    (o) => o.note.kind === "image" && o.note.image.length > 0,
  );
  // The visual meter scales to a different "budget" depending on what's
  // in the link. URLs over ~2000 chars start misbehaving on some
  // platforms; image notes blow past that necessarily, so we measure
  // against a larger budget where most chat apps still cope.
  const lengthBudget = hasImageNote ? 26_000 : 2_000;
  const lengthRatio = Math.min(1, encoded.length / lengthBudget);
  const tooLong = lengthRatio > 0.8;

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
            value={displayLink}
            onFocus={(e) => e.currentTarget.select()}
            aria-label="Shareable quest link"
            className="w-full rounded-lg border border-parchment/15 bg-ink/40 px-3 py-2 font-mono text-[11px] text-parchment/80 outline-none focus:border-gold/60 focus:ring-2 focus:ring-gold/30"
          />

          {isShortened ? (
            <p className="text-[11px] text-parchment/55">
              <span className="text-gold/80">Shortened ✓</span> — points to
              the full quest link.
            </p>
          ) : (
            <LengthMeter
              current={encoded.length}
              budget={lengthBudget}
              ratio={lengthRatio}
              hasImageNote={hasImageNote}
            />
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="md" onClick={handleOpen}>
              Open as recipient ↗
            </Button>
            <Button
              variant="ghost"
              size="md"
              onClick={() => setQrVisible((v) => !v)}
              aria-expanded={qrVisible}
            >
              {qrVisible ? "Hide QR" : "Show QR"}
            </Button>
            <Button
              variant="ghost"
              size="md"
              onClick={handleShorten}
              disabled={shortenStatus === "loading" || isShortened}
              aria-live="polite"
            >
              {isShortened
                ? "Shortened ✓"
                : shortenStatus === "loading"
                  ? "Shortening…"
                  : "Shorten ↗"}
            </Button>
            {tooLong && !isShortened ? (
              <span className="text-[11px] text-ember">
                {hasImageNote
                  ? "This link is long because the image travels inside it — try Shorten ↗, or switch to a text/location note."
                  : "This one's a long link — Shorten ↗ should help."}
              </span>
            ) : null}
          </div>

          {/* Shortener error — surfaced inline rather than via a toast
              so it never disappears before the user has read it. */}
          <AnimatePresence>
            {shortenStatus === "error" && shortenError ? (
              <motion.p
                key="shorten-error"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                role="alert"
                className="overflow-hidden text-[11px] text-ember"
              >
                {shortenError}
              </motion.p>
            ) : null}
          </AnimatePresence>

          <AnimatePresence>
            {qrVisible ? (
              <motion.div
                key="qr"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="flex flex-col items-center gap-2 pt-1">
                  {/* QR is built from whatever link the user is sharing.
                      If they've shortened, the QR encodes the short
                      URL — much denser, much easier to scan. */}
                  <QrCode value={displayLink} />
                  <p className="text-center text-[11px] text-parchment/55">
                    Scan with a phone to open the quest.
                  </p>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
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

/**
 * Visual fill meter for the encoded URL length. Three zones:
 *   green   < 60% of budget  — plenty of room
 *   gold   60–80%            — getting long but fine
 *   ember  > 80%             — likely to be truncated by some apps
 *
 * The budget differs for image-note quests (image data is heavy by
 * nature), which is why the parent passes the budget in explicitly.
 * Width animates smoothly so adding/removing options shows a visible
 * change rather than snapping.
 */
function LengthMeter({
  current,
  budget,
  ratio,
  hasImageNote,
}: {
  current: number;
  budget: number;
  ratio: number;
  hasImageNote: boolean;
}) {
  const tone =
    ratio > 0.8 ? "ember" : ratio > 0.6 ? "gold" : "green";
  const barColor =
    tone === "ember"
      ? "bg-ember"
      : tone === "gold"
        ? "bg-gold"
        : "bg-[#6f8c4a]";
  const labelColor =
    tone === "ember"
      ? "text-ember"
      : tone === "gold"
        ? "text-gold/85"
        : "text-parchment/55";

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-[10px] tabular-nums">
        <span className="font-display uppercase tracking-[0.2em] text-parchment/45">
          Link size
        </span>
        <span className={labelColor}>
          {formatBytes(current)} / {formatBytes(budget)}
          {hasImageNote ? " · image" : ""}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={budget}
        aria-valuenow={current}
        aria-label="Link length budget"
        className="h-1.5 w-full overflow-hidden rounded-full bg-ink/60"
      >
        <motion.div
          className={`h-full ${barColor}`}
          initial={false}
          animate={{ width: `${Math.max(2, ratio * 100)}%` }}
          transition={{ type: "spring", stiffness: 220, damping: 28 }}
        />
      </div>
    </div>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n}`;
  return `${(n / 1024).toFixed(1)}k`;
}
