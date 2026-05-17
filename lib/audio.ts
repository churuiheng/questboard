"use client";

// Small audio runtime for QuestBoard. SSR-safe: every guard checks for
// `window` first. SFX plays through a cloned <audio> element so rapid-fire
// clicks don't cancel previous instances. Ambient loops, and mute state
// persists to localStorage.
//
// Pair with useAssetExists() to silence 404s when files aren't present.

type Listener = () => void;
const muteListeners = new Set<Listener>();

const STORAGE_KEY = "questboard:muted";

let muted: boolean | null = null;

function loadMutedFromStorage(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function ensureMutedInit(): void {
  if (muted === null) {
    muted = loadMutedFromStorage();
  }
}

export function getMuted(): boolean {
  if (typeof window === "undefined") return false;
  ensureMutedInit();
  return muted!;
}

export function setMuted(value: boolean): void {
  if (typeof window === "undefined") return;
  ensureMutedInit();
  muted = value;
  try {
    window.localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
  } catch {
    /* ignore */
  }
  if (ambient) ambient.muted = value;
  muteListeners.forEach((cb) => cb());
}

export function subscribeMuted(cb: Listener): () => void {
  muteListeners.add(cb);
  return () => {
    muteListeners.delete(cb);
  };
}

/* ------------------------- Ambient (looping) ------------------------- */

let ambient: HTMLAudioElement | null = null;
let ambientUrl: string | null = null;
let ambientStarted = false;

export function configureAmbient(url: string, volume = 0.35): void {
  if (typeof window === "undefined") return;
  if (ambientUrl === url) return;
  if (ambient) {
    ambient.pause();
    ambient.src = "";
  }
  ambient = new Audio(url);
  ambient.loop = true;
  ambient.volume = volume;
  ambient.muted = getMuted();
  ambient.preload = "auto";
  ambientUrl = url;
  ambientStarted = false;
}

export function tryStartAmbient(): void {
  if (!ambient || ambientStarted) return;
  ambient.play().then(
    () => {
      ambientStarted = true;
    },
    () => {
      // Autoplay is typically blocked until the first user gesture.
      // We'll get called again on the next interaction.
    },
  );
}

/* --------------------------- SFX (one-shot) --------------------------- */

// Cache the "template" audio per URL so we only fetch once. We clone the
// element on each play so overlapping triggers don't truncate each other.
const sfxTemplates = new Map<string, HTMLAudioElement>();

function getOrLoadSfx(url: string): HTMLAudioElement {
  let audio = sfxTemplates.get(url);
  if (!audio) {
    audio = new Audio(url);
    audio.volume = 0.7;
    audio.preload = "auto";
    sfxTemplates.set(url, audio);
  }
  return audio;
}

export function playSfx(url: string): void {
  if (typeof window === "undefined") return;
  if (getMuted()) return;
  const template = getOrLoadSfx(url);
  const instance = template.cloneNode(true) as HTMLAudioElement;
  instance.volume = template.volume;
  instance.play().catch(() => {
    /* swallow autoplay blocks */
  });
}
