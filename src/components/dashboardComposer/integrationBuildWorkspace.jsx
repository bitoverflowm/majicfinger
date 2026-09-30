"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronDown, History } from "lucide-react";
import { IntegrationBuildGrid } from "@/components/dashboardComposer/integrationBuildGrid";
import {
  BUILD_SOURCES,
  loadBuildPreview,
  loadBuildUniverseCount,
  peekBuildUniverseCount,
  readSavedSearches,
  saveSearch,
  usesExactUniverse,
} from "@/components/dashboardComposer/integrationBuildCatalog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useMyStateV2 } from "@/context/stateContextV2";
import { getHistoricalPullRowLimit } from "@/lib/athenaEntitlement";
import { listConnectHomeSheetHistory, requestCardSummaryLabel } from "@/lib/connectHomeRequestHistory";
import { useUser } from "@/lib/hooks";
import { cn } from "@/lib/utils";

function humanHistoryLabel(label) {
  return String(label || "")
    .replace(/\b(select|where|from|group by|order by)\b/gi, "")
    .replace(/\s+/g, " ")
    .replace(/\s·\s·/g, " · ")
    .trim();
}

function SkeletonRows() {
  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm">
      {Array.from({ length: 10 }, (_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 border-b border-border/40 px-3 py-3 last:border-0"
          style={{ animationDelay: `${index * 70}ms` }}
        >
          <span className="w-6 text-[12px] text-muted-foreground">{index + 1}</span>
          <span className="h-3 w-[38%] animate-pulse rounded bg-muted" style={{ animationDelay: `${index * 70}ms` }} />
          <span className="h-3 w-[18%] animate-pulse rounded bg-muted" style={{ animationDelay: `${index * 90}ms` }} />
          <span className="h-3 flex-1 animate-pulse rounded bg-muted" style={{ animationDelay: `${index * 110}ms` }} />
        </div>
      ))}
    </div>
  );
}

export function IntegrationBuildWorkspace({ integrationId, onBack }) {
  const source = BUILD_SOURCES[integrationId];
  const tables = source?.tables || {};
  const tableIds = Object.keys(tables);
  const ctx = useMyStateV2?.() ?? {};
  const user = useUser();
  const planLimit = user === undefined ? null : getHistoricalPullRowLimit(user);
  const [tableId, setTableId] = useState(source?.defaultTable || tableIds[0]);
  const [pull, setPull] = useState(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(8);
  const [error, setError] = useState("");
  const [hidden, setHidden] = useState(() => new Set());
  const [filterColumn, setFilterColumn] = useState("");
  const [filterValue, setFilterValue] = useState("");
  const [saved, setSaved] = useState(() => readSavedSearches());
  const [visibleCount, setVisibleCount] = useState(0);
  const [universe, setUniverse] = useState(null);
  const [counting, setCounting] = useState(false);

  const table = tables[tableId];
  const exactUniverse = usesExactUniverse(integrationId);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    setError("");
    setProgress(12);
    setPull(null);
    setVisibleCount(0);
    setFilterValue("");
    setUniverse(null);
    setCounting(usesExactUniverse(integrationId));
    const timer = window.setInterval(() => {
      setProgress((current) => (current >= 88 ? current : current + Math.random() * 8));
    }, 280);
    loadBuildPreview(integrationId, tableId)
      .then((result) => {
        if (cancel) return;
        setProgress(100);
        setPull(result);
        setHidden(new Set());
        setFilterColumn(result.columns[0]?.id || "");
      })
      .catch((err) => {
        if (!cancel) setError(err instanceof Error ? err.message : "Pull failed");
      })
      .finally(() => {
        window.clearInterval(timer);
        if (!cancel) setLoading(false);
      });
    return () => {
      cancel = true;
      window.clearInterval(timer);
    };
  }, [integrationId, tableId]);

  useEffect(() => {
    if (loading || !pull?.rows) return undefined;
    setVisibleCount(0);
    const timer = window.setInterval(() => {
      setVisibleCount((current) => {
        const next = Math.min(pull.rows.length, current + 4);
        if (next >= pull.rows.length) window.clearInterval(timer);
        return next;
      });
    }, 45);
    return () => window.clearInterval(timer);
  }, [loading, pull]);

  useEffect(() => {
    if (!exactUniverse) {
      setUniverse(null);
      setCounting(false);
      return undefined;
    }
    const query = filterValue.trim();
    const column = (pull?.columns || []).find((item) => item.id === filterColumn);
    if (query && !column) return undefined;
    const narrowed = query && column?.type === "text" ? { column: filterColumn, value: query } : null;
    const known = peekBuildUniverseCount(integrationId, tableId, narrowed);
    if (typeof known === "number") {
      setUniverse(known);
      setCounting(false);
      return undefined;
    }
    let cancel = false;
    setUniverse(null);
    setCounting(true);
    const timer = window.setTimeout(() => {
      loadBuildUniverseCount(integrationId, tableId, narrowed)
        .then((total) => {
          if (!cancel) setUniverse(total);
        })
        .catch(() => {
          if (!cancel) setUniverse(null);
        })
        .finally(() => {
          if (!cancel) setCounting(false);
        });
    }, narrowed ? 350 : 0);
    return () => {
      cancel = true;
      window.clearTimeout(timer);
    };
  }, [exactUniverse, integrationId, tableId, filterColumn, filterValue, pull]);

  const shownColumns = useMemo(
    () =>
      (pull?.columns || [])
        .filter((column) => !hidden.has(column.id))
        .map((column) =>
          integrationId === "kalshiHistorical" &&
          (column.id === "last_price" || column.id === "yes_bid" || column.id === "yes_price")
            ? { ...column, scale: "cents" }
            : column,
        ),
    [pull, hidden, integrationId],
  );

  const filteredRows = useMemo(() => {
    const rows = (pull?.rows || []).slice(0, visibleCount);
    const query = filterValue.trim().toLowerCase();
    if (!query || !filterColumn) return rows;
    return rows.filter((row) => String(row[filterColumn] ?? "").toLowerCase().includes(query));
  }, [pull, visibleCount, filterColumn, filterValue]);

  const history = useMemo(() => {
    const entries = listConnectHomeSheetHistory(ctx?.dataSheets || {});
    const items = [];
    for (const entry of entries) {
      for (const card of entry.cards) {
        const raw = requestCardSummaryLabel(card, entry.sheet);
        const label = humanHistoryLabel(raw);
        if (!label) continue;
        items.push({ id: card.id, label });
      }
    }
    return items.slice(0, 12);
  }, [ctx?.dataSheets]);

  const savedForSource = saved.filter((item) => item.integrationId === integrationId);

  function toggleColumn(id) {
    setHidden((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else if ((pull?.columns.length || 0) - next.size > 1) next.add(id);
      return next;
    });
  }

  function onSave() {
    const entry = {
      id: `${integrationId}:${tableId}:${Date.now()}`,
      integrationId,
      tableId,
      label: table?.label || "Search",
      hidden: [...hidden],
      filterColumn,
      filterValue,
      savedAt: Date.now(),
    };
    setSaved(saveSearch(entry));
  }

  function applySaved(entry) {
    setTableId(entry.tableId);
    setHidden(new Set(entry.hidden || []));
    setFilterColumn(entry.filterColumn || "");
    setFilterValue(entry.filterValue || "");
  }

  const shown = loading ? 0 : filteredRows.length;
  const shownLabel = `Previewing ${shown.toLocaleString()} ${shown === 1 ? "row" : "rows"}`;
  const planClause = typeof planLimit === "number" ? ` · plan limit ${planLimit.toLocaleString()}` : "";
  const previewLine = loading
    ? "Loading the first 50 rows"
    : !exactUniverse
      ? `${shownLabel} of 1,000,000+ rows available${planClause}`
      : typeof universe === "number" && !counting
        ? `${shownLabel} of ${universe.toLocaleString()}${planClause}`
        : counting
          ? `${shownLabel} of …${planClause}`
          : `${shownLabel}. More rows are available.${planClause}`;

  if (!source) return null;

  return (
    <div className="flex min-h-0 flex-1 bg-background">
      <aside className="flex w-[340px] shrink-0 flex-col border-r border-border/70">
        <div className="px-4 pb-3 pt-4 pr-12">
          <button
            type="button"
            onClick={onBack}
            className="mb-2 inline-flex size-8 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted"
            aria-label="Back to integrations"
          >
            <ArrowLeft className="size-4" />
          </button>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            {source.name}. This preview is the first table, the same one shown beside the source list.
          </p>
        </div>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pb-4">
          <div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-xl border border-border/70 bg-background px-3 py-2.5 text-left shadow-sm transition-colors hover:bg-muted/50"
                >
                  <span>
                    <span className="block text-[13px] font-semibold text-foreground">{table?.label}</span>
                    <span className="mt-0.5 block text-[12px] leading-relaxed text-muted-foreground">{table?.description}</span>
                  </span>
                  <ChevronDown className="ml-2 size-4 shrink-0 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="z-[580] w-[300px]">
                {tableIds.map((id) => (
                  <DropdownMenuItem key={id} onSelect={() => setTableId(id)}>
                    <span>
                      <span className="block text-[13px] font-medium">{tables[id].label}</span>
                      <span className="block text-[11px] text-muted-foreground">{tables[id].description}</span>
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-border/70 px-3 py-2 text-[12px] text-muted-foreground transition-colors hover:bg-muted/50"
                >
                  <History className="size-3.5" />
                  Browse past searches
                  <ChevronDown className="size-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="z-[580] w-[300px]">
                <DropdownMenuLabel>Saved searches</DropdownMenuLabel>
                {savedForSource.length ? (
                  savedForSource.map((entry) => (
                    <DropdownMenuItem key={entry.id} onSelect={() => applySaved(entry)}>
                      {entry.label}
                      {entry.filterValue ? ` · ${entry.filterValue}` : ""}
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem disabled>No saved searches yet</DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Earlier pulls</DropdownMenuLabel>
                {history.length ? (
                  history.map((entry) => (
                    <DropdownMenuItem key={entry.id} disabled>
                      {entry.label}
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem disabled>No earlier pulls in this workspace</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <section>
            <p className="mb-2 text-[12px] font-semibold text-foreground">Columns</p>
            <div className="space-y-1.5">
              {(pull?.columns || []).map((column) => (
                <label key={column.id} className="flex items-center gap-2 rounded-lg px-1 py-1 text-[13px]">
                  <Checkbox
                    checked={!hidden.has(column.id)}
                    onCheckedChange={() => toggleColumn(column.id)}
                  />
                  <span className="min-w-0 flex-1 truncate text-foreground">{column.title}</span>
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{column.type}</span>
                </label>
              ))}
            </div>
          </section>

          <section>
            <p className="mb-2 text-[12px] font-semibold text-foreground">Filters</p>
            <p className="mb-2 text-[12px] leading-relaxed text-muted-foreground">
              Keep rows whose column contains this text. This narrows the preview you are looking at.
            </p>
            <div className="space-y-2">
              <select
                value={filterColumn}
                onChange={(event) => setFilterColumn(event.target.value)}
                className="h-9 w-full rounded-lg border border-border/70 bg-background px-2 text-[13px]"
              >
                {(pull?.columns || []).map((column) => (
                  <option key={column.id} value={column.id}>
                    {column.title}
                  </option>
                ))}
              </select>
              <Input
                value={filterValue}
                placeholder="Contains…"
                onChange={(event) => setFilterValue(event.target.value)}
                className="h-9"
              />
            </div>
          </section>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border/70 px-4 py-3">
          <Button type="button" variant="outline" onClick={onSave} disabled={loading || !pull}>
            Save search
          </Button>
          <Button type="button" disabled>
            Next
          </Button>
        </div>
      </aside>

      <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#e6edf3] dark:bg-[#1c232b]">
        <div className="flex items-center justify-between gap-3 px-5 pb-2 pr-12 pt-5">
          <h2 className="text-[15px] font-semibold text-foreground">Preview</h2>
          <p className="text-right text-[12px] text-muted-foreground">{previewLine}</p>
        </div>
        <div className="h-1 w-full bg-black/5 dark:bg-white/10">
          <div
            className={cn("h-full bg-[#0d99ff] transition-[width] duration-300", loading ? "" : "opacity-0")}
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
        <div className="min-h-0 flex-1 p-4">
          {error ? (
            <p className="text-[13px] text-muted-foreground">{error}</p>
          ) : loading ? (
            <SkeletonRows />
          ) : (
            <IntegrationBuildGrid columns={shownColumns} rows={filteredRows} />
          )}
        </div>
      </section>
    </div>
  );
}
