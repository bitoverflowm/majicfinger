"use client";

import Image from "next/image";
import { useRef } from "react";
import { Lightbulb, Pause, Play } from "lucide-react";
import { useHolderSession } from "@/components/terminals/holder/holderSession";
import { cn } from "@/lib/utils";
import exploreBackdrop from "../../../public/landing/feature-explore-lake.jpg";
import insightsBackdrop from "../../../public/landing/feature-insights.jpg";
import { LandingPanel } from "./landingPanels";
import { StageTips } from "./landingTips";

const BACKDROPS = { market: exploreBackdrop, trader: insightsBackdrop };

function StatusChip() {
  const session = useHolderSession();
  let label = "Connecting";
  let on = false;
  if (session?.view === "market") {
    if (session.meta?.closed) label = "Closed market";
    else if (session.live) [label, on] = ["Live", true];
  } else if (session?.view === "trader") {
    if (session.activity?.status === "ready") [label, on] = ["Live", true];
  } else {
    label = "Waiting";
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
      <span className={cn("relative flex size-2", !on && "opacity-60")} aria-hidden>
        {on ? <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500/60 motion-reduce:hidden" /> : null}
        <span className={cn("relative inline-flex size-2 rounded-full", on ? "bg-emerald-500" : "bg-neutral-400")} />
      </span>
      {label}
    </span>
  );
}

function ChromeButton({ label, pressed, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-black/[0.06] hover:text-foreground dark:hover:bg-white/10"
    >
      {children}
    </button>
  );
}

/**
 * The live terminal window for the step on screen: window chrome with the subject, live status and
 * tour controls, one panel at a time (it rises in when the step changes), and the step's tips over it.
 */
export function StoryStage({ chapter, steps, activeIndex, title, story, tour, inline = false }) {
  const step = steps[activeIndex] || steps[0];
  const scrollerRef = useRef(null);
  const overlayRef = useRef(null);
  const session = useHolderSession();
  const ready = !!session?.subject;
  const label = (session?.view === "trader" ? session.displayName : session?.meta?.title) || title;
  const backdrop = BACKDROPS[chapter.kind] || exploreBackdrop;

  return (
    <div className={cn("relative overflow-hidden rounded-xl bg-muted p-2 sm:p-3", inline ? "h-[34rem]" : "h-full")}>
      <div className="relative h-full overflow-hidden rounded-lg">
        <Image src={backdrop} alt="" fill placeholder="blur" sizes="(min-width: 1024px) 60vw, 100vw" className="pointer-events-none select-none object-cover" />
        <div className={cn("absolute flex", inline ? "inset-2 sm:inset-4" : "inset-3 sm:inset-5")}>
          <div
            className="holder-landing-stage flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-black/10 bg-background shadow-[0_24px_60px_-20px_rgba(15,23,42,0.45)] dark:border-white/10"
            onPointerDown={tour.onTakeOver}
          >
            <div className="relative flex h-9 shrink-0 items-center gap-3 border-b border-border bg-muted px-3.5">
              <div className="flex gap-1.5" aria-hidden>
                <span className="size-2.5 rounded-full bg-neutral-300 dark:bg-neutral-600" />
                <span className="size-2.5 rounded-full bg-neutral-300 dark:bg-neutral-600" />
                <span className="size-2.5 rounded-full bg-neutral-300 dark:bg-neutral-600" />
              </div>
              <span className="min-w-0 flex-1 truncate text-center text-[11px] font-medium text-muted-foreground">
                Holder Terminal{label ? ` · ${label}` : ""}
              </span>
              <div className="flex shrink-0 items-center gap-1.5">
                <StatusChip />
                <ChromeButton label={tour.tipsHidden ? "Show tips" : "Hide tips"} pressed={!tour.tipsHidden} onClick={tour.toggleTips}>
                  <Lightbulb className="size-3.5" aria-hidden />
                </ChromeButton>
                <ChromeButton label={tour.paused ? "Resume the tour and alerts" : "Pause the tour and alerts"} pressed={tour.paused} onClick={tour.togglePause}>
                  {tour.paused ? <Play className="size-3.5" aria-hidden /> : <Pause className="size-3.5" aria-hidden />}
                </ChromeButton>
              </div>
            </div>
            {inline ? null : (
              <nav aria-label="Steps" className="flex shrink-0 items-center gap-1 border-b border-border/60 px-3 py-1.5">
                {steps.map((item, index) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    title={item.nav}
                    aria-current={index === activeIndex ? "step" : undefined}
                    className="group flex h-4 flex-1 items-center"
                  >
                    <span
                      className={cn(
                        "h-1 w-full rounded-full transition-colors duration-500",
                        index < activeIndex ? "bg-[#0d99ff]/45" : index === activeIndex ? "bg-[#0d99ff]" : "bg-border group-hover:bg-muted-foreground/40",
                      )}
                    />
                  </a>
                ))}
                <span className="ml-2 shrink-0 text-[11px] tabular-nums text-muted-foreground">
                  {activeIndex + 1} / {steps.length} · {step.nav}
                </span>
              </nav>
            )}
            <div ref={overlayRef} className="relative min-h-0 flex-1">
              <div ref={scrollerRef} className="absolute inset-0 overflow-y-auto overscroll-contain">
                {ready ? (
                  <div key={step.panel} className="animate-in fade-in-0 slide-in-from-bottom-6 duration-700 ease-out motion-reduce:animate-none">
                    <LandingPanel panel={step.panel} story={story} />
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center px-6 text-center text-[13px] text-muted-foreground">
                    {chapter.kind === "trader" ? "Pick a trader above to begin." : "Pick a market above to begin."}
                  </div>
                )}
              </div>
              {ready ? (
                <StageTips
                  stepKey={`${chapter.id}:${step.id}`}
                  tips={step.tips}
                  scrollerRef={scrollerRef}
                  overlayRef={overlayRef}
                  shown={tour.inView && !tour.tipsHidden}
                  autoplay={tour.autoplay}
                  reducedMotion={tour.reducedMotion}
                  onTakeOver={tour.onTakeOver}
                  onNextStep={tour.nextStep}
                  onHide={tour.hideTips}
                />
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
