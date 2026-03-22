"use client";

import { useState, useCallback } from "react";
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
import { Loader2, Database, AlertCircle } from "lucide-react";
import {
  DATA_LAKE_SAMPLE_OPTIONS,
  buildParquetUrl,
  getDataLakeBaseUrl,
  isDataLakeS3ProxyEnabled,
} from "@/config/dataLakeParquetSamples";
import { queryRemoteParquet } from "@/lib/duckdb/duckdbWasmClient";

const DEFAULT_LIMIT = 200;

export default function DataLakeParquetPanel({ setConnectedData }) {
  const useS3Proxy = isDataLakeS3ProxyEnabled();
  const baseConfigured = Boolean(getDataLakeBaseUrl());
  const canUseSamples = baseConfigured || useS3Proxy;
  const [sampleId, setSampleId] = useState(DATA_LAKE_SAMPLE_OPTIONS[0]?.id || "");
  const [customUrl, setCustomUrl] = useState("");
  const [limit, setLimit] = useState(String(DEFAULT_LIMIT));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastRowCount, setLastRowCount] = useState(null);

  const selected = DATA_LAKE_SAMPLE_OPTIONS.find((s) => s.id === sampleId);

  const resolveUrl = useCallback(() => {
    const trimmed = customUrl.trim();
    if (trimmed) return trimmed;
    if (!baseConfigured || !selected) return "";
    return buildParquetUrl(selected.path);
  }, [customUrl, baseConfigured, selected]);

  const handleLoad = async () => {
    setError(null);
    setLastRowCount(null);
    const trimmedCustom = customUrl.trim();
    const lim = Number(limit) || DEFAULT_LIMIT;

    let loadArg;
    if (trimmedCustom) {
      loadArg = trimmedCustom;
    } else if (useS3Proxy && selected?.path) {
      loadArg = { proxyPath: selected.path };
    } else {
      const url = resolveUrl();
      if (!url) {
        setError(
          canUseSamples
            ? "Choose a sample below, or expand Advanced and paste a public HTTPS Parquet URL."
            : "Set NEXT_PUBLIC_DATA_LAKE_USE_S3_PROXY=true plus server DATA_LAKE_S3_* and AWS_* env vars, or set NEXT_PUBLIC_DATA_LAKE_BASE_URL for a public HTTPS base.",
        );
        return;
      }
      loadArg = url;
    }

    setLoading(true);
    try {
      const { rows, rowCount } = await queryRemoteParquet(loadArg, { limit: lim });
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
    }
  };

  return (
    <div className="rounded-lg border border-dashed border-primary/30 bg-muted/30 p-3 space-y-3 min-w-0">
      <div className="flex items-center gap-2 text-xs font-medium text-foreground">
        <Database className="h-4 w-4 shrink-0 text-primary" />
        <span>Lychee S3 Parquet samples</span>
      </div>
      <p className="text-[10px] text-muted-foreground leading-snug">
        Load archived Polymarket Parquet from your data lake into the grid (DuckDB in the browser). Use{" "}
        <code className="font-mono">NEXT_PUBLIC_DATA_LAKE_USE_S3_PROXY</code> so a private bucket can stay private.
      </p>

      {!canUseSamples && (
        <p className="text-[10px] text-amber-700 dark:text-amber-400 flex gap-1.5 items-start">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>
            Enable samples: either <code className="font-mono">NEXT_PUBLIC_DATA_LAKE_USE_S3_PROXY=true</code> (and
            server <code className="font-mono">DATA_LAKE_S3_BUCKET</code>, <code className="font-mono">DATA_LAKE_S3_KEY_PREFIX</code>
            , AWS keys) or <code className="font-mono">NEXT_PUBLIC_DATA_LAKE_BASE_URL</code> for a public HTTPS base.
          </span>
        </p>
      )}

      <div className="space-y-1 min-w-0">
        <Label className="text-xs">What to load</Label>
        <Select value={sampleId} onValueChange={setSampleId} disabled={!canUseSamples}>
          <SelectTrigger className="h-8 text-xs min-w-0">
            <SelectValue placeholder={canUseSamples ? "Choose sample" : "Configure proxy or public base URL"} />
          </SelectTrigger>
          <SelectContent>
            {DATA_LAKE_SAMPLE_OPTIONS.map((s) => (
              <SelectItem key={s.id} value={s.id} className="text-xs">
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2 items-end flex-wrap">
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
        <Button type="button" size="sm" className="h-8 text-xs shrink-0" disabled={loading} onClick={handleLoad}>
          {loading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
              <span className="ml-1.5">Loading…</span>
            </>
          ) : (
            <>
              <Database className="h-3.5 w-3.5 shrink-0" />
              <span className="ml-1.5">Load into sheet</span>
            </>
          )}
        </Button>
      </div>

      <details className="text-[10px] text-muted-foreground">
        <summary className="cursor-pointer select-none hover:text-foreground">Advanced</summary>
        <div className="mt-2 space-y-1 pt-1 border-t border-border/60">
          <Label className="text-xs text-muted-foreground">Custom Parquet URL (overrides sample)</Label>
          <Input
            className="h-8 text-xs font-mono min-w-0"
            placeholder="https://…/file.parquet"
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
          />
        </div>
      </details>

      {error && (
        <p className="text-destructive text-[10px] flex gap-1.5 items-start min-w-0">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span className="break-words">{error}</span>
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
