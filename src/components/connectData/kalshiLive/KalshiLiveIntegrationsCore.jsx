"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Plus, Trash2 } from "lucide-react";

import { KalshiLiveConnectionStatusDot } from "@/components/connectData/KalshiLiveConnectionStatusDot";
import { KalshiLiveTimestampPicker } from "@/components/connectData/kalshiLive/KalshiLiveTimestampPicker";
import { KalshiPowerToolsSearch } from "@/components/connectData/KalshiPowerToolsSearch";
import { ConnectQueryComposeRunBar } from "@/components/connectData/ConnectQueryComposeRunBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMyStateV2 } from "@/context/stateContextV2";
import {
  KALSHI_LIVE_CONNECT_CONFIG,
  KALSHI_LIVE_DEFAULT_LIMIT,
} from "@/config/kalshiLiveConnect";
import { validateKalshiLiveMarketFilters } from "@/lib/kalshiLive/marketFilterRules";
import {
  KALSHI_LIVE_MARKET_STATUS_OPTIONS,
  KALSHI_LIVE_TIMESTAMP_FILTER_FIELDS,
} from "@/lib/kalshiLive/marketsColumns";
import { applyKalshiLivePowerSearchSelection } from "@/lib/kalshiLivePowerSearchPull";
import { useDemoProGate } from "@/hooks/useDemoProGate";
import { cn } from "@/lib/utils";

function genFilterId() {
  return `kl-f-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

/**
 * Kalshi Live compose UI for Connect home (power search above endpoints; API filters, not SQL).
 */
export function KalshiLiveIntegrationsCore({
  onRunPull,
  className,
}) {
  const ctx = useMyStateV2() ?? {};
  const { workspaceWriteLocked, requestProUpgrade, dialog: demoProDialog } = useDemoProGate();

  const runKalshiLiveAction = useCallback(
    (action) => {
      if (workspaceWriteLocked) {
        requestProUpgrade("Kalshi Live", {
          title: "Upgrade to unlock",
          description:
            "Saving, data pulls, uploads, and integrations require an active paid plan (or lifetime access).",
        });
        return;
      }
      if (typeof action === "function") action();
    },
    [workspaceWriteLocked, requestProUpgrade],
  );
  const {
    connectKalshiLiveEndpointId = "",
    setConnectKalshiLiveEndpointId,
    connectKalshiLiveColumnSelections = {},
    setConnectKalshiLiveColumnSelections,
    connectKalshiLiveFilters = [],
    setConnectKalshiLiveFilters,
    connectKalshiLiveLimit = KALSHI_LIVE_DEFAULT_LIMIT,
    setConnectKalshiLiveLimit,
    connectKalshiLiveTickers = "",
    setConnectKalshiLiveTickers,
    kalshiLivePingState = "idle",
    pingKalshiLiveExchange,
    connectDataLakePullState,
  } = ctx;

  const [filterError, setFilterError] = useState(null);
  const endpoints = KALSHI_LIVE_CONNECT_CONFIG.endpoints;
  const selectedId = connectKalshiLiveEndpointId;
  const columns = useMemo(
    () => (selectedId ? KALSHI_LIVE_CONNECT_CONFIG.getColumnsForEndpoint(selectedId) : []),
    [selectedId],
  );
  const selectedColumns = connectKalshiLiveColumnSelections[selectedId] || [];
  const selectedSet = new Set(selectedColumns);
  const pullLoading = !!connectDataLakePullState?.loading;

  useEffect(() => {
    if (kalshiLivePingState !== "idle") return;
    pingKalshiLiveExchange?.();
  }, [kalshiLivePingState, pingKalshiLiveExchange]);

  const filterValidation = useMemo(
    () => validateKalshiLiveMarketFilters(connectKalshiLiveFilters),
    [connectKalshiLiveFilters],
  );

  useEffect(() => {
    setFilterError(filterValidation);
  }, [filterValidation]);

  const handleSelectEndpoint = useCallback(
    (id) => {
      setConnectKalshiLiveEndpointId?.(id);
      setConnectKalshiLiveTickers?.("");
      setFilterError(null);
      if (kalshiLivePingState === "idle") pingKalshiLiveExchange?.();
    },
    [
      setConnectKalshiLiveEndpointId,
      setConnectKalshiLiveTickers,
      kalshiLivePingState,
      pingKalshiLiveExchange,
    ],
  );

  const handleClearEndpoint = useCallback(() => {
    setConnectKalshiLiveEndpointId?.("");
    setFilterError(null);
  }, [setConnectKalshiLiveEndpointId]);

  const patchColumns = useCallback(
    (updater) => {
      if (!selectedId) return;
      setConnectKalshiLiveColumnSelections?.((prev) => {
        const current = prev?.[selectedId] || [];
        const next = updater(current);
        if (next === current) return prev ?? {};
        return { ...(prev || {}), [selectedId]: next };
      });
    },
    [selectedId, setConnectKalshiLiveColumnSelections],
  );

  const addStatusFilter = useCallback(() => {
    setConnectKalshiLiveFilters?.((prev) => {
      const list = Array.isArray(prev) ? prev : [];
      if (list.some((f) => f.kind === "status")) return prev;
      return [
        ...list,
        { id: genFilterId(), kind: "status", field: "status", value: "open" },
      ];
    });
  }, [setConnectKalshiLiveFilters]);

  const addTimestampFilter = useCallback((field) => {
    setConnectKalshiLiveFilters?.((prev) => {
      const list = Array.isArray(prev) ? prev : [];
      if (list.some((f) => f.kind === "timestamp" && f.field === field)) return prev;
      return [
        ...list,
        { id: genFilterId(), kind: "timestamp", field, value: "" },
      ];
    });
  }, [setConnectKalshiLiveFilters]);

  const updateFilter = useCallback(
    (id, patch) => {
      setConnectKalshiLiveFilters?.((prev) =>
        (prev || []).map((f) => (f.id === id ? { ...f, ...patch } : f)),
      );
    },
    [setConnectKalshiLiveFilters],
  );

  const removeFilter = useCallback(
    (id) => {
      setConnectKalshiLiveFilters?.((prev) => (prev || []).filter((f) => f.id !== id));
    },
    [setConnectKalshiLiveFilters],
  );

  const handlePowerSearch = useCallback(
    (suggestion) => {
      runKalshiLiveAction(() => applyKalshiLivePowerSearchSelection(ctx, suggestion));
    },
    [ctx, runKalshiLiveAction],
  );

  const handleRun = useCallback(() => {
    if (filterValidation) {
      setFilterError(filterValidation);
      return;
    }
    runKalshiLiveAction(() => onRunPull?.());
  }, [filterValidation, onRunPull, runKalshiLiveAction]);

  const getDisplayLabel = KALSHI_LIVE_CONNECT_CONFIG.getColumnDisplayLabel;

  return (
    <div className={cn("space-y-3", className)}>
      <KalshiPowerToolsSearch
        onSelect={handlePowerSearch}
        disabled={pullLoading}
        suggestionsApiPath="/api/integrations/kalshi-live/search/suggestions"
        entityTagLabel="Market"
        parameterMode="market_search"
      />

      <div className={cn("space-y-3", selectedId ? "mt-5" : "mt-6")}>
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-foreground">Pick one</h2>
          <div className="mt-0.5 flex items-center justify-between gap-3">
            <p className="text-[11px] leading-snug text-muted-foreground">
              Choose an endpoint, columns, and API filters
            </p>
            {selectedId ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearEndpoint}
                className="h-auto shrink-0 px-0 py-0 text-[11px] font-normal text-muted-foreground hover:bg-transparent hover:text-foreground"
              >
                Cancel
              </Button>
            ) : null}
          </div>
        </div>

        <motion.div layout className={cn("grid gap-3", selectedId ? "grid-cols-1" : "sm:grid-cols-2")}>
          <AnimatePresence initial={false} mode="popLayout">
            {endpoints
              .filter((ep) => !selectedId || selectedId === ep.id)
              .map((ep) => {
                const isSelected = selectedId === ep.id;
                return (
                  <motion.div
                    key={ep.id}
                    layout
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectEndpoint(ep.id)}
                      className={cn(
                        "relative flex w-full min-h-[5.5rem] flex-col rounded-xl border p-4 text-left transition-all duration-200",
                        isSelected
                          ? "border-primary bg-muted/40 shadow-sm ring-2 ring-primary/25"
                          : "border-border/60 bg-card hover:border-border hover:bg-muted/25 hover:shadow-md",
                      )}
                    >
                      {isSelected ? (
                        <KalshiLiveConnectionStatusDot
                          state={kalshiLivePingState}
                          size="sm"
                          className="absolute right-3 top-3"
                        />
                      ) : null}
                      <span className="pr-6 text-sm font-semibold tracking-tight text-foreground">
                        {ep.title}
                      </span>
                      <span className="mt-1 text-xs leading-snug text-muted-foreground">
                        {ep.description}
                      </span>
                    </button>
                  </motion.div>
                );
              })}
          </AnimatePresence>
        </motion.div>

        <AnimatePresence>
          {selectedId ? (
            <motion.div
              key="markets-compose"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 space-y-4"
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-xs font-semibold tracking-tight text-foreground">
                    Select which columns you are interested in pulling
                  </h2>
                  <div className="flex shrink-0 gap-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-[11px] font-normal"
                      onClick={() =>
                        patchColumns(() => columns.map((c) => c.name))
                      }
                      disabled={selectedColumns.length === columns.length}
                    >
                      Select all
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-[11px] font-normal"
                      onClick={() => patchColumns(() => [])}
                      disabled={selectedColumns.length === 0}
                    >
                      Deselect all
                    </Button>
                  </div>
                </div>
                <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                  {columns.map((col) => {
                    const isSelected = selectedSet.has(col.name);
                    return (
                      <li key={col.name}>
                        <div
                          className={cn(
                            "flex h-[2.625rem] w-full gap-1 rounded-md border px-2 py-1 transition-colors",
                            isSelected
                              ? "border-primary/35 bg-primary/5"
                              : "border-border/50 bg-card hover:border-border hover:bg-muted/15",
                          )}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              patchColumns((cur) =>
                                isSelected
                                  ? cur.filter((n) => n !== col.name)
                                  : [...cur, col.name],
                              )
                            }
                            className={cn(
                              "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border",
                              isSelected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border/80 bg-background",
                            )}
                          >
                            {isSelected ? (
                              <Check className="h-2.5 w-2.5" strokeWidth={2.5} />
                            ) : null}
                          </button>
                          <button
                            type="button"
                            className="min-w-0 flex-1 text-left"
                            onClick={() =>
                              !isSelected &&
                              patchColumns((cur) => [...cur, col.name])
                            }
                          >
                            <span className="truncate text-[11px] font-medium text-foreground">
                              {getDisplayLabel(col)}
                            </span>
                            <span className="ml-1 text-[9px] text-muted-foreground">{col.type}</span>
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="space-y-2 rounded-lg border border-border/50 bg-muted/10 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label className="text-xs text-muted-foreground">Query</Label>
                  <div className="flex flex-col items-end gap-0.5">
                    <div className="flex items-center gap-2">
                      <Label className="text-[10px] text-muted-foreground">Max rows</Label>
                      <Input
                        type="number"
                        min={1}
                        max={1000}
                        className="h-7 w-24 text-[11px]"
                        value={connectKalshiLiveLimit}
                        onChange={(e) => {
                          const n = Math.floor(Number(e.target.value));
                          setConnectKalshiLiveLimit?.(
                            Number.isFinite(n)
                              ? Math.min(1000, Math.max(1, n))
                              : KALSHI_LIVE_DEFAULT_LIMIT,
                          );
                        }}
                      />
                    </div>
                    <p className="text-[10px] leading-snug text-muted-foreground">
                      Total markets to load (paginates until this cap).
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" variant="outline" size="sm" className="h-8 gap-1 text-xs">
                        <Plus className="h-3.5 w-3.5" />
                        Where
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      <DropdownMenuLabel className="text-xs">Filter by</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-xs"
                        onSelect={(e) => {
                          e.preventDefault();
                          addStatusFilter();
                        }}
                      >
                        Status
                      </DropdownMenuItem>
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="text-xs">Timestamp</DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="max-h-[280px] overflow-y-auto">
                          {KALSHI_LIVE_TIMESTAMP_FILTER_FIELDS.map((f) => (
                            <DropdownMenuItem
                              key={f.id}
                              className="text-xs"
                              onSelect={(e) => {
                                e.preventDefault();
                                addTimestampFilter(f.id);
                              }}
                            >
                              {f.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {connectKalshiLiveTickers ? (
                    <span className="text-[10px] text-muted-foreground">
                      ticker: <span className="font-mono text-foreground">{connectKalshiLiveTickers}</span>
                      <button
                        type="button"
                        className="ml-1 text-primary hover:underline"
                        onClick={() => setConnectKalshiLiveTickers?.("")}
                      >
                        clear
                      </button>
                    </span>
                  ) : null}
                </div>

                {connectKalshiLiveFilters.length > 0 ? (
                  <ul className="space-y-2">
                    {connectKalshiLiveFilters.map((f) => (
                      <li
                        key={f.id}
                        className="flex flex-wrap items-end gap-2 rounded-md border border-border/40 bg-background p-2"
                      >
                        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          {f.kind === "status" ? "status" : f.field}
                        </span>
                        {f.kind === "status" ? (
                          <Select
                            value={String(f.value || "__any__")}
                            onValueChange={(v) =>
                              updateFilter(f.id, { value: v === "__any__" ? "" : v })
                            }
                          >
                            <SelectTrigger className="h-8 w-36 text-xs">
                              <SelectValue placeholder="Any status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__any__" className="text-xs">
                                Any
                              </SelectItem>
                              {KALSHI_LIVE_MARKET_STATUS_OPTIONS.map((s) => (
                                <SelectItem key={s} value={s} className="text-xs">
                                  {s}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <KalshiLiveTimestampPicker
                            value={f.value}
                            onChange={(unix) => updateFilter(f.id, { value: unix })}
                            className="min-w-[12rem] flex-1"
                          />
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          aria-label="Remove filter"
                          onClick={() => removeFilter(f.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[11px] text-muted-foreground">No filters — returns up to your limit per page.</p>
                )}

                {filterError ? (
                  <p className="text-[11px] text-destructive" role="alert">
                    {filterError}
                  </p>
                ) : null}
              </div>

              <ConnectQueryComposeRunBar
                selectedCount={selectedColumns.length}
                onRun={handleRun}
                runLabel="Run pull"
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
      {demoProDialog}
    </div>
  );
}
