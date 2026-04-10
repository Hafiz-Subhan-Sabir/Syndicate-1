/**
 * Reminder / deck due alarms: default synthesized tone + optional custom clip (localStorage).
 * Browsers may block audio until the user has interacted with the page once.
 */

const LS_MUTE = "dashboarded:deck-alarm-muted";
const LS_CUSTOM = "dashboarded:deck-alarm-custom-dataurl";
const MAX_CUSTOM_BYTES = 1_500_000;

let audioUnlocked = false;
let unlockListenersAttached = false;

function attachUnlockListeners() {
  if (typeof document === "undefined" || unlockListenersAttached) return;
  unlockListenersAttached = true;
  const unlock = () => {
    void unlockDeckAlarmAudio();
    document.removeEventListener("click", unlock);
    document.removeEventListener("keydown", unlock);
    document.removeEventListener("pointerdown", unlock);
  };
  document.addEventListener("click", unlock, { passive: true });
  document.addEventListener("keydown", unlock, { passive: true });
  document.addEventListener("pointerdown", unlock, { passive: true });
}

if (typeof document !== "undefined") {
  attachUnlockListeners();
}

export function isDeckAlarmMuted(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(LS_MUTE) === "1";
}

export function setDeckAlarmMuted(muted: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LS_MUTE, muted ? "1" : "0");
}

export function getDeckAlarmCustomDataUrl(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(LS_CUSTOM);
}

export function setDeckAlarmCustomDataUrl(dataUrl: string | null): void {
  if (typeof window === "undefined") return;
  if (dataUrl) window.localStorage.setItem(LS_CUSTOM, dataUrl);
  else window.localStorage.removeItem(LS_CUSTOM);
}

export function clearDeckAlarmCustom(): void {
  setDeckAlarmCustomDataUrl(null);
}

/** Call after first user gesture so due alarms can play without autoplay errors. */
export async function unlockDeckAlarmAudio(): Promise<void> {
  if (typeof window === "undefined" || audioUnlocked) return;
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    await ctx.resume();
    await ctx.close();
    audioUnlocked = true;
  } catch {
    /* ignore */
  }
}

/**
 * Default alarm: loud fast pulses to grab attention, then slower/softer lower tones.
 * Custom uploads play as-is (no reshaping).
 */
function playFallbackSynthBeep(): void {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    void ctx.resume();

    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.type = "triangle";

    const t0 = ctx.currentTime;
    let t = t0;

    /** Phase 1 — urgent: louder, tight spacing */
    const attention: { hz: number; peak: number; ms: number }[] = [
      { hz: 988, peak: 0.38, ms: 52 },
      { hz: 1046, peak: 0.42, ms: 55 },
      { hz: 1174, peak: 0.48, ms: 58 },
      { hz: 1046, peak: 0.44, ms: 54 },
      { hz: 988, peak: 0.4, ms: 52 },
      { hz: 880, peak: 0.36, ms: 50 }
    ];
    const gapFastSec = 0.032;
    for (const p of attention) {
      const dur = p.ms / 1000;
      o.frequency.setValueAtTime(p.hz, t);
      o.frequency.linearRampToValueAtTime(p.hz * 0.97, t + dur);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(p.peak, t + 0.012);
      g.gain.linearRampToValueAtTime(0, t + dur);
      t += dur + gapFastSec;
    }

    /** Phase 2 — wind down: longer gaps between hits, quieter, lower pitch */
    const tail: { hz: number; peak: number; ms: number; pauseAfterMs: number }[] = [
      { hz: 784, peak: 0.16, ms: 220, pauseAfterMs: 240 },
      { hz: 659, peak: 0.12, ms: 260, pauseAfterMs: 320 },
      { hz: 523, peak: 0.085, ms: 300, pauseAfterMs: 420 },
      { hz: 440, peak: 0.055, ms: 380, pauseAfterMs: 520 }
    ];
    for (const p of tail) {
      const dur = p.ms / 1000;
      o.frequency.setValueAtTime(p.hz, t);
      o.frequency.linearRampToValueAtTime(p.hz * 0.88, t + dur);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(p.peak, t + 0.04);
      g.gain.linearRampToValueAtTime(0, t + dur);
      t += dur + p.pauseAfterMs / 1000;
    }

    o.start(t0);
    o.stop(t + 0.05);
    window.setTimeout(() => {
      void ctx.close();
    }, Math.ceil((t - t0) * 1000) + 400);
  } catch {
    /* ignore */
  }
}

/**
 * Play alarm when a due reminder/mission toast appears.
 * Respects mute + optional custom sound (data URL from upload).
 */
export function playDeckAlarmSound(): void {
  if (typeof window === "undefined") return;
  attachUnlockListeners();
  if (isDeckAlarmMuted()) return;

  const custom = getDeckAlarmCustomDataUrl();
  if (custom) {
    const audio = new Audio(custom);
    audio.volume = 0.85;
    void audio.play().catch(() => {
      playFallbackSynthBeep();
    });
    return;
  }

  playFallbackSynthBeep();
}

export async function readAudioFileAsDataUrl(file: File): Promise<string> {
  if (file.size > MAX_CUSTOM_BYTES) {
    throw new Error(`File too large (max ${Math.round(MAX_CUSTOM_BYTES / 1024)} KB)`);
  }
  if (!file.type.startsWith("audio/")) {
    throw new Error("Choose an audio file");
  }
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      if (typeof r.result === "string") resolve(r.result);
      else reject(new Error("Could not read file"));
    };
    r.onerror = () => reject(new Error("Read failed"));
    r.readAsDataURL(file);
  });
}

export { MAX_CUSTOM_BYTES };
