"use client";

import { ArrowLeftRight, Flame, Radar, TrendingUp, Users, Zap } from "lucide-react";
import { useRef } from "react";

import { FeatureWindow, useInView, usePhases, useReducedMotion } from "@/components/sections/features/feature-kit";
import { cn } from "@/lib/utils";
import { JarvisOrb } from "./jarvis-orb";

const TONES = {
  hot: { label: "Hottest", icon: Flame, chip: "bg-orange-500/10 text-orange-600", dot: "#f97316" },
  print: { label: "Big print", icon: Zap, chip: "bg-[#a855f7]/10 text-[#a855f7]", dot: "#a855f7" },
  kalshi: { label: "Kalshi radar", icon: Radar, chip: "bg-[#10b981]/10 text-[#0f9f6e]", dot: "#10b981" },
  gap: { label: "Venue gap", icon: ArrowLeftRight, chip: "bg-[#2f6fed]/10 text-[#2f6fed]", dot: "#2f6fed" },
  holders: { label: "Fresh wallets", icon: Users, chip: "bg-amber-400/15 text-amber-600", dot: "#f59e0b" },
  surge: { label: "Volume surge", icon: TrendingUp, chip: "bg-sky-500/10 text-sky-600", dot: "#0ea5e9" },
} as const;

const SIGNALS: readonly {
  tone: keyof typeof TONES;
  venue: string;
  title: string;
  detail: string;
  angle: number;
  radius: number;
}[] = [
  { tone: "hot", venue: "Polymarket", title: "Fed cuts rates in December?", detail: "$4.2M traded in 24h", angle: -40, radius: 0.55 },
  { tone: "print", venue: "Polymarket", title: "BUY YES · $182K @ 64¢", detail: "Wallet 0x7a3f…c91e, largest in the tape", angle: 30, radius: 0.78 },
  { tone: "kalshi", venue: "Kalshi", title: "Recession in 2026?", detail: "YES 31¢, up 4¢ today", angle: 110, radius: 0.42 },
  { tone: "gap", venue: "Both", title: "Bitcoin above $150K by Dec 31?", detail: "Kalshi 22¢ vs Polymarket 27¢", angle: 175, radius: 0.7 },
  { tone: "holders", venue: "Polymarket", title: "House control after 2026?", detail: "3 brand-new wallets bought YES", angle: 235, radius: 0.5 },
  { tone: "surge", venue: "Polymarket", title: "Ethereum above $5K in December?", detail: "Volume 3.1× its 7-day average", angle: 290, radius: 0.82 },
];

const DURATIONS = [1000, ...SIGNALS.map(() => 1250), 3000] as const;

export function PulseRadarDemo() {
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef);
  const reduced = useReducedMotion();
  const { phase, loop } = usePhases(DURATIONS, inView && !reduced);
  const shown = reduced ? SIGNALS.length : Math.min(phase, SIGNALS.length);
  const feed = SIGNALS.slice(0, shown).reverse();
  const done = shown === SIGNALS.length;

  return (
    <div ref={rootRef} className="size-full">
      <FeatureWindow title="Jarvis · pulse" className="size-full">
        <div className="relative hidden w-[44%] shrink-0 items-center justify-center border-r border-border bg-muted/40 p-5 sm:flex">
          <div className="relative aspect-square w-full max-w-[17rem]">
            {[1, 0.68, 0.36].map((scale) => (
              <span
                key={scale}
                className="absolute rounded-full border border-secondary/15"
                style={{ inset: `${((1 - scale) / 2) * 100}%` }}
              />
            ))}
            <span className="absolute inset-x-0 top-1/2 h-px bg-secondary/10" />
            <span className="absolute inset-y-0 left-1/2 w-px bg-secondary/10" />
            <span
              className="absolute inset-0 rounded-full [animation:jx-spin_3.6s_linear_infinite]"
              style={{
                background: "conic-gradient(from 0deg, transparent 0deg, transparent 270deg, rgba(47,111,237,0.32) 360deg)",
              }}
            />
            {SIGNALS.slice(0, shown).map((signal) => {
              const rad = (signal.angle * Math.PI) / 180;
              const color = TONES[signal.tone].dot;
              return (
                <span
                  key={`${signal.title}-${loop}`}
                  className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${50 + Math.cos(rad) * signal.radius * 50}%`, top: `${50 + Math.sin(rad) * signal.radius * 50}%` }}
                >
                  <span
                    className="absolute inset-0 rounded-full [animation:jx-blip_.5s_ease-out_both]"
                    style={{ backgroundColor: color, boxShadow: `0 0 12px ${color}` }}
                  />
                  <span
                    className="absolute -inset-1.5 rounded-full border-2 [animation:jx-ping_1.8s_ease-out_infinite]"
                    style={{ borderColor: color }}
                  />
                </span>
              );
            })}
            <JarvisOrb className="absolute inset-[38%]" />
          </div>
          <p className="absolute inset-x-0 bottom-3 text-center font-mono text-[10px] text-muted-foreground">
            Polymarket + Kalshi · live
          </p>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-border px-3.5">
            <span className="min-w-0 truncate text-xs font-medium text-primary">Pulse #{128 + loop}</span>
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[10.5px] font-medium transition-colors",
                done ? "bg-[#10b981]/10 text-[#0f9f6e]" : "bg-[#2f6fed]/10 text-[#2f6fed]",
              )}
            >
              <span className={cn("size-1.5 rounded-full", done ? "bg-[#10b981]" : "animate-pulse bg-[#2f6fed]")} />
              {done ? "Brief ready" : "Scanning"}
            </span>
          </div>

          <div className="relative min-h-0 flex-1 overflow-hidden">
            <ul className="flex flex-col gap-2 p-3">
              {feed.map((signal, i) => {
                const tone = TONES[signal.tone];
                const Icon = tone.icon;
                return (
                  <li
                    key={`${signal.title}-${loop}`}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg border border-border bg-background px-2.5 py-2 shadow-sm",
                      i === 0 && !done && "[animation:jx-pop_.45s_cubic-bezier(.165,.84,.44,1)_both]",
                    )}
                  >
                    <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-md", tone.chip)}>
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <span className="font-medium">{tone.label}</span>·<span>{signal.venue}</span>
                      </span>
                      <span className="block truncate text-[12px] font-medium text-primary">{signal.title}</span>
                      <span className="block truncate text-[10.5px] text-muted-foreground">{signal.detail}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
            {shown === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <Radar className="size-5 animate-pulse text-secondary" />
                <p className="text-[11px] text-muted-foreground">Scanning both venues…</p>
              </div>
            ) : null}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-background to-transparent" />
          </div>

          <div className="flex h-7 shrink-0 items-center justify-between gap-2 border-t border-border px-3 text-[10px] text-muted-foreground">
            <span className="font-mono">lychee.jarvis_pulse</span>
            <span key={shown} className="truncate font-mono tabular-nums [animation:fx-rise_.3s_both]">
              {shown} signal{shown === 1 ? "" : "s"} · runs every turn
            </span>
          </div>
        </div>
      </FeatureWindow>
    </div>
  );
}
