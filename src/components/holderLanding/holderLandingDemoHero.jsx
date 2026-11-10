"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
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
function SceneChecks({ scene, t, playing, onJump, reduced }) {
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

/**
 * The flagship hero: centred copy over a widescreen, recorded run of the real terminal. The check
 * line follows the demo's scenes; hovering the demo pauses it.
 */
export function DemoHero({ hero, ctaRef, onTry, onLearn, covered = false }) {
  const reduced = useReducedMotion();
  const rootRef = useRef(null);
  const { near, visible } = useVisible(rootRef);
  const [paused, setPaused] = useState(false);
  const [ready, setReady] = useState(false);
  const playing = ready && visible && !covered && !paused && !reduced;
  const clock = useDemoClock(playing);
  const { jump } = clock;
  useEffect(() => {
    if (reduced) jump(STILL_SCENE);
  }, [jump, reduced]);
  const onReady = useCallback(() => setReady(true), []);

  return (
    <section id="hero" ref={rootRef} className="relative w-full scroll-mt-0 overflow-hidden">
      <div className="w-full px-4 pb-12 pt-24 sm:px-8 md:pt-32 lg:px-10">
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
          <SceneChecks scene={clock.scene} t={clock.t} playing={playing} onJump={jump} reduced={reduced} />
          <div ref={ctaRef} className="flex flex-col items-center gap-2.5 pt-1">
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button type="button" onClick={onTry} className={cn(PRIMARY_CTA, "h-12 px-7 text-base font-normal")}>
                Try it now
                <span aria-hidden>→</span>
              </button>
              <a
                href="#market-path"
                onClick={onLearn}
                className="flex h-12 items-center justify-center gap-1.5 rounded-full border border-border bg-background/80 px-7 text-base font-normal text-primary backdrop-blur transition-all ease-out hover:bg-muted active:scale-95"
              >
                Learn more
                <span aria-hidden>↓</span>
              </a>
            </div>
            <p className="text-[12.5px] text-muted-foreground">{FREE_NOTE}</p>
          </div>
        </div>
        <div className="relative mx-auto -mt-16 w-full max-w-[84rem] sm:-mt-24">
          <div className="relative overflow-hidden rounded-[28px] px-[3%] pb-[3%] pt-[12%] sm:pt-[9%]">
            <Image
              src={heroBackdrop}
              alt=""
              fill
              priority
              placeholder="blur"
              sizes="(min-width: 1344px) 1344px, 100vw"
              className="pointer-events-none select-none object-cover"
              style={{ maskImage: "linear-gradient(to bottom, transparent 0%, black 26%)", WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 26%)" }}
            />
            <div className="relative">
              {near ? (
                <ErrorBoundary name="HeroDemo" fallback={<DemoPlaceholder />}>
                  <HeroDemo clock={clock} paused={paused} onPause={setPaused} reduced={reduced} onReady={onReady} />
                </ErrorBoundary>
              ) : (
                <DemoPlaceholder />
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
