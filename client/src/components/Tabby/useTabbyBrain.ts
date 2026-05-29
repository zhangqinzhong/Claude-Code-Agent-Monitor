/**
 * @file useTabbyBrain.ts
 * @description React hook that wires the pure Tabby brain to the live event bus
 *   and to real timers. It is the only unit that subscribes to `eventBus`. It
 *   exposes the derived mood, a status summary, the current speech bubble, and
 *   imperative controls (mute, clear alerts, set thinking) for the UI shell.
 * @author Son Nguyen <hoangson091104@gmail.com>
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { eventBus } from "../../lib/eventBus";
import type { WSMessage } from "../../lib/types";
import {
  initialTabbyState,
  reduceTabby,
  deriveMood,
  statusOf,
  clearErrors,
  type Mood,
  type TabbyState,
  type TabbyStatus,
} from "./brain";
import { pickQuip } from "./quips";
import { tabbyPrefs } from "./prefs";

const BUBBLE_MS = 4500;
// Minimum gap between non-error bubbles, so a burst of activity doesn't spam.
const BUBBLE_THROTTLE_MS = 3000;

export interface TabbyBrain {
  mood: Mood;
  status: TabbyStatus;
  bubble: string | null;
  dismissBubble: () => void;
  muted: boolean;
  toggleMute: () => void;
  clearAlerts: () => void;
  setThinking: (v: boolean) => void;
}

export function useTabbyBrain(): TabbyBrain {
  const now0 = Date.now();
  const [state, setState] = useState<TabbyState>(() => ({
    ...initialTabbyState(now0),
    connected: eventBus.connected,
  }));
  const [tick, setTick] = useState(now0);
  const [bubble, setBubble] = useState<string | null>(null);
  const [muted, setMuted] = useState<boolean>(() => tabbyPrefs.getMuted());

  const bubbleTimer = useRef<ReturnType<typeof setTimeout>>();
  const lastBubbleAt = useRef(0);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  // Keep mute in sync with the Settings page / other tabs.
  useEffect(() => tabbyPrefs.subscribe(() => setMuted(tabbyPrefs.getMuted())), []);

  const showBubble = useCallback((text: string, force: boolean) => {
    if (!text) return;
    if (mutedRef.current) return;
    const t = Date.now();
    if (!force && t - lastBubbleAt.current < BUBBLE_THROTTLE_MS) return;
    lastBubbleAt.current = t;
    clearTimeout(bubbleTimer.current);
    setBubble(text);
    bubbleTimer.current = setTimeout(() => setBubble(null), BUBBLE_MS);
  }, []);

  // Subscribe to the live stream and connection status.
  useEffect(() => {
    const unsubMsg = eventBus.subscribe((msg: WSMessage) => {
      const t = Date.now();
      setState((prev) => {
        const { state: next, pulse } = reduceTabby(prev, msg, t);
        if (pulse) showBubble(pickQuip(pulse), pulse === "error");
        return next;
      });
    });
    const unsubConn = eventBus.onConnection((connected) => {
      setState((prev) => ({ ...prev, connected }));
    });
    return () => {
      unsubMsg();
      unsubConn();
    };
  }, [showBubble]);

  // Advance the clock so timed moods (stuck/sleeping, and exit from
  // happy/worried) re-evaluate without needing a new event.
  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => () => clearTimeout(bubbleTimer.current), []);

  const mood = useMemo(() => deriveMood(state, tick), [state, tick]);
  const status = useMemo(() => statusOf(state), [state]);

  const dismissBubble = useCallback(() => {
    clearTimeout(bubbleTimer.current);
    setBubble(null);
  }, []);

  const toggleMute = useCallback(() => {
    const next = !mutedRef.current;
    tabbyPrefs.setMuted(next);
    setMuted(next);
    if (next) dismissBubble();
  }, [dismissBubble]);

  const clearAlerts = useCallback(() => setState((prev) => clearErrors(prev)), []);

  const setThinking = useCallback(
    (v: boolean) => setState((prev) => (prev.thinking === v ? prev : { ...prev, thinking: v })),
    []
  );

  return { mood, status, bubble, dismissBubble, muted, toggleMute, clearAlerts, setThinking };
}
