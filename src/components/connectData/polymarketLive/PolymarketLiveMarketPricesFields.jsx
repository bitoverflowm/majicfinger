"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, X } from "lucide-react";

import { PolymarketLiveMarketsListFilters } from "@/components/connectData/polymarketLive/PolymarketLiveMarketsListFilters";
import { PolymarketLiveSearch } from "@/components/connectData/polymarketLive/PolymarketLiveSearch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useMyStateV2 } from "@/context/stateContextV2";
import {
  emptyPolymarketMarketPricesComposeState,
  normalizePolymarketMarketPricesComposeState,
} from "@/lib/polymarketLive/marketPricesCompose";
import {
  emptyPolymarketMidpointPricesComposeState,
  normalizePolymarketMidpointPricesComposeState,
} from "@/lib/polymarketLive/midpointPricesCompose";
import {
  emptyPolymarketSpreadsComposeState,
  normalizePolymarketSpreadsComposeState,
} from "@/lib/polymarketLive/spreadsCompose";
import {
  emptyPolymarketLastTradePricesComposeState,
  normalizePolymarketLastTradePricesComposeState,
} from "@/lib/polymarketLive/lastTradePricesCompose";
import { normalizePolymarketMarketsComposeState } from "@/lib/polymarketLive/marketsCompose";
import { cn } from "@/lib/utils";

/**
 * @param {{
 *   className?: string;
 *   disabled?: boolean;
 *   variant?: "marketPrice" | "midpointPrice" | "spreads" | "lastTradePrices";
 *   onSearchSubmitAll?: (suggestions: import("@/lib/polymarketLive/polymarketPublicSearch").PolymarketPublicSearchSuggestion[]) => void | Promise<void>;
 * }} props
 */
export function PolymarketLiveMarketPricesFields({
  className,
  disabled = false,
  variant = "marketPrice",
  onSearchSubmitAll,
}) {
  const ctx = useMyStateV2() ?? {};
  const isMidpoint = variant === "midpointPrice";
  const isSpreads = variant === "spreads";
  const isLastTrade = variant === "lastTradePrices";
  const composeRaw = isLastTrade
    ? ctx.connectPolymarketLiveLastTradePricesCompose
    : isSpreads
      ? ctx.connectPolymarketLiveSpreadsCompose
      : isMidpoint
        ? ctx.connectPolymarketLiveMidpointPricesCompose
        : ctx.connectPolymarketLiveMarketPricesCompose;
  const setCompose = isLastTrade
    ? ctx.setConnectPolymarketLiveLastTradePricesCompose
    : isSpreads
      ? ctx.setConnectPolymarketLiveSpreadsCompose
      : isMidpoint
        ? ctx.setConnectPolymarketLiveMidpointPricesCompose
        : ctx.setConnectPolymarketLiveMarketPricesCompose;
  const emptyState = isLastTrade
    ? emptyPolymarketLastTradePricesComposeState
    : isSpreads
      ? emptyPolymarketSpreadsComposeState
      : isMidpoint
        ? emptyPolymarketMidpointPricesComposeState
        : emptyPolymarketMarketPricesComposeState;
  const normalizeState = isLastTrade
    ? normalizePolymarketLastTradePricesComposeState
    : isSpreads
      ? normalizePolymarketSpreadsComposeState
      : isMidpoint
        ? normalizePolymarketMidpointPricesComposeState
        : normalizePolymarketMarketPricesComposeState;
  const state = useMemo(
    () => normalizeState(composeRaw || emptyState()),
    [composeRaw, emptyState, normalizeState],
  );

  const patch = useCallback(
    (partial) => {
      setCompose?.((prev) =>
        normalizeState({
          ...(prev || emptyState()),
          ...partial,
        }),
      );
    },
    [emptyState, normalizeState, setCompose],
  );

  const patchMarketsFilters = useCallback(
    (partial) => {
      setCompose?.((prev) => {
        const cur = normalizeState(prev || emptyState());
        return normalizeState({
          ...cur,
          marketsFilters: normalizePolymarketMarketsComposeState({
            ...cur.marketsFilters,
            ...partial,
            mode: "advanced",
          }),
        });
      });
    },
    [emptyState, normalizeState, setCompose],
  );

  useEffect(() => {
    if (composeRaw == null) {
      setCompose?.(emptyState());
    }
  }, [composeRaw, emptyState, setCompose]);

  const [searchPicks, setSearchPicks] = useState([]);
  const [searchGoLoading, setSearchGoLoading] = useState(false);

  const addSearchPick = useCallback((suggestion) => {
    if (!suggestion) return;
    setSearchPicks((prev) => {
      const key = `${suggestion.entity}:${suggestion.id || ""}:${suggestion.slug || ""}:${suggestion.conditionId || ""}`;
      return prev.some(
        (p) => `${p.entity}:${p.id || ""}:${p.slug || ""}:${p.conditionId || ""}` === key,
      )
        ? prev
        : [...prev, suggestion];
    });
  }, []);

  const handleSearchGo = useCallback(async () => {
    if (!searchPicks.length || !onSearchSubmitAll) return;
    setSearchGoLoading(true);
    try {
      await onSearchSubmitAll(searchPicks);
    } finally {
      setSearchGoLoading(false);
    }
  }, [onSearchSubmitAll, searchPicks]);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-2">
        <Label className="text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground">
          Mode
        </Label>
        <ToggleGroup
          type="single"
          value={state.mode}
          onValueChange={(value) => {
            if (value !== "search" && value !== "advanced") return;
            patch({ mode: value });
            if (value === "advanced") setSearchPicks([]);
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
            {isLastTrade
              ? "Search and add one or more markets. Every market becomes one last-trade price row, and all rows go to one sheet."
              : isSpreads
              ? "Search and add one or more markets. Every market becomes one spread row, and all rows go to one sheet."
              : isMidpoint
              ? "Search and add one or more markets. Every market becomes one midpoint-price row, and all rows go to one sheet."
              : "Search and add one or more markets. Every market becomes one row with BUY and SELL prices, and all rows go to one sheet."}
          </p>
          <PolymarketLiveSearch
            entities={["market"]}
            searchTags={false}
            searchProfiles={false}
            placeholder="Search markets…"
            disabled={disabled || searchGoLoading}
            collectMode
            selectedItems={searchPicks}
            onSelect={addSearchPick}
            onSubmitAll={(list) => {
              for (const suggestion of list || []) addSearchPick(suggestion);
            }}
          />
          {searchPicks.length ? (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {searchPicks.map((suggestion) => {
                  const key = `${suggestion.entity}:${suggestion.id || ""}:${suggestion.slug || ""}:${suggestion.conditionId || ""}`;
                  const label = String(
                    suggestion.title || suggestion.slug || suggestion.id || "Market",
                  ).trim();
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
                        className="rounded-full p-0.5"
                        onClick={() =>
                          setSearchPicks((prev) =>
                            prev.filter(
                              (p) =>
                                `${p.entity}:${p.id || ""}:${p.slug || ""}:${p.conditionId || ""}` !==
                                key,
                            ),
                          )
                        }
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
                  disabled={disabled || searchGoLoading}
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
                  className="text-[11px] text-muted-foreground hover:text-foreground"
                  onClick={() => setSearchPicks([])}
                >
                  Clear
                </button>
              </div>
            </div>
          ) : (
            <p className="text-[10px] text-muted-foreground">
              Select markets from search to build your list, then press Go.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3 rounded-xl border border-border/60 bg-muted/10 p-3">
          <p className="text-[11px] leading-snug text-muted-foreground">
            {isLastTrade
              ? "Find markets with the same filters as Get Market/Markets, resolve each primary CLOB token id, and return one last-trade price and side row per market in one sheet."
              : isSpreads
              ? "Find markets with the same filters as Get Market/Markets, resolve each primary CLOB token id, and return one spread row per market in one sheet."
              : isMidpoint
              ? "Find markets with the same filters as Get Market/Markets, resolve each primary CLOB token id, and return one midpoint-price row per market in one sheet."
              : "Find markets with the same filters as Get Market/Markets, resolve each primary CLOB token id, and return one BUY/SELL price row per market in one sheet."}
          </p>
          <PolymarketLiveMarketsListFilters
            state={state.marketsFilters}
            onPatch={patchMarketsFilters}
            disabled={disabled}
            marketsLimitHint={`Max markets to discover and include in the ${
              isLastTrade
                ? "last-trade price"
                : isSpreads
                  ? "spread"
                  : isMidpoint
                    ? "midpoint"
                    : "price"
            } sheet.`}
            marketSearchHint={`${
              isLastTrade
                ? "Last Trade Prices"
                : isSpreads
                  ? "Spreads"
                  : isMidpoint
                    ? "Midpoint Prices"
                    : "Market Price"
            } uses the primary CLOB token id from each matched market.`}
          />
        </div>
      )}
    </div>
  );
}
