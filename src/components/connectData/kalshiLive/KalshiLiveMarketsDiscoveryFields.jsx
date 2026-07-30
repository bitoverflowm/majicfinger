"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarIcon } from "lucide-react";

import { MarketTickerSearch } from "@/components/connectData/MarketTickerSearch";
import { KalshiLiveTimestampPicker } from "@/components/connectData/kalshiLive/KalshiLiveTimestampPicker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  applyKalshiLiveMarketsDiscoveryUpdatedAfter,
  getKalshiLiveMarketsDiscoveryFieldLocks,
  KALSHI_LIVE_MVE_FILTER_EXCLUDE,
  KALSHI_LIVE_MVE_FILTER_ONLY,
  normalizeKalshiLiveMveFilter,
} from "@/lib/kalshiLive/marketDiscovery";
import {
  isKalshiHistoricalV2MveExcluded,
  normalizeKalshiHistoricalV2MarketsDiscoveryScope,
} from "@/lib/kalshiHistoricalV2/historicalMarketsDiscovery";
import { KALSHI_LIVE_MARKET_STATUS_OPTIONS } from "@/lib/kalshiLive/marketsColumns";
import { cn } from "@/lib/utils";
import { useKalshiHistoricalCutoffDisplay } from "@/hooks/useKalshiHistoricalCutoffDisplay";

const HISTORICAL_TICKER_SCOPE_OPTIONS = [
  { id: "event", label: "Events" },
  { id: "series", label: "Series" },
  { id: "markets", label: "Markets" },
  { id: "general", label: "General pull without ticker" },
];

function startOfLocalDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfLocalDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 0);
  return x;
}

function unixFromDate(d, endOfDay = false) {
  if (!d) return "";
  const sec = Math.floor((endOfDay ? endOfLocalDay(d) : startOfLocalDay(d)).getTime() / 1000);
  return Number.isFinite(sec) ? sec : "";
}

function dateFromUnix(unix) {
  const n = Number(unix);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return new Date(n * 1000);
}

function formatRangeLabel(fromUnix, toUnix) {
  const fmt = (u) => {
    const d = dateFromUnix(u);
    return d
      ? d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
      : null;
  };
  const a = fmt(fromUnix);
  const b = fmt(toUnix);
  if (a && b) return `${a} – ${b}`;
  if (a) return `${a} – …`;
  if (b) return `… – ${b}`;
  return "Pick start and end dates";
}

/**
 * @param {{
 *   label: string;
 *   description: string;
 *   minTs: number | "";
 *   maxTs: number | "";
 *   onRangeChange: (min: number | "", max: number | "") => void;
 *   disabled?: boolean;
 *   fromDate?: Date | null;
 * }} props
 */
function DiscoveryDateRangeField({
  label,
  description,
  minTs,
  maxTs,
  onRangeChange,
  disabled = false,
  fromDate = null,
  toDate = null,
}) {
  const selected = useMemo(() => {
    const from = dateFromUnix(minTs);
    const to = dateFromUnix(maxTs);
    if (!from && !to) return undefined;
    return { from, to };
  }, [minTs, maxTs]);

  return (
    <div className={cn("flex h-full flex-col gap-1", disabled && "opacity-60")}>
      <Label className="text-[11px] font-medium text-foreground">{label}</Label>
      <p className="text-[10px] leading-snug text-muted-foreground">{description}</p>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className="h-8 w-full justify-start px-2 text-left text-[11px] font-normal"
          >
            <CalendarIcon className="mr-1.5 h-3.5 w-3.5 shrink-0 opacity-70" />
            <span
              className={cn(
                "truncate",
                !(Number(minTs) > 0 || Number(maxTs) > 0) && "text-muted-foreground",
              )}
            >
              {formatRangeLabel(minTs, maxTs)}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3" align="start">
          <Calendar
            mode="range"
            numberOfMonths={1}
            selected={selected}
            fromDate={fromDate || undefined}
            toDate={toDate || undefined}
            disabled={
              fromDate || toDate
                ? [
                    ...(fromDate ? [{ before: fromDate }] : []),
                    ...(toDate ? [{ after: toDate }] : []),
                  ]
                : undefined
            }
            onSelect={(range) => {
              const from = range?.from ? unixFromDate(range.from, false) : "";
              const to = range?.to ? unixFromDate(range.to, true) : "";
              onRangeChange(from, to);
            }}
          />
          {Number(minTs) > 0 || Number(maxTs) > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-2 h-7 w-full text-[10px]"
              disabled={disabled}
              onClick={() => onRangeChange("", "")}
            >
              Clear dates
            </Button>
          ) : null}
        </PopoverContent>
      </Popover>
    </div>
  );
}

/**
 * @param {{
 *   label: string;
 *   description: string;
 *   value: number | "";
 *   onChange: (unix: number | "") => void;
 *   disabled?: boolean;
 *   fromDate?: Date | null;
 * }} props
 */
function DiscoverySingleDateField({
  label,
  description,
  value,
  onChange,
  disabled = false,
  fromDate = null,
  toDate = null,
}) {
  return (
    <div className={cn("flex h-full flex-col gap-1", disabled && "opacity-60")}>
      <Label className="text-[11px] font-medium text-foreground">{label}</Label>
      <p className="text-[10px] leading-snug text-muted-foreground">{description}</p>
      <KalshiLiveTimestampPicker
        value={value}
        onChange={onChange}
        disabled={disabled}
        fromDate={fromDate || undefined}
        toDate={toDate || undefined}
        placeholder="Pick a date"
        className="h-8 w-full"
      />
    </div>
  );
}

/**
 * Reusable Kalshi Live markets discovery filters (GET /markets list).
 * Controlled — wire to any parent state (Connect home, hubs, etc.).
 *
 * When `cutoffMode="historical"`, only filters supported by GET /historical/markets
 * are shown (event/series/tickers + mve exclude for general). Status and date filters are live-only.
 *
 * @param {{
 *   value: import("@/lib/kalshiLive/marketDiscovery").KalshiLiveMarketsDiscoveryParams & {
 *     tickerScope?: import("@/lib/kalshiHistoricalV2/historicalMarketsDiscovery").KalshiHistoricalV2MarketsDiscoveryScope;
 *   };
 *   onChange: (next: import("@/lib/kalshiLive/marketDiscovery").KalshiLiveMarketsDiscoveryParams & {
 *     tickerScope?: import("@/lib/kalshiHistoricalV2/historicalMarketsDiscovery").KalshiHistoricalV2MarketsDiscoveryScope;
 *   }) => void;
 *   disabled?: boolean;
 *   className?: string;
 *   cutoffMode?: "live" | "historical";
 * }} props
 */
export function KalshiLiveMarketsDiscoveryFields({
  value,
  onChange,
  disabled = false,
  className,
  cutoffMode = "live",
}) {
  const historical = cutoffMode === "historical";
  const [cutoffDate, setCutoffDate] = useState(/** @type {Date | null} */ (null));

  const { cutoffIso } = useKalshiHistoricalCutoffDisplay();

  useEffect(() => {
    if (!cutoffIso) return;
    const d = new Date(String(cutoffIso).trim());
    if (Number.isNaN(d.getTime())) return;
    setCutoffDate(startOfLocalDay(d));
  }, [cutoffIso]);

  const locks = useMemo(() => getKalshiLiveMarketsDiscoveryFieldLocks(value), [value]);

  const patch = (partial) => {
    onChange({ ...value, ...partial });
  };

  const setUpdatedAfter = (next) => {
    if (next === "" || next == null) {
      patch({ minUpdatedTs: "" });
      return;
    }
    const cleared = applyKalshiLiveMarketsDiscoveryUpdatedAfter(value);
    onChange({ ...cleared, minUpdatedTs: next });
  };

  const statusChoices =
    locks.statusOptions.length > 0 ? locks.statusOptions : KALSHI_LIVE_MARKET_STATUS_OPTIONS;

  return (
    <div className={cn("space-y-4", className)}>
      {historical ? null : locks.note ? (
        <p className="rounded-md border border-border/60 bg-muted/20 px-2.5 py-2 text-[10px] leading-snug text-muted-foreground">
          {locks.note}
        </p>
      ) : null}

      {/* Status + Multivariate Events (live only at top). Historical places MVE last. */}
      {!historical ? (
        <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className={cn("flex flex-col space-y-1.5", locks.disableStatus && "opacity-60")}>
            <Label className="text-[11px] font-medium text-foreground">Status</Label>
            <p className="min-h-[2.5rem] text-[10px] leading-snug text-muted-foreground">
              Filter by market status.
            </p>
            <Select
              value={value.status || "__any__"}
              disabled={disabled || locks.disableStatus}
              onValueChange={(v) => patch({ status: v === "__any__" ? "" : v })}
            >
              <SelectTrigger className="mt-auto h-9 w-full text-xs">
                <SelectValue placeholder="Any status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__any__" className="text-xs text-muted-foreground">
                  Any status
                </SelectItem>
                {statusChoices.map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className={cn("flex flex-col space-y-1.5", locks.disableMve && "opacity-60")}>
            <Label className="text-[11px] font-medium text-foreground">Multivariate Events</Label>
            <p className="min-h-[2.5rem] text-[10px] leading-snug text-muted-foreground">
              &apos;only&apos; returns only multivariate events, &apos;exclude&apos; excludes multivariate
              events.
            </p>
            <Select
              value={normalizeKalshiLiveMveFilter(value.mveFilter)}
              disabled={disabled || locks.disableMve}
              onValueChange={(v) =>
                patch({
                  mveFilter:
                    v === KALSHI_LIVE_MVE_FILTER_ONLY
                      ? KALSHI_LIVE_MVE_FILTER_ONLY
                      : KALSHI_LIVE_MVE_FILTER_EXCLUDE,
                })
              }
            >
              <SelectTrigger className="mt-auto h-9 w-full text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={KALSHI_LIVE_MVE_FILTER_EXCLUDE} className="text-xs">
                  Exclude
                </SelectItem>
                <SelectItem value={KALSHI_LIVE_MVE_FILTER_ONLY} className="text-xs">
                  only
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : null}

      {/* Historical: single ticker input + scope dropdown. Live: separate fields below. */}
      {historical ? (
        <div className="space-y-1.5">
          <Label className="text-[11px] font-medium text-foreground">Ticker filter</Label>
          <p className="text-[10px] leading-snug text-muted-foreground">
            {(() => {
              const scope = normalizeKalshiHistoricalV2MarketsDiscoveryScope(value.tickerScope);
              if (scope === "general") {
                return "Pull the first 100 historical markets with no ticker filter (single page).";
              }
              if (scope === "series") {
                return "Get markets by Series ticker";
              }
              if (scope === "markets") {
                return "Get markets by Market ticker";
              }
              return "Get markets by Event ticker";
            })()}
          </p>
          <div className="flex max-w-xl">
            <Input
              value={(() => {
                const scope = normalizeKalshiHistoricalV2MarketsDiscoveryScope(value.tickerScope);
                if (scope === "series") return value.seriesTicker || "";
                if (scope === "markets") return value.tickers || "";
                if (scope === "general") return "";
                return value.eventTicker || "";
              })()}
              disabled={
                disabled ||
                normalizeKalshiHistoricalV2MarketsDiscoveryScope(value.tickerScope) === "general"
              }
              placeholder={(() => {
                const scope = normalizeKalshiHistoricalV2MarketsDiscoveryScope(value.tickerScope);
                if (scope === "series") return "e.g. KXHIGHNY";
                if (scope === "markets") return "e.g. TICKER1, TICKER2";
                if (scope === "general") return "No ticker required";
                return "e.g. KXHIGHNY-25JAN01";
              })()}
              className="h-9 min-w-0 flex-1 rounded-r-none border-r-0 text-xs focus-visible:z-10"
              onChange={(e) => {
                const scope = normalizeKalshiHistoricalV2MarketsDiscoveryScope(value.tickerScope);
                const next = e.target.value;
                if (scope === "series") {
                  patch({ seriesTicker: next, eventTicker: "", tickers: "" });
                } else if (scope === "markets") {
                  patch({ tickers: next, eventTicker: "", seriesTicker: "" });
                } else if (scope === "general") {
                  patch({ eventTicker: "", seriesTicker: "", tickers: "" });
                } else {
                  patch({ eventTicker: next, seriesTicker: "", tickers: "" });
                }
              }}
            />
            <Select
              value={normalizeKalshiHistoricalV2MarketsDiscoveryScope(value.tickerScope)}
              disabled={disabled}
              onValueChange={(v) => {
                const scope = normalizeKalshiHistoricalV2MarketsDiscoveryScope(v);
                const currentText = (() => {
                  const prev = normalizeKalshiHistoricalV2MarketsDiscoveryScope(value.tickerScope);
                  if (prev === "series") return value.seriesTicker || "";
                  if (prev === "markets") return value.tickers || "";
                  if (prev === "general") return "";
                  return value.eventTicker || "";
                })();
                if (scope === "general") {
                  patch({
                    tickerScope: scope,
                    eventTicker: "",
                    seriesTicker: "",
                    tickers: "",
                    mveFilter: KALSHI_LIVE_MVE_FILTER_EXCLUDE,
                  });
                  return;
                }
                if (scope === "series") {
                  patch({
                    tickerScope: scope,
                    seriesTicker: currentText,
                    eventTicker: "",
                    tickers: "",
                    mveFilter: "include",
                  });
                  return;
                }
                if (scope === "markets") {
                  patch({
                    tickerScope: scope,
                    tickers: currentText,
                    eventTicker: "",
                    seriesTicker: "",
                    mveFilter: "include",
                  });
                  return;
                }
                patch({
                  tickerScope: scope,
                  eventTicker: currentText,
                  seriesTicker: "",
                  tickers: "",
                  mveFilter: "include",
                });
              }}
            >
              <SelectTrigger className="h-9 w-[13.5rem] shrink-0 rounded-l-none text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HISTORICAL_TICKER_SCOPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.id} value={opt.id} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : (
        <>
          {/* Event Ticker */}
          <div className={cn("space-y-1.5", locks.disableEventTicker && "opacity-60")}>
            <Label htmlFor="markets-discovery-event-ticker" className="text-[11px] font-medium text-foreground">
              Event Ticker
            </Label>
            <p className="text-[10px] leading-snug text-muted-foreground">
              Event ticker to filter by. Only a single ticker allowed.
            </p>
            <Input
              id="markets-discovery-event-ticker"
              value={value.eventTicker || ""}
              disabled={disabled || locks.disableEventTicker}
              placeholder="Optional — e.g. KXHIGHNY-25JAN01"
              className="h-9 max-w-md text-xs"
              onChange={(e) => patch({ eventTicker: e.target.value })}
            />
          </div>

          {/* Series Ticker */}
          <div className={cn("space-y-1.5", locks.disableSeriesTicker && "opacity-60")}>
            <Label className="text-[11px] font-medium text-foreground">Series Ticker</Label>
            <p className="text-[10px] leading-snug text-muted-foreground">
              Series ticker to filter by.
            </p>
            <MarketTickerSearch
              value={value.seriesTicker || ""}
              onChange={(v) => patch({ seriesTicker: v })}
              disabled={disabled || locks.disableSeriesTicker}
              dataSource="live"
              searchScope="series"
              showCutoffNotes={false}
              maxTickers={1}
              required={false}
            />
          </div>

          {/* Market tickers */}
          <div className={cn("space-y-1.5", locks.disableTickers && "opacity-60")}>
            <Label className="text-[11px] font-medium text-foreground">Tickers</Label>
            <p className="text-[10px] leading-snug text-muted-foreground">
              Filter by specific market tickers. Comma-separated list of market tickers to retrieve.
            </p>
            <MarketTickerSearch
              value={value.tickers || ""}
              onChange={(v) => patch({ tickers: v })}
              disabled={disabled || locks.disableTickers}
              dataSource="live"
              showCutoffNotes={false}
              required={false}
            />
          </div>
        </>
      )}

      {!historical ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <DiscoveryDateRangeField
            label="Created Date"
            description="Filter markets created within this date range."
            minTs={value.minCreatedTs ?? ""}
            maxTs={value.maxCreatedTs ?? ""}
            onRangeChange={(min, max) => patch({ minCreatedTs: min, maxCreatedTs: max })}
            disabled={disabled || locks.disableCreated}
            fromDate={cutoffMode === "live" ? cutoffDate : null}
            toDate={cutoffMode === "historical" ? cutoffDate : null}
          />
          <DiscoverySingleDateField
            label="Updated After"
            description="Return markets with metadata updated later than this Unix timestamp. Tracks non-trading changes only."
            value={value.minUpdatedTs ?? ""}
            onChange={setUpdatedAfter}
            disabled={disabled || locks.disableUpdated}
            fromDate={cutoffMode === "live" ? cutoffDate : null}
            toDate={cutoffMode === "historical" ? cutoffDate : null}
          />
          <DiscoveryDateRangeField
            label="Close Date"
            description="Filter items that closed within this date range"
            minTs={value.minCloseTs ?? ""}
            maxTs={value.maxCloseTs ?? ""}
            onRangeChange={(min, max) => patch({ minCloseTs: min, maxCloseTs: max })}
            disabled={disabled || locks.disableClose}
            fromDate={cutoffMode === "live" ? cutoffDate : null}
            toDate={cutoffMode === "historical" ? cutoffDate : null}
          />
          <DiscoveryDateRangeField
            label="Settled Date"
            description="Filter items that settled within this date range"
            minTs={value.minSettledTs ?? ""}
            maxTs={value.maxSettledTs ?? ""}
            onRangeChange={(min, max) => patch({ minSettledTs: min, maxSettledTs: max })}
            disabled={disabled || locks.disableSettled}
            fromDate={cutoffMode === "live" ? cutoffDate : null}
            toDate={cutoffMode === "historical" ? cutoffDate : null}
          />
        </div>
      ) : normalizeKalshiHistoricalV2MarketsDiscoveryScope(value.tickerScope) === "general" ? (
        <div className="flex max-w-md items-start gap-2">
          <Checkbox
            id="historical-markets-mve-exclude"
            checked={isKalshiHistoricalV2MveExcluded(value.mveFilter)}
            disabled={disabled}
            onCheckedChange={(checked) =>
              patch({
                mveFilter: checked ? KALSHI_LIVE_MVE_FILTER_EXCLUDE : "include",
              })
            }
          />
          <div className="min-w-0 space-y-0.5">
            <Label
              htmlFor="historical-markets-mve-exclude"
              className="text-[11px] font-medium leading-snug text-foreground"
            >
              Exclude multivariate events
            </Label>
            <p className="text-[10px] leading-snug text-muted-foreground">
              Uncheck to include multivariate events. Checked excludes them from discovery.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
