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
import { ChevronDown, ExternalLink } from "lucide-react";
import { DestructiveIconButton } from "@/components/primitives/destructive-icon-button";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { useUser } from "@/lib/hooks";
import { isValidChartEmbedSlug, normalizeChartEmbedSlug } from "@/lib/chartEmbedSlug";
import { useDemoProGate } from "@/hooks/useDemoProGate";
import { KALSHI_GUIDED_TARGETS } from "@/lib/guidedWorkflows/targets";
import { GUIDED_TARGET_ATTR } from "@/lib/guidedWorkflows/types";
import {
  createChartPublishProgressTicker,
  pickWorkspaceDataSheetsForPublish,
  rebuildChartPublishCache,
} from "@/lib/chartPublishCache";
import { isPublishedChartBundleStale } from "@/lib/chartPublishStaleness";
import { chartSheetIsShareable } from "@/lib/inferDefaultBuilderSnapshot";
import {
  embedSlugStatusMessage,
  useEmbedSlugAvailability,
} from "@/hooks/useEmbedSlugAvailability";
import {
  chartReferencedSheetIds,
  readChartBuilderSnapshot,
  resolveChartLiveEligibility,
  stampChartSnapshotForLivePublish,
} from "@/lib/liveFeeds/chartLivePublishConfig";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

function getColKeys(connectedCols) {
  return (connectedCols || [])
    .map((c) => (c && typeof c === "object" && "field" in c ? c.field : c))
    .filter(Boolean);
}

function useHasShareableChart() {
  const chartSheets = useMyStateV2()?.chartSheets || {};
  return useMemo(
    () => Object.values(chartSheets).some(chartSheetIsShareable),
    [chartSheets],
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

function readChartSheetSnapshot(chartSheet) {
  if (!chartSheet || typeof chartSheet !== "object") return null;
  return (
    readChartBuilderSnapshot(chartSheet.snapshot) ||
    readChartBuilderSnapshot(chartSheet.chartMeta) ||
    null
  );
}

/**
 * Human labels for data sheets a chart tab plots (one chart → many sheets is fine).
 * @param {object | null | undefined} chartSheet
 * @param {Record<string, object>} dataSheets
 */
function describeChartDataSources(chartSheet, dataSheets) {
  const snap = readChartSheetSnapshot(chartSheet);
  const ids = chartReferencedSheetIds(dataSheets, snap);
  const sheets = dataSheets && typeof dataSheets === "object" ? dataSheets : {};
  const labels = ids
    .map((id) => {
      const sheet = sheets[id];
      const name = String(sheet?.name || "").trim();
      const ticker = String(sheet?.provenance?.marketTicker || "").trim().toUpperCase();
      if (name && ticker && name.toUpperCase() !== ticker) return `${name} (${ticker})`;
      return name || ticker || id;
    })
    .filter(Boolean);
  return {
    sheetIds: ids,
    labels,
    chartType: String(snap?.selChartType || "").trim() || null,
  };
}

function publicChartUrlForSlug(userHandle, slug, runtimeOrigin) {
  const normalized = normalizeChartEmbedSlug(slug);
  if (!userHandle || !isValidChartEmbedSlug(normalized)) return "";
  const effectiveSite =
    process.env.NODE_ENV === "development" && runtimeOrigin ? runtimeOrigin : SITE;
  return `${effectiveSite.replace(/\/$/, "")}/${encodeURIComponent(userHandle)}/charts/${encodeURIComponent(normalized)}`;
}

function ShareEmbedSection({ runOrRequestPro }) {
  const user = useUser();
  const v2 = useMyStateV2();
  const userHandle = v2?.userHandle;
  const dataSheets = v2?.dataSheets || {};
  const loadedDataMeta = v2?.loadedDataMeta;
  const loadedChartMeta = v2?.loadedChartMeta;
  const setLoadedChartMeta = v2?.setLoadedChartMeta;
  const setLoadedChartBuilderSnapshot = v2?.setLoadedChartBuilderSnapshot;
  const chartSheets = v2?.chartSheets || {};
  const setChartSheets = v2?.setChartSheets;
  const activeChartSheetId = v2?.activeChartSheetId;
  const setActiveChartSheetId = v2?.setActiveChartSheetId;
  const setRefetchChart = v2?.setRefetchChart;
  const chartSnapshotFlusher = v2?.chartSnapshotFlusher;
  const requestSaveProjectDialog = v2?.requestSaveProjectDialog;
  const hasShareableChart = useHasShareableChart();
  const { getBuilderSnapshot, getChartOgImageDataUrl } = useChartBuilder();
  const activeChartMeta = activeChartSheetId ? (chartSheets?.[activeChartSheetId]?.chartMeta || loadedChartMeta) : loadedChartMeta;
  const activeChartSheet = activeChartSheetId ? chartSheets?.[activeChartSheetId] : null;
  const workbookChartName = useMemo(
    () => (activeChartSheet?.chartMeta?.chart_name || activeChartSheet?.name || "").trim(),
    [activeChartSheet],
  );
  const activeDataSources = useMemo(
    () => describeChartDataSources(activeChartSheet, dataSheets),
    [activeChartSheet, dataSheets],
  );

  const publishedCharts = useMemo(() => {
    const entries = [];
    for (const [chartSheetId, sheet] of Object.entries(chartSheets || {})) {
      const meta = sheet?.chartMeta;
      const slug = normalizeChartEmbedSlug(meta?.public_slug || "");
      if (!meta?._id || !meta?.is_public || !slug) continue;
      const sources = describeChartDataSources(sheet, dataSheets);
      const livePublish = meta.live_publish && typeof meta.live_publish === "object" ? meta.live_publish : null;
      entries.push({
        chartSheetId,
        chartId: String(meta._id),
        name: String(meta.chart_name || sheet?.name || slug).trim() || slug,
        slug,
        live: !!meta.live_backed,
        liveEndpoint: livePublish?.endpoint ? String(livePublish.endpoint) : null,
        liveTickers: Array.isArray(livePublish?.params?.marketTickers)
          ? livePublish.params.marketTickers.map((t) => String(t || "").trim()).filter(Boolean)
          : [],
        pollIntervalMs: Math.floor(Number(livePublish?.pollIntervalMs)) || null,
        sources,
        isActive: chartSheetId === activeChartSheetId,
        stale: isPublishedChartBundleStale(meta, loadedDataMeta),
      });
    }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    return entries;
  }, [chartSheets, dataSheets, activeChartSheetId, loadedDataMeta]);

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
  const [publishMode, setPublishMode] = useState("static"); // "static" | "live"
  const [showDeleteEmbedDialog, setShowDeleteEmbedDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { chartId, chartSheetId, name, slug }
  const [publishedChartsOpen, setPublishedChartsOpen] = useState(true);
  const [isPublishingCache, setIsPublishingCache] = useState(false);
  const [publishCacheProgress, setPublishCacheProgress] = useState(0);
  const [publishCacheMessage, setPublishCacheMessage] = useState("");
  const [isDeletingEmbed, setIsDeletingEmbed] = useState(false);
  const [runtimeOrigin, setRuntimeOrigin] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    setRuntimeOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (activeChartMeta?.public_slug) {
      setSlugInput(activeChartMeta.public_slug);
      return;
    }
    setSlugInput(normalizeChartEmbedSlug(workbookChartName || activeChartMeta?.chart_name || "chart") || "chart");
  }, [activeChartMeta?._id, activeChartMeta?.chart_name, activeChartMeta?.public_slug, workbookChartName]);

  useEffect(() => {
    if (activeChartMeta?.live_backed) setPublishMode("live");
    else setPublishMode("static");
  }, [activeChartMeta?._id, activeChartMeta?.live_backed]);

  const liveEligibility = useMemo(() => {
    const snapshot =
      (typeof getBuilderSnapshot === "function" ? getBuilderSnapshot() : null) ||
      activeChartSheet?.snapshot ||
      null;
    return resolveChartLiveEligibility({
      snapshot,
      chart: activeChartMeta,
      dataSheets,
      liveFeedSource: loadedDataMeta?.live_feed_source,
    });
  }, [
    getBuilderSnapshot,
    activeChartSheet?.snapshot,
    activeChartMeta,
    dataSheets,
    loadedDataMeta?.live_feed_source,
    // Recompute when axes/type likely change via sheet registration
    activeChartSheetId,
    hasShareableChart,
  ]);

  useEffect(() => {
    if (!liveEligibility.eligible && publishMode === "live") {
      setPublishMode("static");
    }
  }, [liveEligibility.eligible, publishMode]);

  const {
    status: slugStatus,
    isTaken: slugTaken,
    isChecking: slugChecking,
    canPublish: slugCanPublish,
    checkNow: checkSlugNow,
  } = useEmbedSlugAvailability({
    kind: "chart",
    slugInput,
    excludeId: activeChartMeta?._id || null,
    enabled: !!hasShareableChart && !!user,
  });

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

  const publishBundleStale = useMemo(
    () =>
      isPublishedForCurrentSlug &&
      isPublishedChartBundleStale(activeChartMeta, loadedDataMeta),
    [activeChartMeta, isPublishedForCurrentSlug, loadedDataMeta],
  );

  const publishLiveLake = useMemo(
    () => activeChartMeta?.published_bundle_meta?.materialization_mode === "live_lake",
    [activeChartMeta?.published_bundle_meta?.materialization_mode],
  );

  const runChartPublishCache = useCallback(async (chartId) => {
    if (!chartId || isPublishingCache) return { ok: false };
    setIsPublishingCache(true);
    setPublishCacheProgress(5);
    setPublishCacheMessage("Preparing chart snapshot…");
    const ticker = createChartPublishProgressTicker(
      (pct, message) => {
        setPublishCacheProgress(pct);
        setPublishCacheMessage(message);
      },
      () => publishCacheProgress,
    );
    ticker.start();
    try {
      const workspaceDataSheets = pickWorkspaceDataSheetsForPublish(dataSheets);
      const result = await rebuildChartPublishCache(
        chartId,
        (pct, message) => {
        setPublishCacheProgress(pct);
        setPublishCacheMessage(message);
      },
        workspaceDataSheets,
      );
      if (!result.ok) {
        toast.error(result.message || "Failed to build chart snapshot");
        return result;
      }
      if (result.live_lake) {
        toast.message("Chart published with live data mode (large dataset)");
      }
      if (result.warnings?.length) {
        toast.message(result.warnings[0]);
      }
      const refreshRes = await fetch(`/api/charts/chart/${chartId}`, { credentials: "include" });
      const refreshJson = await refreshRes.json();
      if (refreshJson?.data) {
        setLoadedChartMeta?.(refreshJson.data);
        syncActiveChartSheet(refreshJson.data);
      }
      return result;
    } finally {
      ticker.stop();
      setIsPublishingCache(false);
      setPublishCacheProgress(0);
      setPublishCacheMessage("");
    }
  }, [dataSheets, isPublishingCache, publishCacheProgress, setLoadedChartMeta, syncActiveChartSheet]);

  const publishChartById = useCallback(
    async (chartId, slug, { live = false, livePublish = null } = {}) => {
      if (!chartId) {
        toast.error("Could not find a saved chart to publish.");
        return false;
      }
      const chartRes = await fetch(`/api/charts/chart/${chartId}`, {
        credentials: "include",
      });
      const chartJson = await chartRes.json();
      const full = chartJson?.data;
      if (!full) {
        toast.error("Could not load chart to publish");
        return false;
      }
      const prev0 =
        Array.isArray(full.chart_properties) &&
        full.chart_properties[0] &&
        typeof full.chart_properties[0] === "object"
          ? { ...full.chart_properties[0] }
          : {};
      const snapshotRaw = await capturePublishSnapshot();
      const snapshot =
        stampChartSnapshotForLivePublish(snapshotRaw, dataSheets) || snapshotRaw || {};
      const publishChartName = (workbookChartName || full.chart_name || "").trim() || "Chart";
      const chart_properties = [{ ...prev0, title: publishChartName, rechartsBuilder: snapshot }];
      const ogImageUrl = await uploadOgImage(chartId);

      const resolvedLive =
        live
          ? resolveChartLiveEligibility({
              snapshot,
              dataSheets,
              liveFeedSource: loadedDataMeta?.live_feed_source,
            })
          : { eligible: false, config: null };
      const livePublishConfig = livePublish || resolvedLive.config;
      if (live && !livePublishConfig) {
        toast.error("This chart is not backed by an enabled live feed.");
        return false;
      }

      const putRes = await fetch(`/api/charts/chart/${chartId}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chart_name: publishChartName,
          chart_properties,
          labels: full.labels?.length ? full.labels : ["export"],
          public_slug: slug,
          is_public: true,
          live_backed: !!live,
          // Always send live_publish when live so the server can persist (or reject clearly).
          ...(live ? { live_publish: livePublishConfig } : { live_publish: null }),
          ...(ogImageUrl ? { og_image_url: ogImageUrl } : {}),
        }),
      });
      const putJson = await putRes.json();
      if (!putRes.ok || !putJson?.success) {
        toast.error(putJson?.message || "Publish failed");
        return false;
      }
      if (live && !putJson?.data?.live_backed) {
        toast.error(
          "Live flag did not save. Restart the dev server and republish (stale Chart model).",
        );
        return false;
      }
      setLoadedChartMeta?.(putJson?.data);
      syncActiveChartSheet(putJson?.data, snapshot);
      setRefetchChart?.(1);
      await runChartPublishCache(chartId);
      toast.success(
        live
          ? "Live embed is published"
          : "Static embed is published",
      );
      return true;
    },
    [
      capturePublishSnapshot,
      workbookChartName,
      uploadOgImage,
      setLoadedChartMeta,
      syncActiveChartSheet,
      setRefetchChart,
      runChartPublishCache,
      dataSheets,
      loadedDataMeta?.live_feed_source,
    ],
  );

  const publishEmbed = useCallback(async () => {
    if (!user) {
      toast.error("Sign in to create an embed link");
      return;
    }
    if (!userHandle) {
      toast.error("Set your user handle under Profile before publishing");
      return;
    }
    const slug = normalizeChartEmbedSlug(slugInput);
    if (!isValidChartEmbedSlug(slug)) {
      toast.error("Use a URL slug with lowercase letters, numbers, and hyphens only");
      return;
    }

    const slugCheck = await checkSlugNow();
    if (!slugCheck.available) {
      toast.error(
        slugCheck.reason === "taken"
          ? "That slug is already used by another chart of yours."
          : embedSlugStatusMessage(slugCheck.reason, "chart") || "Slug is not available.",
      );
      return;
    }

    const wantLive = publishMode === "live";
    if (wantLive && !liveEligibility.eligible) {
      toast.error("Enable a live feed on this chart’s data before publishing live.");
      return;
    }

    if (typeof requestSaveProjectDialog !== "function") {
      toast.error("Save project is unavailable right now.");
      return;
    }

    requestSaveProjectDialog({
      intent: "publish-chart",
      onSuccess: async ({ chartSheets: sheets, activeChartSheetId: sheetId } = {}) => {
        const fromActive = sheetId ? sheets?.[sheetId]?.chartMeta : null;
        const fromShareable = Object.values(sheets || {}).find((s) => s?.chartMeta?._id)?.chartMeta;
        const chartId = fromActive?._id || fromShareable?._id || activeChartMeta?._id;
        await publishChartById(chartId, slug, {
          live: wantLive,
          livePublish: liveEligibility.config,
        });
      },
    });
  }, [
    user,
    userHandle,
    slugInput,
    checkSlugNow,
    requestSaveProjectDialog,
    publishChartById,
    activeChartMeta?._id,
    publishMode,
    liveEligibility,
  ]);

  const republishEmbed = useCallback(async () => {
    if (!activeChartMeta?._id || isPublishingCache) return;
    if (!user) {
      toast.error("Sign in to republish");
      return;
    }
    if (!userHandle) {
      toast.error("Set your user handle under Profile before publishing");
      return;
    }
    const slug = normalizeChartEmbedSlug(slugInput);
    if (!isValidChartEmbedSlug(slug)) {
      toast.error("Use a URL slug with lowercase letters, numbers, and hyphens only");
      return;
    }

    const wantLive = publishMode === "live";
    if (wantLive && !liveEligibility.eligible) {
      toast.error("Enable a live feed on this chart’s data before publishing live.");
      return;
    }

    const slugCheck = await checkSlugNow();
    if (!slugCheck.available) {
      toast.error(
        slugCheck.reason === "taken"
          ? "That slug is already used by another chart of yours."
          : embedSlugStatusMessage(slugCheck.reason, "chart") || "Slug is not available.",
      );
      return;
    }

    // Overwrite public flags (static ↔ live) and rebuild seed/snapshot.
    await publishChartById(activeChartMeta._id, slug, {
      live: wantLive,
      livePublish: liveEligibility.config,
    });
  }, [
    activeChartMeta?._id,
    isPublishingCache,
    user,
    userHandle,
    slugInput,
    publishMode,
    liveEligibility,
    checkSlugNow,
    publishChartById,
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
    const chartId = deleteTarget?.chartId || activeChartMeta?._id;
    const chartSheetId = deleteTarget?.chartSheetId || activeChartSheetId;
    if (!chartId) return;
    try {
      setIsDeletingEmbed(true);
      const res = await fetch("/api/assets/delete", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "publicPage",
          id: chartId,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        toast.error(json?.message || "Failed to delete public page");
        return;
      }
      const clearMeta = (meta) =>
        meta
          ? {
              ...meta,
              is_public: false,
              public_slug: undefined,
              live_backed: false,
              live_publish: undefined,
              live_backed_at: undefined,
            }
          : meta;
      if (String(activeChartMeta?._id || "") === String(chartId)) {
        setLoadedChartMeta?.((prev) => clearMeta(prev));
      }
      if (chartSheetId) {
        setChartSheets?.((prev) => {
          const cur = prev?.[chartSheetId];
          if (!cur?.chartMeta) return prev;
          return {
            ...(prev || {}),
            [chartSheetId]: {
              ...cur,
              chartMeta: clearMeta(cur.chartMeta),
            },
          };
        });
      }
      setRefetchChart?.(1);
      setShowDeleteEmbedDialog(false);
      setDeleteTarget(null);
      toast.success("Public embed deleted");
    } catch {
      toast.error("Failed to delete public page");
    } finally {
      setIsDeletingEmbed(false);
    }
  }, [
    deleteTarget,
    activeChartMeta?._id,
    activeChartSheetId,
    setChartSheets,
    setLoadedChartMeta,
    setRefetchChart,
  ]);

  const focusPublishedChart = useCallback(
    (chartSheetId) => {
      if (!chartSheetId || chartSheetId === activeChartSheetId) return;
      setActiveChartSheetId?.(chartSheetId);
      toast.message("Switched to that chart — edit publish settings below");
    },
    [activeChartSheetId, setActiveChartSheetId],
  );

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className="text-xs font-bold text-muted-foreground">Share</p>
        <p className="text-[10px] text-muted-foreground">
          Publish any chart tab independently. Embeds only load their own chart and data sheets — not
          other charts in this project.
        </p>
      </div>

      {hasShareableChart ? (
        <div className="space-y-1.5 rounded-md border border-border/70 bg-muted/20 p-2">
          <p className="text-[10px] font-semibold text-foreground">
            This chart · {workbookChartName || "Untitled chart"}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {activeDataSources.chartType ? `${activeDataSources.chartType} · ` : ""}
            {activeDataSources.labels.length
              ? `Data: ${activeDataSources.labels.join(", ")}`
              : "Data: (no sheet linked yet)"}
          </p>
          {activeChartMeta?.is_public && activeChartMeta?.public_slug ? (
            <p className="text-[10px] text-muted-foreground">
              Published as{" "}
              <span className="font-medium text-foreground">/{activeChartMeta.public_slug}</span>
              {activeChartMeta.live_backed ? " · Live" : " · Static"}
            </p>
          ) : (
            <p className="text-[10px] text-muted-foreground">Not published yet</p>
          )}
        </div>
      ) : null}

      {hasShareableChart ? (
        <div className="space-y-1">
          <p className="text-[10px] font-medium text-muted-foreground">Publish mode</p>
          <div className="flex flex-wrap gap-1">
            <Button
              type="button"
              size="sm"
              variant={publishMode === "static" ? "default" : "outline"}
              className="h-7 px-2 text-[10px]"
              onClick={() => setPublishMode("static")}
            >
              Static
            </Button>
            <TooltipProvider delayDuration={120}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      type="button"
                      size="sm"
                      variant={publishMode === "live" ? "default" : "outline"}
                      className="h-7 px-2 text-[10px]"
                      disabled={!liveEligibility.eligible}
                      onClick={() => setPublishMode("live")}
                    >
                      Live
                    </Button>
                  </span>
                </TooltipTrigger>
                {!liveEligibility.eligible ? (
                  <TooltipContent side="top" className="max-w-[220px] text-xs">
                    Available when this chart references a sheet with an enabled live feed
                    (candlesticks today; multi-series live later).
                  </TooltipContent>
                ) : null}
              </Tooltip>
            </TooltipProvider>
          </div>
          {publishMode === "live" && liveEligibility.config ? (
            <p className="text-[10px] text-muted-foreground">
              On-demand poll every{" "}
              {Math.round((liveEligibility.config.pollIntervalMs || 60_000) / 60_000)}m ·{" "}
              {String(liveEligibility.config.endpoint || "").replace(/_/g, " ")}
              {Array.isArray(liveEligibility.config.params?.marketTickers) &&
              liveEligibility.config.params.marketTickers.length
                ? ` · ${liveEligibility.config.params.marketTickers.join(", ")}`
                : ""}
            </p>
          ) : (
            <p className="text-[10px] text-muted-foreground">
              Frozen snapshot of this chart at publish time.
            </p>
          )}
        </div>
      ) : null}

      {isPublishingCache ? (
        <div className="space-y-1 rounded-md border border-border bg-muted/30 p-2">
          <p className="text-[10px] text-muted-foreground">{publishCacheMessage || "Building chart snapshot…"}</p>
          <Progress value={publishCacheProgress} className="h-1.5" />
        </div>
      ) : null}
      {isPublishedForCurrentSlug && publishBundleStale ? (
        <p className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
          Project data changed since last publish — republish to update the public chart.
        </p>
      ) : null}
      {isPublishedForCurrentSlug && publishLiveLake ? (
        <p className="text-[10px] text-muted-foreground">
          This chart uses live lake data on each view (large dataset).
        </p>
      ) : null}

      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-medium text-muted-foreground" htmlFor="embed-slug">
          URL slug for this chart
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
            aria-invalid={slugTaken || slugStatus === "invalid"}
          />
        </div>
        {hasShareableChart && slugStatus !== "idle" && slugStatus !== "empty" ? (
          <p
            className={`text-[10px] ${
              slugTaken || slugStatus === "invalid" || slugStatus === "error"
                ? "text-destructive"
                : slugStatus === "available"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-muted-foreground"
            }`}
          >
            {embedSlugStatusMessage(slugStatus, "chart")}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-1">
        <TooltipProvider delayDuration={120}>
          {isPublishedForCurrentSlug ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0}>
                  <Button
                    type="button"
                    variant={
                      publishBundleStale ||
                      publishMode !== (activeChartMeta?.live_backed ? "live" : "static")
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    className="h-8 px-2 text-[10px]"
                    disabled={
                      isPublishingCache ||
                      slugChecking ||
                      !slugCanPublish ||
                      (publishMode === "live" && !liveEligibility.eligible)
                    }
                    onClick={() =>
                      runOrRequestPro?.(() => republishEmbed(), "republishing embeds")
                    }
                  >
                    {isPublishingCache ? "Republishing…" : "Republish"}
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {publishMode === "live" && !activeChartMeta?.live_backed
                  ? "Switch this public chart to live"
                  : publishMode === "static" && activeChartMeta?.live_backed
                    ? "Switch this public chart to a static snapshot"
                    : publishBundleStale
                      ? "Update public chart with latest project data"
                      : "Rebuild public chart with the selected publish mode"}
              </TooltipContent>
            </Tooltip>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={hasShareableChart ? undefined : 0}>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 text-[10px]"
                    disabled={
                      !hasShareableChart ||
                      isPublishingCache ||
                      slugChecking ||
                      !slugCanPublish
                    }
                    onClick={() =>
                      runOrRequestPro?.(() => publishEmbed(), "publishing embeds")
                    }
                  >
                    {isPublishingCache ? "Publishing…" : "Publish embed"}
                  </Button>
                </span>
              </TooltipTrigger>
              {!hasShareableChart ? (
                <TooltipContent side="top" className="text-xs">
                  Create a chart from the Chart tab first
                </TooltipContent>
              ) : slugTaken ? (
                <TooltipContent side="top" className="text-xs">
                  That slug is already used by another chart of yours
                </TooltipContent>
              ) : slugChecking ? (
                <TooltipContent side="top" className="text-xs">
                  Checking slug…
                </TooltipContent>
              ) : null}
            </Tooltip>
          )}
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
            {!isPublishedForCurrentSlug ? (
              <TooltipContent side="top" className="text-xs">
                Available after you publish this chart
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
            {!isPublishedForCurrentSlug ? (
              <TooltipContent side="top" className="text-xs">
                Available after you publish this chart
              </TooltipContent>
            ) : null}
          </Tooltip>
          {isPublishedForCurrentSlug ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <DestructiveIconButton
                    onClick={() => {
                      setDeleteTarget({
                        chartId: activeChartMeta._id,
                        chartSheetId: activeChartSheetId,
                        name: workbookChartName || activeChartMeta.chart_name,
                        slug: publishedSlug,
                      });
                      runOrRequestPro?.(
                        () => setShowDeleteEmbedDialog(true),
                        "managing embeds",
                      );
                    }}
                  />
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Delete this public embed
              </TooltipContent>
            </Tooltip>
          ) : null}
        </TooltipProvider>
      </div>

      {hasShareableChart && publicUrl && isPublishedForCurrentSlug ? (
        <Link
          href={publicUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 break-all text-[10px] text-primary underline underline-offset-2"
        >
          {publicUrl}
          <ExternalLink className="h-3 w-3 shrink-0" />
        </Link>
      ) : null}

      <Collapsible open={publishedChartsOpen} onOpenChange={setPublishedChartsOpen} className="rounded-md border border-border/70">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left text-[10px] font-semibold text-foreground hover:bg-muted/40"
          >
            <span>
              Published charts
              <span className="ml-1 font-normal text-muted-foreground">
                ({publishedCharts.length})
              </span>
            </span>
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
                publishedChartsOpen ? "rotate-180" : "",
              )}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="border-t border-border/60 px-2 pb-2 pt-1.5">
          {publishedCharts.length === 0 ? (
            <p className="text-[10px] text-muted-foreground">
              No public chart embeds in this project yet. Publish the active chart above — you can
              publish many charts from the same or different data sheets.
            </p>
          ) : (
            <ul className="space-y-2">
              {publishedCharts.map((item) => {
                const url = publicChartUrlForSlug(userHandle, item.slug, runtimeOrigin);
                return (
                  <li
                    key={item.chartId}
                    className={cn(
                      "space-y-1 rounded-md border px-2 py-1.5",
                      item.isActive ? "border-foreground/30 bg-muted/40" : "border-border/60 bg-background/60",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 space-y-0.5">
                        <p className="truncate text-[10px] font-medium text-foreground">
                          {item.name}
                          {item.isActive ? (
                            <span className="ml-1 font-normal text-muted-foreground">(editing)</span>
                          ) : null}
                        </p>
                        <p className="truncate text-[10px] text-muted-foreground">/{item.slug}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {item.sources.chartType ? `${item.sources.chartType} · ` : ""}
                          {item.sources.labels.length
                            ? item.sources.labels.join(", ")
                            : "sheet unknown"}
                        </p>
                        <p className="text-[10px]">
                          <span
                            className={cn(
                              "rounded px-1 py-0.5 font-medium",
                              item.live
                                ? "bg-emerald-600/15 text-emerald-700 dark:text-emerald-400"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {item.live ? "Live" : "Static"}
                          </span>
                          {item.live && item.liveTickers.length ? (
                            <span className="ml-1 text-muted-foreground">
                              {item.liveTickers.join(", ")}
                            </span>
                          ) : null}
                          {item.stale ? (
                            <span className="ml-1 text-amber-600 dark:text-amber-400">· stale</span>
                          ) : null}
                        </p>
                      </div>
                      <TooltipProvider delayDuration={120}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <DestructiveIconButton
                                onClick={() => {
                                  setDeleteTarget({
                                    chartId: item.chartId,
                                    chartSheetId: item.chartSheetId,
                                    name: item.name,
                                    slug: item.slug,
                                  });
                                  runOrRequestPro?.(
                                    () => setShowDeleteEmbedDialog(true),
                                    "managing embeds",
                                  );
                                }}
                              />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            Unpublish /{item.slug}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {!item.isActive ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-[10px]"
                          onClick={() => focusPublishedChart(item.chartSheetId)}
                        >
                          Edit
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-[10px]"
                          disabled={isPublishingCache}
                          onClick={() =>
                            runOrRequestPro?.(() => republishEmbed(), "republishing embeds")
                          }
                        >
                          Republish
                        </Button>
                      )}
                      {url ? (
                        <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-[10px]" asChild>
                          <Link href={url} target="_blank" rel="noreferrer">
                            Open
                          </Link>
                        </Button>
                      ) : null}
                      {url ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-[10px]"
                          onClick={() =>
                            runOrRequestPro?.(() => copyText(url, "Link"), "sharing charts")
                          }
                        >
                          Copy
                        </Button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CollapsibleContent>
      </Collapsible>

      <AlertDialog
        open={showDeleteEmbedDialog}
        onOpenChange={(open) => {
          setShowDeleteEmbedDialog(open);
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete public embed?</AlertDialogTitle>
            <AlertDialogDescription>
              This will unpublish{" "}
              {deleteTarget?.slug ? (
                <>
                  <span className="font-medium">/{deleteTarget.slug}</span>
                  {deleteTarget.name ? ` (${deleteTarget.name})` : ""}
                </>
              ) : (
                "this public chart page"
              )}{" "}
              and disable its embed URL. Other published charts in the project are unchanged.
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
  const guidedWorkflowPull = !!contextStateV2?.guidedWorkflowPull;
  const exportPanelOpen =
    contextStateV2?.rightPanelTab === "export" && !!contextStateV2?.rightPanelOpen;
  const guidedCsvTargetReady =
    guidedWorkflowPull && exportPanelOpen && Array.isArray(connectedData) && connectedData.length > 0;

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
          onClick={() => {
            if (guidedWorkflowPull) {
              downloadCSV();
              return;
            }
            runOrRequestPro?.(() => downloadCSV(), "exporting data");
          }}
          {...(guidedCsvTargetReady
            ? { [GUIDED_TARGET_ATTR]: KALSHI_GUIDED_TARGETS.exportCsv }
            : {})}
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
      <ExportChartSection />
      <ShareEmbedSection runOrRequestPro={runOrRequestPro} />
      <ExportDataSection runOrRequestPro={runOrRequestPro} />
      {dialog}
    </div>
  );
}
