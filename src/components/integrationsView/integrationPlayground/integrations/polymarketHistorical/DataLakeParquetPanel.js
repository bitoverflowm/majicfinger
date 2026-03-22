"use client";

import { useState, useCallback, useMemo } from "react";
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
import { queryRemoteParquet } from "@/lib/duckdb/duckdbWasmClient";
import { ConnectProgressWithLabel } from "./ConnectProgressWithLabel";
import { runParquetSheetLoadWithProgress, PARQUET_LOAD_PHASE_MESSAGES } from "./parquetSheetLoadProgress";

const DEFAULT_LIMIT = 200;

/**
 * @param {{ setConnectedData: (rows: Record<string, unknown>[]) => void; dataset?: "polymarket" | "kalshi" }} props
 */
export default function DataLakeParquetPanel({ setConnectedData, dataset = "polymarket" }) {
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

  const selected = sampleOptions.find((s) => s.id === sampleId);

  const resolveUrl = useCallback(() => {
    if (!baseConfigured || !selected) return "";
    return buildParquetUrl(selected.path, getBaseUrl());
  }, [baseConfigured, selected, getBaseUrl]);

  const handleLoad = async () => {
    setError(null);
    setLastRowCount(null);
    const lim = Number(limit) || DEFAULT_LIMIT;

    let loadArg;
    if (useS3Proxy && selected?.path) {
      loadArg =
        proxyLake === "kalshi"
          ? { proxyPath: selected.path, lake: "kalshi" }
          : { proxyPath: selected.path };
    } else {
      const url = resolveUrl();
      if (!url) {
        setError(
          canUseSamples
            ? "Choose a sample below."
            : "Set NEXT_PUBLIC_DATA_LAKE_USE_S3_PROXY=true plus server DATA_LAKE_S3_* and AWS_* env vars, or set the public HTTPS base URL env for this dataset.",
        );
        return;
      }
      loadArg = url;
    }

    setLoading(true);
    setLoadLabel(PARQUET_LOAD_PHASE_MESSAGES[0].text);
    setLoadProgress(5);
    try {
      const { rows, rowCount } = await runParquetSheetLoadWithProgress({
        onLabel: setLoadLabel,
        onProgress: setLoadProgress,
        loadFn: () => queryRemoteParquet(loadArg, { limit: lim }),
      });
      setConnectedData(rows);
      setLastRowCount(rowCount);
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
  };

  return (
    <div className="rounded-lg border border-dashed border-primary/30 bg-muted/30 p-3 space-y-3 min-w-0 max-w-full overflow-hidden">
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
