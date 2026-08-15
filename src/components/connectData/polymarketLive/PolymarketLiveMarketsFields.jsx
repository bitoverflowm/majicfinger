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
  emptyPolymarketMarketsComposeState,
  normalizePolymarketMarketsComposeState,
} from "@/lib/polymarketLive/marketsCompose";
import { cn } from "@/lib/utils";

/**
 * @param {{
 *   className?: string;
 *   disabled?: boolean;
 *   onSearchSelect?: (suggestion: import("@/lib/polymarketLive/polymarketPublicSearch").PolymarketPublicSearchSuggestion) => void;
 *   onSearchSubmitAll?: (suggestions: import("@/lib/polymarketLive/polymarketPublicSearch").PolymarketPublicSearchSuggestion[]) => void;
 * }} props
 */
export function PolymarketLiveMarketsFields({
  className,
  disabled = false,
  onSearchSelect,
  onSearchSubmitAll,
}) {
  const ctx = useMyStateV2() ?? {};
  const {
    connectPolymarketLiveMarketsCompose,
    setConnectPolymarketLiveMarketsCompose,
  } = ctx;

  const composeRaw = connectPolymarketLiveMarketsCompose;
  const setCompose = setConnectPolymarketLiveMarketsCompose;

  const state = useMemo(
    () =>
      normalizePolymarketMarketsComposeState(
        composeRaw || emptyPolymarketMarketsComposeState(),
      ),
    [composeRaw],
  );

  const patch = useCallback(
    (partial) => {
      setCompose?.((prev) => {
        const cur = normalizePolymarketMarketsComposeState(
          prev || emptyPolymarketMarketsComposeState(),
        );
        return normalizePolymarketMarketsComposeState({ ...cur, ...partial });
      });
    },
    [setCompose],
  );

  useEffect(() => {
    if (composeRaw == null) {
      setCompose?.(emptyPolymarketMarketsComposeState());
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
  const addSearchPick = useCallback(
    (s) => {
      if (!s) return;
      setSearchPicks((prev) => {
        const key = `${s.entity}:${s.id || ""}:${s.slug || ""}`;
        if (prev.some((p) => `${p.entity}:${p.id || ""}:${p.slug || ""}` === key)) return prev;
        return [...prev, s];
      });
      onSearchSelect?.(s);
    },
    [onSearchSelect],
  );

  /**
   * @param {string} key
   */
  const removeSearchPick = useCallback((key) => {
    setSearchPicks((prev) =>
      prev.filter((p) => `${p.entity}:${p.id || ""}:${p.slug || ""}` !== key),
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
            Search and add one or more markets, then press Go to load them into your sheet.
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
          {searchPicks.length ? (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {searchPicks.map((s) => {
                  const key = `${s.entity}:${s.id || ""}:${s.slug || ""}`;
                  const label = String(s.title || s.slug || s.ticker || s.id || "Market").trim();
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
            Query options for Polymarket{" "}
            <span className="font-mono text-[10px]">GET /markets</span>. Then pick return fields
            below and run pull.
          </p>
          <PolymarketLiveMarketsListFilters state={state} onPatch={patch} disabled={disabled} />
        </div>
      )}
    </div>
  );
}
