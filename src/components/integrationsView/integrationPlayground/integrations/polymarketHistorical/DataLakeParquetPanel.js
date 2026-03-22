"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Play, AlertCircle } from "lucide-react";
import {
  getDataLakeDatasetConfig,
  isDataLakeS3ProxyEnabled,
  buildParquetUrl,
} from "@/config/dataLakeParquetSamples";
import { ingestRemoteParquetAsView, listBeckerParquetViews } from "@/lib/duckdb/duckdbWasmClient";
import { ConnectProgressWithLabel } from "./ConnectProgressWithLabel";
import { runParquetSheetLoadWithProgress, PARQUET_LOAD_PHASE_MESSAGES } from "./parquetSheetLoadProgress";
import { ReplaceOrNewSheetDialog } from "@/components/dataView/replaceOrNewSheetDialog";
import { useMyStateV2 } from "@/context/stateContextV2";

const DEFAULT_LIMIT = 200;

/**
 * Becker / DuckDB-backed historical Parquet pulls (Polymarket Historical, Kalshi Historical).
 * Each sheet stores its own row array in `dataSheets[sheetId].data`; DuckDB keeps parallel views for re-query.
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

  const { sampleOptions, getBaseUrl, proxyLake } = useMemo(() => getDataLakeDatasetConfig(dataset), [dataset]);

  const useS3Proxy = isDataLakeS3ProxyEnabled();
  const baseConfigured = Boolean(getBaseUrl());
  const canUseSamples = baseConfigured || useS3Proxy;
  const [sampleId, setSampleId] = useState(sampleOptions[0]?.id || "");
  const [limit, setLimit] = useState(String(DEFAULT_LIMIT));
  const [loading, setLoading] = useState(false);
  const [loadLabel, setLoadLabel] = useState(PARQUET_LOAD_PHASE_MESSAGES[0].text);
  const [loadProgress, setLoadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [lastRowCount, setLastRowCount] = useState(null);
  const [sheetDialogOpen, setSheetDialogOpen] = useState(false);
  const [beckerViews, setBeckerViews] = useState(() => listBeckerParquetViews());

  /** @type {React.MutableRefObject<null | { loadArg: unknown; lim: number; sampleId: string }>} */
  const pendingIngestRef = useRef(null);

  useEffect(() => {
    const first = sampleOptions[0]?.id || "";
    setSampleId((prev) => (sampleOptions.some((s) => s.id === prev) ? prev : first));
  }, [dataset, sampleOptions]);

  const selected = sampleOptions.find((s) => s.id === sampleId);

  const refreshBeckerViews = useCallback(() => {
    setBeckerViews(listBeckerParquetViews());
  }, []);

  const resolveUrl = useCallback(() => {
    if (!baseConfigured || !selected) return "";
    return buildParquetUrl(selected.path, getBaseUrl());
  }, [baseConfigured, selected, getBaseUrl]);

  const buildLoadArg = useCallback(() => {
    if (useS3Proxy && selected?.path) {
      return proxyLake === "kalshi"
        ? { proxyPath: selected.path, lake: "kalshi" }
        : { proxyPath: selected.path };
    }
    const url = resolveUrl();
    return url || null;
  }, [useS3Proxy, selected, proxyLake, resolveUrl]);

  /**
   * Writes rows only to the **currently active** sheet. Uses replaceCurrentSheetData so `activeSheetId`
   * is read inside setState (fresh), not a stale closure.
   */
  const applyRowsToActiveSheet = useCallback(
    (rows) => {
      replaceCurrentSheetData?.(rows);
      setConnectedData?.(rows);
    },
    [replaceCurrentSheetData, setConnectedData],
  );

  const runIngestWithProgress = useCallback(
    async (loadArg, lim, sid) => {
      return runParquetSheetLoadWithProgress({
        onLabel: setLoadLabel,
        onProgress: setLoadProgress,
        loadFn: () =>
          ingestRemoteParquetAsView({
            dataset,
            sampleId: sid,
            urlOrProxy: loadArg,
            limit: lim,
          }),
      });
    },
    [dataset],
  );

  const executeIngestReplace = useCallback(async () => {
    const pending = pendingIngestRef.current;
    if (!pending) return;
    const { loadArg, lim, sampleId: sid } = pending;
    pendingIngestRef.current = null;
    setSheetDialogOpen(false);
    setError(null);
    setLastRowCount(null);
    setLoading(true);
    setLoadLabel(PARQUET_LOAD_PHASE_MESSAGES[0].text);
    setLoadProgress(5);
    try {
      const { rows, rowCount } = await runIngestWithProgress(loadArg, lim, sid);
      applyRowsToActiveSheet(rows);
      setLastRowCount(rowCount);
      refreshBeckerViews();
    } catch (e) {
      const msg = e?.message || String(e);
      setError(
        msg +
          (msg.includes("CORS") || msg.includes("fetch") || msg.includes("NetworkError")
            ? " — check S3 CORS for this app’s origin."
            : ""),
      );
    } finally {
      setLoading(false);
      setLoadProgress(0);
    }
  }, [applyRowsToActiveSheet, refreshBeckerViews, runIngestWithProgress]);

  const executeIngestNewSheet = useCallback(async () => {
    const pending = pendingIngestRef.current;
    if (!pending) return;
    const { loadArg, lim, sampleId: sid } = pending;
    pendingIngestRef.current = null;
    setSheetDialogOpen(false);
    setError(null);
    setLastRowCount(null);
    setLoading(true);
    setLoadLabel(PARQUET_LOAD_PHASE_MESSAGES[0].text);
    setLoadProgress(5);

    const sampleLabel =
      sampleOptions.find((s) => s.id === sid)?.label || sid;
    const prefix = dataset === "kalshi" ? "Kalshi" : "Polymarket";

    try {
      const { rows, rowCount } = await runIngestWithProgress(loadArg, lim, sid);

      /**
       * Important: do **not** call `setConnectedData` here. It always targets `activeSheetId` from the
       * hook closure, which is still the *previous* sheet until React re-renders after `setActiveSheetId`.
       * That was overwriting sheet 1 with sheet 2’s rows. Only `setSheetData(newId, …)` for the new tab.
       */
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
      setError(
        msg +
          (msg.includes("CORS") || msg.includes("fetch") || msg.includes("NetworkError")
            ? " — check S3 CORS for this app’s origin."
            : ""),
      );
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
    const lim = Number(limit) || DEFAULT_LIMIT;
    const loadArg = buildLoadArg();
    if (!loadArg) {
      setError(
        canUseSamples
          ? "Choose a sample below."
          : "Set NEXT_PUBLIC_DATA_LAKE_USE_S3_PROXY=true plus server DATA_LAKE_S3_* and AWS_* env vars, or set the public HTTPS base URL env for this dataset.",
      );
      return;
    }

    const sid = selected?.id || sampleId;
    pendingIngestRef.current = { loadArg, lim, sampleId: sid };

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
        <Label className="text-xs">What to load</Label>
        <Select value={sampleId} onValueChange={setSampleId} disabled={!canUseSamples || loading}>
          <SelectTrigger className="h-8 text-xs min-w-0 w-full max-w-full">
            <SelectValue placeholder={canUseSamples ? "Choose sample" : "Configure proxy or public base URL"} />
          </SelectTrigger>
          <SelectContent>
            {sampleOptions.map((s) => (
              <SelectItem key={s.id} value={s.id} className="text-xs">
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <ConnectProgressWithLabel label={loadLabel} progress={loadProgress} className="pt-0.5" />
      ) : (
        <div className="flex gap-2 items-end flex-wrap min-w-0 max-w-full">
          <div className="space-y-1">
            <Label className="text-xs">Max rows</Label>
            <Input
              type="number"
              min={1}
              max={5000}
              className="h-8 text-xs w-24"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
            />
          </div>
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
