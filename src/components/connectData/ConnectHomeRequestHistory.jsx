"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, History, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { ConnectHomeReplaySheetDialog } from "@/components/connectData/ConnectHomeReplaySheetDialog";
import { Button } from "@/components/ui/button";
import { useMyStateV2 } from "@/context/stateContextV2";
import { collectRequestCardEntries, fmtRequestElapsed } from "@/lib/connectHomeRequestCards";
import { formatConnectRequestCardQuery } from "@/lib/connectHomeRequestQuery";
import {
  describeForkProject,
  extractSheetVariationLines,
  integrationLabelFromLake,
  listConnectHomeSheetHistory,
  requestCardSummaryLabel,
} from "@/lib/connectHomeRequestHistory";
import { describePolymarketLiveRequestCard } from "@/lib/polymarketLive/polymarketLiveRequestHistory";
import { rehydrateSheetFromProvenance } from "@/lib/rehydrateSheetFromProvenance";
import { resolvePersistedFullRowCount } from "@/lib/projectPersistence";
import { cn } from "@/lib/utils";

function startReplayPullProgress(setConnectDataLakePullState) {
  setConnectDataLakePullState?.({
    loading: true,
    label: "Replaying query…",
    progress: 8,
    error: null,
  });
}

function bumpReplayPullProgress(setConnectDataLakePullState, progress, label) {
  setConnectDataLakePullState?.((prev) => ({
    ...prev,
    loading: true,
    label: label ?? prev.label ?? "Loading data…",
    progress: Math.max(Number(prev.progress) || 0, progress),
    error: null,
  }));
}

function finishReplayPullProgress(setConnectDataLakePullState) {
  setConnectDataLakePullState?.({
    loading: false,
    label: "",
    progress: 0,
    error: null,
  });
}

function RequestHistoryQueryCard({ card, sheet, pull }) {
  const [expanded, setExpanded] = useState(false);
  const live = describePolymarketLiveRequestCard(card, sheet);
  const queryText = formatConnectRequestCardQuery(card, sheet);
  const hasExpandableParams =
    (live && (live.queryParams.length > 0 || live.detailLines.length > 0)) ||
    Boolean(queryText && queryText.length > 120);

  return (
    <li className="rounded-md bg-background/60 px-2 py-1.5 text-[11px] text-muted-foreground">
      {live ? (
        <div className="space-y-1">
          <p className="font-medium text-foreground break-words leading-snug">
            {live.integrationLabel}
          </p>
          <p className="break-words leading-snug text-foreground/90">
            {live.categoryLabel}
            {live.endpointTitle ? ` · ${live.endpointTitle}` : ""}
          </p>
          <p className="break-words leading-snug">
            {[live.searchModeLabel, live.marketScopeLabel].filter(Boolean).join(" · ")}
          </p>
          <p className="break-words leading-snug text-foreground/90">
            Market · {live.marketLabel}
          </p>
          {live.queryParamsCompact ? (
            <div className="pt-0.5">
              <button
                type="button"
                className="inline-flex max-w-full items-center gap-1 overflow-hidden text-left text-[11px] text-foreground/90 hover:text-foreground"
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
              >
                {expanded ? (
                  <ChevronDown className="h-3 w-3 shrink-0" aria-hidden />
                ) : (
                  <ChevronRight className="h-3 w-3 shrink-0" aria-hidden />
                )}
                <span className="min-w-0 truncate">
                  <span className="font-medium text-foreground">Params</span>
                  {expanded ? "" : ` · ${live.queryParamsCompact}`}
                </span>
              </button>
              {expanded ? (
                <ul className="mt-1 space-y-0.5 border-l border-border/50 pl-2">
                  {(live.queryParams.length
                    ? live.queryParams.map((p) => `${p.key} = ${p.value}`)
                    : live.detailLines
                  ).map((line) => (
                    <li key={line} className="break-words leading-snug text-foreground/85">
                      {line}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : (
        <div>
          <p className="font-medium text-foreground break-words leading-snug">Query</p>
          <p className="mt-0.5 break-words leading-snug text-foreground/90">{queryText || "—"}</p>
          {hasExpandableParams ? (
            <button
              type="button"
              className="mt-1 inline-flex items-center gap-1 text-[11px] text-primary"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? "Hide details" : "Show details"}
            </button>
          ) : null}
          {expanded && queryText ? (
            <p className="mt-1 break-words leading-snug text-foreground/85 whitespace-pre-wrap">
              {queryText}
            </p>
          ) : null}
        </div>
      )}

      {card?.status === "in_progress" ? (
        <p className="mt-1.5 text-primary">In progress… {pull.label || "Loading data…"}</p>
      ) : (
        <>
          <p className="mt-1.5">created in {fmtRequestElapsed(card?.elapsedMs)}</p>
          {card?.loadedRowCount != null ? (
            <p>
              loaded <strong>{card.loadedRowCount}</strong> rows
            </p>
          ) : null}
        </>
      )}
    </li>
  );
}

export function ConnectHomeRequestHistory({ className }) {
  const ctx = useMyStateV2() ?? {};
  const dataSheets = ctx.dataSheets || {};
  const loadedDataMeta = ctx.loadedDataMeta || null;
  const activeSheetId = ctx.activeSheetId;
  const setActiveSheetId = ctx.setActiveSheetId;
  const setDataSheets = ctx.setDataSheets;
  const setConnectedData = ctx.setConnectedData;
  const addNewSheetAndActivate = ctx.addNewSheetAndActivate;
  const requestConnectAnalyzeScroll = ctx.requestConnectAnalyzeScroll;
  const setConnectDataLakePullState = ctx.setConnectDataLakePullState;
  const pull = ctx.connectDataLakePullState ?? {};

  const sheetHistory = useMemo(() => listConnectHomeSheetHistory(dataSheets), [dataSheets]);
  const cardEntries = useMemo(() => collectRequestCardEntries(dataSheets), [dataSheets]);
  const forkContext = useMemo(() => describeForkProject(loadedDataMeta), [loadedDataMeta]);

  const [replayOpen, setReplayOpen] = useState(false);
  const [replaySourceSheetId, setReplaySourceSheetId] = useState(null);
  const [replayBusy, setReplayBusy] = useState(false);
  const progressTimerRef = useRef(null);

  const replaySource = replaySourceSheetId ? dataSheets[replaySourceSheetId] : null;
  const replayProvenance = replaySource?.provenance;
  const replayLabel = replaySource
    ? requestCardSummaryLabel(replaySource.requestCards?.[0], replaySource)
    : "";

  const clearProgressTimer = useCallback(() => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  }, []);

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
    async (destination, newSheetName) => {
      if (!replaySourceSheetId || !replayProvenance || !setDataSheets || !setConnectedData) return;

      setReplayBusy(true);
      startReplayPullProgress(setConnectDataLakePullState);
      clearProgressTimer();
      progressTimerRef.current = setInterval(() => {
        setConnectDataLakePullState?.((prev) => {
          if (!prev.loading) return prev;
          const next = Math.min(88, (Number(prev.progress) || 8) + 5);
          return { ...prev, progress: next };
        });
      }, 450);

      try {
        let targetSheetId = activeSheetId;

        if (destination === "new_sheet") {
          const trimmedName = String(newSheetName || "").trim();
          if (!trimmedName) {
            throw new Error("Enter a sheet name to continue.");
          }
          await new Promise((resolve) => {
            addNewSheetAndActivate?.((newId) => {
              targetSheetId = newId;
              setDataSheets((prev) => {
                const p = prev || {};
                const cur = p[newId] || { name: `Sheet`, data: [] };
                return {
                  ...p,
                  [newId]: { ...cur, name: trimmedName },
                };
              });
              resolve();
            });
          });
          bumpReplayPullProgress(setConnectDataLakePullState, 24, "Preparing new sheet…");
        } else {
          bumpReplayPullProgress(setConnectDataLakePullState, 20, "Replacing sheet data…");
        }

        bumpReplayPullProgress(setConnectDataLakePullState, 42, "Running saved query…");

        const { rows, json } = await rehydrateSheetFromProvenance({
          targetSheetId,
          provenance: replayProvenance,
          dataSheets,
          sourceSheetId: replaySourceSheetId,
        });

        bumpReplayPullProgress(setConnectDataLakePullState, 96, "Finishing up…");

        setActiveSheetId?.(targetSheetId);
        setConnectedData(rows);
        setDataSheets((prev) => {
          const p = prev || {};
          const cur = p[targetSheetId] || { name: "Sheet", data: [] };
          const name =
            destination === "new_sheet"
              ? String(newSheetName || "").trim() || cur.name
              : cur.name;
          const sourceCard = Array.isArray(replaySource?.requestCards)
            ? replaySource.requestCards[0]
            : null;
          const querySummary = formatConnectRequestCardQuery(sourceCard, {
            provenance: replayProvenance,
          });
          const intentFullRowCount = resolvePersistedFullRowCount(
            replaySource,
            json?.rowCount ?? rows.length,
          );
          const replayCard = sourceCard
            ? {
                ...sourceCard,
                id: `req-${Date.now().toString(36)}-${Math.random().toString(16).slice(2)}`,
                createdAt: Date.now(),
                sheetId: targetSheetId,
                sheetLabel: name,
                loadedRowCount: rows.length,
                querySummary: querySummary || sourceCard.querySummary,
              }
            : null;
          const priorCards = Array.isArray(replaySource?.requestCards)
            ? replaySource.requestCards
            : Array.isArray(cur.requestCards)
              ? cur.requestCards
              : [];
          const requestCards = replayCard
            ? [replayCard, ...priorCards.filter((c) => c?.id && c.id !== sourceCard?.id)]
            : priorCards;
          return {
            ...p,
            [targetSheetId]: {
              ...cur,
              name,
              data: rows,
              provenance: replayProvenance,
              operationHistory: replaySource?.operationHistory || cur.operationHistory || [],
              storageMode: rows.length >= intentFullRowCount ? "inline" : "provenance",
              rehydrationStatus: rows.length >= intentFullRowCount ? "complete" : "preview",
              rowCount: rows.length,
              fullRowCount: intentFullRowCount,
              columns: Array.isArray(json?.columns) ? json.columns : cur.columns,
              requestCards,
              saveMeta: {
                ...(cur.saveMeta || {}),
                fullRowCount: intentFullRowCount,
                truncated: rows.length < intentFullRowCount,
                rehydratedAt: new Date().toISOString(),
              },
            },
          };
        });

        bumpReplayPullProgress(setConnectDataLakePullState, 100, "Done");
        requestConnectAnalyzeScroll?.();

        if (json?.warning) toast.warning(json.warning);
        else if (destination === "new_sheet") {
          toast.success(`“${String(newSheetName || "").trim()}” is ready.`);
        } else {
          toast.success("Query replayed into sheet.");
        }

        setReplayOpen(false);
        setReplaySourceSheetId(null);
      } catch (e) {
        setConnectDataLakePullState?.({
          loading: false,
          label: "",
          progress: 0,
          error: e?.message || "Failed to replay query.",
        });
        toast.error(e?.message || "Failed to replay query.");
        setReplayOpen(false);
        setReplaySourceSheetId(null);
      } finally {
        clearProgressTimer();
        setReplayBusy(false);
        window.setTimeout(() => finishReplayPullProgress(setConnectDataLakePullState), 400);
      }
    },
    [
      activeSheetId,
      addNewSheetAndActivate,
      clearProgressTimer,
      dataSheets,
      replayProvenance,
      replaySource,
      replaySourceSheetId,
      requestConnectAnalyzeScroll,
      setActiveSheetId,
      setConnectDataLakePullState,
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
          All sheets and pulls across integrations — Kalshi, Polymarket Live, Polymarket Historical, and
          more.
        </p>
      </div>

      {pull.error ? (
        <p className="text-[11px] text-destructive" role="alert">
          {pull.error}
        </p>
      ) : null}

      {sheetHistory.length === 0 && cardEntries.length === 0 && !pull.loading ? (
        <p className="text-[11px] text-muted-foreground">Run a pull to build your request history.</p>
      ) : null}

      {pull.loading && cardEntries.length === 0 && !pull.error ? (
        <div className="rounded-lg border border-border/60 bg-slate-100 p-3 dark:bg-slate-800/40">
          <p className="text-sm font-semibold">Pull in progress</p>
          <p className="mt-1 text-[11px] text-muted-foreground">{pull.label || "Loading data…"}</p>
        </div>
      ) : null}

      <div className="space-y-3">
        {sheetHistory.map(({ sheetId, sheet, cards, rowCount }) => {
          const sheetName = String(sheet?.name || sheetId).trim();
          const firstCard = cards[0] || null;
          const live = describePolymarketLiveRequestCard(firstCard, sheet);
          const integration =
            live?.integrationLabel ||
            integrationLabelFromLake(
              sheet?.provenance?.lake || sheet?.provenance?.source || firstCard?.lake,
            );
          const endpointHint = live
            ? [live.categoryLabel, live.endpointTitle].filter(Boolean).join(" · ")
            : "";
          const canReplay = (() => {
            const prov = sheet?.provenance;
            if (!prov) return false;
            const lake = String(prov.lake || prov.source || "").toLowerCase();
            // Athena / Data Lake compose provenance only — live API pulls are not rehydratable this way.
            if (lake === "polymarket-live" || lake === "kalshi-live") return false;
            return true;
          })();
          const variationLines = extractSheetVariationLines(sheet?.provenance);

          return (
            <div
              key={sheetId}
              className="rounded-lg border border-border/60 bg-slate-100 p-3 dark:bg-slate-800/40"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{sheetName}</p>
                  {forkContext ? (
                    <p className="mt-0.5 text-[11px] leading-snug text-primary/90">{forkContext.line}</p>
                  ) : null}
                  {endpointHint ? (
                    <p className="mt-0.5 text-[11px] font-medium leading-snug text-foreground/90">
                      {endpointHint}
                    </p>
                  ) : null}
                  {variationLines.map((line) => (
                    <p
                      key={`${sheetId}-${line}`}
                      className="mt-0.5 text-[11px] font-medium leading-snug text-foreground/90"
                    >
                      {line}
                    </p>
                  ))}
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
                  {cards.map((card) => (
                    <RequestHistoryQueryCard
                      key={card.id}
                      card={card}
                      sheet={sheet}
                      pull={pull}
                    />
                  ))}
                </ul>
              ) : null}
            </div>
          );
        })}
      </div>

      <ConnectHomeReplaySheetDialog
        open={replayOpen}
        onOpenChange={(open) => {
          if (replayBusy) return;
          setReplayOpen(open);
          if (!open) setReplaySourceSheetId(null);
        }}
        queryLabel={replayLabel}
        loading={replayBusy}
        pullLabel={pull.label}
        pullProgress={pull.progress}
        onReplaceCurrent={() => void runReplay("replace")}
        onCreateNewSheet={(name) => runReplay("new_sheet", name)}
      />
    </div>
  );
}
