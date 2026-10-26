"use client";

import { useEffect, useRef, useState } from "react";

import { AgentSteps, formatElapsed } from "@/components/dashboardComposer/agentSteps";

const STEPS = [
  { name: "open_demo_workspace" },
  { name: "connect_venues", args: { venues: ["kalshi", "polymarket"] } },
  { name: "load_data_sheets", args: { source: "kalshi_historical", rows: 100 } },
  { name: "render_dashboard" },
];
const STEP_MS = 700;

/** Shown while the demo bundle downloads; the last step keeps running until the demo mounts. */
export function DemoLoadingCard() {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [active, setActive] = useState(0);
  const elapsedRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const start = Date.now();
    setStartedAt(start);
    const stepTimers = STEPS.slice(1).map((_, index) =>
      window.setTimeout(() => setActive(index + 1), (index + 1) * STEP_MS),
    );
    // This card is a Suspense fallback. Re-rendering it on every tick restarts React's
    // low-priority retry of the suspended demo, which then never commits, so the clock
    // writes to the DOM directly.
    const tick = window.setInterval(() => {
      if (elapsedRef.current) elapsedRef.current.textContent = formatElapsed(Date.now() - start);
    }, 100);
    return () => {
      stepTimers.forEach((timer) => window.clearTimeout(timer));
      window.clearInterval(tick);
    };
  }, []);

  const steps = STEPS.map((step, index) => {
    const done = index < active;
    return {
      ...step,
      id: step.name,
      status: done ? "success" : index === active ? "running" : "pending",
      startedAt: done && startedAt != null ? startedAt + index * STEP_MS : undefined,
      completedAt: done && startedAt != null ? startedAt + (index + 1) * STEP_MS : undefined,
    };
  });

  return (
    <div className="flex size-full items-start justify-center bg-[#f5f5f5] p-6 pt-16 sm:pt-24 dark:bg-[#1e1e1e]">
      <section
        role="status"
        aria-label="Loading the demo"
        className="flex w-[min(440px,calc(100%-2rem))] flex-col overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm"
      >
        <header className="flex items-start justify-between gap-3 border-b border-border/70 px-4 py-3">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-foreground">Generating your demo</p>
            <p className="mt-0.5 truncate text-[12px] text-muted-foreground">Lychee demo workspace</p>
          </div>
          <span ref={elapsedRef} className="shrink-0 font-mono text-[11px] tabular-nums text-neutral-400" />
        </header>
        <div className="px-4 py-3">
          <AgentSteps steps={steps} now={startedAt ?? 0} />
        </div>
      </section>
    </div>
  );
}
