"use client";

import { useCallback, useEffect, useMemo } from "react";
import { X } from "lucide-react";

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
  emptyPolymarketSeriesComposeState,
  normalizePolymarketSeriesComposeState,
  POLYMARKET_SERIES_RECURRENCE_OPTIONS,
  POLYMARKET_SERIES_SHEET_LAYOUT_OPTIONS,
  POLYMARKET_SERIES_SORT_OPTIONS,
} from "@/lib/polymarketLive/seriesCompose";
import { cn } from "@/lib/utils";

export function PolymarketLiveSeriesFields({ className, disabled = false }) {
  const ctx = useMyStateV2() ?? {};
  const composeRaw = ctx.connectPolymarketLiveSeriesCompose;
  const setCompose = ctx.setConnectPolymarketLiveSeriesCompose;

  const state = useMemo(
    () => normalizePolymarketSeriesComposeState(composeRaw || emptyPolymarketSeriesComposeState()),
    [composeRaw],
  );

  const patch = useCallback(
    (partial) => {
      setCompose?.((prev) => {
        const cur = normalizePolymarketSeriesComposeState(
          prev || emptyPolymarketSeriesComposeState(),
        );
        return normalizePolymarketSeriesComposeState({ ...cur, ...partial });
      });
    },
    [setCompose],
  );

  useEffect(() => {
    if (composeRaw == null) setCompose?.(emptyPolymarketSeriesComposeState());
  }, [composeRaw, setCompose]);

  const addOrderField = useCallback(
    (value) => {
      const next = String(value || "").trim();
      if (!next || state.orderFields.includes(next)) return;
      patch({ orderFields: [...state.orderFields, next] });
    },
    [patch, state.orderFields],
  );

  const removeOrderField = useCallback(
    (value) => patch({ orderFields: state.orderFields.filter((field) => field !== value) }),
    [patch, state.orderFields],
  );

  const availableSortOptions = POLYMARKET_SERIES_SORT_OPTIONS.filter(
    (option) => !state.orderFields.includes(option.value),
  );

  const setTriBool = (key, checked) => {
    patch({ [key]: checked ? true : null });
  };

  const listInput = (value) =>
    String(value || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-2">
        <Label className="text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground dark:text-slate-400">
          Series mode
        </Label>
        <ToggleGroup
          type="single"
          value={state.mode}
          onValueChange={(value) => {
            if (value === "lookup" || value === "list") patch({ mode: value });
          }}
          className="justify-start"
          disabled={disabled}
        >
          <ToggleGroupItem value="lookup" className="h-8 px-3 text-xs">
            Search by series ID
          </ToggleGroupItem>
          <ToggleGroupItem value="list" className="h-8 px-3 text-xs">
            Find series
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {state.mode === "lookup" ? (
        <div className="space-y-4 rounded-xl border border-border/60 bg-muted/10 p-3 text-foreground">
          <p className="text-[11px] leading-snug text-muted-foreground dark:text-slate-400">
            Fetch one series by its Polymarket series ID. Optionally extract the series metadata,
            its events, and each event&apos;s markets into separate sheets.
          </p>

          <div className="space-y-1.5">
            <Label className="text-[11px] text-foreground">Series ID</Label>
            <Input
              className="h-8 text-xs"
              value={state.seriesId}
              disabled={disabled}
              placeholder="e.g. 123"
              onChange={(event) => patch({ seriesId: event.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[11px] text-foreground">How should the lookup be organized?</Label>
            <div className="space-y-2">
              {POLYMARKET_SERIES_SHEET_LAYOUT_OPTIONS.map((option) => {
                const selected = state.sheetLayout === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={disabled}
                    onClick={() => patch({ sheetLayout: option.value })}
                    className={cn(
                      "w-full rounded-lg border px-3 py-2 text-left transition-colors",
                      selected
                        ? "border-ring bg-background shadow-sm"
                        : "border-border/60 bg-muted/20 hover:border-border hover:bg-background/80",
                    )}
                  >
                    <span className="block text-xs font-medium text-foreground">{option.label}</span>
                    <span className="mt-0.5 block text-[10px] leading-snug text-muted-foreground dark:text-slate-400">
                      {option.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <label className="flex items-start justify-between gap-2 rounded-md border border-border/40 bg-background/60 px-2 py-1.5">
            <span className="min-w-0">
              <span className="block text-[11px] font-medium text-foreground">Include chat</span>
              <span className="mt-0.5 block text-[10px] leading-snug text-muted-foreground dark:text-slate-400">
                Include any series chat metadata Polymarket returns on the lookup.
              </span>
            </span>
            <Switch
              checked={state.includeChat === true}
              disabled={disabled}
              onCheckedChange={(checked) => setTriBool("includeChat", !!checked)}
              className="mt-0.5 scale-90"
            />
          </label>
        </div>
      ) : (
        <div className="space-y-4 rounded-xl border border-border/60 bg-muted/10 p-3 text-foreground">
          <p className="text-[11px] leading-snug text-muted-foreground dark:text-slate-400">
            Discover series with Polymarket <span className="font-mono text-[10px]">GET /series</span>.
            This mode is for discovery only, so results are written into a single sheet.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-[11px] text-foreground">Limit</Label>
              <Input
                type="number"
                min={0}
                max={500}
                className="h-8 text-xs"
                disabled={disabled}
                value={state.limit}
                onChange={(event) => patch({ limit: Number(event.target.value) || 0 })}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] text-foreground">Offset</Label>
              <Input
                type="number"
                min={0}
                className="h-8 text-xs"
                disabled={disabled}
                value={state.offset}
                onChange={(event) => patch({ offset: Number(event.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-[11px] text-foreground">Sort</Label>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground dark:text-slate-400">Ascending</span>
                <Switch
                  checked={state.ascending}
                  disabled={disabled}
                  onCheckedChange={(value) => patch({ ascending: !!value })}
                  className="scale-90"
                />
              </div>
            </div>
            <Select
              key={`series-sort:${state.orderFields.join(",")}`}
              disabled={disabled || availableSortOptions.length === 0}
              onValueChange={addOrderField}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Add sort field…" />
              </SelectTrigger>
              <SelectContent>
                {availableSortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="text-xs">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {state.orderFields.length ? (
              <div className="flex flex-wrap gap-1 pt-1">
                {state.orderFields.map((field, index) => {
                  const label =
                    POLYMARKET_SERIES_SORT_OPTIONS.find((option) => option.value === field)?.label ||
                    field;
                  return (
                    <span
                      key={`${field}:${index}`}
                      className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background px-2 py-0.5 text-[10px] text-foreground"
                    >
                      <span className="text-muted-foreground">{index + 1}.</span>
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

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-[11px] text-foreground">Series slugs</Label>
              <Input
                className="h-8 text-xs"
                disabled={disabled}
                value={state.slugs.join(", ")}
                placeholder="slug-a, slug-b"
                onChange={(event) => patch({ slugs: listInput(event.target.value) })}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] text-foreground">Category labels</Label>
              <Input
                className="h-8 text-xs"
                disabled={disabled}
                value={state.categoryLabels.join(", ")}
                placeholder="Politics, Sports"
                onChange={(event) => patch({ categoryLabels: listInput(event.target.value) })}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] text-foreground">Category IDs</Label>
              <Input
                className="h-8 text-xs"
                disabled={disabled}
                value={state.categoryIds.join(", ")}
                placeholder="1, 2, 3"
                onChange={(event) => patch({ categoryIds: listInput(event.target.value) })}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] text-foreground">Recurrence</Label>
              <Select
                disabled={disabled}
                value={state.recurrence || "__any__"}
                onValueChange={(value) => patch({ recurrence: value === "__any__" ? "" : value })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  {POLYMARKET_SERIES_RECURRENCE_OPTIONS.map((option) => (
                    <SelectItem
                      key={option.value || "__any__"}
                      value={option.value || "__any__"}
                      className="text-xs"
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            {[
              { key: "includeChat", label: "Include chat" },
              { key: "closed", label: "Closed" },
              { key: "excludeEvents", label: "Exclude events" },
            ].map((row) => (
              <label
                key={row.key}
                className="flex items-center justify-between gap-2 rounded-md border border-border/40 bg-background/60 px-2 py-1.5"
              >
                <span className="text-[11px] font-medium text-foreground">{row.label}</span>
                <Switch
                  checked={state[row.key] === true}
                  disabled={disabled}
                  onCheckedChange={(value) => setTriBool(row.key, !!value)}
                  className="scale-90"
                />
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

