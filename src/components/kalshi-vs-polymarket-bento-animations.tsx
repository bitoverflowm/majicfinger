"use client";

import Image from "next/image";
import NumberFlow from "@number-flow/react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import { Check, Search } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";

import { AnimatedBeam } from "@/components/ui/animated-beam";
import { FlickeringGrid } from "@/components/ui/flickering-grid";
import { BorderBeam } from "@/components/magicui/border-beam";
import Marquee from "@/components/magicui/marquee";
import Ripple from "@/components/magicui/ripple";
import { cn } from "@/lib/utils";

const POLY = "#2E5CFF";
const KALSHI = "#28CC95";

function Stage({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex h-[228px] w-full items-center justify-center overflow-hidden px-4 py-3",
        className,
      )}
    >
      {children}
    </div>
  );
}

function LiveDot({ className }: { className?: string }) {
  return (
    <span className={cn("relative flex size-1.5", className)}>
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
      <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
    </span>
  );
}

function BrandMark({
  src,
  alt,
  ring,
}: {
  src: string;
  alt: string;
  ring: string;
}) {
  return (
    <span
      className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full ring-2"
      style={{ backgroundColor: ring, boxShadow: `0 0 0 1px ${ring}33` }}
    >
      <Image src={src} alt={alt} width={22} height={22} className="object-contain" />
    </span>
  );
}

function useTypedLoop(
  phrases: string[],
  {
    typeMs = 48,
    holdMs = 1800,
    deleteMs = 24,
    enabled = true,
  }: { typeMs?: number; holdMs?: number; deleteMs?: number; enabled?: boolean } = {},
) {
  const [index, setIndex] = useState(0);
  const [text, setText] = useState(enabled ? "" : (phrases[0] ?? ""));
  const [holding, setHolding] = useState(!enabled);

  useEffect(() => {
    if (!enabled) {
      setText(phrases[0] ?? "");
      setHolding(true);
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const phrase = phrases[index] ?? "";
    let i = 0;
    setText("");
    setHolding(false);

    const typeNext = () => {
      if (cancelled) return;
      if (i <= phrase.length) {
        setText(phrase.slice(0, i));
        i += 1;
        timer = setTimeout(typeNext, typeMs);
        return;
      }
      setHolding(true);
      timer = setTimeout(() => {
        const erase = () => {
          if (cancelled) return;
          i -= 1;
          if (i >= 0) {
            setText(phrase.slice(0, i));
            timer = setTimeout(erase, deleteMs);
            return;
          }
          setHolding(false);
          setIndex((prev) => (prev + 1) % phrases.length);
        };
        erase();
      }, holdMs);
    };

    typeNext();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [deleteMs, enabled, holdMs, index, phrases, typeMs]);

  return { text, index, holding };
}

const SEARCH_SCENES = [
  {
    query: "will the fed hold rates",
    kind: "plain English",
    hits: [
      { venue: "Kalshi", ticker: "KXFED-26SEP-T0", price: "53¢" },
      { venue: "Polymarket", ticker: "fed-decision-in-september", price: "52¢" },
    ],
  },
  {
    query: "KXFED-26SEP-T0",
    kind: "ticker",
    hits: [
      { venue: "Kalshi", ticker: "KXFED-26SEP-T0", price: "53¢" },
      { venue: "Polymarket", ticker: "fed-decision-in-september", price: "52¢" },
    ],
  },
  {
    query: "Piraino vs Pieri",
    kind: "plain English",
    hits: [
      { venue: "Kalshi", ticker: "KXATP…PIRPIE-PIE", price: "53¢" },
      { venue: "Polymarket", ticker: "atp-piraino-pieri", price: "52¢" },
    ],
  },
] as const;

export function SearchBentoAnimation() {
  const reduceMotion = useReducedMotion();
  const queries = useMemo(() => SEARCH_SCENES.map((scene) => scene.query), []);
  const { text, index, holding } = useTypedLoop(queries, { enabled: !reduceMotion });
  const scene = SEARCH_SCENES[index] ?? SEARCH_SCENES[0];

  return (
    <Stage>
      <FlickeringGrid
        className="absolute inset-0 z-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_78%)]"
        squareSize={3}
        gridGap={5}
        flickerChance={0.18}
        color="rgb(46, 92, 255)"
        maxOpacity={0.18}
      />
      <div className="relative z-10 w-full max-w-[22rem] overflow-hidden rounded-xl border border-border/80 bg-background/80 shadow-sm backdrop-blur-md">
        <BorderBeam
          size={90}
          duration={8}
          borderWidth={1.2}
          colorFrom={POLY}
          colorTo={KALSHI}
        />
        <div className="flex items-center gap-2 border-b border-border/70 px-3 py-2">
          <Search className="size-3.5 shrink-0 text-muted-foreground" />
          <div className="flex min-w-0 flex-1 items-center font-mono text-[11px] text-foreground">
            <span className="truncate">{text}</span>
            <span className="ml-0.5 inline-block h-3.5 w-px animate-pulse bg-foreground/80" />
          </div>
          <span className="shrink-0 rounded-full border border-border bg-muted/60 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
            {scene.kind}
          </span>
        </div>
        <pre className="border-b border-border/60 px-3 py-1.5 font-mono text-[10px] leading-relaxed text-muted-foreground">
{holding
  ? `found 2 markets  ·  kalshi ↔ polymarket\n████████████  match ready`
          : `searching kalshi · polymarket\n${"█".repeat(Math.min(12, Math.max(1, Math.floor((text.length / Math.max(scene.query.length, 1)) * 12)))).padEnd(12, "░")}  scanning`}
        </pre>
        <div className="flex flex-col gap-1.5 p-2">
          <AnimatePresence mode="popLayout">
            {scene.hits.map((hit, hitIndex) => (
              <motion.div
                key={`${scene.query}-${hit.ticker}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: holding ? 1 : 0.55, y: 0 }}
                transition={{ delay: hitIndex * 0.08, duration: 0.28 }}
                className="flex items-center justify-between rounded-lg border border-border/70 bg-background/70 px-2 py-1.5"
              >
                <div className="flex min-w-0 items-center gap-1.5">
                  <BrandMark
                    src={hit.venue === "Kalshi" ? "/kalshi.png" : "/polymarket.png"}
                    alt={hit.venue}
                    ring={hit.venue === "Kalshi" ? KALSHI : POLY}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-[10px] font-semibold leading-tight">{hit.venue}</p>
                    <p className="truncate font-mono text-[9px] text-muted-foreground">{hit.ticker}</p>
                  </div>
                </div>
                <span className="font-mono text-[11px] tabular-nums">{hit.price}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </Stage>
  );
}

export function MatchBentoAnimation() {
  const containerRef = useRef<HTMLDivElement>(null);
  const kalshiRef = useRef<HTMLDivElement>(null);
  const polyRef = useRef<HTMLDivElement>(null);
  const matchRef = useRef<HTMLDivElement>(null);

  return (
    <Stage className="px-2">
      <Ripple
        mainCircleSize={80}
        mainCircleOpacity={0.16}
        numCircles={5}
        circleSizeStep={42}
        className="opacity-70 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]"
      />
      <div ref={containerRef} className="relative z-10 flex h-full w-full max-w-md items-center justify-between px-2">
        <div className="pointer-events-none absolute inset-0 z-0">
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={kalshiRef}
            toRef={matchRef}
            curvature={-18}
            pathWidth={2.6}
            pathOpacity={0.35}
            duration={2.4}
            gradientStartColor={KALSHI}
            gradientStopColor={POLY}
            pathColor={KALSHI}
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={polyRef}
            toRef={matchRef}
            curvature={18}
            pathWidth={2.6}
            pathOpacity={0.35}
            duration={2.4}
            delay={0.25}
            reverse
            gradientStartColor={POLY}
            gradientStopColor={KALSHI}
            pathColor={POLY}
          />
        </div>

        <motion.div
          ref={kalshiRef}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          className="z-10 w-[7.6rem] rounded-xl border border-border bg-background/90 p-2.5 shadow-sm"
        >
          <BrandMark src="/kalshi.png" alt="Kalshi" ring={KALSHI} />
          <p className="mt-2 text-[10px] font-semibold leading-tight">Kalshi</p>
          <p className="font-mono text-[8px] text-muted-foreground">KXFED-26SEP-T0</p>
          <p className="mt-1 font-mono text-sm tabular-nums" style={{ color: KALSHI }}>
            53.0¢
          </p>
        </motion.div>

        <div ref={matchRef} className="z-10 flex flex-col items-center gap-1">
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            className="flex size-11 items-center justify-center rounded-full border border-border bg-background shadow-sm"
          >
            <Check className="size-5" style={{ color: KALSHI }} strokeWidth={2.6} />
          </motion.div>
          <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
            match
          </span>
          <span className="font-mono text-[10px] tabular-nums text-foreground">0.96</span>
        </div>

        <motion.div
          ref={polyRef}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          className="z-10 w-[7.6rem] rounded-xl border border-border bg-background/90 p-2.5 shadow-sm"
        >
          <BrandMark src="/polymarket.png" alt="Polymarket" ring={POLY} />
          <p className="mt-2 text-[10px] font-semibold leading-tight">Polymarket</p>
          <p className="font-mono text-[8px] text-muted-foreground">fed-decision…</p>
          <p className="mt-1 font-mono text-sm tabular-nums" style={{ color: POLY }}>
            52.5¢
          </p>
        </motion.div>
      </div>
    </Stage>
  );
}

function Meter({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px]">
        <span className="font-semibold">{label}</span>
        <span className="font-mono tabular-nums">
          <NumberFlow
            value={value}
            format={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }}
            suffix="%"
          />
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          animate={{ width: `${value}%` }}
          transition={{ type: "spring", stiffness: 90, damping: 18 }}
        />
      </div>
    </div>
  );
}

export function PricesBentoAnimation() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.4 });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const id = setInterval(() => setTick((n) => n + 1), 2200);
    return () => clearInterval(id);
  }, [inView]);

  const kalshiYes = 53.0 + (tick % 3) * 0.3 - 0.3;
  const polyYes = 52.5 + ((tick + 1) % 3) * 0.2 - 0.2;
  const delta = Math.abs(kalshiYes - polyYes);

  const ascii = useMemo(() => {
    const yesBlocks = Math.round(kalshiYes / 10);
    const noBlocks = 10 - yesBlocks;
    return `YES ${"▓".repeat(yesBlocks)}${"░".repeat(noBlocks)}\nNO  ${"░".repeat(yesBlocks)}${"▓".repeat(noBlocks)}`;
  }, [kalshiYes]);

  return (
    <Stage>
      <div ref={ref} className="grid w-full max-w-[22rem] grid-cols-2 gap-2">
        <div className="rounded-xl border border-border bg-background/85 p-2.5 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <BrandMark src="/kalshi.png" alt="Kalshi" ring={KALSHI} />
            <span className="font-mono text-[9px] uppercase text-muted-foreground">Kalshi</span>
          </div>
          <Meter label="YES" value={kalshiYes} color={KALSHI} />
          <div className="mt-2">
            <Meter label="NO" value={100 - kalshiYes} color="#64748b" />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-background/85 p-2.5 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <BrandMark src="/polymarket.png" alt="Polymarket" ring={POLY} />
            <span className="font-mono text-[9px] uppercase text-muted-foreground">Poly</span>
          </div>
          <Meter label="YES" value={polyYes} color={POLY} />
          <div className="mt-2">
            <Meter label="NO" value={100 - polyYes} color="#64748b" />
          </div>
        </div>
        <div className="col-span-2 flex items-center justify-between gap-3 rounded-lg border border-dashed border-border bg-muted/40 px-2.5 py-1.5">
          <pre className="font-mono text-[10px] leading-tight tracking-[0.12em] text-foreground/70">{ascii}</pre>
          <div className="shrink-0 text-right">
            <p className="flex items-center justify-end gap-1 text-[9px] uppercase tracking-wide text-muted-foreground">
              <LiveDot /> spread
            </p>
            <p className="whitespace-nowrap font-mono text-sm tabular-nums">
              <NumberFlow
                value={delta}
                format={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }}
                suffix=" pp"
              />
            </p>
          </div>
        </div>
      </div>
    </Stage>
  );
}

const INTERVALS = ["15m", "1h", "6h", "1d", "All"] as const;

const CHART_SERIES: Record<(typeof INTERVALS)[number], { poly: number[]; kalshi: number[] }> = {
  "15m": {
    poly: [48, 50, 49, 53, 51, 56, 54, 58],
    kalshi: [52, 51, 54, 53, 57, 55, 59, 57],
  },
  "1h": {
    poly: [44, 47, 46, 51, 49, 54, 52, 56],
    kalshi: [49, 48, 52, 50, 55, 53, 58, 56],
  },
  "6h": {
    poly: [38, 42, 47, 45, 51, 49, 55, 53],
    kalshi: [43, 41, 48, 50, 49, 56, 54, 59],
  },
  "1d": {
    poly: [34, 40, 38, 47, 51, 48, 56, 52],
    kalshi: [39, 37, 45, 44, 53, 55, 54, 60],
  },
  All: {
    poly: [28, 36, 33, 45, 42, 54, 50, 58],
    kalshi: [35, 32, 41, 48, 46, 52, 59, 55],
  },
};

function toPath(values: number[], width: number, height: number) {
  const min = Math.min(...values) - 2;
  const max = Math.max(...values) + 2;
  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - ((value - min) / (max - min)) * height;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

export function ChartsBentoAnimation() {
  const reduceMotion = useReducedMotion();
  const [interval, setIntervalIndex] = useState<(typeof INTERVALS)[number]>("1h");
  const [overlay, setOverlay] = useState(true);
  const uid = useId().replace(/:/g, "");

  useEffect(() => {
    if (reduceMotion) return;
    const id = window.setInterval(() => {
      setIntervalIndex((current) => {
        const next = (INTERVALS.indexOf(current) + 1) % INTERVALS.length;
        return INTERVALS[next];
      });
    }, 2600);
    return () => window.clearInterval(id);
  }, [reduceMotion]);

  useEffect(() => {
    if (reduceMotion) return;
    const id = window.setInterval(() => setOverlay((value) => !value), 5200);
    return () => window.clearInterval(id);
  }, [reduceMotion]);

  const series = CHART_SERIES[interval];
  const polyPath = toPath(series.poly, 320, overlay ? 92 : 44);
  const kalshiPath = toPath(series.kalshi, 320, overlay ? 92 : 44);

  return (
    <Stage className="flex-col gap-2">
      <div className="flex w-full max-w-[22rem] items-center justify-between">
        <div className="flex rounded-lg border border-border bg-muted/50 p-0.5">
          {INTERVALS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setIntervalIndex(item)}
              className={cn(
                "rounded-md px-1.5 py-0.5 font-mono text-[9px] transition-colors",
                item === interval
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item}
            </button>
          ))}
        </div>
        <span className="font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
          {overlay ? "overlay" : "side by side"}
        </span>
      </div>
      <div className="w-full max-w-[22rem] overflow-hidden rounded-xl border border-border bg-background/80 p-2 shadow-sm">
        {overlay ? (
          <svg viewBox="0 0 320 100" className="h-[108px] w-full">
            <defs>
              <linearGradient id={`poly-${uid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={POLY} stopOpacity="0.22" />
                <stop offset="100%" stopColor={POLY} stopOpacity="0" />
              </linearGradient>
            </defs>
            <motion.path
              d={`${polyPath} L 320 100 L 0 100 Z`}
              fill={`url(#poly-${uid})`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            />
            <motion.path
              d={polyPath}
              fill="none"
              stroke={POLY}
              strokeWidth="2.2"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.9, ease: "easeInOut" }}
            />
            <motion.path
              d={kalshiPath}
              fill="none"
              stroke={KALSHI}
              strokeWidth="2.2"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.9, ease: "easeInOut", delay: 0.12 }}
            />
          </svg>
        ) : (
          <div className="grid grid-rows-2 gap-1.5">
            {[
              { d: polyPath, color: POLY, label: "Polymarket" },
              { d: kalshiPath, color: KALSHI, label: "Kalshi" },
            ].map((chart) => (
              <div key={chart.label} className="min-w-0">
                <p className="mb-0.5 font-mono text-[8px] uppercase text-muted-foreground">{chart.label}</p>
                <svg viewBox="0 0 320 48" className="h-11 w-full">
                  <motion.path
                    d={chart.d}
                    fill="none"
                    stroke={chart.color}
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.8 }}
                  />
                </svg>
              </div>
            ))}
          </div>
        )}
        <div className="mt-1 flex items-center gap-3 px-1 font-mono text-[9px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="size-1.5 rounded-full" style={{ backgroundColor: POLY }} /> Poly
          </span>
          <span className="flex items-center gap-1">
            <span className="size-1.5 rounded-full" style={{ backgroundColor: KALSHI }} /> Kalshi
          </span>
        </div>
      </div>
    </Stage>
  );
}

const TRADES = [
  { t: "14:32:08", venue: "K", side: "YES", px: "53.0¢", sz: "120", color: KALSHI },
  { t: "14:32:06", venue: "P", side: "NO", px: "47.5¢", sz: "80", color: POLY },
  { t: "14:32:04", venue: "K", side: "YES", px: "52.8¢", sz: "45", color: KALSHI },
  { t: "14:32:01", venue: "P", side: "YES", px: "52.5¢", sz: "240", color: POLY },
  { t: "14:31:58", venue: "K", side: "NO", px: "47.2¢", sz: "60", color: KALSHI },
  { t: "14:31:55", venue: "P", side: "YES", px: "52.4¢", sz: "150", color: POLY },
  { t: "14:31:51", venue: "K", side: "YES", px: "53.1¢", sz: "95", color: KALSHI },
  { t: "14:31:48", venue: "P", side: "NO", px: "47.6¢", sz: "210", color: POLY },
] as const;

function TradeRow({ trade }: { trade: (typeof TRADES)[number] }) {
  const vol = Math.min(12, Math.max(3, Math.round(Number(trade.sz) / 20)));
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-background/80 px-2 py-1.5 font-mono text-[10px]">
      <span className="w-[3.4rem] text-muted-foreground">{trade.t}</span>
      <span
        className="w-4 text-center text-[9px] font-bold"
        style={{ color: trade.color }}
      >
        {trade.venue}
      </span>
      <span className={cn("w-8", trade.side === "YES" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500")}>
        {trade.side}
      </span>
      <span className="w-12 tabular-nums">{trade.px}</span>
      <span className="w-8 text-right tabular-nums text-muted-foreground">{trade.sz}</span>
      <span className="text-[9px] tracking-tighter text-muted-foreground">{ "█".repeat(vol)}</span>
    </div>
  );
}

export function ActivityBentoAnimation() {
  return (
    <Stage className="items-stretch">
      <div className="flex h-full w-full max-w-[22rem] flex-col overflow-hidden rounded-xl border border-border bg-background/80 shadow-sm">
        <div className="flex items-center justify-between border-b border-border/70 px-2.5 py-1.5">
          <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
            <LiveDot /> tape
          </span>
          <span className="font-mono text-[9px] text-muted-foreground">vol · last</span>
        </div>
        <div className="relative min-h-0 flex-1 overflow-hidden">
          <Marquee vertical pauseOnHover className="h-full [--duration:18s] [--gap:0.4rem] p-1.5">
            {TRADES.map((trade) => (
              <TradeRow key={`${trade.t}-${trade.sz}`} trade={trade} />
            ))}
          </Marquee>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-background to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-background to-transparent" />
        </div>
      </div>
    </Stage>
  );
}

const BOOK = {
  asks: [
    { px: 54.0, sz: 420 },
    { px: 53.5, sz: 210 },
    { px: 53.0, sz: 90 },
  ],
  bids: [
    { px: 52.5, sz: 180 },
    { px: 52.0, sz: 510 },
    { px: 51.5, sz: 95 },
  ],
};

export function OrderbookBentoAnimation() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.35 });
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const id = setInterval(() => setPulse((n) => n + 1), 1600);
    return () => clearInterval(id);
  }, [inView]);

  const maxSz = 510;
  const spread = 0.4 + (pulse % 3) * 0.1;

  return (
    <Stage>
      <div
        ref={ref}
        className="relative w-full max-w-[22rem] overflow-hidden rounded-xl border border-border bg-background/85 p-2.5 shadow-sm"
      >
        <BorderBeam size={70} duration={10} colorFrom={POLY} colorTo={KALSHI} borderWidth={1} />
        <div className="mb-1.5 flex items-center justify-between font-mono text-[9px] uppercase text-muted-foreground">
          <span>asks</span>
          <span className="flex items-center gap-1 normal-case tracking-normal">
            <LiveDot /> books
          </span>
          <span>size</span>
        </div>
        <div className="space-y-1">
          {BOOK.asks.map((level, i) => {
            const width = ((level.sz + ((pulse + i) % 3) * 24) / maxSz) * 100;
            return (
              <div key={level.px} className="relative flex h-5 items-center justify-between overflow-hidden rounded px-1.5 font-mono text-[10px]">
                <motion.div
                  className="absolute inset-y-0 right-0 bg-rose-500/15 dark:bg-rose-400/20"
                  animate={{ width: `${width}%` }}
                  transition={{ duration: 0.6 }}
                />
                <span className="relative tabular-nums text-rose-600 dark:text-rose-400">{level.px.toFixed(1)}</span>
                <span className="relative tabular-nums text-muted-foreground">{level.sz + ((pulse + i) % 3) * 8}</span>
              </div>
            );
          })}
        </div>
        <div className="my-1.5 flex items-center gap-2 rounded-md border border-dashed border-border bg-muted/50 px-2 py-1 font-mono text-[10px]">
          <span className="shrink-0 text-muted-foreground">spread</span>
          <span className="inline-flex min-w-[2.8rem] shrink-0 justify-start whitespace-nowrap tabular-nums">
            <NumberFlow value={spread} format={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }} suffix="¢" />
          </span>
          <span className="ml-auto hidden min-[380px]:inline text-[9px] text-muted-foreground">
            {`◄ ${"─".repeat(6)} ● ${"─".repeat(6)} ►`}
          </span>
        </div>
        <div className="space-y-1">
          {BOOK.bids.map((level, i) => {
            const width = ((level.sz + ((pulse + i + 1) % 4) * 18) / maxSz) * 100;
            return (
              <div key={level.px} className="relative flex h-5 items-center justify-between overflow-hidden rounded px-1.5 font-mono text-[10px]">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-emerald-500/15 dark:bg-emerald-400/20"
                  animate={{ width: `${width}%` }}
                  transition={{ duration: 0.6 }}
                />
                <span className="relative tabular-nums text-emerald-600 dark:text-emerald-400">{level.px.toFixed(1)}</span>
                <span className="relative tabular-nums text-muted-foreground">{level.sz + ((pulse + i) % 4) * 6}</span>
              </div>
            );
          })}
        </div>
      </div>
    </Stage>
  );
}
