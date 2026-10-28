"use client";

import { useEffect, useRef, useState } from "react";

import { useInView, useReducedMotion } from "../features/feature-kit";

/** Ref for a demo's frame, and whether it should animate (on screen, motion allowed). */
export function useDemoVisibility() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);
  const reduced = useReducedMotion();
  return { ref, running: inView && !reduced };
}

/** Counts up every `ms` while `running`; 0 is the static frame used for SSR and reduced motion. */
export function useTick(ms: number, running: boolean) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setTick((n) => n + 1), ms);
    return () => window.clearInterval(timer);
  }, [ms, running]);
  return tick;
}

/** Runs `step` every `ms` while `running`, always calling the latest closure. */
export function useInterval(step: () => void, ms: number, running: boolean) {
  const saved = useRef(step);
  saved.current = step;
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => saved.current(), ms);
    return () => window.clearInterval(timer);
  }, [ms, running]);
}

export function formatNumber(value: number, decimals: number) {
  return value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/** SVG path through `values`, with x spread over `slots` points so a partial series grows left to right. */
export function seriesPath(
  values: readonly number[],
  { w, h, min, max, slots = values.length, pad = 4 }: { w: number; h: number; min: number; max: number; slots?: number; pad?: number },
) {
  const span = max - min || 1;
  return values
    .map((v, i) => {
      const x = (i / Math.max(1, slots - 1)) * w;
      const y = pad + (1 - (v - min) / span) * (h - pad * 2);
      return `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

export function seriesPoint(
  values: readonly number[],
  index: number,
  { w, h, min, max, slots = values.length, pad = 4 }: { w: number; h: number; min: number; max: number; slots?: number; pad?: number },
) {
  const span = max - min || 1;
  return {
    x: (index / Math.max(1, slots - 1)) * w,
    y: pad + (1 - (values[index] - min) / span) * (h - pad * 2),
  };
}
