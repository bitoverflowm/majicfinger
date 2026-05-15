"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";

import { AthenaConnectionStatusDot } from "@/components/connectData/AthenaConnectionStatusDot";
import { integrations_list } from "@/components/integrationsView/integrationsConfig";
import { Button } from "@/components/ui/button";
import { ATHENA_KALSHI_SAMPLE_OPTIONS, KALSHI_CONNECT_DATA_SOURCES } from "@/config/dataLakeParquetSamples";
import { useMyStateV2 } from "@/context/stateContextV2";
import { ConnectComposeOperationPanel } from "@/components/connectData/ConnectComposeOperationPanel";
import { ConnectDataOperationsSection } from "@/components/connectData/ConnectDataOperationsSection";
import { getKalshiColumnDisplayLabel, getKalshiConnectColumnsForSample } from "@/lib/kalshiConnectColumns";
import { isConnectIntegrationWorkspace } from "@/lib/connectHomeWorkspace";
import { cn } from "@/lib/utils";

const KALSHI_SAMPLE_BY_ID = Object.fromEntries(ATHENA_KALSHI_SAMPLE_OPTIONS.map((s) => [s.id, s]));

const columnRowVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.035, duration: 0.22, ease: [0.22, 1, 0.36, 1] },
  }),
};

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

function ColumnHoverPreview({ sampleId, className }) {
  const columns = getKalshiConnectColumnsForSample(sampleId);
  if (!columns.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className={cn("overflow-y-auto", className)}
    >
      <div className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
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
                <span className="text-[11px] text-foreground">{getKalshiColumnDisplayLabel(col)}</span>
                <span className="text-[10px] text-muted-foreground">{col.type}</span>
                <span className="col-span-2 text-[11px] leading-snug text-muted-foreground">
                  {col.description}
                </span>
              </motion.div>
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}

/** Fixed slot height so hover preview does not shift the Pick one block (avoids hover jitter). */
const KALSHI_HOVER_PREVIEW_SLOT_CLASS = "h-[min(26rem,42vh)] min-h-[11rem] shrink-0";

function ColumnPicker({ sampleId, selectedColumns, onToggleColumn, onSelectAll, onDeselectAll }) {
  const columns = getKalshiConnectColumnsForSample(sampleId);
  const selectedSet = new Set(selectedColumns);
  const allSelected = columns.length > 0 && selectedColumns.length === columns.length;
  const noneSelected = selectedColumns.length === 0;
  const pickerRef = useRef(null);

  useEffect(() => {
    const t = window.setTimeout(() => {
      pickerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 220);
    return () => window.clearTimeout(t);
  }, [sampleId]);

  return (
    <motion.div
      ref={pickerRef}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="mt-4 scroll-mt-6 space-y-2"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        <h2 className="text-xs font-semibold tracking-tight text-foreground">
          Select which columns you are interested in pulling
        </h2>
        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[11px] font-normal"
            onClick={onSelectAll}
            disabled={allSelected}
          >
            Select all
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[11px] font-normal"
            onClick={onDeselectAll}
            disabled={noneSelected}
          >
            Deselect all
          </Button>
        </div>
      </div>
      <ul role="list" className="grid grid-cols-1 items-stretch gap-1 sm:grid-cols-2">
        {columns.map((col) => {
          const isSelected = selectedSet.has(col.name);
          const displayLabel = getKalshiColumnDisplayLabel(col);
          return (
            <li key={col.name}>
              <button
                type="button"
                onClick={() => onToggleColumn(col.name)}
                aria-pressed={isSelected}
                title={!isSelected ? col.description : displayLabel}
                className={cn(
                  "flex h-[2.625rem] w-full items-start gap-1.5 rounded-md border px-2 py-1 text-left transition-colors duration-150",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                  isSelected
                    ? "border-primary/35 bg-primary/5"
                    : "border-border/50 bg-card hover:border-border hover:bg-muted/15",
                )}
              >
                <span
                  className={cn(
                    "mt-px flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition-colors",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border/80 bg-background",
                  )}
                  aria-hidden
                >
                  {isSelected ? <Check className="h-2.5 w-2.5" strokeWidth={2.5} /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 items-baseline gap-1.5">
                    <span className="truncate text-[11px] font-medium leading-tight text-foreground">
                      {displayLabel}
                    </span>
                    <span className="shrink-0 text-[9px] leading-tight text-muted-foreground">{col.type}</span>
                  </span>
                  <span
                    className={cn(
                      "mt-0.5 block h-3 line-clamp-1 text-[10px] leading-3 text-muted-foreground",
                      isSelected && "invisible",
                    )}
                    aria-hidden={isSelected}
                  >
                    {col.description}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <ConnectDataOperationsSection selectedCount={selectedColumns.length} />
      <ConnectComposeOperationPanel />
    </motion.div>
  );
}

function KalshiDataSourceCards({
  selectedSampleId,
  onSelect,
  athenaPingBySampleId,
  columnSelections,
  onToggleColumn,
  onSelectAllColumns,
  onDeselectAllColumns,
}) {
  const [hoveredSampleId, setHoveredSampleId] = useState(null);
  /** One preview only: below cards. Skip when hovering the already-selected source (picker is shown). */
  const showHoverPreview =
    !!hoveredSampleId && (!selectedSampleId || hoveredSampleId !== selectedSampleId);

  return (
    <motion.div className={cn("space-y-3", selectedSampleId ? "mt-5" : "mt-8")}>
      <div>
        <h2 className="text-sm font-semibold tracking-tight text-foreground">Pick one</h2>
        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
          Then pick columns and optional joins, filters, or limits below
        </p>
      </div>

      <motion.div
        className="space-y-3"
        onMouseLeave={() => setHoveredSampleId(null)}
      >
      <div className="grid gap-3 sm:grid-cols-2">
        {KALSHI_CONNECT_DATA_SOURCES.map((source) => {
          const isSelected = selectedSampleId === source.sampleId;
          const isHovered = hoveredSampleId === source.sampleId;

          return (
            <motion.div
              key={source.sampleId}
              onMouseEnter={() => setHoveredSampleId(source.sampleId)}
            >
              <button
                type="button"
                onClick={() => onSelect(source.sampleId)}
                className={cn(
                  "relative flex w-full min-h-[5.5rem] flex-col rounded-xl border p-4 text-left transition-all duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
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
      </div>

      {!selectedSampleId ? (
        <div className={cn("relative", KALSHI_HOVER_PREVIEW_SLOT_CLASS)} aria-live="polite">
          <AnimatePresence mode="wait">
            {showHoverPreview ? (
              <ColumnHoverPreview
                key={hoveredSampleId}
                sampleId={hoveredSampleId}
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
            sampleId={selectedSampleId}
            selectedColumns={columnSelections[selectedSampleId] || []}
            onToggleColumn={(col) => onToggleColumn(selectedSampleId, col)}
            onSelectAll={() => onSelectAllColumns(selectedSampleId)}
            onDeselectAll={() => onDeselectAllColumns(selectedSampleId)}
          />
        ) : null}
      </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

/**
 * Connect home workspace intro when an integration is selected (replaces empty grid).
 */
export function ConnectHomeIntegrationWorkflow({ integrationId, className }) {
  const {
    connectDataLakeSampleId,
    setConnectDataLakeSampleId,
    connectKalshiColumnSelections,
    setConnectKalshiColumnSelections,
    athenaPingBySampleId,
    pingAthenaLakeSample,
  } = useMyStateV2() ?? {};

  const pingKalshiSample = useCallback(
    (sampleId) => {
      const snap = KALSHI_SAMPLE_BY_ID[sampleId];
      if (!snap) return;
      void pingAthenaLakeSample?.({ sampleId, lake: "kalshi", table: snap.table });
    },
    [pingAthenaLakeSample],
  );

  const handleSelectKalshiSource = useCallback(
    (sampleId) => {
      setConnectDataLakeSampleId?.(sampleId);
      pingKalshiSample(sampleId);
    },
    [setConnectDataLakeSampleId, pingKalshiSample],
  );

  useEffect(() => {
    if (!connectDataLakeSampleId) return;
    const state = athenaPingBySampleId?.[connectDataLakeSampleId];
    if (state === "loading" || state === "ok" || state === "error") return;
    pingKalshiSample(connectDataLakeSampleId);
  }, [connectDataLakeSampleId, athenaPingBySampleId, pingKalshiSample]);

  const toggleColumn = useCallback(
    (sampleId, columnName) => {
      setConnectKalshiColumnSelections?.((prev) => {
        const current = prev?.[sampleId] || [];
        const has = current.includes(columnName);
        return {
          ...(prev || {}),
          [sampleId]: has ? current.filter((c) => c !== columnName) : [...current, columnName],
        };
      });
    },
    [setConnectKalshiColumnSelections],
  );

  const selectAllColumns = useCallback(
    (sampleId) => {
      const names = getKalshiConnectColumnsForSample(sampleId).map((c) => c.name);
      setConnectKalshiColumnSelections?.((prev) => ({
        ...(prev || {}),
        [sampleId]: names,
      }));
    },
    [setConnectKalshiColumnSelections],
  );

  const deselectAllColumns = useCallback(
    (sampleId) => {
      setConnectKalshiColumnSelections?.((prev) => ({
        ...(prev || {}),
        [sampleId]: [],
      }));
    },
    [setConnectKalshiColumnSelections],
  );

  if (!isConnectIntegrationWorkspace(integrationId)) return null;

  const { name, description } = getIntegrationMeta(integrationId);
  const showKalshiSourceCards = integrationId === "kalshiHistorical";
  const hasColumnPicker = showKalshiSourceCards && !!connectDataLakeSampleId;

  return (
    <div
      className={cn(
        "flex flex-col px-4 sm:px-6 md:px-10 lg:px-14",
        showKalshiSourceCards
          ? hasColumnPicker
            ? "min-h-0 justify-start py-4 sm:py-5"
            : "min-h-0 justify-start py-10 sm:py-12"
          : "min-h-[min(28rem,55vh)] justify-center py-10 sm:py-12",
        className,
      )}
    >
      <div className="mx-auto w-full max-w-2xl">
        <h1
          className={cn(
            "text-balance text-left font-semibold tracking-tight text-foreground",
            hasColumnPicker ? "text-lg sm:text-xl" : "text-xl sm:text-2xl",
          )}
        >
          {name}
        </h1>
        <p
          className={cn(
            "max-w-prose text-muted-foreground",
            hasColumnPicker ? "mt-1.5 text-xs leading-snug" : "mt-3 text-sm leading-relaxed",
          )}
        >
          {description}
        </p>

        {showKalshiSourceCards ? (
          <KalshiDataSourceCards
            selectedSampleId={connectDataLakeSampleId}
            onSelect={handleSelectKalshiSource}
            athenaPingBySampleId={athenaPingBySampleId || {}}
            columnSelections={connectKalshiColumnSelections || {}}
            onToggleColumn={toggleColumn}
            onSelectAllColumns={selectAllColumns}
            onDeselectAllColumns={deselectAllColumns}
          />
        ) : (
          <p className="mt-10 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Use the panel on the right to connect and pull data
          </p>
        )}
      </div>
    </div>
  );
}
