"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { landingPageV2Config } from "@/lib/landingPageV2Config";

export const CHECKOUT_HREF = landingPageV2Config.mcpPrereg?.href || "/checkout?plan=mcp_prereg";
export const PRICE = landingPageV2Config.mcpPrereg?.price || "$49";

export const PRIMARY_BUTTON =
  "inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-white/[0.12] bg-secondary px-5 text-sm font-medium text-primary-foreground shadow-[inset_0_1px_2px_rgba(255,255,255,0.25),0_3px_3px_-1.5px_rgba(16,24,40,0.06),0_1px_1px_rgba(16,24,40,0.08)] transition-all ease-out hover:bg-secondary/80 active:scale-95 dark:text-secondary-foreground";

export const TICK_MS = 60;

/**
 * Walks through `durations` (ms per step) while `running`, exposing time spent in the current step.
 * `run` bumps on every loop and every jump, so callers can replay one-shot animations.
 */
export function useStepClock(durations: readonly number[], running: boolean) {
  const [state, setState] = useState({ step: 0, t: 0, run: 0 });
  const last = useRef(0);
  useEffect(() => {
    if (!running) return undefined;
    last.current = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      const dt = Math.min(500, now - last.current);
      last.current = now;
      setState((prev) => {
        const t = prev.t + dt;
        if (t < durations[prev.step]) return { ...prev, t };
        const step = (prev.step + 1) % durations.length;
        return { step, t: 0, run: step === 0 ? prev.run + 1 : prev.run };
      });
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [running, durations]);
  const goTo = useCallback((step: number) => setState((prev) => ({ step, t: 0, run: prev.run + 1 })), []);
  return { ...state, goTo };
}

/** How many characters of `text` are typed when `elapsed` of `total` ms have passed. */
export function typedLength(text: string, elapsed: number, total: number) {
  if (elapsed <= 0) return 0;
  return Math.min(text.length, Math.ceil((elapsed / total) * text.length));
}
