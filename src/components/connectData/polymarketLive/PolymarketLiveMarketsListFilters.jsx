"use client";

import { useCallback, useState } from "react";
import { X } from "lucide-react";

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
import {
  POLYMARKET_MARKETS_SORT_OPTIONS,
} from "@/lib/polymarketLive/marketsCompose";

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
 * Shared GET /markets list filters (used by Get Markets + holders advanced discovery).
 *
 * @param {{
 *   state: import("@/lib/polymarketLive/marketsCompose").PolymarketMarketsComposeState;
 *   onPatch: (partial: Partial<import("@/lib/polymarketLive/marketsCompose").PolymarketMarketsComposeState>) => void;
 *   disabled?: boolean;
 *   marketsLimitHint?: string;
 *   marketSearchHint?: string;
 * }} props
 */
export function PolymarketLiveMarketsListFilters({
  state,
  onPatch,
  disabled = false,
  marketsLimitHint = "Max number of markets to return in this pull.",
  marketSearchHint = "Optional — search markets and keep adding. Selecting fills id, slug, and condition id when available.",
}) {
  const [tokenIdDraft, setTokenIdDraft] = useState("");

  const addMarketRef = useCallback(
    (suggestion) => {
      const id = String(suggestion?.id || "").trim();
      const slug = String(suggestion?.slug || "").trim();
      const conditionId = String(suggestion?.conditionId || "").trim();
      const title = String(suggestion?.title || "").trim();
      const tokenId = tokenIdFromSuggestion(suggestion);
      if (!id && !slug && !conditionId && !tokenId) return;
      const next = [...(state.marketRefs || [])];
      const existingIdx = next.findIndex(
        (r) =>
          (id && r.id === id) ||
          (slug && r.slug === slug) ||
          (conditionId && r.conditionId === conditionId) ||
          (tokenId && r.tokenId === tokenId),
      );
      const row = {
        id: id || next[existingIdx]?.id || "",
        slug: slug || next[existingIdx]?.slug || undefined,
        conditionId: conditionId || next[existingIdx]?.conditionId || undefined,
        tokenId: tokenId || next[existingIdx]?.tokenId || undefined,
        title: title || next[existingIdx]?.title || undefined,
      };
      if (existingIdx >= 0) next[existingIdx] = { ...next[existingIdx], ...row };
      else next.push(row);
      onPatch({ marketRefs: next });
    },
    [onPatch, state.marketRefs],
  );

  const removeMarketRef = useCallback(
    (key) => {
      onPatch({
        marketRefs: (state.marketRefs || []).filter((r) => marketRefKey(r) !== key),
      });
    },
    [onPatch, state.marketRefs],
  );

  const addTokenIdRef = useCallback(() => {
    const tokenId = String(tokenIdDraft || "").trim();
    if (!tokenId) return;
    const next = [...(state.marketRefs || [])];
    const existingIdx = next.findIndex((r) => r.tokenId === tokenId);
    const row = { id: "", tokenId };
    if (existingIdx >= 0) next[existingIdx] = { ...next[existingIdx], ...row };
    else next.push(row);
    onPatch({ marketRefs: next });
    setTokenIdDraft("");
  }, [onPatch, state.marketRefs, tokenIdDraft]);

  const addOrderField = useCallback(
    (value) => {
      const v = String(value || "").trim();
      if (!v || (state.orderFields || []).includes(v)) return;
      onPatch({ orderFields: [...(state.orderFields || []), v] });
    },
    [onPatch, state.orderFields],
  );

  const removeOrderField = useCallback(
    (value) => {
      onPatch({ orderFields: (state.orderFields || []).filter((f) => f !== value) });
    },
    [onPatch, state.orderFields],
  );

  const availableSortOptions = POLYMARKET_MARKETS_SORT_OPTIONS.filter(
    (o) => !(state.orderFields || []).includes(o.value),
  );

  /** @param {string} key @param {boolean} checked */
  const setTriBool = (key, checked) => {
    onPatch({ [key]: checked ? true : null });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-[11px] text-foreground">Markets limit</Label>
          <p className="text-[10px] leading-snug text-muted-foreground dark:text-slate-400">
            {marketsLimitHint}
          </p>
          <Input
            type="number"
            min={0}
            max={500}
            className="h-8 text-xs"
            disabled={disabled}
            value={state.limit}
            onChange={(e) => onPatch({ limit: Number(e.target.value) || 0 })}
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
                onCheckedChange={(v) => onPatch({ ascending: !!v })}
                className="scale-90"
              />
            </div>
          </div>
          <p className="text-[10px] leading-snug text-muted-foreground dark:text-slate-400">
            Order markets by one or more fields; earlier fields take priority.
          </p>
          <Select
            key={`sort:${(state.orderFields || []).join(",")}`}
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
          {(state.orderFields || []).length ? (
            <div className="flex flex-wrap gap-1 pt-1">
              {(state.orderFields || []).map((field, idx) => {
                const label =
                  POLYMARKET_MARKETS_SORT_OPTIONS.find((o) => o.value === field)?.label || field;
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
          {marketSearchHint}
        </p>
        <PolymarketLiveSearch
          entities={["market"]}
          searchTags={false}
          searchProfiles={false}
          placeholder="Search markets to add…"
          disabled={disabled}
          selectedItems={state.marketRefs}
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
        {(state.marketRefs || []).length ? (
          <ul className="mt-1 space-y-1">
            {(state.marketRefs || []).map((ref) => {
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
        tags={state.tags || []}
        onChange={(tags) => onPatch({ tags })}
        disabled={disabled}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <PolymarketDateTimeField
          label="Start date min"
          value={state.startDateMin || ""}
          onChange={(iso) => onPatch({ startDateMin: iso })}
          disabled={disabled}
        />
        <PolymarketDateTimeField
          label="Start date max"
          value={state.startDateMax || ""}
          onChange={(iso) => onPatch({ startDateMax: iso })}
          disabled={disabled}
        />
        <PolymarketDateTimeField
          label="End date min"
          value={state.endDateMin || ""}
          onChange={(iso) => onPatch({ endDateMin: iso })}
          disabled={disabled}
        />
        <PolymarketDateTimeField
          label="End date max"
          value={state.endDateMax || ""}
          onChange={(iso) => onPatch({ endDateMax: iso })}
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
            onChange={(e) => onPatch({ liquidityNumMin: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[11px] text-foreground">Liquidity max</Label>
          <Input
            type="number"
            className="h-8 text-xs"
            disabled={disabled}
            value={state.liquidityNumMax}
            onChange={(e) => onPatch({ liquidityNumMax: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[11px] text-foreground">Volume min</Label>
          <Input
            type="number"
            className="h-8 text-xs"
            disabled={disabled}
            value={state.volumeNumMin}
            onChange={(e) => onPatch({ volumeNumMin: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[11px] text-foreground">Volume max</Label>
          <Input
            type="number"
            className="h-8 text-xs"
            disabled={disabled}
            value={state.volumeNumMax}
            onChange={(e) => onPatch({ volumeNumMax: e.target.value })}
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
            onChange={(e) => onPatch({ umaResolutionStatus: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[11px] text-foreground">Game id</Label>
          <Input
            className="h-8 text-xs"
            disabled={disabled}
            value={state.gameId}
            onChange={(e) => onPatch({ gameId: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[11px] text-foreground">Sports market types</Label>
          <Input
            className="h-8 text-xs"
            disabled={disabled}
            value={state.sportsMarketTypes}
            onChange={(e) => onPatch({ sportsMarketTypes: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[11px] text-foreground">Rewards min size</Label>
          <Input
            className="h-8 text-xs"
            disabled={disabled}
            value={state.rewardsMinSize}
            onChange={(e) => onPatch({ rewardsMinSize: e.target.value })}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-[11px] text-foreground">Market maker address</Label>
          <Input
            className="h-8 font-mono text-xs"
            disabled={disabled}
            placeholder="Comma-separated addresses…"
            value={state.marketMakerAddress}
            onChange={(e) => onPatch({ marketMakerAddress: e.target.value })}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-[11px] text-foreground">Question ids</Label>
          <Input
            className="h-8 font-mono text-xs"
            disabled={disabled}
            placeholder="Comma-separated question ids…"
            value={state.questionIds}
            onChange={(e) => onPatch({ questionIds: e.target.value })}
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
  );
}
