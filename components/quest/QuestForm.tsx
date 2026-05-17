"use client";

import { useId, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import type {
  QuestBundle,
  QuestDifficulty,
  QuestEnding,
  QuestNote,
  QuestOption,
} from "@/types/quest";
import {
  MAX_OPTIONS,
  activityPresets,
  difficultyOptions,
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
import { Field, Select, TextArea, TextInput } from "@/components/ui/Field";
import { CalendarDropdown } from "@/components/quest/CalendarDropdown";

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
      {/* WHO — the one required text input */}
      <SectionCard
        label="Who is this quest for?"
        hint={
          value.recipientName.trim().length === 0 ? "Needed" : undefined
        }
      >
        <TextInput
          id="quest-recipient-input"
          value={value.recipientName}
          maxLength={fieldLimits.recipientName}
          placeholder="Their name…"
          onChange={(e) => patchBundle({ recipientName: e.target.value })}
          className="text-lg"
          autoFocus
          required
          aria-required="true"
          aria-label="Recipient's name"
        />
        {value.recipientName.trim().length === 0 ? (
          <p className="mt-1.5 text-[11px] text-parchment/45">
            Their name shows up on every scroll.
          </p>
        ) : null}
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

                  {/* VIBE (difficulty) */}
                  <Field label="Vibe">
                    <Select
                      value={option.difficulty}
                      onChange={(e) =>
                        patchOption(index, {
                          difficulty: e.target.value as QuestDifficulty,
                        })
                      }
                      aria-label="Vibe"
                    >
                      {difficultyOptions.map((d) => (
                        <option key={d.value} value={d.value}>
                          {d.label} — {d.blurb}
                        </option>
                      ))}
                    </Select>
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

      {/* SENDER */}
      <CollapsibleCard label="From — your name on the card">
        <Field label="From">
          <TextInput
            value={value.senderName}
            maxLength={fieldLimits.senderName}
            placeholder="A friend"
            onChange={(e) => patchBundle({ senderName: e.target.value })}
          />
        </Field>
      </CollapsibleCard>
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
function NoteEditor({
  note,
  onChange,
}: {
  note: QuestNote;
  onChange: (next: QuestNote) => void;
}) {
  const inputId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Last-seen value for each variant the user isn't currently editing,
  // so a toggle round-trip is lossless. Seeded from the initial note.
  const stash = useRef({
    text: note.kind === "text" ? note.text : "",
    image: note.kind === "image" ? note.image : "",
    caption: note.kind === "image" ? note.caption : "",
    place: note.kind === "location" ? note.place : "",
    address: note.kind === "location" ? note.address : "",
  });

  function stashCurrent() {
    if (note.kind === "text") stash.current.text = note.text;
    else if (note.kind === "image") {
      stash.current.image = note.image;
      stash.current.caption = note.caption;
    } else {
      stash.current.place = note.place;
      stash.current.address = note.address;
    }
  }

  function selectKind(kind: QuestNote["kind"]) {
    if (kind === note.kind) return;
    setError(null);
    stashCurrent(); // preserve whatever we're leaving before swapping
    if (kind === "image") {
      onChange({
        kind: "image",
        image: stash.current.image,
        caption: stash.current.caption,
      });
    } else if (kind === "location") {
      onChange({
        kind: "location",
        place: stash.current.place,
        address: stash.current.address,
      });
    } else {
      onChange({ kind: "text", text: stash.current.text });
    }
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const dataUrl = await fileToImageNoteDataUrl(file);
      onChange({
        kind: "image",
        image: dataUrl,
        caption: note.kind === "image" ? note.caption : stash.current.caption,
      });
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
    <div className="flex flex-col gap-3">
      <NoteKindToggle active={note.kind} onSelect={selectKind} />

      {note.kind === "text" ? (
        <InputWithAction align="start">
          <div className="relative w-full">
            <TextArea
              value={note.text}
              maxLength={fieldLimits.message}
              placeholder="Write a short note for the recipient…"
              onChange={(e) => onChange({ kind: "text", text: e.target.value })}
            />
            <CharCounter current={note.text.length} max={fieldLimits.message} />
          </div>
          <RandomizeButton
            label="Randomize the message"
            onClick={() => {
              const next = pickRandomString(
                messageTemplates.map((t) => t.text),
                note.text,
              );
              onChange({ kind: "text", text: next });
            }}
          />
        </InputWithAction>
      ) : note.kind === "image" ? (
        <div className="flex flex-col gap-3">
          {note.image ? (
            <div className="relative overflow-hidden rounded-lg border border-parchment/15 bg-ink/40">
              {/* Data-URL preview; not a remote asset, so next/image
                  buys nothing here. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={note.image}
                alt="Your image note preview"
                className="max-h-56 w-full object-contain"
              />
              <label
                htmlFor={inputId}
                className="absolute right-2 top-2 cursor-pointer rounded-full bg-ink/80 px-3 py-1 font-display text-[10px] uppercase tracking-[0.2em] text-parchment ring-1 ring-parchment/20 hover:bg-ember"
              >
                {busy ? "Shrinking…" : "Replace"}
              </label>
            </div>
          ) : (
            <label
              htmlFor={inputId}
              className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-parchment/25 bg-ink/30 px-4 py-7 text-center transition hover:border-gold/50"
            >
              <span className="font-display text-xs uppercase tracking-[0.22em] text-gold/80">
                {busy ? "Shrinking…" : "Choose an image"}
              </span>
              <span className="text-[11px] text-parchment/45">
                It rides inside the link, so it gets auto-shrunk small.
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
              // Reset so picking the same file again still fires change.
              e.currentTarget.value = "";
              handleFile(f);
            }}
          />

          {error ? (
            <p className="text-[11px] text-ember" role="alert">
              {error}
            </p>
          ) : null}

          <TextInput
            value={note.caption}
            maxLength={fieldLimits.caption}
            placeholder="Caption (optional)"
            onChange={(e) =>
              onChange({
                kind: "image",
                image: note.image,
                caption: e.target.value,
              })
            }
          />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <TextInput
            value={note.place}
            maxLength={fieldLimits.place}
            placeholder="Place name — e.g. The Cozy Ramen Spot"
            aria-label="Place name"
            onChange={(e) => onChange({ ...note, place: e.target.value })}
          />
          <TextInput
            value={note.address}
            maxLength={fieldLimits.address}
            placeholder="Address or area (optional)"
            aria-label="Address"
            onChange={(e) => onChange({ ...note, address: e.target.value })}
          />
          <LocationPicker
            value={{ lat: note.lat, lng: note.lng }}
            onChange={({ lat, lng }) => onChange({ ...note, lat, lng })}
            onClear={() => {
              const { lat: _lat, lng: _lng, ...rest } = note;
              void _lat;
              void _lng;
              onChange(rest);
            }}
          />
          <p className="text-[11px] text-parchment/45">
            {note.lat !== undefined
              ? "Pinned ✓ — the “Open in Maps” link will land on this exact spot."
              : "Drop a pin (or type a place) and we’ll add an “Open in Maps” link. No map image is stored, so the link stays tiny."}
          </p>
        </div>
      )}
    </div>
  );
}

function NoteKindToggle({
  active,
  onSelect,
}: {
  active: QuestNote["kind"];
  onSelect: (kind: QuestNote["kind"]) => void;
}) {
  const kinds: { value: QuestNote["kind"]; label: string }[] = [
    { value: "text", label: "Text" },
    { value: "image", label: "Image" },
    { value: "location", label: "Location" },
  ];
  return (
    <div className="inline-flex self-start rounded-full border border-parchment/15 bg-ink/40 p-0.5">
      {kinds.map((k) => {
        const on = k.value === active;
        return (
          <button
            key={k.value}
            type="button"
            aria-pressed={on}
            onClick={() => onSelect(k.value)}
            className={
              "rounded-full px-3.5 py-1.5 font-display text-[10px] uppercase tracking-[0.2em] transition " +
              (on ? "bg-gold text-ink" : "text-parchment/60 hover:text-parchment")
            }
          >
            {k.label}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------ ending editor */

/**
 * Bundle-level editor for the post-accept celebration: a custom line
 * (blank → a randomized cheer at render time) and an optional
 * celebratory image, compressed into the share URL the same way image
 * notes are. A small static preview mirrors what the recipient gets the
 * moment they hit Accept (the live animated version is the wax seal in
 * QuestCardOverlay).
 */
function EndingEditor({
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
    <div className="flex flex-col gap-3 sm:flex-row">
      <div className="flex flex-1 flex-col gap-2">
        <div className="relative w-full">
          <TextArea
            value={value.message}
            maxLength={fieldLimits.endingMessage}
            placeholder="What they see the moment they accept… (leave blank for a surprise cheer)"
            onChange={(e) => onChange({ ...value, message: e.target.value })}
          />
          <CharCounter
            current={value.message.length}
            max={fieldLimits.endingMessage}
          />
        </div>

        {value.image ? (
          <div className="relative overflow-hidden rounded-lg border border-parchment/15 bg-ink/40">
            {/* Data-URL preview baked into the bundle. */}
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
            className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-parchment/25 bg-ink/30 px-4 py-3 text-center transition hover:border-gold/50"
          >
            <span className="font-display text-[10px] uppercase tracking-[0.22em] text-gold/80">
              {busy ? "Shrinking…" : "Add a celebration image (optional)"}
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

      <EndingPreview value={value} />
    </div>
  );
}

/** Static "this is what they'll see" mini-card for the ending. */
function EndingPreview({ value }: { value: QuestEnding }) {
  return (
    <div className="w-full shrink-0 self-start rounded-lg bg-parchment p-3 text-ink shadow-inner ring-1 ring-ink/10 sm:w-48">
      <div className="mx-auto flex h-10 w-10 -rotate-6 items-center justify-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#e8854b,#c0521f_70%)] text-parchment ring-1 ring-ember-deep/60">
        <span aria-hidden className="text-lg leading-none">
          ⚔
        </span>
      </div>
      <div className="mt-1.5 text-center font-display text-[9px] uppercase tracking-[0.22em] text-ember-deep">
        Quest Accepted
      </div>
      <p
        className={
          "mt-0.5 text-center font-serif text-[11px] italic " +
          (value.message.trim() ? "text-ink-soft" : "text-ink/40")
        }
      >
        {value.message.trim() || "A surprise cheer ✨"}
      </p>
      {value.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value.image}
          alt=""
          className="mt-1.5 max-h-24 w-full rounded object-contain ring-1 ring-ink/15"
        />
      ) : null}
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

function CollapsibleCard({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group rounded-2xl border border-parchment/10 bg-ink/25 p-4 open:p-5 sm:p-5">
      <summary className="flex cursor-pointer items-center justify-between gap-2 font-display text-[11px] uppercase tracking-[0.28em] text-parchment/55 transition-colors hover:text-parchment marker:hidden [&::-webkit-details-marker]:hidden">
        <span>{label}</span>
        <span aria-hidden className="text-base text-gold/70 transition-transform group-open:rotate-45">
          +
        </span>
      </summary>
      <div className="mt-4 flex flex-col gap-4">{children}</div>
    </details>
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
