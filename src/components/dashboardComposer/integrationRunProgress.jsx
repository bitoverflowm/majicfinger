"use client";

import { useEffect, useRef, useState } from "react";
import { AgentSteps, formatElapsed } from "@/components/dashboardComposer/agentSteps";
import { FIRST_PULL_TIP_ID, FirstPullFeatureTip } from "@/components/dashboardComposer/buildFeatureTips";
import { dismissFeatureTip } from "@/components/ui/feature-tip";

function runSucceeded(feed) {
  if (feed?.status !== "done") return false;
  return (feed.steps || []).every((step) => {
    if (step.status === "error") return false;
    return !(step.children || []).some((child) => child.status === "error");
  });
}

export function RunProgressCard({ feed, onDismiss, onReplay }) {
  const [now, setNow] = useState(() => Date.now());
  const viewButtonRef = useRef(null);
  const live = feed?.status === "running";
  useEffect(() => {
    if (!live) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(timer);
  }, [live]);
  if (!feed?.steps?.length) return null;
  const elapsed = formatElapsed((feed.completedAt || now) - (feed.startedAt || now));
  const succeeded = runSucceeded(feed);
  const close = () => {
    if (succeeded && feed.firstPull) dismissFeatureTip(FIRST_PULL_TIP_ID);
    onDismiss?.();
  };
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
                <button type="button" onClick={close} className="rounded-md px-1.5 py-0.5 text-[12px] font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground">
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
              ref={viewButtonRef}
              type="button"
              onClick={close}
              className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-foreground px-3 py-2 text-[13px] font-medium text-background hover:opacity-90"
            >
              View dashboard
            </button>
            {feed.firstPull ? <FirstPullFeatureTip anchorRef={viewButtonRef} runId={feed.id} /> : null}
          </footer>
        ) : null}
      </section>
    </div>
  );
}
