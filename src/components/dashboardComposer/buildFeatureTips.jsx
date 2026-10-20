"use client";

import { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import {
  Check,
  ChevronRight,
  Download,
  Filter,
  LayoutDashboard,
  Lock,
  MoreVertical,
  MousePointer2,
  MoveDiagonal2,
  MoveHorizontal,
  PartyPopper,
  Search,
  Sheet,
  Sparkles,
} from "lucide-react";

import { HandToolIcon } from "@/components/dashboardComposer/handToolIcon";
import { FeatureTip, useFeatureTipDismissal, usePrefersReducedMotion } from "@/components/ui/feature-tip";
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
  continueStep: "integration-build-continue",
  enrichments: "integration-build-enrichments",
  sheetLimit: "integration-build-sheet-limit",
  saveRun: "integration-build-save-run",
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
      description="Start by selecting a tag or an option from the dropdown. As you progress, your preview panel will reflect your changes immediately."
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

/* ---------- Continue ---------- */

/** On the button that leaves the compose step for enrichments. Clicking that button closes it too. */
export function ContinueFeatureTip({ anchorRef }) {
  return (
    <FeatureTip
      id={BUILD_TIP_IDS.continueStep}
      after={tipsBefore(BUILD_TIP_IDS.continueStep)}
      anchorRef={anchorRef}
      side="right"
      align="center"
      sideOffset={14}
      description="Click this button to continue to the next step."
      action={{ label: "Ok" }}
      closeOnAction
    />
  );
}

/* ---------- Enrichments ---------- */

const ENRICHMENT_GUIDE = [
  { id: "join", title: "Join", blurb: "pull related data, like the trades behind every market, into new sheets." },
  { id: "summarize", title: "Summarize", blurb: "totals, averages and counts on a summary sheet." },
  { id: "sample", title: "Random sample", blurb: "a random set of rows to study." },
  { id: "bucket", title: "Bucketing", blurb: "group rows by category, number range or time." },
  { id: "function", title: "Function", blurb: "add your own calculated columns." },
];

// What each enrichment adds to the mini sheet, in ENRICHMENT_GUIDE order.
const ENRICHMENT_ADDS = [
  { chip: "Join", tab: "Trades" },
  { chip: "Summarize", tab: "Summary" },
  { chip: "Sample", tab: "Sample" },
  { chip: "Bucketing", tab: "Buckets" },
  { chip: "Function", column: "ƒ Edge" },
];
// Blank, one step per enrichment, hold, fade.
const ENRICHMENT_STEPS = [600, ...ENRICHMENT_ADDS.map(() => 1000), 1800, 500];

function EnrichmentsTipAnimation() {
  const { step, reduced } = useLoopStep(ENRICHMENT_STEPS);
  const added = Math.min(step, ENRICHMENT_ADDS.length);
  const fading = step === ENRICHMENT_STEPS.length - 1 && !reduced;
  const tabs = ["Markets", ...ENRICHMENT_ADDS.slice(0, added).filter((item) => item.tab).map((item) => item.tab)];
  const functionOn = added === ENRICHMENT_ADDS.length;

  return (
    <div aria-hidden className={cn("w-full px-4 transition-opacity duration-500", fading ? "opacity-0" : "opacity-100")}>
      <div className="flex flex-wrap gap-1">
        {ENRICHMENT_ADDS.map((item, index) => {
          const on = index < added;
          const current = index === added - 1 && !reduced;
          return (
            <span
              key={item.chip}
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-1.5 py-[3px] text-[10px] font-semibold transition-all duration-300",
                on
                  ? "bg-[#0d99ff] text-white"
                  : "bg-white text-neutral-600 shadow-sm dark:bg-neutral-900 dark:text-neutral-300",
                current && "scale-105",
              )}
            >
              <span
                className={cn(
                  "flex size-2.5 items-center justify-center rounded-[2px] border",
                  on ? "border-white bg-white text-[#0d99ff]" : "border-neutral-300 dark:border-neutral-600",
                )}
              >
                {on ? <Check className="size-2" strokeWidth={3.5} /> : null}
              </span>
              {item.chip}
            </span>
          );
        })}
      </div>
      <div className="mt-2.5 overflow-hidden rounded-lg bg-white shadow-sm dark:bg-neutral-900">
        <div className="flex border-b border-neutral-200 dark:border-neutral-700">
          {tabs.map((tab, index) => (
            <span
              key={tab}
              className={cn(
                "border-r border-neutral-200 px-1.5 py-1 text-[9px] font-medium dark:border-neutral-700",
                index === tabs.length - 1 && index > 0
                  ? "bg-[#0d99ff]/10 text-[#0b6fc2] dark:text-[#5cb8ff]"
                  : "text-neutral-500",
                index > 0 && !reduced && "animate-in fade-in-0 slide-in-from-left-1 duration-300",
              )}
            >
              {tab}
            </span>
          ))}
        </div>
        <div className="flex border-b border-neutral-100 text-[9px] font-semibold text-neutral-600 dark:border-neutral-800 dark:text-neutral-300">
          <span className="w-[38%] px-1.5 py-1">Title</span>
          <span className="w-[22%] px-1.5 py-1">Volume</span>
          <span className="w-[20%] px-1.5 py-1">Price</span>
          {functionOn ? (
            <span
              className={cn(
                "w-[20%] bg-[#0d99ff]/10 px-1.5 py-1 text-[#0b6fc2] dark:text-[#5cb8ff]",
                !reduced && "animate-in fade-in-0 duration-300",
              )}
            >
              {ENRICHMENT_ADDS[ENRICHMENT_ADDS.length - 1].column}
            </span>
          ) : null}
        </div>
        {[0, 1].map((row) => (
          <div key={row} className="flex h-5 items-center border-b border-neutral-100 last:border-0 dark:border-neutral-800">
            <span className="w-[38%] px-1.5">
              <span className="block h-1.5 w-14 rounded-full bg-neutral-200 dark:bg-neutral-700" />
            </span>
            <span className="w-[22%] px-1.5">
              <span className="block h-1.5 w-8 rounded-full bg-neutral-200 dark:bg-neutral-700" />
            </span>
            <span className="w-[20%] px-1.5">
              <span className="block h-1.5 w-6 rounded-full bg-neutral-200 dark:bg-neutral-700" />
            </span>
            {functionOn ? (
              <span className="w-[20%] px-1.5">
                <span className="block h-1.5 w-6 rounded-full bg-[#0d99ff]/35" />
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export function EnrichmentsFeatureTip({ anchorRef }) {
  return (
    <FeatureTip
      id={BUILD_TIP_IDS.enrichments}
      after={tipsBefore(BUILD_TIP_IDS.enrichments)}
      anchorRef={anchorRef}
      side="right"
      align="start"
      sideOffset={14}
      className="w-[312px]"
      mediaClassName="h-[156px] items-start pt-4"
      media={<EnrichmentsTipAnimation />}
      title="Take your research further"
      description="This is the enrichment step. Lychee makes it easy to do things with your data you've never been able to do before, with no code."
      body={
        <>
          <ul className="space-y-1 text-[12px] leading-[1.4] text-neutral-700 dark:text-neutral-300">
            {ENRICHMENT_GUIDE.map((item) => (
              <li key={item.id} className="flex gap-1.5">
                <span className="mt-[7px] size-1 shrink-0 rounded-full bg-[#0d99ff]" />
                <span>
                  <span className="font-semibold text-neutral-900 dark:text-white">{item.title}</span>: {item.blurb}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2.5 text-[13px] leading-[1.45] text-neutral-800 dark:text-neutral-200">
            Hover over each enrichment to see more details.
          </p>
        </>
      }
      action={{ label: "Ok" }}
      closeOnAction
    />
  );
}

/* ---------- Sheet limit ---------- */

// Markets plus these fill the demo's sheets for one pull; the locked ones are what's left out.
const SHEET_TABS = [
  "PRES-28",
  "SENATE-26",
  "FED-DEC",
  "NYC-25",
  "RAIN-NY",
  "BTC-100K",
  "NBA-25",
  "OSCARS",
  "CPI-JUN",
  "GDP-Q3",
  "ELON-200",
];
const LOCKED_TABS = ["TSLA-Q4", "WC-26", "SPX-6K"];
const ANIMATION_SHEET_CAP = SHEET_TABS.length + 1;
// Blank, one step per allowed sheet, one per locked sheet, hold, fade.
const SHEET_LIMIT_STEPS = [600, ...SHEET_TABS.map(() => 220), ...LOCKED_TABS.map(() => 320), 2200, 500];

function SheetChip({ label, state, animate }) {
  return (
    <span
      className={cn(
        "inline-flex h-[19px] min-w-0 items-center gap-1 rounded-md px-1.5 text-[8.5px] font-semibold",
        state === "parent" && "bg-white text-neutral-500 shadow-sm dark:bg-neutral-900",
        state === "new" && "bg-white text-[#0b6fc2] shadow-sm ring-1 ring-[#0d99ff]/40 dark:bg-neutral-900 dark:text-[#5cb8ff]",
        state === "locked" && "border border-dashed border-neutral-400/70 text-neutral-400 dark:border-neutral-600",
        animate && "animate-in fade-in-0 zoom-in-90 duration-300",
      )}
    >
      {state === "locked" ? <Lock className="size-2.5 shrink-0" /> : <Sheet className="size-2.5 shrink-0" />}
      <span className="truncate">{label}</span>
    </span>
  );
}

function SheetLimitTipAnimation() {
  const { step, reduced } = useLoopStep(SHEET_LIMIT_STEPS);
  const made = Math.min(step, SHEET_TABS.length);
  const locked = Math.max(0, Math.min(step - SHEET_TABS.length, LOCKED_TABS.length));
  const fading = step === SHEET_LIMIT_STEPS.length - 1 && !reduced;
  const full = made === SHEET_TABS.length;
  const placed = made + 1;

  return (
    <div aria-hidden className={cn("w-full px-4 transition-opacity duration-500", fading ? "opacity-0" : "opacity-100")}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Sheets this pull</span>
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[9px] font-semibold tabular-nums transition-colors duration-300",
            full ? "bg-[#0d99ff] text-white" : "bg-white text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300",
          )}
        >
          {placed} / {ANIMATION_SHEET_CAP} demo limit
        </span>
      </div>
      <div className="mt-2 grid grid-cols-4 gap-1">
        <SheetChip label="Markets" state="parent" />
        {SHEET_TABS.slice(0, made).map((label) => (
          <SheetChip key={label} label={label} state="new" animate={!reduced} />
        ))}
        {LOCKED_TABS.slice(0, locked).map((label) => (
          <SheetChip key={label} label={label} state="locked" animate={!reduced} />
        ))}
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white shadow-inner dark:bg-neutral-900">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#0d99ff] to-[#5cb8ff] transition-[width] duration-300"
          style={{ width: `${(placed / ANIMATION_SHEET_CAP) * 100}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Demo only: next to the sheet tabs an enrichment generates.
 * `sheets` is the new sheets; `total` also counts the sheet they come from, which is what `cap` limits.
 */
export function SheetLimitFeatureTip({ anchorRef, sheets, total, cap, open = true, onUpgrade }) {
  const noun = sheets === 1 ? "sheet" : "sheets";
  const over = total > cap;
  return (
    <FeatureTip
      id={BUILD_TIP_IDS.sheetLimit}
      after={tipsBefore(BUILD_TIP_IDS.sheetLimit)}
      anchorRef={anchorRef}
      open={open}
      side="bottom"
      align="start"
      sideOffset={6}
      alignOffset={16}
      className="w-[296px]"
      mediaClassName="h-[160px] items-start pt-4"
      media={<SheetLimitTipAnimation />}
      title="Sheet limits"
      description={`Your enrichment generates ${sheets.toLocaleString()} new ${noun}. Since you're on demo, you can pull a maximum of ${cap.toLocaleString()} sheets at once${
        over ? `, so only the first ${cap.toLocaleString()} will be pulled` : ""
      }. To get more sheets and more tabs, upgrade.`}
      secondaryAction={{ label: "Continue" }}
      action={{ label: "Upgrade", onClick: onUpgrade }}
      closeOnAction
    />
  );
}

/* ---------- Save and run ---------- */

/** On Save and run. Clicking that button closes it too. */
export function SaveRunFeatureTip({ anchorRef, open = true }) {
  return (
    <FeatureTip
      id={BUILD_TIP_IDS.saveRun}
      after={tipsBefore(BUILD_TIP_IDS.saveRun)}
      anchorRef={anchorRef}
      open={open}
      side="right"
      align="end"
      sideOffset={14}
      title="Start your pull"
      description="Hit this to start your full data pulls."
      action={{ label: "Ok" }}
      closeOnAction
    />
  );
}

/* ---------- First pull ---------- */

export const FIRST_PULL_TIP_ID = "integration-build-first-pull";

const CONFETTI_COLORS = ["#0d99ff", "#5cb8ff", "#0b6fc2", "#b3defe", "#ffc83d", "#ffffff"];

function burstConfetti() {
  const base = { colors: CONFETTI_COLORS, startVelocity: 44, gravity: 0.9, ticks: 240, zIndex: 590, disableForReducedMotion: true };
  confetti({ ...base, particleCount: 120, spread: 80, origin: { y: 0.6 } });
  window.setTimeout(() => confetti({ ...base, particleCount: 55, angle: 60, spread: 58, origin: { x: 0, y: 0.72 } }), 160);
  window.setTimeout(() => confetti({ ...base, particleCount: 55, angle: 120, spread: 58, origin: { x: 1, y: 0.72 } }), 280);
}

const MEDIA_CONFETTI_COLORS = ["#0d99ff", "#5cb8ff", "#0b6fc2", "#ffc83d", "#ff8a65"];
// Falling pieces in the tip's media box: left %, delay s, fall time s, color index, spin deg, round.
const MEDIA_CONFETTI = [
  [6, 0, 2.8, 0, 260, false],
  [14, 1.1, 3.2, 4, -200, true],
  [22, 0.5, 2.6, 1, 220, false],
  [31, 1.8, 3, 3, -280, false],
  [39, 0.2, 3.4, 2, 180, true],
  [48, 1.4, 2.7, 0, -240, false],
  [57, 0.8, 3.1, 4, 300, false],
  [65, 2, 2.9, 1, -180, true],
  [73, 0.3, 3.3, 3, 240, false],
  [81, 1.6, 2.6, 0, -300, false],
  [89, 0.9, 3, 2, 200, true],
  [95, 2.3, 3.2, 4, -220, false],
];
const DASHBOARD_BARS = [38, 62, 46, 80, 58, 92];
// Blank, bars rise, badge pops and holds, fade.
const FIRST_PULL_STEPS = [350, 900, 3200, 500];

function FirstPullTipAnimation() {
  const { step, reduced } = useLoopStep(FIRST_PULL_STEPS);
  const rising = step >= 1;
  const done = step >= 2;
  const fading = step === FIRST_PULL_STEPS.length - 1 && !reduced;

  return (
    <div aria-hidden className="absolute inset-0">
      {MEDIA_CONFETTI.map(([left, delay, fall, color, spin, round], index) => (
        <motion.span
          key={index}
          className={cn("absolute top-0", round ? "size-[6px] rounded-full" : "h-[9px] w-[4px] rounded-[1px]")}
          style={{ left: `${left}%`, backgroundColor: MEDIA_CONFETTI_COLORS[color] }}
          initial={reduced ? false : { y: -16, rotate: 0, opacity: 0 }}
          animate={reduced ? { y: 18 + ((index * 37) % 110), rotate: spin / 4, opacity: 0.85 } : { y: [-16, 160], rotate: [0, spin], opacity: [0, 1, 1, 0] }}
          transition={reduced ? { duration: 0 } : { duration: fall, delay, repeat: Infinity, ease: "linear" }}
        />
      ))}

      <div className={cn("absolute inset-0 flex items-center justify-center transition-opacity duration-500", fading ? "opacity-0" : "opacity-100")}>
        <div className="relative w-[156px] rounded-lg bg-white p-2.5 shadow-sm dark:bg-neutral-900">
          <div className="flex items-center gap-1.5">
            <LayoutDashboard className="size-3 text-[#0d99ff]" />
            <span className="text-[9px] font-semibold text-neutral-700 dark:text-neutral-200">Your dashboard</span>
          </div>
          <div className="mt-2 flex h-[46px] items-end gap-1.5 border-b border-neutral-200 pb-px dark:border-neutral-700">
            {DASHBOARD_BARS.map((height, index) => (
              <span
                key={index}
                className="flex-1 origin-bottom rounded-t-[2px] bg-gradient-to-t from-[#0d99ff] to-[#5cb8ff]"
                style={{
                  height: `${height}%`,
                  transform: rising ? "scaleY(1)" : "scaleY(0)",
                  transition: reduced ? "none" : `transform 520ms cubic-bezier(0.23,1,0.32,1) ${index * 70}ms`,
                }}
              />
            ))}
          </div>
          <div className="mt-2 space-y-1">
            <span className="block h-1 w-[78%] rounded-full bg-neutral-200 dark:bg-neutral-700" />
            <span className="block h-1 w-[52%] rounded-full bg-neutral-200 dark:bg-neutral-700" />
          </div>

          {done ? (
            <motion.span
              className="absolute -right-3 -top-3 grid size-8 place-items-center rounded-full bg-[#0d99ff] text-white shadow-[0_0_0_3px_#fff] dark:shadow-[0_0_0_3px_#171717]"
              initial={reduced ? false : { scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 16 }}
            >
              {!reduced ? <span className="absolute inset-0 animate-ping rounded-full bg-[#0d99ff]/40 [animation-iteration-count:2]" /> : null}
              <PartyPopper className="relative size-4" strokeWidth={2.25} />
            </motion.span>
          ) : null}
          {done ? (
            <>
              <Sparkles className={cn("absolute -left-4 top-1 size-3.5 text-[#ffc83d]", !reduced && "animate-in fade-in-0 zoom-in-50 duration-500")} />
              <Sparkles className={cn("absolute -bottom-3 -right-1 size-3 text-[#5cb8ff]", !reduced && "animate-in fade-in-0 zoom-in-50 delay-150 duration-500")} />
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/**
 * After the first pull that finishes, next to View dashboard. Bursts confetti when it opens.
 * Clicking View dashboard (or closing the run card) counts as seeing it.
 */
export function FirstPullFeatureTip({ anchorRef, runId, open = true }) {
  const { dismissed } = useFeatureTipDismissal(FIRST_PULL_TIP_ID);
  const celebratedRef = useRef(null);
  useEffect(() => {
    if (!open || dismissed !== false || !runId || celebratedRef.current === runId) return;
    celebratedRef.current = runId;
    burstConfetti();
  }, [open, dismissed, runId]);

  return (
    <FeatureTip
      id={FIRST_PULL_TIP_ID}
      anchorRef={anchorRef}
      open={open}
      side="right"
      align="center"
      sideOffset={14}
      className="w-[288px]"
      media={<FirstPullTipAnimation />}
      title="Hooray, you ran your 1st pull!"
      description="Congratulations, you ran your first pull. Click here to take a look at your Lychee dashboard."
      action={{ label: "Ok" }}
      closeOnAction
    />
  );
}

/* ---------- Export ---------- */

export const EXPORT_TIP_ID = "dashboard-export";

const EXPORT_BARS = [42, 70, 54, 88, 64];
const EXPORT_FORMATS = ["PNG", "JPG", "SVG"];
// Rest, cursor to the menu, menu open, cursor on Export, PNG picked and downloaded, fade.
const EXPORT_STEPS = [700, 650, 650, 800, 2000, 500];
// Cursor tip per step, in px inside the media box.
const EXPORT_CURSOR = [
  { x: 246, y: 120 },
  { x: 161, y: 29 },
  { x: 161, y: 29 },
  { x: 150, y: 71 },
  { x: 214, y: 70 },
  { x: 214, y: 70 },
];

function ExportTipAnimation() {
  const { step, reduced } = useLoopStep(EXPORT_STEPS);
  const menuOpen = step >= 2;
  const subOpen = step >= 3;
  const picked = step >= 4;
  const fading = step === EXPORT_STEPS.length - 1 && !reduced;
  const cursor = EXPORT_CURSOR[step];

  return (
    <div aria-hidden className={cn("absolute inset-0 transition-opacity duration-500", fading ? "opacity-0" : "opacity-100")}>
      <div className="absolute left-4 top-4 h-[112px] w-[160px] rounded-lg bg-white p-2.5 shadow-sm dark:bg-neutral-900">
        <span className="block text-[9px] font-semibold text-neutral-700 dark:text-neutral-200">Volume</span>
        <span
          className={cn(
            "absolute right-1.5 top-1.5 grid size-4 place-items-center rounded-sm text-neutral-500 transition-colors duration-200",
            step >= 1 && "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-white",
          )}
        >
          <MoreVertical className="size-3" />
        </span>
        <div className="mt-2 flex h-[64px] items-end gap-1.5 border-b border-neutral-200 pb-px dark:border-neutral-700">
          {EXPORT_BARS.map((height, index) => (
            <span key={index} className="flex-1 rounded-t-[2px] bg-gradient-to-t from-[#0d99ff] to-[#5cb8ff]" style={{ height: `${height}%` }} />
          ))}
        </div>
        <span className="mt-1.5 block h-1 w-[60%] rounded-full bg-neutral-200 dark:bg-neutral-700" />
      </div>

      {menuOpen ? (
        <div
          className={cn(
            "absolute left-[104px] top-[42px] w-[84px] rounded-md bg-white p-[3px] shadow-md ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/10",
            !reduced && "animate-in fade-in-0 zoom-in-95 duration-150",
          )}
        >
          <span className="flex h-[18px] items-center px-1.5">
            <span className="h-1 w-10 rounded-full bg-neutral-200 dark:bg-neutral-700" />
          </span>
          <span
            className={cn(
              "flex h-[18px] items-center gap-1 rounded-[4px] px-1.5 text-[9px] font-semibold text-neutral-700 transition-colors duration-200 dark:text-neutral-200",
              subOpen && "bg-[#0d99ff]/10 text-[#0b6fc2] dark:text-[#5cb8ff]",
            )}
          >
            <Download className="size-2.5" />
            Export
            <ChevronRight className="ml-auto size-2.5" />
          </span>
          <span className="flex h-[18px] items-center px-1.5">
            <span className="h-1 w-8 rounded-full bg-neutral-200 dark:bg-neutral-700" />
          </span>
          <span className="flex h-[18px] items-center px-1.5">
            <span className="h-1 w-9 rounded-full bg-neutral-200 dark:bg-neutral-700" />
          </span>
        </div>
      ) : null}

      {subOpen ? (
        <div
          className={cn(
            "absolute left-[192px] top-[60px] w-[60px] rounded-md bg-white p-[3px] shadow-md ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/10",
            !reduced && "animate-in fade-in-0 slide-in-from-left-1 duration-150",
          )}
        >
          {EXPORT_FORMATS.map((format, index) => (
            <span
              key={format}
              className={cn(
                "flex h-4 items-center rounded-[4px] px-1.5 text-[9px] font-medium text-neutral-700 transition-colors duration-200 dark:text-neutral-200",
                picked && index === 0 && "bg-[#0d99ff] text-white dark:text-white",
              )}
            >
              {format}
            </span>
          ))}
        </div>
      ) : null}

      {picked ? (
        <span
          className={cn(
            "absolute bottom-2.5 right-3 inline-flex h-5 items-center gap-1 rounded-full bg-[#0d99ff] pl-1.5 pr-2 text-[9px] font-semibold text-white shadow-sm",
            !reduced && "animate-in fade-in-0 slide-in-from-bottom-2 delay-200 duration-300 [animation-fill-mode:both]",
          )}
        >
          <Download className="size-2.5" strokeWidth={2.5} />
          volume.png
        </span>
      ) : null}

      <MousePointer2
        className="absolute size-4 fill-neutral-900 text-white drop-shadow-sm dark:fill-white dark:text-neutral-900"
        strokeWidth={1.5}
        style={{
          left: cursor.x - 3,
          top: cursor.y - 2,
          transition: reduced ? "none" : "left 520ms cubic-bezier(0.23,1,0.32,1), top 520ms cubic-bezier(0.23,1,0.32,1)",
        }}
      />
    </div>
  );
}

/** On the dashboard, after the first-pull tip: points at Export in a block's open ⋯ menu. */
export function ExportFeatureTip({ anchorRef, open = true, onDone }) {
  return (
    <FeatureTip
      id={EXPORT_TIP_ID}
      anchorRef={anchorRef}
      open={open}
      side="left"
      align="center"
      sideOffset={16}
      className="w-[288px]"
      media={<ExportTipAnimation />}
      title="Export any component on your dashboard"
      description="Open the ⋯ menu on any sheet, chart, rich table or stats card and choose Export. Sheets download as CSV, JSON or Excel. Charts, rich tables and stats cards download as PNG, JPG or SVG."
      action={{ label: "Got it", onClick: onDone }}
      onDismiss={onDone}
      closeOnAction
    />
  );
}

/* ---------- Editing with the hand tool ---------- */

// Shown one after another: the hand in the dock, then (in hand mode) resizing, then moving.
export const HAND_TIP_ID = "dashboard-hand-tool";
export const RESIZE_TIP_ID = "dashboard-resize";
export const MOVE_TIP_ID = "dashboard-move";

const EASE_OUT = "cubic-bezier(0.23,1,0.32,1)";

function MiniCard({ title = "Volume", bars = EXPORT_BARS, className, style }) {
  return (
    <div className={cn("absolute flex flex-col rounded-lg bg-white p-2 shadow-sm dark:bg-neutral-900", className)} style={style}>
      <span className="text-[8px] font-semibold text-neutral-700 dark:text-neutral-200">{title}</span>
      <div className="mt-1 flex min-h-0 flex-1 items-end gap-1 border-b border-neutral-200 pb-px dark:border-neutral-700">
        {bars.map((height, index) => (
          <span key={index} className="flex-1 rounded-t-[2px] bg-gradient-to-t from-[#0d99ff] to-[#5cb8ff]" style={{ height: `${height}%` }} />
        ))}
      </div>
    </div>
  );
}

/** Cursor glyph whose hotspot sits on (x, y). */
function TipCursor({ x, y, kind = "pointer", closed = false, reduced }) {
  const transition = reduced ? "none" : `left 700ms ${EASE_OUT}, top 700ms ${EASE_OUT}`;
  if (kind === "pointer") {
    return (
      <MousePointer2
        className="absolute z-20 size-4 fill-neutral-900 text-white drop-shadow-sm dark:fill-white dark:text-neutral-900"
        strokeWidth={1.5}
        style={{ left: x - 3, top: y - 2, transition }}
      />
    );
  }
  const Icon = kind === "ew" ? MoveHorizontal : kind === "diagonal" ? MoveDiagonal2 : null;
  return (
    <span
      className="absolute z-20 grid size-[22px] place-items-center rounded-full bg-white text-neutral-900 shadow-sm ring-1 ring-black/10 dark:bg-neutral-800 dark:text-white dark:ring-white/15"
      style={{ left: x - 11, top: y - 11, transition }}
    >
      {Icon ? <Icon className="size-3" strokeWidth={2.25} /> : <HandToolIcon closed={closed} className="size-[14px]" />}
    </span>
  );
}

const HAND_STEPS = [700, 800, 700, 1000, 500, 1500, 500];
// Cursor per step: to the dock's hand, onto the left card, grab, drag it right, let go, hold, fade.
const HAND_CURSOR = [
  { x: 214, y: 132 },
  { x: 144, y: 127 },
  { x: 80, y: 54 },
  { x: 208, y: 54 },
  { x: 208, y: 54 },
  { x: 208, y: 54 },
  { x: 208, y: 54 },
];

function HandTipAnimation() {
  const { step, reduced } = useLoopStep(HAND_STEPS);
  const handOn = step >= 1;
  const swapped = step >= 3;
  const grabbing = step === 2 || step === 3;
  const fading = step === HAND_STEPS.length - 1 && !reduced;
  const cursor = HAND_CURSOR[step];
  const slide = reduced ? "none" : `left 900ms ${EASE_OUT}, box-shadow 200ms ease-out`;

  return (
    <div aria-hidden className={cn("absolute inset-0 transition-opacity duration-500", fading ? "opacity-0" : "opacity-100")}>
      <MiniCard
        title="Volume"
        className={cn("top-[14px] h-[84px] w-[120px]", grabbing && "z-10 shadow-lg ring-1 ring-[#0d99ff]/50")}
        style={{ left: swapped ? 148 : 20, transition: slide }}
      />
      <MiniCard
        title="Price"
        bars={[60, 44, 72, 50, 82]}
        className="top-[14px] h-[84px] w-[120px]"
        style={{ left: swapped ? 20 : 148, transition: slide }}
      />

      <div className="absolute left-[107px] top-[114px] flex h-[26px] items-center gap-0.5 rounded-[8px] bg-white px-1 shadow-sm dark:bg-neutral-900">
        <span className="grid size-[20px] place-items-center text-neutral-500">
          <MousePointer2 className="size-3" strokeWidth={1.75} />
        </span>
        <span
          className={cn(
            "grid size-[20px] place-items-center rounded-[5px] transition-colors duration-200",
            handOn ? "bg-[#0d99ff] text-white" : "text-neutral-500",
          )}
        >
          <HandToolIcon closed={grabbing} className="size-3" />
        </span>
        <span className="grid size-[20px] place-items-center text-neutral-500">
          <Sheet className="size-3" strokeWidth={1.75} />
        </span>
      </div>

      <TipCursor x={cursor.x} y={cursor.y} kind={step >= 2 ? "hand" : "pointer"} closed={grabbing} reduced={reduced} />
    </div>
  );
}

/** On the hand tool in the dock. Picking the hand closes it and moves on to resizing. */
export function HandToolFeatureTip({ anchorRef, open = true }) {
  return (
    <FeatureTip
      id={HAND_TIP_ID}
      anchorRef={anchorRef}
      open={open}
      side="top"
      align="center"
      sideOffset={14}
      className="w-[288px]"
      media={<HandTipAnimation />}
      title="Select the hand tool to customize your dashboard even further"
      description="Select the hand tool to start editing your dashboard and layouts."
      action={{ label: "Ok" }}
      closeOnAction
    />
  );
}

const RESIZE_STEPS = [700, 700, 1100, 600, 1100, 1500, 500];
// Card size and cursor per step: to the right edge, drag it wider, to the corner, drag it taller, hold, fade.
const RESIZE_FRAMES = [
  { w: 130, h: 64, cursor: { x: 236, y: 128 }, kind: "ew" },
  { w: 130, h: 64, cursor: { x: 154, y: 50 }, kind: "ew", edge: true },
  { w: 220, h: 64, cursor: { x: 244, y: 50 }, kind: "ew", edge: true },
  { w: 220, h: 64, cursor: { x: 244, y: 82 }, kind: "diagonal", corner: true },
  { w: 220, h: 112, cursor: { x: 244, y: 130 }, kind: "diagonal", corner: true },
  { w: 220, h: 112, cursor: { x: 244, y: 130 }, kind: "diagonal" },
  { w: 220, h: 112, cursor: { x: 244, y: 130 }, kind: "diagonal" },
];

function ResizeTipAnimation() {
  const { step, reduced } = useLoopStep(RESIZE_STEPS);
  const frame = RESIZE_FRAMES[step];
  const fading = step === RESIZE_STEPS.length - 1 && !reduced;
  const grow = reduced ? "none" : `width 1000ms ${EASE_OUT}, height 1000ms ${EASE_OUT}`;

  return (
    <div aria-hidden className={cn("absolute inset-0 transition-opacity duration-500", fading ? "opacity-0" : "opacity-100")}>
      <div className="absolute left-6 top-[18px]" style={{ width: frame.w, height: frame.h, transition: grow }}>
        <MiniCard className={cn("inset-0", (frame.edge || frame.corner) && "ring-1 ring-[#0d99ff]/60")} />
        <span
          className={cn(
            "absolute -right-[2px] top-2 bottom-2 w-1 rounded-full bg-[#0d99ff] transition-opacity duration-200",
            frame.edge ? "opacity-100" : "opacity-0",
          )}
        />
        <span
          className={cn(
            "absolute -bottom-[3px] -right-[3px] size-2 rounded-[2px] border-2 border-[#0d99ff] bg-white transition-opacity duration-200",
            frame.corner ? "opacity-100" : "opacity-0",
          )}
        />
      </div>
      <TipCursor x={frame.cursor.x} y={frame.cursor.y} kind={frame.kind} reduced={reduced} />
    </div>
  );
}

/** In hand mode, on the right edge of a component. Resizing one closes it and moves on to the layout tip. */
export function ResizeFeatureTip({ anchorRef, open = true }) {
  return (
    <FeatureTip
      id={RESIZE_TIP_ID}
      anchorRef={anchorRef}
      open={open}
      updatePositionStrategy="always"
      side="right"
      align="center"
      sideOffset={14}
      className="w-[288px]"
      media={<ResizeTipAnimation />}
      title="Adjust the size of your components"
      description="When you're in edit mode, click and drag the edge of a component to resize it to your liking."
      action={{ label: "Ok" }}
      closeOnAction
    />
  );
}

const MOVE_STEPS = [700, 700, 400, 1100, 500, 1500, 500];
// Cursor per step: onto the right card, grab, drag it below, drop, hold, fade.
const MOVE_CURSOR = [
  { x: 236, y: 132 },
  { x: 210, y: 43 },
  { x: 210, y: 43 },
  { x: 144, y: 107 },
  { x: 144, y: 107 },
  { x: 144, y: 107 },
  { x: 144, y: 107 },
];

function MoveTipAnimation() {
  const { step, reduced } = useLoopStep(MOVE_STEPS);
  const lifted = step === 2 || step === 3;
  const moved = step >= 3;
  const fading = step === MOVE_STEPS.length - 1 && !reduced;
  const cursor = MOVE_CURSOR[step];
  const glide = reduced ? "none" : `left 1000ms ${EASE_OUT}, top 1000ms ${EASE_OUT}, transform 200ms ease-out, box-shadow 200ms ease-out`;

  return (
    <div aria-hidden className={cn("absolute inset-0 transition-opacity duration-500", fading ? "opacity-0" : "opacity-100")}>
      <div
        className={cn("absolute inset-0 transition-opacity duration-300", lifted ? "opacity-100" : "opacity-0")}
        style={{ backgroundImage: "radial-gradient(circle, rgba(13,153,255,0.45) 1px, transparent 1.2px)", backgroundSize: "12px 12px" }}
      />
      <span
        className={cn(
          "absolute left-[82px] top-[80px] h-[58px] w-[124px] rounded-lg border border-dashed border-[#0d99ff] transition-opacity duration-200",
          lifted ? "opacity-100" : "opacity-0",
        )}
      />
      <MiniCard title="Volume" className="left-4 top-[14px] h-[58px] w-[124px]" />
      <MiniCard
        title="Price"
        bars={[60, 44, 72, 50, 82]}
        className={cn("h-[58px] w-[124px]", lifted && "z-10 scale-[1.03] shadow-lg ring-1 ring-[#0d99ff]/50")}
        style={{ left: moved ? 82 : 148, top: moved ? 80 : 14, transition: glide }}
      />
      <TipCursor x={cursor.x} y={cursor.y} kind="hand" closed={lifted} reduced={reduced} />
    </div>
  );
}

/** In hand mode, on a component's header. Moving one closes it. */
export function MoveFeatureTip({ anchorRef, open = true }) {
  return (
    <FeatureTip
      id={MOVE_TIP_ID}
      anchorRef={anchorRef}
      open={open}
      updatePositionStrategy="always"
      side="bottom"
      align="start"
      sideOffset={10}
      alignOffset={16}
      className="w-[288px]"
      media={<MoveTipAnimation />}
      title="Adjust your layout"
      description="Arrange your dashboard however you want. Click and drag any component to place it anywhere on your dashboard."
      action={{ label: "Ok" }}
      closeOnAction
    />
  );
}
