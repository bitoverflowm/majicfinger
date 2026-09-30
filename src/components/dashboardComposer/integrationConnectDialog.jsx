"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
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
import { IntegrationSamplePreview } from "@/components/dashboardComposer/integrationPreviewView";
import {
  isLivePreviewId,
  prefetchIntegrationPreviews,
} from "@/components/dashboardComposer/integrationPreviewSample";
import { buildIntegrationPickerRows } from "@/lib/connectIntegrationPickerRows";
import { cn } from "@/lib/utils";

const IntegrationConnectContext = createContext(null);

export function useIntegrationConnect() {
  return useContext(IntegrationConnectContext);
}

/** Static snapshots for sources we are not sampling yet. */
const PREVIEWS = {
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

function previewFrames(row) {
  return (
    PREVIEWS[row?.id] || [
      {
        title: row?.name || "Sheet",
        caption: "A typical sheet from this source",
        columns: ["Field", "Value"],
        rows: [["—", "—"]],
      },
    ]
  );
}

function PreviewBody({ row, description }) {
  const frames = previewFrames(row);
  return (
    <>
      {description ? (
        <p className="mt-3 text-[13px] leading-relaxed text-foreground/90">{description}</p>
      ) : null}
      {isLivePreviewId(row?.id) ? (
        <IntegrationSamplePreview integrationId={row.id} />
      ) : (
        <div className="mt-5 space-y-3">
          {frames.map((item) => (
            <PreviewTable key={item.title} item={item} />
          ))}
        </div>
      )}
    </>
  );
}

function PreviewPane({ row, description }) {
  const signature = `${row?.id || ""}\0${description || ""}`;
  const latestRef = useRef({ signature, row, description });
  const [leaving, setLeaving] = useState(null);

  useEffect(() => {
    if (latestRef.current.signature === signature) return undefined;
    const previous = latestRef.current;
    latestRef.current = { signature, row, description };
    setLeaving(previous);
    const timer = window.setTimeout(() => setLeaving(null), 520);
    return () => window.clearTimeout(timer);
  }, [signature, row, description]);

  return (
    <div className="flex min-h-0 flex-1 flex-col justify-center overflow-y-auto bg-[#e6edf3] p-6 dark:bg-[#1c232b]">
      <div className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
        <Database className="size-4 text-muted-foreground" aria-hidden />
        What this looks like in Lychee
      </div>
      <div className="relative">
        {leaving ? (
          <div
            key={leaving.signature}
            className="pointer-events-none absolute inset-x-0 top-0 animate-out fade-out duration-500 ease-out fill-mode-forwards motion-reduce:animate-none"
            aria-hidden
          >
            <PreviewBody row={leaving.row} description={leaving.description} />
          </div>
        ) : null}
        <div
          key={signature}
          className="animate-in fade-in duration-500 ease-out motion-reduce:animate-none"
        >
          <PreviewBody row={row} description={description} />
        </div>
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

  useEffect(() => {
    if (!open) return;
    prefetchIntegrationPreviews();
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="z-[560] bg-black/40"
        className="z-[560] flex max-h-[min(880px,92vh)] w-[min(980px,calc(100vw-2rem))] max-w-none flex-col gap-0 overflow-hidden border-border/70 p-0 shadow-xl sm:rounded-2xl"
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
