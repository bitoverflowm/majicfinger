"use client";

import { useCallback, useRef, useState } from "react";
import { ArrowUpFromLine, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useMyStateV2 } from "@/context/stateContextV2";
import { parseSpreadsheetFile } from "@/lib/parseSpreadsheetFile";
import { cn } from "@/lib/utils";

import { Progress } from "@/components/ui/progress";
import { ConnectHomeUploadWarnings } from "@/components/connectData/ConnectHomeUploadWarnings";

const iconStroke = 1.75;

export function ConnectHomeFileUpload({ onParsed }) {
  const context = useMyStateV2();
  const setDataSheets = context?.setDataSheets;
  const setActiveSheetId = context?.setActiveSheetId;
  const setDataTypes = context?.setDataTypes;
  const setDataConnected = context?.setDataConnected;
  const setLoadedDataId = context?.setLoadedDataId;
  const setLoadedDataMeta = context?.setLoadedDataMeta;

  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const applyFile = useCallback(
    async (file) => {
      if (!file) return;
      setLoading(true);
      setProgress(12);
      try {
        const result = await parseSpreadsheetFile(file);
        setProgress(88);
        setDataSheets?.(result.sheets);
        setActiveSheetId?.(result.activeSheetId);
        setDataTypes?.(result.dataTypes);
        setDataConnected?.(true);
        setLoadedDataId?.(null);
        setLoadedDataMeta?.(null);
        setProgress(100);
        onParsed?.(result);
      } catch (err) {
        toast.error(err?.message || "Could not parse file");
      } finally {
        setLoading(false);
      }
    },
    [
      onParsed,
      setActiveSheetId,
      setDataConnected,
      setDataSheets,
      setDataTypes,
      setLoadedDataId,
      setLoadedDataMeta,
    ],
  );

  const onInputChange = (e) => {
    const file = e.target.files?.[0];
    void applyFile(file);
    e.target.value = "";
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    void applyFile(file);
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-6 pb-10 pt-8 sm:px-10">
      <h2 className="mb-6 text-lg font-semibold tracking-tight text-foreground">Upload your file</h2>
      <button
        type="button"
        disabled={loading}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-colors",
          dragOver
            ? "border-primary/60 bg-primary/5"
            : "border-border/70 bg-card/50 hover:border-border hover:bg-muted/20",
          loading && "pointer-events-none opacity-70",
        )}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/80 text-muted-foreground">
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" strokeWidth={iconStroke} />
          ) : (
            <ArrowUpFromLine className="h-5 w-5" strokeWidth={iconStroke} />
          )}
        </span>
        <span className="text-sm font-medium text-foreground">
          {loading ? "Parsing your file…" : "Drag and drop CSV or XLSX here"}
        </span>
        <span className="text-xs text-muted-foreground">or click to browse</span>
        <span className="text-[10px] text-muted-foreground">.csv and .xlsx only</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.csv"
        className="sr-only"
        onChange={onInputChange}
      />
      {loading ? <Progress value={progress} className="mt-4 h-1" /> : null}
      <ConnectHomeUploadWarnings className="mt-8" />
    </div>
  );
}
