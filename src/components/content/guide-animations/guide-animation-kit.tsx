"use client";

import Image, { type StaticImageData } from "next/image";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";

import { FEATURE_KEYFRAMES } from "@/components/sections/features/feature-keyframes";
import { usePhases, useInView, useReducedMotion } from "@/components/sections/features/feature-kit";
import { cn } from "@/lib/utils";
import automateBackdrop from "../../../../public/landing/feature-automate.jpg";
import connectBackdrop from "../../../../public/landing/feature-connect-village.jpg";
import dashboardsBackdrop from "../../../../public/landing/feature-dashboards.jpg";
import exploreBackdrop from "../../../../public/landing/feature-explore-lake.jpg";
import insightsBackdrop from "../../../../public/landing/feature-insights.jpg";

const BACKDROPS = {
  lake: exploreBackdrop,
  village: connectBackdrop,
  dashboards: dashboardsBackdrop,
  insights: insightsBackdrop,
  automate: automateBackdrop,
} satisfies Record<string, StaticImageData>;

export type GuideBackdrop = keyof typeof BACKDROPS;

export const EASE = "cubic-bezier(0.32, 0.72, 0, 1)";

/**
 * Article figure in the homepage showcase style: a painted backdrop with the animation
 * floating on top. Bleeds slightly past the reading column.
 */
export function GuideAnimationFigure({
  backdrop = "lake",
  caption,
  label,
  children,
  className,
  rootRef,
}: {
  backdrop?: GuideBackdrop;
  caption?: ReactNode;
  /** Accessible description of what the animation shows. */
  label: string;
  children: ReactNode;
  className?: string;
  /** Must sit on the figure itself: the prose column only widens direct children with `data-article-bleed`. */
  rootRef?: RefObject<HTMLElement | null>;
}) {
  return (
    <figure
      ref={rootRef}
      data-article-bleed
      className={cn("guide-animation not-prose mx-auto my-8 w-full max-w-[48rem] font-sans sm:my-10", className)}
    >
      <style dangerouslySetInnerHTML={{ __html: FEATURE_KEYFRAMES }} />
      <div role="img" aria-label={label} className="relative overflow-hidden rounded-xl bg-muted">
        <Image
          src={BACKDROPS[backdrop]}
          alt=""
          fill
          placeholder="blur"
          sizes="(min-width: 860px) 768px, 100vw"
          className="pointer-events-none select-none object-cover"
        />
        <div className="relative p-3 sm:p-6 md:p-8">{children}</div>
      </div>
      {caption ? (
        <figcaption className="mt-3 text-center text-xs leading-relaxed text-muted-foreground">{caption}</figcaption>
      ) : null}
    </figure>
  );
}

/**
 * Lays out `children` at a fixed design size and scales it to the available width,
 * so the mock interface keeps its proportions on every screen, like a GIF.
 */
export function ScaledStage({
  width,
  height,
  children,
  innerRef,
}: {
  width: number;
  height: number;
  children: ReactNode;
  innerRef?: RefObject<HTMLDivElement | null>;
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useLayoutEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const measure = () => setScale(el.clientWidth / width);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [width]);

  return (
    <div ref={outerRef} className="relative w-full" style={{ aspectRatio: `${width} / ${height}` }}>
      <div
        ref={innerRef}
        className="absolute left-0 top-0 origin-top-left transition-opacity duration-300"
        style={{ width, height, transform: `scale(${scale || 1})`, opacity: scale ? 1 : 0 }}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Loops through `durations` while the figure is on screen. Under reduced motion it holds `still`.
 */
export function useGuidePhases(durations: readonly number[], rootRef: RefObject<Element | null>, still: number) {
  const inView = useInView(rootRef, 0.35);
  const reduced = useReducedMotion();
  const { phase, loop } = usePhases(durations, inView && !reduced);
  return { phase: reduced ? still : phase, loop, reduced };
}

/** Text that types itself out while `active`, then stays complete. */
export function useTypedText(text: string, active: boolean, msPerChar = 55) {
  const [count, setCount] = useState(active ? 0 : text.length);
  useEffect(() => {
    if (!active) {
      setCount(text.length);
      return;
    }
    setCount(0);
    const timer = window.setInterval(() => setCount((n) => Math.min(text.length, n + 1)), msPerChar);
    return () => window.clearInterval(timer);
  }, [active, text, msPerChar]);
  return text.slice(0, count);
}

/**
 * Pointer that glides to the element marked `data-cursor="<target>"` inside `stageRef`.
 * Positions are in the stage's unscaled coordinates.
 */
export function GuideCursor({
  stageRef,
  target,
  pressed = false,
  hidden = false,
  revision,
}: {
  stageRef: RefObject<HTMLDivElement | null>;
  target: string | null;
  pressed?: boolean;
  hidden?: boolean;
  /** Changes when the target may have moved (e.g. the phase), so the cursor re-measures. */
  revision?: unknown;
}) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage || !target) return;
    const measure = () => {
      const el = stage.querySelector<HTMLElement>(`[data-cursor="${target}"]`);
      if (!el) return;
      const stageRect = stage.getBoundingClientRect();
      const scale = stageRect.width / stage.offsetWidth || 1;
      const rect = el.getBoundingClientRect();
      const x = (rect.left + rect.width / 2 - stageRect.left) / scale;
      const y = (rect.top + rect.height / 2 - stageRect.top) / scale;
      setPos((current) => (current && Math.abs(current.x - x) < 0.5 && Math.abs(current.y - y) < 0.5 ? current : { x, y }));
    };
    measure();
    const frame = window.requestAnimationFrame(measure);
    return () => window.cancelAnimationFrame(frame);
  }, [stageRef, target, revision]);

  if (!pos) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute left-0 top-0 z-50"
      style={{
        transform: `translate(${pos.x}px, ${pos.y}px)`,
        opacity: hidden ? 0 : 1,
        transition: `transform 750ms ${EASE}, opacity 300ms ease`,
      }}
    >
      {pressed ? (
        <span
          key={String(revision)}
          className="absolute -left-3 -top-3 size-6 rounded-full border-2 border-[#2f6fed]"
          style={{ animation: "fx-flash .6s ease-out both, fx-fade-out .6s ease-out .2s both" }}
        />
      ) : null}
      <svg
        width="18"
        height="18"
        viewBox="0 0 18 18"
        className="-translate-x-[3px] -translate-y-[2px] drop-shadow-[0_2px_3px_rgba(15,23,42,0.35)]"
        style={{ transform: pressed ? "scale(0.88)" : "scale(1)", transition: "transform 150ms ease" }}
      >
        <path d="M3 2 L3 15 L6.6 11.6 L9 16.5 L11.2 15.5 L8.9 10.7 L13.8 10.7 Z" fill="#0f172a" stroke="#fff" strokeWidth="1.3" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

/** Short status tag in the run card (`RUNNING`, `QUEUED`). */
export function MonoTag({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "blue" }) {
  return (
    <span className={cn("font-mono text-[9px] uppercase tracking-wide", tone === "blue" ? "text-[#2f6fed]" : "text-muted-foreground")}>
      {children}
    </span>
  );
}
