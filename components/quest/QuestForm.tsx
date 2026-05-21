"use client";

import { useId, useState } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import type {
  QuestBundle,
  QuestEnding,
  QuestEndingLocation,
  QuestNote,
  QuestOption,
} from "@/types/quest";
import {
  MAX_OPTIONS,
  acceptanceCheers,
  activityPresets,
  fieldLimits,
  makeDefaultQuestOption,
  messageTemplates,
  rewardPresets,
} from "@/lib/questDefaults";
import {
  describeImageNoteError,
  fileToImageNoteDataUrl,
  isImageNoteError,
} from "@/lib/imageNote";
import { Field, TextArea, TextInput } from "@/components/ui/Field";
import { CalendarDropdown } from "@/components/quest/CalendarDropdown";
import { VibeDropdown } from "@/components/quest/VibeDropdown";
import { RecipientDropdown } from "@/components/quest/RecipientDropdown";
import { PlaceAutocomplete } from "@/components/quest/PlaceAutocomplete";

// Leaflet touches `window` and ships its own CSS — load it only when the
// Location note variant is actually used, and never on the server.
const LocationPicker = dynamic(
  () => import("./LocationPicker").then((m) => m.LocationPicker),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-56 w-full items-center justify-center rounded-lg border border-parchment/15 bg-ink/40 text-[11px] text-parchment/45">
        Loading map…
      </div>
    ),
  },
);

type Props = {
  value: QuestBundle;
  onChange: (next: QuestBundle) => void;
};

/**
 * Bundle editor. The only fields shared across the whole bundle are
 * recipient + sender + theme. Every other piece — title, activity,
 * when, reward, message, difficulty — lives on each option, so a
 * sender can offer "Cozy ramen Friday" alongside "Legendary hike
 * Saturday" with totally different vibes per scroll.
 *
 * Layout per option (top → bottom):
 *   1. Title         — plain text input
 *   2. Vibe          — dropdown (compact, sits high so users pick a
 *                      tone before describing the quest)
 *   3. The quest     — text input + ↻ randomize square
 *   4. When          — text input + calendar dropdown (preset chips
 *                      + native datetime live inside the popover)
 *   5. Reward        — text input + ↻ randomize square
 *   6. Message       — textarea + ↻ randomize square
 */
export function QuestForm({ value, onChange }: Props) {
  function patchBundle(next: Partial<QuestBundle>) {
    onChange({ ...value, ...next });
  }

  function patchOption(index: number, partial: Partial<QuestOption>) {
    const nextOptions = value.options.map((opt, i) =>
      i === index ? { ...opt, ...partial } : opt,
    );
    onChange({ ...value, options: nextOptions });
  }

  function addOption() {
    if (value.options.length >= MAX_OPTIONS) return;
    onChange({
      ...value,
      options: [...value.options, makeDefaultQuestOption()],
    });
  }

  function removeOption(index: number) {
    if (value.options.length <= 1) return;
    onChange({
      ...value,
      options: value.options.filter((_, i) => i !== index),
    });
  }

  const ending = value.ending ?? { message: "", image: "" };

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => e.preventDefault()}
    >
      {/* WHO — styled dropdown matching VibeDropdown's popover, with
          a "Custom name…" escape hatch that reveals a text input. */}
      <SectionCard
        label="Who is this quest for?"
        hint={
          value.recipientName.trim().length === 0 ? "Needed" : undefined
        }
      >
        <RecipientDropdown
          value={value.recipientName}
          onChange={(name) => patchBundle({ recipientName: name })}
        />
      </SectionCard>

      {/* QUEST OPTIONS — each is a self-contained mini-editor. Short
          fields sit two-up on a grid so the whole form stays compact
          instead of one long scroll; full-width rows (the quest line,
          the note editor) span both columns. */}
      <SectionCard
        label={
          value.options.length === 1
            ? "The quest"
            : `Quest options · ${value.options.length}`
        }
      >
        <div className="flex flex-col gap-3">
          <AnimatePresence initial={false}>
            {value.options.map((option, index) => (
              <motion.div
                key={index}
                layout
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-3 rounded-xl border border-parchment/10 bg-ink/20 p-3.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-display text-[10px] uppercase tracking-[0.22em] text-gold/70">
                    {value.options.length > 1
                      ? `Quest ${index + 1}`
                      : "Quest details"}
                  </span>
                  {value.options.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeOption(index)}
                      className="text-xs text-parchment/45 hover:text-ember"
                      aria-label={`Remove quest ${index + 1}`}
                    >
                      Remove
                    </button>
                  ) : null}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {/* TITLE */}
                  <Field label="Title">
                    <TextInput
                      value={option.title}
                      maxLength={fieldLimits.title}
                      placeholder="The Great Ramen Expedition"
                      onChange={(e) =>
                        patchOption(index, { title: e.target.value })
                      }
                    />
                  </Field>

                  {/* VIBE (difficulty) — custom popover matching the
                      CalendarDropdown's parchment/ink/gold look. */}
                  <Field label="Vibe">
                    <VibeDropdown
                      value={option.difficulty}
                      onChange={(next) =>
                        patchOption(index, { difficulty: next })
                      }
                    />
                  </Field>

                  {/* ACTIVITY — full width, input + randomize square */}
                  <div className="sm:col-span-2">
                    <Field label="The quest">
                      <InputWithAction>
                        <TextInput
                          value={option.activity}
                          maxLength={fieldLimits.activity}
                          placeholder="Ramen dinner at the cozy spot downtown"
                          onChange={(e) =>
                            patchOption(index, { activity: e.target.value })
                          }
                        />
                        <RandomizeButton
                          label="Randomize the quest"
                          onClick={() => {
                            const preset = pickRandom(
                              activityPresets,
                              option.activity,
                            );
                            patchOption(index, { activity: preset.activity });
                          }}
                        />
                      </InputWithAction>
                    </Field>
                  </div>

                  {/* WHEN — input + calendar dropdown */}
                  <Field label="When">
                    <InputWithAction>
                      <TextInput
                        value={option.dateTimeText}
                        maxLength={fieldLimits.dateTimeText}
                        placeholder="Friday night around 7"
                        onChange={(e) =>
                          patchOption(index, {
                            dateTimeText: e.target.value,
                          })
                        }
                      />
                      <CalendarDropdown
                        value={option.dateTimeText}
                        onPick={(formatted) =>
                          patchOption(index, { dateTimeText: formatted })
                        }
                      />
                    </InputWithAction>
                  </Field>

                  {/* REWARD — input + randomize square */}
                  <Field label="Reward">
                    <InputWithAction>
                      <TextInput
                        value={option.reward}
                        maxLength={fieldLimits.reward}
                        placeholder="+50 Happiness · The best night out"
                        onChange={(e) =>
                          patchOption(index, { reward: e.target.value })
                        }
                      />
                      <RandomizeButton
                        label="Randomize the reward"
                        onClick={() => {
                          const next = pickRandomString(
                            rewardPresets,
                            option.reward,
                          );
                          patchOption(index, { reward: next });
                        }}
                      />
                    </InputWithAction>
                  </Field>

                  {/* NOTE — full width, text/image/location variant */}
                  <div className="sm:col-span-2">
                    <Field label="Note">
                      <NoteEditor
                        note={option.note}
                        onChange={(note) => patchOption(index, { note })}
                      />
                    </Field>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {value.options.length < MAX_OPTIONS ? (
            <motion.button
              type="button"
              onClick={addOption}
              whileHover={{ y: -2, scale: 1.02 }}
              whileTap={{ scale: 0.97, y: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 20 }}
              className="group inline-flex min-h-[40px] items-center gap-2 self-start rounded-full border border-dashed border-gold/40 px-4 py-2 font-display text-xs uppercase tracking-[0.2em] text-gold/80 hover:border-gold hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
            >
              <span
                aria-hidden
                className="text-sm leading-none transition-transform duration-200 group-hover:rotate-90"
              >
                +
              </span>
              Add another option
            </motion.button>
          ) : (
            <p className="text-[11px] text-parchment/45">
              Three is the limit — keeps the link friendly to share.
            </p>
          )}
        </div>
      </SectionCard>

      {/* ENDING — the customizable post-accept celebration. */}
      <SectionCard label="The ending — what they see on accept">
        <EndingEditor
          value={ending}
          onChange={(next) => patchBundle({ ending: next })}
        />
      </SectionCard>

    </form>
  );
}

/* ------------------------------------------------------------ helpers */

/**
 * Pick a random item from `presets` that isn't the current selection,
 * so consecutive clicks of the randomize button always actually change
 * the value (instead of occasionally re-picking the same one).
 */
function pickRandom<T extends { activity: string }>(presets: T[], current: string): T {
  if (presets.length <= 1) return presets[0];
  const others = presets.filter((p) => p.activity !== current);
  return others[Math.floor(Math.random() * others.length)];
}

function pickRandomString(presets: string[], current: string): string {
  if (presets.length <= 1) return presets[0];
  const others = presets.filter((p) => p !== current);
  return others[Math.floor(Math.random() * others.length)];
}

/* ------------------------------------------------------------ note editor */

/**
 * Editor for one option's note. Variants behind a segmented toggle:
 *
 *   - Text     — the original textarea + randomize button.
 *   - Image    — a file picker that compresses the chosen image to a
 *                data-URL (lib/imageNote.ts) so it fits in the share
 *                URL, plus an optional caption.
 *   - Location — place name + optional address; a Maps link is built
 *                at render time (lib/location.ts).
 *
 * Toggling between variants doesn't discard the others' content — each
 * side being left is stashed in a ref so flipping back restores it.
 */
/**
 * Per-option note editor — text only now. Image and location moved
 * to the bundle-level Ending section so the recipient unlocks them
 * by accepting, which makes acceptance feel like the moment that
 * reveals "where + visual." Old shared links with image/location
 * notes still decode (the centerpiece in QuestCard handles them as
 * a fallback), but the form only creates text notes going forward.
 */
function NoteEditor({
  note,
  onChange,
}: {
  note: QuestNote;
  onChange: (next: QuestNote) => void;
}) {
  // We always present a text editor regardless of the underlying
  // note kind. For legacy bundles where the note happens to be
  // image/location, editing here resets it to text — that's the
  // intentional migration path.
  const currentText = note.kind === "text" ? note.text : "";

  return (
    <InputWithAction align="start">
      <div className="relative w-full">
        <TextArea
          value={currentText}
          maxLength={fieldLimits.message}
          placeholder="Write a short note for the recipient…"
          onChange={(e) => onChange({ kind: "text", text: e.target.value })}
        />
        <CharCounter current={currentText.length} max={fieldLimits.message} />
      </div>
      <RandomizeButton
        label="Randomize the message"
        onClick={() => {
          const next = pickRandomString(
            messageTemplates.map((t) => t.text),
            currentText,
          );
          onChange({ kind: "text", text: next });
        }}
      />
    </InputWithAction>
  );
}

/* ------------------------------------------------------------ ending editor */

/**
 * Bundle-level editor for the post-accept reveal: the celebration
 * line, an optional image, and an optional meeting place.
 *
 * Layout: a generous vertical stack with `gap-5` between zones. Each
 * zone has its own eyebrow label and reads as a distinct beat. The
 * old static "EndingPreview" mini-card to the right was removed once
 * the live preview card became flippable — the sender taps the
 * preview to see the real lobby surface instead.
 *
 *   ── Message ────────  textarea + ↻ randomize
 *   ── Celebration ────  collapsible image picker
 *   ── Meeting place ──  Photon autocomplete + map pin
 */
function EndingEditor({
  value,
  onChange,
}: {
  value: QuestEnding;
  onChange: (next: QuestEnding) => void;
}) {
  // The little static "Quest Accepted" mini-card that used to live to
  // the right of these fields was removed once the live preview card
  // became flippable — the sender can now tap the preview to see the
  // real, full-fidelity lobby card with their actual message + image
  // + location applied. One source of truth, no risk of the chip
  // drifting from the real surface.
  return (
    <div className="flex flex-col gap-5">
      <EndingMessageField value={value} onChange={onChange} />
      <EndingImageField value={value} onChange={onChange} />
      <EndingLocationEditor
        value={value.location ?? { place: "", address: "" }}
        onChange={(next) => onChange({ ...value, location: next })}
      />
    </div>
  );
}

/**
 * The message zone. Always prefilled (via makeDefaultEnding's
 * DEFAULT_ENDING_MESSAGE), with a ↻ randomize button that picks from
 * the same `acceptanceCheers` pool the wax-seal moment uses at render
 * time — so the prefill and the randomize button feel like part of
 * the same vocabulary.
 */
function EndingMessageField({
  value,
  onChange,
}: {
  value: QuestEnding;
  onChange: (next: QuestEnding) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="font-display text-[10px] uppercase tracking-[0.22em] text-gold/70">
        Their celebration line
      </span>
      <InputWithAction align="start">
        <div className="relative w-full">
          <TextArea
            value={value.message}
            maxLength={fieldLimits.endingMessage}
            placeholder="What they see the moment they accept…"
            onChange={(e) => onChange({ ...value, message: e.target.value })}
          />
          <CharCounter
            current={value.message.length}
            max={fieldLimits.endingMessage}
          />
        </div>
        <RandomizeButton
          label="Randomize the celebration line"
          onClick={() => {
            const next = pickRandomString(acceptanceCheers, value.message);
            onChange({ ...value, message: next });
          }}
        />
      </InputWithAction>
    </div>
  );
}

/**
 * The celebration image zone. Compact at rest (a single CTA button
 * matching the form's other affordances), then expands into a preview
 * + Replace / Remove controls once an image is loaded.
 */
function EndingImageField({
  value,
  onChange,
}: {
  value: QuestEnding;
  onChange: (next: QuestEnding) => void;
}) {
  const inputId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const dataUrl = await fileToImageNoteDataUrl(file);
      onChange({ ...value, image: dataUrl });
    } catch (err) {
      setError(
        isImageNoteError(err)
          ? describeImageNoteError(err)
          : "Couldn't process that image.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="font-display text-[10px] uppercase tracking-[0.22em] text-gold/70">
        Celebration image (optional)
      </span>

      {value.image ? (
        <div className="relative overflow-hidden rounded-lg border border-parchment/15 bg-ink/40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value.image}
            alt="Your celebration image"
            className="max-h-40 w-full object-contain"
          />
          <div className="absolute right-2 top-2 flex gap-1.5">
            <label
              htmlFor={inputId}
              className="cursor-pointer rounded-full bg-ink/80 px-3 py-1 font-display text-[10px] uppercase tracking-[0.2em] text-parchment ring-1 ring-parchment/20 hover:bg-ember"
            >
              {busy ? "Shrinking…" : "Replace"}
            </label>
            <button
              type="button"
              onClick={() => onChange({ ...value, image: "" })}
              className="rounded-full bg-ink/80 px-3 py-1 font-display text-[10px] uppercase tracking-[0.2em] text-parchment ring-1 ring-parchment/20 hover:bg-ember"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          className="flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-parchment/25 bg-ink/30 px-4 py-2 text-center transition hover:border-gold/50"
        >
          <span className="font-display text-[10px] uppercase tracking-[0.22em] text-gold/80">
            {busy ? "Shrinking…" : "Add a celebration image"}
          </span>
        </label>
      )}

      <input
        id={inputId}
        type="file"
        accept="image/*"
        className="sr-only"
        disabled={busy}
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.currentTarget.value = "";
          handleFile(f);
        }}
      />

      {error ? (
        <p className="text-[11px] text-ember" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Meeting-place editor. The old version had two separate text fields
 * (place + address) plus a map. The map alone gives us coords; for
 * the human-readable bits we now use one input — a Photon-backed
 * autocomplete that fills both `place` and `address` from a single
 * suggestion pick. Senders who'd rather just type free-form can do
 * that too; the dropdown stays out of the way.
 *
 * Map shrinks once you've picked something so the form doesn't dwell
 * on it visually after the decision is made.
 */
function EndingLocationEditor({
  value,
  onChange,
}: {
  value: QuestEndingLocation;
  onChange: (next: QuestEndingLocation) => void;
}) {
  const hasPlace = value.place.trim().length > 0;
  return (
    <div className="flex flex-col gap-2">
      <span className="font-display text-[10px] uppercase tracking-[0.22em] text-gold/70">
        Meeting place (optional)
      </span>

      <PlaceAutocomplete
        value={value.place}
        maxLength={fieldLimits.place}
        onChange={(place) => onChange({ ...value, place })}
        onSelectSuggestion={(pick) =>
          onChange({
            place: pick.place,
            address: pick.address,
            lat: pick.lat,
            lng: pick.lng,
          })
        }
      />

      {/* The map stays available for "drop a pin manually" cases but
          is collapsed visually when the user hasn't typed anything,
          so the section breathes when empty. */}
      {hasPlace ? (
        <LocationPicker
          value={{ lat: value.lat, lng: value.lng }}
          onChange={({ lat, lng }) => onChange({ ...value, lat, lng })}
          onClear={() => {
            const { lat: _lat, lng: _lng, ...rest } = value;
            void _lat;
            void _lng;
            onChange(rest);
          }}
        />
      ) : null}

      <p className="text-[11px] text-parchment/45">
        {value.lat !== undefined
          ? "Pinned ✓ — the recipient gets an exact \"Open in Maps\" link after they accept."
          : "Pick from the dropdown for the most accurate pin. Revealed after Accept."}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------ atoms */

function SectionCard({
  label,
  hint,
  children,
}: {
  label: string;
  /** Optional badge text rendered to the right of the label (e.g. "Needed"). */
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-parchment/10 bg-ink/25 p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-display text-[11px] uppercase tracking-[0.28em] text-gold/75">
          {label}
        </h3>
        {hint ? (
          <span className="rounded-full bg-ember/15 px-2 py-0.5 font-display text-[9px] uppercase tracking-[0.22em] text-ember">
            {hint}
          </span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

/**
 * Layout helper for "input + action button" rows. The input grows; the
 * button sits flush to its right. `align="start"` is for the textarea
 * row so the button doesn't float to the center of a tall textarea.
 */
function InputWithAction({
  children,
  align = "center",
}: {
  children: React.ReactNode;
  align?: "center" | "start";
}) {
  return (
    <div
      className={
        "flex w-full gap-2 " +
        (align === "start" ? "items-start" : "items-center")
      }
    >
      {children}
    </div>
  );
}

/**
 * Small square button that randomizes the field it sits beside.
 *
 * Visually deliberate: same height/width as the calendar trigger so the
 * column of action buttons reads as a tidy vertical strip when scanning
 * down the form. The ↻ character is a plain Unicode arrow (not an
 * emoji), which keeps the form's no-icons aesthetic intact.
 */
function RandomizeButton({
  label,
  onClick,
}: {
  /** Used for the aria-label and the tooltip on hover. */
  label: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.92, rotate: 90 }}
      transition={{ type: "spring", stiffness: 340, damping: 20 }}
      aria-label={label}
      title={label}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-parchment/15 bg-ink/40 text-gold transition hover:border-gold/60 hover:bg-ink/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
    >
      <span aria-hidden className="text-base leading-none">↻</span>
    </motion.button>
  );
}

function CharCounter({ current, max }: { current: number; max: number }) {
  const near = current / max > 0.85;
  const at = current >= max;
  return (
    <span
      className={
        "pointer-events-none absolute bottom-1.5 right-2 text-[10px] tabular-nums " +
        (at ? "text-ember" : near ? "text-gold/80" : "text-parchment/35")
      }
      aria-hidden
    >
      {current}/{max}
    </span>
  );
}
