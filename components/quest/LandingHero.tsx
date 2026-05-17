"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Hero section with a soft stagger entrance — text rises in word-by-word,
 * the sample card floats up beside it, and the CTA pulses once it lands.
 */
export function LandingHero({ sampleCard }: { sampleCard: ReactNode }) {
  return (
    <motion.section
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="grid w-full grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
    >
      <div className="flex flex-col gap-6">
        <motion.h1
          variants={itemVariants}
          className="font-display text-4xl leading-[1.05] sm:text-5xl lg:text-6xl"
        >
          Turn any invite into a tiny{" "}
          <span className="text-ember">RPG quest</span>.
        </motion.h1>

        <motion.p
          variants={itemVariants}
          className="max-w-lg text-base leading-relaxed text-parchment/75 sm:text-lg"
        >
          Plan a hangout. Ask someone out. Rally your party. Forge a
          playful quest card in two minutes and send a link that opens
          like a game.
        </motion.p>

        <motion.div variants={itemVariants} className="mt-2 flex flex-wrap items-center gap-3">
          <Link href="/create">
            <motion.span
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="ember-pulse inline-flex items-center justify-center gap-2 rounded-full bg-ember px-7 py-3 font-display text-sm font-semibold uppercase tracking-[0.18em] text-parchment shadow-[0_8px_24px_-6px_rgba(217,107,52,0.6)] hover:bg-ember-deep"
            >
              ⚔ Forge your quest
            </motion.span>
          </Link>
          <span className="text-xs text-parchment/45">
            No accounts. No sign-up. Just a link.
          </span>
        </motion.div>

        <motion.ul
          variants={listVariants}
          className="mt-6 grid grid-cols-1 gap-3 text-sm text-parchment/65 sm:grid-cols-3"
        >
          <Bullet icon="✦" label="Choose the quest" />
          <Bullet icon="✉" label="Share a link" />
          <Bullet icon="✓" label="They accept the call" />
        </motion.ul>
      </div>

      <motion.div
        variants={cardVariants}
        className="flex justify-center lg:justify-end"
      >
        <div className="relative">
          <div
            aria-hidden
            className="absolute -inset-8 -z-10 rounded-full bg-gold/10 blur-3xl"
          />
          {/* Subtle continuous float once the entrance settles */}
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1.4,
            }}
          >
            {sampleCard}
          </motion.div>
        </div>
      </motion.div>
    </motion.section>
  );
}

function Bullet({ icon, label }: { icon: string; label: string }) {
  return (
    <motion.li
      variants={itemVariants}
      className="flex items-center gap-2 rounded-full border border-parchment/10 bg-ink/30 px-3 py-2"
    >
      <span className="text-gold" aria-hidden>
        {icon}
      </span>
      {label}
    </motion.li>
  );
}

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.09, delayChildren: 0.08 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 220, damping: 26 },
  },
};

const listVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.35 } },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 28, rotate: -1.5, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    rotate: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 120, damping: 18, delay: 0.25 },
  },
};
