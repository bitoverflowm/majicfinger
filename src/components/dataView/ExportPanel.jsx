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
  const connectedData = v2?.connectedData || [];
  const loadedDataMeta = v2?.loadedDataMeta;
  const loadedChartMeta = v2?.loadedChartMeta;
  const setLoadedChartMeta = v2?.setLoadedChartMeta;
  const setRefetchChart = v2?.setRefetchChart;
  const { getBuilderSnapshot, getChartPngDataUrl } = useChartBuilder();

  const uploadOgImage = useCallback(async (chartId) => {
    if (!chartId || typeof getChartPngDataUrl !== "function") return null;
    const imageDataUrl = await getChartPngDataUrl();
    if (!imageDataUrl) return null;
    const ogRes = await fetch(`/api/charts/og-image/${chartId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ imageDataUrl }),
    });
    const ogJson = await ogRes.json();
    if (!ogRes.ok || !ogJson?.success) return null;
    return ogJson?.data?.og_image_url || null;
  }, [getChartPngDataUrl]);

  const [slugInput, setSlugInput] = useState("");
  const [showSignupDialog, setShowSignupDialog] = useState(false);
  const [showSavePublishDialog, setShowSavePublishDialog] = useState(false);
  const [pendingChartName, setPendingChartName] = useState("");
  const [isSavePublishing, setIsSavePublishing] = useState(false);
  const [runtimeOrigin, setRuntimeOrigin] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    setRuntimeOrigin(window.location.origin);
  }, []);

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
    const effectiveSite =
      process.env.NODE_ENV === "development" && runtimeOrigin
        ? runtimeOrigin
        : SITE;
    return `${effectiveSite.replace(/\/$/, "")}/${encodeURIComponent(userHandle)}/charts/${encodeURIComponent(slug)}`;
  }, [runtimeOrigin, slugInput, userHandle]);

  const iframeSnippet = useMemo(() => {
    if (!publicUrl) return "";
    return `<iframe src="${publicUrl}" title="Lychee chart" width="100%" height="480" style="border:0" loading="lazy"></iframe>`;
  }, [publicUrl]);

  const pendingSlug = useMemo(
    () => normalizeChartEmbedSlug((pendingChartName || "").trim() || "chart") || "chart",
    [pendingChartName],
  );

  const saveAndPublish = useCallback(async () => {
    if (isSavePublishing) return;
    if (!user) {
      toast.error("Sign in to create an embed link");
      return;
    }
    if (!userHandle) {
      toast.error("Set your user handle under Profile before publishing");
      return;
    }

    const chartName = (pendingChartName || "").trim();
    if (!chartName) {
      toast.error("Name your chart to proceed");
      return;
    }
    if (!isValidChartEmbedSlug(pendingSlug)) {
      toast.error("Chart name must produce a valid URL slug");
      return;
    }

    try {
      setIsSavePublishing(true);
      const snapshot = getBuilderSnapshot();

      let dataSetId = loadedDataMeta?._id;
      if (!dataSetId) {
        if (!Array.isArray(connectedData) || connectedData.length === 0) {
          toast.error("No data found. Add data before saving and publishing.");
          return;
        }
        const dsRes = await fetch("/api/dataSets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            data_set_name: `${chartName} dataset`,
            data: connectedData,
            created_date: new Date(),
            last_saved_date: new Date(),
            labels: ["embed"],
            source: "userUpload",
            user_id: user.userId,
          }),
        });
        const dsJson = await dsRes.json();
        dataSetId = dsJson?.data?._id || dsJson?._id;
        if (!dsRes.ok || !dataSetId) {
          toast.error(dsJson?.message || "Failed to save dataset");
          return;
        }
      }

      const chart_properties = [{ title: chartName, rechartsBuilder: snapshot }];
      const createRes = await fetch("/api/charts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          chart_name: chartName,
          chart_properties,
          created_date: new Date(),
          last_saved_date: new Date(),
          labels: ["embed"],
          user_id: user.userId,
          data_set_id: dataSetId,
        }),
      });
      const createJson = await createRes.json();
      const chartId = createJson?.data?._id || createJson?._id;
      if (!createRes.ok || !chartId) {
        toast.error(createJson?.message || "Failed to save chart");
        return;
      }

      const ogImageUrl = await uploadOgImage(chartId);

      const publishRes = await fetch(`/api/charts/chart/${chartId}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chart_name: chartName,
          chart_properties,
          labels: ["embed"],
          public_slug: pendingSlug,
          is_public: true,
          ...(ogImageUrl ? { og_image_url: ogImageUrl } : {}),
        }),
      });
      const publishJson = await publishRes.json();
      if (!publishRes.ok || !publishJson?.success) {
        toast.error(publishJson?.message || "Publish failed");
        return;
      }

      setSlugInput(pendingSlug);
      setLoadedChartMeta?.(publishJson?.data);
      setRefetchChart?.(1);
      setShowSavePublishDialog(false);
      toast.success("Chart saved and embed published");
    } finally {
      setIsSavePublishing(false);
    }
  }, [
    connectedData,
    getBuilderSnapshot,
    isSavePublishing,
    loadedDataMeta?._id,
    pendingChartName,
    pendingSlug,
    uploadOgImage,
    setLoadedChartMeta,
    setRefetchChart,
    user,
    userHandle,
  ]);

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
      const guessed =
        (slugInput || "").trim() ||
        (pendingChartName || "").trim() ||
        "chart";
      setPendingChartName(guessed);
      setShowSavePublishDialog(true);
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
    const ogImageUrl = await uploadOgImage(loadedChartMeta._id);

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
        ...(ogImageUrl ? { og_image_url: ogImageUrl } : {}),
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
    pendingChartName,
    slugInput,
    getBuilderSnapshot,
    uploadOgImage,
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
      <AlertDialog open={showSavePublishDialog} onOpenChange={setShowSavePublishDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Chart needs to be saved to proceed</AlertDialogTitle>
            <AlertDialogDescription>
              Name your chart and we will save your data, save the chart, and publish the embed in one step.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="save-publish-chart-name">
              Name chart
            </label>
            <Input
              id="save-publish-chart-name"
              value={pendingChartName}
              onChange={(e) => setPendingChartName(e.target.value)}
              placeholder="my-chart"
            />
            <p className="break-all text-xs text-muted-foreground">
              {`${SITE.replace(/^https?:\/\//, "").replace(/\/$/, "")}/${
                userHandle || "handle"
              }/charts/${pendingSlug}`}
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSavePublishing}>Cancel</AlertDialogCancel>
            <Button type="button" onClick={saveAndPublish} disabled={isSavePublishing}>
              {isSavePublishing ? "Saving..." : "Save and publish"}
            </Button>
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
