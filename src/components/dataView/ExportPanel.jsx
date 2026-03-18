"use client";

import { useCallback, useMemo } from "react";
import { useMyStateV2 } from "@/context/stateContextV2";
import { useChartBuilder } from "@/components/chartView";
import { Toggle } from "@/components/ui/toggle";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import * as XLSX from "xlsx";

function getColKeys(connectedCols) {
  return (connectedCols || [])
    .map((c) => (c && typeof c === "object" && "field" in c ? c.field : c))
    .filter(Boolean);
}

function ExportChartSection() {
  const { downloadChart } = useChartBuilder();
  return (
    <div className="space-y-2">
      <p className="text-xs font-bold text-muted-foreground">Export Chart</p>
      <div className="flex min-w-0 flex-wrap gap-1">
        <Toggle
          aria-label="Export png"
          onClick={() => downloadChart("png")}
          pressed={false}
          className="bg-slate-100/40"
        >
          <span className="text-[10px] text-slate-800">png</span>
        </Toggle>
        <Toggle
          aria-label="Export svg"
          onClick={() => downloadChart("svg")}
          pressed={false}
          className="bg-slate-100/40"
        >
          <span className="text-[10px] text-slate-800">svg</span>
        </Toggle>
        <Toggle
          aria-label="Export jpeg"
          onClick={() => downloadChart("jpg")}
          pressed={false}
          className="bg-slate-100/40"
        >
          <span className="text-[10px] text-slate-800">jpeg</span>
        </Toggle>
      </div>
    </div>
  );
}

function ExportDataSection() {
  const contextStateV2 = useMyStateV2();
  const connectedData = contextStateV2?.connectedData || [];
  const connectedCols = contextStateV2?.connectedCols || [];

  const colKeys = useMemo(() => getColKeys(connectedCols), [connectedCols]);
  const exportData = useMemo(() => connectedData || [], [connectedData]);

  const downloadFile = useCallback((blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const downloadCSV = useCallback(() => {
    if (!exportData.length) {
      toast.error("No data to export");
      return;
    }
    const cols = colKeys.length ? colKeys : Object.keys(exportData[0] || {});
    const escape = (v) => {
      const s = v == null ? "" : String(v);
      if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const header = cols.map(escape).join(",");
    const rows = exportData.map((row) => cols.map((c) => escape(row[c])).join(","));
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    downloadFile(blob, `export-${Date.now()}.csv`);
    toast.success("CSV downloaded");
  }, [exportData, colKeys, downloadFile]);

  const downloadJSON = useCallback(() => {
    if (!exportData.length) {
      toast.error("No data to export");
      return;
    }
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: "application/json;charset=utf-8;" });
    downloadFile(blob, `export-${Date.now()}.json`);
    toast.success("JSON downloaded");
  }, [exportData, downloadFile]);

  const downloadXLSX = useCallback(() => {
    if (!exportData.length) {
      toast.error("No data to export");
      return;
    }
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, `export-${Date.now()}.xlsx`);
    toast.success("Excel file downloaded");
  }, [exportData]);

  return (
    <div className="space-y-2">
      <p className="text-xs font-bold text-muted-foreground">Export Data</p>
      <div className="flex min-w-0 flex-wrap gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 bg-slate-100/40 px-2 text-[10px] text-slate-800 hover:bg-slate-200/50"
          onClick={downloadCSV}
        >
          CSV
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 bg-slate-100/40 px-2 text-[10px] text-slate-800 hover:bg-slate-200/50"
          onClick={downloadJSON}
        >
          JSON
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 bg-slate-100/40 px-2 text-[10px] text-slate-800 hover:bg-slate-200/50"
          onClick={downloadXLSX}
        >
          XLSX
        </Button>
      </div>
    </div>
  );
}

export default function ExportPanel() {
  return (
    <div className="flex min-w-0 flex-col gap-4 p-3">
      <ExportChartSection />
      <ExportDataSection />
    </div>
  );
}
