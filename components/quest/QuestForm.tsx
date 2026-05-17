"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type {
  QuestBundle,
  QuestDifficulty,
  QuestOption,
} from "@/types/quest";
import {
  MAX_OPTIONS,
  activityPresets,
  datePresets,
  fieldLimits,
  messageTemplates,
  rewardPresets,
} from "@/lib/questDefaults";
import { Field, TextArea, TextInput } from "@/components/ui/Field";
import { DifficultyPicker } from "@/components/quest/DifficultyPicker";

type Props = {
  value: QuestBundle;
  onChange: (next: QuestBundle) => void;
};

/**
 * Chip-heavy bundle editor. Shared fields live at the top; the list of
 * options below lets the sender stack 1–3 alternatives. Each option is
 * just an activity chip selection plus an auto-generated title.
 */
export function QuestForm({ value, onChange }: Props) {
  // Track which keys the user has typed into directly, so activity
  // chips don't trample over custom titles or rewards.
  const [manuallyEditedShared, setManuallyEditedShared] = useState<
    Set<keyof QuestBundle>
  >(() => new Set());
  // Per-option, track which option indices have user-edited titles.
  const [manualTitleByIndex, setManualTitleByIndex] = useState<Set<number>>(
    () => new Set(),
  );

  function patchShared<K extends keyof QuestBundle>(
    key: K,
    next: QuestBundle[K],
    options?: { manual?: boolean },
  ) {
    if (options?.manual) {
      setManuallyEditedShared((prev) => {
        if (prev.has(key)) return prev;
        const copy = new Set(prev);
        copy.add(key);
        return copy;
      });
    }
    onChange({ ...value, [key]: next });
  }

  function patchOption(index: number, partial: Partial<QuestOption>) {
    const nextOptions = value.options.map((opt, i) =>
      i === index ? { ...opt, ...partial } : opt,
    );
    onChange({ ...value, options: nextOptions });
  }

  function pickActivityForOption(
    index: number,
    preset: (typeof activityPresets)[number],
  ) {
    const nextOptions = value.options.map((opt, i) => {
      if (i !== index) return opt;
      return {
        ...opt,
        activity: preset.activity,
        title: manualTitleByIndex.has(i) ? opt.title : preset.title,
      };
    });
    // Auto-fill the shared reward from the first option's activity, but
    // only if the sender hasn't customized it.
    const nextReward =
      index === 0 && !manuallyEditedShared.has("reward")
        ? preset.reward
        : value.reward;
    onChange({ ...value, options: nextOptions, reward: nextReward });
  }

  function addOption() {
    if (value.options.length >= MAX_OPTIONS) return;
    const nextPreset =
      activityPresets[value.options.length % activityPresets.length];
    onChange({
      ...value,
      options: [
        ...value.options,
        { title: nextPreset.title, activity: nextPreset.activity },
      ],
    });
  }

  function removeOption(index: number) {
    if (value.options.length <= 1) return;
    onChange({
      ...value,
      options: value.options.filter((_, i) => i !== index),
    });
    setManualTitleByIndex((prev) => {
      if (!prev.has(index) && !Array.from(prev).some((i) => i > index)) {
        return prev;
      }
      // Shift down indices above the removed one.
      const next = new Set<number>();
      prev.forEach((i) => {
        if (i < index) next.add(i);
        else if (i > index) next.add(i - 1);
      });
      return next;
    });
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => e.preventDefault()}
    >
      {/* WHO */}
      <SectionCard label="Who's the quest for?">
        <TextInput
          value={value.recipientName}
          maxLength={fieldLimits.recipientName}
          placeholder="Their name…"
          onChange={(e) =>
            patchShared("recipientName", e.target.value, { manual: true })
          }
          className="text-lg"
          autoFocus
          aria-label="Recipient's name"
        />
        {value.recipientName.trim().length === 0 ? (
          <p className="mt-1.5 text-[11px] text-parchment/45">
            Their name shows up at the bottom of the card.
          </p>
        ) : null}
      </SectionCard>

      {/* SHARED VIBE */}
      <SectionCard label="The vibe">
        <div className="flex flex-col gap-4">
          <ChipRowLabel label="Difficulty">
            <DifficultyPicker
              value={value.difficulty}
              onChange={(next: QuestDifficulty) =>
                patchShared("difficulty", next)
              }
            />
          </ChipRowLabel>

          <ChipRowLabel label="When">
            <div className="flex flex-wrap gap-1.5">
              {datePresets.map((d) => (
                <PillChip
                  key={d}
                  label={d}
                  active={value.dateTimeText === d}
                  onClick={() => patchShared("dateTimeText", d)}
                />
              ))}
            </div>
          </ChipRowLabel>

          <ChipRowLabel label="Reward">
            <div className="flex flex-wrap gap-1.5">
              {rewardPresets.map((r) => (
                <PillChip
                  key={r}
                  label={r}
                  active={value.reward === r}
                  onClick={() =>
                    patchShared("reward", r, { manual: true })
                  }
                />
              ))}
            </div>
          </ChipRowLabel>
        </div>
      </SectionCard>

      {/* QUEST OPTIONS */}
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
                className="rounded-xl border border-parchment/10 bg-ink/20 p-3"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-display text-[10px] uppercase tracking-[0.22em] text-gold/70">
                    Quest {value.options.length > 1 ? index + 1 : ""}
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

                <div className="flex flex-wrap gap-1.5">
                  {activityPresets.map((preset) => (
                    <IconChip
                      key={preset.label}
                      icon={preset.icon}
                      label={preset.label}
                      active={option.activity === preset.activity}
                      onClick={() => pickActivityForOption(index, preset)}
                    />
                  ))}
                </div>

                <p className="mt-2 text-[11px] text-parchment/55">
                  Title:{" "}
                  <span className="text-parchment/85">{option.title}</span>{" "}
                  {manualTitleByIndex.has(index) ? (
                    <button
                      type="button"
                      onClick={() => {
                        setManualTitleByIndex((prev) => {
                          const next = new Set(prev);
                          next.delete(index);
                          return next;
                        });
                        const preset = activityPresets.find(
                          (p) => p.activity === option.activity,
                        );
                        if (preset) patchOption(index, { title: preset.title });
                      }}
                      className="ml-1 text-[10px] uppercase tracking-[0.18em] text-gold/70 hover:text-gold"
                    >
                      Reset to auto
                    </button>
                  ) : (
                    <span className="text-parchment/35">· auto</span>
                  )}
                </p>
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

      {/* MESSAGE */}
      <SectionCard label="Your message">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-1.5">
            {messageTemplates.map((t) => (
              <PillChip
                key={t.label}
                label={t.label}
                active={value.message === t.text}
                onClick={() => patchShared("message", t.text)}
              />
            ))}
          </div>
          <div className="relative">
            <TextArea
              value={value.message}
              maxLength={fieldLimits.message}
              placeholder="Tap a template above, or write your own…"
              onChange={(e) =>
                patchShared("message", e.target.value, { manual: true })
              }
            />
            <CharCounter
              current={value.message.length}
              max={fieldLimits.message}
            />
          </div>
        </div>
      </SectionCard>

      {/* CUSTOMIZE */}
      <CollapsibleCard label="Customize titles & sender">
        <Field label="From">
          <TextInput
            value={value.senderName}
            maxLength={fieldLimits.senderName}
            placeholder="A friend"
            onChange={(e) =>
              patchShared("senderName", e.target.value, { manual: true })
            }
          />
        </Field>

        {value.options.map((option, index) => (
          <Field
            key={index}
            label={`Title — Quest ${
              value.options.length > 1 ? index + 1 : ""
            }`}
          >
            <TextInput
              value={option.title}
              maxLength={fieldLimits.title}
              placeholder="Auto-generated from the activity"
              onChange={(e) => {
                setManualTitleByIndex((prev) => {
                  if (prev.has(index)) return prev;
                  const next = new Set(prev);
                  next.add(index);
                  return next;
                });
                patchOption(index, { title: e.target.value });
              }}
            />
          </Field>
        ))}
      </CollapsibleCard>
    </form>
  );
}

/* ------------------------------------------------------------ atoms */

function SectionCard({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-parchment/10 bg-ink/25 p-4 sm:p-5">
      <h3 className="mb-3 font-display text-[11px] uppercase tracking-[0.28em] text-gold/75">
        {label}
      </h3>
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

function ChipRowLabel({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] uppercase tracking-[0.2em] text-parchment/45">
        {label}
      </span>
      {children}
    </div>
  );
}

function IconChip({
  icon,
  label,
  active,
  onClick,
}: {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.94, y: 0 }}
      transition={{ type: "spring", stiffness: 340, damping: 22 }}
      className={
        "inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium ring-1 transition-[background-color,box-shadow,color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 " +
        (active
          ? "bg-gold text-ink ring-gold-soft shadow-[0_4px_14px_-4px_rgba(230,179,82,0.55)]"
          : "bg-ink/40 text-parchment/80 ring-parchment/15 hover:bg-ink/60 hover:text-parchment hover:ring-gold/40")
      }
      aria-pressed={active}
    >
      <span aria-hidden>{icon}</span>
      {label}
    </motion.button>
  );
}

function PillChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.94, y: 0 }}
      transition={{ type: "spring", stiffness: 340, damping: 22 }}
      className={
        "inline-flex min-h-[40px] items-center rounded-full px-3.5 py-2 text-xs font-medium ring-1 transition-[background-color,box-shadow,color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 " +
        (active
          ? "bg-gold text-ink ring-gold-soft shadow-[0_4px_14px_-4px_rgba(230,179,82,0.55)]"
          : "bg-ink/40 text-parchment/80 ring-parchment/15 hover:bg-ink/60 hover:text-parchment hover:ring-gold/40")
      }
      aria-pressed={active}
    >
      {label}
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
