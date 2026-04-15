"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMyStateV2 } from "@/context/stateContextV2";
import { useChartBuilder } from "@/components/chartView";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { useUser } from "@/lib/hooks";
import { isValidChartEmbedSlug, normalizeChartEmbedSlug } from "@/lib/chartEmbedSlug";
import { scrollToPricingSection } from "@/lib/scrollToPricing";

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
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2 text-[10px]"
          onClick={() => downloadChart("png")}
        >
          PNG
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2 text-[10px]"
          onClick={() => downloadChart("svg")}
        >
          SVG
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2 text-[10px]"
          onClick={() => downloadChart("jpg")}
        >
          JPEG
        </Button>
      </div>
    </div>
  );
}

const SITE = typeof process !== "undefined" && process.env.NEXT_PUBLIC_SITE_URL
  ? process.env.NEXT_PUBLIC_SITE_URL
  : "https://lycheedata.com";

function ShareEmbedSection() {
  const user = useUser();
  const v2 = useMyStateV2();
  const isDemo = v2?.isDemo;
  const setViewing = v2?.setViewing;
  const userHandle = v2?.userHandle;
  const loadedChartMeta = v2?.loadedChartMeta;
  const setRefetchChart = v2?.setRefetchChart;
  const { getBuilderSnapshot } = useChartBuilder();

  const [slugInput, setSlugInput] = useState("");
  const [showSignupDialog, setShowSignupDialog] = useState(false);

  useEffect(() => {
    if (loadedChartMeta?.public_slug) {
      setSlugInput(loadedChartMeta.public_slug);
      return;
    }
    setSlugInput(normalizeChartEmbedSlug(loadedChartMeta?.chart_name || "chart") || "chart");
  }, [loadedChartMeta?._id, loadedChartMeta?.chart_name, loadedChartMeta?.public_slug]);

  const publicUrl = useMemo(() => {
    const slug = normalizeChartEmbedSlug(slugInput);
    if (!userHandle || !isValidChartEmbedSlug(slug)) return "";
    return `${SITE.replace(/\/$/, "")}/${encodeURIComponent(userHandle)}/charts/${encodeURIComponent(slug)}`;
  }, [userHandle, slugInput]);

  const iframeSnippet = useMemo(() => {
    if (!publicUrl) return "";
    return `<iframe src="${publicUrl}" title="Lychee chart" width="100%" height="480" style="border:0" loading="lazy"></iframe>`;
  }, [publicUrl]);

  const publishEmbed = useCallback(async () => {
    if (isDemo) {
      setShowSignupDialog(true);
      return;
    }
    if (!user) {
      toast.error("Sign in to create an embed link");
      return;
    }
    if (!userHandle) {
      toast.error("Set your user handle under Profile before publishing");
      return;
    }
    if (!loadedChartMeta?._id) {
      toast.error("Save your chart from the nav bar first, then return here");
      return;
    }
    const slug = normalizeChartEmbedSlug(slugInput);
    if (!isValidChartEmbedSlug(slug)) {
      toast.error("Use a URL slug with lowercase letters, numbers, and hyphens only");
      return;
    }

    const chartRes = await fetch(`/api/charts/chart/${loadedChartMeta._id}`, {
      credentials: "include",
    });
    const chartJson = await chartRes.json();
    const full = chartJson?.data;
    if (!full) {
      toast.error("Could not load chart to publish");
      return;
    }
    const prev0 =
      Array.isArray(full.chart_properties) && full.chart_properties[0] && typeof full.chart_properties[0] === "object"
        ? { ...full.chart_properties[0] }
        : {};
    const snapshot = getBuilderSnapshot();
    const chart_properties = [{ ...prev0, rechartsBuilder: snapshot }];

    const putRes = await fetch(`/api/charts/chart/${loadedChartMeta._id}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chart_name: full.chart_name,
        chart_properties,
        labels: full.labels?.length ? full.labels : ["export"],
        public_slug: slug,
        is_public: true,
      }),
    });
    const putJson = await putRes.json();
    if (!putRes.ok || !putJson?.success) {
      toast.error(putJson?.message || "Publish failed");
      return;
    }
    toast.success("Embed link is live");
    setRefetchChart?.(1);
  }, [
    user,
    isDemo,
    userHandle,
    loadedChartMeta,
    slugInput,
    getBuilderSnapshot,
    setRefetchChart,
  ]);

  const copyText = useCallback(async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Could not copy to clipboard");
    }
  }, []);

  return (
    <div className="space-y-2">
      <p className="text-xs font-bold text-muted-foreground">Share</p>
      <p className="text-[10px] text-muted-foreground">
        Publish an interactive embed on lycheedata.com. Save the chart first, then pick a URL slug.
      </p>
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-medium text-muted-foreground" htmlFor="embed-slug">
          URL slug
        </label>
        <div className="flex items-center gap-2">
          <p className="truncate text-[10px] text-muted-foreground">
            {`${SITE.replace(/^https?:\/\//, "").replace(/\/$/, "")}/${
              userHandle || "handle"
            }/charts/`}
          </p>
          <Input
            id="embed-slug"
            className="h-8 w-[92px] shrink-0 text-xs"
            value={slugInput}
            onChange={(e) => setSlugInput(e.target.value)}
            placeholder="my-chart"
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2 text-[10px]"
          onClick={publishEmbed}
        >
          Publish embed
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2 text-[10px]"
          disabled={!publicUrl}
          onClick={() => copyText(publicUrl, "Link")}
        >
          Copy link
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2 text-[10px]"
          disabled={!iframeSnippet}
          onClick={() => copyText(iframeSnippet, "Iframe")}
        >
          Copy iframe
        </Button>
      </div>
      {publicUrl ? (
        <p className="break-all text-[10px] text-muted-foreground">{publicUrl}</p>
      ) : null}
      <AlertDialog open={showSignupDialog} onOpenChange={setShowSignupDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign up to share your chart</AlertDialogTitle>
            <AlertDialogDescription>
              Create an account to publish interactive embeds and get a shareable public link.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not now</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (isDemo) {
                  scrollToPricingSection();
                  return;
                }
                setViewing?.("pricing");
              }}
            >
              Sign up
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
          variant="outline"
          size="sm"
          className="h-8 px-2 text-[10px]"
          onClick={downloadCSV}
        >
          CSV
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2 text-[10px]"
          onClick={downloadJSON}
        >
          JSON
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2 text-[10px]"
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
      <ShareEmbedSection />
      <ExportDataSection />
    </div>
  );
}
