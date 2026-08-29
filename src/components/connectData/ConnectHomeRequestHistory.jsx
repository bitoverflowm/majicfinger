"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, History, Pencil, Play, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { ConnectHomeReplaySheetDialog } from "@/components/connectData/ConnectHomeReplaySheetDialog";
import { integrations_list } from "@/components/integrationsView/integrationsConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMyStateV2 } from "@/context/stateContextV2";
import { CONNECT_HOME_CENTER_VIEW } from "@/lib/connectHomeFlow";
import { collectRequestCardEntries, fmtRequestElapsed } from "@/lib/connectHomeRequestCards";
import { formatConnectRequestCardQuery } from "@/lib/connectHomeRequestQuery";
import {
  describeForkProject,
  extractSheetVariationLines,
  integrationLabelFromLake,
  listConnectHomeSheetHistory,
  requestCardSummaryLabel,
} from "@/lib/connectHomeRequestHistory";
import { isConnectIntegrationWorkspace } from "@/lib/connectHomeWorkspace";
import { openConnectComposeEdit } from "@/lib/hubs/openConnectComposeEdit";
import { describePolymarketLiveRequestCard } from "@/lib/polymarketLive/polymarketLiveRequestHistory";
import { rehydrateSheetFromProvenance } from "@/lib/rehydrateSheetFromProvenance";
import { resolvePersistedFullRowCount } from "@/lib/projectPersistence";
import { cn } from "@/lib/utils";

function integrationDisplayName(integrationId) {
  const id = String(integrationId || "").trim();
  if (!id) return "";
  const row = integrations_list.find((i) => i.clickHandler === id);
  return row?.name || id;
}

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

const SHEET_NAME_MAX = 80;

/**
 * Display name only — sheet identity stays on sheetId (joins / provenance use ids).
 * @param {{
 *   sheetId: string;
 *   name: string;
 *   isEditing: boolean;
 *   draft: string;
 *   onDraftChange: (v: string) => void;
 *   onStartEdit: () => void;
 *   onCommit: () => void;
 *   onCancel: () => void;
 * }} props
 */
function RequestHistorySheetName({
  sheetId,
  name,
  isEditing,
  draft,
  onDraftChange,
  onStartEdit,
  onCommit,
  onCancel,
}) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (!isEditing) return;
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    el.select();
  }, [isEditing]);

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        value={draft}
        maxLength={SHEET_NAME_MAX}
        aria-label="Rename sheet"
        className="h-7 px-1.5 text-sm font-semibold"
        onChange={(e) => onDraftChange(e.target.value)}
        onBlur={() => onCommit()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onCommit();
          } else if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
        }}
        onClick={(e) => e.stopPropagation()}
      />
    );
  }

  return (
    <button
      type="button"
      className="block max-w-full truncate text-left text-sm font-semibold text-foreground hover:underline decoration-foreground/30 underline-offset-2"
      title="Click to rename"
      aria-label={`Rename ${name || sheetId}`}
      onClick={(e) => {
        e.stopPropagation();
        onStartEdit();
      }}
    >
      {name || sheetId}
    </button>
  );
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
  const connectWorkspace = ctx.connectWorkspace;
  const integrationSidebar = ctx.integrationSidebar;
  const setIntegrationSidebar = ctx.setIntegrationSidebar;
  const setRightPanelTab = ctx.setRightPanelTab;
  const setRightPanelOpen = ctx.setRightPanelOpen;
  const setConnectHomeAnalyzeActive = ctx.setConnectHomeAnalyzeActive;
  const setConnectHomeCenterView = ctx.setConnectHomeCenterView;
  const setConnectHomePullDestination = ctx.setConnectHomePullDestination;
  const requestConnectComposeScroll = ctx.requestConnectComposeScroll;
  const requestConnectWorkspace = ctx.requestConnectWorkspace;
  const setViewing = ctx.setViewing;

  const sheetHistory = useMemo(() => listConnectHomeSheetHistory(dataSheets), [dataSheets]);
  const cardEntries = useMemo(() => collectRequestCardEntries(dataSheets), [dataSheets]);
  const forkContext = useMemo(() => describeForkProject(loadedDataMeta), [loadedDataMeta]);

  const currentIntegrationId = useMemo(() => {
    if (isConnectIntegrationWorkspace(connectWorkspace)) return connectWorkspace;
    if (integrationSidebar) return String(integrationSidebar);
    return "";
  }, [connectWorkspace, integrationSidebar]);

  const currentIntegrationName = useMemo(
    () => integrationDisplayName(currentIntegrationId),
    [currentIntegrationId],
  );

  const [sheetActionOpen, setSheetActionOpen] = useState(false);
  const [sheetActionIntent, setSheetActionIntent] = useState(/** @type {"replay" | "edit"} */ ("replay"));
  const [sheetActionSourceId, setSheetActionSourceId] = useState(null);
  const [replayBusy, setReplayBusy] = useState(false);
  const [renamingSheetId, setRenamingSheetId] = useState(null);
  const [renameDraft, setRenameDraft] = useState("");
  const progressTimerRef = useRef(null);

  const actionSource = sheetActionSourceId ? dataSheets[sheetActionSourceId] : null;
  const replayProvenance = actionSource?.provenance;
  const actionQueryLabel = actionSource
    ? requestCardSummaryLabel(actionSource.requestCards?.[0], actionSource)
    : "";

  const clearProgressTimer = useCallback(() => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  }, []);

  const closeSheetActionDialog = useCallback(() => {
    setSheetActionOpen(false);
    setSheetActionSourceId(null);
    setSheetActionIntent("replay");
  }, []);

  const startRenameSheet = useCallback(
    (sheetId) => {
      const current = String(dataSheets?.[sheetId]?.name || sheetId).trim();
      setRenamingSheetId(sheetId);
      setRenameDraft(current);
    },
    [dataSheets],
  );

  const cancelRenameSheet = useCallback(() => {
    setRenamingSheetId(null);
    setRenameDraft("");
  }, []);

  const commitRenameSheet = useCallback(() => {
    const id = renamingSheetId;
    if (!id || !setDataSheets) {
      cancelRenameSheet();
      return;
    }
    const nextName = String(renameDraft || "").trim().slice(0, SHEET_NAME_MAX);
    const prevName = String(dataSheets?.[id]?.name || "").trim();
    setRenamingSheetId(null);
    setRenameDraft("");
    if (!nextName || nextName === prevName) return;
    // Only mutates display `name` — joins / provenance / charts key off sheetId.
    setDataSheets((prev) => {
      const cur = prev?.[id];
      if (!cur) return prev;
      return {
        ...(prev || {}),
        [id]: { ...cur, name: nextName },
      };
    });
  }, [cancelRenameSheet, dataSheets, renameDraft, renamingSheetId, setDataSheets]);

  const openReplayDialog = useCallback(
    (sheetId) => {
      const sheet = dataSheets?.[sheetId];
      if (!sheet?.provenance) {
        toast.error("This sheet does not have a saved query to replay.");
        return;
      }
      setSheetActionIntent("replay");
      setSheetActionSourceId(sheetId);
      setSheetActionOpen(true);
    },
    [dataSheets],
  );

  const openEditDialog = useCallback(
    (sheetId) => {
      const sheet = dataSheets?.[sheetId];
      if (!sheet?.provenance) {
        toast.error("This sheet does not have a saved query to edit.");
        return;
      }
      const lake = String(sheet.provenance?.lake || sheet.provenance?.source || "").toLowerCase();
      if (lake !== "polymarket" && lake !== "kalshi") {
        toast.error("This pull cannot be edited in compose.");
        return;
      }
      setSheetActionIntent("edit");
      setSheetActionSourceId(sheetId);
      setSheetActionOpen(true);
    },
    [dataSheets],
  );

  const runEditCompose = useCallback(
    (destination, newSheetName) => {
      if (!sheetActionSourceId) return;
      const sheet = dataSheets?.[sheetActionSourceId];
      const result = openConnectComposeEdit(ctx, {
        sheetId: sheetActionSourceId,
        sheet,
        destination,
        pendingSheetName:
          destination === "new_sheet"
            ? String(newSheetName || "").trim()
            : String(sheet?.name || "").trim(),
      });
      closeSheetActionDialog();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.message(
        destination === "new_sheet"
          ? "Query loaded in compose — run to create the new sheet."
          : "Query loaded in compose — run to replace this sheet.",
      );
    },
    [closeSheetActionDialog, ctx, dataSheets, sheetActionSourceId],
  );

  const runAnotherIntegrationRequest = useCallback(() => {
    if (!currentIntegrationId) return;

    setIntegrationSidebar?.(currentIntegrationId);
    setConnectHomeCenterView?.(CONNECT_HOME_CENTER_VIEW.SHEET);
    setConnectHomePullDestination?.("new_sheet");

    const onSameConnectIntegration =
      isConnectIntegrationWorkspace(connectWorkspace) &&
      connectWorkspace === currentIntegrationId;

    if (onSameConnectIntegration) {
      // Return to compose for this integration; keep filters so the user can tweak and re-run.
      setConnectHomeAnalyzeActive?.(false);
      requestConnectComposeScroll?.();
    } else if (isConnectIntegrationWorkspace(currentIntegrationId)) {
      requestConnectWorkspace?.(currentIntegrationId, { scroll: true });
    } else {
      setViewing?.("dataStart");
      setRightPanelTab?.("integrations");
      setRightPanelOpen?.(true);
    }
  }, [
    connectWorkspace,
    currentIntegrationId,
    requestConnectComposeScroll,
    requestConnectWorkspace,
    setConnectHomeAnalyzeActive,
    setConnectHomeCenterView,
    setConnectHomePullDestination,
    setIntegrationSidebar,
    setRightPanelOpen,
    setRightPanelTab,
    setViewing,
  ]);

  const runReplay = useCallback(
    async (destination, newSheetName) => {
      if (!sheetActionSourceId || !replayProvenance || !setDataSheets || !setConnectedData) return;

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
        let targetSheetId = destination === "replace" ? sheetActionSourceId : activeSheetId;

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
          setActiveSheetId?.(sheetActionSourceId);
          bumpReplayPullProgress(setConnectDataLakePullState, 20, "Replacing sheet data…");
        }

        bumpReplayPullProgress(setConnectDataLakePullState, 42, "Running saved query…");

        const { rows, json } = await rehydrateSheetFromProvenance({
          targetSheetId,
          provenance: replayProvenance,
          dataSheets,
          sourceSheetId: sheetActionSourceId,
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
          const sourceCard = Array.isArray(actionSource?.requestCards)
            ? actionSource.requestCards[0]
            : null;
          const querySummary = formatConnectRequestCardQuery(sourceCard, {
            provenance: replayProvenance,
          });
          const intentFullRowCount = resolvePersistedFullRowCount(
            actionSource,
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
          const priorCards = Array.isArray(actionSource?.requestCards)
            ? actionSource.requestCards
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
              operationHistory: actionSource?.operationHistory || cur.operationHistory || [],
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

        closeSheetActionDialog();
      } catch (e) {
        setConnectDataLakePullState?.({
          loading: false,
          label: "",
          progress: 0,
          error: e?.message || "Failed to replay query.",
        });
        toast.error(e?.message || "Failed to replay query.");
        closeSheetActionDialog();
      } finally {
        clearProgressTimer();
        setReplayBusy(false);
        window.setTimeout(() => finishReplayPullProgress(setConnectDataLakePullState), 400);
      }
    },
    [
      actionSource,
      activeSheetId,
      addNewSheetAndActivate,
      clearProgressTimer,
      closeSheetActionDialog,
      dataSheets,
      replayProvenance,
      requestConnectAnalyzeScroll,
      setActiveSheetId,
      setConnectDataLakePullState,
      setConnectedData,
      setDataSheets,
      sheetActionSourceId,
    ],
  );

  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-full min-w-0 max-w-full flex-col overflow-hidden text-sm text-foreground",
        className,
      )}
    >
      <div className="min-h-0 flex-1 space-y-3 overflow-auto">
        <div>
          <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <History className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Query history
          </h3>
        </div>

        {pull.error ? (
          <p className="text-[11px] text-destructive" role="alert">
            {pull.error}
          </p>
        ) : null}

        {sheetHistory.length === 0 && cardEntries.length === 0 && !pull.loading ? (
          <p className="text-[11px] text-muted-foreground">Run a pull to build your query history.</p>
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
            const canEdit = (() => {
              const prov = sheet?.provenance;
              if (!prov) return false;
              const kind = String(prov.kind || "").trim();
              if (kind && kind !== "compose" && kind !== "compose_browser_join") return false;
              const lake = String(prov.lake || prov.source || "").toLowerCase();
              return lake === "polymarket" || lake === "kalshi";
            })();
            const variationLines = extractSheetVariationLines(sheet?.provenance);

            return (
              <div
                key={sheetId}
                className="rounded-lg border border-border/60 bg-slate-100 p-3 dark:bg-slate-800/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <RequestHistorySheetName
                      sheetId={sheetId}
                      name={sheetName}
                      isEditing={renamingSheetId === sheetId}
                      draft={renameDraft}
                      onDraftChange={setRenameDraft}
                      onStartEdit={() => startRenameSheet(sheetId)}
                      onCommit={commitRenameSheet}
                      onCancel={cancelRenameSheet}
                    />
                    {forkContext ? (
                      <p className="mt-0.5 text-[11px] leading-snug text-primary">{forkContext.line}</p>
                    ) : null}
                    {endpointHint ? (
                      <p className="mt-0.5 text-[11px] font-medium leading-snug text-foreground">
                        {endpointHint}
                      </p>
                    ) : null}
                    {variationLines.map((line) => (
                      <p
                        key={`${sheetId}-${line}`}
                        className="mt-0.5 text-[11px] font-medium leading-snug text-foreground"
                      >
                        {line}
                      </p>
                    ))}
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {integration}
                      {rowCount > 0 ? ` · ${rowCount.toLocaleString()} rows loaded` : " · no rows"}
                    </p>
                  </div>
                  {canReplay || canEdit ? (
                    <TooltipProvider delayDuration={300}>
                      <div className="flex shrink-0 items-center gap-1">
                        {canEdit ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 w-7 px-0"
                                disabled={replayBusy || !!pull.loading}
                                onClick={() => openEditDialog(sheetId)}
                                aria-label="Edit"
                              >
                                <Pencil className="h-3 w-3" aria-hidden />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-xs">
                              Edit
                            </TooltipContent>
                          </Tooltip>
                        ) : null}
                        {canReplay ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 w-7 px-0"
                                disabled={replayBusy}
                                onClick={() => openReplayDialog(sheetId)}
                                aria-label="Replay"
                              >
                                <RotateCcw className="h-3 w-3" aria-hidden />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-xs">
                              Replay
                            </TooltipContent>
                          </Tooltip>
                        ) : null}
                      </div>
                    </TooltipProvider>
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
      </div>

      {currentIntegrationName ? (
        <div className="shrink-0 flex justify-end border-t border-border/40 bg-background/80 pt-2 mt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-auto max-w-full justify-end gap-1.5 whitespace-normal px-2.5 py-1.5 text-right text-[11px] leading-snug"
            disabled={!!pull.loading || replayBusy}
            onClick={runAnotherIntegrationRequest}
          >
            <Play className="h-3 w-3 shrink-0" aria-hidden />
            <span className="min-w-0">Run another {currentIntegrationName} request</span>
          </Button>
        </div>
      ) : null}

      <ConnectHomeReplaySheetDialog
        open={sheetActionOpen}
        intent={sheetActionIntent}
        onOpenChange={(open) => {
          if (replayBusy) return;
          if (!open) closeSheetActionDialog();
          else setSheetActionOpen(true);
        }}
        queryLabel={actionQueryLabel}
        sourceSheetName={String(actionSource?.name || "").trim()}
        loading={sheetActionIntent === "replay" && replayBusy}
        pullLabel={pull.label}
        pullProgress={pull.progress}
        onReplaceCurrent={() => {
          if (sheetActionIntent === "edit") runEditCompose("replace");
          else void runReplay("replace");
        }}
        onCreateNewSheet={(name) => {
          if (sheetActionIntent === "edit") runEditCompose("new_sheet", name);
          else void runReplay("new_sheet", name);
        }}
      />
    </div>
  );
}
