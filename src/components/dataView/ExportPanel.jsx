"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMyStateV2 } from "@/context/stateContextV2";
import { useChartBuilder } from "@/components/chartView";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { DestructiveIconButton } from "@/components/primitives/destructive-icon-button";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { useUser } from "@/lib/hooks";
import { isValidChartEmbedSlug, normalizeChartEmbedSlug } from "@/lib/chartEmbedSlug";
import { prepareLargeJsonBody } from "@/lib/gzipJsonTransport";
import { useDemoProGate } from "@/hooks/useDemoProGate";

function getColKeys(connectedCols) {
  return (connectedCols || [])
    .map((c) => (c && typeof c === "object" && "field" in c ? c.field : c))
    .filter(Boolean);
}

/** True when the workbook has at least one chart the user can export or share. */
function chartSheetIsShareable(sheet) {
  if (!sheet || typeof sheet !== "object") return false;
  if (sheet.userCreated === true) return true;
  if (sheet.chartMeta?._id) return true;
  if (sheet.snapshot) return true;
  return false;
}

function useHasShareableChart() {
  const chartSheets = useMyStateV2()?.chartSheets || {};
  return useMemo(
    () => Object.values(chartSheets).some(chartSheetIsShareable),
    [chartSheets],
  );
}

function SaveProjectSection({ runOrRequestPro }) {
  const requestSaveProjectDialog = useMyStateV2()?.requestSaveProjectDialog;
  return (
    <div className="space-y-2 border-b border-border pb-3">
      <p className="text-xs font-bold text-muted-foreground">Project</p>
      <Button
        type="button"
        variant="default"
        size="sm"
        className="h-8 w-full px-2 text-[11px]"
        onClick={() =>
          runOrRequestPro?.(() => requestSaveProjectDialog?.(), "saving projects")
        }
      >
        Save project
      </Button>
      <p className="text-[10px] text-muted-foreground">
        Saves your workbook, all charts in this project, and the open dashboard (including publish settings) from the
        header dialog.
      </p>
    </div>
  );
}

function ExportChartSection() {
  const { downloadChart } = useChartBuilder();
  const hasShareableChart = useHasShareableChart();
  return (
    <div className="space-y-2">
      <p className="text-xs font-bold text-muted-foreground">Export Chart</p>
      <TooltipProvider delayDuration={120}>
        <div className="flex min-w-0 flex-wrap gap-1">
          {[
            ["png", "PNG"],
            ["svg", "SVG"],
            ["jpg", "JPEG"],
          ].map(([format, label]) => (
            <Tooltip key={format}>
              <TooltipTrigger asChild>
                <span tabIndex={hasShareableChart ? undefined : 0}>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 text-[10px]"
                    disabled={!hasShareableChart}
                    onClick={() => downloadChart(format)}
                  >
                    {label}
                  </Button>
                </span>
              </TooltipTrigger>
              {!hasShareableChart ? (
                <TooltipContent side="top" className="text-xs">
                  Create a chart from the Chart tab first
                </TooltipContent>
              ) : null}
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
    </div>
  );
}

const SITE = typeof process !== "undefined" && process.env.NEXT_PUBLIC_SITE_URL
  ? process.env.NEXT_PUBLIC_SITE_URL
  : "https://lycheedata.com";

function ShareEmbedSection({ runOrRequestPro }) {
  const user = useUser();
  const v2 = useMyStateV2();
  const userHandle = v2?.userHandle;
  const connectedData = v2?.connectedData || [];
  const dataSheets = v2?.dataSheets || {};
  const loadedDataMeta = v2?.loadedDataMeta;
  const loadedChartMeta = v2?.loadedChartMeta;
  const setLoadedChartMeta = v2?.setLoadedChartMeta;
  const setLoadedChartBuilderSnapshot = v2?.setLoadedChartBuilderSnapshot;
  const chartSheets = v2?.chartSheets || {};
  const setChartSheets = v2?.setChartSheets;
  const activeChartSheetId = v2?.activeChartSheetId;
  const setRefetchChart = v2?.setRefetchChart;
  const chartSnapshotFlusher = v2?.chartSnapshotFlusher;
  const hasShareableChart = useHasShareableChart();
  const { getBuilderSnapshot, getChartOgImageDataUrl } = useChartBuilder();
  const activeChartMeta = activeChartSheetId ? (chartSheets?.[activeChartSheetId]?.chartMeta || loadedChartMeta) : loadedChartMeta;
  const activeChartSheet = activeChartSheetId ? chartSheets?.[activeChartSheetId] : null;
  const workbookChartName = useMemo(
    () => (activeChartSheet?.chartMeta?.chart_name || activeChartSheet?.name || "").trim(),
    [activeChartSheet],
  );

  const syncActiveChartSheet = useCallback((chartMeta, snapshot = null) => {
    if (!activeChartSheetId || !chartMeta) return;
    if (snapshot) setLoadedChartBuilderSnapshot?.(snapshot);
    setChartSheets?.((prev) => {
      const cur = prev?.[activeChartSheetId] || { name: chartMeta.chart_name || "Chart", snapshot: null, chartMeta: null };
      return {
        ...(prev || {}),
        [activeChartSheetId]: {
          ...cur,
          name: chartMeta.chart_name || cur.name,
          chartMeta,
          snapshot: snapshot ?? cur.snapshot ?? null,
        },
      };
    });
  }, [activeChartSheetId, setChartSheets, setLoadedChartBuilderSnapshot]);

  const capturePublishSnapshot = useCallback(async () => {
    if (typeof chartSnapshotFlusher === "function") {
      const flushed = await chartSnapshotFlusher();
      if (flushed) return flushed;
    }
    return getBuilderSnapshot();
  }, [chartSnapshotFlusher, getBuilderSnapshot]);

  const uploadOgImage = useCallback(async (chartId) => {
    if (!chartId || typeof getChartOgImageDataUrl !== "function") return null;
    const imageDataUrl = await getChartOgImageDataUrl();
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
  }, [getChartOgImageDataUrl]);

  const [slugInput, setSlugInput] = useState("");
  const [showSavePublishDialog, setShowSavePublishDialog] = useState(false);
  const [showDeleteEmbedDialog, setShowDeleteEmbedDialog] = useState(false);
  const [pendingChartName, setPendingChartName] = useState("");
  const [isSavePublishing, setIsSavePublishing] = useState(false);
  const [isDeletingEmbed, setIsDeletingEmbed] = useState(false);
  const [runtimeOrigin, setRuntimeOrigin] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    setRuntimeOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    setPendingChartName(workbookChartName);
  }, [activeChartSheetId, workbookChartName]);

  useEffect(() => {
    if (activeChartMeta?.public_slug) {
      setSlugInput(activeChartMeta.public_slug);
      return;
    }
    setSlugInput(normalizeChartEmbedSlug(workbookChartName || activeChartMeta?.chart_name || "chart") || "chart");
  }, [activeChartMeta?._id, activeChartMeta?.chart_name, activeChartMeta?.public_slug, workbookChartName]);

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
  const normalizedSlug = useMemo(() => normalizeChartEmbedSlug(slugInput), [slugInput]);
  const publishedSlug = useMemo(
    () => normalizeChartEmbedSlug(activeChartMeta?.public_slug || ""),
    [activeChartMeta?.public_slug],
  );
  const isPublishedForCurrentSlug = !!(
    activeChartMeta?._id &&
    activeChartMeta?.is_public &&
    publishedSlug &&
    normalizedSlug &&
    publishedSlug === normalizedSlug
  );

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

    const chartName = (workbookChartName || pendingChartName || "").trim();
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
      const snapshot = await capturePublishSnapshot();

      let dataSetId = loadedDataMeta?._id;
      if (!dataSetId) {
        if (!Array.isArray(connectedData) || connectedData.length === 0) {
          toast.error("No data found. Add data before saving and publishing.");
          return;
        }
        const dsPayload = await prepareLargeJsonBody({
          data_set_name: `${chartName} dataset`,
          data: connectedData,
          ...(Object.keys(dataSheets).length ? { data_sheets: dataSheets } : {}),
          created_date: new Date(),
          last_saved_date: new Date(),
          labels: ["embed"],
          source: "userUpload",
          user_id: user.userId,
        });
        const dsRes = await fetch("/api/dataSets", {
          method: "POST",
          headers: dsPayload.headers,
          credentials: "include",
          body: dsPayload.body,
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
      syncActiveChartSheet(publishJson?.data, snapshot);
      setRefetchChart?.(1);
      setShowSavePublishDialog(false);
      toast.success("Chart saved and embed published");
    } finally {
      setIsSavePublishing(false);
    }
  }, [
    connectedData,
    getBuilderSnapshot,
    capturePublishSnapshot,
    isSavePublishing,
    loadedDataMeta?._id,
    pendingChartName,
    pendingSlug,
    uploadOgImage,
    workbookChartName,
    setLoadedChartMeta,
    setRefetchChart,
    user,
    userHandle,
  ]);

  const publishEmbed = useCallback(async () => {
    if (!user) {
      toast.error("Sign in to create an embed link");
      return;
    }
    if (!userHandle) {
      toast.error("Set your user handle under Profile before publishing");
      return;
    }
      if (!activeChartMeta?._id) {
      const guessed = (workbookChartName || slugInput || pendingChartName || "").trim() || "chart";
      setPendingChartName(guessed);
      setShowSavePublishDialog(true);
      return;
    }
    const slug = normalizeChartEmbedSlug(slugInput);
    if (!isValidChartEmbedSlug(slug)) {
      toast.error("Use a URL slug with lowercase letters, numbers, and hyphens only");
      return;
    }

    const chartRes = await fetch(`/api/charts/chart/${activeChartMeta._id}`, {
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
    const snapshot = await capturePublishSnapshot();
    const publishChartName = (workbookChartName || full.chart_name || "").trim() || "Chart";
    const chart_properties = [{ ...prev0, title: publishChartName, rechartsBuilder: snapshot }];
    const ogImageUrl = await uploadOgImage(activeChartMeta._id);

    const putRes = await fetch(`/api/charts/chart/${activeChartMeta._id}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chart_name: publishChartName,
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
    setLoadedChartMeta?.(putJson?.data);
    syncActiveChartSheet(putJson?.data, snapshot);
    setRefetchChart?.(1);
  }, [
    user,
    userHandle,
    activeChartMeta,
    pendingChartName,
    workbookChartName,
    slugInput,
    setLoadedChartMeta,
    getBuilderSnapshot,
    capturePublishSnapshot,
    uploadOgImage,
    setRefetchChart,
    syncActiveChartSheet,
  ]);

  const copyText = useCallback(async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Could not copy to clipboard");
    }
  }, []);

  const deleteEmbed = useCallback(async () => {
    if (!activeChartMeta?._id) return;
    try {
      setIsDeletingEmbed(true);
      const res = await fetch("/api/assets/delete", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "publicPage",
          id: activeChartMeta._id,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        toast.error(json?.message || "Failed to delete public page");
        return;
      }
      setLoadedChartMeta?.((prev) =>
        prev ? { ...prev, is_public: false, public_slug: undefined } : prev,
      );
      if (activeChartSheetId) {
        setChartSheets?.((prev) => {
          const cur = prev?.[activeChartSheetId];
          if (!cur?.chartMeta) return prev;
          return {
            ...(prev || {}),
            [activeChartSheetId]: {
              ...cur,
              chartMeta: { ...cur.chartMeta, is_public: false, public_slug: undefined },
            },
          };
        });
      }
      setRefetchChart?.(1);
      setShowDeleteEmbedDialog(false);
      toast.success("Public embed deleted");
    } catch {
      toast.error("Failed to delete public page");
    } finally {
      setIsDeletingEmbed(false);
    }
  }, [activeChartMeta?._id, activeChartSheetId, setChartSheets, setLoadedChartMeta, setRefetchChart]);

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
            disabled={!hasShareableChart}
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        <TooltipProvider delayDuration={120}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={hasShareableChart ? undefined : 0}>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 px-2 text-[10px]"
                  disabled={!hasShareableChart}
                  onClick={() =>
                    runOrRequestPro?.(() => publishEmbed(), "publishing embeds")
                  }
                >
                  Publish embed
                </Button>
              </span>
            </TooltipTrigger>
            {!hasShareableChart ? (
              <TooltipContent side="top" className="text-xs">
                Create a chart from the Chart tab first
              </TooltipContent>
            ) : null}
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0}>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 px-2 text-[10px]"
                  disabled={!hasShareableChart || !publicUrl || !isPublishedForCurrentSlug}
                  onClick={() =>
                    runOrRequestPro?.(() => copyText(publicUrl, "Link"), "sharing charts")
                  }
                >
                  Copy link
                </Button>
              </span>
            </TooltipTrigger>
            {!hasShareableChart ? (
              <TooltipContent side="top" className="text-xs">
                Create a chart from the Chart tab first
              </TooltipContent>
            ) : !isPublishedForCurrentSlug ? (
              <TooltipContent side="top" className="text-xs">
                only avail after you publish the chart
              </TooltipContent>
            ) : null}
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0}>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 px-2 text-[10px]"
                  disabled={!hasShareableChart || !iframeSnippet || !isPublishedForCurrentSlug}
                  onClick={() =>
                    runOrRequestPro?.(
                      () => copyText(iframeSnippet, "Iframe"),
                      "sharing charts",
                    )
                  }
                >
                  Copy iframe
                </Button>
              </span>
            </TooltipTrigger>
            {!hasShareableChart ? (
              <TooltipContent side="top" className="text-xs">
                Create a chart from the Chart tab first
              </TooltipContent>
            ) : !isPublishedForCurrentSlug ? (
              <TooltipContent side="top" className="text-xs">
                only avail after you publish the chart
              </TooltipContent>
            ) : null}
          </Tooltip>
        </TooltipProvider>
      </div>
      {hasShareableChart && publicUrl ? (
        <div className="flex items-center gap-2">
          <Link
            href={publicUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 break-all text-[10px] text-primary underline underline-offset-2"
          >
            {publicUrl}
            <ExternalLink className="h-3 w-3 shrink-0" />
          </Link>
          {isPublishedForCurrentSlug ? (
            <TooltipProvider delayDuration={120}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DestructiveIconButton
                    onClick={() =>
                      runOrRequestPro?.(
                        () => setShowDeleteEmbedDialog(true),
                        "managing embeds",
                      )
                    }
                  />
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">delete</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : null}
        </div>
      ) : null}
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
            <Button
              type="button"
              onClick={() =>
                runOrRequestPro?.(() => saveAndPublish(), "publishing embeds")
              }
              disabled={isSavePublishing}
            >
              {isSavePublishing ? "Saving..." : "Save and publish"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={showDeleteEmbedDialog} onOpenChange={setShowDeleteEmbedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete public embed?</AlertDialogTitle>
            <AlertDialogDescription>
              This will unpublish the public chart page and disable its embed URL.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingEmbed}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                deleteEmbed();
              }}
              disabled={isDeletingEmbed}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingEmbed ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ExportDataSection({ runOrRequestPro }) {
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
          onClick={() => runOrRequestPro?.(() => downloadCSV(), "exporting data")}
        >
          CSV
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2 text-[10px]"
          onClick={() => runOrRequestPro?.(() => downloadJSON(), "exporting data")}
        >
          JSON
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2 text-[10px]"
          onClick={() => runOrRequestPro?.(() => downloadXLSX(), "exporting data")}
        >
          XLSX
        </Button>
      </div>
    </div>
  );
}

export default function ExportPanel() {
  const { runOrRequestPro, dialog } = useDemoProGate();

  return (
    <div className="flex min-w-0 flex-col gap-4 p-3">
      <SaveProjectSection runOrRequestPro={runOrRequestPro} />
      <ExportChartSection />
      <ShareEmbedSection runOrRequestPro={runOrRequestPro} />
      <ExportDataSection runOrRequestPro={runOrRequestPro} />
      {dialog}
    </div>
  );
}
