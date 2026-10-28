import { Mail } from "lucide-react";

import { BLUE, VIOLET, mulberry32 } from "@/components/sections/features/feature-kit";
import { cn } from "@/lib/utils";

const POINTS = 32;
const CHART_W = 280;
const CHART_H = 72;

const ODDS = (() => {
  const rand = mulberry32(42);
  let kalshi = 48;
  let poly = 45;
  return Array.from({ length: POINTS }, (_, i) => {
    const drift = i > 20 ? 1.1 : 0.35;
    kalshi = Math.min(70, Math.max(38, kalshi + drift + (rand() - 0.5) * 3));
    poly = Math.min(68, Math.max(36, kalshi - 3 + (rand() - 0.5) * 2.4));
    return { kalshi: Math.round(kalshi), poly: Math.round(poly) };
  });
})();

const MIN = Math.min(...ODDS.map((p) => p.poly)) - 2;
const MAX = Math.max(...ODDS.map((p) => p.kalshi)) + 2;

function path(key: "kalshi" | "poly") {
  return ODDS.map((p, i) => {
    const x = (i / (POINTS - 1)) * CHART_W;
    const y = 4 + (1 - (p[key] - MIN) / (MAX - MIN)) * (CHART_H - 8);
    return `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");
}

const LAST = ODDS[ODDS.length - 1];

const UPDATES = [
  { tag: "Research", color: "text-[#2f6fed] bg-[#2f6fed]/10", title: "Are 90% markets 90% likely?", when: "Mon" },
  { tag: "Guide", color: "text-[#0f9f6e] bg-[#10b981]/10", title: "Kalshi trades in a sheet", when: "Wed" },
  { tag: "New", color: "text-[#a855f7] bg-[#a855f7]/10", title: "15-min crypto terminals", when: "Thu" },
  { tag: "Offer", color: "text-orange-600 bg-orange-500/10 dark:text-orange-400", title: "Black Friday first look", when: "Soon" },
] as const;

const STYLES = `
@keyframes nl-draw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
.nl-draw { stroke-dasharray: 1; stroke-dashoffset: 1; animation: nl-draw 1.6s .25s ease-out forwards; }
@media (prefers-reduced-motion: reduce) {
  .nl-draw { animation: none; stroke-dashoffset: 0; }
  .nl-rise { animation: none !important; }
}
`;

const rise = "nl-rise animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-both duration-500";

/** Left panel of the newsletter popup: a glimpse of the market research subscribers receive. */
export function NewsletterPreview({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("relative flex-col justify-center gap-3 overflow-hidden border-border bg-muted p-6", className)}
    >
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(127,127,127,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(127,127,127,0.08)_1px,transparent_1px)] bg-[size:24px_24px]" />
      <div className="pointer-events-none absolute -left-16 -top-16 size-56 rounded-full bg-[#2f6fed]/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -right-12 size-56 rounded-full bg-[#a855f7]/15 blur-3xl" />

      <div className={cn("relative rounded-xl border border-border bg-background p-3.5 shadow-sm", rise)}>
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span className="uppercase tracking-wider">This week’s research</span>
          <span className="flex items-center gap-1">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#10b981]/60" />
              <span className="relative inline-flex size-1.5 rounded-full bg-[#10b981]" />
            </span>
            Live
          </span>
        </div>
        <p className="mt-1.5 text-[13px] font-medium text-primary">Fed cuts rates in December?</p>
        <div className="mt-2 flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1 text-muted-foreground">
            <span className="size-1.5 rounded-full" style={{ background: BLUE }} />
            Kalshi <span className="font-mono text-primary">{LAST.kalshi}¢</span>
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <span className="size-1.5 rounded-full" style={{ background: VIOLET }} />
            Polymarket <span className="font-mono text-primary">{LAST.poly}¢</span>
          </span>
          <span className="ml-auto rounded-full bg-[#2f6fed]/10 px-1.5 py-0.5 font-mono text-[10px] text-[#2f6fed]">
            {LAST.kalshi - LAST.poly}¢ gap
          </span>
        </div>
        <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} preserveAspectRatio="none" className="mt-2 h-[72px] w-full">
          {[0.25, 0.5, 0.75].map((f) => (
            <line
              key={f}
              x1="0"
              x2={CHART_W}
              y1={CHART_H * f}
              y2={CHART_H * f}
              stroke="currentColor"
              className="text-border"
              strokeDasharray="2 4"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <path d={path("poly")} pathLength={1} className="nl-draw" fill="none" stroke={VIOLET} strokeWidth="1.75" vectorEffect="non-scaling-stroke" />
          <path d={path("kalshi")} pathLength={1} className="nl-draw" fill="none" stroke={BLUE} strokeWidth="1.75" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>

      <div className={cn("relative overflow-hidden rounded-xl border border-border bg-background shadow-sm", rise)} style={{ animationDelay: "120ms" }}>
        <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5 text-[11px]">
          <span className="flex items-center gap-1.5 font-medium text-primary">
            <Mail className="size-3.5 text-muted-foreground" />
            Lychee updates
          </span>
          <span className="text-muted-foreground">{UPDATES.length} new</span>
        </div>
        <ul className="divide-y divide-border">
          {UPDATES.map((item, i) => (
            <li
              key={item.title}
              className={cn("flex items-center gap-2.5 px-3.5 py-2.5", rise)}
              style={{ animationDelay: `${300 + i * 140}ms` }}
            >
              <span className={cn("w-14 shrink-0 rounded px-1.5 py-0.5 text-center text-[10px] font-medium", item.color)}>
                {item.tag}
              </span>
              <span className="min-w-0 flex-1 truncate text-[12px] text-primary">{item.title}</span>
              <span className="shrink-0 text-[10px] text-muted-foreground">{item.when}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
