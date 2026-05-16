"use client";

import { useCallback, useMemo, useState } from "react";
import { History, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { ConnectHomeReplaySheetDialog } from "@/components/connectData/ConnectHomeReplaySheetDialog";
import { Button } from "@/components/ui/button";
import { useMyStateV2 } from "@/context/stateContextV2";
import { collectRequestCardEntries, fmtRequestElapsed } from "@/lib/connectHomeRequestCards";
import {
  integrationLabelFromLake,
  listConnectHomeSheetHistory,
  requestCardSummaryLabel,
} from "@/lib/connectHomeRequestHistory";
import { rehydrateSheetFromProvenance } from "@/lib/rehydrateSheetFromProvenance";
import { cn } from "@/lib/utils";

export function ConnectHomeRequestHistory({ className }) {
  const ctx = useMyStateV2() ?? {};
  const dataSheets = ctx.dataSheets || {};
  const activeSheetId = ctx.activeSheetId;
  const setActiveSheetId = ctx.setActiveSheetId;
  const setDataSheets = ctx.setDataSheets;
  const setConnectedData = ctx.setConnectedData;
  const addNewSheetAndActivate = ctx.addNewSheetAndActivate;
  const requestConnectAnalyzeScroll = ctx.requestConnectAnalyzeScroll;
  const pull = ctx.connectDataLakePullState ?? {};

  const sheetHistory = useMemo(() => listConnectHomeSheetHistory(dataSheets), [dataSheets]);
  const cardEntries = useMemo(() => collectRequestCardEntries(dataSheets), [dataSheets]);

  const [replayOpen, setReplayOpen] = useState(false);
  const [replaySourceSheetId, setReplaySourceSheetId] = useState(null);
  const [replayBusy, setReplayBusy] = useState(false);

  const replaySource = replaySourceSheetId ? dataSheets[replaySourceSheetId] : null;
  const replayProvenance = replaySource?.provenance;
  const replayLabel = replaySource
    ? requestCardSummaryLabel(replaySource.requestCards?.[0], replaySource)
    : "";

  const openReplayDialog = useCallback(
    (sheetId) => {
      const sheet = dataSheets?.[sheetId];
      if (!sheet?.provenance) {
        toast.error("This sheet does not have a saved query to replay.");
        return;
      }
      setReplaySourceSheetId(sheetId);
      setReplayOpen(true);
    },
    [dataSheets],
  );

  const runReplay = useCallback(
    async (destination) => {
      if (!replaySourceSheetId || !replayProvenance || !setDataSheets || !setConnectedData) return;
      setReplayBusy(true);
      try {
        let targetSheetId = activeSheetId;
        if (destination === "new_sheet") {
          await new Promise((resolve) => {
            addNewSheetAndActivate?.((newId) => {
              targetSheetId = newId;
              resolve();
            });
          });
        }

        const { rows, json } = await rehydrateSheetFromProvenance({
          targetSheetId,
          provenance: replayProvenance,
          dataSheets,
          sourceSheetId: replaySourceSheetId,
        });

        setActiveSheetId?.(targetSheetId);
        setConnectedData(rows);
        setDataSheets((prev) => {
          const p = prev || {};
          const cur = p[targetSheetId] || { name: "Sheet", data: [] };
          return {
            ...p,
            [targetSheetId]: {
              ...cur,
              data: rows,
              provenance: replayProvenance,
              storageMode: "inline",
              rehydrationStatus: "complete",
              rowCount: rows.length,
              fullRowCount: json?.rowCount ?? rows.length,
              columns: Array.isArray(json?.columns) ? json.columns : cur.columns,
            },
          };
        });

        requestConnectAnalyzeScroll?.();
        if (json?.warning) toast.warning(json.warning);
        else toast.success("Query replayed into sheet.");
        setReplayOpen(false);
        setReplaySourceSheetId(null);
      } catch (e) {
        toast.error(e?.message || "Failed to replay query.");
      } finally {
        setReplayBusy(false);
      }
    },
    [
      activeSheetId,
      addNewSheetAndActivate,
      dataSheets,
      replayProvenance,
      replaySourceSheetId,
      requestConnectAnalyzeScroll,
      setActiveSheetId,
      setConnectedData,
      setDataSheets,
    ],
  );

  return (
    <div className={cn("space-y-3 text-sm min-w-0 max-w-full overflow-hidden", className)}>
      <div>
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <History className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Request history
        </h3>
        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
          All sheets and pulls across integrations — Kalshi, Polymarket Historical, and more.
        </p>
      </div>

      {pull.error ? (
        <p className="text-[11px] text-destructive" role="alert">
          {pull.error}
        </p>
      ) : null}

      {sheetHistory.length === 0 && cardEntries.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">Run a pull to build your request history.</p>
      ) : null}

      <div className="space-y-3">
        {sheetHistory.map(({ sheetId, sheet, cards, rowCount }) => {
          const sheetName = String(sheet?.name || sheetId).trim();
          const integration = integrationLabelFromLake(sheet?.provenance?.lake || cards[0]?.lake);
          const canReplay = !!sheet?.provenance;

          return (
            <div
              key={sheetId}
              className="rounded-lg border border-border/60 bg-slate-100 p-3 dark:bg-slate-800/40"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{sheetName}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {integration}
                    {rowCount > 0 ? ` · ${rowCount.toLocaleString()} rows loaded` : " · no rows"}
                  </p>
                </div>
                {canReplay ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 shrink-0 gap-1 px-2 text-[10px]"
                    disabled={replayBusy}
                    onClick={() => openReplayDialog(sheetId)}
                  >
                    <RotateCcw className="h-3 w-3" aria-hidden />
                    Replay
                  </Button>
                ) : null}
              </div>

              {cards.length > 0 ? (
                <ul className="mt-2 space-y-1.5 border-t border-border/40 pt-2">
                  {cards.map((card) => {
                    const cols =
                      Array.isArray(card?.selectAliases) && card.selectAliases.length
                        ? card.selectAliases
                        : Array.isArray(card?.selectColumns)
                          ? card.selectColumns
                          : [];
                    return (
                      <li
                        key={card.id}
                        className="rounded-md bg-background/60 px-2 py-1.5 text-[11px] text-muted-foreground"
                      >
                        <p className="font-medium text-foreground">
                          {card?.table ? `table: ${card.table}` : "Query"}
                          {cols.length ? ` · ${cols.slice(0, 4).join(", ")}${cols.length > 4 ? "…" : ""}` : ""}
                        </p>
                        {card?.hasWhere ? (
                          <p className="truncate">filter: {card.whereText || "WHERE …"}</p>
                        ) : null}
                        {card?.composeRowLimit != null ? (
                          <p>limit: {card.composeRowLimit} rows</p>
                        ) : null}
                        <p>created in {fmtRequestElapsed(card?.elapsedMs)}</p>
                        {card?.loadedRowCount != null ? (
                          <p>
                            loaded <strong>{card.loadedRowCount}</strong> rows
                          </p>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          );
        })}
      </div>

      <ConnectHomeReplaySheetDialog
        open={replayOpen}
        onOpenChange={(open) => {
          setReplayOpen(open);
          if (!open) setReplaySourceSheetId(null);
        }}
        queryLabel={replayLabel}
        onReplaceCurrent={() => runReplay("replace")}
        onNewSheet={() => runReplay("new_sheet")}
      />
    </div>
  );
}