"use client";

import { useState, useCallback, useRef, useEffect, useLayoutEffect, useMemo } from "react";
import { useMyStateV2 } from "@/context/stateContextV2";
import DataView from "@/components/dataView";
import { ChartBuilderProvider, ChartCanvas } from "@/components/chartView";
import ChartControls from "@/components/chartView/ChartControls";
import Polymarket from "@/components/integrationsView/integrationPlayground/integrations/polymarket";
import PolymarketHistorical from "@/components/integrationsView/integrationPlayground/integrations/polymarketHistorical";
import KalshiHistorical from "@/components/integrationsView/integrationPlayground/integrations/kalshiHistorical";
import CoinGecko from "@/components/integrationsView/integrationPlayground/integrations/coinGecko";
import Twitter from "@/components/integrationsView/integrationPlayground/integrations/twitter";
import WallStreetBets from "@/components/integrationsView/integrationPlayground/integrations/wallStreetBets";
import GeckoDex from "@/components/integrationsView/integrationPlayground/integrations/geckoDex";
import Binance from "@/components/integrationsView/integrationPlayground/integrations/binance";
import Chainlink from "@/components/integrationsView/integrationPlayground/integrations/chainlink";
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
import Image from "next/image";
import {
  BarChart3,
  Cable,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LayoutDashboard,
  Share2,
  X,
  Plus,
  Info,
  GripVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import OpenApiPanelTab from "@/components/dataView/OpenApiPanelTab";
import ExportPanel from "@/components/dataView/ExportPanel";
import DashboardComposerPage from "@/components/dashboardComposer/DashboardComposerPage";
import { PageTitleFormatDock } from "@/components/dashboardComposer/PageTitleFormatDock";
import { ChartComposerDock } from "@/components/dashboardComposer/ChartComposerDock";
import {
  getPageTextBlockSidebarClasses,
  getPageTextBlockSidebarStyle,
  PAGE_SUBHEADING_PLACEHOLDER,
} from "@/lib/pageTitleTheme";
import { DashboardExportPanel } from "@/components/dashboardComposer/DashboardExportPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChartColorPalettePopover } from "@/components/chartView/ChartColorPalettePopover";
import { DemoSignUpBadge } from "@/components/demo/DemoSignUpBadge";
import { ATHENA_DEMO_ROW_LIMIT } from "@/config/dataLakeParquetSamples";
import { ReplaceOrNewSheetDialog } from "@/components/dataView/replaceOrNewSheetDialog";
import {
  DestructiveIconButton,
  YellowIconButton,
} from "@/components/primitives/destructive-icon-button";
import { toast } from "sonner";
import { removeDashboardChartSlotFromDraft } from "@/lib/removeDashboardChartSlot";
import { patchChartDashboardColumn } from "@/lib/patchChartDashboardColumn";
import { reorderChartDashboardSlots } from "@/lib/reorderChartDashboardSlots";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
/** In embedded demo, only these integrations are selectable; others are disabled with a Pro badge. */
const DEMO_ACTIVE_INTEGRATION_VALUES = new Set(["polymarket", "coinGecko"]);

const INTEGRATION_OPTIONS = [
  { value: "binance", label: "Binance", logo: "/binance.jpeg" },
  { value: "chainlink", label: "Chainlink", logo: "/chainlink.png" },
  { value: "coinGecko", label: "CoinGecko", logo: "/coinGecko.png" },
  { value: "geckoDex", label: "GeckoTerminal", logo: "/geckoDex1.png" },
  { value: "polymarket", label: "Polymarket", logo: "/polymarket.png" },
  { value: "polymarketHistorical", label: "Polymarket Historical", logo: "/polymarket.png" },
  {
    value: "kalshiHistorical",
    label: "Kalshi Historical",
    logo: "/kalshi.png",
    avatarBgClass: "bg-black",
    avatarImageClass: "object-contain p-0.5",
  },
  { value: "twitter", label: "Twitter", logo: "/x.png" },
  { value: "wallStreetBets", label: "Wall Street Bets", logo: "/wallStreetBets.png" },
].sort((a, b) => a.label.localeCompare(b.label));

const PANEL_CLOSE_MS = 300;

function pageFormatDockTargetKey(t) {
  if (t == null) return "";
  if (t === "pageTitle" || t === "pageSubheading") return t;
  if (typeof t === "object" && t.type && t.rowId && t.colId) {
    return `${t.type}:${t.rowId}:${t.colId}`;
  }
  return String(t);
}

const RIGHT_PANEL_TAB_ITEMS = [
  { value: "integrations", label: "Integrations", Icon: Cable },
  { value: "charts", label: "Charts", Icon: BarChart3 },
  { value: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { value: "export", label: "Export", Icon: Share2 },
];

export default function DataSheetWithIntegration({ user, startNew, setStartNew, chartMode, dashboardMode = false }) {
  const hasDbBackedUserId =
    !!user?.userId && user.userId !== "dev-bypass-no-db" && /^[a-f0-9]{24}$/i.test(user.userId);
  const contextStateV2 = useMyStateV2();
  const isDemo = !!contextStateV2?.isDemo;
  const viewing = contextStateV2?.viewing;
  const setViewing = contextStateV2?.setViewing;
  const integrationSidebar = contextStateV2?.integrationSidebar;
  const setIntegrationSidebar = contextStateV2?.setIntegrationSidebar;
  const connectedData = contextStateV2?.connectedData ?? [];
  const setConnectedDataRaw = contextStateV2?.setConnectedData;
  const dataSheets = contextStateV2?.dataSheets || {};
  const addNewSheetAndActivate = contextStateV2?.addNewSheetAndActivate;
  const setSheetData = contextStateV2?.setSheetData;
  const loadedChartBuilderSnapshot = contextStateV2?.loadedChartBuilderSnapshot;
  const chartSheets = contextStateV2?.chartSheets || {};
  const setChartSheets = contextStateV2?.setChartSheets;
  const activeChartSheetId = contextStateV2?.activeChartSheetId;
  const setActiveChartSheetId = contextStateV2?.setActiveChartSheetId;
  const addNewChartAndActivate = contextStateV2?.addNewChartAndActivate;
  const setLoadedChartBuilderSnapshot = contextStateV2?.setLoadedChartBuilderSnapshot;
  const setLoadedChartMeta = contextStateV2?.setLoadedChartMeta;
  const loadedChartMeta = contextStateV2?.loadedChartMeta;
  const setChartSnapshotFlusher = contextStateV2?.setChartSnapshotFlusher;
  const rightPanelOpen = contextStateV2?.rightPanelOpen;
  const setRightPanelOpen = contextStateV2?.setRightPanelOpen;
  const rightPanelTab = contextStateV2?.rightPanelTab;
  const setRightPanelTab = contextStateV2?.setRightPanelTab;
  const chartDashboardDraft = contextStateV2?.chartDashboardDraft;
  const setChartDashboardDraft = contextStateV2?.setChartDashboardDraft;
  const setActiveChartDashboardId = contextStateV2?.setActiveChartDashboardId;
  const setRefetchChartDashboardsTick = contextStateV2?.setRefetchChartDashboardsTick;
  const setSelectedDashboardCard = contextStateV2?.setSelectedDashboardCard;
  const setPageTitleFormatDockOpen = contextStateV2?.setPageTitleFormatDockOpen;
  const setPageFormatDockTarget = contextStateV2?.setPageFormatDockTarget;
  const pageFormatDockTarget = contextStateV2?.pageFormatDockTarget;
  const setChartComposerDock = contextStateV2?.setChartComposerDock;
  const chartPickerEmphasis = contextStateV2?.chartPickerEmphasis;
  const setChartPickerEmphasis = contextStateV2?.setChartPickerEmphasis;
  const savedCharts = contextStateV2?.savedCharts;
  const savedDataSets = contextStateV2?.savedDataSets ?? [];
  const loadedDataMeta = contextStateV2?.loadedDataMeta;

  const [isPanelClosing, setIsPanelClosing] = useState(false);
  const [replaceOrNewSheetOpen, setReplaceOrNewSheetOpen] = useState(false);
  /** Sync with context on mount so remounts (or SSR) don’t replay the slide-in while the panel is already open. */
  const [isPanelOpen, setIsPanelOpen] = useState(() => !!rightPanelOpen);
  const [drawerExpanded, setDrawerExpanded] = useState(false);
  const closeTimeoutRef = useRef(null);
  const snapshotGetterRef = useRef(null);
  const wasOpenRef = useRef(!!rightPanelOpen);
  const autoExpandedEmptySheetRef = useRef(false);
  const prevDashboardModeRef = useRef(false);
  const mainColumnRef = useRef(null);
  const [mainColumnRect, setMainColumnRect] = useState(null);

  const openPageTitleDock = useCallback(() => {
    setPageTitleFormatDockOpen?.(true);
  }, [setPageTitleFormatDockOpen]);

  const openPageSubheadingDock = useCallback(() => {
    setPageFormatDockTarget?.("pageSubheading");
  }, [setPageFormatDockTarget]);

  const onDashboardChartSlotsDragEnd = useCallback(
    (result) => {
      if (!result.destination) return;
      if (result.source.droppableId !== "dashboard-chart-slots") return;
      if (result.destination.droppableId !== "dashboard-chart-slots") return;
      if (result.source.index === result.destination.index) return;
      setChartDashboardDraft?.((prev) => {
        if (!prev?.layout) return prev;
        const layout = reorderChartDashboardSlots(
          prev.layout,
          result.source.index,
          result.destination.index,
        );
        return { ...prev, layout };
      });
    },
    [setChartDashboardDraft],
  );

  /** Sidebar "Headings" collapsible: expand when user edits title/subheading (canvas dock or sidebar fields). */
  const [headingsPanelOpen, setHeadingsPanelOpen] = useState(false);
  const prevFormatDockTargetRef = useRef(null);
  useEffect(() => {
    const prevKey = pageFormatDockTargetKey(prevFormatDockTargetRef.current);
    prevFormatDockTargetRef.current = pageFormatDockTarget;
    const nextKey = pageFormatDockTargetKey(pageFormatDockTarget);
    const chartTextDock =
      pageFormatDockTarget &&
      typeof pageFormatDockTarget === "object" &&
      (pageFormatDockTarget.type === "chartHeading" ||
        pageFormatDockTarget.type === "chartSubheading" ||
        pageFormatDockTarget.type === "chartMicrotext");
    if (
      (pageFormatDockTarget === "pageTitle" ||
        pageFormatDockTarget === "pageSubheading" ||
        chartTextDock) &&
      nextKey !== prevKey
    ) {
      setHeadingsPanelOpen(true);
    }
  }, [pageFormatDockTarget]);

  useEffect(() => {
    if (!dashboardMode || !chartDashboardDraft) {
      setPageFormatDockTarget?.(null);
      setChartComposerDock?.(null);
      setChartPickerEmphasis?.(null);
    }
  }, [
    dashboardMode,
    chartDashboardDraft,
    setPageFormatDockTarget,
    setChartComposerDock,
    setChartPickerEmphasis,
  ]);

  const dashboardChartPickerOptions = useMemo(() => {
    const list = Array.isArray(savedCharts) ? savedCharts : [];
    return list.map((c) => ({ id: String(c._id), name: c.chart_name || "Chart" }));
  }, [savedCharts]);

  useEffect(() => {
    if (dashboardMode && !prevDashboardModeRef.current) {
      setRightPanelOpen?.(true);
      // Narrow (~300px) panel, not half-viewport expanded.
      setDrawerExpanded(false);
      setRightPanelTab?.("dashboard");
    }
    prevDashboardModeRef.current = dashboardMode;
  }, [dashboardMode, setRightPanelOpen, setRightPanelTab]);

  const dashboardDataSetOptions = useMemo(() => {
    const list = Array.isArray(savedDataSets) ? savedDataSets : [];
    return list.map((d) => ({ id: String(d._id), name: d.data_set_name || "Project" }));
  }, [savedDataSets]);

  useEffect(() => {
    if (!dashboardMode || !chartDashboardDraft) return;
    if (chartDashboardDraft.data_set_id) return;
    const oid = loadedDataMeta?._id;
    if (!oid) return;
    setChartDashboardDraft?.((prev) => {
      if (!prev || prev.data_set_id) return prev;
      return { ...prev, data_set_id: String(oid) };
    });
  }, [
    dashboardMode,
    chartDashboardDraft?._id,
    chartDashboardDraft?.data_set_id,
    loadedDataMeta?._id,
    setChartDashboardDraft,
  ]);

  const anySheetHasData = Object.values(dataSheets).some(
    (sheet) => Array.isArray(sheet?.data) && sheet.data.length > 0,
  );
  const existingColumnNames = useMemo(() => {
    const rows = connectedData;
    if (!Array.isArray(rows) || rows.length === 0) return [];
    const seen = new Set();
    const ordered = [];
    for (const row of rows) {
      if (!row || typeof row !== "object") continue;
      for (const k of Object.keys(row)) {
        if (!seen.has(k)) {
          seen.add(k);
          ordered.push(k);
        }
      }
    }
    return ordered;
  }, [connectedData]);
  const resolveDestinationRef = useRef(null);

  const requestSheetDestination = useCallback(async () => {
    if (!anySheetHasData) return "replace";
    return new Promise((resolve) => {
      resolveDestinationRef.current = resolve;
      setReplaceOrNewSheetOpen(true);
    });
  }, [anySheetHasData]);

  const resolveSheetDestination = useCallback((decision) => {
    if (resolveDestinationRef.current) {
      const resolve = resolveDestinationRef.current;
      resolveDestinationRef.current = null;
      resolve(decision);
    }
    setReplaceOrNewSheetOpen(false);
  }, []);

  // When arriving to charts view, default the panel tab to charts (don't override if user chose Export)
  useEffect(() => {
    if (chartMode && setRightPanelTab && rightPanelTab !== "charts" && rightPanelTab !== "export") {
      setRightPanelTab("charts");
    }
  }, [chartMode, rightPanelTab, setRightPanelTab]);

  useEffect(() => {
    if (!setRightPanelTab) return;
    const valid = new Set(["integrations", "charts", "dashboard", "export"]);
    if (rightPanelTab != null && rightPanelTab !== "" && !valid.has(rightPanelTab)) {
      setRightPanelTab("integrations");
    }
  }, [rightPanelTab, setRightPanelTab]);

  useEffect(() => {
    if (!chartMode && !dashboardMode && setRightPanelTab && rightPanelTab === "dashboard") {
      setRightPanelTab("integrations");
    }
  }, [chartMode, dashboardMode, rightPanelTab, setRightPanelTab]);

  const beginPanelClose = useCallback((onAfterClose) => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    setIsPanelOpen(false); // animate to off-screen
    setIsPanelClosing(true);
    closeTimeoutRef.current = setTimeout(() => {
      onAfterClose?.();
      setIsPanelClosing(false);
      closeTimeoutRef.current = null;
    }, PANEL_CLOSE_MS);
  }, []);

  // Slide-in when panel opens and ensure externally-triggered closes animate out.
  useEffect(() => {
    const isOpen = !!rightPanelOpen;
    if (isOpen && !wasOpenRef.current) {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
      setIsPanelClosing(false);
      setIsPanelOpen(false); // start off-screen so we can animate in
      const id = requestAnimationFrame(() => {
        setIsPanelOpen(true); // trigger slide-open animation; panel ends in "open" state
        wasOpenRef.current = true;
      });
      return () => cancelAnimationFrame(id);
    }
    if (!isOpen && wasOpenRef.current && !isPanelClosing) {
      beginPanelClose();
      wasOpenRef.current = false;
    }
  }, [rightPanelOpen, isPanelClosing, beginPanelClose]);

  useEffect(() => {
    if (!rightPanelOpen) setDrawerExpanded(false);
  }, [rightPanelOpen]);

  // If there is no data loaded into the active sheet, default Integrations panel to full expanded
  // (but only once per "empty sheet" session so we don't fight the user).
  useEffect(() => {
    // Demo should start semi-collapsed, never auto-expand.
    if (isDemo) return;
    if (dashboardMode) return;
    if (!rightPanelOpen) return;
    if (rightPanelTab !== "integrations") return;
    if (drawerExpanded) return;
    const isEmpty = !Array.isArray(connectedData) || connectedData.length === 0;
    if (!isEmpty) return;
    if (autoExpandedEmptySheetRef.current) return;
    autoExpandedEmptySheetRef.current = true;
    setDrawerExpanded(true);
  }, [isDemo, dashboardMode, rightPanelOpen, rightPanelTab, drawerExpanded, connectedData]);

  useEffect(() => {
    const isEmpty = !Array.isArray(connectedData) || connectedData.length === 0;
    if (!isEmpty) autoExpandedEmptySheetRef.current = false;
  }, [connectedData]);

  const closePanel = useCallback(() => {
    if (isPanelClosing) return;
    setDrawerExpanded(false);
    beginPanelClose(() => {
      setRightPanelOpen?.(false);
      wasOpenRef.current = false;
    });
  }, [isPanelClosing, beginPanelClose, setRightPanelOpen]);

  const backToDashboardLoadScreen = useCallback(() => {
    if (!dashboardMode) return;
    setSelectedDashboardCard?.(null);
    setActiveChartDashboardId?.(null);
    setChartDashboardDraft?.(null);
  }, [dashboardMode, setSelectedDashboardCard, setActiveChartDashboardId, setChartDashboardDraft]);

  const deleteDashboardFromComposer = useCallback(async () => {
    if (!chartDashboardDraft || !dashboardMode) return;
    const id = chartDashboardDraft._id;
    let removedFromDb = false;
    if (id && !isDemo && hasDbBackedUserId) {
      try {
        const res = await fetch(`/api/chart-dashboards/${id}`, { method: "DELETE" });
        const j = await res.json();
        if (!j?.success) {
          toast.error(j?.message || "Delete failed");
          return;
        }
        removedFromDb = true;
      } catch {
        toast.error("Delete failed");
        return;
      }
    }
    setSelectedDashboardCard?.(null);
    setActiveChartDashboardId?.(null);
    setChartDashboardDraft?.(null);
    setRefetchChartDashboardsTick?.((t) => (t || 0) + 1);
    if (removedFromDb) toast.success("Dashboard deleted");
    else if (id) toast.success("Dashboard removed");
    else toast.success("Draft discarded");
  }, [
    chartDashboardDraft,
    dashboardMode,
    isDemo,
    hasDbBackedUserId,
    setSelectedDashboardCard,
    setActiveChartDashboardId,
    setChartDashboardDraft,
    setRefetchChartDashboardsTick,
  ]);

  useEffect(() => () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
  }, []);

  const renderIntegrationAvatar = (opt) => {
    if (opt.logo) {
      return (
        <span
          className={cn(
            "relative flex h-7 w-7 shrink-0 overflow-hidden rounded-full ring-1 ring-border/60",
            opt.avatarBgClass ?? "bg-muted/30",
          )}
        >
          <Image
            src={opt.logo}
            alt={opt.label || opt.value}
            fill
            className={cn(opt.avatarImageClass ?? "object-cover")}
            sizes="28px"
          />
        </span>
      );
    }
    const letter = (opt.label || opt.value)[0].toUpperCase();
    return (
      <div className="flex h-7 w-7 shrink-0 self-center place-items-center place-content-center rounded-full bg-muted/30 text-xs font-medium text-muted-foreground">
        {letter}
      </div>
    );
  };

  const renderIntegration = () => {
    switch (integrationSidebar) {
      case "polymarket":
        return (
          <Polymarket
            setConnectedData={setConnectedDataRaw}
            requestSheetDestination={requestSheetDestination}
          />
        );
      case "polymarketHistorical":
        return <PolymarketHistorical setConnectedData={setConnectedDataRaw} />;
      case "kalshiHistorical":
        return <KalshiHistorical setConnectedData={setConnectedDataRaw} />;
      case "coinGecko":
        return (
          <CoinGecko
            setConnectedData={setConnectedDataRaw}
            requestSheetDestination={requestSheetDestination}
          />
        );
      case "twitter":
        return (
          <Twitter
            setConnectedData={setConnectedDataRaw}
            requestSheetDestination={requestSheetDestination}
          />
        );
      case "wallStreetBets":
        return (
          <WallStreetBets
            setConnectedData={setConnectedDataRaw}
            requestSheetDestination={requestSheetDestination}
          />
        );
      case "geckoDex":
        return (
          <GeckoDex
            setConnectedData={setConnectedDataRaw}
            requestSheetDestination={requestSheetDestination}
          />
        );
      case "binance":
        return <Binance setConnectedData={setConnectedDataRaw} />;
      case "chainlink":
        return <Chainlink setConnectedData={setConnectedDataRaw} />;
      default:
        return null;
    }
  };

  const showSidebar = !!rightPanelOpen;
  const isPanelVisible = showSidebar || isPanelClosing;

  useLayoutEffect(() => {
    if (!dashboardMode) {
      setMainColumnRect(null);
      return;
    }
    const el = mainColumnRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setMainColumnRect({ left: r.left, width: r.width });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [dashboardMode, rightPanelOpen, isPanelOpen, drawerExpanded, isPanelClosing]);
  const chartsActive = rightPanelTab === "charts";
  const panelAnimatingOpen = isPanelOpen && !isPanelClosing;
  const chartSheetIds = useMemo(() => Object.keys(chartSheets || {}), [chartSheets]);
  const chartSnapshotSeed = useMemo(() => {
    if (!activeChartSheetId) return loadedChartBuilderSnapshot;
    const entry = chartSheets?.[activeChartSheetId];
    return entry?.snapshot ?? loadedChartBuilderSnapshot;
  }, [activeChartSheetId, chartSheets, loadedChartBuilderSnapshot]);

  const persistActiveChartSnapshot = useCallback(() => {
    if (!activeChartSheetId || typeof snapshotGetterRef.current !== "function") return;
    const snap = snapshotGetterRef.current();
    if (!snap) return;
    setChartSheets?.((prev) => {
      const cur = prev?.[activeChartSheetId] || { name: "Chart", snapshot: null, chartMeta: null };
      return {
        ...(prev || {}),
        [activeChartSheetId]: { ...cur, snapshot: snap },
      };
    });
  }, [activeChartSheetId, setChartSheets]);

  const flushActiveChartSnapshot = useCallback(async () => {
    if (!activeChartSheetId || typeof snapshotGetterRef.current !== "function") return null;
    const snap = snapshotGetterRef.current();
    if (!snap) return null;
    setChartSheets?.((prev) => {
      const cur = prev?.[activeChartSheetId] || { name: "Chart", snapshot: null, chartMeta: null };
      return {
        ...(prev || {}),
        [activeChartSheetId]: { ...cur, snapshot: snap },
      };
    });
    return snap;
  }, [activeChartSheetId, setChartSheets]);

  const activateChartSheet = useCallback((nextId) => {
    if (!nextId || nextId === activeChartSheetId) return;
    persistActiveChartSnapshot();
    const next = chartSheets?.[nextId];
    setActiveChartSheetId?.(nextId);
    setLoadedChartBuilderSnapshot?.(next?.snapshot ?? null);
    setLoadedChartMeta?.(next?.chartMeta ?? null);
  }, [
    activeChartSheetId,
    chartSheets,
    persistActiveChartSnapshot,
    setActiveChartSheetId,
    setLoadedChartBuilderSnapshot,
    setLoadedChartMeta,
  ]);

  useEffect(() => {
    if (!chartMode) return;
    if (!activeChartSheetId || chartSheets?.[activeChartSheetId]) return;
    const firstId = Object.keys(chartSheets || {})[0];
    if (firstId) setActiveChartSheetId?.(firstId);
  }, [chartMode, chartSheets, activeChartSheetId, setActiveChartSheetId]);

  useEffect(() => {
    if (!setChartSnapshotFlusher) return;
    setChartSnapshotFlusher(() => flushActiveChartSnapshot);
    return () => setChartSnapshotFlusher(() => async () => null);
  }, [flushActiveChartSnapshot, setChartSnapshotFlusher]);

  useEffect(() => {
    if (!activeChartSheetId) return;
    if (!loadedChartMeta && !loadedChartBuilderSnapshot) return;
    setChartSheets?.((prev) => {
      const cur = prev?.[activeChartSheetId] || { name: "Chart", snapshot: null, chartMeta: null };
      return {
        ...(prev || {}),
        [activeChartSheetId]: {
          ...cur,
          name: loadedChartMeta?.chart_name || cur.name,
          chartMeta: loadedChartMeta || cur.chartMeta || null,
          snapshot: loadedChartBuilderSnapshot ?? cur.snapshot ?? null,
        },
      };
    });
  }, [activeChartSheetId, loadedChartBuilderSnapshot, loadedChartMeta, setChartSheets]);

  /** Collapsed (default) vs expanded — spacer reserves width; aside is fixed (mobile: inset-x-0 + w-auto). */
  const drawerWidthCollapsed = "w-[18rem] min-w-[18rem] sm:w-[300px] sm:min-w-[300px]";
  const drawerSpacerWidthClass = drawerExpanded
    ? "max-md:w-[100dvw] max-md:min-w-0 max-md:max-w-[100dvw] md:w-1/2 md:min-w-0 md:max-w-[50vw] 2xl:w-1/3 2xl:max-w-[33.333vw]"
    : drawerWidthCollapsed;
  const drawerAsideWidthClass = drawerExpanded
    ? "max-md:w-auto max-md:min-w-0 max-md:max-w-none md:w-1/2 md:min-w-0 md:max-w-[50vw] 2xl:w-1/3 2xl:max-w-[33.333vw]"
    : drawerWidthCollapsed;

  const layout = (
    <div className={cn(
      "flex min-h-0 w-full max-w-full flex-1 flex-col gap-4 overflow-x-hidden px-2 py-2 sm:gap-6 sm:px-4",
      // In demo embeds, treat this component as the "viewport" for the right panel.
      // The parent container should clip overflow; we still set relative here so `absolute` works.
      isDemo && "relative",
    )}>
      <ReplaceOrNewSheetDialog
        open={replaceOrNewSheetOpen}
        existingColumnNames={existingColumnNames}
        onOpenChange={(open) => {
          if (!open) resolveSheetDestination(null);
          else setReplaceOrNewSheetOpen(true);
        }}
        onAddToCurrent={(sameSheet) =>
          resolveSheetDestination({ action: "append", sameSheet })
        }
        onReplace={() => resolveSheetDestination("replace")}
        onAddNewSheet={() => resolveSheetDestination("new_sheet")}
      />
      <div className="flex min-h-0 w-full max-w-full min-w-0 flex-1 flex-row gap-4 transition-[gap] duration-300 ease-out sm:gap-6">
        {/* Main: datasheet or chart — shrinks, scrolls, never overflows */}
        <main
          ref={mainColumnRef}
          className={cn(
            "relative min-w-0 flex-1",
            chartMode ? "flex min-h-0 flex-col overflow-hidden" : "overflow-auto",
            dashboardMode && "scroll-pb-40",
          )}
        >
          {!showSidebar && !isPanelClosing && (
            <OpenApiPanelTab
              contained={isDemo}
              onOpen={() => {
                if (dashboardMode) {
                  setRightPanelTab?.("dashboard");
                  setViewing?.("dashboardComposer");
                } else if (chartMode) {
                  setRightPanelTab?.("charts");
                  setViewing?.("charts");
                } else {
                  setRightPanelTab?.("integrations");
                  setViewing?.("dataStart");
                  setIntegrationSidebar?.((prev) => prev ?? "polymarket");
                }
                setRightPanelOpen?.(true);
              }}
            />
          )}
          {dashboardMode ? (
            <DashboardComposerPage user={user} />
          ) : chartMode ? (
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <div className="mb-2 flex flex-wrap items-center gap-1">
                {chartSheetIds.map((id) => (
                  <code
                    key={id}
                    className={`${id === activeChartSheetId ? "bg-lychee_blue/30" : "bg-yellow-200/30 cursor-pointer hover:bg-lychee_blue/80 hover:text-lychee_white"} relative rounded px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold`}
                    onClick={() => activateChartSheet(id)}
                  >
                    {chartSheets?.[id]?.name || id}
                  </code>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-6 px-2 text-[10px]"
                  onClick={() => {
                    persistActiveChartSnapshot();
                    addNewChartAndActivate?.((newId) => {
                      setLoadedChartBuilderSnapshot?.(null);
                      setLoadedChartMeta?.(null);
                      setChartSheets?.((prev) => {
                        const nextNum = Object.keys(prev || {}).length;
                        const chartName = `Chart ${nextNum}`;
                        const cur = prev?.[newId] || {};
                        return {
                          ...(prev || {}),
                          [newId]: { ...cur, name: chartName, snapshot: null, chartMeta: null },
                        };
                      });
                    });
                  }}
                >
                  <Plus className="mr-1 h-3 w-3" /> New chart
                </Button>
              </div>
              {isDemo ? (
                <div className="flex shrink-0 flex-wrap items-center justify-center gap-2 pb-2 sm:justify-start">
                  <h2 className="text-sm font-semibold leading-snug tracking-tight text-foreground sm:text-base">
                    Charts
                  </h2>
                  <DemoSignUpBadge />
                </div>
              ) : null}
              <ChartCanvas />
            </div>
          ) : (
            <>
              <DataView user={user} startNew={startNew} setStartNew={setStartNew} />
              {isDemo &&
              (integrationSidebar === "polymarketHistorical" || integrationSidebar === "kalshiHistorical") ? (
                <p
                  className="shrink-0 border-t border-red-200/90 bg-red-50 px-3 py-2 text-center text-[11px] font-semibold leading-snug text-red-600 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-400 sm:text-xs"
                  role="status"
                >
                  Demo: you can only pull up to {ATHENA_DEMO_ROW_LIMIT} rows per request. Sign up for the full dataset.
                </p>
              ) : null}
            </>
          )}
        </main>

        {/* Right: API playground — slide in when opened, slide out when X is clicked */}
        {isPanelVisible && (
          <>
            {/* Spacer: keeps main from expanding when panel is fixed */}
            <div
              className={cn(
                "shrink-0 transition-[width,min-width,max-width] duration-300 ease-out",
                isPanelClosing || !isPanelOpen ? "w-0 min-w-0 max-w-0 overflow-hidden" : drawerSpacerWidthClass,
              )}
              aria-hidden
            />
            <aside
              className={cn(
                isDemo
                  ? "absolute inset-y-0 z-20 flex flex-col gap-4 sm:gap-6 transition-[transform,width,min-width,max-width,left,right] duration-300 ease-out"
                  : "fixed top-[4.5rem] z-20 flex h-[calc(100dvh-4.5rem)] flex-col gap-4 sm:gap-6 transition-[transform,width,min-width,max-width,left,right] duration-300 ease-out",
                drawerExpanded
                  ? "max-md:left-0 max-md:right-0 md:right-4"
                  : "right-2 sm:right-4",
                drawerAsideWidthClass,
                isPanelClosing || !isPanelOpen ? "translate-x-full" : "translate-x-0",
              )}
            >
              <div className="h-full min-h-0 w-full flex flex-col">
                <div className="flex h-full flex-col rounded-lg border bg-background/80 backdrop-blur-sm shadow-sm">
                  <Tabs
                    value={rightPanelTab || "integrations"}
                    onValueChange={(v) => {
                      setRightPanelTab?.(v);
                      setRightPanelOpen?.(true);
                      if (v === "dashboard") {
                        setViewing?.("dashboardComposer");
                        return;
                      }
                      if (v === "charts") {
                        setViewing?.("charts");
                        return;
                      }
                      if (v === "integrations") {
                        setViewing?.("dataStart");
                        setIntegrationSidebar?.((prev) => prev ?? "polymarket");
                        return;
                      }
                      // export: keep current main workspace
                    }}
                    className="flex h-full flex-col"
                  >
                    <TooltipProvider delayDuration={200}>
                      <div className="relative flex min-w-0 items-center gap-2 p-2">
                        <TabsList
                          className={cn(
                            "h-9 min-h-9 min-w-0 flex-1 justify-start gap-0.5 overflow-x-auto overflow-y-hidden rounded-md bg-slate-100 p-1 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
                            drawerExpanded && "flex-wrap",
                          )}
                        >
                          {RIGHT_PANEL_TAB_ITEMS.map(({ value, label, Icon }) => {
                            const iconOnly = !drawerExpanded;
                            return (
                              <TabsTrigger
                                key={value}
                                value={value}
                                title={iconOnly ? label : undefined}
                                className={cn(
                                  "shrink-0 gap-1.5 text-xs transition-colors aria-selected:z-[1] aria-selected:bg-white aria-selected:text-slate-950 aria-selected:shadow-sm dark:aria-selected:bg-slate-950 dark:aria-selected:text-slate-50",
                                  iconOnly ? "px-2" : "px-2.5",
                                )}
                                aria-label={label}
                              >
                                {drawerExpanded ? (
                                  <>
                                    <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                    <span className="truncate">{label}</span>
                                  </>
                                ) : (
                                  <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                )}
                              </TabsTrigger>
                            );
                          })}
                        </TabsList>
                        <div className="flex shrink-0 items-center gap-1">
                          {drawerExpanded ? (
                            <>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 shrink-0"
                                    onClick={() => setDrawerExpanded(false)}
                                    aria-label="Narrow panel"
                                  >
                                    <ChevronRight className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="text-xs">
                                  Narrow panel
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 shrink-0"
                                    onClick={closePanel}
                                    aria-label="Close panel"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="text-xs">
                                  Close panel
                                </TooltipContent>
                              </Tooltip>
                            </>
                          ) : (
                            <>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 shrink-0"
                                    onClick={() => setDrawerExpanded(true)}
                                    aria-label="Expand panel"
                                  >
                                    <ChevronLeft className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="text-xs">
                                  Expand
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 shrink-0"
                                    onClick={closePanel}
                                    aria-label="Close panel"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="text-xs">
                                  Close panel
                                </TooltipContent>
                              </Tooltip>
                            </>
                          )}
                        </div>
                      </div>
                    </TooltipProvider>

                    <div
                      className={cn(
                        "min-h-0 min-w-0 flex-1 pb-2",
                        drawerExpanded ? "w-full max-w-none px-3 sm:px-4" : "max-w-full px-2",
                      )}
                    >
                      <TabsContent value="integrations" className="m-0 h-full w-full min-w-0 max-w-full">
                        <div className="flex h-full w-full min-w-0 max-w-full flex-col gap-3">
                          <div className="flex min-w-0 max-w-full items-center gap-2">
                            <div
                              className={cn(
                                "min-w-0",
                                // In full-expanded view, keep the dropdown the same width as the semi-collapsed drawer.
                                // This prevents it from stretching to fill the wider panel.
                                // Slightly shorter in full-expanded mode.
                                drawerExpanded ? "w-[14rem] sm:w-[240px] flex-none" : "flex-1",
                              )}
                            >
                              <Select
                                value={integrationSidebar || ""}
                                onValueChange={(value) => setIntegrationSidebar?.(value)}
                              >
                                <SelectTrigger className="h-9 w-full min-w-0 justify-start text-sm gap-2 text-left [&>span]:text-left [&>svg]:ml-auto focus:ring-0 focus:ring-offset-0">
                                {integrationSidebar &&
                                  renderIntegrationAvatar(
                                    INTEGRATION_OPTIONS.find((o) => o.value === integrationSidebar) || {
                                      label: integrationSidebar,
                                      value: integrationSidebar,
                                      logo: null,
                                    }
                                  )}
                                <SelectValue className="flex-1 min-w-0 text-left" placeholder="Select API" />
                                </SelectTrigger>
                                <SelectContent>
                                  {INTEGRATION_OPTIONS.map((opt) => {
                                    const isProOnly =
                                      isDemo && !DEMO_ACTIVE_INTEGRATION_VALUES.has(opt.value);
                                    return (
                                      <SelectItem
                                        key={opt.value}
                                        value={opt.value}
                                        disabled={isProOnly}
                                        left={renderIntegrationAvatar(opt)}
                                        suffix={
                                          isProOnly ? (
                                            <span className="rounded-md border border-border/70 bg-muted/90 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                              Pro
                                            </span>
                                          ) : null
                                        }
                                      >
                                        {opt.label}
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="min-h-0 min-w-0 max-w-full flex-1 overflow-auto overflow-x-hidden rounded-md border bg-muted/30 p-3">
                            {integrationSidebar ? (
                              renderIntegration()
                            ) : (
                              <div className="text-xs text-muted-foreground">
                                Select an integration to get started.
                              </div>
                            )}
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="charts" className="m-0 h-full min-w-0 w-full max-w-full">
                        <div
                          className={cn(
                            "h-full min-w-0 max-w-full overflow-auto",
                            drawerExpanded ? "w-full p-1 sm:p-2" : "p-1",
                          )}
                        >
                          {dashboardMode ? (
                            <div className="space-y-3 p-2 text-xs text-muted-foreground">
                              <p>
                                Build and save charts in the Chart workspace. They appear in each dashboard
                                card&apos;s chart picker.
                              </p>
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                className="w-full"
                                onClick={() => {
                                  setViewing?.("charts");
                                  setRightPanelOpen?.(false);
                                }}
                              >
                                Open chart workspace
                              </Button>
                            </div>
                          ) : chartsActive ? (
                            <ChartControls />
                          ) : (
                            <div className="text-xs text-muted-foreground">Select Charts tab to edit.</div>
                          )}
                        </div>
                      </TabsContent>

                      <TabsContent value="dashboard" className="m-0 h-full min-w-0 w-full max-w-full">
                        <div className="h-full min-w-0 w-full max-w-full overflow-auto p-2 text-xs text-muted-foreground">
                          {!dashboardMode ? (
                            <p>
                              Open the dashboard composer to edit rows and cards, or choose this tab again after
                              switching workspace.
                            </p>
                          ) : chartDashboardDraft ? (
                            <div className="grid gap-3">
                              <div className="grid gap-1.5">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex min-w-0 items-center gap-1.5">
                                    <Label
                                      htmlFor="dash-associated-project"
                                      className="text-xs font-medium text-foreground"
                                    >
                                      Associated Project
                                    </Label>
                                    <TooltipProvider delayDuration={200}>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <button
                                            type="button"
                                            className="-m-0.5 inline-flex rounded-full p-0.5 text-muted-foreground hover:text-foreground"
                                            aria-label="About associated project"
                                          >
                                            <Info className="h-3.5 w-3.5 shrink-0" />
                                          </button>
                                        </TooltipTrigger>
                                        <TooltipContent
                                          side="bottom"
                                          sideOffset={6}
                                          className="z-[100] max-w-[260px] text-xs leading-snug"
                                        >
                                          All dashboards need to be associated with a parent project. Click the
                                          dropdown to select a parent project.
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </div>
                                  <div className="inline-flex shrink-0 items-center gap-1">
                                    <TooltipProvider delayDuration={200}>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span className="inline-flex shrink-0">
                                            <YellowIconButton
                                              className="h-2.5 w-2.5 min-h-0 min-w-0 shrink-0"
                                              ariaLabel="back to load screen"
                                              title="back to load screen"
                                              onClick={backToDashboardLoadScreen}
                                            />
                                          </span>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom" sideOffset={6} className="z-[100] text-xs">
                                          back to load screen
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                    <TooltipProvider delayDuration={200}>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span className="inline-flex shrink-0">
                                            <DestructiveIconButton
                                              className="h-2.5 w-2.5 shrink-0"
                                              ariaLabel="delete dashboard"
                                              title="delete dashboard"
                                              onClick={deleteDashboardFromComposer}
                                            />
                                          </span>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom" sideOffset={6} className="z-[100] text-xs">
                                          delete dashboard
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </div>
                                </div>
                                <Select
                                  value={
                                    chartDashboardDraft.data_set_id
                                      ? String(chartDashboardDraft.data_set_id)
                                      : ""
                                  }
                                  onValueChange={(v) =>
                                    setChartDashboardDraft?.((prev) => ({
                                      ...(prev || {}),
                                      data_set_id: v,
                                    }))
                                  }
                                >
                                  <SelectTrigger
                                    id="dash-associated-project"
                                    className="h-9 w-full min-w-0 text-sm text-foreground"
                                  >
                                    <SelectValue placeholder="Select project" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {dashboardDataSetOptions.map((d) => (
                                      <SelectItem key={d.id} value={d.id}>
                                        {d.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="grid gap-1.5">
                                <Label htmlFor="dash-name-panel" className="text-xs text-foreground">
                                  Internal name
                                </Label>
                                <Input
                                  id="dash-name-panel"
                                  className="h-9 w-full min-w-0 text-sm text-foreground"
                                  placeholder="name your dashboard"
                                  value={chartDashboardDraft.dashboard_name || ""}
                                  onChange={(e) =>
                                    setChartDashboardDraft?.((prev) => ({
                                      ...(prev || {}),
                                      dashboard_name: e.target.value,
                                    }))
                                  }
                                />
                              </div>
                              <Collapsible
                                open={headingsPanelOpen}
                                onOpenChange={setHeadingsPanelOpen}
                                className="rounded-md border border-border/70 bg-muted/15"
                              >
                                <CollapsibleTrigger asChild>
                                  <button
                                    type="button"
                                    className="flex w-full items-center justify-between gap-2 px-2 py-2 text-left text-xs font-medium text-foreground hover:bg-muted/40 [&[data-state=open]>svg]:rotate-180"
                                  >
                                    <span>Headings</span>
                                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
                                  </button>
                                </CollapsibleTrigger>
                                <CollapsibleContent className="space-y-3 border-t border-border/60 px-2 pb-3 pt-2">
                                  <div className="grid gap-1.5">
                                    <Label htmlFor="dash-page-title-panel" className="text-xs text-foreground">
                                      Page title
                                    </Label>
                                    <Input
                                      id="dash-page-title-panel"
                                      className={cn(
                                        "h-9 w-full min-w-0 text-sm text-foreground",
                                        getPageTextBlockSidebarClasses(chartDashboardDraft?.theme, "pageTitle"),
                                      )}
                                      style={getPageTextBlockSidebarStyle(chartDashboardDraft?.theme, "pageTitle")}
                                      value={chartDashboardDraft.page_heading || ""}
                                      onChange={(e) =>
                                        setChartDashboardDraft?.((prev) => ({
                                          ...(prev || {}),
                                          page_heading: e.target.value,
                                        }))
                                      }
                                      onFocus={() => {
                                        setHeadingsPanelOpen(true);
                                        openPageTitleDock();
                                      }}
                                      placeholder="Your Title"
                                    />
                                  </div>
                                  <div className="grid gap-1.5">
                                    <Label htmlFor="dash-page-subheading-panel" className="text-xs text-foreground">
                                      Page subheading
                                    </Label>
                                    <Textarea
                                      id="dash-page-subheading-panel"
                                      rows={3}
                                      className={cn(
                                        "min-h-[4rem] w-full min-w-0 resize-y text-sm text-foreground",
                                        getPageTextBlockSidebarClasses(chartDashboardDraft?.theme, "pageSubheading"),
                                      )}
                                      style={getPageTextBlockSidebarStyle(chartDashboardDraft?.theme, "pageSubheading")}
                                      value={chartDashboardDraft.page_subheading || ""}
                                      onChange={(e) =>
                                        setChartDashboardDraft?.((prev) => ({
                                          ...(prev || {}),
                                          page_subheading: e.target.value,
                                        }))
                                      }
                                      onFocus={() => {
                                        setHeadingsPanelOpen(true);
                                        openPageSubheadingDock();
                                      }}
                                      placeholder={PAGE_SUBHEADING_PLACEHOLDER}
                                    />
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>

                              <Collapsible
                                defaultOpen={false}
                                className="rounded-md border border-border/70 bg-muted/15"
                              >
                                <CollapsibleTrigger asChild>
                                  <button
                                    type="button"
                                    className="flex w-full items-center justify-between gap-2 px-2 py-2 text-left text-xs font-medium text-foreground hover:bg-muted/40 [&[data-state=open]>svg]:rotate-180"
                                  >
                                    <span>Design</span>
                                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
                                  </button>
                                </CollapsibleTrigger>
                                <CollapsibleContent className="space-y-3 border-t border-border/60 px-2 pb-3 pt-2">
                                  <div className="grid gap-1.5">
                                    <Label htmlFor="dash-bg-style" className="text-xs text-foreground">
                                      Background style
                                    </Label>
                                    <Select
                                      value={chartDashboardDraft.theme?.background || "none"}
                                      onValueChange={(v) =>
                                        setChartDashboardDraft?.((prev) => ({
                                          ...(prev || {}),
                                          theme: { ...(prev?.theme || {}), background: v },
                                        }))
                                      }
                                    >
                                      <SelectTrigger
                                        id="dash-bg-style"
                                        className="h-9 w-full min-w-0 text-sm text-foreground"
                                      >
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="none">None</SelectItem>
                                        <SelectItem value="dotPattern">Dot pattern</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Label className="text-xs text-foreground">Background color</Label>
                                    <ChartColorPalettePopover
                                      value={chartDashboardDraft.theme?.background_color || null}
                                      onChange={(color) =>
                                        setChartDashboardDraft?.((prev) => ({
                                          ...(prev || {}),
                                          theme: { ...(prev?.theme || {}), background_color: color },
                                        }))
                                      }
                                      ariaLabel="Dashboard background color"
                                      triggerClassName="h-7 w-7"
                                      onClear={() =>
                                        setChartDashboardDraft?.((prev) => ({
                                          ...(prev || {}),
                                          theme: { ...(prev?.theme || {}), background_color: "" },
                                        }))
                                      }
                                    />
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>

                              <div className="rounded-md border border-border/70 bg-muted/15 px-2 py-2">
                                <p className="mb-2 text-xs font-medium text-foreground">Charts on page</p>
                                {(() => {
                                  const rows = chartDashboardDraft?.layout?.rows ?? [];
                                  const chartRows = rows.filter((r) => r?.type === "cards");
                                  const chartSlots = chartRows.flatMap((r) =>
                                    (r.columns || []).map((col) => ({
                                      rowId: r.id,
                                      col,
                                    })),
                                  );
                                  if (!chartSlots.length) {
                                    return (
                                      <p className="text-[11px] leading-snug text-muted-foreground">
                                        No charts yet. Click Add Chart on the canvas.
                                      </p>
                                    );
                                  }
                                  return (
                                    <DragDropContext onDragEnd={onDashboardChartSlotsDragEnd}>
                                      <Droppable droppableId="dashboard-chart-slots">
                                        {(dropProvided) => (
                                          <ul
                                            ref={dropProvided.innerRef}
                                            {...dropProvided.droppableProps}
                                            className="flex flex-col gap-1.5"
                                            aria-label="Charts on dashboard in order"
                                          >
                                            {chartSlots.map(({ rowId, col }, i) => {
                                              const emphasizePicker =
                                                chartPickerEmphasis?.rowId === rowId &&
                                                chartPickerEmphasis?.colId === col.id;
                                              const slotKey = col.id ? String(col.id) : `chart-slot-${i}`;
                                              return (
                                                <Draggable
                                                  key={slotKey}
                                                  draggableId={slotKey}
                                                  index={i}
                                                >
                                                  {(dragProvided, snapshot) => (
                                                    <li
                                                      ref={dragProvided.innerRef}
                                                      {...dragProvided.draggableProps}
                                                      className={cn(
                                                        "flex flex-col gap-1.5 rounded border border-border/50 bg-background/80 px-2 py-1.5 text-xs text-foreground",
                                                        snapshot.isDragging &&
                                                          "border-primary shadow-md ring-1 ring-primary/20",
                                                      )}
                                                      style={dragProvided.draggableProps.style}
                                                    >
                                                      <div className="flex items-center justify-between gap-2">
                                                        <div className="flex min-w-0 flex-1 items-center gap-1">
                                                          <button
                                                            type="button"
                                                            className={cn(
                                                              "-ml-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                                                              "text-muted-foreground outline-none hover:bg-muted hover:text-foreground",
                                                              "cursor-grab touch-none active:cursor-grabbing",
                                                              "focus-visible:ring-2 focus-visible:ring-ring",
                                                            )}
                                                            aria-label={`Drag to reorder chart ${i + 1}`}
                                                            {...dragProvided.dragHandleProps}
                                                          >
                                                            <GripVertical className="h-4 w-4" aria-hidden />
                                                          </button>
                                                          <span className="min-w-0 truncate font-medium">
                                                            Chart {i + 1}
                                                          </span>
                                                        </div>
                                                        <TooltipProvider delayDuration={200}>
                                                          <Tooltip>
                                                            <TooltipTrigger asChild>
                                                              <span className="inline-flex shrink-0">
                                                                <DestructiveIconButton
                                                                  className="h-2.5 w-2.5 shrink-0"
                                                                  ariaLabel={`Remove chart ${i + 1}`}
                                                                  title={`Remove chart ${i + 1}`}
                                                                  onClick={() => {
                                                                    setChartDashboardDraft?.((prev) => {
                                                                      if (!prev) return prev;
                                                                      return removeDashboardChartSlotFromDraft(
                                                                        prev,
                                                                        rowId,
                                                                        col.id,
                                                                      );
                                                                    });
                                                                    setSelectedDashboardCard?.((sel) =>
                                                                      sel?.rowId === rowId &&
                                                                      sel?.colId === col.id
                                                                        ? null
                                                                        : sel,
                                                                    );
                                                                    setChartComposerDock?.((dock) =>
                                                                      dock?.rowId === rowId &&
                                                                      dock?.colId === col.id
                                                                        ? null
                                                                        : dock,
                                                                    );
                                                                    setChartPickerEmphasis?.((em) =>
                                                                      em?.rowId === rowId &&
                                                                      em?.colId === col.id
                                                                        ? null
                                                                        : em,
                                                                    );
                                                                  }}
                                                                />
                                                              </span>
                                                            </TooltipTrigger>
                                                            <TooltipContent
                                                              side="bottom"
                                                              sideOffset={6}
                                                              className="z-[100] text-xs"
                                                            >
                                                              Remove chart
                                                            </TooltipContent>
                                                          </Tooltip>
                                                        </TooltipProvider>
                                                      </div>
                                                      <Select
                                                        value={
                                                          col.chart_id
                                                            ? String(col.chart_id)
                                                            : undefined
                                                        }
                                                        onValueChange={(v) => {
                                                          patchChartDashboardColumn(
                                                            setChartDashboardDraft,
                                                            rowId,
                                                            col.id,
                                                            {
                                                              chart_id:
                                                                v === "__none__" ? null : v,
                                                            },
                                                          );
                                                          if (v !== "__none__")
                                                            setChartPickerEmphasis?.(null);
                                                        }}
                                                      >
                                                        <SelectTrigger
                                                          className={cn(
                                                            "h-8 w-full text-xs",
                                                            emphasizePicker &&
                                                              "border-green-500 ring-2 ring-green-500 ring-offset-2 ring-offset-background dark:border-green-400 dark:ring-green-400",
                                                          )}
                                                        >
                                                          <SelectValue placeholder="Select Chart" />
                                                        </SelectTrigger>
                                                        <SelectContent className="z-[200]">
                                                          <SelectItem value="__none__">No chart</SelectItem>
                                                          {dashboardChartPickerOptions.map((c) => (
                                                            <SelectItem key={c.id} value={c.id}>
                                                              {c.name}
                                                            </SelectItem>
                                                          ))}
                                                        </SelectContent>
                                                      </Select>
                                                    </li>
                                                  )}
                                                </Draggable>
                                              );
                                            })}
                                            {dropProvided.placeholder}
                                          </ul>
                                        )}
                                      </Droppable>
                                    </DragDropContext>
                                  );
                                })()}
                              </div>
                            </div>
                          ) : (
                            <p>Load or create a dashboard to edit settings in this tab.</p>
                          )}
                        </div>
                      </TabsContent>

                      <TabsContent value="export" className="m-0 h-full min-w-0 w-full max-w-full">
                        <div className="h-full min-w-0 w-full max-w-full overflow-auto">
                          {dashboardMode ? <DashboardExportPanel /> : <ExportPanel />}
                        </div>
                      </TabsContent>
                    </div>
                  </Tabs>
                </div>
              </div>
            </aside>
          </>
        )}
      </div>
      {dashboardMode ? <PageTitleFormatDock editorInset={mainColumnRect} /> : null}
      {dashboardMode ? <ChartComposerDock editorInset={mainColumnRect} /> : null}
    </div>
  );
  return (
    <ChartBuilderProvider
      key={activeChartSheetId || "chart-1"}
      demo={isDemo}
      initialBuilderSnapshot={chartSnapshotSeed}
      onSnapshotGetterReady={(fn) => {
        snapshotGetterRef.current = fn;
      }}
    >
      {layout}
    </ChartBuilderProvider>
  );
}
