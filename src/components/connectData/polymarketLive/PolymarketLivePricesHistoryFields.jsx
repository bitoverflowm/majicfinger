"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Loader2, X } from "lucide-react";
import moment from "moment-timezone";

import { PolymarketLiveMarketsListFilters } from "@/components/connectData/polymarketLive/PolymarketLiveMarketsListFilters";
import { PolymarketLiveSearch } from "@/components/connectData/polymarketLive/PolymarketLiveSearch";
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useMyStateV2 } from "@/context/stateContextV2";
import { normalizePolymarketMarketsComposeState } from "@/lib/polymarketLive/marketsCompose";
import {
  emptyPolymarketPricesHistoryComposeState,
  minimumPolymarketPricesHistoryFidelity,
  normalizePolymarketPricesHistoryComposeState,
  normalizePolymarketPricesHistoryFidelity,
  normalizePolymarketPricesHistoryInterval,
  normalizePolymarketPricesHistorySheetLayout,
  normalizePolymarketPricesHistoryWindowMode,
  POLYMARKET_PRICES_HISTORY_FIDELITY_OPTIONS,
  POLYMARKET_PRICES_HISTORY_INTERVAL_OPTIONS,
  POLYMARKET_PRICES_HISTORY_SHEET_LAYOUT_OPTIONS,
} from "@/lib/polymarketLive/pricesHistoryCompose";
import { cn } from "@/lib/utils";

const HISTORY_TZ = "America/New_York";

/**
 * @param {Date} date
 * @param {number} hour
 * @param {number} minute
 * @param {number} second
 */
function wallTimeToUnixSeconds(date, hour, minute, second) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const m = moment.tz(
    [date.getFullYear(), date.getMonth(), date.getDate(), hour, minute, second],
    HISTORY_TZ,
  );
  if (!m.isValid()) return "";
  return String(m.unix());
}

/**
 * @param {string} unix
 * @returns {Date | undefined}
 */
function dateFromUnixEastern(unix) {
  const n = Number(unix);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  const m = moment.unix(n).tz(HISTORY_TZ);
  return new Date(m.year(), m.month(), m.date());
}

/**
 * @param {{
 *   className?: string;
 *   disabled?: boolean;
 *   onSearchSubmitAll?: (suggestions: import("@/lib/polymarketLive/polymarketPublicSearch").PolymarketPublicSearchSuggestion[]) => void | Promise<void>;
 * }} props
 */
export function PolymarketLivePricesHistoryFields({
  className,
  disabled = false,
  onSearchSubmitAll,
}) {
  const ctx = useMyStateV2() ?? {};
  const {
    connectPolymarketLivePricesHistoryCompose,
    setConnectPolymarketLivePricesHistoryCompose,
  } = ctx;

  const composeRaw = connectPolymarketLivePricesHistoryCompose;
  const setCompose = setConnectPolymarketLivePricesHistoryCompose;

  const state = useMemo(
    () =>
      normalizePolymarketPricesHistoryComposeState(
        composeRaw || emptyPolymarketPricesHistoryComposeState(),
      ),
    [composeRaw],
  );

  const patch = useCallback(
    (partial) => {
      setCompose?.((prev) => {
        const cur = normalizePolymarketPricesHistoryComposeState(
          prev || emptyPolymarketPricesHistoryComposeState(),
        );
        return normalizePolymarketPricesHistoryComposeState({ ...cur, ...partial });
      });
    },
    [setCompose],
  );

  const patchMarketsFilters = useCallback(
    (partial) => {
      setCompose?.((prev) => {
        const cur = normalizePolymarketPricesHistoryComposeState(
          prev || emptyPolymarketPricesHistoryComposeState(),
        );
        return normalizePolymarketPricesHistoryComposeState({
          ...cur,
          marketsFilters: normalizePolymarketMarketsComposeState({
            ...cur.marketsFilters,
            ...partial,
            mode: "advanced",
          }),
        });
      });
    },
    [setCompose],
  );

  useEffect(() => {
    if (composeRaw == null) {
      setCompose?.(emptyPolymarketPricesHistoryComposeState());
    }
  }, [composeRaw, setCompose]);

  const [searchPicks, setSearchPicks] = useState(
    /** @type {import("@/lib/polymarketLive/polymarketPublicSearch").PolymarketPublicSearchSuggestion[]} */ (
      []
    ),
  );
  const [searchGoLoading, setSearchGoLoading] = useState(false);
  const [rangeOpen, setRangeOpen] = useState(false);

  const dateRange = useMemo(() => {
    const from = dateFromUnixEastern(state.startTs);
    const to = dateFromUnixEastern(state.endTs);
    return { from, to };
  }, [state.startTs, state.endTs]);
  const hasDateRange = Boolean(state.startTs && state.endTs);
  const windowMode = normalizePolymarketPricesHistoryWindowMode(state.windowMode);
  const dateRangeReady = windowMode !== "date_range" || hasDateRange;

  /**
   * @param {import("@/lib/polymarketLive/polymarketPublicSearch").PolymarketPublicSearchSuggestion} s
   */
  const addSearchPick = useCallback((s) => {
    if (!s) return;
    setSearchPicks((prev) => {
      const key = `${s.entity}:${s.id || ""}:${s.slug || ""}:${s.conditionId || ""}`;
      if (
        prev.some(
          (p) => `${p.entity}:${p.id || ""}:${p.slug || ""}:${p.conditionId || ""}` === key,
        )
      ) {
        return prev;
      }
      return [...prev, s];
    });
  }, []);

  const removeSearchPick = useCallback((key) => {
    setSearchPicks((prev) =>
      prev.filter(
        (p) => `${p.entity}:${p.id || ""}:${p.slug || ""}:${p.conditionId || ""}` !== key,
      ),
    );
  }, []);

  const handleSearchGo = useCallback(async () => {
    if (!searchPicks.length || !onSearchSubmitAll) return;
    if (!state.outcomeSelection || !dateRangeReady) return;
    setSearchGoLoading(true);
    try {
      await onSearchSubmitAll(searchPicks);
    } finally {
      setSearchGoLoading(false);
    }
  }, [dateRangeReady, onSearchSubmitAll, searchPicks, state.outcomeSelection]);

  /**
   * @param {{ from?: Date; to?: Date } | undefined} range
   */
  const handleRangeSelect = useCallback(
    (range) => {
      const from = range?.from;
      const to = range?.to || range?.from;
      if (!from) {
        patch({ startTs: "", endTs: "" });
        return;
      }
      let endTs = wallTimeToUnixSeconds(to || from, 23, 59, 59);
      const nowSec = Math.floor(Date.now() / 1000);
      if (Number(endTs) > nowSec) endTs = String(nowSec);
      patch({
        startTs: wallTimeToUnixSeconds(from, 0, 0, 0),
        endTs,
      });
      if (range?.from && range?.to) setRangeOpen(false);
    },
    [patch],
  );

  const outcomeFields = (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label className="text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground">
          Outcome
        </Label>
        <p className="text-[10px] leading-snug text-muted-foreground">Which market outcome?</p>
        <ToggleGroup
          type="single"
          value={state.outcomeSelection}
          onValueChange={(value) => {
            if (value === "yes" || value === "no" || value === "both") {
              patch({ outcomeSelection: value });
            }
          }}
          className="justify-start"
          disabled={disabled || searchGoLoading}
          aria-label="Price history outcomes"
        >
          <ToggleGroupItem value="yes" className="h-8 px-3 text-xs">
            YES
          </ToggleGroupItem>
          <ToggleGroupItem value="no" className="h-8 px-3 text-xs">
            NO
          </ToggleGroupItem>
          <ToggleGroupItem value="both" className="h-8 px-3 text-xs">
            Both
          </ToggleGroupItem>
        </ToggleGroup>
        {!state.outcomeSelection ? (
          <p className="text-[10px] text-amber-700 dark:text-amber-300">
            Select YES, NO, or both before pulling.
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label className="text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground">
          Separate sheet per outcome?
        </Label>
        <p className="text-[10px] leading-snug text-muted-foreground">
          When Both is selected, put each outcome in its own market sheet.
        </p>
        <ToggleGroup
          type="single"
          value={state.separateSheetPerOutcome ? "yes" : "no"}
          onValueChange={(value) => {
            if (value === "yes" || value === "no") {
              patch({ separateSheetPerOutcome: value === "yes" });
            }
          }}
          className="justify-start"
          disabled={disabled || searchGoLoading}
          aria-label="Separate price history sheet per outcome"
        >
          <ToggleGroupItem value="yes" className="h-8 px-3 text-xs">
            Yes
          </ToggleGroupItem>
          <ToggleGroupItem value="no" className="h-8 px-3 text-xs">
            No
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  );

  const sheetLayoutFields = (
    <div className="space-y-2">
      <Label className="text-[11px] text-foreground">How should price history be organized?</Label>
      <div className="space-y-2">
        {POLYMARKET_PRICES_HISTORY_SHEET_LAYOUT_OPTIONS.map((opt) => {
          const selected =
            normalizePolymarketPricesHistorySheetLayout(state.sheetLayout) === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              disabled={disabled || searchGoLoading}
              onClick={() => patch({ sheetLayout: opt.value })}
              className={cn(
                "w-full rounded-lg border px-3 py-2 text-left transition-colors",
                selected
                  ? "border-ring bg-background shadow-sm"
                  : "border-border/60 bg-muted/20 hover:border-border hover:bg-background/80",
              )}
            >
              <span className="block text-xs font-medium text-foreground">{opt.label}</span>
              <span className="mt-0.5 block text-[10px] leading-snug text-muted-foreground">
                {opt.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const historyParamFields = (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label className="text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground">
          History window
        </Label>
        <ToggleGroup
          type="single"
          value={windowMode}
          onValueChange={(value) => {
            if (value === "interval" || value === "date_range") {
              patch({ windowMode: value });
            }
          }}
          className="justify-start"
          disabled={disabled || searchGoLoading}
          aria-label="Price history window"
        >
          <ToggleGroupItem value="interval" className="h-8 px-3 text-xs">
            Interval
          </ToggleGroupItem>
          <ToggleGroupItem value="date_range" className="h-8 px-3 text-xs">
            Date range
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {windowMode === "interval" ? (
        <div className="space-y-2">
          <p className="text-[10px] leading-snug text-muted-foreground">
            Choose a relative history window. Fidelity is selected automatically to satisfy the
            endpoint for that interval.
          </p>
          <div
            className="flex flex-wrap items-center gap-1 rounded-lg border border-border/60 bg-muted/15 p-1"
            role="group"
            aria-label="Price history interval"
          >
            {POLYMARKET_PRICES_HISTORY_INTERVAL_OPTIONS.map((opt) => {
              const selected =
                normalizePolymarketPricesHistoryInterval(state.interval) === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  disabled={disabled || searchGoLoading}
                  aria-pressed={selected}
                  onClick={() =>
                    patch({
                      interval: opt.value,
                      fidelity: minimumPolymarketPricesHistoryFidelity(opt.value),
                    })
                  }
                  className={cn(
                    "h-8 min-w-11 flex-1 rounded-md px-3 text-xs font-semibold transition-colors",
                    selected
                      ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                      : "text-muted-foreground hover:bg-background/70 hover:text-foreground",
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-[10px] leading-snug text-muted-foreground">
            Choose explicit dates and a sampling fidelity. The same range applies to every selected
            market. Days use America/New_York.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,0.75fr)]">
            <div className="space-y-1.5 min-w-0">
              <Label className="text-[11px] text-foreground">Date range</Label>
              <Popover open={rangeOpen} onOpenChange={setRangeOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={disabled || searchGoLoading}
                    className="h-8 w-full justify-start px-2.5 text-left text-xs font-normal"
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5 shrink-0 opacity-70" />
                    <span
                      className={cn(
                        "truncate",
                        !(dateRange.from || dateRange.to) && "text-muted-foreground",
                      )}
                    >
                      {dateRange.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "LLL dd, y")} -{" "}
                            {format(dateRange.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(dateRange.from, "LLL dd, y")
                        )
                      ) : (
                        "Pick a date range"
                      )}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto max-w-[calc(100vw-2rem)] p-3"
                  align="start"
                >
                  <Calendar
                    mode="range"
                    numberOfMonths={1}
                    selected={dateRange}
                    onSelect={handleRangeSelect}
                    disabled={(day) => day > new Date()}
                  />
                  {dateRange.from || dateRange.to ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-2 h-7 w-full text-[10px]"
                      disabled={disabled || searchGoLoading}
                      onClick={() => {
                        patch({ startTs: "", endTs: "" });
                        setRangeOpen(false);
                      }}
                    >
                      Clear dates
                    </Button>
                  ) : null}
                </PopoverContent>
              </Popover>
              {!hasDateRange ? (
                <p className="text-[9px] text-amber-700 dark:text-amber-300">
                  Select a complete date range.
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5 min-w-0">
              <Label className="text-[11px] text-foreground">Fidelity</Label>
              <Select
                value={String(normalizePolymarketPricesHistoryFidelity(state.fidelity))}
                onValueChange={(value) => patch({ fidelity: Number(value) })}
                disabled={disabled || searchGoLoading}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Fidelity" />
                </SelectTrigger>
                <SelectContent>
                  {POLYMARKET_PRICES_HISTORY_FIDELITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={String(opt.value)} className="text-xs">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-2">
        <Label className="text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground">
          Mode
        </Label>
        <ToggleGroup
          type="single"
          value={state.mode}
          onValueChange={(v) => {
            if (v === "search" || v === "advanced") {
              patch({ mode: v });
              if (v === "advanced") setSearchPicks([]);
            }
          }}
          className="justify-start"
          disabled={disabled}
        >
          <ToggleGroupItem value="search" className="h-8 px-3 text-xs">
            Search
          </ToggleGroupItem>
          <ToggleGroupItem value="advanced" className="h-8 px-3 text-xs">
            Advanced search
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {state.mode === "search" ? (
        <div className="space-y-3">
          <p className="text-[11px] leading-snug text-muted-foreground">
            Search and add one or more markets. Each market becomes its own price history sheet
            (optional metadata sheet first).
          </p>
          <PolymarketLiveSearch
            entities={["market"]}
            searchTags={false}
            searchProfiles={false}
            placeholder="Search markets…"
            disabled={disabled || searchGoLoading}
            collectMode
            selectedItems={searchPicks}
            onSelect={(s) => addSearchPick(s)}
            onSubmitAll={(list) => {
              for (const s of list || []) addSearchPick(s);
            }}
          />
          {sheetLayoutFields}
          {historyParamFields}
          {outcomeFields}
          {searchPicks.length ? (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {searchPicks.map((s) => {
                  const key = `${s.entity}:${s.id || ""}:${s.slug || ""}:${s.conditionId || ""}`;
                  const label = String(s.title || s.slug || s.id || "Market").trim();
                  return (
                    <span
                      key={key}
                      className="inline-flex max-w-full items-center gap-0.5 rounded-full border border-emerald-600/25 bg-emerald-500/10 py-px pl-1.5 pr-0.5 text-[10px] font-medium leading-4 text-emerald-900 dark:text-emerald-100"
                    >
                      <span className="truncate">{label}</span>
                      <button
                        type="button"
                        disabled={disabled || searchGoLoading}
                        aria-label={`Remove ${label}`}
                        className="rounded-full p-0.5 text-emerald-800/70 hover:bg-emerald-500/20 hover:text-emerald-950 dark:text-emerald-100/80"
                        onClick={() => removeSearchPick(key)}
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="h-8 px-3 text-xs"
                  disabled={
                    disabled ||
                    searchGoLoading ||
                    !searchPicks.length ||
                    !state.outcomeSelection ||
                    !dateRangeReady
                  }
                  onClick={() => void handleSearchGo()}
                >
                  {searchGoLoading ? (
                    <>
                      <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                      Pulling…
                    </>
                  ) : (
                    `Go (${searchPicks.length})`
                  )}
                </Button>
                <button
                  type="button"
                  disabled={disabled || searchGoLoading}
                  className="text-[11px] text-muted-foreground hover:text-foreground"
                  onClick={() => setSearchPicks([])}
                >
                  Clear
                </button>
              </div>
            </div>
          ) : (
            <p className="text-[10px] leading-snug text-muted-foreground">
              Select markets from search to build your list, then press Go.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4 rounded-xl border border-border/60 bg-muted/10 p-3 text-foreground">
          <p className="text-[11px] leading-snug text-muted-foreground">
            Find markets with the same filters as Get Market/Markets, resolve outcome tokens, then
            pull batch price history (max 20 tokens per request).
          </p>
          <PolymarketLiveMarketsListFilters
            state={state.marketsFilters}
            onPatch={patchMarketsFilters}
            disabled={disabled}
            marketsLimitHint="Max markets to discover. Each matched market becomes its own price history sheet."
            marketSearchHint="Price History uses the chosen YES / NO / both outcome tokens from each matched market."
          />
          {sheetLayoutFields}
          {historyParamFields}
          {outcomeFields}
        </div>
      )}
    </div>
  );
}
