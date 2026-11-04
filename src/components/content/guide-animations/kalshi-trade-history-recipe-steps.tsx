"use client";

import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Check,
  ChevronRight,
  CircleArrowDown,
  Copy,
  Database,
  Download,
  FileSpreadsheet,
  Hand,
  Loader2,
  Maximize2,
  MoreVertical,
  MousePointer2,
  Pencil,
  Plus,
  Search,
  Share,
  Table2,
  Trash2,
  TrendingUp,
  Type,
} from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

import { FeatureWindow, GREEN, VIOLET } from "@/components/sections/features/feature-kit";
import { cn } from "@/lib/utils";
import {
  GuideAnimationFigure,
  GuideCursor,
  MonoTag,
  ScaledStage,
  useGuidePhases,
  useTypedText,
} from "./guide-animation-kit";

const STAGE_W = 880;
const STAGE_H = 540;

export type RecipeVenue = "kalshi" | "polymarket";

export type ResultItem = { title: string; subtitle: string; mono?: string; meta: string; status?: "Open" | "Closed" };
type SheetColumn = { label: string; width: number };
type RunStep = { name: string; args: string; result: string; time: string };
type FigureCopy = { label: string; caption: string };

type VenueConfig = {
  recipeTitle: string;
  hint: string;
  placeholder: string;
  chips: { label: string; mono?: boolean }[];
  query: string;
  results: ResultItem[];
  legend: [string, string][];
  market: { title: string; subtitle: string; id: string; stats: [string, string, string?][] };
  source: { chips: string[]; lines: string[] };
  callout: string;
  sheet: {
    title: string;
    subtitle: string;
    columns: SheetColumn[];
    /** Fixed px widths that overflow the block, so the sheet can scroll sideways like the real grid. */
    scrolls: boolean;
    /** Sideways offset that brings the trade fields into view. */
    scrollTo: number;
    rows: string[][];
    tone: (column: string, cell: string) => string;
  };
  chart: {
    yes: readonly number[];
    no: readonly number[];
    lo: number;
    hi: number;
    yesLast: string;
    yesDelta: string;
    noLast: string;
    noDelta: string;
    axis?: string[];
  };
  run: { title: string; steps: RunStep[]; total: string; pulling: string };
  rows: string;
  exportFile: string;
  copy: { find: FigureCopy; details: FigureCopy; run: FigureCopy; export: FigureCopy; walkthrough: FigureCopy };
};

/* ------------------------------------------------------------------ */
/* Kalshi: Bitcoin price on Oct 31, 2026, $77,300 or above              */
/* ------------------------------------------------------------------ */

const K_TICKER = "KXBTCD-26OCT3108-T77299.99";

const K_TRADES = [
  ["0727d72f-9c39-a14c", "13.63", "0.37", "0.63", "no", "ask", "no"],
  ["0727d72e-4219-ab0c", "9.71", "0.38", "0.62", "no", "ask", "no"],
  ["0727d724-3439-8f0e", "6.29", "0.38", "0.62", "no", "ask", "no"],
  ["0727d72e-fd29-9e31", "138.45", "0.4", "0.6", "yes", "bid", "yes"],
  ["0727d72e-f951-9c9a", "300", "0.39", "0.61", "yes", "bid", "yes"],
  ["0727d72e-f951-9be2", "22.38", "0.39", "0.61", "yes", "bid", "yes"],
  ["0727d72e-f161-9cba", "10", "0.39", "0.61", "yes", "bid", "yes"],
  ["0727d72e-cdc9-9aa4", "1", "0.39", "0.61", "yes", "bid", "yes"],
  ["0727d729-1a11-a9f7", "1", "0.39", "0.61", "yes", "bid", "yes"],
  ["0727d729-0ab1-a6d3", "2.45", "0.39", "0.61", "yes", "bid", "yes"],
];

/** Last traded yes price in cents across the market's first hour (No is 100 minus Yes). */
const K_YES = [40, 41, 40, 40, 40, 40, 40, 40, 40, 40, 39, 40, 40, 44, 44, 43, 44, 43, 44, 44, 44, 44, 45, 45, 45, 44, 44, 44, 43, 41, 41, 40, 39, 38, 37, 38, 39, 39, 38, 38];

const K_SHEET_TITLE = `Trades · ${K_TICKER}`;

const KALSHI: VenueConfig = {
  recipeTitle: "Download Kalshi Trade History",
  hint: "Search in plain English, or paste a market ticker, event ticker or Kalshi link.",
  placeholder: "Will Bitcoin close above $100k this year?",
  chips: [{ label: "Bitcoin price" }, { label: "Fed funds rate" }, { label: "NYC mayor" }, { label: "KXBTCD", mono: true }],
  query: "Bitcoin price",
  results: ["77,300", "77,200", "77,400", "77,100", "77,500"].map((strike) => ({
    title: "Bitcoin price Above/below",
    subtitle: `$${strike} or above`,
    mono: `KXBTCD-26OCT3108-T${Number(strike.replace(",", "")) - 1}.99`,
    meta: "closes Oct 31, 2026",
  })),
  legend: [
    ["Kalshi Live", "Markets still trading or settled after the live cutoff"],
    ["Kalshi Historical v1", "Markets that closed between Kalshi's launch and Dec 2025"],
    ["Kalshi Historical v2", "Everything else up to the live cutoff, with candlesticks when the trade tape is empty"],
  ],
  market: {
    title: "Bitcoin price on Oct 31, 2026?",
    subtitle: "$77,300 or above",
    id: K_TICKER,
    stats: [
      ["Last price", "39¢", "No 61¢"],
      ["Yes bid / ask", "39¢ / 40¢"],
      ["Volume", "7,694", "330 in 24h"],
      ["Open interest", "6,133", "contracts"],
      ["Opened", "Oct 31, 2026", "4:45 PM"],
      ["Closes", "Oct 31, 2026", "5:45 PM"],
    ],
  },
  source: {
    chips: ["Kalshi Live"],
    lines: [
      "Opened after the Sep 1, 2026 live cutoff, so every trade is on Kalshi Live.",
      "Pulls the market's full trade history, with both yes and no prices on every row.",
    ],
  },
  callout: "Check the strike, ticker and close time",
  sheet: {
    title: K_SHEET_TITLE,
    subtitle: "Bitcoin price on Oct 31, 2026? · $77,300 or above",
    columns: [
      { label: "Trade Id", width: 1.4 },
      { label: "Ticker", width: 1.3 },
      { label: "Count Fp", width: 0.7 },
      { label: "Yes Price Dollars", width: 1 },
      { label: "No Price Dollars", width: 1 },
      { label: "Taker Outcome Side", width: 1.05 },
      { label: "Taker Book Side", width: 0.95 },
      { label: "Side", width: 0.5 },
      { label: "Created Time", width: 0.9 },
    ],
    scrolls: false,
    scrollTo: 0,
    rows: K_TRADES.map(([id, ...rest]) => [`${id}…`, K_TICKER, ...rest, "10/31/2026"]),
    tone: (column) => (column === "Created Time" ? "text-muted-foreground" : ""),
  },
  chart: { yes: K_YES, no: K_YES.map((v) => 100 - v), lo: 34, hi: 66, yesLast: "38.0%", yesDelta: "-2.00 pp", noLast: "62.0%", noDelta: "+2.00 pp" },
  run: {
    title: `Kalshi trade history · ${K_TICKER}`,
    steps: [
      { name: "find_market", args: `{"ticker":"${K_TICKER}"}`, result: "Bitcoin price on Oct 31, 2026? · $77,300 or above", time: "0.0s" },
      { name: "route_source", args: `{"source":"Kalshi Live"}`, result: "Opened after the Sep 1, 2026 live cutoff, so every trade is on Kalshi Live.", time: "0.0s" },
      { name: "pull_trades", args: `{"ticker":"${K_TICKER}","history":"full"}`, result: "187 trades from Kalshi Live", time: "6.0s" },
      { name: "place_sheets", args: `{"charts":"default"}`, result: `${K_SHEET_TITLE} and its chart on this tab`, time: "1.8s" },
    ],
    total: "7.8s",
    pulling: "Read 187 trades from Kalshi Live",
  },
  rows: "187 rows",
  exportFile: "trades-kxbtcd-26oct3108-t77299-99",
  copy: {
    find: {
      label: "Animation: opening the Download Kalshi Trade History recipe from the Recipes sidebar, typing Bitcoin price, and selecting the $77,300 or above market.",
      caption: "Open the recipe from the Recipes list, search in plain English, then pick the exact market.",
    },
    details: {
      label: "Animation: the Market details panel loading the selected market's status, prices, volume, open interest and close time, then the trade history source, before Save and Go is clicked.",
      caption: "Market details confirms you picked the right contract and shows which Kalshi source the trades will come from.",
    },
    run: {
      label: "Animation: after Save and Go, a progress card runs find_market, route_source, pull_trades and place_sheets, reports 187 trades from Kalshi Live, then reveals the trade sheet and its price chart on the canvas.",
      caption: "Save and Go pulls the full trade history onto your canvas as a sheet, with a default price chart.",
    },
    export: {
      label: "Animation: opening the trade sheet's actions menu, choosing Export, and picking CSV, Excel (.xlsx) or JSON to download the trades.",
      caption: "Export lives in the sheet's ⋮ menu: CSV, JSON, or Excel (.xlsx).",
    },
    walkthrough: {
      label: "Animation: the full Download Kalshi Trade History recipe, from search to the trade sheet and chart on the canvas.",
      caption: "The whole recipe: search, check the market, Save and Go, then the trades land on your canvas.",
    },
  },
};

/* ------------------------------------------------------------------ */
/* Polymarket: a real run on the Georgia governor 2026 market           */
/* ------------------------------------------------------------------ */

const P_SLUG = "will-the-democrats-win-the-georgia-governor-race-in-2026";
const P_TITLE = "Will the Democrats win the Georgia governor race in 2026?";
const P_SHEET_TITLE = `Trades · ${P_SLUG}`;
const P_YES_TOKEN = "59980150909931986777…";
const P_NO_TOKEN = "29426800815897155175…";

/** The newest trades from the run, as the sheet lists them. */
const P_TRADES: [outcome: "Yes" | "No", side: string, price: string, size: string, iso: string, ts: string, wallet: string, hash: string][] = [
  ["Yes", "BUY", "0.7", "35", "2026-11-02T17:48:13.000Z", "1793641693", "0xe762c62c…", "0xad825098b9…"],
  ["Yes", "BUY", "0.7", "15", "2026-11-02T17:48:12.000Z", "1793641692", "0x29a1ccae…", "0xdc075b8449…"],
  ["No", "BUY", "0.31", "50", "2026-11-02T17:47:34.000Z", "1793641654", "0xeed8c2be…", "0x97be18cdd2…"],
  ["No", "BUY", "0.3", "1031", "2026-11-02T17:47:34.000Z", "1793641654", "0xa080dadd…", "0xd4859ca946…"],
  ["No", "BUY", "0.31", "289.032259", "2026-11-02T17:47:34.000Z", "1793641654", "0x49591754…", "0xd565fedb99…"],
  ["Yes", "BUY", "0.7", "9.72857", "2026-11-02T17:47:34.000Z", "1793641654", "0x9b22f05e…", "0xe4d8ae583f…"],
  ["Yes", "BUY", "0.71", "14.084506", "2026-11-02T16:58:36.000Z", "1793638716", "0xfec0fa93…", "0x7f5e93daa5…"],
  ["Yes", "BUY", "0.71", "24.9", "2026-11-02T16:10:06.000Z", "1793635806", "0x007687c4…", "0x25712183a0…"],
  ["Yes", "BUY", "0.71", "56.323944", "2026-11-02T15:30:03.000Z", "1793633403", "0x66e7ce01…", "0xe7dd872d39…"],
  ["Yes", "BUY", "0.7", "34.014286", "2026-11-02T15:27:52.000Z", "1793633272", "0x66e7ce01…", "0x478055cbb2…"],
];

/** Last traded price in cents from Oct 2025 to Nov 2026. Each outcome trades on its own book. */
const P_YES = [47, 44, 49, 52, 50, 48, 54, 50, 53, 51, 55, 52, 54, 52, 56, 53, 55, 54, 57, 55, 58, 61, 64, 67, 58, 55, 53, 56, 54, 52, 51, 54, 56, 53, 57, 61, 64, 67, 70];
const P_NO = [49, 43, 47, 45, 42, 45, 43, 39, 42, 45, 42, 41, 42, 44, 41, 43, 40, 41, 38, 40, 39, 37, 35, 30, 36, 41, 44, 46, 44, 43, 46, 47, 45, 43, 41, 38, 35, 33, 31];

const POLYMARKET: VenueConfig = {
  recipeTitle: "Download Polymarket Trade History",
  hint: "Search in plain English, or paste a Polymarket link, market slug or condition id.",
  placeholder: "Will Bitcoin reach $150k this year?",
  chips: [{ label: "Bitcoin price" }, { label: "Fed decision" }, { label: "NYC mayor" }, { label: "Presidential election 2024" }],
  query: "Georgia governor 2026",
  results: [
    { title: P_TITLE, subtitle: "Georgia Governor Election Winner", meta: "$301.6K vol · closes Nov 4, 2026", status: "Open" },
    { title: "Will Burt Jones win the 2026 Georgia Governor Republican primary election?", subtitle: "Georgia Governor Republican Primary Winner", meta: "$298.4K vol · closed Jun 17, 2026", status: "Closed" },
    { title: "Will Brad Raffensperger win the 2026 Georgia Governor Republican primary election?", subtitle: "Georgia Governor Republican Primary Winner", meta: "$171.3K vol · closed Jun 17, 2026", status: "Closed" },
    { title: "Will the Republicans win the Georgia governor race in 2026?", subtitle: "Georgia Governor Election Winner", meta: "$155.5K vol · closes Nov 4, 2026", status: "Open" },
    { title: "Will Gregg Kirkpatrick win the 2026 Georgia Governor Republican primary election?", subtitle: "Georgia Governor Republican Primary Winner", meta: "$133.5K vol · closed Jun 17, 2026", status: "Closed" },
  ],
  legend: [
    ["Polymarket Live", "Markets that opened on or after Jan 1, 2026"],
    ["Polymarket Historical", "Markets that closed between Polymarket's launch and Dec 2025"],
    ["Polymarket Live + Historical", "Markets that span Jan 1, 2026: Live for newer trades, Historical for older ones"],
  ],
  market: {
    title: P_TITLE,
    subtitle: "Georgia Governor Election Winner",
    id: P_SLUG,
    stats: [
      ["Yes", "69.5¢", "No 30.5¢"],
      ["Bid / ask", "69¢ / 70¢", "Yes"],
      ["Volume", "$301.6K", "$42.1K in 24h"],
      ["Liquidity", "$130.8K", "USDC on the book"],
      ["Opened", "Oct 14, 2025", "5:12 AM"],
      ["Closes", "Nov 4, 2026", "10:44 AM"],
    ],
  },
  source: {
    chips: ["Polymarket Live", "Polymarket Historical for older trades"],
    lines: [
      "Trades since Jan 1, 2026 come from Polymarket Live. Older trades come from Polymarket Historical.",
      "Pulls the market's full trade history, with the outcome, side, price and size on every row.",
    ],
  },
  callout: "Check the question, slug and close date",
  sheet: {
    title: P_SHEET_TITLE,
    subtitle: P_TITLE,
    columns: [
      { label: "Market Id", width: 62 },
      { label: "Market Title", width: 130 },
      { label: "Market Slug", width: 110 },
      { label: "Title", width: 120 },
      { label: "Slug", width: 104 },
      { label: "Event Slug", width: 104 },
      { label: "Condition Id", width: 96 },
      { label: "Token Id", width: 92 },
      { label: "Outcome", width: 56 },
      { label: "Outcome Index", width: 50 },
      { label: "Side", width: 42 },
      { label: "Price", width: 42 },
      { label: "Size", width: 66 },
      { label: "Observed At", width: 136 },
      { label: "Timestamp", width: 72 },
      { label: "Proxy Wallet", width: 86 },
      { label: "Transaction Hash", width: 96 },
    ],
    scrolls: true,
    scrollTo: 724,
    rows: P_TRADES.map(([outcome, side, price, size, iso, ts, wallet, hash]) => [
      "629337",
      P_TITLE,
      P_SLUG,
      P_TITLE,
      P_SLUG,
      "georgia-governor-winner-2026",
      "0x73a9911393e7bd22…",
      outcome === "Yes" ? P_YES_TOKEN : P_NO_TOKEN,
      outcome,
      outcome === "Yes" ? "0" : "1",
      side,
      price,
      size,
      iso,
      ts,
      wallet,
      hash,
    ]),
    tone: (column, cell) =>
      column === "Outcome" ? (cell === "Yes" ? "text-[#0f9f6e]" : "text-[#e5484d]") : column === "Observed At" || column === "Timestamp" ? "text-muted-foreground" : "",
  },
  chart: {
    yes: P_YES,
    no: P_NO,
    lo: 24,
    hi: 76,
    yesLast: "70.0%",
    yesDelta: "+23.00 pp",
    noLast: "31.0%",
    noDelta: "-18.00 pp",
    axis: ["Oct 10, 2025", "Jan 14", "Apr 20", "Jul 25", "Oct 30"],
  },
  run: {
    title: `Polymarket trade history · ${P_SLUG}`,
    steps: [
      { name: "find_market", args: `{"market":"${P_SLUG}"}`, result: `${P_TITLE} · Georgia Governor Election Winner`, time: "0.0s" },
      { name: "route_source", args: `{"source":"Polymarket Live + Historical"}`, result: "Trades since Jan 1, 2026 come from Polymarket Live. Older trades come from Polymarket Historical.", time: "0.0s" },
      { name: "pull_trades", args: `{"market":"${P_SLUG}","history":"full"}`, result: "2,304 trades from Polymarket Live + Historical", time: "17.3s" },
      { name: "place_sheets", args: `{"charts":"default"}`, result: `${P_SHEET_TITLE} and its chart on this tab`, time: "1.1s" },
    ],
    total: "18.4s",
    pulling: "Read 2,304 trades from Polymarket Live + Historical",
  },
  rows: "2,304 rows",
  exportFile: `trades-${P_SLUG}`,
  copy: {
    find: {
      label: "Animation: opening the Download Polymarket Trade History recipe from the Recipes sidebar, typing Georgia governor 2026, and selecting Will the Democrats win the Georgia governor race in 2026?",
      caption: "Open the recipe from the Recipes list, search in plain English, then pick the exact market.",
    },
    details: {
      label: "Animation: the Market details panel loading the selected Polymarket market's outcome prices, bid and ask, volume, liquidity, opened and close dates, then the trade history source, before Save and Go is clicked.",
      caption: "Market details confirms the question and shows that this market reads Polymarket Live, with Polymarket Historical for older trades.",
    },
    run: {
      label: "Animation: after Save and Go, a progress card runs find_market, route_source, pull_trades and place_sheets, reports 2,304 trades from Polymarket Live + Historical, then reveals the trade sheet and its Yes and No price chart on the canvas.",
      caption: "Save and Go pulls the full trade history onto your canvas as a sheet, with a default Yes and No price chart.",
    },
    export: {
      label: "Animation: opening the Polymarket trade sheet's actions menu, choosing Export, and picking CSV, Excel (.xlsx) or JSON to download the trades.",
      caption: "Export lives in the sheet's ⋮ menu: CSV, JSON, or Excel (.xlsx).",
    },
    walkthrough: {
      label: "Animation: the full Download Polymarket Trade History recipe. Search Georgia governor 2026, pick the market, check its details and source, click Save and Go, and watch 2,304 trades land on the canvas with a price chart.",
      caption: "The whole recipe on a real market: search, check the details, Save and Go, then the trades land on your canvas.",
    },
  },
};

const VENUE_CONFIG: Record<RecipeVenue, VenueConfig> = { kalshi: KALSHI, polymarket: POLYMARKET };

/* ------------------------------------------------------------------ */
/* Picker + recipe dialog                                              */
/* ------------------------------------------------------------------ */

const RECIPES: { venue: RecipeVenue; title: string }[] = [
  { venue: "kalshi", title: "Download Kalshi Trade History" },
  { venue: "polymarket", title: "Download Polymarket Trade History" },
];

function RecipesSidebarMock({ venue, active }: { venue: RecipeVenue; active: boolean }) {
  return (
    <aside className="flex w-[25%] shrink-0 flex-col border-r border-border bg-black/[0.015] dark:bg-white/[0.02]">
      <div className="px-5 pb-3 pt-6">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Recipes <span className="tabular-nums">{RECIPES.length}</span>
        </div>
        <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
          A list of quick actions requested by our quants. Click one to get started right away.
        </p>
      </div>
      {RECIPES.map((recipe) => {
        const mine = recipe.venue === venue;
        const on = mine && active;
        return (
          <div
            key={recipe.venue}
            data-cursor={mine ? "recipe-row" : undefined}
            className={cn("flex items-start gap-2.5 px-5 py-3 transition-colors duration-300", on && "bg-black/[0.06] dark:bg-white/[0.07]")}
          >
            <CircleArrowDown className={cn("mt-px size-4 shrink-0 text-muted-foreground", on && "text-foreground")} aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline gap-2">
                <span className={cn("min-w-0 flex-1 truncate text-[13px] font-medium text-foreground", on ? "opacity-100" : "opacity-80")}>
                  {recipe.title}
                </span>
                <span className="shrink-0 text-[11px] text-muted-foreground">CSV</span>
              </span>
              <span className="mt-0.5 block text-[12px] leading-relaxed text-muted-foreground">
                Search a market to view its trades and download a CSV.
              </span>
            </span>
          </div>
        );
      })}
    </aside>
  );
}

function VenueLogo({ venue }: { venue: RecipeVenue }) {
  return venue === "kalshi" ? (
    <span className="grid size-7 shrink-0 place-items-center rounded-md bg-[#28CC95] text-[7px] font-bold text-white">Kalshi</span>
  ) : (
    <span className="grid size-7 shrink-0 place-items-center rounded-md bg-[#2E5CFF]">
      <span className="size-3 rotate-45 rounded-[2px] border-2 border-white" />
    </span>
  );
}

const VENUES = [
  { venue: "kalshi", name: "Kalshi Historical", detail: "Deep historical data: Kalshi Launch - Dec 2025" },
  { venue: "kalshi", name: "Kalshi Historical v2", detail: "" },
  { venue: "kalshi", name: "Kalshi Live", detail: "", live: true },
  { venue: "polymarket", name: "Polymarket Historical", detail: "Access and analyze Polymarket historical data" },
  { venue: "polymarket", name: "Polymarket Live", detail: "All real-time decentralized polymarket, prediction market API.", live: true },
] as const;

export function VenuePickerMock() {
  return (
    <div className="flex min-w-0 flex-1">
      <div className="flex w-[52.5%] flex-col bg-background px-4 pt-5">
        <p className="text-[15px] font-semibold tracking-tight text-foreground">What is the first venue you want to research with Lychee?</p>
        <p className="mt-1 text-[12px] text-muted-foreground">Pick a source. You&apos;ll shape the pull in the next step.</p>
        <div className="mt-3 space-y-2">
          {VENUES.map((v) => (
            <div key={v.name} className="flex items-start gap-2.5 rounded-xl border border-border/70 bg-background px-2.5 py-2">
              <VenueLogo venue={v.venue} />
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-[12px] font-semibold text-foreground">
                  {v.name}
                  {"live" in v ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-1.5 py-px text-[8.5px] font-semibold uppercase tracking-wide text-emerald-700">
                      <span className="size-1 rounded-full bg-emerald-500" />
                      Real-time
                    </span>
                  ) : null}
                </span>
                {v.detail ? <span className="block truncate text-[10.5px] text-muted-foreground">{v.detail}</span> : null}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-1 flex-col bg-[#e6edf3] px-5 pt-6 dark:bg-[#1c232b]">
        <p className="flex items-center gap-2 text-[12px] font-semibold text-foreground">
          <Database className="size-3.5 text-muted-foreground" aria-hidden />
          What this looks like in Lychee
        </p>
      </div>
    </div>
  );
}

export function StatusPill({ label }: { label: string }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        label === "Open" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground",
      )}
    >
      {label}
    </span>
  );
}

export function ResultCard({ result, index, state }: { result: ResultItem; index: number; state: "idle" | "highlighted" | "active" }) {
  return (
    <div
      data-cursor={`result-${index}`}
      className={cn(
        "flex items-start gap-3 rounded-xl border px-3 py-2.5 transition-colors duration-200 [animation:fx-rise_.3s_both]",
        state === "active"
          ? "border-[#2f6fed] bg-[#e7f0ff] dark:bg-blue-500/15"
          : state === "highlighted"
            ? "border-neutral-300 bg-muted"
            : "border-border/70 bg-background",
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 block text-[12.5px] font-semibold leading-snug text-foreground">{result.title}</span>
        <span className="mt-0.5 block truncate text-[11.5px] text-muted-foreground">{result.subtitle}</span>
        <span className="mt-0.5 block truncate text-[10.5px] text-muted-foreground">
          {result.mono ? (
            <>
              <span className="font-mono">{result.mono}</span> ·{" "}
            </>
          ) : null}
          {result.meta}
        </span>
      </span>
      {result.status ? <StatusPill label={result.status} /> : null}
      {state === "active" ? <Check className="size-4 shrink-0 self-center text-[#2f6fed]" aria-hidden /> : null}
    </div>
  );
}

type DetailsState = "empty" | "loading" | "stats" | "source";

function Stat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-lg bg-black/[0.03] px-2.5 py-2 dark:bg-white/[0.04]">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-[15px] font-semibold tabular-nums tracking-tight text-foreground">{value}</p>
      {detail ? <p className="text-[10px] text-muted-foreground">{detail}</p> : null}
    </div>
  );
}

function MarketPaneMock({ v, state, callout = false }: { v: VenueConfig; state: DetailsState; callout?: boolean }) {
  const paneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const pane = paneRef.current;
    if (!pane) return;
    if (state !== "source") {
      pane.scrollTop = 0;
      return;
    }
    const frame = window.requestAnimationFrame(() => pane.scrollTo({ top: pane.scrollHeight, behavior: "smooth" }));
    return () => window.cancelAnimationFrame(frame);
  }, [state]);

  return (
    <div ref={paneRef} className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-[#e6edf3] px-5 pb-5 pt-9 dark:bg-[#1c232b] [&>*]:shrink-0">
      <p className="flex items-center gap-2 text-[12.5px] font-semibold text-foreground">
        <TrendingUp className="size-4 text-muted-foreground" aria-hidden />
        Market details
      </p>
      {state === "empty" ? (
        <>
          <p className="mt-2.5 text-[12px] leading-relaxed text-foreground">
            Pick a market to see its stats and where Lychee will pull its trades from.
          </p>
          <div className="mt-4 rounded-xl border border-border/70 bg-background p-3.5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Where trades come from</p>
            {v.legend.map(([name, detail]) => (
              <p key={name} className="mt-2 text-[11px] leading-relaxed">
                <span className="font-medium text-foreground">{name}</span>
                <span className="block text-muted-foreground">{detail}</span>
              </p>
            ))}
          </div>
        </>
      ) : state === "loading" ? (
        <div className="mt-3.5 overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm [animation:fx-rise_.3s_both]">
          <div className="border-b border-border/50 px-3.5 py-2.5">
            <p className="text-[13.5px] font-semibold leading-snug text-foreground">{v.results[0].title}</p>
            <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">{v.market.id}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 p-2.5">
            {Array.from({ length: 6 }, (_, i) => (
              <span key={i} className="fx-skeleton h-[54px] rounded-lg" />
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-3.5 space-y-2.5">
          <article
            className={cn(
              "relative overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm transition-shadow duration-500 [animation:fx-rise_.35s_both]",
              callout && "ring-2 ring-[#2f6fed]/50",
            )}
          >
            <header className="border-b border-border/50 px-3.5 py-2.5">
              <div className="flex items-start gap-2">
                <p className="min-w-0 flex-1 text-[13.5px] font-semibold leading-snug text-foreground">{v.market.title}</p>
                <StatusPill label="Open" />
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{v.market.subtitle}</p>
              <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">{v.market.id}</p>
            </header>
            <div className="grid grid-cols-2 gap-2 p-2.5">
              {v.market.stats.map(([label, value, detail]) => (
                <Stat key={label} label={label} value={value} detail={detail} />
              ))}
            </div>
          </article>
          {state === "source" ? (
            <section className="rounded-xl border border-border/70 bg-background p-3.5 shadow-sm [animation:fx-rise_.35s_both]">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Trade history source</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {v.source.chips.map((chip, i) => (
                  <span
                    key={chip}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-medium",
                      i === 0 ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {i === 0 ? <Check className="size-3" strokeWidth={3} aria-hidden /> : null}
                    {chip}
                  </span>
                ))}
              </div>
              {v.source.lines.map((line, i) => (
                <p key={line} className={cn("text-[11px] leading-relaxed text-muted-foreground", i ? "mt-1" : "mt-1.5")}>
                  {line}
                </p>
              ))}
            </section>
          ) : null}
        </div>
      )}
      {callout ? (
        <span className="absolute right-5 top-3 rounded-full bg-[#2f6fed] px-2 py-0.5 text-[10px] font-medium text-white shadow-sm [animation:fx-rise_.3s_both]">
          {v.callout}
        </span>
      ) : null}
    </div>
  );
}

function RecipePaneMock({
  v,
  query,
  typing,
  list,
  highlighted = -1,
  selected = -1,
  details,
  ready,
  pressed = false,
  callout = false,
}: {
  v: VenueConfig;
  query: string;
  typing: boolean;
  list: "chips" | "skeleton" | "results";
  highlighted?: number;
  selected?: number;
  details: DetailsState;
  ready: boolean;
  pressed?: boolean;
  callout?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-1 [animation:fx-rise_.35s_both]">
      <div className="flex w-[52.5%] min-w-0 flex-col bg-background">
        <div className="flex items-start gap-2 px-5 pb-2.5 pt-5">
          <ArrowLeft className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden />
          <div className="min-w-0">
            <p className="text-[17px] font-semibold tracking-tight text-foreground">{v.recipeTitle}</p>
            <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{v.hint}</p>
          </div>
        </div>
        <div className="px-5 pb-2.5">
          <div
            data-cursor="search"
            className={cn(
              "relative flex h-10 items-center rounded-xl border bg-background pl-9 pr-9 text-[13px]",
              typing ? "border-neutral-400 ring-2 ring-black/5" : "border-border",
            )}
          >
            <Search className="absolute left-3 size-4 text-muted-foreground" aria-hidden />
            {query ? <span className="text-foreground">{query}</span> : <span className="text-muted-foreground">{v.placeholder}</span>}
            {typing ? <span className="ml-px h-4 w-px animate-pulse bg-foreground" aria-hidden /> : null}
            {list === "skeleton" ? <Loader2 className="absolute right-3 size-4 animate-spin text-muted-foreground" aria-hidden /> : null}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden px-5">
          {list === "chips" ? (
            <div className="pt-1.5">
              <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">Try</p>
              <div className="flex flex-wrap gap-1.5">
                {v.chips.map((chip) => (
                  <span
                    key={chip.label}
                    className={cn("rounded-full border border-border px-2.5 py-0.5 text-[11.5px] text-muted-foreground", chip.mono && "font-mono")}
                  >
                    {chip.label}
                  </span>
                ))}
              </div>
            </div>
          ) : list === "skeleton" ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }, (_, i) => (
                <span key={i} className="fx-skeleton block h-[66px] rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {v.results.map((result, i) => (
                <ResultCard key={i} result={result} index={i} state={i === selected ? "active" : i === highlighted ? "highlighted" : "idle"} />
              ))}
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center justify-end gap-2 px-5 py-3">
          <span className="inline-flex h-8 items-center rounded-md border border-border bg-background px-3 text-[12.5px] font-medium text-foreground">
            Previous
          </span>
          <span
            data-cursor="save"
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[12.5px] font-medium text-white transition-all duration-300",
              ready ? "bg-[#2f6fed]" : "bg-[#2f6fed]/45",
              pressed && "scale-[0.97] bg-[#2a63d4]",
            )}
          >
            Save and Go
            <ArrowRight className="size-3.5" aria-hidden />
          </span>
        </div>
      </div>
      <MarketPaneMock v={v} state={details} callout={callout} />
    </div>
  );
}

/** The homepage demo's "Lychee Terminal" window at a fixed design size, with the cursor on top. */
function Stage({
  children,
  stageRef,
  overlay,
}: {
  children: ReactNode;
  stageRef: React.RefObject<HTMLDivElement | null>;
  overlay?: ReactNode;
}) {
  return (
    <ScaledStage width={STAGE_W} height={STAGE_H} innerRef={stageRef}>
      <FeatureWindow title="Lychee Terminal" className="size-full">
        {children}
      </FeatureWindow>
      {overlay}
    </ScaledStage>
  );
}

/* ------------------------------------------------------------------ */
/* Step 1: open the recipe and find the market                          */
/* ------------------------------------------------------------------ */

const FIND_PHASES = [1400, 900, 600, 1500, 1000, 1300, 1900] as const;

export function RecipeFindMarketAnimation({ venue = "kalshi" }: { venue?: RecipeVenue }) {
  const v = VENUE_CONFIG[venue];
  const rootRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const { phase, loop } = useGuidePhases(FIND_PHASES, rootRef, 6);
  const typed = useTypedText(v.query, phase === 3, 80);
  const open = phase >= 2;
  const cursorTarget = ["recipe-row", "recipe-row", "recipe-row", "search", "search", "result-0", "result-0"][phase];

  return (
    <GuideAnimationFigure rootRef={rootRef} backdrop="lake" label={v.copy.find.label} caption={v.copy.find.caption}>
      <Stage
        stageRef={stageRef}
        overlay={<GuideCursor stageRef={stageRef} target={cursorTarget} pressed={phase === 2 || phase === 6} revision={`${loop}-${phase}`} />}
      >
        <div className="relative flex min-w-0 flex-1">
          <RecipesSidebarMock venue={venue} active={phase >= 1} />
          {open ? (
            <RecipePaneMock
              key={`recipe-${loop}`}
              v={v}
              query={phase === 3 ? typed : phase >= 4 ? v.query : ""}
              typing={phase === 3}
              list={phase <= 3 ? "chips" : phase === 4 ? "skeleton" : "results"}
              highlighted={phase === 5 ? 0 : -1}
              selected={phase >= 6 ? 0 : -1}
              details={phase >= 6 ? "loading" : "empty"}
              ready={false}
            />
          ) : (
            <VenuePickerMock />
          )}
        </div>
      </Stage>
    </GuideAnimationFigure>
  );
}

/* ------------------------------------------------------------------ */
/* Step 2: check the market details                                    */
/* ------------------------------------------------------------------ */

const DETAILS_PHASES = [900, 1700, 1700, 1300, 1300] as const;

export function RecipeMarketDetailsAnimation({ venue = "kalshi" }: { venue?: RecipeVenue }) {
  const v = VENUE_CONFIG[venue];
  const rootRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const { phase, loop } = useGuidePhases(DETAILS_PHASES, rootRef, 3);
  const details: DetailsState = phase === 0 ? "loading" : phase === 1 ? "stats" : "source";

  return (
    <GuideAnimationFigure rootRef={rootRef} backdrop="insights" label={v.copy.details.label} caption={v.copy.details.caption}>
      <Stage
        stageRef={stageRef}
        overlay={<GuideCursor stageRef={stageRef} target={phase >= 3 ? "save" : "result-0"} pressed={phase === 4} revision={`${loop}-${phase}`} />}
      >
        <div className="relative flex min-w-0 flex-1">
          <RecipesSidebarMock venue={venue} active />
          <RecipePaneMock
            key={`details-${loop}`}
            v={v}
            query={v.query}
            typing={false}
            list="results"
            selected={0}
            details={details}
            ready={phase >= 2}
            pressed={phase === 4}
            callout={phase === 1 || phase === 2}
          />
        </div>
      </Stage>
    </GuideAnimationFigure>
  );
}

/* ------------------------------------------------------------------ */
/* Canvas pieces                                                       */
/* ------------------------------------------------------------------ */

function CanvasChrome({ children }: { children: ReactNode }) {
  return (
    <div
      className="relative min-w-0 flex-1 overflow-hidden bg-background"
      style={{ backgroundImage: "radial-gradient(circle, rgba(100,116,139,0.16) 1px, transparent 1.2px)", backgroundSize: "18px 18px" }}
    >
      <div className="absolute left-3 top-2.5 z-10 flex items-center gap-1">
        <span className="rounded-md border border-border bg-background px-2 py-0.5 text-[10.5px] text-muted-foreground">Untitled 1</span>
        <span className="grid size-5 place-items-center rounded-md border border-border bg-background text-muted-foreground">
          <Plus className="size-3" aria-hidden />
        </span>
      </div>
      {children}
      <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-xl border border-border bg-background px-1.5 py-1 shadow-[0_8px_24px_-12px_rgba(15,23,42,0.35)]">
        <span className="grid size-6 place-items-center rounded-md bg-[#0d99ff] text-white">
          <MousePointer2 className="size-3.5" aria-hidden />
        </span>
        {[Hand, Table2, Database, BarChart3, Type, Share].map((Icon, i) => (
          <span key={i} className="grid size-6 place-items-center rounded-md text-muted-foreground">
            <Icon className="size-3.5" aria-hidden />
          </span>
        ))}
      </div>
    </div>
  );
}

function SheetBlockMock({
  v,
  className,
  style,
  arrive = false,
  menuButton = false,
  selected = false,
  scrolled = false,
}: {
  v: VenueConfig;
  className?: string;
  style?: React.CSSProperties;
  arrive?: boolean;
  menuButton?: boolean;
  selected?: boolean;
  /** Scrolls a wide sheet sideways to its trade fields. */
  scrolled?: boolean;
}) {
  const { sheet } = v;
  const template = sheet.scrolls
    ? sheet.columns.map((c) => `${c.width}px`).join(" ")
    : `22px ${sheet.columns.map((c) => `${c.width}fr`).join(" ")}`;
  const gridWidth = sheet.scrolls ? sheet.columns.reduce((sum, c) => sum + c.width, 0) : undefined;
  const header = sheet.scrolls ? sheet.columns.map((c) => c.label) : ["", ...sheet.columns.map((c) => c.label)];

  const grid = (
    <div
      style={{ width: gridWidth, transform: sheet.scrolls && scrolled ? `translateX(-${sheet.scrollTo}px)` : undefined }}
      className={cn(sheet.scrolls && "transition-transform duration-[1400ms] ease-[cubic-bezier(.32,.72,0,1)]")}
    >
      <div className="grid border-b border-border/70 bg-muted/60 font-medium text-muted-foreground" style={{ gridTemplateColumns: template }}>
        {header.map((c, i) => (
          <span key={i} className="truncate border-r border-border/50 px-1.5 py-1">
            {c}
          </span>
        ))}
      </div>
      {sheet.rows.map((row, i) => (
        <div
          key={i}
          className={cn("grid border-b border-border/40 tabular-nums text-foreground", arrive && "[animation:fx-slide-in_.35s_both]")}
          style={{ gridTemplateColumns: template, ...(arrive ? { animationDelay: `${150 + i * 45}ms` } : {}) }}
        >
          {sheet.scrolls ? null : <span className="px-1.5 py-[3px] text-center text-muted-foreground">{i + 1}</span>}
          {row.map((cell, j) => (
            <span key={j} className={cn("truncate px-1.5 py-[3px]", sheet.tone(sheet.columns[j].label, cell))}>
              {cell}
            </span>
          ))}
        </div>
      ))}
    </div>
  );

  return (
    <div
      data-cursor="sheet-body"
      className={cn(
        "absolute flex flex-col overflow-hidden rounded-xl border bg-background shadow-sm transition-colors",
        selected ? "border-[#0d99ff] ring-2 ring-[#0d99ff]/25" : "border-border/70",
        arrive && "[animation:fx-rise_.45s_both]",
        className,
      )}
      style={style}
    >
      <div className="flex items-center gap-1.5 border-b border-border/70 px-2.5 py-1.5">
        <Table2 className="size-3 shrink-0 text-muted-foreground" aria-hidden />
        <span className={cn("text-[11px] font-semibold text-foreground", sheet.scrolls ? "min-w-0 truncate" : "shrink-0")}>{sheet.title}</span>
        <span className="truncate text-[10px] text-muted-foreground">{sheet.subtitle}</span>
      </div>
      <span
        data-cursor="menu-button"
        className={cn(
          "absolute right-1.5 top-1.5 z-10 grid size-5 place-items-center rounded-sm bg-background/80 text-muted-foreground transition-opacity duration-200",
          menuButton ? "opacity-100" : "opacity-0",
        )}
      >
        <MoreVertical className="size-3.5" aria-hidden />
      </span>
      {sheet.scrolls ? (
        <div className="flex min-h-0 flex-1 overflow-hidden text-[10px]">
          <div className="w-[22px] shrink-0 border-r border-border/50 bg-background text-center text-muted-foreground">
            <div className="border-b border-border/70 bg-muted/60 py-1">&nbsp;</div>
            {sheet.rows.map((_, i) => (
              <div key={i} className="border-b border-border/40 py-[3px]">
                {i + 1}
              </div>
            ))}
          </div>
          <div className="min-w-0 flex-1 overflow-hidden">{grid}</div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-hidden text-[10px]">{grid}</div>
      )}
    </div>
  );
}

function linePoints(values: readonly number[], w: number, h: number, lo: number, hi: number) {
  return values
    .map((v, i) => `${i ? "L" : "M"}${((i / (values.length - 1)) * w).toFixed(1)} ${(((hi - v) / (hi - lo)) * h).toFixed(1)}`)
    .join(" ");
}

function Delta({ value }: { value: string }) {
  return <span className={value.startsWith("-") ? "text-[#e5484d]" : "text-[#0f9f6e]"}>{value}</span>;
}

function ChartBlockMock({ v, className, style, drawKey }: { v: VenueConfig; className?: string; style?: React.CSSProperties; drawKey?: string | number }) {
  const { chart } = v;
  const W = 300;
  const H = 100;
  return (
    <div className={cn("absolute flex flex-col overflow-hidden rounded-xl border border-border/70 bg-background p-2.5 shadow-sm", className)} style={style}>
      <div className="flex items-center gap-1.5">
        <BarChart3 className="size-3 text-muted-foreground" aria-hidden />
        <span className="truncate text-[11px] font-semibold text-foreground">{v.sheet.title} chart</span>
      </div>
      <div className="mt-1.5 flex items-start justify-between gap-2">
        <div>
          <p className="text-[9.5px] text-muted-foreground">Last traded price</p>
          <p className="flex items-baseline gap-2 font-mono text-[10px]">
            <span className="flex items-baseline gap-1">
              <span className="size-1.5 rounded-full" style={{ background: GREEN }} />
              <span className="text-muted-foreground">Yes</span>
              <span className="text-[13px] font-semibold text-foreground">{chart.yesLast}</span>
              <Delta value={chart.yesDelta} />
            </span>
            <span className="flex items-baseline gap-1">
              <span className="size-1.5 rounded-full" style={{ background: VIOLET }} />
              <span className="text-muted-foreground">No</span>
              <span className="text-[13px] font-semibold text-foreground">{chart.noLast}</span>
              <Delta value={chart.noDelta} />
            </span>
          </p>
        </div>
        <div className="flex gap-1">
          <span className="flex rounded-md border border-border p-px text-[9px] text-muted-foreground">
            <span className="px-1">Yes</span>
            <span className="px-1">No</span>
            <span className="rounded bg-muted px-1 text-foreground">Both</span>
          </span>
          <span className="flex rounded-md border border-border p-px text-[9px] text-muted-foreground">
            <span className="px-1">1m</span>
            <span className="rounded bg-muted px-1 text-foreground">All</span>
          </span>
        </div>
      </div>
      <div className="relative mt-1.5 min-h-0 flex-1">
        <svg key={drawKey} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" aria-hidden>
          {[0.2, 0.5, 0.8].map((f) => (
            <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} className="stroke-border" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          ))}
          <g className="[animation:fx-draw_1.4s_cubic-bezier(.165,.84,.44,1)_both]">
            <path d={linePoints(chart.no, W, H, chart.lo, chart.hi)} fill="none" stroke={VIOLET} strokeWidth="1.6" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            <path d={linePoints(chart.yes, W, H, chart.lo, chart.hi)} fill="none" stroke={GREEN} strokeWidth="1.6" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </g>
        </svg>
      </div>
      {chart.axis ? (
        <div className="mt-1 flex justify-between font-mono text-[8.5px] text-muted-foreground">
          {chart.axis.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Step 3: Save and Go, the run card, then the sheet                   */
/* ------------------------------------------------------------------ */

const RUN_PHASES = [700, 800, 1300, 900, 1800, 700, 3800] as const;

function RunCard({ v, phase }: { v: VenueConfig; phase: number }) {
  const done = phase >= 4;
  const pullSeconds = Number.parseFloat(v.run.steps[2].time);
  const elapsed = phase < 2 ? phase * 0.1 : phase === 2 ? pullSeconds * 0.4 : pullSeconds;
  return (
    <div
      className="absolute right-6 top-4 z-30 w-[300px] overflow-hidden rounded-xl border border-border bg-background shadow-[0_18px_50px_-18px_rgba(15,23,42,0.45)] transition-opacity duration-500 [animation:fx-rise_.35s_both]"
      style={{ opacity: phase >= 6 ? 0 : 1 }}
    >
      <div className="flex items-start justify-between border-b border-border/70 px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold text-foreground">{done ? "Trade history ready" : "Pulling trade history"}</p>
          <p className="truncate text-[10px] text-muted-foreground">{v.run.title}</p>
        </div>
        <span className="shrink-0 font-mono text-[9.5px] text-muted-foreground">{done ? v.run.total : `${elapsed.toFixed(1)}s`}</span>
      </div>
      <ol className="space-y-2 px-3 py-2.5">
        {v.run.steps.map((step, i) => {
          const state = i < phase ? "done" : i === phase ? "running" : "queued";
          return (
            <li key={step.name} className="flex gap-2">
              <span className="mt-0.5 shrink-0">
                {state === "done" ? (
                  <span className="grid size-3.5 place-items-center rounded-full bg-emerald-500/15 text-emerald-600">
                    <Check className="size-2.5" strokeWidth={3} aria-hidden />
                  </span>
                ) : state === "running" ? (
                  <span className="grid size-3.5 place-items-center">
                    <span className="size-1.5 animate-pulse rounded-full bg-[#2f6fed]" />
                  </span>
                ) : (
                  <span className="block size-3.5 rounded-full border border-border" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="font-mono text-[10.5px] text-foreground">{step.name}</span>
                  {state === "running" ? <MonoTag tone="blue">Running</MonoTag> : state === "queued" ? <MonoTag>Queued</MonoTag> : null}
                  {state === "done" ? <span className="ml-auto font-mono text-[9.5px] text-muted-foreground">{step.time}</span> : null}
                </span>
                <span className="block truncate font-mono text-[9px] text-muted-foreground">{step.args}</span>
                {state === "done" ? (
                  <span className="mt-1 block rounded-md bg-muted px-2 py-1 text-[10px] leading-snug text-foreground [animation:fx-rise_.3s_both]">
                    {step.result}
                  </span>
                ) : state === "running" && step.name === "pull_trades" ? (
                  <span className="fx-shimmer-text mt-1 block text-[10px]">{v.run.pulling}</span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ol>
      {done ? (
        <div className="border-t border-border/70 px-3 py-2.5 [animation:fx-rise_.3s_both]">
          <p className="text-[11px] font-semibold text-foreground">Your dashboard is ready</p>
          <p className="text-[10px] text-muted-foreground">The trade sheet and its charts are on the canvas behind this card.</p>
          <span
            data-cursor="view-dashboard"
            className={cn(
              "mt-2 flex h-7 items-center justify-center rounded-md bg-foreground text-[11px] font-medium text-background transition-transform",
              phase === 5 && "scale-[0.97]",
            )}
          >
            View dashboard
          </span>
        </div>
      ) : null}
    </div>
  );
}

function RunCanvas({ v, phase, loop }: { v: VenueConfig; phase: number; loop: number }) {
  return (
    <CanvasChrome>
      {phase >= 4 ? (
        <div key={`placed-${loop}`}>
          <SheetBlockMock v={v} arrive scrolled={phase >= 6} style={{ left: 14, top: 40, width: 600, height: 236 }} />
          <ChartBlockMock v={v} drawKey={`${loop}-${phase >= 6}`} style={{ left: 14, top: 286, width: 600, height: v.chart.axis ? 172 : 186 }} />
        </div>
      ) : null}
      <RunCard key={`card-${loop}`} v={v} phase={phase} />
    </CanvasChrome>
  );
}

export function RecipeRunAnimation({ venue = "kalshi" }: { venue?: RecipeVenue }) {
  const v = VENUE_CONFIG[venue];
  const rootRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const { phase, loop } = useGuidePhases(RUN_PHASES, rootRef, 6);

  return (
    <GuideAnimationFigure rootRef={rootRef} backdrop="dashboards" label={v.copy.run.label} caption={v.copy.run.caption}>
      <Stage
        stageRef={stageRef}
        overlay={
          <GuideCursor
            stageRef={stageRef}
            target={phase >= 4 && phase <= 5 ? "view-dashboard" : null}
            pressed={phase === 5}
            hidden={phase < 4 || phase >= 6}
            revision={`${loop}-${phase}`}
          />
        }
      >
        <RunCanvas v={v} phase={phase} loop={loop} />
      </Stage>
    </GuideAnimationFigure>
  );
}

/* ------------------------------------------------------------------ */
/* Step 4: export from the sheet menu                                  */
/* ------------------------------------------------------------------ */

const FORMATS = [
  { id: "csv", label: "CSV", ext: "csv", Icon: FileSpreadsheet },
  { id: "xlsx", label: "Excel (.xlsx)", ext: "xlsx", Icon: FileSpreadsheet },
  { id: "json", label: "JSON", ext: "json", Icon: FileSpreadsheet },
] as const;

const EXPORT_PHASES = [1000, 900, 700, 900, 900, 600, 2600] as const;

function MenuItem({ icon: Icon, label, cursor, active, danger, chevron }: { icon: typeof Download; label: string; cursor?: string; active?: boolean; danger?: boolean; chevron?: boolean }) {
  return (
    <div
      data-cursor={cursor}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[12px] transition-colors",
        active && "bg-accent",
        danger ? "text-[#e5484d]" : "text-foreground",
      )}
    >
      <Icon className={cn("size-3.5", danger ? "text-[#e5484d]" : "text-muted-foreground")} aria-hidden />
      {label}
      {chevron ? <ChevronRight className="ml-auto size-3 text-muted-foreground" aria-hidden /> : null}
    </div>
  );
}

export function RecipeExportAnimation({ venue = "kalshi" }: { venue?: RecipeVenue }) {
  const v = VENUE_CONFIG[venue];
  const rootRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const { phase, loop } = useGuidePhases(EXPORT_PHASES, rootRef, 4);
  const format = FORMATS[loop % FORMATS.length];
  const menuOpen = phase >= 2 && phase <= 5;
  const subOpen = phase >= 3 && phase <= 5;
  const cursorTarget = ["sheet-body", "menu-button", "menu-button", "menu-export", `format-${format.id}`, `format-${format.id}`, `format-${format.id}`][phase];

  return (
    <GuideAnimationFigure rootRef={rootRef} backdrop="automate" label={v.copy.export.label} caption={v.copy.export.caption}>
      <Stage
        stageRef={stageRef}
        overlay={<GuideCursor stageRef={stageRef} target={cursorTarget} pressed={phase === 2 || phase === 5} revision={`${loop}-${phase}`} />}
      >
        <CanvasChrome>
          <SheetBlockMock v={v} scrolled menuButton={phase >= 1 && phase <= 5} selected={phase >= 1 && phase <= 5} style={{ left: 14, top: 40, width: 540, height: 236 }} />
          <ChartBlockMock v={v} style={{ left: 14, top: 286, width: 540, height: v.chart.axis ? 172 : 186 }} />
          {menuOpen ? (
            <div className="absolute z-30 w-48 rounded-xl border border-border bg-background p-1 shadow-lg [animation:fx-rise_.2s_both]" style={{ left: 554 - 192 - 6, top: 68 }}>
              <MenuItem icon={Maximize2} label="Full screen" />
              <MenuItem icon={BarChart3} label="Create chart" />
              <div className="-mx-1 my-1 h-px bg-border" />
              <MenuItem icon={Download} label="Export" cursor="menu-export" active={subOpen} chevron />
              <MenuItem icon={Copy} label="Duplicate" />
              <MenuItem icon={Pencil} label="Rename" />
              <MenuItem icon={Trash2} label="Delete" danger />
            </div>
          ) : null}
          {subOpen ? (
            <div className="absolute z-40 w-40 rounded-xl border border-border bg-background p-1 shadow-lg [animation:fx-rise_.2s_both]" style={{ left: 554 + 2, top: 68 + 70 }}>
              {[FORMATS[0], FORMATS[2], FORMATS[1]].map((f) => (
                <div
                  key={f.id}
                  data-cursor={`format-${f.id}`}
                  className={cn("rounded-md px-2 py-1.5 text-[12px] text-foreground transition-colors", phase >= 4 && f.id === format.id && "bg-accent")}
                >
                  {f.label}
                </div>
              ))}
            </div>
          ) : null}
          {phase >= 6 ? (
            <div
              key={`file-${loop}`}
              className="absolute right-6 top-24 z-30 flex max-w-[340px] items-center gap-2.5 rounded-xl border border-border bg-background px-3 py-2.5 shadow-[0_12px_30px_-12px_rgba(15,23,42,0.35)] [animation:fx-rise_.3s_both]"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#10b981]/10 text-[#0f9f6e]">
                <format.Icon className="size-4" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="flex min-w-0 font-mono text-[11px] text-foreground">
                  <span className="truncate">{v.exportFile}</span>
                  <span className="shrink-0">.{format.ext}</span>
                </span>
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Check className="size-3 text-[#10b981]" strokeWidth={3} aria-hidden />
                  Downloaded · {v.rows}
                </span>
              </span>
            </div>
          ) : null}
        </CanvasChrome>
      </Stage>
    </GuideAnimationFigure>
  );
}

/* ------------------------------------------------------------------ */
/* The whole recipe, start to finish                                    */
/* ------------------------------------------------------------------ */

/**
 * picker → recipe row → typing → searching → results → selected → stats → source → Save and Go,
 * then the run card's own phases.
 */
const WALK_PHASES = [1100, 800, 600, 1600, 900, 1100, 900, 1500, 1700, 900, 500, 700, 800, 1300, 900, 1800, 700, 4200] as const;
const WALK_RUN_START = 11;

export function RecipeWalkthroughAnimation({ venue = "kalshi", className }: { venue?: RecipeVenue; className?: string }) {
  const v = VENUE_CONFIG[venue];
  const rootRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const { phase, loop } = useGuidePhases(WALK_PHASES, rootRef, WALK_PHASES.length - 1);
  const typed = useTypedText(v.query, phase === 3, 70);
  const running = phase >= WALK_RUN_START;
  const runPhase = phase - WALK_RUN_START;
  const details: DetailsState = phase < 6 ? "empty" : phase === 6 ? "loading" : phase === 7 ? "stats" : "source";
  const cursorTarget = running
    ? runPhase >= 4 && runPhase <= 5
      ? "view-dashboard"
      : null
    : phase <= 2
      ? "recipe-row"
      : phase <= 4
        ? "search"
        : phase <= 8
          ? "result-0"
          : "save";

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      backdrop="lake"
      className={className}
      label={v.copy.walkthrough.label}
      caption={v.copy.walkthrough.caption}
    >
      <Stage
        stageRef={stageRef}
        overlay={
          <GuideCursor
            stageRef={stageRef}
            target={cursorTarget}
            pressed={phase === 2 || phase === 6 || phase === 10 || runPhase === 5}
            hidden={running && (runPhase < 4 || runPhase >= 6)}
            revision={`${loop}-${phase}`}
          />
        }
      >
        {running ? (
          <RunCanvas v={v} phase={runPhase} loop={loop} />
        ) : (
          <div className="relative flex min-w-0 flex-1">
            <RecipesSidebarMock venue={venue} active={phase >= 1} />
            {phase >= 2 ? (
              <RecipePaneMock
                key={`walk-${loop}`}
                v={v}
                query={phase === 3 ? typed : phase >= 4 ? v.query : ""}
                typing={phase === 3}
                list={phase <= 3 ? "chips" : phase === 4 ? "skeleton" : "results"}
                highlighted={phase === 5 ? 0 : -1}
                selected={phase >= 6 ? 0 : -1}
                details={details}
                ready={phase >= 8}
                pressed={phase === 10}
                callout={phase === 7}
              />
            ) : (
              <VenuePickerMock />
            )}
          </div>
        )}
      </Stage>
    </GuideAnimationFigure>
  );
}
