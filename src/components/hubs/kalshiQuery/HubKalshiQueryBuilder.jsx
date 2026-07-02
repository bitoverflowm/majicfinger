"use client";

import { useCallback, useMemo, useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";

import { KalshiPowerToolsSearch } from "@/components/connectData/KalshiPowerToolsSearch";
import { RunForYourselfAuthModal } from "@/components/runYourself/RunForYourselfAuthModal";
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
import { KALSHI_CONNECT_DATA_SOURCES } from "@/config/dataLakeParquetSamples";
import useSWR from "swr";
import { userSwrFetcher } from "@/lib/hooks";
import { getConnectDataLakeConfig } from "@/lib/connectQueryComposeConfig";
import { getKalshiConnectColumnsForSample } from "@/lib/kalshiConnectColumns";
import {
  buildHubQueryDashboardUrl,
  navigateToHubQueryDashboard,
  normalizeHubQueryDraft,
  saveHubQueryDraft,
} from "@/lib/hubs/hubQueryDraft";
import { inferPageNameFromPath } from "@/lib/analytics/sessionStartMeta";
import { cn } from "@/lib/utils";

const LAKE_CONFIG = getConnectDataLakeConfig("kalshiHistorical");

function getColumnLabel(col) {
  if (LAKE_CONFIG?.getColumnDisplayLabel) return LAKE_CONFIG.getColumnDisplayLabel(col);
  return col?.label || col?.name || "";
}

function genFilterId() {
  return `hub-w-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function ColumnDefinitionsPanel({ columns, getDisplayLabel, showAll = false }) {
  if (!columns?.length) return null;
  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
      <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Column definitions ({columns.length})
      </p>
      <ul
        className={cn(
          "space-y-2",
          !showAll && "max-h-[min(20rem,40vh)] overflow-y-auto",
        )}
      >
        {columns.map((col) => (
          <li
            key={col.name}
            className="border-b border-border/40 pb-2 last:border-0 last:pb-0"
          >
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="text-sm font-medium text-foreground">{getDisplayLabel(col)}</span>
              <span className="text-xs text-muted-foreground">{col.type}</span>
            </div>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{col.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HubKalshiQueryBuilder({ embedded = false }) {
  const { data: user, isLoading: userLoading } = useSWR("/api/user", userSwrFetcher);
  const isLoggedIn = !!user;
  const [authOpen, setAuthOpen] = useState(false);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [error, setError] = useState(null);

  const [sampleId, setSampleId] = useState("");
  const [hoveredSampleId, setHoveredSampleId] = useState("");
  const [columnSelections, setColumnSelections] = useState({});
  const [whereFilters, setWhereFilters] = useState([]);
  const [sheetName, setSheetName] = useState("");

  const columns = useMemo(
    () => (sampleId ? getKalshiConnectColumnsForSample(sampleId) : []),
    [sampleId],
  );
  const selectedColumns = columnSelections[sampleId] || [];
  const selectedSet = new Set(selectedColumns);
  const hoverPreviewColumns = hoveredSampleId
    ? getKalshiConnectColumnsForSample(hoveredSampleId)
    : [];

  const toggleColumn = useCallback(
    (name) => {
      if (!sampleId) return;
      setColumnSelections((prev) => {
        const current = prev[sampleId] || [];
        const next = current.includes(name)
          ? current.filter((c) => c !== name)
          : [...current, name];
        return { ...prev, [sampleId]: next };
      });
    },
    [sampleId],
  );

  const selectAllColumns = useCallback(() => {
    if (!sampleId) return;
    setColumnSelections((prev) => ({
      ...prev,
      [sampleId]: columns.map((c) => c.name),
    }));
  }, [sampleId, columns]);

  const clearColumns = useCallback(() => {
    if (!sampleId) return;
    setColumnSelections((prev) => ({ ...prev, [sampleId]: [] }));
  }, [sampleId]);

  const handleSelectSource = useCallback((id) => {
    setSampleId(id);
    setWhereFilters([]);
    setError(null);
  }, []);

  const handlePowerSearchSelect = useCallback((suggestion) => {
    const id = suggestion.entity === "markets" ? "athena-kal-markets" : "athena-kal-trades";
    const cols = getKalshiConnectColumnsForSample(id).map((c) => c.name);
    setSampleId(id);
    setColumnSelections((prev) => ({ ...prev, [id]: cols }));
    setWhereFilters([
      {
        id: genFilterId(),
        column: "ticker",
        kind: "string",
        op: "eq",
        value: suggestion.ticker,
      },
    ]);
    setError(null);
  }, []);

  const addFilter = useCallback(() => {
    const defaultCol = columns[0]?.name || "ticker";
    setWhereFilters((prev) => [
      ...prev,
      {
        id: genFilterId(),
        column: defaultCol,
        kind: "string",
        op: "eq",
        value: "",
      },
    ]);
  }, [columns]);

  const updateFilter = useCallback((id, patch) => {
    setWhereFilters((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }, []);

  const removeFilter = useCallback((id) => {
    setWhereFilters((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const buildDraft = useCallback(() => {
    const sourceHubPath =
      typeof window !== "undefined" ? window.location.pathname || "" : "";
    return normalizeHubQueryDraft({
      sampleId,
      columnSelections,
      whereFilters: whereFilters.filter((f) => String(f.value ?? "").trim()),
      pendingSheetName: sheetName.trim() || undefined,
      sourceHubPath: sourceHubPath || undefined,
      sourceHubName: sourceHubPath ? inferPageNameFromPath(sourceHubPath) : undefined,
    });
  }, [sampleId, columnSelections, whereFilters, sheetName]);

  const continueToDashboard = useCallback(async () => {
    const draft = buildDraft();
    if (!draft) {
      setError("Select Markets or Trades and at least one column.");
      return;
    }

    saveHubQueryDraft(draft);
    setSubmitBusy(true);
    setError(null);

    try {
      navigateToHubQueryDashboard(buildHubQueryDashboardUrl());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitBusy(false);
    }
  }, [buildDraft]);

  const handleSubmit = useCallback(() => {
    if (userLoading) return;

    const draft = buildDraft();
    if (!draft) {
      setError("Select Markets or Trades and at least one column.");
      return;
    }
    saveHubQueryDraft(draft);

    if (isLoggedIn) {
      void continueToDashboard();
      return;
    }

    setAuthOpen(true);
  }, [buildDraft, userLoading, isLoggedIn, continueToDashboard]);

  return (
    <>
      <div
        className={cn(
          "relative z-20 w-full space-y-8 bg-background",
          embedded
            ? "px-4 py-6 md:px-6 md:py-8"
            : "border-y border-border px-6 py-8 md:px-8 md:py-10",
        )}
      >
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">Get Kalshi Historical Data Now:</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Choose Markets or Trades, pick columns, add filters, then run your query in Lychee.
          </p>
        </div>

        <div className="space-y-3">
          <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Data source
          </Label>
          <div className="grid gap-3 sm:grid-cols-2">
            {KALSHI_CONNECT_DATA_SOURCES.map((source) => {
              const isSelected = sampleId === source.sampleId;
              const isHovered = hoveredSampleId === source.sampleId;
              return (
                <button
                  key={source.sampleId}
                  type="button"
                  onClick={() => handleSelectSource(source.sampleId)}
                  onMouseEnter={() => setHoveredSampleId(source.sampleId)}
                  onMouseLeave={() => setHoveredSampleId("")}
                  className={cn(
                    "rounded-xl border p-4 text-left transition-all",
                    isSelected
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : isHovered
                        ? "border-border bg-muted/30"
                        : "border-border/60 bg-background hover:border-border hover:bg-muted/20",
                  )}
                >
                  <span className="text-sm font-semibold text-foreground">{source.title}</span>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {source.description}
                  </p>
                </button>
              );
            })}
          </div>
          {!sampleId && hoveredSampleId ? (
            <ColumnDefinitionsPanel
              columns={hoverPreviewColumns}
              getDisplayLabel={getColumnLabel}
              showAll
            />
          ) : null}
        </div>

        {!sampleId ? (
          <div className="space-y-3">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Or search for a market
            </Label>
            <KalshiPowerToolsSearch onSelect={handlePowerSearchSelect} />
          </div>
        ) : null}

        {sampleId ? (
          <>
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Columns
                </Label>
                <div className="flex gap-1">
                  <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={selectAllColumns}>
                    Select all
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={clearColumns}>
                    Clear
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      setSampleId("");
                      setWhereFilters([]);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
              <ul className="grid gap-2 sm:grid-cols-2">
                {columns.map((col) => {
                  const isSelected = selectedSet.has(col.name);
                  return (
                    <li key={col.name}>
                      <button
                        type="button"
                        onClick={() => toggleColumn(col.name)}
                        className={cn(
                          "flex w-full items-start gap-3 rounded-lg border px-3 py-3 text-left transition-colors",
                          isSelected
                            ? "border-primary/40 bg-primary/5"
                            : "border-border/60 bg-background hover:bg-muted/20",
                        )}
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                            isSelected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background",
                          )}
                        >
                          {isSelected ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : null}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                            <span className="text-sm font-medium text-foreground">
                              {getColumnLabel(col)}
                            </span>
                            <span className="text-[11px] text-muted-foreground">{col.type}</span>
                          </span>
                          <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                            {col.description}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Filters (optional)
                </Label>
                <Button type="button" variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={addFilter}>
                  <Plus className="h-3.5 w-3.5" />
                  Add filter
                </Button>
              </div>
              {whereFilters.length === 0 ? (
                <p className="text-sm text-muted-foreground">No filters — query returns up to the row limit.</p>
              ) : (
                <ul className="space-y-3">
                  {whereFilters.map((filter) => (
                    <li
                      key={filter.id}
                      className="flex flex-wrap items-end gap-2 rounded-lg border border-border/60 bg-background p-3"
                    >
                      <div className="min-w-[8rem] flex-1">
                        <Label className="text-[10px] text-muted-foreground">Column</Label>
                        <Select
                          value={filter.column}
                          onValueChange={(v) => updateFilter(filter.id, { column: v })}
                        >
                          <SelectTrigger className="h-9 mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {columns.map((col) => (
                              <SelectItem key={col.name} value={col.name}>
                                {getColumnLabel(col)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-28">
                        <Label className="text-[10px] text-muted-foreground">Operator</Label>
                        <Select
                          value={filter.op}
                          onValueChange={(v) => updateFilter(filter.id, { op: v })}
                        >
                          <SelectTrigger className="h-9 mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="eq">equals</SelectItem>
                            <SelectItem value="contains">contains</SelectItem>
                            <SelectItem value="gt">greater than</SelectItem>
                            <SelectItem value="lt">less than</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="min-w-[8rem] flex-1">
                        <Label className="text-[10px] text-muted-foreground">Value</Label>
                        <Input
                          className="h-9 mt-1"
                          value={filter.value}
                          onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                          placeholder="Filter value"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0 text-muted-foreground"
                        onClick={() => removeFilter(filter.id)}
                        aria-label="Remove filter"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="hub-sheet-name" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Sheet name (optional)
              </Label>
              <Input
                id="hub-sheet-name"
                value={sheetName}
                onChange={(e) => setSheetName(e.target.value)}
                placeholder="e.g. high_volume_markets"
                className="max-w-md"
              />
            </div>
          </>
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex justify-end border-t border-border/60 pt-6">
          <div className="flex flex-col items-center gap-2">
            <Button
              type="button"
              size="lg"
              className="rounded-full px-8"
              disabled={submitBusy || userLoading || !sampleId || selectedColumns.length === 0}
              onClick={handleSubmit}
            >
              {submitBusy ? "Starting…" : userLoading ? "Loading…" : isLoggedIn ? "Run query" : "Run for Free"}
            </Button>
            {!isLoggedIn ? (
              <p className="text-xs text-muted-foreground">No credit card required</p>
            ) : null}
          </div>
        </div>
      </div>

      <RunForYourselfAuthModal
        open={authOpen}
        onOpenChange={setAuthOpen}
        onAuthenticated={() => void continueToDashboard()}
      />
    </>
  );
}
