"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

import { SCENES, subjectView } from "@/components/holderLanding/demo/demoScript";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { HOLDER_PATHS, holderTerminalHref } from "@/lib/holderLanding/pages";
import { retryImport } from "@/lib/retryImport";
import { cn } from "@/lib/utils";
import holderBackdrop from "../../../../public/landing/holder-hero-backdrop.jpg";
import { useReducedMotion } from "./feature-kit";

type Action = { title: string; body: string; scenes: readonly string[] };

/** In the order the saved demo flows, so each scene picks up where the one before left off. */
const ACTIONS: readonly Action[] = [
  {
    title: "Size up any trader",
    body: "Search a wallet and open its full record: profit over time, open bets, and every trade.",
    scenes: ["trader"],
  },
  {
    title: "Get alerted when they trade",
    body: "Keep a market or wallet open and new trades slide in with an alert as they land.",
    scenes: ["alerts"],
  },
  {
    title: "Find the story behind a move",
    body: "Headlines sit on the price chart. Click a burst of coverage to read what moved the odds.",
    scenes: ["news"],
  },
  {
    title: "Catch fresh wallets loading up",
    body: "Flag brand-new wallets, first-ever trades, and wallets quietly holding both sides.",
    scenes: ["holders"],
  },
  {
    title: "See who's underwater",
    body: "Find the prices current holders bought in at, and which side is sitting on losses.",
    scenes: ["supply"],
  },
  {
    title: "Check if smart money agrees",
    body: "Color holders by Lychee Skill Score and see whether YES or NO is backed by proven traders.",
    scenes: ["heatmap", "scores"],
  },
];

const sceneIndex = (id: string) => SCENES.findIndex((scene: { id: string }) => scene.id === id);
const SEQUENCE = ACTIONS.flatMap((action, owner) => action.scenes.map((id) => ({ scene: sceneIndex(id), owner })));
const ACTION_MS = ACTIONS.map((action) => action.scenes.reduce((sum, id) => sum + SCENES[sceneIndex(id)].ms, 0));
const TICK_MS = 100;
const DESIGN_RATIO = "1280 / 720";
/** Where reduced motion parks the demo: a market already open, nothing typing. */
const STILL_ACTION = ACTIONS.findIndex((action) => action.scenes.includes("holders"));

function DemoPlaceholder() {
  return (
    <div
      className="w-full rounded-xl border border-black/10 bg-background/80 shadow-[0_30px_80px_-30px_rgba(15,23,42,0.5)]"
      style={{ aspectRatio: DESIGN_RATIO }}
    />
  );
}

const HeroDemo = dynamic(() => retryImport(() => import("@/components/holderLanding/demo/heroDemo")), {
  ssr: false,
  loading: DemoPlaceholder,
});

/** Plays `SEQUENCE` in order while `running`, in the shape `HeroDemo` expects from its clock. */
function useActionClock(running: boolean) {
  const [state, setState] = useState({ step: 0, t: 0, run: 0 });
  const last = useRef(0);
  useEffect(() => {
    if (!running) return undefined;
    last.current = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const dt = Math.min(500, now - last.current);
      last.current = now;
      setState((prev) => {
        const t = prev.t + dt;
        if (t < SCENES[SEQUENCE[prev.step].scene].ms) return { ...prev, t };
        const step = (prev.step + 1) % SEQUENCE.length;
        return { step, t: 0, run: step === 0 ? prev.run + 1 : prev.run };
      });
    }, TICK_MS);
    return () => window.clearInterval(timer);
  }, [running]);

  const goTo = useCallback((step: number) => setState((prev) => ({ step, t: 0, run: prev.run + 1 })), []);
  /** The demo asks for a scene when it's clicked into, e.g. an alert opening its trader. */
  const jump = useCallback(
    (scene: number) => {
      const view = subjectView(SCENES[scene].subject);
      const step = SEQUENCE.findIndex((entry) => subjectView(SCENES[entry.scene].subject) === view);
      if (step >= 0) goTo(step);
    },
    [goTo],
  );

  const goToAction = useCallback(
    (index: number) => goTo(SEQUENCE.findIndex((entry) => entry.owner === index)),
    [goTo],
  );

  const { step, t, run } = state;
  const { owner } = SEQUENCE[step];
  const before = SEQUENCE.slice(0, step)
    .filter((entry) => entry.owner === owner)
    .reduce((sum, entry) => sum + SCENES[entry.scene].ms, 0);
  return {
    clock: { scene: SEQUENCE[step].scene, t, run, jump, next: SEQUENCE[(step + 1) % SEQUENCE.length].scene },
    action: owner,
    progress: Math.min(1, (before + t) / ACTION_MS[owner]),
    goToAction,
  };
}

/** Starts loading the demo once it's close to the screen, and says whether it's on screen now. */
function useVisible(ref: RefObject<HTMLElement | null>) {
  const [state, setState] = useState({ near: false, visible: false });
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => setState((prev) => ({ near: prev.near || entry.isIntersecting, visible: entry.isIntersecting })),
      { rootMargin: "300px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return state;
}

const PRIMARY_BUTTON =
  "inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-white/[0.12] bg-secondary px-5 text-sm font-medium text-primary-foreground shadow-[inset_0_1px_2px_rgba(255,255,255,0.25),0_3px_3px_-1.5px_rgba(16,24,40,0.06),0_1px_1px_rgba(16,24,40,0.08)] transition-all ease-out hover:bg-secondary/80 active:scale-95 dark:text-secondary-foreground";

export function HolderTerminalShowcase() {
  const rootRef = useRef<HTMLElement>(null);
  const { near, visible } = useVisible(rootRef);
  const reduced = useReducedMotion();
  const [ready, setReady] = useState(false);
  const [paused, setPaused] = useState(false);
  const playing = ready && visible && !paused && !reduced;
  const { clock, action, progress, goToAction } = useActionClock(playing);
  const onReady = useCallback(() => setReady(true), []);
  useEffect(() => {
    if (reduced) goToAction(STILL_ACTION);
  }, [reduced, goToAction]);

  return (
    <article
      id="holder-terminal"
      ref={rootRef}
      className="grid scroll-mt-28 overflow-hidden rounded-xl bg-muted ring-1 ring-secondary/20 lg:grid-cols-3"
    >
      <div className="p-2 sm:p-3 lg:col-span-2">
        <div className="relative flex h-full items-center overflow-hidden rounded-lg p-3 sm:p-6 lg:p-8">
          <Image
            src={holderBackdrop}
            alt=""
            fill
            placeholder="blur"
            sizes="(min-width: 1344px) 860px, (min-width: 1024px) 64vw, 100vw"
            className="pointer-events-none select-none object-cover"
          />
          <div className="relative w-full">
            {near ? (
              <ErrorBoundary name="HolderTerminalShowcase" fallback={<DemoPlaceholder />}>
                <HeroDemo clock={clock} paused={paused} onPause={setPaused} reduced={reduced} onReady={onReady} />
              </ErrorBoundary>
            ) : (
              <DemoPlaceholder />
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col justify-center gap-5 p-6 sm:p-8 lg:px-8 xl:px-10">
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground">
          <span className="rounded-full bg-gradient-to-r from-secondary to-[#7c5cff] px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-white">
            New
          </span>
          Polymarket Holder Terminal
        </span>
        <h3 className="max-w-md text-xl font-normal leading-snug tracking-tight text-primary sm:text-[1.3rem]">
          See who&apos;s really moving every Polymarket market.
        </h3>

        <ol className="flex flex-col border-l border-border">
          {ACTIONS.map((item, index) => {
            const active = index === action;
            return (
              <li key={item.title}>
                <button
                  type="button"
                  onClick={() => goToAction(index)}
                  aria-current={active ? "step" : undefined}
                  className={cn(
                    "relative -ml-px flex w-full flex-col border-l-2 py-1.5 pl-4 text-left transition-colors duration-300",
                    active ? "border-secondary" : "border-transparent hover:border-border",
                  )}
                >
                  <span
                    className={cn(
                      "text-[15px] leading-snug transition-colors duration-300",
                      active ? "font-medium text-primary" : "text-muted-foreground hover:text-primary",
                    )}
                  >
                    {item.title}
                  </span>
                  <span
                    className={cn(
                      "grid transition-[grid-template-rows,opacity] duration-500 ease-out",
                      active ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                    )}
                  >
                    <span className="overflow-hidden">
                      <span className="block pt-1 text-[13.5px] leading-relaxed text-muted-foreground">{item.body}</span>
                      {reduced ? null : (
                        <span className="mt-2 block h-0.5 overflow-hidden rounded-full bg-black/5 dark:bg-white/10" aria-hidden>
                          <span
                            className="block h-full bg-secondary"
                            style={{
                              width: `${active ? progress * 100 : 0}%`,
                              transition: playing ? `width ${TICK_MS}ms linear` : "none",
                            }}
                          />
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <Link href={holderTerminalHref()} className={PRIMARY_BUTTON}>
            Open the terminal →
          </Link>
          <Link href={HOLDER_PATHS.flagship} className="text-sm text-secondary transition-colors hover:text-primary">
            See how it works →
          </Link>
        </div>
      </div>
    </article>
  );
}
