"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMyStateV2 } from "@/context/stateContextV2";
import {
  clampCandlestickWindowToKalshiCap,
  formatKalshiCandlestickCalendarWindowMessage,
  maxKalshiCandlestickInclusiveDays,
} from "@/lib/kalshiLive/candlestickCompose";
import { KALSHI_LIVE_CANDLESTICK_PERIOD_OPTIONS } from "@/lib/kalshiLive/candlesticksColumns";
import { cn } from "@/lib/utils";

const DEFAULT_RANGE_SEC = 24 * 60 * 60;
const DEFAULT_PERIOD = 60;

function genFilterId(column) {
  return `klw-${column}-${Date.now().toString(36)}`;
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

function addLocalDays(d, n) {
  const x = startOfLocalDay(d);
  x.setDate(x.getDate() + n);
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
 * Upsert start_ts / end_ts / period_interval Where filters used by the candlestick pull.
 *
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
  return "Pick start and end dates";
}

/**
 * Common queries for Get Market Candlesticks: date range → start_ts/end_ts, period_interval.
 *
 * @param {{ className?: string; disabled?: boolean }} props
 */
export function KalshiLiveCandlestickCommonQueries({ className, disabled = false }) {
  const ctx = useMyStateV2() ?? {};
  const {
    connectKalshiLiveWhereFilters = [],
    setConnectKalshiLiveWhereFilters,
  } = ctx;

  const [cutoffDate, setCutoffDate] = useState(/** @type {Date | null} */ (null));
  const [rangeOpen, setRangeOpen] = useState(false);
  const [draftRange, setDraftRange] = useState(
    /** @type {{ from?: Date; to?: Date } | undefined} */ (undefined),
  );

  const startTs = Number(readFilterValue(connectKalshiLiveWhereFilters, "start_ts"));
  const endTs = Number(readFilterValue(connectKalshiLiveWhereFilters, "end_ts"));
  const periodInterval = Number(readFilterValue(connectKalshiLiveWhereFilters, "period_interval"));

  const periodValue = [1, 60, 1440].includes(periodInterval)
    ? periodInterval
    : DEFAULT_PERIOD;

  const committedRange = useMemo(
    () => ({
      from: dateFromUnix(startTs),
      to: dateFromUnix(endTs),
    }),
    [startTs, endTs],
  );

  const calendarSelected = draftRange ?? committedRange;
  const maxInclusiveDays = maxKalshiCandlestickInclusiveDays(periodValue);
  const calendarWindowMessage = formatKalshiCandlestickCalendarWindowMessage(periodValue);

  // Seed defaults once (last 24h, 1 hour candles) if missing.
  useEffect(() => {
    if (!setConnectKalshiLiveWhereFilters) return;
    const now = Math.floor(Date.now() / 1000);
    setConnectKalshiLiveWhereFilters((prev) => {
      let next = Array.isArray(prev) ? prev : [];
      let changed = false;
      if (!Number.isFinite(Number(readFilterValue(next, "start_ts")))) {
        next = upsertApiFilter(next, "start_ts", now - DEFAULT_RANGE_SEC);
        changed = true;
      }
      if (!Number.isFinite(Number(readFilterValue(next, "end_ts")))) {
        next = upsertApiFilter(next, "end_ts", now);
        changed = true;
      }
      if (![1, 60, 1440].includes(Number(readFilterValue(next, "period_interval")))) {
        next = upsertApiFilter(next, "period_interval", DEFAULT_PERIOD);
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [setConnectKalshiLiveWhereFilters]);

  // Historical cutoff — live data cannot start before this.
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
        if (!Number.isNaN(d.getTime())) {
          setCutoffDate(startOfLocalDay(d));
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
      }
    })();
    return () => ac.abort();
  }, []);

  // If a stored start is before cutoff, clamp it.
  useEffect(() => {
    if (!cutoffDate || !setConnectKalshiLiveWhereFilters) return;
    const minSec = unixFromDate(cutoffDate);
    if (minSec == null) return;
    if (Number.isFinite(startTs) && startTs < minSec) {
      setConnectKalshiLiveWhereFilters((prev) => upsertApiFilter(prev, "start_ts", minSec));
    }
  }, [cutoffDate, startTs, setConnectKalshiLiveWhereFilters]);

  // Keep window under Kalshi's 5000-candle cap when period/range would exceed it.
  useEffect(() => {
    if (!setConnectKalshiLiveWhereFilters) return;
    if (![1, 60, 1440].includes(periodInterval)) return;
    if (!Number.isFinite(startTs) || !Number.isFinite(endTs)) return;
    const { start_ts: nextStart, clamped } = clampCandlestickWindowToKalshiCap(
      startTs,
      endTs,
      periodInterval,
    );
    if (!clamped || nextStart === startTs) return;
    setConnectKalshiLiveWhereFilters((prev) => upsertApiFilter(prev, "start_ts", nextStart));
  }, [startTs, endTs, periodInterval, setConnectKalshiLiveWhereFilters]);

  const handlePeriodChange = useCallback(
    (raw) => {
      const period = Number(raw);
      if (![1, 60, 1440].includes(period)) return;
      setConnectKalshiLiveWhereFilters?.((prev) => {
        let next = upsertApiFilter(prev, "period_interval", period);
        const start = Number(readFilterValue(next, "start_ts"));
        const end = Number(readFilterValue(next, "end_ts"));
        if (Number.isFinite(start) && Number.isFinite(end)) {
          const { start_ts: nextStart, clamped } = clampCandlestickWindowToKalshiCap(
            start,
            end,
            period,
          );
          if (clamped) next = upsertApiFilter(next, "start_ts", nextStart);
        }
        return next;
      });
      setDraftRange(undefined);
    },
    [setConnectKalshiLiveWhereFilters],
  );

  const handleRangeOpenChange = useCallback(
    (open) => {
      setRangeOpen(open);
      if (open) {
        setDraftRange({
          from: committedRange.from ? startOfLocalDay(committedRange.from) : undefined,
          to: committedRange.to ? startOfLocalDay(committedRange.to) : undefined,
        });
      } else {
        setDraftRange(undefined);
      }
    },
    [committedRange.from, committedRange.to],
  );

  const commitRange = useCallback(
    (from, to) => {
      let fromDay = from ? startOfLocalDay(from) : null;
      let toDay = to ? startOfLocalDay(to) : fromDay;

      if (cutoffDate && fromDay && fromDay < cutoffDate) fromDay = new Date(cutoffDate);
      if (cutoffDate && toDay && toDay < cutoffDate) toDay = new Date(cutoffDate);

      const today = startOfLocalDay(new Date());
      if (toDay && toDay > today) toDay = today;
      if (fromDay && fromDay > today) fromDay = today;

      if (fromDay && toDay && fromDay > toDay) {
        const tmp = fromDay;
        fromDay = toDay;
        toDay = tmp;
      }

      let fromSec = unixFromDate(fromDay ? startOfLocalDay(fromDay) : null);
      let toSec = unixFromDate(toDay ? endOfLocalDay(toDay) : null);
      if (toSec != null) {
        const nowSec = Math.floor(Date.now() / 1000);
        if (toSec > nowSec) toSec = nowSec;
      }

      if (fromSec != null && toSec != null) {
        const clamped = clampCandlestickWindowToKalshiCap(fromSec, toSec, periodValue);
        fromSec = clamped.start_ts;
        toSec = clamped.end_ts;
      }

      setConnectKalshiLiveWhereFilters?.((prev) => {
        let nextFilters = Array.isArray(prev) ? prev : [];
        if (fromSec != null) nextFilters = upsertApiFilter(nextFilters, "start_ts", fromSec);
        if (toSec != null) nextFilters = upsertApiFilter(nextFilters, "end_ts", toSec);
        return nextFilters;
      });

      setDraftRange({
        from: fromSec != null ? startOfLocalDay(dateFromUnix(fromSec)) : undefined,
        to: toSec != null ? startOfLocalDay(dateFromUnix(toSec)) : undefined,
      });
    },
    [cutoffDate, periodValue, setConnectKalshiLiveWhereFilters],
  );

  const handleRangeSelect = useCallback(
    (next) => {
      if (!next?.from) {
        setDraftRange(undefined);
        return;
      }

      // First click: keep incomplete range so we can disable days outside the candle window.
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
      const today = startOfLocalDay(new Date());
      if (cutoffDate && day < cutoffDate) return true;
      if (day > today) return true;

      // While choosing the end date, lock selection to Kalshi's max candle window.
      const pickingEnd = Boolean(draftRange?.from && !draftRange?.to);
      if (pickingEnd && Number.isFinite(maxInclusiveDays)) {
        const anchor = startOfLocalDay(draftRange.from);
        const minDay = addLocalDays(anchor, -(maxInclusiveDays - 1));
        const maxDay = addLocalDays(anchor, maxInclusiveDays - 1);
        if (day < minDay || day > maxDay) return true;
      }

      return false;
    },
    [cutoffDate, draftRange, maxInclusiveDays],
  );

  return (
    <div className={cn("space-y-2", className)}>
      <h2 className="text-xs font-semibold tracking-tight text-foreground">Common queries</h2>
      <p className="text-[11px] leading-snug text-muted-foreground">
        Set the candlestick time range and interval sent to Kalshi as{" "}
        <span className="font-mono text-[10px]">start_ts</span>,{" "}
        <span className="font-mono text-[10px]">end_ts</span>, and{" "}
        <span className="font-mono text-[10px]">period_interval</span>.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-[11px] font-medium text-muted-foreground">Date range</Label>
          <Popover open={rangeOpen} onOpenChange={handleRangeOpenChange}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                disabled={disabled}
                className="h-9 w-full justify-start px-2.5 text-left text-xs font-normal"
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
            <PopoverContent className="w-auto max-w-[calc(100vw-2rem)] p-0" align="start">
              <div className="w-fit">
                <Calendar
                  mode="range"
                  numberOfMonths={1}
                  selected={calendarSelected}
                  onSelect={handleRangeSelect}
                  defaultMonth={
                    calendarSelected?.from ||
                    calendarSelected?.to ||
                    cutoffDate ||
                    undefined
                  }
                  fromDate={cutoffDate || undefined}
                  toDate={new Date()}
                  disabled={isDayDisabled}
                />
              </div>
              {calendarWindowMessage ? (
                <div className="max-w-[17.5rem] border-t border-border/50 px-3 py-2">
                  <p className="text-[10px] leading-snug text-muted-foreground">
                    {calendarWindowMessage}
                  </p>
                </div>
              ) : null}
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] font-medium text-muted-foreground">Period interval</Label>
          <Select
            value={String(periodValue)}
            disabled={disabled}
            onValueChange={handlePeriodChange}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Interval" />
            </SelectTrigger>
            <SelectContent>
              {KALSHI_LIVE_CANDLESTICK_PERIOD_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={String(opt.value)} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
