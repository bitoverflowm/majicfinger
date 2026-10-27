"use client";

import { motion } from "framer-motion";
import { Play } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { FeatureWindow, GREEN, RED, useInView, useReducedMotion } from "./feature-kit";

const RULES = [
  { key: "entry", before: "Buy yes under", options: ["25¢", "30¢", "35¢"] },
  { key: "mentions", before: "when X mentions jump", options: ["1.5×", "2×", "3×"] },
  { key: "exit", before: "sell at", options: ["+10¢", "+15¢", "+20¢"] },
] as const;

const N = 40;
const W = 300;
const H = 110;

function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function simulate(picks: readonly number[]) {
  const rand = mulberry32(picks[0] * 9 + picks[1] * 3 + picks[2] + 7);
  const edge = 0.35 + picks[1] * 0.28 - Math.abs(picks[0] - 1) * 0.18 + (picks[2] === 1 ? 0.2 : 0);
  const equity = [100];
  const hold = [100];
  for (let i = 1; i < N; i++) {
    equity.push(equity[i - 1] + edge + (rand() - 0.45) * 3.2);
    hold.push(hold[i - 1] + 0.12 + (rand() - 0.5) * 2.4);
  }
  const trades = Array.from({ length: 9 }, (_, k) => {
    const i = 3 + Math.floor((k / 9) * (N - 5)) + Math.floor(rand() * 3);
    return { i, win: equity[Math.min(N - 1, i + 2)] >= equity[i] };
  });
  let peak = equity[0];
  let drawdown = 0;
  for (const v of equity) {
    peak = Math.max(peak, v);
    drawdown = Math.max(drawdown, (peak - v) / peak);
  }
  const wins = trades.filter((t) => t.win).length;
  return {
    equity,
    hold,
    trades,
    stats: [
      { label: "Return", value: `${equity[N - 1] >= 100 ? "+" : ""}${(equity[N - 1] - 100).toFixed(1)}%` },
      { label: "vs hold", value: `${equity[N - 1] - hold[N - 1] >= 0 ? "+" : ""}${(equity[N - 1] - hold[N - 1]).toFixed(1)}%` },
      { label: "Win rate", value: `${Math.round((wins / trades.length) * 100)}%` },
      { label: "Max drawdown", value: `−${(drawdown * 100).toFixed(1)}%` },
    ],
  };
}

type Stage = "idle" | "running" | "done";

export function GrowthBacktestDemo() {
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef);
  const reduced = useReducedMotion();
  const [picks, setPicks] = useState<number[]>([1, 1, 1]);
  const [changed, setChanged] = useState<number | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [run, setRun] = useState(0);
  const [manual, setManual] = useState(false);
  const autoStep = useRef(0);

  const result = useMemo(() => simulate(picks), [picks]);

  useEffect(() => {
    if (reduced) setStage("done");
  }, [reduced]);

  useEffect(() => {
    if (!inView || reduced) return;
    let timer = 0;
    if (stage === "idle") timer = window.setTimeout(() => setStage("running"), manual ? 0 : 700);
    else if (stage === "running") timer = window.setTimeout(() => setStage("done"), 1300);
    else if (!manual) {
      timer = window.setTimeout(() => {
        const rule = autoStep.current++ % RULES.length;
        setPicks((p) => p.map((v, i) => (i === rule ? (v + 1) % RULES[i].options.length : v)));
        setChanged(rule);
        setRun((r) => r + 1);
        setStage("idle");
      }, 4600);
    }
    return () => window.clearTimeout(timer);
  }, [inView, reduced, stage, manual]);

  const rerun = (patch?: { rule: number }) => {
    setManual(true);
    if (patch) {
      setPicks((p) => p.map((v, i) => (i === patch.rule ? (v + 1) % RULES[i].options.length : v)));
      setChanged(patch.rule);
    }
    setRun((r) => r + 1);
    setStage("running");
  };

  const all = [...result.equity, ...result.hold];
  const min = Math.min(...all) - 2;
  const max = Math.max(...all) + 2;
  const x = (i: number) => (i / (N - 1)) * W;
  const y = (v: number) => 6 + (1 - (v - min) / (max - min)) * (H - 12);
  const path = (arr: number[]) => arr.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const done = stage === "done";

  return (
    <div ref={rootRef} className="size-full">
      <FeatureWindow title="Lychee Terminal" className="size-full">
        <div className="flex min-w-0 flex-1 flex-col gap-2.5 p-3">
          <div className="rounded-lg border border-border p-2.5">
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Strategy</p>
            <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11.5px] leading-6 text-primary">
              {RULES.map((rule, i) => (
                <span key={rule.key} className="inline-flex items-center gap-1.5">
                  {rule.before}
                  <button
                    type="button"
                    onClick={() => rerun({ rule: i })}
                    className={cn(
                      "rounded-md border px-1.5 font-mono text-[11px] leading-5 transition-all duration-300",
                      changed === i && stage !== "done"
                        ? "border-[#2f6fed] bg-[#2f6fed] text-white"
                        : "border-[#2f6fed]/30 bg-[#2f6fed]/10 text-[#2f6fed] hover:border-[#2f6fed]",
                    )}
                  >
                    {rule.options[picks[i]]}
                  </button>
                  {i < RULES.length - 1 ? <span className="text-muted-foreground">,</span> : null}
                </span>
              ))}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => rerun()}
              className="inline-flex h-7 items-center gap-1.5 rounded-md bg-primary px-2.5 text-[11px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              <Play className="size-3" /> Run backtest
            </button>
            <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-muted">
              {stage === "running" ? (
                <motion.div
                  key={run}
                  className="absolute inset-y-0 left-0 rounded-full bg-[#2f6fed]"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 1.25, ease: "easeInOut" }}
                />
              ) : done ? (
                <div className="absolute inset-0 rounded-full bg-[#10b981]" />
              ) : null}
            </div>
            <span className="w-28 shrink-0 text-right text-[10.5px] text-muted-foreground">
              {stage === "running" ? "Replaying 24,180 trades" : done ? "Done in 1.2s" : "Ready"}
            </span>
          </div>

          <div className="relative min-h-0 flex-1 rounded-lg border border-border p-2.5">
            <div className="mb-1 flex items-center gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="h-0.5 w-3 rounded-full bg-[#2f6fed]" /> Strategy
              </span>
              <span className="flex items-center gap-1">
                <span className="h-0 w-3 border-t border-dashed border-neutral-400" /> Buy and hold
              </span>
              <span className="ml-auto font-mono">Jan to Oct</span>
            </div>
            <div className={cn("relative h-[calc(100%-1.25rem)] transition-opacity duration-300", !done && "opacity-30")}>
              <motion.div
                key={`${run}-${done}`}
                className="size-full"
                initial={{ clipPath: done ? "inset(0 100% 0 0)" : "inset(0 0% 0 0)" }}
                animate={{ clipPath: "inset(0 0% 0 0)" }}
                transition={{ duration: 1.2, ease: [0.165, 0.84, 0.44, 1] }}
              >
                <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="size-full overflow-visible">
                  <defs>
                    <linearGradient id="gb-fill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#2f6fed" stopOpacity="0.22" />
                      <stop offset="100%" stopColor="#2f6fed" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d={path(result.hold)} fill="none" stroke="#94a3b8" strokeWidth="1.25" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />
                  <path d={`${path(result.equity)} L${W} ${H} L0 ${H} Z`} fill="url(#gb-fill)" />
                  <path d={path(result.equity)} fill="none" stroke="#2f6fed" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                </svg>
              </motion.div>
              {done
                ? result.trades.map((t, k) => (
                    <motion.span
                      key={`${run}-${k}`}
                      className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white dark:ring-neutral-900"
                      style={{
                        left: `${(x(t.i) / W) * 100}%`,
                        top: `${(y(result.equity[t.i]) / H) * 100}%`,
                        backgroundColor: t.win ? GREEN : RED,
                      }}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.25 + (t.i / N) * 1.1, type: "spring", stiffness: 420, damping: 18 }}
                    />
                  ))
                : null}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {result.stats.map((s, i) => (
              <motion.div
                key={`${s.label}-${run}-${done}`}
                className="rounded-lg bg-muted px-2 py-1.5"
                initial={done ? { opacity: 0, y: 6 } : false}
                animate={{ opacity: done ? 1 : 0.4, y: 0 }}
                transition={{ delay: done ? 0.9 + i * 0.08 : 0, duration: 0.4 }}
              >
                <p className="truncate text-[9.5px] text-muted-foreground">{s.label}</p>
                <p
                  className={cn(
                    "font-mono text-xs font-medium tabular-nums",
                    s.value.startsWith("−") ? "text-[#e5484d]" : s.value.startsWith("+") ? "text-[#0f9f6e]" : "text-primary",
                  )}
                >
                  {done ? s.value : "—"}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </FeatureWindow>
    </div>
  );
}
