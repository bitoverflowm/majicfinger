"use client";

import { useEffect, useState } from "react";
import { ArrowUp, Check, Download, Share2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const CSS = `
.rp-stage { --rp-dim: rgba(15, 23, 42, 0.38); --rp-ink: #0f172a; }
.dark .rp-stage { --rp-dim: rgba(255, 255, 255, 0.38); --rp-ink: #ffffff; }
@keyframes rp-spin { from { transform: translate(-50%, -50%) rotate(0deg) } to { transform: translate(-50%, -50%) rotate(360deg) } }
@keyframes rp-caret { 0%, 49% { opacity: 1 } 50%, 100% { opacity: 0 } }
@keyframes rp-shimmer { from { background-position: 150% 0 } to { background-position: -50% 0 } }
@keyframes rp-drift-a { 0%, 100% { transform: translate(0, 0) scale(1) } 50% { transform: translate(22%, 14%) scale(1.2) } }
@keyframes rp-drift-b { 0%, 100% { transform: translate(0, 0) scale(1.1) } 50% { transform: translate(-18%, -12%) scale(0.9) } }
@keyframes rp-sweep { from { transform: translateX(-100%) } to { transform: translateX(560%) } }
@keyframes rp-stream { from { transform: translateY(0) } to { transform: translateY(-50%) } }
@keyframes rp-fall { 0% { transform: translateY(0) scale(1); opacity: 0 } 20% { opacity: 1 } 100% { transform: translateY(150px) scale(0.4); opacity: 0 } }
@keyframes rp-draw { from { clip-path: inset(0 100% 0 0) } to { clip-path: inset(0 0 0 0) } }
@keyframes rp-ping { 0% { transform: scale(1); opacity: 0.7 } 100% { transform: scale(3.2); opacity: 0 } }
@keyframes rp-sheen { 0% { transform: translateX(-160%) skewX(-20deg) } 55%, 100% { transform: translateX(260%) skewX(-20deg) } }
@keyframes rp-orb { 0%, 100% { transform: scale(0.85); filter: hue-rotate(0deg) } 50% { transform: scale(1.15); filter: hue-rotate(70deg) } }
.rp-shimmer-text {
  background-image: linear-gradient(90deg, var(--rp-dim) 0%, var(--rp-dim) 40%, var(--rp-ink) 50%, var(--rp-dim) 60%, var(--rp-dim) 100%);
  background-size: 250% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: rp-shimmer 1.6s linear infinite;
}
@media (prefers-reduced-motion: reduce) {
  .rp-stage *, .rp-stage *::before, .rp-stage *::after { animation: none !important; transition: none !important; }
}
`;

const QUERY = "will bitcoin close above 100k this year";
const EASE = "cubic-bezier(0.32, 0.72, 0, 1)";

const PHASES = [
  { id: "prompt", ms: 2600 },
  { id: "scan", ms: 1700 },
  { id: "lock", ms: 1100 },
  { id: "pull", ms: 2700 },
  { id: "chart", ms: 2400 },
  { id: "ready", ms: 3000 },
];
const READY = PHASES.length - 1;
const STATUS = ["", "Thinking", "Thinking", "Working", "Composing", "Ready"];

const FAN = [
  { x: -72, y: 22, r: -11, s: 0.8 },
  { x: -38, y: 7, r: -5, s: 0.9 },
  { x: 0, y: -4, r: 0, s: 1 },
  { x: 38, y: 7, r: 5, s: 0.9 },
  { x: 72, y: 22, r: 11, s: 0.8 },
];

const SHEET_RECT = [
  { left: 8, top: 40, width: 84, height: 54, opacity: 0, blur: 10 },
  null,
  null,
  { left: 6, top: 27, width: 88, height: 67, opacity: 1, blur: 0 },
  { left: 3, top: 31, width: 58, height: 61, opacity: 0.35, blur: 2 },
  { left: 5, top: 28, width: 40, height: 66, opacity: 1, blur: 0 },
];

const CHART_RECT = [
  { left: 40, top: 30, width: 56, height: 62, opacity: 0, blur: 8 },
  null,
  null,
  null,
  { left: 27, top: 25, width: 69, height: 68, opacity: 1, blur: 0 },
  { left: 48, top: 28, width: 47, height: 44, opacity: 1, blur: 0 },
];

const YES_LINE = "M0,64 L12,60 L24,62 L36,53 L48,56 L60,47 L72,50 L84,41 L96,44 L108,36 L120,39 L132,30 L144,33 L156,26 L168,28 L180,21 L200,18";
const NO_LINE = "M0,36 L12,40 L24,38 L36,47 L48,44 L60,53 L72,50 L84,59 L96,56 L108,64 L120,61 L132,70 L144,67 L156,74 L168,72 L180,79 L200,82";

function rand(seed) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function rectStyle(table, phase) {
  let rect = table[0];
  for (let index = 0; index <= phase; index += 1) if (table[index]) rect = table[index];
  return {
    left: `${rect.left}%`,
    top: `${rect.top}%`,
    width: `${rect.width}%`,
    height: `${rect.height}%`,
    opacity: rect.opacity,
    filter: rect.blur ? `blur(${rect.blur}px)` : "none",
    transition: `left 800ms ${EASE}, top 800ms ${EASE}, width 800ms ${EASE}, height 800ms ${EASE}, opacity 600ms ease, filter 600ms ease`,
  };
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const onChange = () => setReduced(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

function useTimeline(paused) {
  const [state, setState] = useState({ phase: 0, loop: 0 });
  useEffect(() => {
    if (paused) return undefined;
    const timer = window.setTimeout(
      () => setState(({ phase, loop }) => (phase === READY ? { phase: 0, loop: loop + 1 } : { phase: phase + 1, loop })),
      PHASES[state.phase].ms,
    );
    return () => window.clearTimeout(timer);
  }, [paused, state.phase]);
  return paused ? { phase: READY, loop: 0 } : state;
}

function useTyped(text, active) {
  const [count, setCount] = useState(active ? 0 : text.length);
  useEffect(() => {
    if (!active) {
      setCount(text.length);
      return undefined;
    }
    setCount(0);
    const timer = window.setInterval(() => setCount((current) => Math.min(text.length, current + 1)), 42);
    return () => window.clearInterval(timer);
  }, [active, text]);
  return text.slice(0, count);
}

function useTick(active, ms = 110) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!active) return undefined;
    const timer = window.setInterval(() => setTick((current) => current + 1), ms);
    return () => window.clearInterval(timer);
  }, [active, ms]);
  return tick;
}

function useCountUp(target, active, ms) {
  const [value, setValue] = useState(target);
  useEffect(() => {
    if (!active) {
      setValue(target);
      return undefined;
    }
    const started = performance.now();
    let frame = 0;
    const step = (now) => {
      const t = Math.min(1, (now - started) / ms);
      setValue(Math.round(target * (1 - (1 - t) ** 3)));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [active, ms, target]);
  return value;
}

function Backdrop() {
  return (
    <>
      <div
        aria-hidden
        className="absolute inset-0 opacity-60 dark:opacity-40"
        style={{
          backgroundImage: "radial-gradient(circle at center, rgba(100,116,139,0.28) 1px, transparent 1.2px)",
          backgroundSize: "18px 18px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 78%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 78%)",
        }}
      />
      <div
        aria-hidden
        className="absolute -left-[10%] top-[10%] size-[55%] rounded-full opacity-50 blur-3xl dark:opacity-30"
        style={{ background: "radial-gradient(circle, rgba(47,111,237,0.45), transparent 65%)", animation: "rp-drift-a 11s ease-in-out infinite" }}
      />
      <div
        aria-hidden
        className="absolute -right-[8%] bottom-[2%] size-[50%] rounded-full opacity-40 blur-3xl dark:opacity-25"
        style={{ background: "radial-gradient(circle, rgba(16,185,129,0.45), transparent 65%)", animation: "rp-drift-b 13s ease-in-out infinite" }}
      />
    </>
  );
}

function PromptBar({ phase }) {
  const typed = useTyped(QUERY, phase === 0);
  const sent = typed.length === QUERY.length;
  const glowing = phase >= 1 && phase < READY;
  return (
    <div
      className="absolute left-1/2 top-[5%] z-20 w-[min(30rem,86%)]"
      style={{ transform: `translateX(-50%) scale(${phase >= 3 ? 0.93 : 1})`, transition: `transform 800ms ${EASE}` }}
    >
      <div className="relative overflow-hidden rounded-xl p-[1.5px] shadow-[0_10px_40px_-12px_rgba(15,23,42,0.25)]">
        <div aria-hidden className="absolute inset-0 bg-black/[0.08] dark:bg-white/[0.1]" />
        <div
          aria-hidden
          className="absolute left-1/2 top-1/2 aspect-square w-[150%]"
          style={{
            opacity: glowing ? 1 : 0,
            transition: "opacity 500ms ease",
            background: "conic-gradient(from 0deg, transparent 0 50%, #2f6fed 68%, #a855f7 80%, #10b981 92%, transparent 100%)",
            animation: "rp-spin 2.2s linear infinite",
          }}
        />
        <div className="relative flex h-11 items-center gap-2.5 rounded-[10.5px] bg-background px-3">
          <Sparkles className="size-4 shrink-0 text-[#2f6fed]" aria-hidden />
          <span className="min-w-0 truncate text-[13px] text-foreground">{typed}</span>
          {phase === 0 ? <span className="-ml-2 h-4 w-px shrink-0 bg-foreground" style={{ animation: "rp-caret 1s steps(1) infinite" }} /> : null}
          <span
            className={cn(
              "ml-auto grid size-7 shrink-0 place-items-center rounded-lg text-white transition-all duration-300",
              sent ? "bg-[#2f6fed] shadow-[0_0_18px_rgba(47,111,237,0.6)]" : "bg-black/20 dark:bg-white/20",
            )}
            style={{ transform: sent && phase === 0 ? "scale(1.08)" : "scale(1)" }}
          >
            <ArrowUp className="size-3.5" strokeWidth={2.5} aria-hidden />
          </span>
        </div>
      </div>
    </div>
  );
}

function AgentStatus({ phase }) {
  if (!phase) return null;
  const ready = phase === READY;
  return (
    <div className="absolute left-1/2 top-[15.5%] z-20 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap">
      {ready ? (
        <span className="grid size-4 place-items-center rounded-full bg-emerald-500 text-white animate-in zoom-in-50 duration-300">
          <Check className="size-2.5" strokeWidth={3.5} aria-hidden />
        </span>
      ) : (
        <span
          className="size-2.5 rounded-full"
          style={{ background: "conic-gradient(#2f6fed, #a855f7, #10b981, #2f6fed)", animation: "rp-orb 1.4s ease-in-out infinite" }}
        />
      )}
      <span
        key={STATUS[phase]}
        className={cn(
          "text-[12px] font-medium tracking-wide animate-in fade-in slide-in-from-bottom-1 duration-300",
          ready ? "text-emerald-700 dark:text-emerald-300" : "rp-shimmer-text",
        )}
      >
        {STATUS[phase]}
      </span>
    </div>
  );
}

function candidateStyle(index, phase) {
  const spot = FAN[index];
  const chosen = index === 2;
  const base = "translate(-50%, -50%)";
  let transform = `${base} translateY(36px) scale(0.85)`;
  let opacity = 0;
  let blur = 8;
  if (phase === 1) {
    transform = `${base} translateX(${spot.x}%) translateY(${spot.y}px) rotate(${spot.r}deg) scale(${spot.s})`;
    opacity = chosen ? 1 : Math.abs(spot.x) > 50 ? 0.55 : 0.8;
    blur = Math.abs(spot.x) > 50 ? 1.5 : 0;
  } else if (phase === 2) {
    transform = chosen
      ? `${base} scale(1.07)`
      : `${base} translateX(${spot.x * 1.5}%) translateY(${spot.y + 10}px) rotate(${spot.r * 1.6}deg) scale(${spot.s * 0.9})`;
    opacity = chosen ? 1 : 0;
    blur = chosen ? 0 : 8;
  } else if (phase >= 3) {
    transform = `${base} translateY(-56px) scale(0.86)`;
  }
  return {
    transform,
    opacity,
    filter: blur ? `blur(${blur}px)` : "none",
    transition: `transform 750ms ${EASE}, opacity 500ms ease, filter 500ms ease`,
    transitionDelay: phase === 1 ? `${Math.abs(index - 2) * 70}ms` : "0ms",
    zIndex: chosen ? 3 : 2 - Math.abs(index - 2),
  };
}

function Candidates({ phase }) {
  return (
    <>
      {FAN.map((_, index) => {
        const chosen = index === 2;
        return (
          <div
            key={index}
            className={cn(
              "absolute left-1/2 top-[45%] w-[36%] rounded-xl border bg-background p-3 shadow-[0_12px_30px_-12px_rgba(15,23,42,0.3)]",
              chosen && phase === 2
                ? "border-[#2f6fed] shadow-[0_0_0_4px_rgba(47,111,237,0.15),0_18px_40px_-12px_rgba(47,111,237,0.45)]"
                : "border-black/[0.08] dark:border-white/[0.1]",
            )}
            style={candidateStyle(index, phase)}
          >
            <div className="flex items-center gap-2">
              <span className={cn("size-1.5 rounded-full", chosen ? "bg-emerald-500" : "bg-black/20 dark:bg-white/25")} />
              <span className="h-1.5 w-1/3 rounded-full bg-black/[0.07] dark:bg-white/[0.1]" />
            </div>
            {chosen ? (
              <p className="mt-2 text-[12.5px] font-semibold leading-snug text-foreground">Bitcoin above $100k this year?</p>
            ) : (
              <div className="mt-2.5 space-y-1.5">
                <span className="block h-2 w-[85%] rounded-full bg-black/[0.08] dark:bg-white/[0.1]" />
                <span className="block h-2 w-[60%] rounded-full bg-black/[0.06] dark:bg-white/[0.08]" />
              </div>
            )}
            <div className="mt-2.5 flex items-center justify-between">
              <span className="h-1.5 w-1/4 rounded-full bg-black/[0.06] dark:bg-white/[0.08]" />
              <span
                className={cn(
                  "rounded-md px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums",
                  chosen ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-black/[0.05] text-transparent dark:bg-white/[0.06]",
                )}
              >
                62¢
              </span>
            </div>
          </div>
        );
      })}
      {phase === 1 ? (
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-[30%] z-10 h-[32%] overflow-hidden">
          <div
            className="h-full w-[18%]"
            style={{
              background: "linear-gradient(90deg, transparent, rgba(47,111,237,0.22), rgba(168,85,247,0.18), transparent)",
              animation: `rp-sweep 1.5s ${EASE} both`,
            }}
          />
        </div>
      ) : null}
    </>
  );
}

function Particles() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-[12%] top-[19%] z-10 h-[20%]">
      {Array.from({ length: 14 }, (_, index) => (
        <span
          key={index}
          className={cn("absolute top-0 size-1 rounded-full", index % 3 ? "bg-[#2f6fed]" : "bg-emerald-500")}
          style={{
            left: `${8 + rand(index + 1) * 84}%`,
            boxShadow: index % 3 ? "0 0 8px rgba(47,111,237,0.8)" : "0 0 8px rgba(16,185,129,0.8)",
            animation: `rp-fall ${0.9 + rand(index + 9) * 0.7}s ease-in ${rand(index + 4) * 1.2}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

function SheetCard({ phase }) {
  const streaming = phase === 3;
  const tick = useTick(streaming);
  const rows = useCountUp(24180, streaming, 2400);
  return (
    <div
      className="absolute z-[5] flex flex-col overflow-hidden rounded-xl border border-black/[0.08] bg-background shadow-[0_18px_50px_-18px_rgba(15,23,42,0.35)] dark:border-white/[0.1]"
      style={rectStyle(SHEET_RECT, phase)}
    >
      <header className="flex items-center justify-between gap-2 border-b border-black/[0.06] px-3 py-2 dark:border-white/[0.08]">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="size-1.5 shrink-0 rounded-full bg-emerald-500" />
          <span className="truncate text-[11.5px] font-semibold text-foreground">Bitcoin above $100k</span>
        </span>
        <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">{rows.toLocaleString()}</span>
      </header>
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div style={{ animation: "rp-stream 2.2s linear infinite", animationPlayState: streaming ? "running" : "paused" }}>
          {Array.from({ length: 28 }, (_, index) => {
            const row = index % 14;
            const yes = 54 + Math.round(rand(row * 3 + (streaming ? tick : 0)) * 14);
            return (
              <div
                key={index}
                className="grid grid-cols-[1.5fr_0.8fr_0.8fr_1fr] items-center gap-2 border-b border-black/[0.04] px-3 py-[5px] dark:border-white/[0.05]"
              >
                <span className="h-1.5 rounded-full bg-black/[0.08] dark:bg-white/[0.1]" style={{ width: `${50 + rand(row + 2) * 45}%` }} />
                <span className="font-mono text-[10px] tabular-nums text-emerald-600 dark:text-emerald-400">{yes}¢</span>
                <span className="font-mono text-[10px] tabular-nums text-rose-600 dark:text-rose-400">{100 - yes}¢</span>
                <span className="truncate text-right font-mono text-[10px] tabular-nums text-muted-foreground">
                  {Math.round(10 + rand(row * 7 + (streaming ? tick * 3 : 0)) * 4000).toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-background to-transparent" />
      </div>
    </div>
  );
}

function ChartCard({ phase }) {
  const shown = phase >= 4;
  const ready = phase === READY;
  return (
    <div
      className="absolute z-[6] flex flex-col overflow-hidden rounded-xl border border-black/[0.08] bg-background p-3 shadow-[0_24px_60px_-20px_rgba(15,23,42,0.45)] dark:border-white/[0.1]"
      style={rectStyle(CHART_RECT, phase)}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Yes</p>
          <p className="text-[18px] font-semibold leading-tight tabular-nums text-foreground">
            62¢ <span className="align-middle text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">+14</span>
          </p>
        </div>
        {ready ? (
          <div className="flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-300">
            <span className="grid size-6 place-items-center rounded-md border border-black/[0.08] text-muted-foreground dark:border-white/[0.1]">
              <Share2 className="size-3" aria-hidden />
            </span>
            <span className="relative grid size-6 place-items-center overflow-hidden rounded-md bg-[#2f6fed] text-white">
              <Download className="size-3" aria-hidden />
              <span
                aria-hidden
                className="absolute inset-y-0 left-0 w-1/2 bg-white/40"
                style={{ animation: "rp-sheen 1.8s ease-in-out 0.4s infinite" }}
              />
            </span>
          </div>
        ) : null}
      </div>
      <div className="relative mt-2 min-h-0 flex-1">
        {shown ? (
          <svg viewBox="0 0 200 90" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" aria-hidden>
            <defs>
              <linearGradient id="rp-yes-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="rgb(16,185,129)" stopOpacity="0.28" />
                <stop offset="100%" stopColor="rgb(16,185,129)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[22, 45, 68].map((y) => (
              <line key={y} x1="0" x2="200" y1={y} y2={y} className="stroke-black/[0.06] dark:stroke-white/[0.08]" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
            ))}
            <g style={{ animation: `rp-draw 1.5s ${EASE} both` }}>
              <path d={`${YES_LINE} L200,90 L0,90 Z`} fill="url(#rp-yes-fill)" />
              <path
                d={YES_LINE}
                fill="none"
                strokeWidth="2"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                className="stroke-emerald-500"
                style={{ filter: "drop-shadow(0 0 4px rgba(16,185,129,0.7))" }}
              />
            </g>
            <path
              d={NO_LINE}
              fill="none"
              strokeWidth="1.6"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              className="stroke-rose-500/80"
              style={{ animation: `rp-draw 1.5s ${EASE} 0.2s both` }}
            />
          </svg>
        ) : null}
        {shown ? (
          <span className="absolute right-0 top-[20%] size-2 -translate-y-1/2 translate-x-1/2 animate-in fade-in duration-300 fill-mode-both [animation-delay:1.3s]">
            <span className="absolute inset-0 rounded-full bg-emerald-500" style={{ animation: "rp-ping 1.6s ease-out infinite" }} />
            <span className="absolute inset-0 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.9)]" />
          </span>
        ) : null}
      </div>
    </div>
  );
}

function Tiles({ phase }) {
  const ready = phase === READY;
  const tiles = [
    ["Trades", "24,180"],
    ["Volume", "1.4M"],
  ];
  return tiles.map(([label, value], index) => (
    <div
      key={label}
      className="absolute z-[6] rounded-xl border border-black/[0.08] bg-background px-3 py-2 shadow-[0_12px_30px_-14px_rgba(15,23,42,0.3)] dark:border-white/[0.1]"
      style={{
        left: `${48 + index * 24}%`,
        top: ready ? "75%" : "84%",
        width: "23%",
        opacity: ready ? 1 : 0,
        filter: ready ? "none" : "blur(6px)",
        transition: `top 700ms ${EASE}, opacity 500ms ease, filter 500ms ease`,
        transitionDelay: ready ? `${200 + index * 90}ms` : "0ms",
      }}
    >
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-[14px] font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  ));
}

/** A looping, agent-style teaser for the trade history recipe, shown while its row is hovered. */
export function KalshiTradeHistoryPreview() {
  const reduced = usePrefersReducedMotion();
  const { phase, loop } = useTimeline(reduced);
  return (
    <div className="flex h-full min-h-0 flex-col">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Recipe</p>
        <h3 className="mt-1 text-lg font-semibold tracking-tight text-foreground">Download Kalshi Trade History</h3>
        <p className="mt-0.5 text-[13px] text-muted-foreground">Ask about any market. Lychee does the rest.</p>
      </div>
      <div className="rp-stage relative mt-5 min-h-0 flex-1 overflow-hidden rounded-2xl bg-[#e6edf3] dark:bg-[#161c23]">
        <Backdrop />
        <div key={loop} className="absolute inset-0 animate-in fade-in duration-500">
          <PromptBar phase={phase} />
          <AgentStatus phase={phase} />
          <Candidates phase={phase} />
          {phase === 3 ? <Particles /> : null}
          <SheetCard phase={phase} />
          <ChartCard phase={phase} />
          <Tiles phase={phase} />
        </div>
      </div>
    </div>
  );
}
