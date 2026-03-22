"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Play, AlertCircle } from "lucide-react";
import { getDataLakeDatasetConfig, ATHENA_SAMPLE_ROW_LIMIT } from "@/config/dataLakeParquetSamples";
import { fetchAthenaLakeSample } from "@/lib/dataLake/fetchAthenaSample";
import { ingestAthenaResultAsView, listBeckerParquetViews } from "@/lib/duckdb/duckdbWasmClient";
import { ConnectProgressWithLabel } from "./ConnectProgressWithLabel";
import { runParquetSheetLoadWithProgress, PARQUET_LOAD_PHASE_MESSAGES } from "./parquetSheetLoadProgress";
import { ReplaceOrNewSheetDialog } from "@/components/dataView/replaceOrNewSheetDialog";
import { useMyStateV2 } from "@/context/stateContextV2";

/**
 * Becker / DuckDB-backed historical data: bounded Athena `SELECT *` → JSON → DuckDB view → sheet.
 * Polymarket: markets, blocks, trades. Kalshi: markets, trades (no blocks in Glue).
 *
 * @param {{ setConnectedData: (rows: Record<string, unknown>[]) => void; dataset?: "polymarket" | "kalshi" }} props
 */
export default function DataLakeParquetPanel({ setConnectedData, dataset = "polymarket" }) {
  const ctx = useMyStateV2();
  const connectedData = ctx?.connectedData ?? [];
  const replaceCurrentSheetData = ctx?.replaceCurrentSheetData;
  const addNewSheetAndActivate = ctx?.addNewSheetAndActivate;
  const setSheetData = ctx?.setSheetData;
  const setDataSheets = ctx?.setDataSheets;
  const liveStreamState = ctx?.liveStreamState;
  const activeSheetId = ctx?.activeSheetId;

  const streamsBySheetId = liveStreamState?.streamsBySheetId || {};
  const hasLiveConnection =
    !!activeSheetId &&
    !!streamsBySheetId[activeSheetId]?.isRunning;

  const { sampleOptions, lake } = useMemo(() => getDataLakeDatasetConfig(dataset), [dataset]);

  const canUseSamples = true;
  const [sampleId, setSampleId] = useState(sampleOptions[0]?.id || "");
  const [loading, setLoading] = useState(false);
  const [loadLabel, setLoadLabel] = useState(PARQUET_LOAD_PHASE_MESSAGES[0].text);
  const [loadProgress, setLoadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [lastRowCount, setLastRowCount] = useState(null);
  const [sheetDialogOpen, setSheetDialogOpen] = useState(false);
  const [beckerViews, setBeckerViews] = useState(() => listBeckerParquetViews());

  /** @type {React.MutableRefObject<null | { lake: string; table: string; sampleId: string }>} */
  const pendingIngestRef = useRef(null);

  useEffect(() => {
    const first = sampleOptions[0]?.id || "";
    setSampleId((prev) => (sampleOptions.some((s) => s.id === prev) ? prev : first));
  }, [dataset, sampleOptions]);

  const selected = sampleOptions.find((s) => s.id === sampleId);

  const refreshBeckerViews = useCallback(() => {
    setBeckerViews(listBeckerParquetViews());
  }, []);

  const applyRowsToActiveSheet = useCallback(
    (rows) => {
      replaceCurrentSheetData?.(rows);
      setConnectedData?.(rows);
    },
    [replaceCurrentSheetData, setConnectedData],
  );

  const runIngestWithProgress = useCallback(
    async (lakeVal, table, sid) => {
      return runParquetSheetLoadWithProgress({
        onLabel: setLoadLabel,
        onProgress: setLoadProgress,
        loadFn: async () => {
          const { columns, rows } = await fetchAthenaLakeSample({
            lake: lakeVal,
            table,
            limit: ATHENA_SAMPLE_ROW_LIMIT,
          });
          return ingestAthenaResultAsView({
            dataset,
            sampleId: sid,
            columns,
            rows,
            limit: ATHENA_SAMPLE_ROW_LIMIT,
          });
        },
      });
    },
    [dataset],
  );

  const executeIngestReplace = useCallback(async () => {
    const pending = pendingIngestRef.current;
    if (!pending) return;
    const { lake: lk, table, sampleId: sid } = pending;
    pendingIngestRef.current = null;
    setSheetDialogOpen(false);
    setError(null);
    setLastRowCount(null);
    setLoading(true);
    setLoadLabel(PARQUET_LOAD_PHASE_MESSAGES[0].text);
    setLoadProgress(5);
    try {
      const { rows, rowCount } = await runIngestWithProgress(lk, table, sid);
      applyRowsToActiveSheet(rows);
      setLastRowCount(rowCount);
      refreshBeckerViews();
    } catch (e) {
      const msg = e?.message || String(e);
      setError(msg);
    } finally {
      setLoading(false);
      setLoadProgress(0);
    }
  }, [applyRowsToActiveSheet, refreshBeckerViews, runIngestWithProgress]);

  const executeIngestNewSheet = useCallback(async () => {
    const pending = pendingIngestRef.current;
    if (!pending) return;
    const { lake: lk, table, sampleId: sid } = pending;
    pendingIngestRef.current = null;
    setSheetDialogOpen(false);
    setError(null);
    setLastRowCount(null);
    setLoading(true);
    setLoadLabel(PARQUET_LOAD_PHASE_MESSAGES[0].text);
    setLoadProgress(5);

    const sampleLabel = sampleOptions.find((s) => s.id === sid)?.label || sid;
    const prefix = dataset === "kalshi" ? "Kalshi" : "Polymarket";

    try {
      const { rows, rowCount } = await runIngestWithProgress(lk, table, sid);

      addNewSheetAndActivate?.((newId) => {
        setSheetData?.(newId, rows);
        setDataSheets?.((prev) => {
          const sheet = prev[newId];
          if (!sheet) return prev;
          return {
            ...prev,
            [newId]: {
              ...sheet,
              name: `${prefix} · ${sampleLabel}`.slice(0, 80),
            },
          };
        });
      });

      setLastRowCount(rowCount);
      refreshBeckerViews();
    } catch (e) {
      const msg = e?.message || String(e);
      setError(msg);
    } finally {
      setLoading(false);
      setLoadProgress(0);
    }
  }, [
    addNewSheetAndActivate,
    dataset,
    refreshBeckerViews,
    runIngestWithProgress,
    sampleOptions,
    setDataSheets,
    setSheetData,
  ]);

  const handleLoad = () => {
    setError(null);
    setLastRowCount(null);
    if (!selected?.table) {
      setError("Choose a table below.");
      return;
    }

    pendingIngestRef.current = {
      lake,
      table: selected.table,
      sampleId: selected.id,
    };

    if (connectedData.length > 0) {
      setSheetDialogOpen(true);
      return;
    }

    void executeIngestReplace();
  };

  const onDialogReplace = () => {
    void executeIngestReplace();
  };

  const onDialogAddNewSheet = () => {
    void executeIngestNewSheet();
  };

  const onDialogOpenChange = (open) => {
    setSheetDialogOpen(open);
    if (!open) pendingIngestRef.current = null;
  };

  return (
    <div className="rounded-lg border border-dashed border-primary/30 bg-muted/30 p-3 space-y-3 min-w-0 max-w-full overflow-hidden">
      <ReplaceOrNewSheetDialog
        open={sheetDialogOpen}
        onOpenChange={onDialogOpenChange}
        hasLiveConnection={hasLiveConnection}
        onReplace={onDialogReplace}
        onAddNewSheet={onDialogAddNewSheet}
      />

      <div className="space-y-1 min-w-0 max-w-full">
        <Label className="text-xs">Table</Label>
        <Select value={sampleId} onValueChange={setSampleId} disabled={!canUseSamples || loading}>
          <SelectTrigger className="h-8 text-xs min-w-0 w-full max-w-full">
            <SelectValue placeholder="Choose table" />
          </SelectTrigger>
          <SelectContent>
            {sampleOptions.map((s) => (
              <SelectItem key={s.id} value={s.id} className="text-xs">
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[10px] text-muted-foreground">
          Loads up to <strong>{ATHENA_SAMPLE_ROW_LIMIT}</strong> rows via Athena, then registers a DuckDB view for SQL / joins.
        </p>
      </div>

      {loading ? (
        <ConnectProgressWithLabel label={loadLabel} progress={loadProgress} className="pt-0.5" />
      ) : (
        <div className="flex gap-2 items-end flex-wrap min-w-0 max-w-full">
          <Button type="button" size="sm" className="h-8 text-xs shrink-0" onClick={handleLoad}>
            <Play className="h-3.5 w-3.5 shrink-0" />
            <span className="ml-1.5">Run request</span>
          </Button>
        </div>
      )}

      {beckerViews.length > 0 && (
        <div className="rounded-md border border-border/60 bg-background/50 p-2 space-y-1 min-w-0">
          <p className="text-[10px] font-medium text-muted-foreground">
            DuckDB views in this browser tab (for later joins — each sheet still has its own copy of rows)
          </p>
          <ul className="text-[10px] font-mono break-all space-y-0.5 max-h-24 overflow-y-auto">
            {beckerViews.map((v) => (
              <li key={v.logicalKey}>
                <span className="text-primary">{v.viewName}</span>
                <span className="text-muted-foreground"> — {v.logicalKey}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <p className="text-destructive text-[10px] flex gap-1.5 items-start min-w-0 max-w-full">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span className="min-w-0 break-words">{error}</span>
        </p>
      )}

      {lastRowCount != null && !error && (
        <p className="text-[10px] text-muted-foreground">
          Loaded <strong>{lastRowCount}</strong> rows into the sheet.
        </p>
      )}
    </div>
  );
}
