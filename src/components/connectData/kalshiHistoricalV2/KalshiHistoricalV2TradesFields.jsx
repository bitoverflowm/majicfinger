"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarIcon } from "lucide-react";

import { MarketTickerSearch } from "@/components/connectData/MarketTickerSearch";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useMyStateV2 } from "@/context/stateContextV2";
import { useKalshiHistoricalCutoffDisplay } from "@/hooks/useKalshiHistoricalCutoffDisplay";
import { cn } from "@/lib/utils";

function genFilterId(column) {
  return `khv2-tw-${column}-${Date.now().toString(36)}`;
}

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

function unixFromDate(d) {
  if (!d) return null;
  const sec = Math.floor(d.getTime() / 1000);
  return Number.isFinite(sec) ? sec : null;
}

function dateFromUnix(unix) {
  const n = Number(unix);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return new Date(n * 1000);
}

/**
 * @param {unknown[]} filters
 * @param {string} column
 */
function readFilterValue(filters, column) {
  const f = (Array.isArray(filters) ? filters : []).find((row) => row?.column === column);
  return f?.value;
}

/**
 * @param {unknown[]} prev
 * @param {string} column
 * @param {number} value
 */
function upsertApiFilter(prev, column, value) {
  const list = Array.isArray(prev) ? [...prev] : [];
  const idx = list.findIndex((f) => f?.column === column);
  if (idx >= 0) {
    list[idx] = { ...list[idx], op: "eq", value };
    return list;
  }
  list.push({
    id: genFilterId(column),
    column,
    op: "eq",
    value,
    categoryOtherText: "",
  });
  return list;
}

/**
 * @param {unknown[]} prev
 * @param {string} column
 */
function removeApiFilter(prev, column) {
  return (Array.isArray(prev) ? prev : []).filter((f) => f?.column !== column);
}

function formatRangeLabel(from, to) {
  const fmt = (d) =>
    d
      ? d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
      : null;
  const a = fmt(from);
  const b = fmt(to);
  if (a && b) return `${a} – ${b}`;
  if (a) return `${a} – …`;
  if (b) return `… – ${b}`;
  return "Optional — pick start and end dates";
}

/**
 * Historical v2 trades: optional multi-ticker search, optional date range (≤ cutoff),
 * and include-block-trades flag.
 *
 * @param {{
 *   className?: string;
 *   disabled?: boolean;
 * }} props
 */
export function KalshiHistoricalV2TradesFields({ className, disabled = false }) {
  const ctx = useMyStateV2() ?? {};
  const {
    connectKalshiLiveTradesTicker = "",
    setConnectKalshiLiveTradesTicker,
    setConnectKalshiLiveTradesTickerMeta,
    connectKalshiLiveWhereFilters = [],
    setConnectKalshiLiveWhereFilters,
    connectKalshiHistoricalV2TradesIncludeBlockTrades = true,
    setConnectKalshiHistoricalV2TradesIncludeBlockTrades,
  } = ctx;

  const [cutoffDate, setCutoffDate] = useState(/** @type {Date | null} */ (null));
  const [rangeOpen, setRangeOpen] = useState(false);
  const [draftRange, setDraftRange] = useState(
    /** @type {{ from?: Date; to?: Date } | undefined} */ (undefined),
  );

  const { cutoffIso } = useKalshiHistoricalCutoffDisplay();

  useEffect(() => {
    if (!cutoffIso) return;
    const d = new Date(String(cutoffIso).trim());
    if (Number.isNaN(d.getTime())) return;
    setCutoffDate(startOfLocalDay(d));
  }, [cutoffIso]);

  const minTs = Number(readFilterValue(connectKalshiLiveWhereFilters, "min_ts"));
  const maxTs = Number(readFilterValue(connectKalshiLiveWhereFilters, "max_ts"));

  const committedRange = useMemo(
    () => ({
      from: dateFromUnix(minTs),
      to: dateFromUnix(maxTs),
    }),
    [minTs, maxTs],
  );

  useEffect(() => {
    if (rangeOpen) return;
    setDraftRange({
      from: committedRange.from ? startOfLocalDay(committedRange.from) : undefined,
      to: committedRange.to ? startOfLocalDay(committedRange.to) : undefined,
    });
  }, [committedRange.from, committedRange.to, rangeOpen]);

  const commitRange = useCallback(
    (fromDay, toDay) => {
      let from = fromDay ? startOfLocalDay(fromDay) : null;
      let to = toDay ? startOfLocalDay(toDay) : null;
      if (from && to && from > to) {
        const tmp = from;
        from = to;
        to = tmp;
      }

      if (cutoffDate) {
        if (from && from > cutoffDate) from = cutoffDate;
        if (to && to > cutoffDate) to = cutoffDate;
      }

      const fromSec = unixFromDate(from ? startOfLocalDay(from) : null);
      let toSec = unixFromDate(to ? endOfLocalDay(to) : null);
      if (toSec != null && cutoffDate) {
        const cutoffEnd = unixFromDate(endOfLocalDay(cutoffDate));
        if (cutoffEnd != null && toSec > cutoffEnd) toSec = cutoffEnd;
      }

      setConnectKalshiLiveWhereFilters?.((prev) => {
        let nextFilters = Array.isArray(prev) ? prev : [];
        nextFilters = removeApiFilter(nextFilters, "min_ts");
        nextFilters = removeApiFilter(nextFilters, "max_ts");
        if (fromSec != null) nextFilters = upsertApiFilter(nextFilters, "min_ts", fromSec);
        if (toSec != null) nextFilters = upsertApiFilter(nextFilters, "max_ts", toSec);
        return nextFilters;
      });

      setDraftRange({
        from: fromSec != null ? startOfLocalDay(dateFromUnix(fromSec)) : undefined,
        to: toSec != null ? startOfLocalDay(dateFromUnix(toSec)) : undefined,
      });
      setRangeOpen(false);
    },
    [cutoffDate, setConnectKalshiLiveWhereFilters],
  );

  const clearRange = useCallback(() => {
    setConnectKalshiLiveWhereFilters?.((prev) => {
      let next = removeApiFilter(prev, "min_ts");
      next = removeApiFilter(next, "max_ts");
      return next;
    });
    setDraftRange(undefined);
    setRangeOpen(false);
  }, [setConnectKalshiLiveWhereFilters]);

  const handleRangeSelect = useCallback(
    (next) => {
      if (!next?.from) {
        setDraftRange(undefined);
        return;
      }
      if (next.from && !next.to) {
        setDraftRange({ from: startOfLocalDay(next.from), to: undefined });
        return;
      }
      commitRange(next.from, next.to);
    },
    [commitRange],
  );

  const isDayDisabled = useCallback(
    (date) => {
      const day = startOfLocalDay(date);
      if (cutoffDate && day > cutoffDate) return true;
      return false;
    },
    [cutoffDate],
  );

  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-2">
        <h2 className="text-xs font-semibold tracking-tight text-foreground">
          Market tickers (optional)
        </h2>
        <p className="text-[11px] leading-snug text-muted-foreground">
          Leave empty to pull across markets. With multiple tickers, each market&apos;s trades land
          in its own sheet. Without tickers or a date range, we cap the pull at 1,000 trades.
        </p>
        <div className="space-y-2 rounded-lg bg-muted/10 p-3">
          <MarketTickerSearch
            value={connectKalshiLiveTradesTicker}
            onChange={(v) => setConnectKalshiLiveTradesTicker?.(v)}
            disabled={disabled}
            dataSource="historical"
            historyEntity="trades"
            required={false}
            onSelectionsChange={(selections) => {
              const next = {};
              for (const s of selections || []) {
                const ticker = String(s?.ticker || "").trim().toUpperCase();
                if (!ticker) continue;
                next[ticker] = String(s?.title || ticker).trim() || ticker;
              }
              setConnectKalshiLiveTradesTickerMeta?.(next);
            }}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <h2 className="text-xs font-semibold tracking-tight text-foreground">Date range</h2>
        <p className="text-[10px] leading-snug text-muted-foreground">
          Optional. Maps to <span className="font-mono">min_ts</span> /{" "}
          <span className="font-mono">max_ts</span>. Dates on or before the Kalshi Live Data Feed
          cutoff only.
        </p>
        <Popover open={rangeOpen} onOpenChange={setRangeOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              className="h-9 w-full justify-start px-2.5 text-left text-xs font-normal sm:max-w-md"
            >
              <CalendarIcon className="mr-2 h-3.5 w-3.5 shrink-0 opacity-70" />
              <span
                className={cn(
                  "truncate",
                  !(committedRange.from || committedRange.to) && "text-muted-foreground",
                )}
              >
                {formatRangeLabel(committedRange.from, committedRange.to)}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto max-w-[calc(100vw-2rem)] p-3" align="start">
            <Calendar
              mode="range"
              numberOfMonths={1}
              selected={draftRange}
              toDate={cutoffDate || undefined}
              disabled={isDayDisabled}
              onSelect={handleRangeSelect}
            />
            {committedRange.from || committedRange.to ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-2 h-7 w-full text-[10px]"
                disabled={disabled}
                onClick={clearRange}
              >
                Clear dates
              </Button>
            ) : null}
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex max-w-md items-start gap-2">
        <Checkbox
          id="historical-v2-include-block-trades"
          checked={!!connectKalshiHistoricalV2TradesIncludeBlockTrades}
          disabled={disabled}
          onCheckedChange={(checked) =>
            setConnectKalshiHistoricalV2TradesIncludeBlockTrades?.(!!checked)
          }
        />
        <div className="min-w-0 space-y-0.5">
          <Label
            htmlFor="historical-v2-include-block-trades"
            className="text-[11px] font-medium leading-snug text-foreground"
          >
            Include block trades
          </Label>
          <p className="text-[10px] leading-snug text-muted-foreground">
            Uncheck to return only non-block (order book) trades.
          </p>
        </div>
      </div>
    </div>
  );
}
