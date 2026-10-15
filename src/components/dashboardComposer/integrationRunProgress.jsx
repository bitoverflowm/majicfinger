"use client";

import { useEffect, useState } from "react";
import { Check, ChevronDown, CircleDashed, X } from "lucide-react";
import { composeFailureMessage } from "@/components/dashboardComposer/integrationRunFeed";
import { cn } from "@/lib/utils";

const KEYFRAMES = `
@keyframes su-pop { 0% { opacity: 0; transform: scale(0.85) } 100% { opacity: 1; transform: none } }
`;

const STATUS_STYLES = {
  pending: "bg-neutral-300 dark:bg-neutral-600",
  running: "bg-sky-500/80 motion-safe:animate-pulse",
  success: "bg-emerald-500/80",
  error: "bg-red-500/80",
  cancelled: "bg-neutral-400 dark:bg-neutral-500",
};

function formatElapsed(ms) {
  const seconds = Math.max(0, ms) / 1000;
  return `${seconds.toFixed(1)}s`;
}

function duration(step, now) {
  if (!step?.startedAt) return null;
  const end = step.completedAt || (step.status === "running" ? now : null);
  if (!end) return null;
  return formatElapsed(end - step.startedAt);
}

export function AgentSteps({ steps, variant = "Default", now = Date.now(), className }) {
  const compact = variant === "Compact";
  return (
    <ol className={cn("w-full max-w-[480px] text-[13px]", className)}>
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />
      {steps.map((step, index) => (
        <StepRow key={step.id} step={step} last={index === steps.length - 1} compact={compact} now={now} />
      ))}
    </ol>
  );
}

function StepRow({ step, last, compact, now }) {
  const [open, setOpen] = useState(() => step.status === "running" || Boolean(step.result) || Boolean(step.children?.length));
  useEffect(() => {
    if (step.status === "running" || step.result || step.children?.length) setOpen(true);
  }, [step.status, step.result, step.children?.length]);
  const elapsed = duration(step, now);
  const expandable = !compact && Boolean(step.result || step.children?.length);

  return (
    <li className="relative flex gap-3">
      <div className="flex flex-col items-center">
        <span className="grid size-5 shrink-0 place-items-center">
          {step.status === "success" ? (
            <span className="grid size-4 place-items-center rounded-full bg-emerald-500/15 text-emerald-600 motion-safe:animate-[su-pop_200ms_cubic-bezier(0.23,1,0.32,1)_both] dark:text-emerald-400">
              <Check className="size-2.5" strokeWidth={3} />
            </span>
          ) : step.status === "error" ? (
            <span className="grid size-4 place-items-center rounded-full bg-red-500/15 text-red-600 motion-safe:animate-[su-pop_200ms_cubic-bezier(0.23,1,0.32,1)_both] dark:text-red-400">
              <X className="size-2.5" strokeWidth={3} />
            </span>
          ) : step.status === "pending" ? (
            <CircleDashed className="size-3.5 text-neutral-300 dark:text-neutral-600" />
          ) : (
            <span className={cn("size-2 rounded-full", STATUS_STYLES[step.status] || STATUS_STYLES.running)} />
          )}
        </span>
        {!last ? <span className="w-px flex-1 bg-black/[0.07] dark:bg-white/[0.08]" /> : null}
      </div>

      <div className={cn("min-w-0 flex-1", last ? "pb-0" : compact ? "pb-2.5" : "pb-4")}>
        <button
          type="button"
          onClick={expandable ? () => setOpen((value) => !value) : undefined}
          aria-expanded={expandable ? open : undefined}
          className={cn(
            "flex w-full items-center gap-2 text-left",
            expandable && "rounded transition-transform duration-150 active:scale-[0.995] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400",
          )}
        >
          <span className="truncate font-mono text-[12px] font-medium text-neutral-800 dark:text-neutral-200">{step.name}</span>
          {step.status === "running" ? (
            <span className="font-mono text-[10px] uppercase tracking-wide text-sky-600 dark:text-sky-400">running</span>
          ) : null}
          {step.status === "pending" ? (
            <span className="font-mono text-[10px] uppercase tracking-wide text-neutral-400 dark:text-neutral-600">queued</span>
          ) : null}
          <span className="ml-auto flex shrink-0 items-center gap-1.5">
            {elapsed ? <span className="font-mono text-[10px] tabular-nums text-neutral-400 dark:text-neutral-600">{elapsed}</span> : null}
            {expandable ? (
              <ChevronDown
                className={cn(
                  "size-3 text-neutral-400 transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
                  open && "rotate-180",
                )}
              />
            ) : null}
          </span>
        </button>

        {!compact && step.args ? (
          <p className="mt-1 truncate font-mono text-[11px] text-neutral-400 dark:text-neutral-600">{JSON.stringify(step.args)}</p>
        ) : null}

        {expandable ? (
          <div
            className="grid transition-[grid-template-rows] duration-[240ms] ease-[cubic-bezier(0.32,0.72,0,1)]"
            style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
          >
            <div className="overflow-hidden">
              {step.result ? (
                <p className="mt-2 rounded-lg bg-black/[0.03] px-2.5 py-2 text-[12px] leading-[1.6] text-neutral-600 dark:bg-white/[0.04] dark:text-neutral-400">
                  {composeFailureMessage(step.result)}
                </p>
              ) : null}
              {step.children?.length ? (
                <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                  {step.children.map((child) => (
                    <div key={child.id} className="rounded-lg border border-black/[0.06] px-2.5 py-2 dark:border-white/[0.07]">
                      <div className="flex items-center gap-1.5">
                        <span className={cn("size-1.5 shrink-0 rounded-full", STATUS_STYLES[child.status] || STATUS_STYLES.pending)} />
                        <span className="truncate font-mono text-[11px] font-medium text-neutral-700 dark:text-neutral-300">{child.name}</span>
                        {child.parallel ? (
                          <span className="ml-auto font-mono text-[9px] uppercase tracking-wide text-neutral-400 dark:text-neutral-600">parallel</span>
                        ) : null}
                      </div>
                      {child.result ? <p className="mt-1 text-[11px] leading-[1.5] text-neutral-500">{composeFailureMessage(child.result)}</p> : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </li>
  );
}

function runSucceeded(feed) {
  if (feed?.status !== "done") return false;
  return (feed.steps || []).every((step) => {
    if (step.status === "error") return false;
    return !(step.children || []).some((child) => child.status === "error");
  });
}

export function RunProgressCard({ feed, onDismiss, onReplay }) {
  const [now, setNow] = useState(() => Date.now());
  const live = feed?.status === "running";
  useEffect(() => {
    if (!live) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(timer);
  }, [live]);
  if (!feed?.steps?.length) return null;
  const elapsed = formatElapsed((feed.completedAt || now) - (feed.startedAt || now));
  const succeeded = runSucceeded(feed);
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 top-[var(--dashboard-tab-clearance,0px)] z-30 flex items-center justify-center p-6">
      <section
        data-run-progress=""
        className="pointer-events-auto flex max-h-[min(72vh,680px)] w-[min(440px,calc(100%-2rem))] flex-col overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm"
      >
        <header className="flex items-start justify-between gap-3 border-b border-border/70 px-4 py-3">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-foreground">
              {feed.status === "error" ? feed.failLabel || "Pull failed" : feed.status === "done" ? feed.doneLabel || "Pull finished" : feed.runningLabel || "Composing this tab"}
            </p>
            <p className="mt-0.5 truncate text-[12px] text-muted-foreground">{feed.title}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="font-mono text-[11px] tabular-nums text-neutral-400">{elapsed}</span>
            {feed.status === "running" ? null : (
              <>
                {feed.status === "error" && onReplay ? (
                  <button
                    type="button"
                    onClick={onReplay}
                    className="rounded-md bg-foreground px-2 py-0.5 text-[12px] font-medium text-background hover:opacity-90"
                  >
                    Replay
                  </button>
                ) : null}
                <button type="button" onClick={onDismiss} className="rounded-md px-1.5 py-0.5 text-[12px] font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground">
                  Close
                </button>
              </>
            )}
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-auto px-4 py-3">
          <AgentSteps steps={feed.steps} now={now} />
        </div>
        {succeeded ? (
          <footer className="shrink-0 border-t border-border/70 px-4 py-3">
            <p className="text-[13px] font-semibold text-foreground">Your dashboard is ready</p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">{feed.readyDetail || "The sheets are on the canvas behind this card."}</p>
            <button
              type="button"
              onClick={onDismiss}
              className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-foreground px-3 py-2 text-[13px] font-medium text-background hover:opacity-90"
            >
              View dashboard
            </button>
          </footer>
        ) : null}
      </section>
    </div>
  );
}
