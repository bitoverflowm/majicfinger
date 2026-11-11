"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { useReducedMotion } from "@/components/sections/features/feature-kit";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { retryImport } from "@/lib/retryImport";
import { cn } from "@/lib/utils";
import heroBackdrop from "../../../public/landing/holder-hero-backdrop.jpg";
import { SCENES, STILL_SCENE, useDemoClock } from "./demo/demoScript";
import { FREE_NOTE, PRIMARY_CTA } from "./holderLandingRail";

const DESIGN_RATIO = "1280 / 720";

function DemoPlaceholder() {
  return <div className="w-full rounded-2xl border border-black/10 bg-background/80 shadow-[0_40px_100px_-30px_rgba(15,23,42,0.55)]" style={{ aspectRatio: DESIGN_RATIO }} />;
}

const HeroDemo = dynamic(() => retryImport(() => import("./demo/heroDemo")), { ssr: false, loading: DemoPlaceholder });

/** Starts loading the demo once the hero is close to the screen, and says whether it's on screen now. */
function useVisible(ref) {
  const [state, setState] = useState({ near: false, visible: false });
  const [shown, setShown] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      setState((prev) => ({ near: prev.near || entry.isIntersecting, visible: entry.isIntersecting }));
    });
    observer.observe(el);
    const onVisibility = () => setShown(document.visibilityState === "visible");
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [ref]);
  return { near: state.near, visible: state.visible && shown };
}

/** The check line for the scene playing, and a segment per scene to jump straight to one. */
function SceneChecks({ scene, t, playing, stopped, onJump, reduced }) {
  if (reduced) {
    return (
      <ul className="flex flex-col items-center gap-1.5 text-[15px] text-foreground sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-5">
        {SCENES.slice(0, 5).map((item) => (
          <li key={item.id} className="flex items-center gap-2">
            <Check className="size-4 shrink-0 text-emerald-600" strokeWidth={2.5} aria-hidden />
            {item.check}
          </li>
        ))}
      </ul>
    );
  }
  const current = SCENES[scene];
  return (
    <div className="flex flex-col items-center gap-3">
      <p className="relative flex h-7 items-center justify-center overflow-hidden" aria-live="polite">
        <span key={current.id} className="flex items-center gap-2 text-[17px] font-medium text-foreground animate-in fade-in-0 slide-in-from-bottom-3 duration-500">
          <span className="flex size-5 items-center justify-center rounded-full bg-emerald-500 text-white">
            <Check className="size-3.5" strokeWidth={3} aria-hidden />
          </span>
          {current.check}
          {stopped ? <PausedTag /> : null}
        </span>
      </p>
      <div className="flex items-center gap-1" role="group" aria-label="Demo scenes">
        {SCENES.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onJump(index)}
            aria-label={item.check}
            aria-current={index === scene ? "step" : undefined}
            title={item.check}
            className="group flex h-4 items-center"
          >
            <span className="relative block h-1 w-5 overflow-hidden rounded-full bg-black/10 transition-[width] duration-300 group-hover:bg-black/20 sm:w-7">
              {index < scene ? <span className="absolute inset-0 bg-[#2f6fed]/50" /> : null}
              {index === scene ? (
                <span
                  className="absolute inset-y-0 left-0 bg-[#2f6fed]"
                  style={{ width: `${Math.min(100, (t / item.ms) * 100)}%`, transition: playing ? "width 100ms linear" : "none" }}
                />
              ) : null}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

const MARKET_START = SCENES.findIndex((item) => item.id === "search");
const SCENE_GROUPS = [
  { label: "Any trader", start: 0, items: SCENES.slice(0, MARKET_START) },
  { label: "Any market", start: MARKET_START, items: SCENES.slice(MARKET_START) },
];

function PausedTag() {
  return (
    <span className="inline-flex h-[18px] shrink-0 items-center gap-1 rounded-full bg-black/[0.06] px-1.5 text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground dark:bg-white/10">
      <Pause className="size-2.5 fill-current" strokeWidth={0} aria-hidden />
      Paused
    </span>
  );
}

/** Every scene down the side of the demo; the dot lights up on the one playing, and each jumps to its scene. */
function SceneList({ scene, t, playing, stopped, onJump, reduced }) {
  return (
    <nav aria-label="Demo scenes" className="flex flex-col gap-6">
      {SCENE_GROUPS.map((group) => (
        <div key={group.label} className="flex flex-col gap-1.5">
          <p className="pl-[34px] text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">{group.label}</p>
          <ol className="relative flex flex-col">
            <span aria-hidden className="absolute bottom-4 left-[11px] top-4 w-px bg-black/10 dark:bg-white/10" />
            {group.items.map((item, offset) => {
              const index = group.start + offset;
              const active = index === scene;
              const done = !reduced && index < scene;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onJump(index)}
                    aria-current={active ? "step" : undefined}
                    className={cn(
                      "group flex w-full items-start gap-3 py-1.5 text-left text-[14px] leading-snug transition-colors duration-300",
                      active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <span className="relative flex h-5 w-[23px] shrink-0 items-center justify-center">
                      <span
                        className={cn(
                          "block rounded-full transition-all duration-300",
                          active
                            ? cn("size-2.5 bg-[#2f6fed] ring-4", stopped ? "ring-black/[0.06] dark:ring-white/10" : "ring-[#2f6fed]/20")
                            : done
                              ? "size-2 bg-[#2f6fed]/55"
                              : "size-2 bg-[#d4d4d4] group-hover:bg-[#a3a3a3] dark:bg-white/25",
                        )}
                      />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <span className={cn(active && "font-medium")}>
                        {item.check}
                        {active && stopped ? (
                          <>
                            {" "}
                            <PausedTag />
                          </>
                        ) : null}
                      </span>
                      <span className={cn("block h-0.5 overflow-hidden rounded-full bg-black/5", (!active || reduced) && "opacity-0")} aria-hidden>
                        {active && !reduced ? (
                          <span
                            className="block h-full bg-[#2f6fed]"
                            style={{ width: `${Math.min(100, (t / item.ms) * 100)}%`, transition: playing ? "width 100ms linear" : "none" }}
                          />
                        ) : null}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      ))}
    </nav>
  );
}

const DOCK_BUTTON =
  "inline-flex size-8 shrink-0 items-center justify-center rounded-[8px] text-neutral-700 transition-colors hover:bg-black/[0.05] dark:text-neutral-200 dark:hover:bg-white/10";

/** The terminal's dock, as playback for the demo: step back, play or pause on this step, step on. */
function DemoDock({ scene, stopped, onToggle, onStep }) {
  return (
    <div
      role="toolbar"
      aria-label="Demo playback"
      className="flex max-w-full items-center gap-0.5 rounded-[14px] bg-white p-1 text-neutral-800 shadow-[0_0_0.5px_rgba(0,0,0,0.18),0_1px_3px_rgba(0,0,0,0.08),0_12px_32px_rgba(0,0,0,0.12)] dark:bg-[#2c2c2c] dark:text-neutral-100"
    >
      <button type="button" aria-label="Previous step" title="Previous step" onClick={() => onStep(scene - 1)} className={DOCK_BUTTON}>
        <SkipBack className="size-[17px]" strokeWidth={1.75} aria-hidden />
      </button>
      <button
        type="button"
        aria-label={stopped ? "Play the demo" : "Pause on this step"}
        title={stopped ? "Play" : "Pause"}
        aria-pressed={stopped}
        onClick={onToggle}
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-[#0d99ff] text-white transition-colors hover:bg-[#0b87e0]"
      >
        {stopped ? <Play className="size-4 translate-x-px fill-current" strokeWidth={0} aria-hidden /> : <Pause className="size-4 fill-current" strokeWidth={0} aria-hidden />}
      </button>
      <button type="button" aria-label="Next step" title="Next step" onClick={() => onStep(scene + 1)} className={DOCK_BUTTON}>
        <SkipForward className="size-[17px]" strokeWidth={1.75} aria-hidden />
      </button>
      <span className="mx-1 h-5 w-px shrink-0 bg-black/10 dark:bg-white/15" aria-hidden />
      <span className="flex w-[15rem] min-w-0 items-center gap-2 pl-1 pr-2.5 text-[12.5px] sm:w-[19rem]" aria-live="polite">
        <span className="shrink-0 tabular-nums text-muted-foreground">
          {scene + 1}/{SCENES.length}
        </span>
        <span className="truncate font-medium">{SCENES[scene].check}</span>
      </span>
    </div>
  );
}

/** The marketing layout caps pages at 84rem; the hero spans the whole window, less any scrollbar. */
function useFullBleed(ref) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const measure = () => el.style.setProperty("--scrollbar", `${window.innerWidth - document.documentElement.clientWidth}px`);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [ref]);
}

const FULL_BLEED = {
  width: "calc(100vw - var(--scrollbar, 0px))",
  marginLeft: "calc(50% - (100vw - var(--scrollbar, 0px)) / 2)",
};

/**
 * The flagship hero: centred copy above a full-width run of the real terminal on saved data, with
 * its scenes listed down the left. Hovering the demo pauses it.
 */
export function DemoHero({ hero, ctaRef, onTry, onLearn, covered = false }) {
  const reduced = useReducedMotion();
  const rootRef = useRef(null);
  useFullBleed(rootRef);
  const { near, visible } = useVisible(rootRef);
  const [paused, setPaused] = useState(false);
  const [stopped, setStopped] = useState(false);
  const [ready, setReady] = useState(false);
  const playing = ready && visible && !covered && !paused && !stopped && !reduced;
  const clock = useDemoClock(playing);
  const { jump } = clock;
  useEffect(() => {
    if (reduced) jump(STILL_SCENE);
  }, [jump, reduced]);
  const onReady = useCallback(() => setReady(true), []);
  const step = useCallback(
    (index) => {
      setStopped(false);
      jump((index + SCENES.length) % SCENES.length);
    },
    [jump],
  );
  const toggle = useCallback(() => setStopped((prev) => !prev), []);

  return (
    <section id="hero" ref={rootRef} className="relative scroll-mt-0 overflow-hidden" style={FULL_BLEED}>
      <div className="w-full px-4 pb-12 pt-24 sm:px-8 md:pt-32 lg:px-10 2xl:px-16">
        <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center gap-5 text-center">
          <p className="inline-flex h-7 w-fit items-center gap-2 rounded-full border border-border bg-accent px-3 text-[13px] text-foreground">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500/60 motion-reduce:hidden" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            {hero.label}
          </p>
          <h1 className="text-balance text-[2.5rem] font-normal leading-[1.02] tracking-[-0.03em] text-primary sm:text-[3.25rem] xl:text-[4rem]">{hero.title}</h1>
          <p className="max-w-[38rem] text-balance text-[15px] leading-relaxed text-muted-foreground sm:text-[17px]">{hero.description}</p>
          <div className="xl:hidden">
            <SceneChecks scene={clock.scene} t={clock.t} playing={playing} stopped={stopped} onJump={step} reduced={reduced} />
          </div>
        </div>
        <div className="mx-auto mt-10 grid w-full max-w-[120rem] items-center gap-8 xl:mt-14 xl:grid-cols-[17rem_minmax(0,1fr)] xl:gap-10 2xl:grid-cols-[19rem_minmax(0,1fr)] 2xl:gap-14">
          <div className="hidden xl:block">
            <SceneList scene={clock.scene} t={clock.t} playing={playing} stopped={stopped} onJump={step} reduced={reduced} />
          </div>
          <div ref={ctaRef} className="min-w-0">
            <div className="mb-4 flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:gap-6 sm:text-left">
              <div className="flex flex-col gap-0.5">
                <p className="text-balance text-[17px] font-medium tracking-[-0.01em] text-foreground sm:text-[19px]">This is how the terminal actually looks and functions</p>
                <p className="text-[12.5px] text-muted-foreground">{FREE_NOTE}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2.5">
                <button type="button" onClick={onTry} className={cn(PRIMARY_CTA, "h-11 px-6 text-[15px] font-normal")}>
                  Try it now
                  <span aria-hidden>→</span>
                </button>
                <a
                  href="#market-path"
                  onClick={onLearn}
                  className="flex h-11 items-center justify-center gap-1.5 rounded-full border border-border bg-background/80 px-6 text-[15px] font-normal text-primary backdrop-blur transition-all ease-out hover:bg-muted active:scale-95"
                >
                  Learn more
                  <span aria-hidden>↓</span>
                </a>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-[28px] px-[3%] pb-[3%] pt-[8%] xl:pt-[3%]">
              <Image
                src={heroBackdrop}
                alt=""
                fill
                priority
                placeholder="blur"
                sizes="(min-width: 1280px) 80vw, 100vw"
                className="pointer-events-none select-none object-cover"
                style={{ maskImage: "linear-gradient(to bottom, transparent 0%, black 22%)", WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 22%)" }}
              />
              <div className="relative">
                {near ? (
                  <ErrorBoundary name="HeroDemo" fallback={<DemoPlaceholder />}>
                    <HeroDemo clock={clock} paused={paused || stopped} onPause={setPaused} reduced={reduced} onReady={onReady} />
                  </ErrorBoundary>
                ) : (
                  <DemoPlaceholder />
                )}
              </div>
              {reduced ? null : (
                <div className="relative mt-[2.5%] flex justify-center">
                  <DemoDock scene={clock.scene} stopped={stopped} onToggle={toggle} onStep={step} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
