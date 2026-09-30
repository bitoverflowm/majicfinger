"use client";

import { createContext, useContext, useMemo, useState } from "react";
import Image from "next/image";
import { Database } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  KALSHI_HISTORICAL_DEEP_CAPTION,
  kalshiHistoricalV2Caption,
  kalshiLiveCaption,
  useKalshiHistoricalCutoffDisplay,
} from "@/hooks/useKalshiHistoricalCutoffDisplay";
import { buildIntegrationPickerRows } from "@/lib/connectIntegrationPickerRows";
import { cn } from "@/lib/utils";

const IntegrationConnectContext = createContext(null);

export function useIntegrationConnect() {
  return useContext(IntegrationConnectContext);
}

/** Typical sheet snapshots. These illustrate the pull; they are not live data. */
const PREVIEWS = {
  polymarket: [
    {
      title: "Live markets",
      caption: "Yes price and volume as the book moves",
      columns: ["Market", "Yes", "Volume"],
      rows: [
        ["Fed decision this year", "62¢", "$4.2M"],
        ["Bitcoin above $100k", "41¢", "$18.6M"],
        ["Senate control", "54¢", "$9.1M"],
        ["Recession in 2026", "28¢", "$2.4M"],
      ],
    },
    {
      title: "Price stream",
      caption: "Token prices from the live feed",
      columns: ["Time", "Outcome", "Price"],
      rows: [
        ["12:01:04", "Yes", "0.62"],
        ["12:01:09", "Yes", "0.63"],
        ["12:01:14", "No", "0.37"],
        ["12:01:22", "Yes", "0.61"],
      ],
    },
  ],
  polymarketHistorical: [
    {
      title: "Historical prices",
      caption: "Time series you can chart or export",
      columns: ["Timestamp", "Outcome", "Price"],
      rows: [
        ["2024-11-05 18:00", "Yes", "0.51"],
        ["2024-11-05 20:00", "Yes", "0.74"],
        ["2024-11-05 22:00", "Yes", "0.91"],
        ["2024-11-06 01:00", "Yes", "0.98"],
      ],
    },
    {
      title: "Market snapshot",
      caption: "One row per contract in the pull",
      columns: ["Market", "Volume", "Close"],
      rows: [
        ["Election winner", "$86.4M", "0.98"],
        ["Popular vote margin", "$12.1M", "0.44"],
        ["Turnout above 65%", "$3.8M", "0.22"],
      ],
    },
  ],
  kalshiHistorical: [
    {
      title: "Markets",
      caption: "Ticker, book, and volume from the deep history",
      columns: ["Ticker", "Yes bid", "Volume"],
      rows: [
        ["KXHIGHNY-24DEC", "0.42", "18,420"],
        ["PRESWIN-2024", "0.61", "240,118"],
        ["FEDRATE-25MAR", "0.33", "9,804"],
        ["CPIYOY-25JAN", "0.55", "4,221"],
      ],
    },
    {
      title: "Trades",
      caption: "Each fill, ready for a sheet",
      columns: ["Time", "Ticker", "Price", "Size"],
      rows: [
        ["2024-12-01 14:02", "KXHIGHNY", "0.41", "20"],
        ["2024-12-01 14:06", "KXHIGHNY", "0.44", "50"],
        ["2024-12-01 14:11", "KXHIGHNY", "0.43", "10"],
      ],
    },
  ],
  kalshiHistoricalV2: [
    {
      title: "Recent history",
      caption: "Markets up to the live cutoff",
      columns: ["Ticker", "Status", "Last", "Volume"],
      rows: [
        ["KXFED-26JUN", "open", "0.38", "12,044"],
        ["KXBTCD-26", "open", "0.47", "31,880"],
        ["KXHIGHCHI", "closed", "1.00", "6,102"],
      ],
    },
  ],
  kalshiLive: [
    {
      title: "Live book",
      caption: "Bids and asks updating in place",
      columns: ["Ticker", "Yes bid", "Yes ask", "Volume"],
      rows: [
        ["KXFED-26JUN", "0.37", "0.39", "12,044"],
        ["KXBTCD-26", "0.46", "0.48", "31,880"],
        ["KXHIGHNY", "0.22", "0.25", "4,510"],
        ["KXCPI-26MAR", "0.58", "0.61", "8,933"],
      ],
    },
  ],
  binance: [
    {
      title: "Spot markets",
      caption: "Price and 24h change",
      columns: ["Symbol", "Price", "24h"],
      rows: [
        ["BTCUSDT", "64,210", "+1.2%"],
        ["ETHUSDT", "3,188", "−0.4%"],
        ["SOLUSDT", "148.20", "+3.1%"],
        ["BNBUSDT", "582.40", "+0.6%"],
      ],
    },
  ],
  chainlink: [
    {
      title: "Oracle feeds",
      caption: "Latest answer on each pair",
      columns: ["Pair", "Price", "Updated"],
      rows: [
        ["ETH / USD", "3,210.44", "12s ago"],
        ["BTC / USD", "64,188.02", "9s ago"],
        ["LINK / USD", "14.82", "15s ago"],
      ],
    },
  ],
};

const PRIMARY_ORDER = [
  "kalshiHistorical",
  "kalshiHistoricalV2",
  "kalshiLive",
  "polymarketHistorical",
  "polymarket",
];

const BETA_ORDER = ["chainlink", "binance"];

const LOGO_BG = {
  kalshiHistorical: "bg-[#28CC95]",
  kalshiHistoricalV2: "bg-[#28CC95]",
  kalshiLive: "bg-[#28CC95]",
  polymarket: "bg-[#2E5CFF]",
  polymarketHistorical: "bg-[#2E5CFF]",
  chainlink: "bg-[#375BD2]",
  binance: "bg-black",
};

function rowsInOrder(rows, ids) {
  const byId = new Map(rows.map((row) => [row.id, row]));
  return ids.map((id) => byId.get(id)).filter(Boolean);
}

function Logo({ row }) {
  const brandBg = LOGO_BG[row.id];
  if (row.logoPath) {
    return (
      <span
        className={cn(
          "relative flex size-9 shrink-0 overflow-hidden rounded-lg",
          brandBg || "border border-border/70 bg-background",
        )}
      >
        <Image
          src={row.logoPath}
          alt=""
          fill
          className="object-contain p-1"
          sizes="36px"
        />
      </span>
    );
  }
  const letter = (row.name || "?").slice(0, 1).toUpperCase();
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-muted text-[13px] font-semibold text-foreground">
      {letter}
    </span>
  );
}

function PreviewTable({ item }) {
  return (
    <article className="overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm">
      <header className="border-b border-border/50 px-3 py-2.5">
        <p className="text-[13px] font-semibold text-foreground">{item.title}</p>
        <p className="text-[11px] text-muted-foreground">{item.caption}</p>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border/50 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {item.columns.map((column) => (
                <th key={column} className="px-3 py-2 font-semibold">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {item.rows.map((cells) => (
              <tr key={cells.join("|")} className="border-b border-border/40 last:border-0">
                {cells.map((cell, cellIndex) => (
                  <td
                    key={`${cell}-${cellIndex}`}
                    className={cn(
                      "px-3 py-2.5 text-[12px]",
                      cellIndex === 0 ? "font-medium text-foreground" : "font-mono text-muted-foreground",
                    )}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function PreviewPane({ row, description }) {
  const frames = PREVIEWS[row?.id] || [
    {
      title: row?.name || "Sheet",
      caption: "A typical sheet from this source",
      columns: ["Field", "Value"],
      rows: [["—", "—"]],
    },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col justify-center overflow-y-auto bg-[#e6edf3] p-6 dark:bg-[#1c232b]">
      <div className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
        <Database className="size-4 text-muted-foreground" aria-hidden />
        What this looks like in Lychee
      </div>
      {description ? (
        <p className="mt-3 text-[13px] leading-relaxed text-foreground/90">{description}</p>
      ) : null}
      <div className="mt-5 space-y-3">
        {frames.map((item) => (
          <PreviewTable key={item.title} item={item} />
        ))}
      </div>
    </div>
  );
}

const REALTIME_IDS = new Set(["kalshiLive", "polymarket", "chainlink", "binance"]);

function RealTimeTag() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
      <span className="relative flex size-1.5" aria-hidden>
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
        <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
      </span>
      Real-Time
    </span>
  );
}

function cutoffCaption(row, cutoffLabel) {
  if (row.listCaptionKey === "kalshiHistoricalCutoff") return kalshiHistoricalV2Caption(cutoffLabel);
  if (row.listCaptionKey === "kalshiLiveCutoff") return kalshiLiveCaption(cutoffLabel);
  return null;
}

/** First sentence, or the clause before an em dash. Used when a row has no short caption. */
function succinctDescription(text) {
  const value = String(text || "").trim();
  if (!value) return "";
  const clause = value.split(/\s[—–]\s/)[0].trim();
  const sentence = value.split(/(?<=[.!?])\s/)[0].trim();
  const pick = clause.length < value.length && clause.length <= 88 ? clause : sentence;
  return pick.length > 96 ? `${pick.slice(0, 93).trim()}…` : pick;
}

function pillCaption(row, cutoffLabel) {
  const live = cutoffCaption(row, cutoffLabel);
  if (live) return live;
  if (row.listCaption) return row.listCaption;
  if (row.id === "kalshiHistorical") return KALSHI_HISTORICAL_DEEP_CAPTION;
  return succinctDescription(row.description);
}

function IntegrationOption({ row, active, onSelect, onHover, cutoffLabel, cutoffLoading }) {
  const liveCaption = cutoffCaption(row, cutoffLabel);
  const caption = pillCaption(row, cutoffLabel);
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onClick={() => onSelect(row.id)}
      onMouseEnter={() => onHover?.(row.id)}
      className={cn(
        "flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition-colors",
        active
          ? "border-secondary bg-secondary/10 ring-2 ring-secondary/30"
          : "border-border/70 bg-background hover:bg-muted/40",
      )}
    >
      <Logo row={row} />
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-semibold text-foreground">{row.name}</span>
          {REALTIME_IDS.has(row.id) ? <RealTimeTag /> : null}
        </span>
        {liveCaption && cutoffLoading ? (
          <Skeleton className="mt-1.5 h-3.5 w-56 bg-muted-foreground/20" />
        ) : (
          <span className="mt-0.5 line-clamp-2 block text-[12px] leading-relaxed text-muted-foreground">
            {caption}
          </span>
        )}
      </span>
    </button>
  );
}

export function IntegrationConnectDialog({ open, onOpenChange }) {
  const rows = useMemo(() => buildIntegrationPickerRows(), []);
  const primary = rowsInOrder(rows, PRIMARY_ORDER);
  const beta = rowsInOrder(rows, BETA_ORDER);
  const listed = new Set([...PRIMARY_ORDER, ...BETA_ORDER]);
  const comingSoon = rows.filter((row) => !listed.has(row.id));
  const selectable = [...primary, ...beta];
  const [selectedId, setSelectedId] = useState(primary[0]?.id || null);
  const [hoveredId, setHoveredId] = useState(null);
  const selected = selectable.find((row) => row.id === selectedId) || primary[0] || null;
  const hovered = rows.find((row) => row.id === hoveredId) || null;
  const shown = hovered || selected;
  const { cutoffLabel, loading: cutoffLoading } = useKalshiHistoricalCutoffDisplay();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="z-[560] bg-black/40"
        className="z-[560] flex max-h-[min(760px,90vh)] w-[min(980px,calc(100vw-2rem))] max-w-none flex-col gap-0 overflow-hidden border-border/70 p-0 shadow-xl sm:rounded-2xl"
      >
        <div className="grid min-h-0 flex-1 md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div className="flex min-h-0 flex-col bg-background">
            <div className="px-6 pb-3 pt-6 pr-12">
              <DialogTitle className="text-xl font-semibold tracking-tight text-foreground">
                Which integration should feed this dashboard?
              </DialogTitle>
              <DialogDescription className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                Pick a source. You’ll shape the pull in the next step.
              </DialogDescription>
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-6 pb-6">
              <div role="listbox" aria-label="Integrations" className="space-y-2">
                {primary.map((row) => (
                  <IntegrationOption
                    key={row.id}
                    row={row}
                    active={row.id === selected?.id}
                    onSelect={setSelectedId}
                    onHover={setHoveredId}
                    cutoffLabel={cutoffLabel}
                    cutoffLoading={cutoffLoading}
                  />
                ))}
              </div>
              {beta.length ? (
                <div className="pt-4">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Beta
                  </p>
                  <div role="listbox" aria-label="Beta integrations" className="space-y-2">
                    {beta.map((row) => (
                      <IntegrationOption
                        key={row.id}
                        row={row}
                        active={row.id === selected?.id}
                        onSelect={setSelectedId}
                        onHover={setHoveredId}
                        cutoffLabel={cutoffLabel}
                        cutoffLoading={cutoffLoading}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
              {comingSoon.length ? (
                <div className="pt-4">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Coming soon
                  </p>
                  <div className="space-y-2">
                    {comingSoon.map((row) => (
                      <div
                        key={row.id}
                        onMouseEnter={() => setHoveredId(row.id)}
                        className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/20 px-3 py-3"
                      >
                        <Logo row={row} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="text-[13px] font-semibold text-foreground">{row.name}</span>
                            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                              Coming soon
                            </span>
                          </span>
                          <span className="mt-0.5 line-clamp-2 block text-[12px] leading-relaxed text-muted-foreground">
                            {pillCaption(row, cutoffLabel)}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
          {shown ? (
            <PreviewPane row={shown} description={hovered?.description || ""} />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function IntegrationConnectProvider({ children }) {
  const [open, setOpen] = useState(false);
  const value = useMemo(() => ({ open: () => setOpen(true) }), []);
  return (
    <IntegrationConnectContext.Provider value={value}>
      {children}
      <IntegrationConnectDialog open={open} onOpenChange={setOpen} />
    </IntegrationConnectContext.Provider>
  );
}
