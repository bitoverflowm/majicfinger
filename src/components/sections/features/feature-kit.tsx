"use client";

import { SquareTerminal } from "lucide-react";
import { useEffect, useState, type ReactNode, type RefObject } from "react";

import { cn } from "@/lib/utils";

export const BLUE = "#2f6fed";
export const GREEN = "#10b981";
export const RED = "#e5484d";
export const VIOLET = "#a855f7";

/** Seeded random numbers, so server and client render the same demo data. */
export function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** True while the element is on screen, so demos only animate when someone can see them. */
export function useInView(ref: RefObject<Element | null>, threshold = 0.3) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, threshold]);
  return inView;
}

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const onChange = () => setReduced(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/** Steps through `durations` (ms per phase) while `running`, looping forever. */
export function usePhases(durations: readonly number[], running: boolean) {
  const [phase, setPhase] = useState(0);
  const [loop, setLoop] = useState(0);
  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => {
      if (phase + 1 >= durations.length) {
        setPhase(0);
        setLoop((n) => n + 1);
      } else {
        setPhase(phase + 1);
      }
    }, durations[phase]);
    return () => window.clearTimeout(timer);
  }, [phase, running, durations]);
  return { phase, loop, setPhase };
}

export function FeatureWindow({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border border-black/10 bg-background shadow-[0_24px_60px_-20px_rgba(15,23,42,0.45)] dark:border-white/10",
        className,
      )}
    >
      <div className="relative flex h-9 shrink-0 items-center border-b border-border bg-muted px-3.5">
        <div className="flex gap-1.5" aria-hidden>
          <span className="size-2.5 rounded-full bg-neutral-300 dark:bg-neutral-600" />
          <span className="size-2.5 rounded-full bg-neutral-300 dark:bg-neutral-600" />
          <span className="size-2.5 rounded-full bg-neutral-300 dark:bg-neutral-600" />
        </div>
        <span className="absolute left-1/2 flex max-w-[60%] -translate-x-1/2 items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
          <SquareTerminal className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">{title}</span>
        </span>
      </div>
      <div className="relative flex min-h-0 flex-1">{children}</div>
    </div>
  );
}

/** Thin chip used for toolbar toggles inside the demos. */
export function Chip({
  active,
  children,
  onClick,
  className,
}: {
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-md px-2 text-[11px] font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-primary",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** Builds an SVG path through `values` scaled into a `w`×`h` box. */
export function linePath(values: readonly number[], w: number, h: number, pad = 4) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = pad + (1 - (v - min) / span) * (h - pad * 2);
      return `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

export function pointAt(values: readonly number[], index: number, w: number, h: number, pad = 4) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return {
    x: (index / (values.length - 1)) * w,
    y: pad + (1 - (values[index] - min) / span) * (h - pad * 2),
  };
}
