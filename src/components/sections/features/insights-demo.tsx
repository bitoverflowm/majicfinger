"use client";

import { ArrowUp, Sparkles } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { cn } from "@/lib/utils";
import { BLUE, FeatureWindow, GREEN, useInView, useReducedMotion } from "./feature-kit";

type Insight = {
  chip: string;
  question: string;
  thinking: readonly string[];
  headline: readonly (string | { hl: string })[];
  stats: readonly { label: string; value: string }[];
  chart: "spike" | "gap" | "bars";
};

const INSIGHTS: readonly Insight[] = [
  {
    chip: "Fed market before CPI",
    question: "Did the Fed cut market move before the CPI print?",
    thinking: ["Reading 24,180 trades", "Lining up the CPI release", "Writing it up"],
    headline: ["Yes. It climbed from ", { hl: "62¢ to 71¢" }, " in the 40 minutes before CPI, on ", { hl: "3.1×" }, " normal volume."],
    stats: [
      { label: "Move", value: "+9¢" },
      { label: "Volume", value: "3.1×" },
      { label: "Led by", value: "Kalshi" },
    ],
    chart: "spike",
  },
  {
    chip: "Kalshi vs Polymarket",
    question: "Where do Kalshi and Polymarket disagree the most?",
    thinking: ["Matching 1,912 markets", "Comparing prices", "Writing it up"],
    headline: ["Biggest gap is the NBA Finals: ", { hl: "Kalshi 41¢" }, " vs ", { hl: "Polymarket 37¢" }, ", and it is closing."],
    stats: [
      { label: "Spread", value: "4¢" },
      { label: "Volume", value: "$1.2M" },
      { label: "Trend", value: "−0.3¢/hr" },
    ],
    chart: "gap",
  },
  {
    chip: "Unusual volume today",
    question: "Which markets traded unusual volume today?",
    thinking: ["Scanning today's trades", "Checking weekly averages", "Writing it up"],
    headline: [{ hl: "3 markets" }, " traded more than ", { hl: "5×" }, " their weekly average, led by the Fed cut."],
    stats: [
      { label: "Flagged", value: "3" },
      { label: "Top", value: "7.4×" },
      { label: "Since", value: "08:30" },
    ],
    chart: "bars",
  },
];

type Stage = "idle" | "typing" | "thinking" | "answer";

export function InsightsDemo() {
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef);
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [stage, setStage] = useState<Stage>("idle");
  const [typed, setTyped] = useState(0);
  const [thinkStep, setThinkStep] = useState(0);
  const [asked, setAsked] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [manual, setManual] = useState(false);

  const insight = INSIGHTS[index];

  useEffect(() => {
    if (reduced) {
      setAsked(INSIGHTS[0].question);
      setStage("answer");
    }
  }, [reduced]);

  useEffect(() => {
    if (!inView || reduced) return;
    let timer = 0;
    if (stage === "idle" && !manual) {
      timer = window.setTimeout(() => {
        setTyped(0);
        setStage("typing");
      }, 600);
    } else if (stage === "typing") {
      if (typed < insight.question.length) {
        timer = window.setTimeout(() => setTyped(typed + 1), 28 + Math.random() * 30);
      } else {
        timer = window.setTimeout(() => {
          setAsked(insight.question);
          setThinkStep(0);
          setStage("thinking");
        }, 380);
      }
    } else if (stage === "thinking") {
      timer = window.setTimeout(() => {
        if (thinkStep + 1 < insight.thinking.length) setThinkStep(thinkStep + 1);
        else setStage("answer");
      }, 700);
    } else if (stage === "answer" && !manual) {
      timer = window.setTimeout(() => {
        setIndex((index + 1) % INSIGHTS.length);
        setStage("idle");
      }, 5200);
    }
    return () => window.clearTimeout(timer);
  }, [inView, reduced, stage, typed, thinkStep, index, insight, manual]);

  const ask = (next: number, question?: string) => {
    setManual(true);
    setIndex(next);
    setAsked(question || INSIGHTS[next].question);
    setDraft("");
    setThinkStep(0);
    setStage("thinking");
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    ask((index + 1) % INSIGHTS.length, text);
  };

  const inputText = stage === "typing" ? insight.question.slice(0, typed) : draft;
  const busy = stage === "thinking" || stage === "typing";

  return (
    <div ref={rootRef} className="size-full">
      <FeatureWindow title="Ask Lychee" className="size-full">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="relative min-h-0 flex-1 overflow-hidden px-4 pt-4">
            {asked ? (
              <div className="flex justify-end [animation:fx-rise_.35s_both]" key={`q-${asked}`}>
                <p className="max-w-[80%] rounded-2xl rounded-br-md bg-muted px-3 py-2 text-xs text-primary">{asked}</p>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 pb-10 text-center">
                <span className="flex size-9 items-center justify-center rounded-full bg-[#2f6fed]/10 text-[#2f6fed]">
                  <Sparkles className="size-4" />
                </span>
                <p className="text-xs text-muted-foreground">Ask anything about any market.</p>
              </div>
            )}

            {stage === "thinking" ? (
              <div className="mt-3 flex items-center gap-2 text-xs">
                <span className="relative flex size-4 items-center justify-center">
                  <span className="absolute inset-0 animate-spin rounded-full border-[1.5px] border-[#2f6fed] border-r-transparent" />
                </span>
                <span key={thinkStep} className="[animation:fx-rise_.3s_both]">
                  <span className="fx-shimmer-text">{insight.thinking[thinkStep]}…</span>
                </span>
              </div>
            ) : null}

            {stage === "answer" && asked ? <Answer key={`${index}-${asked}`} insight={insight} /> : null}
          </div>

          <div className="shrink-0 px-3 pb-3">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {INSIGHTS.map((item, i) => (
                <button
                  key={item.chip}
                  type="button"
                  onClick={() => ask(i)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[10.5px] transition-colors",
                    i === index && stage !== "idle"
                      ? "border-[#2f6fed] bg-[#2f6fed]/10 text-[#2f6fed]"
                      : "border-border text-muted-foreground hover:border-neutral-400 hover:text-primary",
                  )}
                >
                  {item.chip}
                </button>
              ))}
            </div>
            <form
              onSubmit={submit}
              className={cn(
                "flex items-center gap-2 rounded-xl border bg-background px-3 py-2 transition-shadow",
                busy ? "border-[#2f6fed] shadow-[0_0_0_3px_rgba(47,111,237,0.12)]" : "border-border",
              )}
            >
              <input
                value={inputText}
                onChange={(e) => {
                  setManual(true);
                  if (stage === "typing") setStage("idle");
                  setDraft(e.target.value);
                }}
                placeholder="Ask about any market…"
                aria-label="Ask Lychee a question"
                className="min-w-0 flex-1 bg-transparent text-xs text-primary outline-none placeholder:text-muted-foreground"
              />
              <button
                type="submit"
                aria-label="Send"
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full transition-colors",
                  inputText ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                )}
              >
                <ArrowUp className="size-3.5" />
              </button>
            </form>
          </div>
        </div>
      </FeatureWindow>
    </div>
  );
}

function Answer({ insight }: { insight: Insight }) {
  let word = 0;
  return (
    <div className="mt-3 flex flex-col gap-2.5">
      <p className="text-[13px] leading-relaxed text-primary">
        {insight.headline.map((part, i) => {
          const text = typeof part === "string" ? part : part.hl;
          const words = text.split(/(\s+)/);
          return (
            <span key={i} className={typeof part === "string" ? undefined : "font-medium text-[#2f6fed]"}>
              {words.map((w, j) => {
                if (!w.trim()) return w;
                const delay = word++ * 45;
                return (
                  <span key={j} className="inline-block [animation:fx-word_.4s_both]" style={{ animationDelay: `${delay}ms` }}>
                    {w}
                  </span>
                );
              })}
            </span>
          );
        })}
      </p>
      <div className="rounded-lg border border-border p-2.5 [animation:fx-rise_.5s_.35s_both]">
        <InsightChart kind={insight.chart} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {insight.stats.map((s, i) => (
          <div
            key={s.label}
            className="rounded-lg bg-muted px-2.5 py-1.5 [animation:fx-rise_.45s_both]"
            style={{ animationDelay: `${700 + i * 90}ms` }}
          >
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
            <p className="font-mono text-xs font-medium tabular-nums text-primary">{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

const W = 320;
const H = 84;

const SPIKE = [61, 62, 61.5, 62, 62.2, 61.8, 62, 62.4, 63, 64.5, 66, 68.5, 70, 71, 70.6, 70.8, 71.2, 70.9];
const KALSHI = [44, 43.6, 43.8, 43.1, 42.9, 42.6, 42.4, 42.1, 41.9, 41.6, 41.4, 41.2, 41];
const POLY = [37.2, 37.1, 37.4, 37, 36.8, 36.9, 37, 36.8, 36.9, 37, 37, 36.9, 37];
const BARS = [
  { name: "Fed cut", x: 7.4 },
  { name: "NBA Finals", x: 5.8 },
  { name: "BTC 100k", x: 5.2 },
  { name: "CPI > 3%", x: 1.6 },
  { name: "Oscars", x: 1.2 },
  { name: "Rain NYC", x: 0.9 },
];

function scale(values: readonly number[], min: number, max: number) {
  return values.map((v, i) => ({
    x: (i / (values.length - 1)) * W,
    y: 6 + (1 - (v - min) / (max - min)) * (H - 12),
  }));
}

const toPath = (pts: { x: number; y: number }[]) =>
  pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");

function InsightChart({ kind }: { kind: Insight["chart"] }) {
  const [hover, setHover] = useState<number | null>(null);

  if (kind === "bars") {
    return (
      <div className="flex h-[5.25rem] items-end gap-2">
        {BARS.map((b, i) => {
          const hot = b.x >= 5;
          return (
            <div key={b.name} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
              <span className={cn("font-mono text-[9.5px] tabular-nums", hot ? "text-[#2f6fed]" : "text-muted-foreground")}>
                {b.x}×
              </span>
              <span
                className="w-full origin-bottom rounded-sm [animation:fx-grow_.6s_ease-out_both]"
                style={{
                  height: `${(b.x / 7.4) * 62}%`,
                  backgroundColor: hot ? BLUE : "rgba(148,163,184,0.45)",
                  animationDelay: `${450 + i * 70}ms`,
                }}
              />
              <span className="w-full truncate text-center text-[9px] text-muted-foreground">{b.name}</span>
            </div>
          );
        })}
      </div>
    );
  }

  const lines =
    kind === "spike"
      ? [{ pts: scale(SPIKE, 60, 72), color: GREEN, name: "Yes", values: SPIKE }]
      : [
          { pts: scale(KALSHI, 35, 45), color: "#28CC95", name: "Kalshi", values: KALSHI },
          { pts: scale(POLY, 35, 45), color: "#2E5CFF", name: "Polymarket", values: POLY },
        ];
  const n = lines[0].pts.length;
  const cpiX = (13 / (SPIKE.length - 1)) * W;
  const preX = (9 / (SPIKE.length - 1)) * W;

  return (
    <div
      className="relative"
      onMouseLeave={() => setHover(null)}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setHover(Math.max(0, Math.min(n - 1, Math.round(((e.clientX - rect.left) / rect.width) * (n - 1)))));
      }}
    >
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-[5.25rem] w-full overflow-visible">
        {kind === "spike" ? (
          <>
            <rect x={preX} y="0" width={cpiX - preX} height={H} fill={BLUE} opacity="0.08" />
            <line x1={cpiX} x2={cpiX} y1="0" y2={H} stroke={BLUE} strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
          </>
        ) : (
          <path
            d={`${toPath(lines[0].pts)} ${toPath([...lines[1].pts].reverse()).replace(/^M/, "L")} Z`}
            fill={BLUE}
            opacity="0.08"
          />
        )}
        <g className="[animation:fx-draw_1.2s_.45s_ease-out_both]">
          {lines.map((l) => (
            <path key={l.name} d={toPath(l.pts)} fill="none" stroke={l.color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
          ))}
        </g>
        {hover !== null ? (
          <line x1={lines[0].pts[hover].x} x2={lines[0].pts[hover].x} y1="0" y2={H} stroke="#94a3b8" vectorEffect="non-scaling-stroke" />
        ) : null}
      </svg>
      {kind === "spike" ? (
        <span
          className="pointer-events-none absolute top-0 -translate-x-1/2 rounded bg-[#2f6fed] px-1.5 py-0.5 text-[9.5px] font-medium text-white [animation:fx-rise_.4s_1.3s_both]"
          style={{ left: `${(cpiX / W) * 100}%` }}
        >
          CPI 8:30
        </span>
      ) : null}
      {hover !== null ? (
        <div
          className="pointer-events-none absolute -top-1 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-primary px-2 py-1 font-mono text-[10px] text-primary-foreground shadow-lg"
          style={{ left: `${Math.min(85, Math.max(15, (lines[0].pts[hover].x / W) * 100))}%` }}
        >
          {lines.map((l) => `${l.name} ${l.values[hover]}¢`).join(" · ")}
        </div>
      ) : null}
    </div>
  );
}
