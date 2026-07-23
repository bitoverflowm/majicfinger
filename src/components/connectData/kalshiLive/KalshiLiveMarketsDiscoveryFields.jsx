"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarIcon } from "lucide-react";

import { MarketTickerSearch } from "@/components/connectData/MarketTickerSearch";
import { KalshiLiveTimestampPicker } from "@/components/connectData/kalshiLive/KalshiLiveTimestampPicker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import { KALSHI_LIVE_MARKET_STATUS_OPTIONS } from "@/lib/kalshiLive/marketsColumns";
import { cn } from "@/lib/utils";

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
}) {
  const selected = useMemo(() => {
    const from = dateFromUnix(minTs);
    const to = dateFromUnix(maxTs);
    if (!from && !to) return undefined;
    return { from, to };
  }, [minTs, maxTs]);

  return (
    <div className={cn("space-y-1.5", disabled && "opacity-60")}>
      <Label className="text-[11px] font-medium text-foreground">{label}</Label>
      <p className="text-[10px] leading-snug text-muted-foreground">{description}</p>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className="h-8 w-full max-w-md justify-start px-2 text-left text-[11px] font-normal"
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
            disabled={fromDate ? [{ before: fromDate }] : undefined}
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
 * Reusable Kalshi Live markets discovery filters (GET /markets list).
 * Controlled — wire to any parent state (Connect home, hubs, etc.).
 *
 * @param {{
 *   value: import("@/lib/kalshiLive/marketDiscovery").KalshiLiveMarketsDiscoveryParams;
 *   onChange: (next: import("@/lib/kalshiLive/marketDiscovery").KalshiLiveMarketsDiscoveryParams) => void;
 *   disabled?: boolean;
 *   className?: string;
 * }} props
 */
export function KalshiLiveMarketsDiscoveryFields({ value, onChange, disabled = false, className }) {
  const [cutoffDate, setCutoffDate] = useState(/** @type {Date | null} */ (null));

  useEffect(() => {
    const ac = new AbortController();
    void (async () => {
      try {
        const res = await fetch("/api/integrations/kalshi-live/historical/cutoff", {
          headers: { Accept: "application/json" },
          credentials: "same-origin",
          signal: ac.signal,
        });
        const data = await res.json().catch(() => ({}));
        if (ac.signal.aborted || !res.ok) return;
        const d = new Date(String(data?.market_settled_ts || "").trim());
        if (!Number.isNaN(d.getTime())) setCutoffDate(startOfLocalDay(d));
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
      }
    })();
    return () => ac.abort();
  }, []);

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
      {locks.note ? (
        <p className="rounded-md border border-border/60 bg-muted/20 px-2.5 py-2 text-[10px] leading-snug text-muted-foreground">
          {locks.note}
        </p>
      ) : null}

      {/* Status — first */}
      <div className={cn("space-y-1.5", locks.disableStatus && "opacity-60")}>
        <Label className="text-[11px] font-medium text-foreground">Status</Label>
        <Select
          value={value.status || "__any__"}
          disabled={disabled || locks.disableStatus}
          onValueChange={(v) => patch({ status: v === "__any__" ? "" : v })}
        >
          <SelectTrigger className="h-9 max-w-xs text-xs">
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

      {/* Multivariate Events */}
      <div className={cn("space-y-1.5", locks.disableMve && "opacity-60")}>
        <Label className="text-[11px] font-medium text-foreground">Multivariate Events</Label>
        <p className="text-[10px] leading-snug text-muted-foreground">
          Filter by multivariate events (combos). &apos;only&apos; returns only multivariate events,
          &apos;exclude&apos; excludes multivariate events.
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
          <SelectTrigger className="h-9 max-w-xs text-xs">
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
        <div className="rounded-lg border border-border/50 bg-background/60 p-2">
          <MarketTickerSearch
            value={value.seriesTicker || ""}
            onChange={(v) => patch({ seriesTicker: v })}
            disabled={disabled || locks.disableSeriesTicker}
            dataSource="live"
            searchScope="series"
            showCutoffNotes={false}
            maxTickers={1}
          />
        </div>
      </div>

      {/* Market tickers */}
      <div className={cn("space-y-1.5", locks.disableTickers && "opacity-60")}>
        <Label className="text-[11px] font-medium text-foreground">Tickers</Label>
        <p className="text-[10px] leading-snug text-muted-foreground">
          Filter by specific market tickers. Comma-separated list of market tickers to retrieve.
        </p>
        <div className="rounded-lg border border-border/50 bg-background/60 p-2">
          <MarketTickerSearch
            value={value.tickers || ""}
            onChange={(v) => patch({ tickers: v })}
            disabled={disabled || locks.disableTickers}
            dataSource="live"
            showCutoffNotes={false}
          />
        </div>
      </div>

      <DiscoveryDateRangeField
        label="Created Date"
        description="Filter markets created within this date range."
        minTs={value.minCreatedTs ?? ""}
        maxTs={value.maxCreatedTs ?? ""}
        onRangeChange={(min, max) => patch({ minCreatedTs: min, maxCreatedTs: max })}
        disabled={disabled || locks.disableCreated}
        fromDate={cutoffDate}
      />

      <div className={cn("space-y-1.5", locks.disableUpdated && "opacity-60")}>
        <Label className="text-[11px] font-medium text-foreground">Updated After</Label>
        <p className="text-[10px] leading-snug text-muted-foreground">
          Return markets with metadata updated later than this Unix timestamp. Tracks non-trading
          changes only.
        </p>
        <KalshiLiveTimestampPicker
          value={value.minUpdatedTs ?? ""}
          onChange={setUpdatedAfter}
          disabled={disabled || locks.disableUpdated}
          fromDate={cutoffDate || undefined}
          className="max-w-xs"
        />
      </div>

      <DiscoveryDateRangeField
        label="Close Date"
        description="Filter items that closed within this date range"
        minTs={value.minCloseTs ?? ""}
        maxTs={value.maxCloseTs ?? ""}
        onRangeChange={(min, max) => patch({ minCloseTs: min, maxCloseTs: max })}
        disabled={disabled || locks.disableClose}
        fromDate={cutoffDate}
      />

      <DiscoveryDateRangeField
        label="Settled Date"
        description="Filter items that settled within this date range"
        minTs={value.minSettledTs ?? ""}
        maxTs={value.maxSettledTs ?? ""}
        onRangeChange={(min, max) => patch({ minSettledTs: min, maxSettledTs: max })}
        disabled={disabled || locks.disableSettled}
        fromDate={cutoffDate}
      />
    </div>
  );
}
