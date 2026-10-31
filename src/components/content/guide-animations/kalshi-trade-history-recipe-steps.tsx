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
import { useRef, type ReactNode } from "react";

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
const BLUE = "#2f6fed";

const QUERY = "Bitcoin price";
const TICKER = "KXBTCD-26OCT3108-T77299.99";
const SHEET_TITLE = `Trades · ${TICKER}`;
const RESULTS = ["77,300", "77,200", "77,400", "77,100", "77,500"].map((strike) => ({
  strike,
  ticker: `KXBTCD-26OCT3108-T${Number(strike.replace(",", "")) - 1}.99`,
}));

const TRADE_ROWS = [
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
] as const;

const SHEET_COLUMNS = ["Trade Id", "Ticker", "Count Fp", "Yes Price Dollars", "No Price Dollars", "Taker Outcome Side", "Taker Book Side", "Side", "Created Time"];

/** Last traded yes price in cents across the market's first hour (No is 100 minus Yes). */
const YES_SERIES = [40, 41, 40, 40, 40, 40, 40, 40, 40, 40, 39, 40, 40, 44, 44, 43, 44, 43, 44, 44, 44, 44, 45, 45, 45, 44, 44, 44, 43, 41, 41, 40, 39, 38, 37, 38, 39, 39, 38, 38];

/* ------------------------------------------------------------------ */
/* Picker + recipe dialog                                              */
/* ------------------------------------------------------------------ */

function RecipesSidebarMock({ active }: { active: boolean }) {
  return (
    <aside className="flex w-[25%] shrink-0 flex-col border-r border-border bg-black/[0.015] dark:bg-white/[0.02]">
      <div className="px-5 pb-3 pt-6">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Recipes <span className="tabular-nums">1</span>
        </div>
        <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
          A list of quick actions requested by our quants. Click one to get started right away.
        </p>
      </div>
      <div
        data-cursor="recipe-row"
        className={cn(
          "flex items-start gap-2.5 px-5 py-3 transition-colors duration-300",
          active && "bg-black/[0.06] dark:bg-white/[0.07]",
        )}
      >
        <CircleArrowDown className={cn("mt-px size-4 shrink-0 text-muted-foreground", active && "text-foreground")} aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className={cn("min-w-0 flex-1 truncate text-[13px] font-medium text-foreground", active ? "opacity-100" : "opacity-80")}>
              Download Kalshi Trade History
            </span>
            <span className="shrink-0 text-[11px] text-muted-foreground">CSV</span>
          </span>
          <span className="mt-0.5 block text-[12px] leading-relaxed text-muted-foreground">
            Search a market to view its trades and download a CSV.
          </span>
        </span>
      </div>
    </aside>
  );
}

function VenueLogo({ venue }: { venue: "kalshi" | "polymarket" }) {
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

function VenuePickerMock() {
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

function StatusPill({ label }: { label: string }) {
  return (
    <span className="shrink-0 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
      {label}
    </span>
  );
}

function ResultCard({ index, state }: { index: number; state: "idle" | "highlighted" | "active" }) {
  const result = RESULTS[index];
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
        <span className="block text-[12.5px] font-semibold leading-snug text-foreground">Bitcoin price Above/below</span>
        <span className="mt-0.5 block text-[11.5px] text-muted-foreground">${result.strike} or above</span>
        <span className="mt-0.5 block truncate text-[10.5px] text-muted-foreground">
          <span className="font-mono">{result.ticker}</span> · closes Oct 31, 2026
        </span>
      </span>
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

function MarketPaneMock({ state, callout = false }: { state: DetailsState; callout?: boolean }) {
  return (
    <div className="relative flex min-w-0 flex-1 flex-col bg-[#e6edf3] px-5 pb-5 pt-9 dark:bg-[#1c232b]">
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
            {[
              ["Kalshi Live", "Markets still trading or settled after the live cutoff"],
              ["Kalshi Historical v1", "Markets that closed between Kalshi's launch and Dec 2025"],
              ["Kalshi Historical v2", "Everything else up to the live cutoff, with candlesticks when the trade tape is empty"],
            ].map(([name, detail]) => (
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
            <p className="text-[13.5px] font-semibold text-foreground">Bitcoin price Above/below</p>
            <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{TICKER}</p>
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
                <p className="min-w-0 flex-1 text-[13.5px] font-semibold leading-snug text-foreground">Bitcoin price on Oct 31, 2026?</p>
                <StatusPill label="Open" />
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">$77,300 or above</p>
              <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{TICKER}</p>
            </header>
            <div className="grid grid-cols-2 gap-2 p-2.5">
              <Stat label="Last price" value="39¢" detail="No 61¢" />
              <Stat label="Yes bid / ask" value="39¢ / 40¢" />
              <Stat label="Volume" value="7,694" detail="330 in 24h" />
              <Stat label="Open interest" value="6,133" detail="contracts" />
              <Stat label="Opened" value="Oct 31, 2026" detail="4:45 PM" />
              <Stat label="Closes" value="Oct 31, 2026" detail="5:45 PM" />
            </div>
          </article>
          {state === "source" ? (
            <section className="rounded-xl border border-border/70 bg-background p-3.5 shadow-sm [animation:fx-rise_.35s_both]">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Trade history source</p>
              <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10.5px] font-medium text-emerald-700 dark:text-emerald-300">
                <Check className="size-3" strokeWidth={3} aria-hidden />
                Kalshi Live
              </span>
              <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                Opened after the Sep 1, 2026 live cutoff, so every trade is on Kalshi Live.
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                Pulls the market&apos;s full trade history, with both yes and no prices on every row.
              </p>
            </section>
          ) : null}
        </div>
      )}
      {callout ? (
        <span className="absolute right-5 top-3 rounded-full bg-[#2f6fed] px-2 py-0.5 text-[10px] font-medium text-white shadow-sm [animation:fx-rise_.3s_both]">
          Check the strike, ticker and close time
        </span>
      ) : null}
    </div>
  );
}

function RecipePaneMock({
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
            <p className="text-[17px] font-semibold tracking-tight text-foreground">Download Kalshi Trade History</p>
            <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
              Search in plain English, or paste a market ticker, event ticker or Kalshi link.
            </p>
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
            {query ? (
              <span className="text-foreground">{query}</span>
            ) : (
              <span className="text-muted-foreground">Will Bitcoin close above $100k this year?</span>
            )}
            {typing ? <span className="ml-px h-4 w-px animate-pulse bg-foreground" aria-hidden /> : null}
            {list === "skeleton" ? <Loader2 className="absolute right-3 size-4 animate-spin text-muted-foreground" aria-hidden /> : null}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden px-5">
          {list === "chips" ? (
            <div className="pt-1.5">
              <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">Try</p>
              <div className="flex flex-wrap gap-1.5">
                {["Bitcoin price", "Fed funds rate", "NYC mayor", "KXBTCD"].map((chip) => (
                  <span
                    key={chip}
                    className={cn("rounded-full border border-border px-2.5 py-0.5 text-[11.5px] text-muted-foreground", chip === "KXBTCD" && "font-mono")}
                  >
                    {chip}
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
              {RESULTS.map((_, i) => (
                <ResultCard key={i} index={i} state={i === selected ? "active" : i === highlighted ? "highlighted" : "idle"} />
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
      <MarketPaneMock state={details} callout={callout} />
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

export function RecipeFindMarketAnimation() {
  const rootRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const { phase, loop } = useGuidePhases(FIND_PHASES, rootRef, 6);
  const typed = useTypedText(QUERY, phase === 3, 80);
  const open = phase >= 2;
  const cursorTarget = ["recipe-row", "recipe-row", "recipe-row", "search", "search", "result-0", "result-0"][phase];

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      backdrop="lake"
      label="Animation: opening the Download Kalshi Trade History recipe from the Recipes sidebar, typing Bitcoin price, and selecting the $77,300 or above market."
      caption="Open the recipe from the Recipes list, search in plain English, then pick the exact market."
    >
      <Stage
        stageRef={stageRef}
        overlay={<GuideCursor stageRef={stageRef} target={cursorTarget} pressed={phase === 2 || phase === 6} revision={`${loop}-${phase}`} />}
      >
        <div className="relative flex min-w-0 flex-1">
          <RecipesSidebarMock active={phase >= 1} />
          {open ? (
            <RecipePaneMock
              key={`recipe-${loop}`}
              query={phase === 3 ? typed : phase >= 4 ? QUERY : ""}
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

export function RecipeMarketDetailsAnimation() {
  const rootRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const { phase, loop } = useGuidePhases(DETAILS_PHASES, rootRef, 3);
  const details: DetailsState = phase === 0 ? "loading" : phase === 1 ? "stats" : "source";

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      backdrop="insights"
      label="Animation: the Market details panel loading the selected market's status, prices, volume, open interest and close time, then the trade history source, before Save and Go is clicked."
      caption="Market details confirms you picked the right contract and shows which Kalshi source the trades will come from."
    >
      <Stage
        stageRef={stageRef}
        overlay={<GuideCursor stageRef={stageRef} target={phase >= 3 ? "save" : "result-0"} pressed={phase === 4} revision={`${loop}-${phase}`} />}
      >
        <div className="relative flex min-w-0 flex-1">
          <RecipesSidebarMock active />
          <RecipePaneMock
            key={`details-${loop}`}
            query={QUERY}
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
  className,
  style,
  arrive = false,
  menuButton = false,
  selected = false,
}: {
  className?: string;
  style?: React.CSSProperties;
  arrive?: boolean;
  menuButton?: boolean;
  selected?: boolean;
}) {
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
        <span className="shrink-0 text-[11px] font-semibold text-foreground">{SHEET_TITLE}</span>
        <span className="truncate text-[10px] text-muted-foreground">Bitcoin price on Oct 31, 2026? · $77,300 or above</span>
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
      <div className="min-h-0 flex-1 overflow-hidden text-[10px]">
        <div className="grid grid-cols-[22px_1.4fr_1.3fr_0.7fr_1fr_1fr_1.05fr_0.95fr_0.5fr_0.9fr] border-b border-border/70 bg-muted/60 font-medium text-muted-foreground">
          {["", ...SHEET_COLUMNS].map((c, i) => (
            <span key={i} className="truncate border-r border-border/50 px-1.5 py-1">
              {c}
            </span>
          ))}
        </div>
        {TRADE_ROWS.map((row, i) => (
          <div
            key={row[0]}
            className={cn(
              "grid grid-cols-[22px_1.4fr_1.3fr_0.7fr_1fr_1fr_1.05fr_0.95fr_0.5fr_0.9fr] border-b border-border/40 tabular-nums text-foreground",
              arrive && "[animation:fx-slide-in_.35s_both]",
            )}
            style={arrive ? { animationDelay: `${150 + i * 45}ms` } : undefined}
          >
            <span className="px-1.5 py-[3px] text-center text-muted-foreground">{i + 1}</span>
            <span className="truncate px-1.5 py-[3px]">{row[0]}…</span>
            <span className="truncate px-1.5 py-[3px]">{TICKER}</span>
            {row.slice(1).map((cell, j) => (
              <span key={j} className="truncate px-1.5 py-[3px]">
                {cell}
              </span>
            ))}
            <span className="truncate px-1.5 py-[3px] text-muted-foreground">10/31/2026</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function linePoints(values: readonly number[], w: number, h: number, lo: number, hi: number) {
  return values
    .map((v, i) => `${i ? "L" : "M"}${((i / (values.length - 1)) * w).toFixed(1)} ${(((hi - v) / (hi - lo)) * h).toFixed(1)}`)
    .join(" ");
}

function ChartBlockMock({ className, style, drawKey }: { className?: string; style?: React.CSSProperties; drawKey?: string | number }) {
  const no = YES_SERIES.map((v) => 100 - v);
  const W = 300;
  const H = 100;
  return (
    <div className={cn("absolute flex flex-col overflow-hidden rounded-xl border border-border/70 bg-background p-2.5 shadow-sm", className)} style={style}>
      <div className="flex items-center gap-1.5">
        <BarChart3 className="size-3 text-muted-foreground" aria-hidden />
        <span className="truncate text-[11px] font-semibold text-foreground">{SHEET_TITLE} chart</span>
      </div>
      <div className="mt-1.5 flex items-start justify-between gap-2">
        <div>
          <p className="text-[9.5px] text-muted-foreground">Last traded price</p>
          <p className="flex items-baseline gap-2 font-mono text-[10px]">
            <span className="flex items-baseline gap-1">
              <span className="size-1.5 rounded-full" style={{ background: GREEN }} />
              <span className="text-muted-foreground">Yes</span>
              <span className="text-[13px] font-semibold text-foreground">38.0%</span>
              <span className="text-[#e5484d]">-2.00 pp</span>
            </span>
            <span className="flex items-baseline gap-1">
              <span className="size-1.5 rounded-full" style={{ background: VIOLET }} />
              <span className="text-muted-foreground">No</span>
              <span className="text-[13px] font-semibold text-foreground">62.0%</span>
              <span className="text-[#0f9f6e]">+2.00 pp</span>
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
            <path d={linePoints(no, W, H, 34, 66)} fill="none" stroke={VIOLET} strokeWidth="1.6" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            <path d={linePoints(YES_SERIES, W, H, 34, 66)} fill="none" stroke={GREEN} strokeWidth="1.6" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </g>
        </svg>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Step 3: Save and Go, the run card, then the sheet                   */
/* ------------------------------------------------------------------ */

const RUN_STEPS = [
  { name: "find_market", args: `{"ticker":"${TICKER}"}`, result: "Bitcoin price on Oct 31, 2026? · $77,300 or above", time: "0.0s" },
  { name: "route_source", args: `{"source":"Kalshi Live"}`, result: "Opened after the Sep 1, 2026 live cutoff, so every trade is on Kalshi Live.", time: "0.0s" },
  { name: "pull_trades", args: `{"ticker":"${TICKER}","history":"full"}`, result: "187 trades from Kalshi Live", time: "6.0s" },
  { name: "place_sheets", args: `{"charts":"default"}`, result: `${SHEET_TITLE} and its chart on this tab`, time: "1.8s" },
];

const RUN_PHASES = [700, 800, 1300, 900, 1800, 700, 3800] as const;

function RunCard({ phase }: { phase: number }) {
  const done = phase >= 4;
  return (
    <div
      className="absolute right-6 top-4 z-30 w-[300px] overflow-hidden rounded-xl border border-border bg-background shadow-[0_18px_50px_-18px_rgba(15,23,42,0.45)] transition-opacity duration-500 [animation:fx-rise_.35s_both]"
      style={{ opacity: phase >= 6 ? 0 : 1 }}
    >
      <div className="flex items-start justify-between border-b border-border/70 px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold text-foreground">{done ? "Trade history ready" : "Pulling trade history"}</p>
          <p className="truncate text-[10px] text-muted-foreground">Kalshi trade history · {TICKER}</p>
        </div>
        <span className="shrink-0 font-mono text-[9.5px] text-muted-foreground">{done ? "7.8s" : `${(phase * 1.6).toFixed(1)}s`}</span>
      </div>
      <ol className="space-y-2 px-3 py-2.5">
        {RUN_STEPS.map((step, i) => {
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
                  <span className="fx-shimmer-text mt-1 block text-[10px]">Read 187 trades from Kalshi Live</span>
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

export function RecipeRunAnimation() {
  const rootRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const { phase, loop } = useGuidePhases(RUN_PHASES, rootRef, 6);
  const placed = phase >= 4;

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      backdrop="dashboards"
      label="Animation: after Save and Go, a progress card runs find_market, route_source, pull_trades and place_sheets, reports 187 trades from Kalshi Live, then reveals the trade sheet and its price chart on the canvas."
      caption="Save and Go pulls the full trade history onto your canvas as a sheet, with a default price chart."
    >
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
        <CanvasChrome>
          {placed ? (
            <div key={`placed-${loop}`}>
              <SheetBlockMock arrive style={{ left: 14, top: 40, width: 600, height: 236 }} />
              <ChartBlockMock drawKey={`${loop}-${phase >= 6}`} style={{ left: 14, top: 286, width: 600, height: 186 }} />
            </div>
          ) : null}
          <RunCard key={`card-${loop}`} phase={phase} />
        </CanvasChrome>
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

const EXPORT_FILENAME = "trades-kxbtcd-26oct3108-t77299-99";
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

export function RecipeExportAnimation() {
  const rootRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const { phase, loop } = useGuidePhases(EXPORT_PHASES, rootRef, 4);
  const format = FORMATS[loop % FORMATS.length];
  const menuOpen = phase >= 2 && phase <= 5;
  const subOpen = phase >= 3 && phase <= 5;
  const cursorTarget = ["sheet-body", "menu-button", "menu-button", "menu-export", `format-${format.id}`, `format-${format.id}`, `format-${format.id}`][phase];

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      backdrop="automate"
      label="Animation: opening the trade sheet's actions menu, choosing Export, and picking CSV, Excel (.xlsx) or JSON to download the trades."
      caption="Export lives in the sheet's ⋮ menu: CSV, JSON, or Excel (.xlsx)."
    >
      <Stage
        stageRef={stageRef}
        overlay={<GuideCursor stageRef={stageRef} target={cursorTarget} pressed={phase === 2 || phase === 5} revision={`${loop}-${phase}`} />}
      >
          <CanvasChrome>
            <SheetBlockMock menuButton={phase >= 1 && phase <= 5} selected={phase >= 1 && phase <= 5} style={{ left: 14, top: 40, width: 540, height: 236 }} />
            <ChartBlockMock style={{ left: 14, top: 286, width: 540, height: 186 }} />
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
                    className={cn(
                      "rounded-md px-2 py-1.5 text-[12px] text-foreground transition-colors",
                      phase >= 4 && f.id === format.id && "bg-accent",
                    )}
                  >
                    {f.label}
                  </div>
                ))}
              </div>
            ) : null}
            {phase >= 6 ? (
              <div
                key={`file-${loop}`}
                className="absolute right-6 top-24 z-30 flex items-center gap-2.5 rounded-xl border border-border bg-background px-3 py-2.5 shadow-[0_12px_30px_-12px_rgba(15,23,42,0.35)] [animation:fx-rise_.3s_both]"
              >
                <span className="grid size-8 place-items-center rounded-lg bg-[#10b981]/10 text-[#0f9f6e]">
                  <format.Icon className="size-4" aria-hidden />
                </span>
                <span>
                  <span className="block font-mono text-[11px] text-foreground">
                    {EXPORT_FILENAME}.{format.ext}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Check className="size-3 text-[#10b981]" strokeWidth={3} aria-hidden />
                    Downloaded · 187 rows
                  </span>
                </span>
              </div>
            ) : null}
          </CanvasChrome>
      </Stage>
    </GuideAnimationFigure>
  );
}
