"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useMyStateV2 } from "@/context/stateContextV2";
import { cn } from "@/lib/utils";

const DEFAULT_RANGE_SEC = 24 * 60 * 60;

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
 * Upsert min_ts / max_ts Where filters used by the trades pull.
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
 * Common queries for Get Trades: date range → min_ts / max_ts (field names not shown).
 * Same date-picker modality as candlesticks; one range applies to all selected markets.
 *
 * @param {{ className?: string; disabled?: boolean }} props
 */
export function KalshiLiveTradesCommonQueries({ className, disabled = false }) {
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

  const minTs = Number(readFilterValue(connectKalshiLiveWhereFilters, "min_ts"));
  const maxTs = Number(readFilterValue(connectKalshiLiveWhereFilters, "max_ts"));

  const committedRange = useMemo(
    () => ({
      from: dateFromUnix(minTs),
      to: dateFromUnix(maxTs),
    }),
    [minTs, maxTs],
  );

  const calendarSelected = draftRange ?? committedRange;

  // Seed defaults once (last 24h) if missing.
  useEffect(() => {
    if (!setConnectKalshiLiveWhereFilters) return;
    const now = Math.floor(Date.now() / 1000);
    setConnectKalshiLiveWhereFilters((prev) => {
      let next = Array.isArray(prev) ? prev : [];
      let changed = false;
      if (!Number.isFinite(Number(readFilterValue(next, "min_ts")))) {
        next = upsertApiFilter(next, "min_ts", now - DEFAULT_RANGE_SEC);
        changed = true;
      }
      if (!Number.isFinite(Number(readFilterValue(next, "max_ts")))) {
        next = upsertApiFilter(next, "max_ts", now);
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
    if (Number.isFinite(minTs) && minTs < minSec) {
      setConnectKalshiLiveWhereFilters((prev) => upsertApiFilter(prev, "min_ts", minSec));
    }
  }, [cutoffDate, minTs, setConnectKalshiLiveWhereFilters]);

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

      setConnectKalshiLiveWhereFilters?.((prev) => {
        let nextFilters = Array.isArray(prev) ? prev : [];
        if (fromSec != null) nextFilters = upsertApiFilter(nextFilters, "min_ts", fromSec);
        if (toSec != null) nextFilters = upsertApiFilter(nextFilters, "max_ts", toSec);
        return nextFilters;
      });

      setDraftRange({
        from: fromSec != null ? startOfLocalDay(dateFromUnix(fromSec)) : undefined,
        to: toSec != null ? startOfLocalDay(dateFromUnix(toSec)) : undefined,
      });
    },
    [cutoffDate, setConnectKalshiLiveWhereFilters],
  );

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
      const today = startOfLocalDay(new Date());
      if (cutoffDate && day < cutoffDate) return true;
      if (day > today) return true;
      return false;
    },
    [cutoffDate],
  );

  return (
    <div className={cn("space-y-2", className)}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-[11px] font-medium text-muted-foreground">Date range</Label>
          <Popover open={rangeOpen} onOpenChange={handleRangeOpenChange}>
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
              <div className="max-w-[17.5rem] border-t border-border/50 px-3 py-2">
                <p className="text-[10px] leading-snug text-muted-foreground">
                  Live trades cannot be pulled before the historical cutoff. Markets with different
                  open/close windows still share this one date range.
                </p>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}
