"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Play, AlertCircle, Terminal } from "lucide-react";
import {
  getDataLakeDatasetConfig,
  isDataLakeS3ProxyEnabled,
  buildParquetUrl,
} from "@/config/dataLakeParquetSamples";
import {
  ingestRemoteParquetAsView,
  listBeckerParquetViews,
  runBeckerSelectSql,
} from "@/lib/duckdb/duckdbWasmClient";
import { ConnectProgressWithLabel } from "./ConnectProgressWithLabel";
import { runParquetSheetLoadWithProgress, PARQUET_LOAD_PHASE_MESSAGES } from "./parquetSheetLoadProgress";
import { ReplaceOrNewSheetDialog } from "@/components/dataView/replaceOrNewSheetDialog";
import { useMyStateV2 } from "@/context/stateContextV2";

const DEFAULT_LIMIT = 200;

/**
 * @param {{ setConnectedData: (rows: Record<string, unknown>[]) => void; dataset?: "polymarket" | "kalshi" }} props
 */
export default function DataLakeParquetPanel({ setConnectedData, dataset = "polymarket" }) {
  const ctx = useMyStateV2();
  const connectedData = ctx?.connectedData ?? [];
  const replaceCurrentSheetData = ctx?.replaceCurrentSheetData;
  const addNewSheetAndActivate = ctx?.addNewSheetAndActivate;
  const setSheetData = ctx?.setSheetData;
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
  const [sqlDraft, setSqlDraft] = useState("");
  const [sqlLoading, setSqlLoading] = useState(false);
  const [sqlError, setSqlError] = useState(null);

  /** @type {React.MutableRefObject<null | { kind: "ingest"; loadArg: unknown; lim: number; sampleId: string } | { kind: "sql"; sql: string }>} */
  const pendingSheetActionRef = useRef(null);

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

  const applyRowsToCurrentSheet = useCallback(
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
    const pending = pendingSheetActionRef.current;
    if (!pending || pending.kind !== "ingest") return;
    const { loadArg, lim, sampleId: sid } = pending;
    pendingSheetActionRef.current = null;
    setSheetDialogOpen(false);
    setError(null);
    setLastRowCount(null);
    setLoading(true);
    setLoadLabel(PARQUET_LOAD_PHASE_MESSAGES[0].text);
    setLoadProgress(5);
    try {
      const { rows, rowCount } = await runIngestWithProgress(loadArg, lim, sid);
      applyRowsToCurrentSheet(rows);
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
  }, [applyRowsToCurrentSheet, refreshBeckerViews, runIngestWithProgress]);

  const executeIngestNewSheet = useCallback(async () => {
    const pending = pendingSheetActionRef.current;
    if (!pending || pending.kind !== "ingest") return;
    const { loadArg, lim, sampleId: sid } = pending;
    pendingSheetActionRef.current = null;
    setSheetDialogOpen(false);
    setError(null);
    setLastRowCount(null);
    setLoading(true);
    setLoadLabel(PARQUET_LOAD_PHASE_MESSAGES[0].text);
    setLoadProgress(5);
    try {
      const { rows, rowCount } = await runIngestWithProgress(loadArg, lim, sid);
      addNewSheetAndActivate?.((newId) => {
        setSheetData?.(newId, rows);
        setConnectedData?.(rows);
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
    refreshBeckerViews,
    runIngestWithProgress,
    setConnectedData,
    setSheetData,
  ]);

  const executeSqlReplace = useCallback(async () => {
    const pending = pendingSheetActionRef.current;
    if (!pending || pending.kind !== "sql") return;
    const { sql } = pending;
    pendingSheetActionRef.current = null;
    setSheetDialogOpen(false);
    setSqlError(null);
    setSqlLoading(true);
    try {
      const { rows } = await runBeckerSelectSql(sql);
      applyRowsToCurrentSheet(rows);
      setLastRowCount(rows.length);
    } catch (e) {
      setSqlError(e?.message || String(e));
    } finally {
      setSqlLoading(false);
    }
  }, [applyRowsToCurrentSheet]);

  const executeSqlNewSheet = useCallback(async () => {
    const pending = pendingSheetActionRef.current;
    if (!pending || pending.kind !== "sql") return;
    const { sql } = pending;
    pendingSheetActionRef.current = null;
    setSheetDialogOpen(false);
    setSqlError(null);
    setSqlLoading(true);
    try {
      const { rows } = await runBeckerSelectSql(sql);
      addNewSheetAndActivate?.((newId) => {
        setSheetData?.(newId, rows);
        setConnectedData?.(rows);
      });
      setLastRowCount(rows.length);
    } catch (e) {
      setSqlError(e?.message || String(e));
    } finally {
      setSqlLoading(false);
    }
  }, [addNewSheetAndActivate, setConnectedData, setSheetData]);

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

    if (connectedData.length > 0) {
      pendingSheetActionRef.current = {
        kind: "ingest",
        loadArg,
        lim,
        sampleId: selected?.id || sampleId,
      };
      setSheetDialogOpen(true);
      return;
    }

    pendingSheetActionRef.current = {
      kind: "ingest",
      loadArg,
      lim,
      sampleId: selected?.id || sampleId,
    };
    void executeIngestReplace();
  };

  const handleRunSql = () => {
    setSqlError(null);
    const sql = sqlDraft.trim();
    if (!sql) {
      setSqlError("Enter a SELECT query.");
      return;
    }
    if (connectedData.length > 0) {
      pendingSheetActionRef.current = { kind: "sql", sql };
      setSheetDialogOpen(true);
      return;
    }
    pendingSheetActionRef.current = { kind: "sql", sql };
    void executeSqlReplace();
  };

  const onDialogReplace = () => {
    const p = pendingSheetActionRef.current;
    if (p?.kind === "ingest") void executeIngestReplace();
    else if (p?.kind === "sql") void executeSqlReplace();
  };

  const onDialogAddNewSheet = () => {
    const p = pendingSheetActionRef.current;
    if (p?.kind === "ingest") void executeIngestNewSheet();
    else if (p?.kind === "sql") void executeSqlNewSheet();
  };

  const onDialogOpenChange = (open) => {
    setSheetDialogOpen(open);
    if (!open) pendingSheetActionRef.current = null;
  };

  const exampleJoinSql = useMemo(() => {
    if (beckerViews.length < 2) return "";
    const a = beckerViews[0]?.viewName;
    const b = beckerViews[1]?.viewName;
    if (!a || !b) return "";
    return `SELECT * FROM ${a} t0 CROSS JOIN ${b} t1 LIMIT 20`;
  }, [beckerViews]);

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
          <p className="text-[10px] font-medium text-muted-foreground">DuckDB views (this tab)</p>
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

      <details className="group min-w-0 max-w-full">
        <summary className="cursor-pointer select-none text-[10px] font-medium text-muted-foreground hover:text-foreground flex items-center gap-1.5">
          <Terminal className="h-3.5 w-3.5 shrink-0" />
          SQL (SELECT only — JOIN across views above)
        </summary>
        <div className="mt-2 space-y-2 pt-2 border-t border-border/60">
          <Textarea
            className="min-h-[72px] text-[10px] font-mono min-w-0"
            placeholder={
              exampleJoinSql ||
              'SELECT * FROM v_becker_polymarket_sample_trades LIMIT 50'
            }
            value={sqlDraft}
            onChange={(e) => setSqlDraft(e.target.value)}
            disabled={sqlLoading}
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-8 text-xs"
            disabled={sqlLoading}
            onClick={handleRunSql}
          >
            Run SQL into sheet
          </Button>
          {sqlError && (
            <p className="text-destructive text-[10px] break-words">{sqlError}</p>
          )}
        </div>
      </details>

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
