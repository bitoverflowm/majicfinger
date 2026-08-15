"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, X } from "lucide-react";

import { PolymarketLiveMarketsListFilters } from "@/components/connectData/polymarketLive/PolymarketLiveMarketsListFilters";
import { PolymarketLiveSearch } from "@/components/connectData/polymarketLive/PolymarketLiveSearch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useMyStateV2 } from "@/context/stateContextV2";
import {
  emptyPolymarketHoldersByMarketsComposeState,
  normalizePolymarketHoldersByMarketsComposeState,
  normalizePolymarketHoldersByMarketsSheetLayout,
  POLYMARKET_HOLDERS_BY_MARKETS_LIMIT_MAX,
  POLYMARKET_HOLDERS_BY_MARKETS_SHEET_LAYOUT_OPTIONS,
} from "@/lib/polymarketLive/holdersByMarketsCompose";
import { normalizePolymarketMarketsComposeState } from "@/lib/polymarketLive/marketsCompose";
import { cn } from "@/lib/utils";

/**
 * @param {{
 *   className?: string;
 *   disabled?: boolean;
 *   onSearchSubmitAll?: (suggestions: import("@/lib/polymarketLive/polymarketPublicSearch").PolymarketPublicSearchSuggestion[]) => void | Promise<void>;
 * }} props
 */
export function PolymarketLiveHoldersByMarketsFields({
  className,
  disabled = false,
  onSearchSubmitAll,
}) {
  const ctx = useMyStateV2() ?? {};
  const {
    connectPolymarketLiveHoldersByMarketsCompose,
    setConnectPolymarketLiveHoldersByMarketsCompose,
  } = ctx;

  const composeRaw = connectPolymarketLiveHoldersByMarketsCompose;
  const setCompose = setConnectPolymarketLiveHoldersByMarketsCompose;

  const state = useMemo(
    () =>
      normalizePolymarketHoldersByMarketsComposeState(
        composeRaw || emptyPolymarketHoldersByMarketsComposeState(),
      ),
    [composeRaw],
  );

  const patch = useCallback(
    (partial) => {
      setCompose?.((prev) => {
        const cur = normalizePolymarketHoldersByMarketsComposeState(
          prev || emptyPolymarketHoldersByMarketsComposeState(),
        );
        return normalizePolymarketHoldersByMarketsComposeState({ ...cur, ...partial });
      });
    },
    [setCompose],
  );

  const patchMarketsFilters = useCallback(
    (partial) => {
      setCompose?.((prev) => {
        const cur = normalizePolymarketHoldersByMarketsComposeState(
          prev || emptyPolymarketHoldersByMarketsComposeState(),
        );
        return normalizePolymarketHoldersByMarketsComposeState({
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
      setCompose?.(emptyPolymarketHoldersByMarketsComposeState());
    }
  }, [composeRaw, setCompose]);

  const [searchPicks, setSearchPicks] = useState(
    /** @type {import("@/lib/polymarketLive/polymarketPublicSearch").PolymarketPublicSearchSuggestion[]} */ (
      []
    ),
  );
  const [searchGoLoading, setSearchGoLoading] = useState(false);

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

  /**
   * @param {string} key
   */
  const removeSearchPick = useCallback((key) => {
    setSearchPicks((prev) =>
      prev.filter(
        (p) => `${p.entity}:${p.id || ""}:${p.slug || ""}:${p.conditionId || ""}` !== key,
      ),
    );
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

  const holdersLimitMinBalanceFields = (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label className="text-[11px] text-foreground">Holders limit</Label>
        <p className="text-[10px] leading-snug text-muted-foreground dark:text-slate-400">
          How many holders do you want to pull per market? (max 20)
        </p>
        <Input
          type="number"
          min={0}
          max={POLYMARKET_HOLDERS_BY_MARKETS_LIMIT_MAX}
          className="h-8 text-xs"
          disabled={disabled || searchGoLoading}
          value={state.limit}
          onChange={(e) => patch({ limit: Number(e.target.value) || 0 })}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-[11px] text-foreground">Min balance</Label>
        <p className="text-[10px] leading-snug text-muted-foreground dark:text-slate-400">
          Ignore holders below this position size.
        </p>
        <Input
          type="number"
          min={0}
          max={999999}
          className="h-8 text-xs"
          disabled={disabled || searchGoLoading}
          value={state.minBalance}
          onChange={(e) => patch({ minBalance: Number(e.target.value) || 0 })}
        />
      </div>
    </div>
  );

  const sheetLayoutFields = (
    <div className="space-y-2">
      <Label className="text-[11px] text-foreground">How should holders be organized?</Label>
      <div className="space-y-2">
        {POLYMARKET_HOLDERS_BY_MARKETS_SHEET_LAYOUT_OPTIONS.map((opt) => {
          const selected =
            normalizePolymarketHoldersByMarketsSheetLayout(state.sheetLayout) === opt.value;
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
              <span className="mt-0.5 block text-[10px] leading-snug text-muted-foreground dark:text-slate-400">
                {opt.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-2">
        <Label className="text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground dark:text-slate-400">
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
          <p className="text-[11px] leading-snug text-muted-foreground dark:text-slate-400">
            Search and add one or more markets, then press Go to load top holders into your sheet.
          </p>
          {holdersLimitMinBalanceFields}
          {sheetLayoutFields}
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
                  disabled={disabled || searchGoLoading || !searchPicks.length}
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
            <p className="text-[10px] leading-snug text-muted-foreground dark:text-slate-400">
              Select markets from search to build your list, then press Go.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4 rounded-xl border border-border/60 bg-muted/10 p-3 text-foreground">
          <p className="text-[11px] leading-snug text-muted-foreground dark:text-slate-400">
            Find all markets that match your search criteria and subsequently all holders for those
            markets.
          </p>

          {holdersLimitMinBalanceFields}
          {sheetLayoutFields}

          <div className="space-y-2 border-t border-border/50 pt-3">
            <Label className="text-[11px] text-foreground">Market discovery filters</Label>
            <p className="text-[10px] leading-snug text-muted-foreground dark:text-slate-400">
              Same filters as Get Market/Markets. We list matching markets first, then pull holders
              for each (holders limit × markets found).
            </p>
            <PolymarketLiveMarketsListFilters
              state={state.marketsFilters}
              onPatch={patchMarketsFilters}
              disabled={disabled}
              marketsLimitHint="Max markets to discover before fetching holders for each."
              marketSearchHint="Holders are fetched by each market's condition id. If you do not know the condition id of your market(s) just search using natural language and Lychee will populate the condition id, otherwise just enter your condition id."
            />
          </div>
        </div>
      )}
    </div>
  );
}
