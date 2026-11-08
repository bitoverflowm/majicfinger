"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { closeAt } from "./marketBrowseFeeds";
import { MarketBrowseTable } from "./marketBrowseTable";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const PREVIEWS = 2;

function dayKey(date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date, count) {
  return new Date(date.getFullYear(), date.getMonth() + count, 1);
}

/** Six weeks from the Sunday on or before the 1st, so every month draws the same height. */
function monthCells(month) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1 - month.getDay());
  return Array.from({ length: 42 }, (_, index) => new Date(first.getFullYear(), first.getMonth(), first.getDate() + index));
}

function sameDay(a, b) {
  return dayKey(a) === dayKey(b);
}

/**
 * Markets on the day they close. A resolved market sits on the day it resolved, a game on its
 * start, anything else on its end date. Picking a day lists its markets below the month.
 */
export function MarketBrowseCalendar({ markets, closedFeed, ...tableProps }) {
  const today = new Date();
  const [month, setMonth] = useState(() => startOfMonth(today));
  const [selected, setSelected] = useState(() => today);

  const { buckets, undated } = useMemo(() => {
    const map = new Map();
    let missing = 0;
    for (const market of markets) {
      const at = closeAt(market);
      if (!at) {
        missing += 1;
        continue;
      }
      const key = dayKey(new Date(at));
      const list = map.get(key);
      if (list) list.push(market);
      else map.set(key, [market]);
    }
    for (const list of map.values()) list.sort((a, b) => closeAt(a) - closeAt(b));
    return { buckets: map, undated: missing };
  }, [markets]);

  const cells = monthCells(month);
  const inMonth = cells.filter((date) => date.getMonth() === month.getMonth());
  const monthTotal = inMonth.reduce((sum, date) => sum + (buckets.get(dayKey(date))?.length || 0), 0);
  const busiest = Math.max(1, ...inMonth.map((date) => buckets.get(dayKey(date))?.length || 0));
  const dayMarkets = buckets.get(dayKey(selected)) || [];
  const monthLabel = month.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const selectedLabel = selected.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  const verb = closedFeed ? "resolved" : "close";

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-border/70 px-3 py-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => setMonth((value) => addMonths(value, -1))}
            className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ChevronLeft className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => setMonth((value) => addMonths(value, 1))}
            className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ChevronRight className="size-4" aria-hidden />
          </button>
        </div>
        <h3 className="text-[14px] font-semibold text-foreground">{monthLabel}</h3>
        <span className="text-[12px] tabular-nums text-muted-foreground">
          {monthTotal.toLocaleString()} {monthTotal === 1 ? "market" : "markets"} {closedFeed ? "resolved" : "closing"}
        </span>
        <button
          type="button"
          onClick={() => {
            setMonth(startOfMonth(new Date()));
            setSelected(new Date());
          }}
          className="ml-auto rounded-md border border-border/70 px-2.5 py-1 text-[12px] font-medium text-foreground hover:bg-muted"
        >
          Today
        </button>
      </div>

      <div role="grid" aria-label={`Markets by the day they ${verb}, ${monthLabel}`} className="grid grid-cols-7 border-b border-border/70">
        {WEEKDAYS.map((label) => (
          <div key={label} role="columnheader" className="border-b border-border/50 px-2 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </div>
        ))}
        {cells.map((date) => {
          const list = buckets.get(dayKey(date)) || [];
          const outside = date.getMonth() !== month.getMonth();
          const isToday = sameDay(date, today);
          const isSelected = sameDay(date, selected);
          const heat = list.length ? 0.04 + 0.16 * (Math.log(list.length + 1) / Math.log(busiest + 1)) : 0;
          return (
            <button
              key={dayKey(date)}
              type="button"
              role="gridcell"
              aria-selected={isSelected}
              aria-label={`${date.toLocaleDateString(undefined, { month: "long", day: "numeric" })}: ${list.length} markets`}
              onClick={() => {
                setSelected(date);
                if (outside) setMonth(startOfMonth(date));
              }}
              className={cn(
                "relative flex h-[104px] min-w-0 flex-col items-stretch gap-1 border-b border-r border-border/40 p-1.5 text-left transition-colors hover:bg-muted/50 [&:nth-child(7n)]:border-r-0",
                outside && "text-muted-foreground/50",
                isSelected && "z-[1] ring-2 ring-inset ring-[#0d99ff]",
              )}
              style={heat && !outside ? { backgroundColor: `rgb(13 153 255 / ${heat})` } : undefined}
            >
              <span className="flex items-center justify-between">
                <span
                  className={cn(
                    "inline-flex size-6 items-center justify-center rounded-full text-[12px] font-medium tabular-nums",
                    isToday && "bg-[#0d99ff] text-white",
                  )}
                >
                  {date.getDate()}
                </span>
                {list.length ? (
                  <span className={cn("text-[11px] font-semibold tabular-nums", outside ? "text-muted-foreground/50" : "text-foreground")}>
                    {list.length.toLocaleString()}
                  </span>
                ) : null}
              </span>
              {!outside
                ? list.slice(0, PREVIEWS).map((market) => (
                    <span key={market.conditionId} className="flex min-w-0 items-center gap-1 rounded bg-background/80 px-1 py-0.5 text-[10.5px] leading-tight text-foreground shadow-[0_0_0_1px_rgb(0_0_0/0.04)]">
                      {market.icon ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={market.icon} alt="" loading="lazy" className="size-3 shrink-0 rounded-sm object-cover" />
                      ) : null}
                      <span className="truncate">{market.question}</span>
                    </span>
                  ))
                : null}
              {!outside && list.length > PREVIEWS ? (
                <span className="px-1 text-[10.5px] text-muted-foreground">+{(list.length - PREVIEWS).toLocaleString()} more</span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="flex items-baseline gap-2 px-3 pb-2 pt-3">
        <h4 className="text-[13px] font-semibold text-foreground">{selectedLabel}</h4>
        <span className="text-[12px] tabular-nums text-muted-foreground">
          {dayMarkets.length.toLocaleString()} {dayMarkets.length === 1 ? "market" : "markets"} {verb}
          {sameDay(selected, today) || selected > today ? "" : closedFeed ? "" : " (past their end date, awaiting a result)"}
        </span>
        {undated ? <span className="ml-auto text-[11px] text-muted-foreground">{undated.toLocaleString()} without an end date aren&apos;t shown</span> : null}
      </div>
      <div className="border-t border-border/70">
        <MarketBrowseTable {...tableProps} markets={dayMarkets} height={420} resetKey={dayKey(selected)} empty={`No markets ${verb} on this day`} />
      </div>
    </div>
  );
}
