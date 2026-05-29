/**
 * @file quips.ts
 * @description Tabby's personality: pools of short phrases keyed by pulse/mood,
 *   plus a deterministic-by-injection picker. Pure data + a pure function so it
 *   can be unit-tested without randomness leaking in.
 * @author Son Nguyen <hoangson091104@gmail.com>
 */

import type { Mood, TabbyPulse } from "./brain";

export type QuipKey = NonNullable<TabbyPulse> | Mood;

const QUIPS: Record<QuipKey, string[]> = {
  // Pulses (event-driven, transient bubbles)
  session_done: ["session wrapped 🐾", "nice, that one's done", "clean run — purr"],
  session_start: ["ooh, a new session", "something's cooking", "eyes on it 👀"],
  error: ["ow, an error", "a hook tripped — peek?", "hiss… something broke"],
  run_done: ["run finished 🐾", "all done over here", "that's a wrap"],
  // Moods (steady-state flavor, used by the panel / idle bubbles)
  disconnected: ["lost the thread…", "can't reach the server", "no signal — napping"],
  worried: ["that didn't look right", "keeping an eye out"],
  stuck: ["this one's been quiet a while…", "still chewing on something?"],
  happy: ["good run!", "love a tidy finish"],
  thinking: ["hmm, let me look…", "sniffing around…"],
  watching: ["on the prowl 👀", "watching your sessions"],
  sleeping: ["zzz", "wake me if something happens", "curled up, all calm"],
  idle: ["all quiet", "ready when you are", "just vibing"],
};

/**
 * Pick a quip for a key. `rand` is injectable for deterministic tests; defaults
 * to Math.random. Returns "" only for an unknown key (never throws).
 */
export function pickQuip(key: QuipKey, rand: () => number = Math.random): string {
  const pool = QUIPS[key];
  if (!pool || pool.length === 0) return "";
  const i = Math.min(pool.length - 1, Math.max(0, Math.floor(rand() * pool.length)));
  return pool[i] ?? "";
}

export const ALL_QUIP_KEYS = Object.keys(QUIPS) as QuipKey[];
