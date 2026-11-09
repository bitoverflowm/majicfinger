"use client";

import { useEffect, useState } from "react";
import { Search, SquareTerminal, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { squarify } from "@/lib/visualizations/volumeTreemap";
import { Backdrop, CSS, EASE, rand, useCountUp, usePrefersReducedMotion, useTick, useTyped } from "./kalshiTradeHistoryPreview";

const PREVIEW_CSS = `
@keyframes hp-fill { from { transform: scaleX(0) } to { transform: scaleX(1) } }
@keyframes hp-pop { 0% { transform: translate(-50%, -50%) scale(0); opacity: 0 } 70% { transform: translate(-50%, -50%) scale(1.35) } 100% { transform: translate(-50%, -50%) scale(1); opacity: 1 } }
`;

const YES = "#10b981";
const NO = "#f43f5e";
const MARKET = "Fed cuts rates in December?";

function useAfter(ms) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setOn(true), ms);
    return () => window.clearTimeout(timer);
  }, [ms]);
  return on;
}

function Panel({ title, aside, className, children }) {
  return (
    <div
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-lg border border-black/[0.08] bg-background dark:border-white/[0.1]",
        className,
      )}
    >
      {title ? (
        <div className="flex shrink-0 items-center justify-between gap-2 px-2.5 pt-2">
          <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
          {aside}
        </div>
      ) : null}
      <div className="relative min-h-0 flex-1">{children}</div>
    </div>
  );
}

function LiveDot({ label = "Live" }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 text-[9.5px] font-medium text-emerald-700 dark:text-emerald-300">
      <span className="relative size-1.5">
        <span className="absolute inset-0 rounded-full bg-emerald-500" style={{ animation: "rp-ping 1.6s ease-out infinite" }} />
        <span className="absolute inset-0 rounded-full bg-emerald-500" />
      </span>
      {label}
    </span>
  );
}

function Toggle({ options, value }) {
  return (
    <span className="inline-flex shrink-0 rounded-md bg-black/[0.05] p-0.5 dark:bg-white/[0.08]">
      {options.map((option) => (
        <span
          key={option}
          className={cn(
            "rounded px-1.5 py-px text-[9.5px] font-medium transition-all duration-300",
            option === value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
          )}
        >
          {option}
        </span>
      ))}
    </span>
  );
}

/* Search */

const QUERY = "fed rate cut december";
const RESULTS = [
  { title: MARKET, meta: "62% Yes · $4.2M vol" },
  { title: "Fed rate cut by January?", meta: "71% Yes · $1.8M vol" },
  { title: "fedwatcher", meta: "Trader · +$842K all time", trader: true },
];

const TRENDING = [
  { title: "Fed cuts rates in December?", chance: "62%", change: "+8", volume: "$4.2M" },
  { title: "Bitcoin above $120K by year end?", chance: "34%", change: "−3", volume: "$11.8M" },
  { title: "Who wins the NYC mayoral race?", chance: "71%", change: "+2", volume: "$28.4M" },
  { title: "US recession in 2026?", chance: "22%", change: "−1", volume: "$6.1M" },
  { title: "OpenAI announces GPT-6 this year?", chance: "18%", change: "+4", volume: "$3.3M" },
  { title: "Lakers win the NBA title?", chance: "9%", change: "−2", volume: "$7.4M" },
  { title: "Gold above $3,000 on Dec 31?", chance: "56%", change: "+5", volume: "$2.9M" },
  { title: "Apple ships a foldable iPhone in 2026?", chance: "27%", change: "+1", volume: "$1.6M" },
  { title: "Taylor Swift album #1 in December?", chance: "64%", change: "−4", volume: "$950K" },
];

function SearchScene() {
  const typed = useTyped(QUERY, true);
  const done = typed.length === QUERY.length;
  const picked = useAfter(1800);
  return (
    <div className="relative flex h-full flex-col items-center pt-[6%]">
      <Panel title="Explore markets" className="absolute inset-x-[10%] bottom-0 top-[30%] opacity-70">
        <div className="pt-1">
          {TRENDING.map((market) => (
            <div key={market.title} className="grid grid-cols-[1fr_3rem_2.5rem_3.5rem] items-center gap-2 border-b border-black/[0.04] px-2.5 py-[7px] dark:border-white/[0.05]">
              <span className="truncate text-[11px] text-foreground">{market.title}</span>
              <span className="text-right font-mono text-[10.5px] tabular-nums text-foreground">{market.chance}</span>
              <span
                className={cn(
                  "text-right font-mono text-[10px] tabular-nums",
                  market.change.startsWith("+") ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
                )}
              >
                {market.change}
              </span>
              <span className="text-right font-mono text-[10px] tabular-nums text-muted-foreground">{market.volume}</span>
            </div>
          ))}
        </div>
      </Panel>
      <div className="relative z-[1] w-[80%]">
        <div className="flex h-10 items-center gap-2 rounded-lg border border-[#2f6fed]/50 bg-background px-3 shadow-sm ring-4 ring-[#2f6fed]/10">
          <Search className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <span className="text-[13px] text-foreground">{typed}</span>
          {done ? null : <span className="-ml-1.5 h-4 w-px bg-foreground" style={{ animation: "rp-caret 1s steps(1) infinite" }} />}
          <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">Markets and traders</span>
        </div>
        {done ? (
          <div className="mt-1.5 overflow-hidden rounded-lg border border-black/[0.08] bg-background shadow-[0_18px_40px_-18px_rgba(15,23,42,0.4)] animate-in fade-in slide-in-from-top-1 duration-300 dark:border-white/[0.1]">
            {RESULTS.map((result, index) => (
              <div
                key={result.title}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 transition-colors duration-300",
                  index === 0 && picked && "bg-[#e7f0ff] dark:bg-blue-500/15",
                )}
              >
                {result.trader ? (
                  <Users className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                ) : (
                  <span className="size-3.5 shrink-0 rounded bg-gradient-to-br from-[#2f6fed] to-[#a855f7]" />
                )}
                <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-foreground">{result.title}</span>
                <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">{result.meta}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* Stats and live trades */

const NAMES = ["kestrel", "juniper", "0x7a3f…c21e", "bluewhale", "nightowl", "sigma_k", "pelican", "0xMarlo", "fedwatcher", "orca"];

function tradeAt(k) {
  const yes = rand(k + 3) > 0.42;
  const price = yes ? 60 + Math.round(rand(k + 5) * 4) : 36 + Math.round(rand(k + 5) * 4);
  return {
    k,
    name: NAMES[Math.floor(rand(k + 1) * NAMES.length)],
    buy: rand(k + 7) > 0.3,
    yes,
    price,
    value: Math.round(40 + rand(k + 9) ** 3 * 24000),
  };
}

function StatTile({ label, value, tone }) {
  return (
    <div className="rounded-md bg-black/[0.03] px-2 py-1.5 dark:bg-white/[0.05]">
      <p className="text-[9.5px] text-muted-foreground">{label}</p>
      <p className={cn("text-[14px] font-semibold tabular-nums text-foreground", tone)}>{value}</p>
    </div>
  );
}

function LiveScene() {
  const tick = useTick(true, 420);
  const volume = useCountUp(4218, true, 1400);
  const holders = useCountUp(3184, true, 1400);
  const rows = Array.from({ length: 20 }, (_, index) => tradeAt(tick + 40 - index));
  return (
    <div className="grid h-full grid-cols-[0.85fr_1.4fr] gap-2.5">
      <Panel title="Market stats" aside={<LiveDot />}>
        <div className="absolute inset-0 flex flex-col px-2.5 pb-2.5 pt-1.5">
          <p className="text-[12.5px] font-semibold leading-snug text-foreground">{MARKET}</p>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <StatTile label="Yes" value="62¢" tone="text-emerald-600 dark:text-emerald-400" />
            <StatTile label="No" value="38¢" tone="text-rose-600 dark:text-rose-400" />
            <StatTile label="Volume" value={`$${(volume / 1000).toFixed(2)}M`} />
            <StatTile label="Holders" value={holders.toLocaleString()} />
            <StatTile label="Top holder" value="9.8%" />
            <StatTile label="Avg entry" value="54¢" />
          </div>
          <p className="mt-3 text-[9.5px] text-muted-foreground">Last traded price</p>
          <div className="relative mt-1 min-h-[40px] flex-1">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" aria-hidden>
              <path
                d={PRICE_LINE}
                fill="none"
                stroke={YES}
                strokeWidth="1.75"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                style={{ animation: `rp-draw 1.4s ${EASE} 0.2s both` }}
              />
            </svg>
          </div>
        </div>
      </Panel>
      <Panel title="Every trade in this market" aside={<LiveDot label="Streaming" />}>
        <div className="absolute inset-0 overflow-hidden pt-1">
          {rows.map((row) => (
            <div
              key={row.k}
              className="grid grid-cols-[1.4fr_0.6fr_0.5fr_0.5fr_0.8fr] items-center gap-2 border-b border-black/[0.04] px-2.5 py-[5px] animate-in fade-in slide-in-from-top-2 duration-300 dark:border-white/[0.05]"
            >
              <span className="truncate text-[11px] font-medium text-foreground">{row.name}</span>
              <span
                className={cn(
                  "w-fit rounded px-1 text-[9px] font-semibold",
                  row.buy ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-rose-500/10 text-rose-700 dark:text-rose-300",
                )}
              >
                {row.buy ? "BUY" : "SELL"}
              </span>
              <span className={cn("text-[10.5px]", row.yes ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                {row.yes ? "Yes" : "No"}
              </span>
              <span className="text-right font-mono text-[10.5px] tabular-nums text-muted-foreground">{row.price}¢</span>
              <span className="text-right font-mono text-[10.5px] tabular-nums text-foreground">${row.value.toLocaleString()}</span>
            </div>
          ))}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-background to-transparent" />
        </div>
      </Panel>
    </div>
  );
}

/* Price and news */

const NEWS = [
  { at: 7, up: false, headline: "Powell signals patience on cuts" },
  { at: 14, up: true, headline: "CPI cools more than expected", callout: true },
  { at: 21, up: true, headline: "Jobs report misses by 90K" },
  { at: 27, up: true, headline: "Two governors back a December cut", callout: true },
];
const POINTS = 31;
const PRICE = (() => {
  let value = 44;
  return Array.from({ length: POINTS }, (_, index) => {
    const news = NEWS.find((item) => item.at === index);
    value += news ? (news.up ? 8 : -9) : (rand(index + 11) - 0.5) * 3.4;
    value = Math.max(24, Math.min(78, value));
    return value;
  });
})();
const priceX = (index) => (index / (POINTS - 1)) * 100;
const priceY = (value) => (1 - (value - 18) / 66) * 100;
const PRICE_LINE = PRICE.map((value, index) => `${index ? "L" : "M"}${priceX(index).toFixed(2)},${priceY(value).toFixed(2)}`).join(" ");
const COVERAGE = Array.from({ length: POINTS }, (_, index) => {
  const near = NEWS.reduce((best, item) => Math.min(best, Math.abs(item.at - index)), Infinity);
  return Math.min(100, 12 + rand(index + 21) * 14 + (near === 0 ? 80 : near === 1 ? 34 : 0));
});
const DRAW_S = 1.6;

function NewsScene() {
  const grown = useAfter(120);
  return (
    <Panel title="Price and news" aside={<Toggle options={["1W", "1M", "All"]} value="All" />} className="h-full">
      <div className="absolute inset-x-3 bottom-2 top-2 flex flex-col gap-2">
        <div className="relative min-h-0 flex-[3]">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" aria-hidden>
            <defs>
              <linearGradient id="hp-news-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={YES} stopOpacity="0.25" />
                <stop offset="100%" stopColor={YES} stopOpacity="0" />
              </linearGradient>
            </defs>
            {[25, 50, 75].map((y) => (
              <line key={y} x1="0" x2="100" y1={y} y2={y} className="stroke-black/[0.06] dark:stroke-white/[0.08]" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
            ))}
            <g style={{ animation: `rp-draw ${DRAW_S}s ${EASE} both` }}>
              <path d={`${PRICE_LINE} L100,100 L0,100 Z`} fill="url(#hp-news-fill)" />
              <path d={PRICE_LINE} fill="none" stroke={YES} strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            </g>
          </svg>
          {NEWS.map((item) => {
            const left = priceX(item.at);
            const top = priceY(PRICE[item.at]);
            const delay = (item.at / (POINTS - 1)) * DRAW_S;
            return (
              <div key={item.at}>
                <span
                  className="absolute z-[2] size-2.5 rounded-full border-2 border-background shadow"
                  style={{
                    left: `${left}%`,
                    top: `${top}%`,
                    transform: "translate(-50%, -50%)",
                    background: item.up ? YES : NO,
                    animation: `hp-pop 400ms ${EASE} ${delay}s both`,
                  }}
                />
                {item.callout ? (
                  <div
                    className="absolute z-[3] w-[150px]"
                    style={{ left: `${left}%`, top: `${top}%`, transform: `translate(${left > 70 ? "-92%" : "-50%"}, calc(-100% - 12px))` }}
                  >
                    <div
                      className="rounded-md border border-black/[0.08] bg-background px-2 py-1.5 shadow-[0_10px_30px_-12px_rgba(15,23,42,0.45)] animate-in fade-in slide-in-from-bottom-1 fill-mode-both duration-300 dark:border-white/[0.1]"
                      style={{ animationDelay: `${delay + 0.25}s` }}
                    >
                      <p className="text-[9px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">+8 pts</p>
                      <p className="text-[10.5px] font-medium leading-snug text-foreground">{item.headline}</p>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
        <div className="flex min-h-0 flex-1 items-end gap-[2px] border-t border-black/[0.06] pt-1 dark:border-white/[0.08]">
          {COVERAGE.map((height, index) => (
            <span
              key={index}
              className={cn("flex-1 rounded-t-sm", NEWS.some((item) => item.at === index) ? "bg-[#2f6fed]" : "bg-[#2f6fed]/30")}
              style={{
                height: `${height}%`,
                transform: grown ? "scaleY(1)" : "scaleY(0)",
                transformOrigin: "bottom",
                transition: `transform 500ms ${EASE}`,
                transitionDelay: `${(index / POINTS) * DRAW_S}s`,
              }}
            />
          ))}
        </div>
      </div>
    </Panel>
  );
}

/* Holders */

const FLAGS = {
  newWallet: { label: "New wallet", dot: "bg-sky-500", chip: "bg-sky-500/15 text-sky-700 dark:text-sky-300" },
  firstTrade: { label: "First trade ever", dot: "bg-amber-500", chip: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  bothSides: { label: "Yes + No", dot: "bg-fuchsia-500", chip: "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300" },
};

const HOLDERS = [
  [
    { name: "kestrel", score: 82, value: "$412K", pct: 9.8 },
    { name: "0x7a3f…c21e", value: "$298K", pct: 7.1, flags: ["newWallet", "firstTrade"] },
    { name: "bluewhale", score: 74, value: "$201K", pct: 4.8 },
    { name: "0xMarlo", score: 66, value: "$144K", pct: 3.4, flags: ["bothSides"] },
    { name: "sigma_k", score: 71, value: "$96K", pct: 2.3 },
    { name: "fedwatcher", score: 77, value: "$81K", pct: 1.9 },
    { name: "0x5c0d…9f12", value: "$64K", pct: 1.5, flags: ["newWallet"] },
    { name: "tidal", score: 58, value: "$52K", pct: 1.2 },
    { name: "vesper", score: 69, value: "$41K", pct: 1.0 },
    { name: "halcyon", score: 63, value: "$33K", pct: 0.8 },
  ],
  [
    { name: "juniper", score: 54, value: "$388K", pct: 15.1 },
    { name: "nightowl", score: 41, value: "$172K", pct: 6.7 },
    { name: "0xMarlo", score: 66, value: "$131K", pct: 5.1, flags: ["bothSides"] },
    { name: "0x19be…04aa", value: "$118K", pct: 4.6, flags: ["newWallet"] },
    { name: "pelican", score: 47, value: "$73K", pct: 2.8 },
    { name: "orca", score: 38, value: "$52K", pct: 2.0 },
    { name: "0xe41a…7b3c", value: "$47K", pct: 1.8, flags: ["newWallet", "firstTrade"] },
    { name: "drift", score: 44, value: "$39K", pct: 1.5 },
    { name: "marrow", score: 52, value: "$30K", pct: 1.2 },
    { name: "quill", score: 36, value: "$24K", pct: 0.9 },
  ],
];

function scoreTone(score) {
  if (score >= 70) return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
  if (score >= 50) return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
  return "bg-black/[0.05] text-muted-foreground dark:bg-white/[0.08]";
}

function HoldersScene() {
  const flagged = useAfter(1300);
  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
        {Object.entries(FLAGS).map(([id, flag]) => (
          <span key={id} className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-foreground shadow-sm">
            <span className={cn("size-1.5 rounded-full", flag.dot)} />
            {flag.label}
          </span>
        ))}
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-2.5">
        {HOLDERS.map((rows, side) => (
          <Panel key={side} title={side ? "No holders" : "Yes holders"} aside={<span className="text-[9.5px] text-muted-foreground">Score · Value · Supply</span>}>
            <div className="absolute inset-0 overflow-hidden pt-1">
              {rows.map((row, index) => (
                <div
                  key={row.name}
                  className="flex items-center gap-2 border-b border-black/[0.04] px-2.5 py-[6px] animate-in fade-in slide-in-from-left-2 fill-mode-both duration-300 dark:border-white/[0.05]"
                  style={{ animationDelay: `${index * 90 + side * 45}ms` }}
                >
                  <span className="w-3 text-right font-mono text-[9.5px] tabular-nums text-muted-foreground">{index + 1}</span>
                  <span className="flex min-w-0 flex-1 items-center gap-1">
                    <span className="truncate text-[11px] font-medium text-foreground">{row.name}</span>
                    {flagged
                      ? (row.flags || []).map((id) => (
                          <span key={id} className={cn("shrink-0 rounded px-1 text-[8.5px] font-semibold animate-in zoom-in-50 fade-in duration-300", FLAGS[id].chip)}>
                            {FLAGS[id].label}
                          </span>
                        ))
                      : null}
                  </span>
                  <span className={cn("w-6 shrink-0 rounded text-center font-mono text-[9.5px] font-semibold tabular-nums", row.score ? scoreTone(row.score) : "text-muted-foreground")}>
                    {row.score ?? "—"}
                  </span>
                  <span className="w-11 shrink-0 text-right font-mono text-[10.5px] tabular-nums text-foreground">{row.value}</span>
                  <span className="relative h-1.5 w-10 shrink-0 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
                    <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${row.pct * 6}%`, background: side ? NO : YES }} />
                  </span>
                </div>
              ))}
              <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-1/5 bg-gradient-to-t from-background to-transparent" />
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}

/* Heatmap */

const MAP_W = 200;
const MAP_H = 150;
const TILE_NAMES = ["kestrel", "0x7a3f", "bluewhale", "0xMarlo", "sigma_k", "fedwatcher", "juniper", "nightowl", "pelican", "orca"];
const TILE_FLAGS = { 1: "#0ea5e9", 3: "#d946ef" };

function heatTiles(seed) {
  const items = Array.from({ length: 18 }, (_, index) => ({
    id: index,
    weight: Math.round(1000 * 0.8 ** index * (0.7 + rand(seed + index) * 0.6)),
    pnl: rand(seed * 3 + index) - (seed === 1 ? 0.3 : 0.62),
    name: TILE_NAMES[(index + seed) % TILE_NAMES.length],
  }));
  return squarify(items, MAP_W, MAP_H);
}

const HEAT_SIDES = [
  { label: "Yes", fill: YES, tiles: heatTiles(1) },
  { label: "No", fill: NO, tiles: heatTiles(5) },
];

function tileFill(tile, side, max, pnlMode) {
  if (!pnlMode) return `color-mix(in srgb, ${side.fill} ${Math.round(35 + Math.sqrt(tile.weight / max) * 65)}%, white)`;
  const strength = Math.round(30 + Math.min(1, Math.abs(tile.pnl) * 2) * 70);
  return `color-mix(in srgb, ${tile.pnl >= 0 ? YES : NO} ${strength}%, white)`;
}

function HeatmapScene() {
  const pnlMode = useAfter(1500);
  return (
    <div className="grid h-full grid-cols-2 gap-2.5">
      {HEAT_SIDES.map((side, sideIndex) => {
        const max = side.tiles[0]?.weight || 1;
        return (
          <Panel
            key={side.label}
            title={`${side.label} holders`}
            aside={sideIndex ? <Toggle options={["Size", "PnL"]} value={pnlMode ? "PnL" : "Size"} /> : null}
          >
            <div className="absolute inset-2">
              {side.tiles.map((tile, index) => {
                const flag = sideIndex === 0 ? TILE_FLAGS[tile.id] : tile.id === 2 ? TILE_FLAGS[3] : null;
                const labelled = tile.w > 36 && tile.h > 22;
                return (
                  <div
                    key={tile.id}
                    className="absolute p-px"
                    style={{
                      left: `${(tile.x / MAP_W) * 100}%`,
                      top: `${(tile.y / MAP_H) * 100}%`,
                      width: `${(tile.w / MAP_W) * 100}%`,
                      height: `${(tile.h / MAP_H) * 100}%`,
                    }}
                  >
                    <div
                      className="flex size-full items-start overflow-hidden rounded-[3px] p-1 animate-in zoom-in-75 fade-in fill-mode-both duration-500"
                      style={{
                        background: tileFill(tile, side, max, pnlMode),
                        boxShadow: flag ? `inset 0 0 0 2px ${flag}` : undefined,
                        transition: `background 600ms ease ${index * 25}ms`,
                        animationDelay: `${index * 40}ms`,
                      }}
                    >
                      {labelled ? (
                        <span className="truncate text-[9.5px] font-semibold text-black/70">
                          {tile.name}
                          {pnlMode ? (
                            <span className="ml-1 font-mono font-medium">
                              {tile.pnl >= 0 ? "+" : "−"}${Math.round(Math.abs(tile.pnl) * 90)}K
                            </span>
                          ) : null}
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
        );
      })}
    </div>
  );
}

/* Skill by side */

function curve(mu, sigma, amp) {
  const points = Array.from({ length: 41 }, (_, index) => {
    const x = index * 2.5;
    const y = 100 - amp * Math.exp(-((x - mu) ** 2) / (2 * sigma ** 2));
    return `${index ? "L" : "M"}${x},${y.toFixed(2)}`;
  });
  return points.join(" ");
}

const TYPICAL = curve(50, 16, 70);
const YES_CURVE = curve(70, 12, 88);
const NO_CURVE = curve(43, 13, 80);

function ScoreTile({ label, score, color, delay }) {
  const value = useCountUp(score, true, 1300);
  return (
    <div className="rounded-lg bg-black/[0.03] px-3 py-2 animate-in fade-in slide-in-from-bottom-1 fill-mode-both duration-300 dark:bg-white/[0.05]" style={{ animationDelay: `${delay}ms` }}>
      <p className="text-[10px] text-muted-foreground">{label} holders</p>
      <p className="text-[26px] font-semibold leading-none tabular-nums" style={{ color }}>
        {value}
      </p>
      <p className="mt-1 text-[9.5px] text-muted-foreground">weighted by shares</p>
    </div>
  );
}

function ScoresScene() {
  const verdict = useAfter(1700);
  return (
    <Panel title="Are better traders on Yes or No?" className="h-full">
      <div className="absolute inset-0 grid grid-cols-[0.6fr_1.4fr] gap-3 p-3 pt-2">
        <div className="flex flex-col gap-2">
          <ScoreTile label="Yes" score={71} color={YES} delay={0} />
          <ScoreTile label="No" score={48} color={NO} delay={120} />
          {verdict ? (
            <span className="w-fit rounded-md bg-emerald-500/15 px-2 py-1 text-[10.5px] font-semibold text-emerald-700 animate-in zoom-in-95 fade-in duration-300 dark:text-emerald-300">
              Proven traders lean Yes
            </span>
          ) : null}
        </div>
        <div className="flex min-h-0 flex-col">
          <div className="relative min-h-0 flex-1">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" aria-hidden>
              <path d={TYPICAL} fill="none" strokeDasharray="4 4" strokeWidth="1.5" vectorEffect="non-scaling-stroke" className="stroke-black/30 dark:stroke-white/30" />
              <g style={{ animation: `rp-draw 1.3s ${EASE} both` }}>
                <path d={`${NO_CURVE} L100,100 L0,100 Z`} fill={NO} fillOpacity="0.14" />
                <path d={NO_CURVE} fill="none" stroke={NO} strokeWidth="2" vectorEffect="non-scaling-stroke" />
              </g>
              <g style={{ animation: `rp-draw 1.3s ${EASE} 0.25s both` }}>
                <path d={`${YES_CURVE} L100,100 L0,100 Z`} fill={YES} fillOpacity="0.16" />
                <path d={YES_CURVE} fill="none" stroke={YES} strokeWidth="2" vectorEffect="non-scaling-stroke" />
              </g>
            </svg>
          </div>
          <div className="mt-1 flex justify-between border-t border-black/[0.06] pt-1 text-[9px] text-muted-foreground dark:border-white/[0.08]">
            <span>0</span>
            <span className="inline-flex items-center gap-1">
              <span className="w-3 border-t border-dashed border-black/40 dark:border-white/40" />
              Typical trader · Lychee Skill Score
            </span>
            <span>100</span>
          </div>
        </div>
      </div>
    </Panel>
  );
}

/* Entry */

const BUCKETS = 40;
const ENTRY = Array.from({ length: BUCKETS }, (_, index) => {
  const cents = (index + 0.5) * 2.5;
  const yes = 92 * Math.exp(-((cents - 55) ** 2) / 120) + 30 * Math.exp(-((cents - 68) ** 2) / 30) + rand(index + 31) * 6;
  const no = 72 * Math.exp(-((cents - 40) ** 2) / 90) + 22 * Math.exp(-((cents - 28) ** 2) / 40) + rand(index + 41) * 5;
  return { cents, yes, no };
});
const ENTRY_MAX = Math.max(...ENTRY.map((bucket) => bucket.yes + bucket.no));

function EntryScene() {
  const grown = useAfter(120);
  const marked = useAfter(1300);
  return (
    <Panel title="Where the supply was bought" aside={<Toggle options={["Shares", "Value", "Paid"]} value="Shares" />} className="h-full">
      <div className="absolute inset-x-3 bottom-6 top-3">
        <div className="flex size-full items-end gap-[2px]">
          {ENTRY.map((bucket, index) => (
            <div
              key={index}
              className="flex flex-1 flex-col justify-end"
              style={{
                height: `${((bucket.yes + bucket.no) / ENTRY_MAX) * 100}%`,
                transform: grown ? "scaleY(1)" : "scaleY(0)",
                transformOrigin: "bottom",
                transition: `transform 600ms ${EASE}`,
                transitionDelay: `${index * 22}ms`,
              }}
            >
              <span className="rounded-t-[2px]" style={{ flex: bucket.yes, background: YES, opacity: bucket.cents > 62 && marked ? 0.45 : 0.9, transition: "opacity 400ms ease" }} />
              <span style={{ flex: bucket.no, background: NO, opacity: 0.85 }} />
            </div>
          ))}
        </div>
        {[
          { cents: 62, color: YES, label: "Yes now 62¢" },
          { cents: 38, color: NO, label: "No now 38¢" },
        ].map((line) => (
          <div
            key={line.cents}
            className="absolute inset-y-0 border-l-2 border-dashed animate-in fade-in fill-mode-both duration-300"
            style={{ left: `${line.cents}%`, borderColor: line.color, animationDelay: "900ms" }}
          >
            <span className="absolute -top-1 left-1 whitespace-nowrap rounded bg-background/90 px-1 text-[9.5px] font-semibold" style={{ color: line.color }}>
              {line.label}
            </span>
          </div>
        ))}
        {marked ? (
          <span className="absolute right-[4%] top-[22%] rounded-md border border-black/[0.08] bg-background px-2 py-1 text-[10px] font-medium text-foreground shadow-md animate-in fade-in slide-in-from-left-1 duration-300 dark:border-white/[0.1]">
            Bought above 62¢, now underwater
          </span>
        ) : null}
        <div className="absolute -bottom-5 inset-x-0 flex justify-between text-[9px] text-muted-foreground">
          <span>0¢</span>
          <span>50¢</span>
          <span>100¢</span>
        </div>
      </div>
    </Panel>
  );
}

/* Trader */

const PNL = Array.from({ length: 36 }, (_, index) => 6 + index * 2.4 + Math.sin(index * 0.9) * 6 + rand(index + 51) * 5);
const PNL_MAX = Math.max(...PNL);
const PNL_LINE = PNL.map((value, index) => `${index ? "L" : "M"}${((index / (PNL.length - 1)) * 100).toFixed(2)},${(100 - (value / PNL_MAX) * 92).toFixed(2)}`).join(" ");
const BEST_BETS = [
  { title: "Fed holds rates in September?", pnl: "+$214K" },
  { title: "Senate passes the budget bill?", pnl: "+$168K" },
  { title: "Bitcoin above $90K on Oct 31?", pnl: "+$97K" },
  { title: "CPI above 3% in August?", pnl: "+$71K" },
];
const CATEGORIES = [
  { label: "Politics", value: 612 },
  { label: "Economy", value: 388 },
  { label: "Crypto", value: 241 },
  { label: "Tech", value: 88 },
  { label: "Culture", value: 42 },
  { label: "Weather", value: -31 },
  { label: "Sports", value: -96 },
];
const HOLDING = [
  { label: "<1h", value: -18 },
  { label: "1–24h", value: 12 },
  { label: "1–7d", value: 46 },
  { label: "1–4w", value: 71 },
  { label: "1–3m", value: 38 },
  { label: "3m+", value: 9 },
];

function TraderScene() {
  const grown = useAfter(350);
  const pnl = useCountUp(1240, true, 1500);
  return (
    <div className="grid h-full grid-cols-[0.75fr_1.25fr] grid-rows-[1.1fr_1fr] gap-2.5">
      <Panel title="Trader stats">
        <div className="px-2.5 pb-2.5 pt-1">
          <p className="text-[12.5px] font-semibold text-foreground">kestrel</p>
          <div className="mt-1.5 grid grid-cols-2 gap-1.5">
            <StatTile label="All-time PnL" value={`+$${(pnl / 1000).toFixed(2)}M`} tone="text-emerald-600 dark:text-emerald-400" />
            <StatTile label="Skill Score" value="82" />
            <StatTile label="Win rate" value="64%" />
            <StatTile label="Markets" value="312" />
          </div>
          <p className="mt-3 text-[9.5px] text-muted-foreground">Best finished bets</p>
          {BEST_BETS.map((bet, index) => (
            <div
              key={bet.title}
              className="flex items-center gap-2 border-b border-black/[0.04] py-1 animate-in fade-in slide-in-from-left-1 fill-mode-both duration-300 dark:border-white/[0.05]"
              style={{ animationDelay: `${600 + index * 90}ms` }}
            >
              <span className="min-w-0 flex-1 truncate text-[10.5px] text-foreground">{bet.title}</span>
              <span className="rounded bg-emerald-500/10 px-1 text-[9px] font-semibold text-emerald-700 dark:text-emerald-300">Won</span>
              <span className="w-12 text-right font-mono text-[10px] tabular-nums text-emerald-600 dark:text-emerald-400">{bet.pnl}</span>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="PnL over time">
        <div className="absolute inset-x-2.5 bottom-2 top-1">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="size-full overflow-visible" aria-hidden>
          <defs>
            <linearGradient id="hp-pnl-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={YES} stopOpacity="0.25" />
              <stop offset="100%" stopColor={YES} stopOpacity="0" />
            </linearGradient>
          </defs>
          <g style={{ animation: `rp-draw 1.5s ${EASE} 0.3s both` }}>
            <path d={`${PNL_LINE} L100,100 L0,100 Z`} fill="url(#hp-pnl-fill)" />
            <path d={PNL_LINE} fill="none" stroke={YES} strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" style={{ filter: "drop-shadow(0 0 4px rgba(16,185,129,0.6))" }} />
          </g>
        </svg>
        </div>
      </Panel>
      <Panel title="PnL by category">
        <div className="space-y-1.5 px-2.5 pt-1.5">
          {CATEGORIES.map((category, index) => (
            <div key={category.label} className="grid grid-cols-[3.4rem_1fr_3rem] items-center gap-2">
              <span className="text-[10px] text-muted-foreground">{category.label}</span>
              <span className="relative h-2 overflow-hidden rounded-full bg-black/[0.04] dark:bg-white/[0.06]">
                <span
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{
                    width: `${(Math.abs(category.value) / 612) * 100}%`,
                    background: category.value >= 0 ? YES : NO,
                    transform: grown ? "scaleX(1)" : "scaleX(0)",
                    transformOrigin: "left",
                    transition: `transform 700ms ${EASE} ${index * 90}ms`,
                  }}
                />
              </span>
              <span className={cn("text-right font-mono text-[10px] tabular-nums", category.value >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                {category.value >= 0 ? "+" : "−"}${Math.abs(category.value)}K
              </span>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Edge by holding duration">
        <div className="absolute inset-x-2.5 bottom-5 top-1.5 flex items-center gap-1.5">
          {HOLDING.map((bucket, index) => (
            <div key={bucket.label} className="relative flex h-full flex-1 flex-col">
              <div className="flex flex-1 items-end">
                {bucket.value > 0 ? (
                  <span
                    className="w-full rounded-t-sm"
                    style={{ height: `${bucket.value}%`, background: YES, transform: grown ? "scaleY(1)" : "scaleY(0)", transformOrigin: "bottom", transition: `transform 600ms ${EASE} ${index * 80}ms` }}
                  />
                ) : null}
              </div>
              <div className="flex flex-[0.35] items-start border-t border-black/10 dark:border-white/15">
                {bucket.value < 0 ? (
                  <span
                    className="w-full rounded-b-sm"
                    style={{ height: `${-bucket.value * 2.5}%`, background: NO, transform: grown ? "scaleY(1)" : "scaleY(0)", transformOrigin: "top", transition: `transform 600ms ${EASE} ${index * 80}ms` }}
                  />
                ) : null}
              </div>
              <span className="absolute -bottom-4 inset-x-0 text-center text-[8.5px] text-muted-foreground">{bucket.label}</span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

const SCENES = [
  { title: "Search any market or trader", detail: "Type a question or a wallet. Pick one and the whole terminal fills in.", ms: 3000, Scene: SearchScene },
  { title: "Every trade, live", detail: "Market stats and every fill since the first trade, streaming in as it happens.", ms: 3200, Scene: LiveScene },
  { title: "News right on the price", detail: "Each headline sits where it broke, so you can see what moved the odds.", ms: 3600, Scene: NewsScene },
  { title: "Who holds each side", detail: "Every wallet on Yes and No, with new wallets, first-timers and two-sided holders flagged.", ms: 3400, Scene: HoldersScene },
  { title: "Holder heatmap", detail: "See who dominates the supply, then flip to profit and loss to see who's underwater.", ms: 3400, Scene: HeatmapScene },
  { title: "Are better traders on Yes or No?", detail: "Every holder's Lychee Skill Score, weighted by size, shows which side proven traders back.", ms: 3400, Scene: ScoresScene },
  { title: "Where the supply was bought", detail: "Every position at the price paid, so you can spot who's sitting on a loss.", ms: 3200, Scene: EntryScene },
  { title: "Open any whale", detail: "One click opens a trader in their own tab: PnL, categories, and where their edge comes from.", ms: 4000, Scene: TraderScene },
];
const STILL_SCENE = 3;

function useScenes(paused) {
  const [state, setState] = useState({ index: 0, loop: 0 });
  useEffect(() => {
    if (paused) return undefined;
    const timer = window.setTimeout(
      () => setState(({ index, loop }) => (index === SCENES.length - 1 ? { index: 0, loop: loop + 1 } : { index: index + 1, loop })),
      SCENES[state.index].ms,
    );
    return () => window.clearTimeout(timer);
  }, [paused, state.index]);
  return paused ? { index: STILL_SCENE, loop: 0 } : state;
}

function TabStrip({ index }) {
  const trader = index === SCENES.length - 1;
  const tabs = [{ id: "market", label: index === 0 ? "Holder Terminal" : MARKET, active: !trader }];
  if (trader) tabs.push({ id: "trader", label: "kestrel", active: true });
  return (
    <div className="flex h-8 shrink-0 items-center gap-1 border-b border-black/[0.06] bg-black/[0.02] px-2 dark:border-white/[0.08] dark:bg-white/[0.03]">
      {tabs.map((tab) => (
        <span
          key={tab.id}
          className={cn(
            "flex max-w-[45%] items-center gap-1.5 rounded-md px-2 py-1 text-[10.5px] font-medium transition-colors duration-300",
            tab.active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
            tab.id === "trader" && "animate-in fade-in slide-in-from-left-3 duration-500",
          )}
        >
          <SquareTerminal className="size-3 shrink-0" aria-hidden />
          <span className="truncate">{tab.label}</span>
        </span>
      ))}
      <span className="ml-auto">
        <LiveDot />
      </span>
    </div>
  );
}

/** A looping tour of the Holder Terminal's panels, shown while its sidebar row is hovered. */
export function HolderTerminalPreview() {
  const reduced = usePrefersReducedMotion();
  const { index, loop } = useScenes(reduced);
  const { Scene, title, detail } = SCENES[index];
  return (
    <div className="flex h-full min-h-0 flex-col">
      <style dangerouslySetInnerHTML={{ __html: CSS + PREVIEW_CSS }} />
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Terminal</p>
        <h3 className="mt-1 text-lg font-semibold tracking-tight text-foreground">Holder Terminal</h3>
        <p className="mt-0.5 text-[13px] text-muted-foreground">Everything about who holds a Polymarket market, live, in one tab.</p>
      </div>
      <div className="rp-stage relative mt-5 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-[#e6edf3] p-[4%] pb-4 dark:bg-[#161c23]">
        <Backdrop />
        <div className="relative z-[1] flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-black/[0.08] bg-background/95 shadow-[0_24px_60px_-24px_rgba(15,23,42,0.45)] backdrop-blur dark:border-white/[0.1]">
          <TabStrip index={index} />
          <div key={`${loop}-${index}`} className="relative min-h-0 flex-1 p-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <Scene />
          </div>
        </div>
        <div className="relative z-[1] mt-3 shrink-0">
          <div className="flex gap-1">
            {SCENES.map((scene, at) => (
              <span key={scene.title} className="relative h-1 flex-1 overflow-hidden rounded-full bg-black/[0.08] dark:bg-white/[0.12]">
                {at < index || (reduced && at === index) ? <span className="absolute inset-0 bg-[#2f6fed]" /> : null}
                {at === index && !reduced ? (
                  <span
                    key={loop}
                    className="absolute inset-0 origin-left bg-[#2f6fed]"
                    style={{ animation: `hp-fill ${scene.ms}ms linear both` }}
                  />
                ) : null}
              </span>
            ))}
          </div>
          <div key={`${loop}-${index}`} className="mt-2.5 animate-in fade-in slide-in-from-bottom-1 duration-300">
            <p className="text-[13.5px] font-semibold text-foreground">
              <span className="mr-1.5 font-mono text-[11px] tabular-nums text-muted-foreground">
                {index + 1}/{SCENES.length}
              </span>
              {title}
            </p>
            <p className="mt-0.5 text-[12px] text-muted-foreground">{detail}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
