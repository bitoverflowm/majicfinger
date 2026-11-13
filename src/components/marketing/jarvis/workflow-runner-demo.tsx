"use client";

import { Check, Globe, Loader2, Sparkles } from "lucide-react";
import { useRef } from "react";

import { FeatureWindow, useInView, useReducedMotion } from "@/components/sections/features/feature-kit";
import { CRAZY_WORKFLOWS } from "@/lib/mcp/data/crazyWorkflows";
import { cn } from "@/lib/utils";
import { useStepClock } from "./jarvis-kit";

type Workflow = { id: string; vibe: string; hook: string; tools: string[] };

const WORKFLOWS = (CRAZY_WORKFLOWS as Workflow[]).slice(0, 5).map((wf) => ({ ...wf, tools: wf.tools.slice(0, 5) }));

/** What each tool hands back in the demo. */
const RESULTS: Record<string, string> = {
  get_most_active_markets: "12 markets ranked by 24h volume",
  pull_market_bundle: "Price, holders, and tape charts in chat",
  analyze_holders: "Top 10 own 41% · 2 wallets on both sides",
  publish_project: "Public page + share image",
  compare_venues: "7 matched pairs · widest gap 5¢",
  preview_kalshi_market: "KXFEDDECISION · YES 61¢",
  add_insight_blocks: "4 insight notes written",
  search_closed_markets: "86 settled races found",
  preview_prices: "Last YES price 24h before close",
  analyze_calibration: "Brier 0.162 · reliability chart",
  pull_and_compose: "Charts composed",
  preview_holders: "Top 20 holders loaded",
  preview_trader: "0x7a3f…c91e · +$214K all-time",
  get_lookalike_markets: "3 related deadlines",
};

const LEAD_MS = 700;
const TOOL_MS = 1150;
const HOLD_MS = 2800;
const DURATIONS = WORKFLOWS.map((wf) => LEAD_MS + wf.tools.length * TOOL_MS + HOLD_MS);

export function WorkflowRunnerDemo() {
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef);
  const reduced = useReducedMotion();
  const { step, t, run, goTo } = useStepClock(DURATIONS, inView && !reduced);
  const wf = WORKFLOWS[step];
  const elapsed = reduced ? DURATIONS[step] : t;
  const finished = elapsed >= LEAD_MS + wf.tools.length * TOOL_MS;

  return (
    <div ref={rootRef} className="size-full">
      <FeatureWindow title="Jarvis · crazy workflows" className="size-full">
        <div className="hidden w-[34%] min-w-[10rem] shrink-0 flex-col border-r border-border sm:flex">
          <p className="px-3.5 pb-2 pt-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Workflows</p>
          <ul className="flex flex-col gap-1 px-2 pb-3">
            {WORKFLOWS.map((item, i) => {
              const active = i === step;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => goTo(i)}
                    className={cn(
                      "relative flex w-full items-center gap-2 overflow-hidden rounded-lg px-2 py-2 text-left transition-colors",
                      active ? "bg-muted" : "hover:bg-muted",
                    )}
                  >
                    <Sparkles className={cn("size-3.5 shrink-0", active ? "text-secondary" : "text-muted-foreground")} />
                    <span className={cn("truncate text-xs", active ? "font-medium text-primary" : "text-muted-foreground")}>
                      {item.vibe}
                    </span>
                    {active && !reduced ? (
                      <span
                        key={run}
                        className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-secondary [animation:fx-fill_linear_both]"
                        style={{ animationDuration: `${DURATIONS[i]}ms` }}
                      />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div key={`head-${run}`} className="shrink-0 border-b border-border px-3.5 py-2.5 [animation:fx-rise_.35s_both]">
            <p className="truncate text-xs font-medium text-primary">{wf.vibe}</p>
            <p className="line-clamp-2 text-[10.5px] leading-snug text-muted-foreground">{wf.hook}</p>
          </div>

          <ol key={`tools-${run}`} className="relative flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden p-3">
            <span className="absolute bottom-6 left-[1.6rem] top-6 w-px bg-border" aria-hidden />
            {wf.tools.map((tool, i) => {
              const start = LEAD_MS + i * TOOL_MS;
              const state = elapsed >= start + TOOL_MS ? "done" : elapsed >= start ? "running" : "queued";
              return (
                <li
                  key={tool}
                  className={cn(
                    "relative flex items-start gap-2.5 rounded-lg px-1.5 py-1.5 transition-colors duration-300",
                    state === "running" && "bg-secondary/5",
                  )}
                >
                  <span
                    className={cn(
                      "relative z-10 flex size-5 shrink-0 items-center justify-center rounded-full border transition-all duration-300",
                      state === "done"
                        ? "border-transparent bg-[#10b981] text-white"
                        : state === "running"
                          ? "border-secondary bg-background text-secondary"
                          : "border-border bg-background text-muted-foreground",
                    )}
                  >
                    {state === "done" ? (
                      <Check className="size-3" strokeWidth={3} />
                    ) : state === "running" ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <span className="text-[9px] tabular-nums">{i + 1}</span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block truncate font-mono text-[11px] transition-colors",
                        state === "queued" ? "text-muted-foreground" : "text-primary",
                      )}
                    >
                      {tool}
                    </span>
                    {state === "done" ? (
                      <span className="block truncate text-[10.5px] text-muted-foreground [animation:fx-rise_.3s_both]">
                        {RESULTS[tool] ?? "Done"}
                      </span>
                    ) : state === "running" ? (
                      <span className="mt-1 block h-1.5 w-24 rounded fx-skeleton" />
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ol>

          <div className="shrink-0 border-t border-border p-2.5">
            {finished ? (
              <div className="flex items-center gap-2.5 rounded-lg bg-gradient-to-r from-secondary/10 via-[#7c5cff]/10 to-transparent px-2.5 py-2 [animation:jx-pop_.45s_both]">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-secondary to-[#7c5cff] text-white">
                  <Globe className="size-3.5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[11.5px] font-medium text-primary">Research ready</span>
                  <span className="block truncate text-[10.5px] text-muted-foreground">
                    {wf.tools.length} Lychee tools · charts in chat · one ask from published
                  </span>
                </span>
              </div>
            ) : (
              <p className="flex h-[2.6rem] items-center gap-2 px-1 text-[11px] text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin text-secondary" />
                Jarvis is running {wf.tools.length} Lychee tools…
              </p>
            )}
          </div>
        </div>
      </FeatureWindow>
    </div>
  );
}
