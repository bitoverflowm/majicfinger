"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, X } from "lucide-react";

import { PolymarketDateTimeField } from "@/components/connectData/polymarketLive/PolymarketDateTimeField";
import { PolymarketLiveSearch } from "@/components/connectData/polymarketLive/PolymarketLiveSearch";
import { PolymarketTagPicker } from "@/components/connectData/polymarketLive/PolymarketTagPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useMyStateV2 } from "@/context/stateContextV2";
import {
  emptyPolymarketMarketsComposeState,
  normalizePolymarketMarketsComposeState,
  POLYMARKET_MARKETS_SORT_OPTIONS,
} from "@/lib/polymarketLive/marketsCompose";
import { cn } from "@/lib/utils";

/**
 * @param {import("@/lib/polymarketLive/polymarketPublicSearch").PolymarketPublicSearchSuggestion | null | undefined} suggestion
 * @returns {string}
 */
function tokenIdFromSuggestion(suggestion) {
  const raw =
    suggestion?.raw && typeof suggestion.raw === "object"
      ? /** @type {Record<string, unknown>} */ (suggestion.raw)
      : {};
  const direct = String(raw.tokenId || raw.clobTokenId || "").trim();
  if (direct) return direct;
  let ids = raw.clobTokenIds;
  if (typeof ids === "string") {
    const s = ids.trim();
    if (!s) return "";
    try {
      ids = JSON.parse(s);
    } catch {
      const first = s.split(",")[0]?.trim();
      return first || "";
    }
  }
  if (Array.isArray(ids) && ids.length) {
    return String(ids[0] ?? "").trim();
  }
  return "";
}

/**
 * @param {import("@/lib/polymarketLive/marketsCompose").PolymarketMarketRef} ref
 * @returns {string}
 */
function marketRefKey(ref) {
  return `${ref.id || ""}:${ref.slug || ""}:${ref.conditionId || ""}:${ref.tokenId || ""}`;
}

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

  const addMarketRef = useCallback(
    (suggestion) => {
      const id = String(suggestion?.id || "").trim();
      const slug = String(suggestion?.slug || "").trim();
      const conditionId = String(suggestion?.conditionId || "").trim();
      const title = String(suggestion?.title || "").trim();
      const tokenId = tokenIdFromSuggestion(suggestion);
      if (!id && !slug && !conditionId && !tokenId) return;
      const next = [...state.marketRefs];
      const existingIdx = next.findIndex(
        (r) =>
          (id && r.id === id) ||
          (slug && r.slug === slug) ||
          (conditionId && r.conditionId === conditionId) ||
          (tokenId && r.tokenId === tokenId),
      );
      // Keep id as Gamma market id only — never fall back to token/condition/slug.
      const row = {
        id: id || next[existingIdx]?.id || "",
        slug: slug || next[existingIdx]?.slug || undefined,
        conditionId: conditionId || next[existingIdx]?.conditionId || undefined,
        tokenId: tokenId || next[existingIdx]?.tokenId || undefined,
        title: title || next[existingIdx]?.title || undefined,
      };
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

  const [tokenIdDraft, setTokenIdDraft] = useState("");

  const addTokenIdRef = useCallback(() => {
    const tokenId = String(tokenIdDraft || "").trim();
    if (!tokenId) return;
    const next = [...state.marketRefs];
    const existingIdx = next.findIndex((r) => r.tokenId === tokenId);
    const row = { id: "", tokenId };
    if (existingIdx >= 0) next[existingIdx] = { ...next[existingIdx], ...row };
    else next.push(row);
    patch({ marketRefs: next });
    setTokenIdDraft("");
  }, [patch, state.marketRefs, tokenIdDraft]);

  const addOrderField = useCallback(
    (value) => {
      const v = String(value || "").trim();
      if (!v || state.orderFields.includes(v)) return;
      patch({ orderFields: [...state.orderFields, v] });
    },
    [patch, state.orderFields],
  );

  const removeOrderField = useCallback(
    (value) => {
      patch({ orderFields: state.orderFields.filter((f) => f !== value) });
    },
    [patch, state.orderFields],
  );

  const availableSortOptions = POLYMARKET_MARKETS_SORT_OPTIONS.filter(
    (o) => !state.orderFields.includes(o.value),
  );

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

  /** @param {string} key @param {boolean} checked */
  const setTriBool = (key, checked) => {
    patch({ [key]: checked ? true : null });
  };

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

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-[11px] text-foreground">Limit</Label>
              <p className="text-[10px] leading-snug text-muted-foreground dark:text-slate-400">
                Max number of markets to return in this pull.
              </p>
              <Input
                type="number"
                min={0}
                max={500}
                className="h-8 text-xs"
                disabled={disabled}
                value={state.limit}
                onChange={(e) => patch({ limit: Number(e.target.value) || 0 })}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-[11px] text-foreground">Sort</Label>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground dark:text-slate-400">
                    Ascending
                  </span>
                  <Switch
                    checked={state.ascending}
                    disabled={disabled}
                    onCheckedChange={(v) => patch({ ascending: !!v })}
                    className="scale-90"
                  />
                </div>
              </div>
              <p className="text-[10px] leading-snug text-muted-foreground dark:text-slate-400">
                Order results by one or more fields; earlier fields take priority.
              </p>
              <Select
                key={`sort:${state.orderFields.join(",")}`}
                disabled={disabled || availableSortOptions.length === 0}
                onValueChange={addOrderField}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Add sort field…" />
                </SelectTrigger>
                <SelectContent>
                  {availableSortOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {state.orderFields.length ? (
                <div className="flex flex-wrap gap-1 pt-1">
                  {state.orderFields.map((field, idx) => {
                    const label =
                      POLYMARKET_MARKETS_SORT_OPTIONS.find((o) => o.value === field)?.label ||
                      field;
                    return (
                      <span
                        key={`${field}:${idx}`}
                        className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background px-2 py-0.5 text-[10px] text-foreground"
                      >
                        <span className="text-muted-foreground">{idx + 1}.</span>
                        {label}
                        <button
                          type="button"
                          disabled={disabled}
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => removeOrderField(field)}
                          aria-label={`Remove sort ${label}`}
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] text-foreground">Market id / slug / token</Label>
            <p className="text-[10px] leading-snug text-muted-foreground dark:text-slate-400">
              Search markets and keep adding. Selecting fills id, slug, and condition id when
              available.
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
                placeholder="Paste CLOB token id…"
                value={tokenIdDraft}
                onChange={(e) => setTokenIdDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTokenIdRef();
                  }
                }}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 shrink-0 px-3 text-xs"
                disabled={disabled || !String(tokenIdDraft || "").trim()}
                onClick={addTokenIdRef}
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
                          {ref.title || ref.slug || ref.id || ref.tokenId}
                        </p>
                        <p className="truncate font-mono text-[10px] text-muted-foreground">
                          {ref.id ? `id ${ref.id}` : null}
                          {ref.slug ? `${ref.id ? " · " : ""}${ref.slug}` : ""}
                          {ref.conditionId
                            ? `${ref.id || ref.slug ? " · " : ""}cond ${ref.conditionId}`
                            : ""}
                          {ref.tokenId
                            ? `${ref.id || ref.slug || ref.conditionId ? " · " : ""}token ${ref.tokenId}`
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
            ) : null}
          </div>

          <PolymarketTagPicker
            tags={state.tags}
            onChange={(tags) => patch({ tags })}
            disabled={disabled}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <PolymarketDateTimeField
              label="Start date min"
              value={state.startDateMin}
              onChange={(iso) => patch({ startDateMin: iso })}
              disabled={disabled}
            />
            <PolymarketDateTimeField
              label="Start date max"
              value={state.startDateMax}
              onChange={(iso) => patch({ startDateMax: iso })}
              disabled={disabled}
            />
            <PolymarketDateTimeField
              label="End date min"
              value={state.endDateMin}
              onChange={(iso) => patch({ endDateMin: iso })}
              disabled={disabled}
            />
            <PolymarketDateTimeField
              label="End date max"
              value={state.endDateMax}
              onChange={(iso) => patch({ endDateMax: iso })}
              disabled={disabled}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-[11px] text-foreground">Liquidity min</Label>
              <Input
                type="number"
                className="h-8 text-xs"
                disabled={disabled}
                value={state.liquidityNumMin}
                onChange={(e) => patch({ liquidityNumMin: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] text-foreground">Liquidity max</Label>
              <Input
                type="number"
                className="h-8 text-xs"
                disabled={disabled}
                value={state.liquidityNumMax}
                onChange={(e) => patch({ liquidityNumMax: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] text-foreground">Volume min</Label>
              <Input
                type="number"
                className="h-8 text-xs"
                disabled={disabled}
                value={state.volumeNumMin}
                onChange={(e) => patch({ volumeNumMin: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] text-foreground">Volume max</Label>
              <Input
                type="number"
                className="h-8 text-xs"
                disabled={disabled}
                value={state.volumeNumMax}
                onChange={(e) => patch({ volumeNumMax: e.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-[11px] text-foreground">UMA resolution status</Label>
              <Input
                className="h-8 text-xs"
                disabled={disabled}
                value={state.umaResolutionStatus}
                onChange={(e) => patch({ umaResolutionStatus: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] text-foreground">Game id</Label>
              <Input
                className="h-8 text-xs"
                disabled={disabled}
                value={state.gameId}
                onChange={(e) => patch({ gameId: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] text-foreground">Sports market types</Label>
              <Input
                className="h-8 text-xs"
                disabled={disabled}
                value={state.sportsMarketTypes}
                onChange={(e) => patch({ sportsMarketTypes: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] text-foreground">Rewards min size</Label>
              <Input
                className="h-8 text-xs"
                disabled={disabled}
                value={state.rewardsMinSize}
                onChange={(e) => patch({ rewardsMinSize: e.target.value })}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-[11px] text-foreground">Market maker address</Label>
              <Input
                className="h-8 font-mono text-xs"
                disabled={disabled}
                placeholder="Comma-separated addresses…"
                value={state.marketMakerAddress}
                onChange={(e) => patch({ marketMakerAddress: e.target.value })}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-[11px] text-foreground">Question ids</Label>
              <Input
                className="h-8 font-mono text-xs"
                disabled={disabled}
                placeholder="Comma-separated question ids…"
                value={state.questionIds}
                onChange={(e) => patch({ questionIds: e.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { key: "closed", label: "Closed" },
              {
                key: "cyom",
                label: "CYOM",
                hint: "CYOM markets are events created through Polymarket’s user/community market-creation workflow",
              },
              { key: "relatedTags", label: "Related tags" },
              { key: "includeTag", label: "Include tag" },
            ].map((row) => (
              <label
                key={row.key}
                className="flex items-start justify-between gap-2 rounded-md border border-border/40 bg-background/60 px-2 py-1.5"
              >
                <span className="min-w-0">
                  <span className="block text-[11px] font-medium text-foreground">{row.label}</span>
                  {row.hint ? (
                    <span className="mt-0.5 block text-[10px] leading-snug text-muted-foreground dark:text-slate-400">
                      {row.hint}
                    </span>
                  ) : null}
                </span>
                <Switch
                  checked={state[row.key] === true}
                  disabled={disabled}
                  onCheckedChange={(v) => setTriBool(row.key, !!v)}
                  className="mt-0.5 scale-90"
                />
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
