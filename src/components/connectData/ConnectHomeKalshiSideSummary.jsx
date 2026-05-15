"use client";

import { ConnectProgressWithLabel } from "@/components/integrationsView/integrationPlayground/integrations/polymarketHistorical/ConnectProgressWithLabel";
import { useMyStateV2 } from "@/context/stateContextV2";
import { collectRequestCardEntries, fmtRequestElapsed } from "@/lib/connectHomeRequestCards";
import { cn } from "@/lib/utils";

/**
 * Right drawer on Connect home: SQL / request summary (not the full column composer).
 * Pull execution stays in the hidden DataLakeParquetPanel bridge.
 */
export function ConnectHomeKalshiSideSummary({ className }) {
  const ctx = useMyStateV2() ?? {};
  const dataSheets = ctx.dataSheets || {};
  const pull = ctx.connectDataLakePullState ?? {};
  const entries = collectRequestCardEntries(dataSheets);

  return (
    <div className={cn("space-y-3 text-sm min-w-0 max-w-full overflow-hidden", className)}>
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Request summary
        </h3>
        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
          Same SQL operation cards as the integrations panel — compose, filters, and row counts.
        </p>
      </div>

      {pull.loading ? (
        <ConnectProgressWithLabel
          label={pull.label || "Running query…"}
          progress={pull.progress ?? 0}
          className="w-full min-w-0"
        />
      ) : null}

      {pull.error ? (
        <p className="text-[11px] text-destructive" role="alert">
          {pull.error}
        </p>
      ) : null}

      {entries.length === 0 && !pull.loading ? (
        <p className="text-[11px] text-muted-foreground">Run a pull to see the operation summary here.</p>
      ) : null}

      <div className="space-y-2">
        {entries.map(({ sheetId, card }) => {
          const sheetNum = String(sheetId || "").replace("sheet-", "") || "?";
          const sheetName = String(dataSheets?.[sheetId]?.name || card?.sheetLabel || `Sheet ${sheetNum}`).trim();
          const cols =
            Array.isArray(card?.selectAliases) && card.selectAliases.length
              ? card.selectAliases
              : Array.isArray(card?.selectColumns)
                ? card.selectColumns
                : [];
          const tableLabel = String(card?.table || "").trim();
          const whereText = card?.hasWhere ? String(card?.whereText || "WHERE …") : null;

          return (
            <div
              key={`${sheetId}::${card?.id}`}
              className="rounded-lg border border-border/60 bg-slate-100 p-3 dark:bg-slate-800/40"
            >
              <p className="text-sm font-semibold truncate">
                Sheet {sheetNum}: {sheetName}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {tableLabel ? `table: ${tableLabel}` : "table: —"}
                {cols.length ? ` · columns: ${cols.join(", ")}` : ""}
              </p>
              {whereText ? (
                <p className="text-[11px] text-muted-foreground">filter: {whereText}</p>
              ) : null}
              {card?.composeRowLimit != null ? (
                <p className="text-[11px] text-muted-foreground">limit: {card.composeRowLimit} rows</p>
              ) : null}
              <p className="text-[11px] text-muted-foreground">created in {fmtRequestElapsed(card?.elapsedMs)}</p>
              {card?.loadedRowCount != null ? (
                <p className="text-[11px] text-muted-foreground">
                  Loaded <strong>{card.loadedRowCount}</strong> rows
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
