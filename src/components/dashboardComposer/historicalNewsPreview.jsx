"use client";

import { useEffect, useState } from "react";
import { Newspaper } from "lucide-react";
import { cn } from "@/lib/utils";

const HEADLINES = [
  { title: "Fed holds rates steady as inflation cools", source: "Reuters", year: "2024" },
  { title: "Bitcoin ETF inflows hit weekly high", source: "Bloomberg", year: "2024" },
  { title: "Election markets price in razor-thin race", source: "AP", year: "2020" },
  { title: "Oil spikes after OPEC+ surprise cut", source: "FT", year: "2022" },
  { title: "AI chip demand reshapes semiconductor forecasts", source: "WSJ", year: "2023" },
  { title: "Storm season prompts new weather contracts", source: "CNBC", year: "2021" },
];

const PHASES = [
  { id: "scan", ms: 2200 },
  { id: "match", ms: 1800 },
  { id: "sheet", ms: 2600 },
  { id: "ready", ms: 2800 },
];

/**
 * Picker preview for Historical News: headlines stream in, then land as sheet rows.
 */
export function HistoricalNewsPreview() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setPhase(PHASES.length - 1);
      return undefined;
    }
    let index = 0;
    let timer = 0;
    const tick = () => {
      timer = window.setTimeout(() => {
        index = (index + 1) % PHASES.length;
        setPhase(index);
        tick();
      }, PHASES[index].ms);
    };
    tick();
    return () => window.clearTimeout(timer);
  }, []);

  const id = PHASES[phase]?.id || "ready";
  const visible = id === "scan" ? 2 : id === "match" ? 4 : HEADLINES.length;

  return (
    <div className="mt-5 overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm">
      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2.5">
        <Newspaper className="size-3.5 text-muted-foreground" aria-hidden />
        <span className="text-[12px] font-semibold text-foreground">Historical News</span>
        <span className="ml-auto text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {id === "ready" ? "Sheet ready" : id === "sheet" ? "Writing rows" : "Matching keywords"}
        </span>
      </div>
      <div className="relative min-h-[220px] bg-[#f7fafc] p-3 dark:bg-[#141a21]">
        <div
          className={cn(
            "absolute inset-x-3 top-3 space-y-2 transition-all duration-700 ease-out",
            id === "sheet" || id === "ready" ? "translate-y-2 scale-[0.97] opacity-40" : "opacity-100",
          )}
        >
          {HEADLINES.slice(0, visible).map((item, index) => (
            <div
              key={item.title}
              className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both rounded-lg border border-border/60 bg-background px-3 py-2 shadow-sm"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <p className="text-[12px] font-medium leading-snug text-foreground">{item.title}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {item.source} · {item.year}
              </p>
            </div>
          ))}
        </div>
        <div
          className={cn(
            "absolute inset-x-3 bottom-3 overflow-hidden rounded-lg border border-border/70 bg-background shadow-md transition-all duration-700 ease-out",
            id === "sheet" || id === "ready"
              ? "translate-y-0 opacity-100"
              : "translate-y-6 opacity-0",
          )}
        >
          <div className="grid grid-cols-[1.4fr_0.5fr_0.45fr] gap-0 border-b border-border/50 bg-muted/40 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            <span>Title</span>
            <span>Source</span>
            <span>Date</span>
          </div>
          {HEADLINES.slice(0, 4).map((item, index) => (
            <div
              key={`row-${item.title}`}
              className="grid grid-cols-[1.4fr_0.5fr_0.45fr] gap-0 border-b border-border/40 px-2.5 py-1.5 text-[11px] last:border-b-0"
              style={{
                opacity: id === "ready" || index < (id === "sheet" ? 3 : 0) ? 1 : 0.25,
                transition: "opacity 400ms ease",
              }}
            >
              <span className="truncate font-medium text-foreground">{item.title}</span>
              <span className="truncate text-muted-foreground">{item.source}</span>
              <span className="tabular-nums text-muted-foreground">{item.year}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
