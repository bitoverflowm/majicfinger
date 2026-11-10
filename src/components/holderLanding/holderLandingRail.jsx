"use client";

import Link from "next/link";
import { forwardRef } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const FREE_NOTE = "Free plan · no credit card needed";

export const PRIMARY_CTA =
  "flex items-center justify-center gap-1.5 rounded-full border border-white/[0.12] bg-secondary text-primary-foreground shadow-[inset_0_1px_2px_rgba(255,255,255,0.25),0_3px_3px_-1.5px_rgba(16,24,40,0.06),0_1px_1px_rgba(16,24,40,0.08)] transition-all ease-out hover:bg-secondary/80 active:scale-95 dark:text-secondary-foreground";

/**
 * Every chapter and step on the page, following the scroll: the step on screen is marked, the ones
 * read are ticked, and the terminal is one click away underneath.
 */
export function PageRail({ page, progress, subjects, terminalHref }) {
  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Page contents" className="flex flex-col gap-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">On this page</p>
        {page.chapters.map((chapter, chapterIndex) => {
          const state = progress[chapterIndex];
          const reading = !!state?.inBand;
          return (
            <div key={chapter.id} className="flex flex-col">
              <a href={`#${chapter.id}`} className={cn("text-[13px] font-medium transition-colors", reading ? "text-foreground" : "text-muted-foreground hover:text-foreground")}>
                {chapter.label}
              </a>
              {subjects[chapterIndex] ? <p className="truncate pt-0.5 text-[11.5px] text-muted-foreground">{subjects[chapterIndex]}</p> : null}
              <ol className="mt-2.5 flex flex-col border-l border-border">
                {chapter.steps.map((step, stepIndex) => {
                  const current = reading && state.active === stepIndex;
                  const read = state ? stepIndex < (state.furthest ?? -1) || (reading && stepIndex < state.active) : false;
                  return (
                    <li key={step.id}>
                      <a
                        href={`#${step.id}`}
                        aria-current={current ? "step" : undefined}
                        className={cn(
                          "-ml-px flex items-center gap-2 border-l-2 py-[5px] pl-3 text-[12.5px] leading-tight transition-colors",
                          current ? "border-[#0d99ff] font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-4 shrink-0 items-center justify-center rounded-full text-[9.5px] tabular-nums transition-colors",
                            current ? "bg-[#0d99ff] text-white" : read ? "bg-[#0d99ff]/15 text-[#0b7fd4]" : "bg-muted text-muted-foreground",
                          )}
                          aria-hidden
                        >
                          {read && !current ? <Check className="size-2.5" strokeWidth={3} /> : stepIndex + 1}
                        </span>
                        {step.nav}
                      </a>
                    </li>
                  );
                })}
              </ol>
            </div>
          );
        })}
        <a href="#faq" className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground">
          FAQ
        </a>
      </nav>
      <div className="rounded-xl border border-border bg-muted/60 p-4">
        <p className="text-[13px] font-medium leading-snug text-foreground">Use it on any market or wallet</p>
        <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">Every panel on this page, live in the free terminal.</p>
        <Link href={terminalHref} prefetch={false} className={cn(PRIMARY_CTA, "mt-3 h-9 w-full text-[13px]")}>
          Open the free terminal <span aria-hidden>→</span>
        </Link>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">{FREE_NOTE}</p>
      </div>
    </div>
  );
}

/** A thin bar pinned to the bottom of small screens once the hero's buttons have scrolled away. */
export function MobileCtaBar({ shown, label, terminalHref }) {
  return (
    <div
      aria-hidden={!shown}
      className={cn(
        "fixed inset-x-3 bottom-3 z-40 flex items-center gap-3 rounded-2xl border border-border bg-background/95 p-2 pl-4 shadow-[0_12px_32px_-8px_rgba(15,23,42,0.35)] backdrop-blur transition-all duration-300 lg:hidden",
        shown ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-[150%] opacity-0",
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12.5px] font-medium text-foreground">{label}</p>
        <p className="text-[11px] text-muted-foreground">{FREE_NOTE}</p>
      </div>
      <Link href={terminalHref} prefetch={false} tabIndex={shown ? undefined : -1} className={cn(PRIMARY_CTA, "h-10 shrink-0 px-4 text-[13px]")}>
        Open free <span aria-hidden>→</span>
      </Link>
    </div>
  );
}

/** The closing ask: the page's promise, the terminal, and a way back to try another subject. */
export const FinalCta = forwardRef(function FinalCta({ page, terminalHref, searchLabel }, ref) {
  return (
    <section ref={ref} id="get-started" aria-labelledby="get-started-title" className="scroll-mt-24 py-14 md:py-20">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-secondary/30 via-background to-muted px-6 py-12 text-center shadow-xl sm:px-10 md:py-16">
        <h2 id="get-started-title" className="mx-auto max-w-3xl text-balance text-[2rem] font-normal leading-[1.1] tracking-[-0.02em] text-foreground sm:text-[2.75rem]">
          {page.cta.title}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">{page.cta.body}</p>
        <ul className="mx-auto mt-6 flex max-w-2xl flex-wrap justify-center gap-x-5 gap-y-2 text-[13px] text-foreground">
          {page.hero.points.map((point) => (
            <li key={point} className="flex items-center gap-1.5">
              <Check className="size-3.5 text-emerald-600" strokeWidth={2.5} aria-hidden />
              {point}
            </li>
          ))}
        </ul>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href={terminalHref} prefetch={false} className={cn(PRIMARY_CTA, "h-12 px-6 text-base")}>
            Open the free terminal <span aria-hidden>→</span>
          </Link>
          <a
            href="#hero"
            className="flex h-12 items-center justify-center rounded-full border border-border bg-muted px-6 text-base text-primary transition-all ease-out hover:bg-muted/70 active:scale-95"
          >
            {searchLabel}
          </a>
        </div>
        <p className="mt-3 text-[12.5px] text-muted-foreground">{FREE_NOTE}</p>
      </div>
    </section>
  );
});
