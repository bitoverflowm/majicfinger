"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar as CalendarIcon, X } from "lucide-react";

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
import { useMyStateV2 } from "@/context/stateContextV2";
import {
  formatForecastPercentilePct,
  KALSHI_LIVE_EVENT_FORECAST_DEFAULT_PERCENTILE_PCTS,
  KALSHI_LIVE_EVENT_FORECAST_MAX_PERCENTILES,
  KALSHI_LIVE_EVENT_FORECAST_PERIOD_OPTIONS,
  KALSHI_LIVE_EVENT_FORECAST_PERCENTILE_PRESETS,
  normalizeForecastDisplayPcts,
} from "@/lib/kalshiLive/eventForecastColumns";
import {
  clampEventForecastWindow,
  formatKalshiEventForecastCalendarWindowMessage,
  maxKalshiEventForecastInclusiveDays,
} from "@/lib/kalshiLive/eventForecastCompose";
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

function pctListsEqual(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  return a.every((v, i) => Math.abs(Number(v) - Number(b[i])) < 1e-6);
}

/**
 * Common queries for Event Forecast: date range, period interval (incl. 5s), percentiles.
 *
 * @param {{ className?: string; disabled?: boolean }} props
 */
export function KalshiLiveEventForecastCommonQueries({ className, disabled = false }) {
  const ctx = useMyStateV2() ?? {};
  const {
    connectKalshiLiveWhereFilters = [],
    setConnectKalshiLiveWhereFilters,
    connectKalshiLiveEventForecastPercentilePcts,
    setConnectKalshiLiveEventForecastPercentilePcts,
  } = ctx;

  const [rangeOpen, setRangeOpen] = useState(false);
  const [draftRange, setDraftRange] = useState(undefined);
  const [customPctDraft, setCustomPctDraft] = useState("");

  const periodRaw = readFilterValue(connectKalshiLiveWhereFilters, "period_interval");
  const periodValue = [0, 1, 60, 1440].includes(Number(periodRaw))
    ? Number(periodRaw)
    : DEFAULT_PERIOD;

  const startSec = Number(readFilterValue(connectKalshiLiveWhereFilters, "start_ts"));
  const endSec = Number(readFilterValue(connectKalshiLiveWhereFilters, "end_ts"));
  const committedFrom = Number.isFinite(startSec) ? dateFromUnix(startSec) : undefined;
  const committedTo = Number.isFinite(endSec) ? dateFromUnix(endSec) : undefined;

  const committedRange = useMemo(
    () => ({
      from: committedFrom ? startOfLocalDay(committedFrom) : undefined,
      to: committedTo ? startOfLocalDay(committedTo) : undefined,
    }),
    [committedFrom, committedTo],
  );

  // Seed defaults once (last 24h, 1 hour buckets) if missing.
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
      if (![0, 1, 60, 1440].includes(Number(readFilterValue(next, "period_interval")))) {
        next = upsertApiFilter(next, "period_interval", DEFAULT_PERIOD);
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [setConnectKalshiLiveWhereFilters]);

  const calendarSelected = draftRange !== undefined ? draftRange : committedRange;
  const maxInclusiveDays = maxKalshiEventForecastInclusiveDays(periodValue);
  const calendarWindowMessage =
    formatKalshiEventForecastCalendarWindowMessage(periodValue) ||
    (Number.isFinite(maxInclusiveDays) && maxInclusiveDays > 1
      ? `At this interval, the range can cover at most ${maxInclusiveDays} calendar days.`
      : "");

  const percentilePcts = useMemo(
    () =>
      normalizeForecastDisplayPcts(
        connectKalshiLiveEventForecastPercentilePcts ??
          KALSHI_LIVE_EVENT_FORECAST_DEFAULT_PERCENTILE_PCTS,
      ),
    [connectKalshiLiveEventForecastPercentilePcts],
  );

  const setPercentiles = useCallback(
    (next) => {
      setConnectKalshiLiveEventForecastPercentilePcts?.(normalizeForecastDisplayPcts(next));
    },
    [setConnectKalshiLiveEventForecastPercentilePcts],
  );

  const handlePeriodChange = useCallback(
    (nextValue) => {
      const nextPeriod = Number(nextValue);
      if (![0, 1, 60, 1440].includes(nextPeriod)) return;

      setConnectKalshiLiveWhereFilters?.((prev) => {
        let next = upsertApiFilter(prev, "period_interval", nextPeriod);
        const curStart = Number(readFilterValue(next, "start_ts"));
        const curEnd = Number(readFilterValue(next, "end_ts"));
        if (Number.isFinite(curStart) && Number.isFinite(curEnd)) {
          const clamped = clampEventForecastWindow(curStart, curEnd, nextPeriod);
          next = upsertApiFilter(next, "start_ts", clamped.start_ts);
          next = upsertApiFilter(next, "end_ts", clamped.end_ts);
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
        const clamped = clampEventForecastWindow(fromSec, toSec, periodValue);
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
    [periodValue, setConnectKalshiLiveWhereFilters],
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
      if (day > today) return true;

      const pickingEnd = Boolean(draftRange?.from && !draftRange?.to);
      if (pickingEnd && Number.isFinite(maxInclusiveDays)) {
        const anchor = startOfLocalDay(draftRange.from);
        const minDay = addLocalDays(anchor, -(maxInclusiveDays - 1));
        const maxDay = addLocalDays(anchor, maxInclusiveDays - 1);
        if (day < minDay || day > maxDay) return true;
      }
      return false;
    },
    [draftRange, maxInclusiveDays],
  );

  const removePct = useCallback(
    (pct) => {
      setPercentiles(percentilePcts.filter((p) => Math.abs(Number(p) - Number(pct)) >= 1e-6));
    },
    [percentilePcts, setPercentiles],
  );

  const addCustomPct = useCallback(() => {
    const cleaned = String(customPctDraft || "").replace(/%/g, "").trim();
    const n = Number(cleaned);
    if (!Number.isFinite(n) || n < 0 || n > 99.99) return;
    if (percentilePcts.length >= KALSHI_LIVE_EVENT_FORECAST_MAX_PERCENTILES) return;
    setPercentiles([...percentilePcts, n]);
    setCustomPctDraft("");
  }, [customPctDraft, percentilePcts, setPercentiles]);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="space-y-2">
        <h2 className="text-xs font-semibold tracking-tight text-foreground">Common queries</h2>
        <p className="text-[11px] leading-snug text-muted-foreground">
          Time window and bucket size for forecast history (
          <span className="font-mono text-[10px]">start_ts</span>,{" "}
          <span className="font-mono text-[10px]">end_ts</span>,{" "}
          <span className="font-mono text-[10px]">period_interval</span>).
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
                    {formatRangeLabel(committedFrom, committedTo)}
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
                      calendarSelected?.from || calendarSelected?.to || undefined
                    }
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
                {KALSHI_LIVE_EVENT_FORECAST_PERIOD_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={String(opt.value)} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="space-y-2 border-t border-border/40 pt-3">
        <h2 className="text-xs font-semibold tracking-tight text-foreground">Percentiles</h2>
        <p className="text-[11px] leading-snug text-muted-foreground">
          Which points on the forecast distribution to pull (max{" "}
          {KALSHI_LIVE_EVENT_FORECAST_MAX_PERCENTILES}). Think of them as &quot;where does the
          market put the Xth percentile of the outcome?&quot; — e.g. 50% is the median forecast;
          10% and 90% sketch the lower/upper band. Default is an even spread across the
          distribution.
        </p>

        <div className="flex flex-wrap gap-1.5">
          {KALSHI_LIVE_EVENT_FORECAST_PERCENTILE_PRESETS.map((preset) => {
            const active = pctListsEqual(
              normalizeForecastDisplayPcts(preset.pcts),
              percentilePcts,
            );
            return (
              <Button
                key={preset.id}
                type="button"
                size="sm"
                variant={active ? "secondary" : "outline"}
                disabled={disabled}
                className="h-7 px-2 text-[10px]"
                onClick={() => setPercentiles(preset.pcts)}
              >
                {preset.label}
              </Button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {percentilePcts.map((pct) => (
            <span
              key={String(pct)}
              className="inline-flex items-center gap-0.5 rounded-md border border-border/60 bg-muted/30 px-1.5 py-0.5 text-[11px] tabular-nums"
            >
              {formatForecastPercentilePct(pct)}
              <button
                type="button"
                disabled={disabled || percentilePcts.length <= 1}
                className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
                aria-label={`Remove ${formatForecastPercentilePct(pct)}`}
                onClick={() => removePct(pct)}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>

        <div className="flex max-w-xs items-center gap-2">
          <Input
            value={customPctDraft}
            disabled={
              disabled || percentilePcts.length >= KALSHI_LIVE_EVENT_FORECAST_MAX_PERCENTILES
            }
            placeholder="Add % (0–99.99)"
            inputMode="decimal"
            className="h-8 text-xs"
            onChange={(e) => setCustomPctDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustomPct();
              }
            }}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={
              disabled || percentilePcts.length >= KALSHI_LIVE_EVENT_FORECAST_MAX_PERCENTILES
            }
            className="h-8 shrink-0 text-xs"
            onClick={addCustomPct}
          >
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}
