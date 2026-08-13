"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, X } from "lucide-react";

import { PolymarketLiveSearch } from "@/components/connectData/polymarketLive/PolymarketLiveSearch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useMyStateV2 } from "@/context/stateContextV2";
import {
  emptyPolymarketOpenInterestComposeState,
  normalizePolymarketOpenInterestComposeState,
  openInterestMarketRefFromSuggestion,
} from "@/lib/polymarketLive/openInterestCompose";
import { cn } from "@/lib/utils";

/**
 * @param {import("@/lib/polymarketLive/openInterestCompose").PolymarketOpenInterestMarketRef} ref
 * @returns {string}
 */
function marketRefKey(ref) {
  return `${ref.id || ""}:${ref.slug || ""}:${ref.conditionId || ""}`;
}

/**
 * @param {{
 *   className?: string;
 *   disabled?: boolean;
 *   onSearchSubmitAll?: (suggestions: import("@/lib/polymarketLive/polymarketPublicSearch").PolymarketPublicSearchSuggestion[]) => void | Promise<void>;
 * }} props
 */
export function PolymarketLiveOpenInterestFields({
  className,
  disabled = false,
  onSearchSubmitAll,
}) {
  const ctx = useMyStateV2() ?? {};
  const {
    connectPolymarketLiveOpenInterestCompose,
    setConnectPolymarketLiveOpenInterestCompose,
  } = ctx;

  const composeRaw = connectPolymarketLiveOpenInterestCompose;
  const setCompose = setConnectPolymarketLiveOpenInterestCompose;

  const state = useMemo(
    () =>
      normalizePolymarketOpenInterestComposeState(
        composeRaw || emptyPolymarketOpenInterestComposeState(),
      ),
    [composeRaw],
  );

  const patch = useCallback(
    (partial) => {
      setCompose?.((prev) => {
        const cur = normalizePolymarketOpenInterestComposeState(
          prev || emptyPolymarketOpenInterestComposeState(),
        );
        return normalizePolymarketOpenInterestComposeState({ ...cur, ...partial });
      });
    },
    [setCompose],
  );

  useEffect(() => {
    if (composeRaw == null) {
      setCompose?.(emptyPolymarketOpenInterestComposeState());
    }
  }, [composeRaw, setCompose]);

  const addMarketRef = useCallback(
    (suggestion) => {
      const row = openInterestMarketRefFromSuggestion(suggestion);
      if (!row) return;
      const next = [...state.marketRefs];
      const existingIdx = next.findIndex(
        (r) =>
          (row.id && r.id === row.id) ||
          (row.slug && r.slug === row.slug) ||
          (row.conditionId && r.conditionId === row.conditionId),
      );
      if (existingIdx >= 0) next[existingIdx] = { ...next[existingIdx], ...row };
      else next.push(row);
      patch({ marketRefs: next });
    },
    [patch, state.marketRefs],
  );

  const removeMarketRef = useCallback(
    (key) => {
      patch({
        marketRefs: state.marketRefs.filter((r) => marketRefKey(r) !== key),
      });
    },
    [patch, state.marketRefs],
  );

  const [conditionIdDraft, setConditionIdDraft] = useState("");

  const addConditionIdRef = useCallback(() => {
    const conditionId = String(conditionIdDraft || "").trim();
    if (!conditionId) return;
    const next = [...state.marketRefs];
    const existingIdx = next.findIndex((r) => r.conditionId === conditionId);
    const row = { id: "", conditionId, title: conditionId };
    if (existingIdx >= 0) next[existingIdx] = { ...next[existingIdx], ...row };
    else next.push(row);
    patch({ marketRefs: next });
    setConditionIdDraft("");
  }, [patch, state.marketRefs, conditionIdDraft]);

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
            Search and add one or more markets, then press Go. We pass each market&apos;s condition
            id (<span className="font-mono text-[10px]">0x…</span>) to{" "}
            <span className="font-mono text-[10px]">GET /oi</span>.
          </p>
          <PolymarketLiveSearch
            entities={["market"]}
            searchTags={false}
            searchProfiles={false}
            placeholder="Search markets…"
            disabled={disabled || searchGoLoading}
            collectMode
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
            Same market discovery as Get Market/Markets. We resolve each selection to a condition id
            and call <span className="font-mono text-[10px]">GET /oi?market=…</span>. Leave markets
            empty to request open interest without a market filter.
          </p>

          <div className="space-y-1.5">
            <Label className="text-[11px] text-foreground">Markets</Label>
            <p className="text-[10px] leading-snug text-muted-foreground dark:text-slate-400">
              Search markets to add (id / slug / condition id when available), or paste a condition
              id directly.
            </p>
            <PolymarketLiveSearch
              entities={["market"]}
              searchTags={false}
              searchProfiles={false}
              placeholder="Search markets to add…"
              disabled={disabled}
              onSelect={(s) => addMarketRef(s)}
              onSubmitAll={(list) => list.forEach((s) => addMarketRef(s))}
            />
            <div className="flex items-center gap-2 pt-1">
              <Input
                className="h-8 flex-1 font-mono text-xs"
                disabled={disabled}
                placeholder="Paste condition id (0x…)…"
                value={conditionIdDraft}
                onChange={(e) => setConditionIdDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addConditionIdRef();
                  }
                }}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 shrink-0 px-3 text-xs"
                disabled={disabled || !String(conditionIdDraft || "").trim()}
                onClick={addConditionIdRef}
              >
                Add
              </Button>
            </div>
            {state.marketRefs.length ? (
              <ul className="mt-1 space-y-1">
                {state.marketRefs.map((ref) => {
                  const key = marketRefKey(ref);
                  return (
                    <li
                      key={key}
                      className="flex items-start justify-between gap-2 rounded-md border border-border/50 bg-background/80 px-2 py-1.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-foreground">
                          {ref.title || ref.slug || ref.conditionId || ref.id}
                        </p>
                        <p className="truncate font-mono text-[10px] text-muted-foreground">
                          {ref.conditionId
                            ? `cond ${ref.conditionId}`
                            : ref.id
                              ? `id ${ref.id} (resolving condition id on pull)`
                              : ref.slug
                                ? `${ref.slug} (resolving condition id on pull)`
                                : ""}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-6 shrink-0"
                        disabled={disabled}
                        onClick={() => removeMarketRef(key)}
                        aria-label="Remove market"
                      >
                        <X className="size-3.5" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="pt-1 text-[10px] text-muted-foreground dark:text-slate-400">
                No markets selected — Run pull will request open interest without a market filter.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
