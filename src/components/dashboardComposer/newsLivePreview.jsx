"use client";

import { useEffect, useState } from "react";
import { Newspaper } from "lucide-react";
import { cn } from "@/lib/utils";

const HEADLINES = [
  { title: "Futures nudge higher ahead of Fed speakers", source: "Reuters", age: "2m" },
  { title: "Bitcoin holds above key support as ETF flow turns", source: "Bloomberg", age: "5m" },
  { title: "Storm track shifts — weather markets reprice", source: "AP", age: "8m" },
  { title: "Chipmakers rally on AI capex guidance", source: "WSJ", age: "12m" },
  { title: "Oil slips after inventory surprise", source: "FT", age: "18m" },
];

const PHASES = [
  { id: "listen", ms: 2000 },
  { id: "filter", ms: 1800 },
  { id: "arrive", ms: 2400 },
  { id: "sheet", ms: 2800 },
];

/** Picker preview for News Live: filtered headlines stream into a live sheet. */
export function NewsLivePreview() {
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

  const id = PHASES[phase]?.id || "sheet";
  const visible = id === "listen" ? 2 : id === "filter" ? 3 : HEADLINES.length;

  return (
    <div className="mt-5 overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm">
      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2.5">
        <Newspaper className="size-3.5 text-muted-foreground" aria-hidden />
        <span className="text-[12px] font-semibold text-foreground">News Live</span>
        <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
          <span className="relative flex size-1.5" aria-hidden>
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
          </span>
          {id === "sheet" ? "Live sheet" : "Streaming"}
        </span>
      </div>
      <div className="relative min-h-[220px] bg-[#f7fafc] p-3 dark:bg-[#141a21]">
        <div
          className={cn(
            "absolute inset-x-3 top-3 space-y-2 transition-all duration-700 ease-out",
            id === "sheet" ? "translate-y-2 scale-[0.97] opacity-35" : "opacity-100",
          )}
        >
          {HEADLINES.slice(0, visible).map((item, index) => (
            <div
              key={item.title}
              className="animate-in fade-in slide-in-from-top-2 fill-mode-both rounded-lg border border-border/60 bg-background px-3 py-2 shadow-sm"
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <p className="text-[12px] font-medium leading-snug text-foreground">{item.title}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {item.source} · {item.age} ago
              </p>
            </div>
          ))}
        </div>
        <div
          className={cn(
            "absolute inset-x-3 bottom-3 overflow-hidden rounded-lg border border-border/70 bg-background shadow-md transition-all duration-700 ease-out",
            id === "sheet" || id === "arrive" ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0",
          )}
        >
          <div className="grid grid-cols-[1.5fr_0.45fr_0.35fr] gap-0 border-b border-border/50 bg-muted/40 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            <span>Title</span>
            <span>Source</span>
            <span>Age</span>
          </div>
          {HEADLINES.slice(0, 4).map((item, index) => (
            <div
              key={`row-${item.title}`}
              className="grid grid-cols-[1.5fr_0.45fr_0.35fr] gap-0 border-b border-border/40 px-2.5 py-1.5 text-[11px] last:border-b-0"
              style={{
                opacity: id === "sheet" || index < (id === "arrive" ? 2 : 0) ? 1 : 0.3,
                transition: "opacity 400ms ease",
              }}
            >
              <span className="truncate font-medium text-foreground">{item.title}</span>
              <span className="truncate text-muted-foreground">{item.source}</span>
              <span className="tabular-nums text-muted-foreground">{item.age}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
