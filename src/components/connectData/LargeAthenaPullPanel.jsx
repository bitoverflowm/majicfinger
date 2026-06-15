"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FileJson, Table2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConnectProgressWithLabel } from "@/components/integrationsView/integrationPlayground/integrations/polymarketHistorical/ConnectProgressWithLabel";
import { rawAthenaRowsSliceToObjects } from "@/lib/dataLake/largeAthenaPull";

const JSON_INITIAL_ROWS = 40;
const JSON_CHUNK_ROWS = 160;

/**
 * Large Athena pull: paginated raw JSON browse + table-prepare progress.
 *
 * @param {{
 *   columns: string[];
 *   rows: string[][];
 *   rowCount: number;
 *   parseStatus: "downloading" | "raw" | "parsing" | "ready" | "error";
 *   parsedProgress?: { processed: number; total: number };
 *   parseError?: string | null;
 *   progressLabel?: string;
 *   progressPct?: number;
 *   onViewDataTable?: () => void;
 *   className?: string;
 * }} props
 */
export function LargeAthenaPullPanel({
  columns,
  rows,
  rowCount,
  parseStatus,
  parsedProgress,
  parseError,
  progressLabel = "",
  progressPct = 0,
  onViewDataTable,
  className = "",
}) {
  const [visibleRows, setVisibleRows] = useState(JSON_INITIAL_ROWS);
  const [appending, setAppending] = useState(false);

  useEffect(() => {
    setVisibleRows(JSON_INITIAL_ROWS);
    setAppending(false);
  }, [columns, rows]);

  const total = rowCount || (Array.isArray(rows) ? rows.length : 0);
  const loadedCount = Math.min(visibleRows, total);
  const jsonLoadPct = total ? Math.round((loadedCount / total) * 100) : 100;

  const visibleObjects = useMemo(() => {
    if (!Array.isArray(columns) || !Array.isArray(rows) || loadedCount <= 0) return [];
    return rawAthenaRowsSliceToObjects(columns, rows, 0, loadedCount);
  }, [columns, rows, loadedCount]);

  const loadMore = useCallback(() => {
    if (appending || loadedCount >= total) return;
    setAppending(true);
    window.setTimeout(() => {
      setVisibleRows((prev) => Math.min(total, prev + JSON_CHUNK_ROWS));
      setAppending(false);
    }, 0);
  }, [appending, loadedCount, total]);

  const handleScroll = useCallback(
    (event) => {
      const el = event.currentTarget;
      if (!el || loadedCount >= total) return;
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 120) {
        loadMore();
      }
    },
    [loadMore, loadedCount, total],
  );

  const tableReady = parseStatus === "ready";
  const isDownloading = parseStatus === "downloading";
  const tableParsing = parseStatus === "parsing" || parseStatus === "raw";
  const hasRawRows = Array.isArray(rows) && rows.length > 0;
  const parsePct =
    parsedProgress?.total > 0
      ? Math.round((parsedProgress.processed / parsedProgress.total) * 100)
      : 0;

  if (isDownloading) {
    return (
      <div className={`space-y-3 rounded-lg border border-border/70 bg-muted/20 p-3 ${className}`}>
        <div className="space-y-0.5">
          <p className="text-sm font-medium">
            Large result expected
            {rowCount > 0 ? ` — up to ${rowCount.toLocaleString()} rows` : ""}
          </p>
          <p className="text-[11px] text-muted-foreground leading-snug">
            Athena finished. Downloading rows — JSON browse will appear as soon as data arrives in the browser.
          </p>
        </div>
        <ConnectProgressWithLabel
          label={progressLabel || "Downloading rows from Athena…"}
          progress={Math.max(progressPct, 15)}
          className="w-full min-w-0"
        />
      </div>
    );
  }

  return (
    <div className={`space-y-3 rounded-lg border border-border/70 bg-muted/20 p-3 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-0.5 min-w-0">
          <p className="text-sm font-medium">Large result — {total.toLocaleString()} rows</p>
          <p className="text-[11px] text-muted-foreground leading-snug">
            {tableReady
              ? "Data table is ready. Browse JSON below or open the spreadsheet view."
              : "Data received in memory. Browse JSON below while the data table prepares in the background."}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          className="h-8 text-xs shrink-0"
          disabled={!tableReady}
          onClick={() => onViewDataTable?.()}
        >
          <Table2 className="h-3.5 w-3.5 mr-1.5" aria-hidden />
          View data table
        </Button>
      </div>

      {tableParsing ? (
        <ConnectProgressWithLabel
          label={
            progressLabel ||
            (parsedProgress?.total
              ? `Preparing data table… ${parsedProgress.processed.toLocaleString()} / ${parsedProgress.total.toLocaleString()} rows (${parsePct}%)`
              : "Preparing data table…")
          }
          progress={Math.max(progressPct, Math.min(99, 20 + parsePct * 0.75))}
          className="w-full min-w-0"
        />
      ) : null}

      {parseStatus === "error" && parseError ? (
        <p className="text-xs text-destructive">{parseError}</p>
      ) : null}

      {tableReady ? (
        <ConnectProgressWithLabel label="Data table ready" progress={100} className="w-full min-w-0" />
      ) : null}

      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
          <FileJson className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Browse data (JSON)
        </div>
        {hasRawRows ? (
          <>
            <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
              <span>
                Showing {loadedCount.toLocaleString()} of {total.toLocaleString()} rows
              </span>
              <span>{jsonLoadPct}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-slate-900 transition-[width] duration-200 dark:bg-slate-100"
                style={{ width: `${jsonLoadPct}%` }}
              />
            </div>
          </>
        ) : (
          <p className="text-[10px] text-muted-foreground">Waiting for row data…</p>
        )}
      </div>

      {hasRawRows ? (
      <pre
        className="max-h-[min(42dvh,360px)] overflow-auto rounded-md border border-border/60 bg-background/80 p-3 text-[11px] leading-snug font-mono whitespace-pre break-words"
        onScroll={handleScroll}
      >
        {`[\n`}
        {visibleObjects.map((row, idx) => {
          let text = "";
          try {
            text = JSON.stringify(row, null, 2)
              .split("\n")
              .map((line) => `  ${line}`)
              .join("\n");
          } catch (e) {
            text = `  ${JSON.stringify({ error: "Could not serialize row", detail: String(e?.message || e) })}`;
          }
          const hasMore = idx < visibleObjects.length - 1;
          return `${text}${hasMore ? "," : ""}\n`;
        })}
        {`]${loadedCount < total ? ",\n  …" : ""}`}
      </pre>
      ) : null}

      {hasRawRows ? (
      <p className="text-[10px] text-muted-foreground min-h-4">
        {appending
          ? "Loading more JSON rows…"
          : loadedCount < total
            ? `${(total - loadedCount).toLocaleString()} more row${total - loadedCount === 1 ? "" : "s"} available — scroll to load.`
            : "All rows are available in JSON view (paginated for performance)."}
      </p>
      ) : null}
    </div>
  );
}
