"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check } from "lucide-react";

import { AthenaConnectionStatusDot } from "@/components/connectData/AthenaConnectionStatusDot";
import { KalshiPowerToolsSearch } from "@/components/connectData/KalshiPowerToolsSearch";
import { integrations_list } from "@/components/integrationsView/integrationsConfig";
import { Button } from "@/components/ui/button";
import { useMyStateV2 } from "@/context/stateContextV2";
import { ComposeColumnFormatFields } from "@/components/connectData/ComposeColumnFormatFields";
import { ComposeGroupingDroppedColumnsWarning } from "@/components/connectData/ComposeGroupingDroppedColumnsWarning";
import { ConnectColumnDisplayNameEdit } from "@/components/connectData/ConnectColumnDisplayNameEdit";
import { ConnectComposeOperationPanel } from "@/components/connectData/ConnectComposeOperationPanel";
import { ConnectQueryComposeRunBar } from "@/components/connectData/ConnectQueryComposeRunBar";
import { composeColumnDisplayLabel } from "@/lib/connectComposeDisplayLabels";
import { prepareConnectHomePullSheet } from "@/lib/connectHomePullDestination";
import { applyKalshiPowerSearchSelection } from "@/lib/kalshiPowerSearchPull";
import { ConnectDataOperationsSection } from "@/components/connectData/ConnectDataOperationsSection";
import { useDataLakeComposeState } from "@/hooks/useDataLakeComposeState";
import { useSyncConnectDataLakeComposeItems } from "@/hooks/useSyncConnectDataLakeComposeItems";
import { getColumnMetaForLakeTable } from "@/lib/dataLake/lakeTableColumns";
import { kindForLakeColumn } from "@/lib/dataLakeComposeHelpers";
import { isConnectIntegrationWorkspace } from "@/lib/connectHomeWorkspace";
import {
  getConnectDataLakeConfig,
  getConnectLiveStreamConfig,
  getPolymarketApiColumnsForEndpoint,
  isConnectDataLakeIntegration,
  isConnectQueryComposeIntegration,
  POLYMARKET_API_CONNECT_SOURCES,
} from "@/lib/connectQueryComposeConfig";
import {
  CONNECT_WORKSPACE_SCROLL_OFFSET_PX,
  connectWorkspaceScrollInsetClass,
} from "@/lib/connectHubLayout";
import {
  scheduleConnectHomeHubScroll,
  scrollConnectComposeTargetIntoView,
} from "@/lib/connectHubScroll";
import { cn } from "@/lib/utils";
import {
  isDemoGatedHistoricalIntegration,
  useDemoProGate,
} from "@/hooks/useDemoProGate";

function sampleByIdForConfig(lakeConfig) {
  return Object.fromEntries((lakeConfig?.sampleOptions || []).map((s) => [s.id, s]));
}

const columnRowVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.035, duration: 0.22, ease: [0.22, 1, 0.36, 1] },
  }),
};

const HOVER_PREVIEW_SLOT_CLASS = "h-[min(26rem,42vh)] min-h-[11rem] shrink-0";

function getIntegrationMeta(integrationId) {
  const row = integrations_list.find((i) => i.clickHandler === integrationId);
  if (!row) {
    return {
      name: integrationId,
      description: "Use the integrations panel to pull data into your project.",
    };
  }
  return { name: row.name, description: row.description };
}

function IntegrationWorkflowHeader({ name, description, compact = false, onGoBack }) {
  return (
    <div className={cn(compact ? "space-y-2" : "space-y-3")}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onGoBack}
        className="-ml-2 h-8 gap-1.5 px-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
        Go back
      </Button>
      <div className={cn(compact ? "space-y-1" : "space-y-2")}>
        <h1
          className={cn(
            "font-semibold tracking-tight text-foreground",
            compact ? "text-lg" : "text-xl sm:text-2xl",
          )}
        >
          {name}
        </h1>
        <p
          className={cn(
            "leading-snug text-muted-foreground",
            compact ? "text-xs" : "text-sm",
          )}
        >
          {description}
        </p>
      </div>
    </div>
  );
}

function ColumnHoverPreview({ columns, getDisplayLabel, className }) {
  if (!columns?.length) return null;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className={cn("overflow-y-auto", className)}
    >
      <motion.div className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
        <div className="mb-2 grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0 border-b border-border/40 pb-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          <span>Column</span>
          <span>Type</span>
        </div>
        <ul className="space-y-0.5">
          {columns.map((col, i) => (
            <li key={col.name} className="list-none">
              <motion.div
                custom={i}
                variants={columnRowVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 border-b border-border/30 py-1.5 last:border-0"
              >
                <span className="text-[11px] text-foreground">{getDisplayLabel(col)}</span>
                <span className="text-[10px] text-muted-foreground">{col.type}</span>
                <span className="col-span-2 text-[11px] leading-snug text-muted-foreground">
                  {col.description}
                </span>
              </motion.div>
            </li>
          ))}
        </ul>
      </motion.div>
    </motion.div>
  );
}

function PolymarketLegacyTradesReference({ intro, columns, getDisplayLabel }) {
  if (!columns?.length) return null;
  return (
    <div className="rounded-lg border border-border/50 bg-muted/15 px-3 py-2.5 space-y-2">
      <p className="text-[11px] font-medium text-foreground">Polymarket legacy trades (FPMM)</p>
      <p className="text-[11px] leading-snug text-muted-foreground">{intro}</p>
      <div className="mb-2 grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0 border-b border-border/40 pb-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        <span>Column</span>
        <span>Type</span>
      </div>
      <ul className="space-y-0.5 max-h-[min(14rem,40vh)] overflow-y-auto">
        {columns.map((col) => (
          <li
            key={col.name}
            className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 border-b border-border/30 py-1.5 last:border-0"
          >
            <span className="text-[11px] text-foreground">{getDisplayLabel(col)}</span>
            <span className="text-[10px] text-muted-foreground">{col.type}</span>
            <span className="col-span-2 text-[11px] leading-snug text-muted-foreground">{col.description}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ColumnPicker({
  sourceId,
  columns,
  getDisplayLabel,
  lake,
  table,
  tableIntro,
  tableNotes,
  enableComposeFormats,
  selectedColumns,
  onSelectColumn,
  onDeselectColumn,
  onSelectAll,
  onDeselectAll,
  showComposeOperations,
  children,
}) {
  const connectDataLakeColumnSelections = useMyStateV2()?.connectDataLakeColumnSelections ?? {};
  const { columnComposeItems, setColumnComposeItems } = useDataLakeComposeState(enableComposeFormats);
  const selectedSet = new Set(selectedColumns);
  const allSelected = columns.length > 0 && selectedColumns.length === columns.length;
  const noneSelected = selectedColumns.length === 0;
  const columnHeaderRef = useRef(null);

  const columnMeta = useMemo(
    () => (lake && table ? getColumnMetaForLakeTable(lake, table) : []),
    [lake, table],
  );
  const typesByName = useMemo(
    () => Object.fromEntries(columnMeta.map((c) => [c.name, c.type])),
    [columnMeta],
  );
  const kindForColumn = useCallback((col) => kindForLakeColumn(col, typesByName), [typesByName]);

  useSyncConnectDataLakeComposeItems({
    connectDataLakeSampleId: enableComposeFormats ? sourceId : "",
    connectDataLakeColumnSelections: enableComposeFormats ? connectDataLakeColumnSelections : {},
    setColumnComposeItems: enableComposeFormats ? setColumnComposeItems : undefined,
    typesByName,
  });

  const composeItemByColumn = useMemo(
    () => Object.fromEntries((columnComposeItems || []).map((item) => [item.column, item])),
    [columnComposeItems],
  );

  const updateComposeItem = useCallback(
    (id, patch) => {
      setColumnComposeItems?.((prev) =>
        (prev || []).map((row) => (row.id === id ? { ...row, ...patch } : row)),
      );
    },
    [setColumnComposeItems],
  );

  useEffect(() => {
    let cancelled = false;
    const scrollColumnHeaderIntoView = () => {
      if (cancelled) return;
      const el = columnHeaderRef.current;
      if (!el) return;
      scrollConnectComposeTargetIntoView(el, {
        behavior: "smooth",
        insetTop: CONNECT_WORKSPACE_SCROLL_OFFSET_PX,
        onlyIfNeeded: true,
      });
    };
    const t = window.setTimeout(scrollColumnHeaderIntoView, 320);
    requestAnimationFrame(() => requestAnimationFrame(scrollColumnHeaderIntoView));
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [sourceId]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="mt-4 space-y-2"
    >
      <div
        ref={columnHeaderRef}
        id="connect-query-column-picker"
        className={cn(
          "flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5",
          connectWorkspaceScrollInsetClass,
        )}
      >
        <h2 className="text-xs font-semibold tracking-tight text-foreground">
          Select which columns you are interested in pulling
        </h2>
        <motion.div className="flex shrink-0 items-center gap-0.5">
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-[11px] font-normal" onClick={onSelectAll} disabled={allSelected}>
            Select all
          </Button>
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-[11px] font-normal" onClick={onDeselectAll} disabled={noneSelected}>
            Deselect all
          </Button>
        </motion.div>
      </div>
      {tableIntro ? (
        <p className="text-xs leading-relaxed text-muted-foreground">{tableIntro}</p>
      ) : null}
      {tableNotes?.footnotes?.map((note) => (
        <p key={note.slice(0, 48)} className="text-[11px] leading-snug text-muted-foreground">
          {note}
        </p>
      ))}
      <ul role="list" className="grid grid-cols-1 items-stretch gap-1 sm:grid-cols-2">
        {columns.map((col) => {
          const isSelected = selectedSet.has(col.name);
          const defaultLabel = getDisplayLabel(col);
          const composeItem = enableComposeFormats ? composeItemByColumn[col.name] : null;
          const displayLabel =
            composeItem && enableComposeFormats
              ? composeColumnDisplayLabel(composeItem, defaultLabel)
              : defaultLabel;
          return (
            <li key={col.name}>
              <div
                className={cn(
                  "flex h-[2.625rem] w-full gap-1 rounded-md border px-2 py-1 transition-colors duration-150",
                  isSelected ? "min-h-[2.625rem] items-center py-1" : "items-start py-1",
                  isSelected
                    ? "border-primary/35 bg-primary/5"
                    : "h-[2.625rem] border-border/50 bg-card hover:border-border hover:bg-muted/15",
                )}
              >
                <button
                  type="button"
                  onClick={() => (isSelected ? onDeselectColumn(col.name) : onSelectColumn(col.name))}
                  aria-pressed={isSelected}
                  className={cn(
                    "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition-colors",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border/80 bg-background hover:border-border",
                  )}
                >
                  {isSelected ? <Check className="h-2.5 w-2.5" strokeWidth={2.5} /> : null}
                </button>
                <button
                  type="button"
                  onClick={() => !isSelected && onSelectColumn(col.name)}
                  title={!isSelected ? col.description : displayLabel}
                  className="min-w-0 flex-1 text-left rounded-sm"
                >
                  <span className={cn("flex min-w-0 items-baseline gap-1.5", !isSelected && "flex-col items-start gap-0")}>
                    <span className="flex min-w-0 items-baseline gap-1">
                      <span className="truncate text-[11px] font-medium leading-tight text-foreground">{displayLabel}</span>
                      <span className="shrink-0 text-[9px] leading-tight text-muted-foreground">{col.type}</span>
                      {isSelected && composeItem && enableComposeFormats ? (
                        <ConnectColumnDisplayNameEdit
                          columnKey={col.name}
                          defaultLabel={defaultLabel}
                          displayName={composeItem.displayName}
                          onSave={(displayName) => updateComposeItem(composeItem.id, { displayName })}
                        />
                      ) : null}
                    </span>
                    {!isSelected ? (
                      <span className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-muted-foreground">{col.description}</span>
                    ) : null}
                  </span>
                </button>
                {isSelected && composeItem && enableComposeFormats ? (
                  <ComposeColumnFormatFields compact item={composeItem} updateComposeItem={updateComposeItem} kindForColumn={kindForColumn} />
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      {tableNotes?.legacyIntro && tableNotes?.legacyColumns?.length ? (
        <PolymarketLegacyTradesReference
          intro={tableNotes.legacyIntro}
          columns={tableNotes.legacyColumns}
          getDisplayLabel={getDisplayLabel}
        />
      ) : null}

      {enableComposeFormats ? (
        <ComposeGroupingDroppedColumnsWarning columnComposeItems={columnComposeItems} />
      ) : null}
      {showComposeOperations ? (
        <>
          <ConnectDataOperationsSection selectedCount={selectedColumns.length} />
          <ConnectComposeOperationPanel />
        </>
      ) : null}
      {children}
    </motion.div>
  );
}

function DataLakeSourceCards({
  lakeConfig,
  selectedSampleId,
  onSelect,
  onClearSelection,
  athenaPingBySampleId,
  columnSelections,
  onSelectColumn,
  onDeselectColumn,
  onSelectAllColumns,
  onDeselectAllColumns,
  showPowerTools = false,
  onPowerSearchSelect,
  powerSearchDisabled = false,
}) {
  const [hoveredSampleId, setHoveredSampleId] = useState(null);
  const sampleById = useMemo(() => sampleByIdForConfig(lakeConfig), [lakeConfig]);
  const showHoverPreview = !!hoveredSampleId && (!selectedSampleId || hoveredSampleId !== selectedSampleId);

  return (
    <div className={cn("space-y-3", selectedSampleId ? "mt-5" : "mt-8")}>
      <div>
        <h2 className="text-sm font-semibold tracking-tight text-foreground">Pick one</h2>
        <div className="mt-0.5 flex items-center justify-between gap-3">
          <p className="text-[11px] leading-snug text-muted-foreground">
            Then pick columns and optional joins, filters, or limits below
          </p>
          {selectedSampleId ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
              className="h-auto shrink-0 px-0 py-0 text-[11px] font-normal text-muted-foreground hover:bg-transparent hover:text-foreground"
            >
              Cancel
            </Button>
          ) : null}
        </div>
      </div>
      <div className="space-y-3" onMouseLeave={() => setHoveredSampleId(null)}>
        <motion.div
          layout
          className={cn("grid gap-3", selectedSampleId ? "grid-cols-1" : "sm:grid-cols-2")}
        >
          <AnimatePresence initial={false} mode="popLayout">
            {(lakeConfig?.connectSources || [])
              .filter((source) => !selectedSampleId || selectedSampleId === source.sampleId)
              .map((source) => {
                const isSelected = selectedSampleId === source.sampleId;
                const isHovered = hoveredSampleId === source.sampleId;
                return (
                  <motion.div
                    key={source.sampleId}
                    layout
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98, filter: "blur(4px)" }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    onMouseEnter={() => setHoveredSampleId(source.sampleId)}
                  >
                    <button
                      type="button"
                      onClick={() => onSelect(source.sampleId)}
                      className={cn(
                        "relative flex w-full min-h-[5.5rem] flex-col rounded-xl border p-4 text-left transition-all duration-200",
                        isSelected
                          ? "border-primary bg-muted/40 shadow-sm ring-2 ring-primary/25"
                          : isHovered
                            ? "border-border bg-muted/25 shadow-md"
                            : "border-border/60 bg-card hover:border-border hover:bg-muted/25 hover:shadow-md",
                      )}
                    >
                      {isSelected ? (
                        <AthenaConnectionStatusDot
                          state={athenaPingBySampleId?.[source.sampleId] || "loading"}
                          size="sm"
                          className="absolute right-3 top-3"
                        />
                      ) : null}
                      <span className="text-sm font-semibold tracking-tight text-foreground pr-6">{source.title}</span>
                      <span className="mt-1 text-xs leading-snug text-muted-foreground">{source.description}</span>
                    </button>
                  </motion.div>
                );
              })}
          </AnimatePresence>
        </motion.div>
        {!selectedSampleId ? (
          <div className={cn("relative", HOVER_PREVIEW_SLOT_CLASS)} aria-live="polite">
            <AnimatePresence mode="wait">
              {showHoverPreview ? (
                <ColumnHoverPreview
                  key={hoveredSampleId}
                  columns={lakeConfig.getColumnsForSample(hoveredSampleId)}
                  getDisplayLabel={lakeConfig.getColumnDisplayLabel}
                  className="absolute inset-0"
                />
              ) : null}
            </AnimatePresence>
          </div>
        ) : null}
        <AnimatePresence>
          {selectedSampleId ? (
            <ColumnPicker
              key={selectedSampleId}
              sourceId={selectedSampleId}
              columns={lakeConfig.getColumnsForSample(selectedSampleId)}
              getDisplayLabel={lakeConfig.getColumnDisplayLabel}
              lake={lakeConfig.lake}
              table={sampleById[selectedSampleId]?.table}
              tableIntro={lakeConfig.getTableIntro?.(selectedSampleId)}
              tableNotes={lakeConfig.getTableNotes?.(selectedSampleId)}
              enableComposeFormats
              selectedColumns={columnSelections[selectedSampleId] || []}
              onSelectColumn={(col) => onSelectColumn(selectedSampleId, col)}
              onDeselectColumn={(col) => onDeselectColumn(selectedSampleId, col)}
              onSelectAll={() => onSelectAllColumns(selectedSampleId)}
              onDeselectAll={() => onDeselectAllColumns(selectedSampleId)}
              showComposeOperations
            />
          ) : null}
        </AnimatePresence>
      </div>
      {showPowerTools && !selectedSampleId ? (
        <KalshiPowerToolsSearch onSelect={onPowerSearchSelect} disabled={powerSearchDisabled} className="pt-2" />
      ) : null}
    </div>
  );
}

function GenericSourceCards({
  sources,
  selectedId,
  onSelect,
  getColumnsForSource,
  getDisplayLabel,
  columnSelections,
  onSelectColumn,
  onDeselectColumn,
  onSelectAllColumns,
  onDeselectAllColumns,
  pickHint,
  runBar,
}) {
  const [hoveredId, setHoveredId] = useState(null);
  const showHoverPreview = !!hoveredId && (!selectedId || hoveredId !== selectedId);
  const selectedCount = selectedId ? (columnSelections[selectedId] || []).length : 0;

  return (
    <div className={cn("space-y-3", selectedId ? "mt-5" : "mt-8")}>
      <div>
        <h2 className="text-sm font-semibold tracking-tight text-foreground">Pick one</h2>
        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{pickHint}</p>
      </div>
      <motion.div className="space-y-3" onMouseLeave={() => setHoveredId(null)}>
        <div className="grid gap-3 sm:grid-cols-2 max-h-[min(24rem,50vh)] overflow-y-auto pr-1">
          {sources.map((source) => {
            const id = source.sampleId || source.id;
            const isSelected = selectedId === id;
            const isHovered = hoveredId === id;
            return (
              <div key={id} onMouseEnter={() => setHoveredId(id)}>
                <button
                  type="button"
                  onClick={() => onSelect(id)}
                  className={cn(
                    "flex w-full min-h-[5.5rem] flex-col rounded-xl border p-4 text-left transition-all duration-200",
                    isSelected
                      ? "border-primary bg-muted/40 shadow-sm ring-2 ring-primary/25"
                      : isHovered
                        ? "border-border bg-muted/25 shadow-md"
                        : "border-border/60 bg-card hover:border-border hover:bg-muted/25 hover:shadow-md",
                  )}
                >
                  <span className="text-sm font-semibold tracking-tight text-foreground">{source.title}</span>
                  {source.group ? (
                    <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      {source.group}
                    </span>
                  ) : null}
                  <span className="mt-1 text-xs leading-snug text-muted-foreground">{source.description}</span>
                </button>
              </div>
            );
          })}
        </div>
        {!selectedId ? (
          <div className={cn("relative", HOVER_PREVIEW_SLOT_CLASS)} aria-live="polite">
            <AnimatePresence mode="wait">
              {showHoverPreview ? (
                <ColumnHoverPreview
                  key={hoveredId}
                  columns={getColumnsForSource(hoveredId)}
                  getDisplayLabel={getDisplayLabel}
                  className="absolute inset-0"
                />
              ) : null}
            </AnimatePresence>
          </div>
        ) : null}
        <AnimatePresence>
          {selectedId ? (
            <ColumnPicker
              key={selectedId}
              sourceId={selectedId}
              columns={getColumnsForSource(selectedId)}
              getDisplayLabel={getDisplayLabel}
              lake={null}
              table={null}
              enableComposeFormats={false}
              selectedColumns={columnSelections[selectedId] || []}
              onSelectColumn={(col) => onSelectColumn(selectedId, col)}
              onDeselectColumn={(col) => onDeselectColumn(selectedId, col)}
              onSelectAll={() => onSelectAllColumns(selectedId)}
              onDeselectAll={() => onDeselectAllColumns(selectedId)}
              showComposeOperations={false}
            >
              {runBar ? runBar({ selectedCount }) : null}
            </ColumnPicker>
          ) : null}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

/**
 * Connect home workspace intro when an integration is selected (replaces empty grid).
 */
export function ConnectHomeIntegrationWorkflow({ integrationId, className }) {
  const ctx = useMyStateV2() ?? {};
  const isDemo = !!ctx.isDemo;
  const { requestHistoricalProUpgrade, dialog: demoProDialog } = useDemoProGate();
  const {
    connectDataLakeSampleId,
    setConnectDataLakeSampleId,
    connectDataLakeColumnSelections,
    setConnectDataLakeColumnSelections,
    connectApiEndpointId,
    setConnectApiEndpointId,
    connectApiColumnSelections,
    setConnectApiColumnSelections,
    connectLiveSourceId,
    setConnectLiveSourceId,
    connectLiveColumnSelections,
    setConnectLiveColumnSelections,
    athenaPingBySampleId,
    pingAthenaLakeSample,
    requestConnectIntegrationPull,
    requestConnectWorkspace,
    setConnectHomePendingSheetName,
    setIntegrationSidebar,
    setRightPanelOpen,
    activeSheetId,
    setDataSheets,
    connectDataLakePullState,
  } = ctx;

  const lakeConfig = getConnectDataLakeConfig(integrationId);
  const liveConfig = getConnectLiveStreamConfig(integrationId);
  const isDataLake = isConnectDataLakeIntegration(integrationId);
  const isApi = integrationId === "polymarket";
  const isLive = !!liveConfig;

  const sampleById = useMemo(() => sampleByIdForConfig(lakeConfig), [lakeConfig]);

  const pingLakeSample = useCallback(
    (sampleId) => {
      if (!lakeConfig) return;
      const snap = sampleById[sampleId];
      if (!snap) return;
      void pingAthenaLakeSample?.({ sampleId, lake: lakeConfig.lake, table: snap.table });
    },
    [lakeConfig, sampleById, pingAthenaLakeSample],
  );

  const handleSelectLakeSource = useCallback(
    (sampleId) => {
      setConnectDataLakeSampleId?.(sampleId);
      pingLakeSample(sampleId);
    },
    [setConnectDataLakeSampleId, pingLakeSample],
  );

  const handleClearLakeSource = useCallback(() => {
    setConnectDataLakeSampleId?.("");
  }, [setConnectDataLakeSampleId]);

  const handleKalshiPowerSearchSelect = useCallback(
    (suggestion) => {
      if (isDemo && isDemoGatedHistoricalIntegration(integrationId)) {
        requestHistoricalProUpgrade(getIntegrationMeta(integrationId).name);
        return;
      }
      applyKalshiPowerSearchSelection(ctx, suggestion);
    },
    [ctx, integrationId, isDemo, requestHistoricalProUpgrade],
  );

  useEffect(() => {
    if (!isDataLake || !connectDataLakeSampleId) return;
    const state = athenaPingBySampleId?.[connectDataLakeSampleId];
    if (state === "loading" || state === "ok" || state === "error") return;
    pingLakeSample(connectDataLakeSampleId);
  }, [isDataLake, connectDataLakeSampleId, athenaPingBySampleId, pingLakeSample]);

  const patchLakeColumns = useCallback(
    (sampleId, updater) => {
      setConnectDataLakeColumnSelections?.((prev) => {
        const current = prev?.[sampleId] || [];
        const next = updater(current);
        if (next === current) return prev ?? {};
        return { ...(prev || {}), [sampleId]: next };
      });
    },
    [setConnectDataLakeColumnSelections],
  );

  const selectLakeColumn = useCallback(
    (sampleId, columnName) => {
      patchLakeColumns(sampleId, (current) =>
        current.includes(columnName) ? current : [...current, columnName],
      );
    },
    [patchLakeColumns],
  );

  const deselectLakeColumn = useCallback(
    (sampleId, columnName) => {
      patchLakeColumns(sampleId, (current) =>
        current.includes(columnName) ? current.filter((c) => c !== columnName) : current,
      );
    },
    [patchLakeColumns],
  );

  const selectAllLakeColumns = useCallback(
    (sampleId) => {
      if (!lakeConfig) return;
      const names = lakeConfig.getColumnsForSample(sampleId).map((c) => c.name);
      setConnectDataLakeColumnSelections?.((prev) => ({ ...(prev || {}), [sampleId]: names }));
    },
    [lakeConfig, setConnectDataLakeColumnSelections],
  );

  const deselectAllLakeColumns = useCallback(
    (sampleId) => {
      setConnectDataLakeColumnSelections?.((prev) => ({ ...(prev || {}), [sampleId]: [] }));
    },
    [setConnectDataLakeColumnSelections],
  );

  const patchKeyedColumns = useCallback((setter, sourceId, updater) => {
    setter?.((prev) => {
      const current = prev?.[sourceId] || [];
      const next = updater(current);
      if (next === current) return prev ?? {};
      return { ...(prev || {}), [sourceId]: next };
    });
  }, []);

  const apiDisplayLabel = useCallback((col) => col.name, []);
  const liveDisplayLabel = useCallback((col) => col.name, []);

  const handleGoBackToIntegrations = useCallback(() => {
    requestConnectWorkspace?.(null);
    scheduleConnectHomeHubScroll();
  }, [requestConnectWorkspace]);

  const handleRunIntegrationPull = useCallback(() => {
    if (isDemo && isDemoGatedHistoricalIntegration(integrationId)) {
      requestHistoricalProUpgrade(getIntegrationMeta(integrationId).name);
      return;
    }
    prepareConnectHomePullSheet(ctx);
    flushSync(() => {
      requestConnectIntegrationPull?.();
    });
  }, [ctx, integrationId, isDemo, requestConnectIntegrationPull, requestHistoricalProUpgrade]);

  if (!isConnectIntegrationWorkspace(integrationId)) return null;
  if (!isConnectQueryComposeIntegration(integrationId)) {
    const { name, description } = getIntegrationMeta(integrationId);
    return (
      <div className={cn("flex min-h-[min(28rem,55vh)] flex-col justify-center px-4 py-10 sm:px-6 md:px-10 lg:px-14", className)}>
        <div className="mx-auto w-full max-w-2xl">
          <IntegrationWorkflowHeader
            name={name}
            description={description}
            compact={false}
            onGoBack={handleGoBackToIntegrations}
          />
          <p className="mt-10 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Use the panel on the right to connect and pull data
          </p>
        </div>
      </div>
    );
  }

  const { name, description } = getIntegrationMeta(integrationId);
  const hasComposeUi =
    (isDataLake && !!connectDataLakeSampleId) ||
    (isApi && !!connectApiEndpointId) ||
    (isLive && !!connectLiveSourceId);

  return (
    <motion.div
      id="connect-home-integration-workflow"
      className={cn(
        "flex flex-col px-4 sm:px-6 md:px-10 lg:px-14",
        connectWorkspaceScrollInsetClass,
        hasComposeUi
          ? "min-h-0 justify-start py-4 sm:py-5"
          : "min-h-0 justify-start pb-10 pt-16 sm:pb-12 sm:pt-20 md:pt-24",
        className,
      )}
    >
      <div className="mx-auto w-full max-w-2xl">
        <IntegrationWorkflowHeader
          name={name}
          description={description}
          compact={hasComposeUi}
          onGoBack={handleGoBackToIntegrations}
        />

        {isDataLake && lakeConfig ? (
          <DataLakeSourceCards
            lakeConfig={lakeConfig}
            selectedSampleId={connectDataLakeSampleId}
            onSelect={handleSelectLakeSource}
            onClearSelection={handleClearLakeSource}
            athenaPingBySampleId={athenaPingBySampleId || {}}
            columnSelections={connectDataLakeColumnSelections || {}}
            onSelectColumn={selectLakeColumn}
            onDeselectColumn={deselectLakeColumn}
            onSelectAllColumns={selectAllLakeColumns}
            onDeselectAllColumns={deselectAllLakeColumns}
            showPowerTools={integrationId === "kalshiHistorical"}
            onPowerSearchSelect={handleKalshiPowerSearchSelect}
            powerSearchDisabled={!!connectDataLakePullState?.loading}
          />
        ) : null}

        {isApi ? (
          <GenericSourceCards
            sources={POLYMARKET_API_CONNECT_SOURCES}
            selectedId={connectApiEndpointId}
            onSelect={(id) => setConnectApiEndpointId?.(id)}
            getColumnsForSource={getPolymarketApiColumnsForEndpoint}
            getDisplayLabel={apiDisplayLabel}
            columnSelections={connectApiColumnSelections || {}}
            onSelectColumn={(sourceId, col) =>
              patchKeyedColumns(setConnectApiColumnSelections, sourceId, (c) =>
                c.includes(col) ? c : [...c, col],
              )
            }
            onDeselectColumn={(sourceId, col) =>
              patchKeyedColumns(setConnectApiColumnSelections, sourceId, (c) =>
                c.filter((x) => x !== col),
              )
            }
            onSelectAllColumns={(sourceId) => {
              const names = getPolymarketApiColumnsForEndpoint(sourceId).map((c) => c.name);
              setConnectApiColumnSelections?.((prev) => ({ ...(prev || {}), [sourceId]: names }));
            }}
            onDeselectAllColumns={(sourceId) => {
              setConnectApiColumnSelections?.((prev) => ({ ...(prev || {}), [sourceId]: [] }));
            }}
            pickHint="Choose an API endpoint, then select response fields to pull"
            runBar={({ selectedCount }) => (
              <ConnectQueryComposeRunBar
                selectedCount={selectedCount}
                onRun={handleRunIntegrationPull}
                runLabel="Run pull"
              />
            )}
          />
        ) : null}

        {isLive && liveConfig ? (
          <GenericSourceCards
            sources={liveConfig.sources}
            selectedId={connectLiveSourceId}
            onSelect={(id) => setConnectLiveSourceId?.(id)}
            getColumnsForSource={() => liveConfig.columns}
            getDisplayLabel={liveDisplayLabel}
            columnSelections={connectLiveColumnSelections || {}}
            onSelectColumn={(sourceId, col) =>
              patchKeyedColumns(setConnectLiveColumnSelections, sourceId, (c) =>
                c.includes(col) ? c : [...c, col],
              )
            }
            onDeselectColumn={(sourceId, col) =>
              patchKeyedColumns(setConnectLiveColumnSelections, sourceId, (c) =>
                c.filter((x) => x !== col),
              )
            }
            onSelectAllColumns={(sourceId) => {
              const names = liveConfig.columns.map((c) => c.name);
              setConnectLiveColumnSelections?.((prev) => ({ ...(prev || {}), [sourceId]: names }));
            }}
            onDeselectAllColumns={(sourceId) => {
              setConnectLiveColumnSelections?.((prev) => ({ ...(prev || {}), [sourceId]: [] }));
            }}
            pickHint="Choose a symbol, then select stream fields to capture"
            runBar={({ selectedCount }) => (
              <ConnectQueryComposeRunBar
                selectedCount={selectedCount}
                onRun={handleRunIntegrationPull}
                runLabel={integrationId === "chainlink" ? "Start stream" : "Connect"}
              />
            )}
          />
        ) : null}
      </div>
      {demoProDialog}
    </motion.div>
  );
}
