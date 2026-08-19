"use client";

import { useCallback, useMemo, useState } from "react";
import { Braces, Download, Loader2, Table2 } from "lucide-react";
import * as XLSX from "xlsx";

import { useHubPolymarketLiveDemo } from "@/components/hubs/polymarketLiveDemo/HubPolymarketLiveDemoSelection";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ViewMode = "sheet" | "json";

const PREFERRED_COLUMNS = [
  "question",
  "id",
  "conditionId",
  "slug",
  "outcomes",
  "outcomePrices",
  "volume24hr",
  "volume",
  "liquidity",
  "bestBid",
  "bestAsk",
  "lastTradePrice",
  "spread",
  "active",
  "closed",
  "endDate",
];

function cellValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function SheetTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-2 p-3" aria-hidden>
      <div className="h-8 w-full rounded bg-muted/80" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-2">
          <div className="h-7 w-[18%] rounded bg-muted/70" />
          <div className="h-7 w-[22%] rounded bg-muted/60" />
          <div className="h-7 w-[14%] rounded bg-muted/70" />
          <div className="h-7 flex-1 rounded bg-muted/50" />
        </div>
      ))}
    </div>
  );
}

function JsonSkeleton({ lines = 12 }: { lines?: number }) {
  return (
    <div className="animate-pulse space-y-2 px-3 py-3" aria-hidden>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-3 rounded bg-muted/70"
          style={{ width: `${58 + ((i * 17) % 36)}%` }}
        />
      ))}
    </div>
  );
}

export function HubPolymarketLiveDemoMetadataView() {
  const selection = useHubPolymarketLiveDemo();
  const rows = selection?.metadataRows ?? null;
  const loading = selection?.metadataLoading ?? false;
  const error = selection?.metadataError ?? null;
  const [viewMode, setViewMode] = useState<ViewMode>("json");

  const hasData = Boolean(rows?.length);
  const jsonText = useMemo(() => {
    if (!rows) return "";
    return JSON.stringify(rows, null, 2);
  }, [rows]);

  const sheetColumns = useMemo(() => {
    if (!rows?.length) return [] as string[];
    const keys = new Set<string>();
    for (const row of rows) {
      if (!row || typeof row !== "object") continue;
      for (const key of Object.keys(row)) keys.add(key);
    }
    const ordered = PREFERRED_COLUMNS.filter((key) => keys.has(key));
    for (const key of keys) {
      if (!ordered.includes(key)) ordered.push(key);
    }
    return ordered;
  }, [rows]);

  const exportJson = useCallback(() => {
    if (!rows?.length) return;
    downloadBlob(
      new Blob([JSON.stringify(rows, null, 2)], {
        type: "application/json;charset=utf-8;",
      }),
      `polymarket-live-markets-${Date.now()}.json`,
    );
  }, [rows]);

  const exportCsv = useCallback(() => {
    if (!rows?.length || !sheetColumns.length) return;
    const header = sheetColumns.map(escapeCsv).join(",");
    const lines = rows.map((row) =>
      sheetColumns.map((col) => escapeCsv(cellValue(row[col]))).join(","),
    );
    downloadBlob(
      new Blob([[header, ...lines].join("\n")], { type: "text/csv;charset=utf-8;" }),
      `polymarket-live-markets-${Date.now()}.csv`,
    );
  }, [rows, sheetColumns]);

  const exportXlsx = useCallback(() => {
    if (!rows?.length || !sheetColumns.length) return;
    const table = rows.map((row) => {
      const out: Record<string, string> = {};
      for (const col of sheetColumns) out[col] = cellValue(row[col]);
      return out;
    });
    const ws = XLSX.utils.json_to_sheet(table);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Markets");
    XLSX.writeFile(wb, `polymarket-live-markets-${Date.now()}.xlsx`);
  }, [rows, sheetColumns]);

  return (
    <div className="min-h-[12rem] overflow-hidden rounded-xl border border-border/70 bg-muted/20">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
        <p className="text-xs font-medium text-muted-foreground">Market metadata</p>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {loading ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              Loading…
            </span>
          ) : rows ? (
            <span className="text-xs text-muted-foreground">
              {rows.length} market{rows.length === 1 ? "" : "s"}
            </span>
          ) : null}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!hasData}
                className="h-7 gap-1.5 px-2 text-[11px] font-medium text-muted-foreground"
              >
                <Download className="size-3.5" aria-hidden />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[8rem]">
              <DropdownMenuItem className="text-xs" disabled={!hasData} onSelect={exportJson}>
                JSON
              </DropdownMenuItem>
              <DropdownMenuItem className="text-xs" disabled={!hasData} onSelect={exportCsv}>
                CSV
              </DropdownMenuItem>
              <DropdownMenuItem className="text-xs" disabled={!hasData} onSelect={exportXlsx}>
                XLSX
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div
            className="inline-flex h-7 items-center rounded-md border border-border/70 bg-background p-0.5"
            role="group"
            aria-label="Result view"
          >
            <button
              type="button"
              disabled={!hasData && !loading}
              onClick={() => setViewMode(viewMode === "json" ? "sheet" : "json")}
              className="inline-flex h-6 items-center gap-1 rounded px-2 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label={
                viewMode === "json" ? "Switch to sheet view" : "Switch to JSON view"
              }
            >
              {viewMode === "json" ? (
                <>
                  <Table2 className="size-3.5" aria-hidden />
                  Sheet
                </>
              ) : (
                <>
                  <Braces className="size-3.5" aria-hidden />
                  JSON
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <p className="px-3 py-4 text-sm text-destructive">{error}</p>
      ) : loading ? (
        viewMode === "json" ? (
          <JsonSkeleton />
        ) : (
          <SheetTableSkeleton rows={8} />
        )
      ) : viewMode === "json" ? (
        <pre className="max-h-[28rem] overflow-auto px-3 py-3 font-mono text-[11px] leading-relaxed text-foreground sm:text-xs">
          {jsonText}
        </pre>
      ) : (
        <div className="max-h-[28rem] overflow-auto">
          <table className="w-max min-w-full border-collapse text-left text-[11px] sm:text-xs">
            <thead className="sticky top-0 z-[1] bg-muted/80 backdrop-blur">
              <tr className="border-b border-border/60">
                {sheetColumns.map((col) => (
                  <th
                    key={col}
                    className="whitespace-nowrap px-3 py-2 font-medium text-muted-foreground"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(rows || []).map((row, rowIndex) => (
                <tr
                  key={String(row.id || row.conditionId || row.slug || rowIndex)}
                  className="border-b border-border/40 last:border-0"
                >
                  {sheetColumns.map((col) => (
                    <td
                      key={`${rowIndex}-${col}`}
                      className="max-w-[16rem] truncate whitespace-nowrap px-3 py-2 text-foreground"
                      title={cellValue(row[col])}
                    >
                      {cellValue(row[col])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
