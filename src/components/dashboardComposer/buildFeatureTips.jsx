"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Filter, Search } from "lucide-react";

import { FeatureTip, usePrefersReducedMotion } from "@/components/ui/feature-tip";
import { cn } from "@/lib/utils";

/**
 * Tips on the integration build screen. They show one at a time in this order;
 * each waits until the ones before it are closed. Tips whose feature isn't on
 * screen are skipped.
 */
export const BUILD_TIP_IDS = {
  dataType: "integration-build-data-type",
  search: "integration-build-search",
  columns: "integration-build-columns",
  attributes: "integration-build-attributes",
  dataLimits: "integration-build-data-limits",
};

const BUILD_TIP_ORDER = Object.values(BUILD_TIP_IDS);

function tipsBefore(id) {
  return BUILD_TIP_ORDER.slice(0, BUILD_TIP_ORDER.indexOf(id));
}

/** Loops `step` through 0..steps-1, holding each for `durations[step]` ms. Still on the last step for reduced motion. */
function useLoopStep(durations) {
  const reduced = usePrefersReducedMotion();
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (reduced) return;
    const timer = window.setTimeout(() => setStep((value) => (value + 1) % durations.length), durations[step]);
    return () => window.clearTimeout(timer);
  }, [step, reduced, durations]);
  return { step: reduced ? durations.length - 1 : step, reduced };
}

/* ---------- Data type ---------- */

export function DataTypeFeatureTip({ anchorRef }) {
  return (
    <FeatureTip
      id={BUILD_TIP_IDS.dataType}
      anchorRef={anchorRef}
      side="right"
      align="start"
      sideOffset={14}
      title="Select a Data Type"
      description="Start by selecting any tag option or pick from the dropdown, depending on what you are interested in, to start constructing your data. As you make selections the preview panel will update immediately."
      action={{ label: "Ok" }}
      closeOnAction
    />
  );
}

/* ---------- Search ---------- */

const SEARCH_QUERY = "election";
const SEARCH_SUGGESTIONS = [
  { title: "Presidential Election Winner 2028", ticker: "PRES-2028" },
  { title: "Which party wins the Senate?", ticker: "SENATE-26" },
  { title: "NYC Mayoral Election", ticker: "NYCMAYOR-25" },
];
const SEARCH_STEPS = [500, ...Array(SEARCH_QUERY.length - 1).fill(110), 2600, 500];

function SearchTipAnimation() {
  const { step, reduced } = useLoopStep(SEARCH_STEPS);
  const typed = Math.min(step, SEARCH_QUERY.length);
  const fading = step === SEARCH_STEPS.length - 1 && !reduced;
  const showResults = typed === SEARCH_QUERY.length;

  return (
    <div aria-hidden className={cn("w-full px-4 transition-opacity duration-500", fading ? "opacity-0" : "opacity-100")}>
      <div className="flex h-9 items-center gap-2 rounded-lg border border-[#0d99ff]/50 bg-white px-3 shadow-[0_0_0_3px_rgba(13,153,255,0.15)] dark:bg-neutral-900">
        <Search className="size-4 shrink-0 text-neutral-400" />
        <span className="truncate text-[14px] text-neutral-900 dark:text-neutral-100">{SEARCH_QUERY.slice(0, typed)}</span>
        <span className="-ml-1.5 h-4 w-px animate-pulse bg-[#0d99ff]" />
      </div>
      {showResults ? (
        <ul className="mt-1.5 overflow-hidden rounded-lg bg-white py-1 shadow-sm dark:bg-neutral-900">
          {SEARCH_SUGGESTIONS.map((item, index) => (
            <li
              key={item.ticker}
              style={{ animationDelay: reduced ? undefined : `${index * 90}ms`, animationFillMode: "both" }}
              className={cn(
                "flex items-center justify-between gap-2 px-3 py-1",
                !reduced && "animate-in fade-in-0 slide-in-from-top-1 duration-300",
                index === 0 && "bg-[#0d99ff]/10",
              )}
            >
              <span className="truncate text-[11px] font-medium text-neutral-800 dark:text-neutral-100">{item.title}</span>
              <span className="shrink-0 font-mono text-[9px] text-neutral-500">{item.ticker}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

const SEARCH_NOUNS = {
  market: { one: "market", many: "markets" },
  event: { one: "event", many: "events" },
  series: { one: "series", many: "series" },
  forecast: { one: "event or series", many: "events or series" },
};

/** Next to the market / event / series search, wherever it sits (left panel or preview). */
export function SearchFeatureTip({ anchorRef, kind = "market", required = false, side = "right", open = true }) {
  const noun = SEARCH_NOUNS[kind] || SEARCH_NOUNS.market;
  const description = [
    `If you know your ${noun.one} ticker, enter it here. You can keep adding multiple.`,
    "You can also just search anything here and Lychee will give you suggestions, based on search findings.",
  ];
  if (!required) {
    description.push(
      <>
        You also <strong className="font-semibold">do not have to</strong> search specific {noun.many} and can just search
        for {noun.many} based on your attribute filter requirements below.
      </>,
    );
  }

  return (
    <FeatureTip
      id={BUILD_TIP_IDS.search}
      after={tipsBefore(BUILD_TIP_IDS.search)}
      anchorRef={anchorRef}
      open={open}
      side={side}
      align={side === "right" || side === "left" ? "start" : "center"}
      sideOffset={14}
      className="w-[296px]"
      mediaClassName="items-start pt-5"
      media={<SearchTipAnimation />}
      title="Search for your market"
      description={description}
      action={{ label: "Ok" }}
      closeOnAction
    />
  );
}

/* ---------- Columns ---------- */

const SHEET_COLUMNS = [
  { label: "Ticker" },
  { label: "Title" },
  { label: "Volume", picked: true },
  { label: "Yes price", picked: true },
  { label: "Created time", picked: true },
  { label: "Open interest" },
  { label: "Close time" },
  { label: "Liquidity" },
  { label: "Last price", picked: true },
  { label: "Category" },
];

function SheetHeaderStrip() {
  return (
    <div className="flex shrink-0">
      {SHEET_COLUMNS.map((column) => (
        <div
          key={column.label}
          className={cn(
            "flex h-8 w-[104px] shrink-0 items-center gap-1.5 border-r border-neutral-200 px-2 text-[10px] font-semibold dark:border-neutral-700",
            column.picked ? "bg-[#0d99ff]/10 text-[#0b6fc2] dark:text-[#5cb8ff]" : "text-neutral-600 dark:text-neutral-300",
          )}
        >
          <span
            className={cn(
              "flex size-3 shrink-0 items-center justify-center rounded-[3px] border",
              column.picked ? "border-[#0d99ff] bg-[#0d99ff] text-white" : "border-neutral-300 dark:border-neutral-600",
            )}
          >
            {column.picked ? <Check className="size-2.5" strokeWidth={3} /> : null}
          </span>
          <span className="truncate">{column.label}</span>
        </div>
      ))}
    </div>
  );
}

function ColumnsTipAnimation() {
  const reduced = usePrefersReducedMotion();
  return (
    <div aria-hidden className="h-full w-full overflow-hidden pt-5">
      <div className="mx-4 overflow-hidden rounded-lg bg-white shadow-sm dark:bg-neutral-900">
        <motion.div
          className="flex w-max border-b border-neutral-200 dark:border-neutral-700"
          animate={reduced ? undefined : { x: ["0%", "-50%"] }}
          transition={reduced ? undefined : { duration: 16, ease: "linear", repeat: Infinity }}
        >
          <SheetHeaderStrip />
          <SheetHeaderStrip />
        </motion.div>
        {[0, 1, 2].map((row) => (
          <div key={row} className="flex h-6 items-center gap-3 border-b border-neutral-100 px-2 last:border-0 dark:border-neutral-800">
            <span className="h-1.5 w-12 rounded-full bg-neutral-200 dark:bg-neutral-700" />
            <span className="h-1.5 w-20 rounded-full bg-neutral-200 dark:bg-neutral-700" />
            <span className="h-1.5 w-10 rounded-full bg-[#0d99ff]/25" />
            <span className="h-1.5 w-10 rounded-full bg-[#0d99ff]/25" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ColumnsFeatureTip({ anchorRef, onDone }) {
  return (
    <FeatureTip
      id={BUILD_TIP_IDS.columns}
      after={tipsBefore(BUILD_TIP_IDS.columns)}
      anchorRef={anchorRef}
      side="right"
      align="start"
      sideOffset={14}
      className="w-[296px]"
      mediaClassName="items-start"
      media={<ColumnsTipAnimation />}
      title="Select the columns you want"
      description="Each data set has a wide selection of columns. Select the ones you are interested in, e.g. volume, price, created time, etc."
      action={{ label: "Ok", onClick: onDone }}
      onDismiss={onDone}
      closeOnAction
    />
  );
}

/* ---------- Attributes ---------- */

const FILTER_ROWS = [
  { title: "Will Elon Musk tweet 200+ times this week?", tag: "Elon" },
  { title: "Rain in NYC tomorrow?", tag: "Rain" },
  { title: "Fed cuts rates in December?" },
  { title: "Will Elon Musk visit Mars?", tag: "Elon" },
  { title: "Rain in Seattle on Saturday?", tag: "Rain" },
];
const FILTER_WORDS = ["Elon", "Rain"];
// Per word: empty, typing letters, filtered hold.
const FILTER_STEPS = FILTER_WORDS.flatMap((word) => [700, ...Array(word.length).fill(120), 2200]);

function filterFrame(step) {
  let at = 0;
  for (const word of FILTER_WORDS) {
    const span = word.length + 2;
    if (step < at + span) {
      const local = step - at;
      return { word, typed: Math.max(0, Math.min(local, word.length)), filtered: local === span - 1 };
    }
    at += span;
  }
  const last = FILTER_WORDS[FILTER_WORDS.length - 1];
  return { word: last, typed: last.length, filtered: true };
}

function AttributesTipAnimation() {
  const { step } = useLoopStep(FILTER_STEPS);
  const { word, typed, filtered } = filterFrame(step);

  return (
    <div aria-hidden className="w-full px-4">
      <div className="flex items-center gap-1.5 text-[10px]">
        <span className="inline-flex items-center gap-1 rounded-md bg-white px-1.5 py-1 font-semibold text-neutral-700 shadow-sm dark:bg-neutral-900 dark:text-neutral-200">
          <Filter className="size-3 text-[#0d99ff]" />
          Title
        </span>
        <span className="rounded-md bg-white px-1.5 py-1 text-neutral-500 shadow-sm dark:bg-neutral-900">contains</span>
        <span className="flex h-[22px] min-w-[64px] items-center rounded-md border border-[#0d99ff]/50 bg-white px-1.5 font-medium text-neutral-900 shadow-[0_0_0_2px_rgba(13,153,255,0.15)] dark:bg-neutral-900 dark:text-neutral-100">
          {typed ? `"${word.slice(0, typed)}` : ""}
          {typed === word.length ? '"' : <span className="ml-px h-3 w-px animate-pulse bg-[#0d99ff]" />}
        </span>
      </div>
      <ul className="mt-2 space-y-1">
        {FILTER_ROWS.map((row) => {
          const match = row.tag === word;
          return (
            <li
              key={row.title}
              className={cn(
                "flex h-[18px] items-center rounded-md px-2 text-[10px] font-medium transition-all duration-500",
                filtered && !match
                  ? "bg-white/40 text-neutral-400 opacity-40 dark:bg-neutral-900/40"
                  : "bg-white text-neutral-800 shadow-sm dark:bg-neutral-900 dark:text-neutral-100",
                filtered && match && "ring-1 ring-[#0d99ff]/50",
              )}
            >
              <span className="truncate">{row.title}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function AttributesFeatureTip({ anchorRef }) {
  return (
    <FeatureTip
      id={BUILD_TIP_IDS.attributes}
      after={tipsBefore(BUILD_TIP_IDS.attributes)}
      anchorRef={anchorRef}
      side="right"
      align="start"
      sideOffset={14}
      className="w-[296px]"
      mediaClassName="h-[172px] items-start pt-4"
      media={<AttributesTipAnimation />}
      title="Filter your data using Attributes"
      description={'All your attributes can be filtered based on your needs. E.g. title containing "Elon" or "Rain". As you select your attribute requirements the preview will be reflected immediately.'}
      action={{ label: "Ok" }}
      closeOnAction
    />
  );
}

/* ---------- Data limits ---------- */

const LIMIT_FROM = 100;
const LIMIT_TO = 500000;
const LIMIT_RISE_MS = 2200;
const LIMIT_HOLD_MS = 1800;
const LIMIT_REST_MS = 900;

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

function DataLimitsTipAnimation() {
  const reduced = usePrefersReducedMotion();
  const [progress, setProgress] = useState(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) {
      setProgress(1);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const cycle = LIMIT_REST_MS + LIMIT_RISE_MS + LIMIT_HOLD_MS;
    const tick = (now) => {
      const t = (now - start) % cycle;
      const rising = Math.min(1, Math.max(0, (t - LIMIT_REST_MS) / LIMIT_RISE_MS));
      setProgress(easeOutCubic(rising));
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [reduced]);

  const rows = Math.round(LIMIT_FROM + (LIMIT_TO - LIMIT_FROM) * progress);
  const done = progress >= 0.999;

  return (
    <div aria-hidden className="w-full px-5">
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Rows per pull</span>
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide transition-colors duration-300",
            done ? "bg-[#0d99ff] text-white" : "bg-white text-neutral-500 dark:bg-neutral-900",
          )}
        >
          {done ? "Pro" : "Demo"}
        </span>
      </div>
      <p className="mt-1 text-[26px] font-semibold tabular-nums leading-none tracking-tight text-neutral-900 dark:text-white">
        {rows.toLocaleString()}
        {done ? "+" : ""}
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white shadow-inner dark:bg-neutral-900">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#0d99ff] to-[#5cb8ff]"
          style={{ width: `${Math.max(2, progress * 100)}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[9px] tabular-nums text-neutral-500">
        <span>100</span>
        <span>500,000+</span>
      </div>
    </div>
  );
}

/** Demo only: explains the 50-row preview and the demo pull limit, with an upgrade path. */
export function DataLimitsFeatureTip({ anchorRef, onUpgrade }) {
  return (
    <FeatureTip
      id={BUILD_TIP_IDS.dataLimits}
      after={tipsBefore(BUILD_TIP_IDS.dataLimits)}
      anchorRef={anchorRef}
      side="bottom"
      align="end"
      sideOffset={10}
      className="w-[296px]"
      media={<DataLimitsTipAnimation />}
      title="Data Limits"
      description="Preview window only shows 50 rows for speed and convenience. Since you are in demo mode, you can only pull 100 rows at a time. Upgrade to pull 500,000 or more rows at once, to really supercharge your research."
      secondaryAction={{ label: "Continue" }}
      action={{ label: "Upgrade", onClick: onUpgrade }}
      closeOnAction
    />
  );
}
