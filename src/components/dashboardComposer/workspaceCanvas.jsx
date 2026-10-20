"use client";

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BarChart3, Copy, Database, Download, Lock, Maximize2, MoreVertical, Pencil, Play, Square, Table2, X } from "lucide-react";
import { exitLandingDemoToSection } from "@/lib/landingDemoSession";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportNodeImage, exportSheet, IMAGE_EXPORT_FORMATS, SHEET_EXPORT_FORMATS } from "@/components/dashboardComposer/blockExport";
import {
  EXPORT_TIP_ID,
  ExportFeatureTip,
  FIRST_PULL_TIP_ID,
  HAND_TIP_ID,
  MOVE_TIP_ID,
  MoveFeatureTip,
  RESIZE_TIP_ID,
  ResizeFeatureTip,
} from "@/components/dashboardComposer/buildFeatureTips";
import { useFeatureTipDismissal } from "@/components/ui/feature-tip";
import { LandingDemoMembersOnlyPortal } from "@/components/dashboardComposer/landingDemoMembersOnly";
import { DestructiveConfirmMenuItem } from "@/components/ui/destructive-confirm-menu-item";
import { useMyStateV2 } from "@/context/stateContextV2";
import { duplicateTabName, loadWorkspaceStartTabs, saveWorkspaceStartTabs } from "@/lib/workspaceStartTabs";
import { DashboardSheetGrid } from "@/components/dashboardComposer/dashboardSheetGrid";
import { ActivityRichTableView } from "@/components/dashboardComposer/activityRichTableView";
import { CatalogRichTableView } from "@/components/dashboardComposer/catalogRichTableView";
import { VisualTableView } from "@/components/dashboardComposer/visualTableView";
import { Switch } from "@/components/ui/switch";
import { defaultOrderBookCharts, isOrderBookSheet } from "@/components/dashboardComposer/orderBookLadder";
import { columnKey, describeSheet } from "@/lib/visualizations/datasetDescriptor";
import { chartSpecsForSheet } from "@/lib/visualizations/sheetCharts";
import { hasVisualTable, resolveVisualization, visualPresentationLabel } from "@/lib/visualizations/presetRegistry";
import { isPriceHistorySheet } from "@/components/dashboardComposer/priceHistorySeries";
import { SheetBlockChart } from "@/components/dashboardComposer/sheetBlockChart";
import { layoutRunCharts, layoutRunSheets } from "@/components/dashboardComposer/integrationRunSheets";
import {
  canvasGridMetrics,
  packClippedBlocks,
  packReadingOrder,
  separateOverlaps,
  setCanvasGridWidth,
  setLayoutGuide,
  snapMove,
  snapResizeEdges,
  subscribeLayoutGuide,
  widthForSpan,
  spanOf,
} from "@/components/dashboardComposer/clipLayout";
import { useUser } from "@/lib/hooks";
import { getHistoricalPullRowLimit } from "@/lib/athenaEntitlement";
import {
  ensureFullTradeSheet,
  repullsTradeSheet,
  tradeTickerFromBlock,
  usesHistoricalTradeSheet,
  useTradeSheetLabel,
} from "@/components/dashboardComposer/fullTradeSheet";
import {
  createWorkspaceDashboard,
  loadCurrentWorkspaceDashboard,
  loadWorkspaceDashboardPreview,
  patchWorkspaceDashboard,
} from "@/lib/workspaceDashboardClient";
import {
  buildSavePatch,
  createSaveBaseline,
  rememberLoadedTabs,
  rememberMeta,
  rememberServerTabs,
  rememberTables,
} from "@/components/dashboardComposer/dashboardSaveDiff";
import { pageIdForTab, tabIdFromPage } from "@/lib/workspaceDashboardDocument";
import {
  rememberSheetRecords,
  restoreSheetRecords,
  savedBlocksByPage,
  savedTables,
} from "@/components/dashboardComposer/sheetRecordCache";
import { useSheetRealtime } from "@/components/dashboardComposer/sheetRealtimeSession";
import { realtimeSessionKey, realtimeSheetForBlock, realtimeTargetForBlock, sheetAssetIds, tailCells } from "@/lib/realtime/sheetRealtime";
import { isPriceStreamSheet } from "@/lib/priceStreams";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { replayTabSheets } from "@/components/dashboardComposer/replayTabQueries";
import { createRunReporter } from "@/components/dashboardComposer/integrationRunFeed";
import { closedLifeMessage, lifeCountdown, sheetLife, sheetMarketCaption, sheetMarketClosed } from "@/lib/markets/marketLife";
import { enqueueMarketLookup, lookupSheetMarket, marketMetaComplete, marketMetaPatch } from "@/components/dashboardComposer/sheetMarketLookup";
import { SpectrumLoadingState } from "@/components/ui/spectrum-loading-state";
import { RunProgressCard } from "@/components/dashboardComposer/integrationRunProgress";
import { cn } from "@/lib/utils";

const SHEET_ARRIVE_CSS = `
@keyframes lychee-sheet-arrive {
  from { opacity: 0; transform: translateY(18px); }
  to { opacity: 1; transform: none; }
}
@keyframes lychee-sheet-branch {
  from { opacity: 0; transform: translate(-28px, 12px); }
  to { opacity: 1; transform: none; }
}
@keyframes lychee-sheet-fill {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: none; }
}
@keyframes lychee-sheet-pulse {
  0% { box-shadow: inset 0 0 0 2px rgba(13, 153, 255, 0.72); }
  100% { box-shadow: inset 0 0 0 2px rgba(13, 153, 255, 0); }
}
.lychee-sheet-arrive { animation: lychee-sheet-arrive 560ms cubic-bezier(0.22, 1, 0.36, 1) both; }
.lychee-sheet-branch { animation: lychee-sheet-branch 620ms cubic-bezier(0.22, 1, 0.36, 1) both; }
.lychee-sheet-fill { animation: lychee-sheet-fill 480ms cubic-bezier(0.22, 1, 0.36, 1) both; }
.lychee-sheet-pulse { animation: lychee-sheet-pulse 720ms ease-out 1; }
@keyframes lychee-play-nudge {
  0%, 55%, 100% { transform: translateY(0); }
  20% { transform: translateY(-3px); }
  35% { transform: translateY(0); }
  45% { transform: translateY(-1.5px); }
}
.lychee-play-nudge { animation: lychee-play-nudge 1.4s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .lychee-sheet-arrive, .lychee-sheet-branch, .lychee-sheet-fill, .lychee-sheet-pulse, .lychee-play-nudge { animation: none; }
}
`;

const WorkspaceCanvasContext = createContext(null);

export function useWorkspaceCanvas() {
  return useContext(WorkspaceCanvasContext);
}

const VISUAL_TABLE_WIDTH = 660;
const RICH_TABLE_WIDTH = 780;

const BLOCK_SIZE = {
  sheet: { w: 560, h: 360 },
  source: { w: 280, h: 112 },
  chart: { w: 440, h: 260 },
  text: { w: 320, h: 88 },
};

const BLOCK_COPY = {
  sheet: { title: "Data sheet", body: "" },
  source: { title: "Data source", body: "Connect a source" },
  chart: { title: "Chart", body: "" },
  text: { title: "", body: "Text" },
};

function newId() {
  return `block-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Drop new charts under the lowest block, two across when they fit. */
function placeChartsBelow(list, charts) {
  const gap = 16;
  const x0 = 28;
  const right = x0 + widthForSpan(24);
  let y = (list || []).reduce((max, block) => Math.max(max, (block.y || 0) + (block.h || 0)), 72) + gap;
  let x = x0;
  let rowHeight = 0;
  return (charts || []).map((chart) => {
    const w = Math.min(chart.w || 540, right - x0);
    const h = chart.h || 360;
    if (x > x0 && x + w > right + 1) {
      y += rowHeight + gap;
      x = x0;
      rowHeight = 0;
    }
    const placed = { ...chart, x: Math.round(x), y: Math.round(y), w, h };
    x += w + gap;
    rowHeight = Math.max(rowHeight, h);
    return placed;
  });
}

/**
 * An order book that already has a chart gets the missing ladder or depth
 * chart on the next row, and the rows underneath move down to make room.
 */
function withOrderBookChartPairs(list) {
  const sheets = new Map();
  for (const block of list || []) {
    if (block?.type === "sheet") sheets.set(block.id, block);
  }
  /** @type {Map<string, object[]>} */
  const chartsBySource = new Map();
  for (const block of list || []) {
    if (block?.type !== "chart" || !block.sourceSheetId) continue;
    const group = chartsBySource.get(block.sourceSheetId) || [];
    group.push(block);
    chartsBySource.set(block.sourceSheetId, group);
  }
  let shifted = list || [];
  const additions = [];
  const patches = new Map();
  for (const [sourceId, charts] of chartsBySource) {
    const sheet = sheets.get(sourceId);
    if (!sheet || !isOrderBookSheet(sheet)) continue;
    const base = String(sheet.title || "Order book").replace(/\s+chart$/, "").trim() || "Order book";
    const ladder = charts.find((chart) => chart.chartView === "order-book" || !chart.chartView) || null;
    const depth = charts.find((chart) => chart.chartView === "depth") || null;
    if (ladder && !ladder.chartView) patches.set(ladder.id, { chartView: "order-book" });
    const host = ladder || depth || charts[0];
    const gap = 8;
    const sizes = new Map(defaultOrderBookCharts(base).map((spec) => [spec.chartView, spec.h]));
    let top = (host.y || 0) + (host.h || 360) + gap;
    const openRow = (chartView, title) => {
      const height = sizes.get(chartView) || 360;
      shifted = shifted.map((block) =>
        (block.y || 0) >= top - 1 ? { ...block, y: Math.round((block.y || 0) + height + gap) } : block,
      );
      additions.push({
        id: newId(),
        type: "chart",
        source: "sheet-chart",
        sourceSheetId: sourceId,
        chartView,
        x: host.x || 28,
        y: top,
        w: host.w || 540,
        h: height,
        title,
        body: "",
      });
      top += height + gap;
    };
    if (!ladder) openRow("order-book", `${base} · ladder`);
    if (!depth) openRow("depth", `${base} · depth`);
  }
  if (!additions.length && !patches.size) return list;
  const merged = shifted.map((block) => (patches.has(block.id) ? { ...block, ...patches.get(block.id) } : block));
  return separateOverlaps([...merged, ...additions]);
}

function assignUniqueIds(blocks, reserved = []) {
  const seen = new Set((reserved || []).map((block) => block?.id).filter(Boolean));
  return (blocks || []).map((block) => {
    const id = block?.id || "";
    if (!id || !seen.has(id)) {
      if (id) seen.add(id);
      return block;
    }
    let unique = `${id}-${newId()}`;
    while (seen.has(unique)) unique = `${id}-${newId()}`;
    seen.add(unique);
    return { ...block, id: unique };
  });
}

function canvasStorageKey(userId, pageId) {
  return `lycheeWorkspaceCanvas:v1:${userId || "local"}:${pageId || "workspace"}`;
}

function readCanvasBlocks(key) {
  if (typeof localStorage === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function collectLocalBlocks(userId) {
  if (typeof localStorage === "undefined") return {};
  const prefix = `lycheeWorkspaceCanvas:v1:${userId}:`;
  const blocks = {};
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key?.startsWith(prefix)) continue;
    const list = readCanvasBlocks(key);
    if (list.length) blocks[tabIdFromPage(key.slice(prefix.length))] = list;
  }
  return blocks;
}

function blocksByPageFromDoc(doc) {
  const map = {};
  const blocks = doc?.blocks && typeof doc.blocks === "object" ? doc.blocks : {};
  for (const [tabId, list] of Object.entries(blocks)) {
    if (Array.isArray(list)) map[pageIdForTab(tabId)] = list;
  }
  return map;
}

function metaFromLive(live) {
  return {
    name: String(live.dashboardName || "").trim().slice(0, 120) || "Untitled",
    active_tab_id: live.activeTabId,
    welcome_removed: live.welcomeRemoved,
    tabs: live.tabs.length ? live.tabs : [{ id: "welcome", name: "Welcome", blank: false }],
  };
}

/** The whole dashboard, for a first create and the local backup. Tabs still loading keep their last local copy. */
function draftFromLive(live) {
  const saved = savedBlocksByPage(live.blocksByPage);
  const blocks = blocksForDocument(saved.blocksByPage);
  if (live.pendingTabs?.length) {
    const previous = readLocalDashboard(live.owner);
    for (const tabId of live.pendingTabs) {
      if (previous?.blocks?.[tabId]) blocks[tabId] = previous.blocks[tabId];
    }
  }
  return { ...metaFromLive(live), blocks, tables: savedTables(live.tables, live.blocksByPage), charts: [] };
}

/** Server blocks for freshly loaded tabs. Blocks added to a tab while it was loading stay on it. */
function mergeLoadedTabs(prev, loaded) {
  const next = { ...prev };
  for (const [page, list] of Object.entries(loaded || {})) {
    const ids = new Set(list.map((block) => block?.id));
    const added = (prev?.[page] || []).filter((block) => !ids.has(block?.id));
    next[page] = added.length ? [...list, ...added] : list;
  }
  return next;
}

/** Runs work when the browser is idle, so background tab loads never compete with the tab on screen. */
function whenIdle(work, timeout = 1500) {
  if (typeof window === "undefined") return undefined;
  if (typeof window.requestIdleCallback === "function") {
    const handle = window.requestIdleCallback(work, { timeout });
    return () => window.cancelIdleCallback(handle);
  }
  const timer = window.setTimeout(work, 200);
  return () => window.clearTimeout(timer);
}

function blocksForDocument(blocksByPage) {
  const blocks = {};
  for (const [page, list] of Object.entries(blocksByPage || {})) {
    if (!Array.isArray(list) || !list.length) continue;
    blocks[tabIdFromPage(page)] = list;
  }
  return blocks;
}

function dashboardDocKey(userId) {
  return `lycheeWorkspaceDashboardDoc:v1:${userId || "local"}`;
}

function readLocalDashboard(userId) {
  if (typeof localStorage === "undefined") return null;
  try {
    const parsed = JSON.parse(localStorage.getItem(dashboardDocKey(userId)) || "null");
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function writeLocalDashboard(userId, draft) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(dashboardDocKey(userId), JSON.stringify(draft));
  } catch {
    // Private mode can block storage.
  }
}

export function WorkspaceCanvasProvider({ pageId, readOnly = false, children }) {
  const user = useUser();
  const ctx = useMyStateV2();
  const signedInRef = useRef("");
  if (user?.userId) signedInRef.current = String(user.userId);
  // A failed /api/user refresh reads as signed out. Switching to local storage then would blank every tab.
  // The landing demo never reads or writes a signed-in visitor's saved dashboard.
  const owner = ctx?.landingDemo
    ? "local"
    : user === undefined ? "" : user?.userId || signedInRef.current || "local";
  const storageKey = owner ? canvasStorageKey(owner, pageId) : "";
  const [tool, setTool] = useState("select");
  const [handDown, setHandDown] = useState(false);
  const [blocksByPage, setBlocksByPage] = useState({});
  const [tables, setTables] = useState([]);
  const [ready, setReady] = useState(false);
  const [pendingTabs, setPendingTabs] = useState([]);
  const [prefetchOn, setPrefetchOn] = useState(false);
  const [tabRetryNonce, setTabRetryNonce] = useState(0);
  const loadEpochRef = useRef(0);
  const tabFetchRef = useRef(new Map());
  const tabFailuresRef = useRef(new Map());
  const [dashboardName, setDashboardName] = useState("Untitled");
  const [previewTabs, setPreviewTabs] = useState([]);
  const [previewActiveId, setPreviewActiveId] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [sheetRowFocus, setSheetRowFocus] = useState(null);
  const [renameId, setRenameId] = useState(null);
  const [runFeed, setRunFeed] = useState(null);
  const [replayReady, setReplayReady] = useState(false);
  const replayRunRef = useRef(null);
  const blocks = blocksByPage[pageId] || [];
  const docIdRef = useRef("");
  const saveBaseRef = useRef(createSaveBaseline());
  const removedTabsRef = useRef(new Set());
  const savingRef = useRef(null);
  const resaveRef = useRef(false);
  const [saveNonce, setSaveNonce] = useState(0);
  const pendingSelectRef = useRef("");
  const pendingRevealRef = useRef("");
  const placedSheetIdRef = useRef("");
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;
  const blocksByPageRef = useRef(blocksByPage);
  blocksByPageRef.current = blocksByPage;
  const commitLiveCells = useCallback((targetPageId, sheetId, cells, records) => {
    if (!targetPageId || !sheetId || !cells) return;
    const kept = Array.isArray(records) ? records : null;
    const rowCount = kept ? Math.max(kept.length, filledRowCount(cells)) : filledRowCount(cells);
    setBlocksByPage((prev) => {
      const list = prev[targetPageId] || [];
      const current = list.find((block) => block.id === sheetId);
      if (!current || current.type !== "sheet") return prev;
      return {
        ...prev,
        [targetPageId]: list.map((block) => (block.id === sheetId ? { ...block, cells, rowCount, ...(kept ? { records: kept } : {}) } : block)),
      };
    });
  }, []);
  const { realtimeById, startSheetRealtime, stopSheetRealtime, stopPageRealtime } = useSheetRealtime(blocksByPage, pageId, commitLiveCells);
  const [realtimeModeByPage, setRealtimeModeByPage] = useState({});
  const realtimeModeRef = useRef(realtimeModeByPage);
  realtimeModeRef.current = realtimeModeByPage;
  const [leavePrompt, setLeavePrompt] = useState(null);
  const leavePromptRef = useRef(null);
  leavePromptRef.current = leavePrompt;
  const [spotlightId, setSpotlightId] = useState(null);
  const [revealNonce, setRevealNonce] = useState(0);

  const tabs = Array.isArray(ctx?.workspaceStartTabs) ? ctx.workspaceStartTabs : [];
  const activeTabId = ctx?.activeWorkspaceStartTabId || "welcome";
  const welcomeRemoved = !!ctx?.welcomeTabRemoved;

  useEffect(() => {
    if (!owner) return undefined;
    if (owner === "local") {
      const loaded = readCanvasBlocks(storageKey);
      setBlocksByPage((prev) => ((prev[pageId] || []).length ? prev : { ...prev, [pageId]: loaded }));
      setReady(true);
      return undefined;
    }

    let cancel = false;
    setReady(false);
    (async () => {
      const landingTab = loadWorkspaceStartTabs(owner).activeId || "welcome";
      const loaded = readOnly ? await loadWorkspaceDashboardPreview() : await loadCurrentWorkspaceDashboard(landingTab);
      if (cancel) return;
      let doc = loaded.ok ? loaded.data : null;
      if (readOnly) {
        if (!doc) {
          setReady(true);
          return;
        }
        const nextBlocks = blocksByPageFromDoc(doc);
        docIdRef.current = String(doc._id || "");
        setDashboardName(String(doc.name || "").trim() || "Untitled");
        setPreviewTabs(Array.isArray(doc.tabs) ? doc.tabs : []);
        setPreviewActiveId(doc.active_tab_id || doc.tabs?.[0]?.id || "");
        setTables(Array.isArray(doc.tables) ? doc.tables : []);
        setBlocksByPage(nextBlocks);
        setReady(true);
        return;
      }
      if (loaded.ok && !doc) {
        const seeded = {
          name: "Untitled",
          active_tab_id: activeTabId,
          welcome_removed: welcomeRemoved,
          tabs: tabs.length ? tabs : [{ id: "welcome", name: "Welcome", blank: false }],
          blocks: collectLocalBlocks(owner),
          tables: [],
          charts: [],
        };
        const created = await createWorkspaceDashboard(seeded);
        if (cancel) return;
        doc = created.ok ? created.data : null;
      }
      if (!doc) {
        const localDoc = readLocalDashboard(owner);
        const blocks = localDoc?.blocks && Object.keys(localDoc.blocks).length ? localDoc.blocks : collectLocalBlocks(owner);
        doc = {
          name: localDoc?.name || "Untitled",
          active_tab_id: localDoc?.active_tab_id || activeTabId,
          welcome_removed: localDoc?.welcome_removed || welcomeRemoved,
          tabs: localDoc?.tabs?.length ? localDoc.tabs : tabs,
          blocks,
          tables: Array.isArray(localDoc?.tables) ? localDoc.tables : [],
          charts: [],
        };
      }
      const nextBlocks = blocksByPageFromDoc(doc);
      const nextTables = Array.isArray(doc.tables) ? doc.tables : [];
      docIdRef.current = String(doc._id || "");
      setDashboardName(String(doc.name || "").trim() || "Untitled");
      const serverPending = Array.isArray(doc.pending_tabs) ? doc.pending_tabs.filter(Boolean) : [];
      const listedTabs = new Set((Array.isArray(doc.tabs) ? doc.tabs : []).map((tab) => tab?.id).filter(Boolean));
      const savedTabIds = [...new Set([...Object.keys(doc.blocks || {}), ...serverPending])];
      // Blocks under a tab id the tab bar no longer lists belong to a deleted tab.
      // A lone default tab beside many saved ones looks like a lost tab list, so nothing is removed then.
      const lostTabList = listedTabs.size <= 1 && savedTabIds.length > 1;
      const orphanTabs = lostTabList ? [] : savedTabIds.filter((id) => !listedTabs.has(id));
      const pendingNow = serverPending.filter((id) => !orphanTabs.includes(id));
      const base = createSaveBaseline();
      if (doc._id) {
        rememberMeta(base, {
          name: String(doc.name || "").trim().slice(0, 120) || "Untitled",
          active_tab_id: doc.active_tab_id,
          welcome_removed: !!doc.welcome_removed,
          tabs: doc.tabs,
        });
        rememberLoadedTabs(base, nextBlocks, savedBlocksByPage(nextBlocks).blocksByPage);
        rememberServerTabs(base, serverPending);
        rememberTables(base, nextTables);
      }
      saveBaseRef.current = base;
      removedTabsRef.current = new Set(orphanTabs);
      for (const id of orphanTabs) delete nextBlocks[pageIdForTab(id)];
      const previousLocal = readLocalDashboard(owner);
      const localBlocks = { ...(previousLocal?.blocks || {}), ...(doc.blocks || {}) };
      for (const tabId of pendingNow) {
        if (previousLocal?.blocks?.[tabId]) localBlocks[tabId] = previousLocal.blocks[tabId];
      }
      for (const tabId of orphanTabs) delete localBlocks[tabId];
      writeLocalDashboard(owner, {
        name: doc.name,
        active_tab_id: doc.active_tab_id,
        welcome_removed: doc.welcome_removed,
        tabs: doc.tabs,
        blocks: localBlocks,
        tables: nextTables,
        charts: [],
      });
      setTables(nextTables);
      setBlocksByPage((prev) => {
        const merged = { ...nextBlocks };
        const orphanPages = new Set(orphanTabs.map(pageIdForTab));
        for (const [page, list] of Object.entries(prev || {})) {
          if ((list || []).length && !orphanPages.has(page)) merged[page] = list;
        }
        return merged;
      });
      const pending = pendingNow;
      setPendingTabs(pending);
      if (Array.isArray(doc.tabs) && doc.tabs.length) {
        ctx?.setWorkspaceStartTabs?.(doc.tabs);
        ctx?.setWelcomeTabRemoved?.(!!doc.welcome_removed);
        ctx?.setActiveWorkspaceStartTabId?.(doc.active_tab_id || doc.tabs[0].id);
        saveWorkspaceStartTabs(owner, {
          tabs: doc.tabs,
          welcomeRemoved: !!doc.welcome_removed,
          activeId: doc.active_tab_id || doc.tabs[0].id,
        });
      }
      setReady(true);
    })();
    return () => {
      cancel = true;
      loadEpochRef.current += 1;
      tabFetchRef.current.clear();
      tabFailuresRef.current.clear();
      setPrefetchOn(false);
    };
    // Load once per signed-in user. Tab edits after that are saved by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owner]);

  // A tab stays pending until its blocks arrive. Saving treats every non-pending tab as loaded,
  // so marking a failed tab as loaded would erase it on the server.
  const fetchPendingTab = useCallback((tabId) => {
    const inflight = tabFetchRef.current;
    if (!tabId || inflight.has(tabId)) return;
    const epoch = loadEpochRef.current;
    const run = loadCurrentWorkspaceDashboard(tabId, { blocksOnly: true })
      .catch(() => ({ ok: false }))
      .then((part) => {
        if (epoch !== loadEpochRef.current) return;
        if (!part.ok || !part.data) {
          const failures = (tabFailuresRef.current.get(tabId) || 0) + 1;
          tabFailuresRef.current.set(tabId, failures);
          window.setTimeout(() => setTabRetryNonce((n) => n + 1), Math.min(30000, 1500 * 2 ** failures));
          return;
        }
        tabFailuresRef.current.delete(tabId);
        if (!removedTabsRef.current.has(tabId)) {
          const loadedPages = blocksByPageFromDoc(part.data);
          rememberLoadedTabs(saveBaseRef.current, loadedPages, savedBlocksByPage(loadedPages).blocksByPage);
          setBlocksByPage((prev) => mergeLoadedTabs(prev, loadedPages));
        }
        setPendingTabs((current) => current.filter((id) => id !== tabId));
      })
      .finally(() => {
        if (tabFetchRef.current.get(tabId) === run) tabFetchRef.current.delete(tabId);
      });
    inflight.set(tabId, run);
  }, []);

  const viewedTabId = tabIdFromPage(pageId);
  useEffect(() => {
    if (readOnly || !ready || !pendingTabs.includes(viewedTabId)) return;
    fetchPendingTab(viewedTabId);
  }, [fetchPendingTab, pendingTabs, readOnly, ready, tabRetryNonce, viewedTabId]);

  const pageIdRef = useRef(pageId);
  pageIdRef.current = pageId;
  const markTabSettled = useCallback((settledPageId) => {
    if (settledPageId === pageIdRef.current) setPrefetchOn(true);
  }, []);

  const viewedEmpty = !(blocksByPage[pageId] || []).length && !pendingTabs.includes(viewedTabId);
  useEffect(() => {
    if (readOnly || !ready || prefetchOn) return undefined;
    if (viewedEmpty) {
      setPrefetchOn(true);
      return undefined;
    }
    const timer = window.setTimeout(() => setPrefetchOn(true), 6000);
    return () => window.clearTimeout(timer);
  }, [prefetchOn, readOnly, ready, viewedEmpty]);

  useEffect(() => {
    if (readOnly || !ready || !prefetchOn || !pendingTabs.length) return undefined;
    if (pendingTabs.includes(viewedTabId)) return undefined;
    if (pendingTabs.some((id) => tabFetchRef.current.has(id))) return undefined;
    const order = tabs.map((tab) => tab.id);
    const rank = (id) => (order.includes(id) ? order.indexOf(id) : order.length);
    const next = pendingTabs
      .filter((id) => !tabFailuresRef.current.has(id))
      .sort((a, b) => rank(a) - rank(b))[0] || pendingTabs.find((id) => tabFailuresRef.current.has(id));
    if (!next) return undefined;
    return whenIdle(() => fetchPendingTab(next));
  }, [fetchPendingTab, pendingTabs, prefetchOn, readOnly, ready, tabRetryNonce, tabs, viewedTabId]);

  const liveRef = useRef(null);
  liveRef.current = { readOnly, ready, owner, tabs, activeTabId, welcomeRemoved, dashboardName, blocksByPage, tables, pendingTabs };
  const backupAtRef = useRef(0);

  /** One save at a time. Edits made while a save is out go in the next one. */
  const flushSave = useCallback(({ keepalive = false } = {}) => {
    const live = liveRef.current;
    if (!live || live.readOnly || !live.ready || !live.owner || live.owner === "local" || !live.tabs.length) {
      return Promise.resolve({ ok: true });
    }
    if (savingRef.current) {
      resaveRef.current = true;
      return savingRef.current;
    }
    const finish = (result) => {
      savingRef.current = null;
      if (!result.ok) window.setTimeout(() => setSaveNonce((n) => n + 1), 5000);
      else if (resaveRef.current) {
        resaveRef.current = false;
        setSaveNonce((n) => n + 1);
      }
      return result;
    };
    if (!docIdRef.current) {
      const run = createWorkspaceDashboard(draftFromLive(live))
        .then((created) => {
          if (!created.ok || !created.data?._id) return { ok: false };
          docIdRef.current = String(created.data._id);
          saveBaseRef.current = createSaveBaseline();
          resaveRef.current = true;
          return { ok: true };
        })
        .catch(() => ({ ok: false }))
        .then(finish);
      savingRef.current = run;
      return run;
    }
    const saved = savedBlocksByPage(live.blocksByPage);
    rememberSheetRecords(live.owner, saved.trimmed);
    const base = saveBaseRef.current;
    const result = buildSavePatch(base, {
      meta: metaFromLive(live),
      tabIds: live.tabs.map((tab) => tab.id),
      blocksByPage: live.blocksByPage,
      savedBlocks: saved.blocksByPage,
      tables: live.tables,
      savedTableList: savedTables(live.tables, live.blocksByPage),
      pendingTabs: live.pendingTabs,
      removedTabs: removedTabsRef.current,
    });
    if (!result.patch) {
      for (const id of result.removedTabs) removedTabsRef.current.delete(id);
      return Promise.resolve({ ok: true });
    }
    const small = keepalive && JSON.stringify(result.patch).length < 60000;
    const run = patchWorkspaceDashboard(docIdRef.current, result.patch, { keepalive: small })
      .then((response) => {
        if (!response.ok) return { ok: false };
        if (saveBaseRef.current === base) result.commit();
        for (const id of result.removedTabs) removedTabsRef.current.delete(id);
        const dropped = new Set(response.data?.removed_tables || []);
        if (dropped.size) {
          for (const id of dropped) {
            base.tables.delete(id);
            base.tableSigs.delete(id);
          }
          setTables((prev) => prev.filter((table) => !dropped.has(table.id)));
        }
        if (Date.now() - backupAtRef.current > 30000) {
          backupAtRef.current = Date.now();
          whenIdle(() => writeLocalDashboard(live.owner, draftFromLive(liveRef.current)), 5000);
        }
        return { ok: true };
      })
      .catch(() => ({ ok: false }))
      .then(finish);
    savingRef.current = run;
    return run;
  }, []);

  useEffect(() => {
    if (readOnly || !ready || !owner || owner === "local") return undefined;
    const timer = window.setTimeout(() => {
      void flushSave();
    }, 700);
    return () => window.clearTimeout(timer);
  }, [activeTabId, blocksByPage, dashboardName, flushSave, owner, readOnly, ready, saveNonce, tables, tabs, welcomeRemoved]);

  useEffect(() => {
    if (readOnly || !ready || !storageKey) return;
    const saved = savedBlocksByPage({ [pageId]: blocks });
    rememberSheetRecords(owner, saved.trimmed);
    try {
      localStorage.setItem(storageKey, JSON.stringify(saved.blocksByPage[pageId] || []));
    } catch {
      // The full dashboard document is the copy that survives a reload.
    }
  }, [blocks, owner, pageId, readOnly, ready, storageKey]);

  const restoredRef = useRef(new Set());
  useEffect(() => {
    if (!ready || !owner) return;
    for (const [page, list] of Object.entries(blocksByPage)) {
      for (const block of Array.isArray(list) ? list : []) {
        if (block?.type !== "sheet" || !Array.isArray(block.records)) continue;
        if (!(Number(block.rowCount) > block.records.length)) continue;
        const mark = `${page}:${block.id}:${block.pulledAt || 0}`;
        if (restoredRef.current.has(mark)) continue;
        restoredRef.current.add(mark);
        void restoreSheetRecords(owner, page, block).then((records) => {
          if (!records) return;
          setBlocksByPage((prev) => {
            const current = prev[page];
            if (!Array.isArray(current)) return prev;
            let hit = false;
            const next = current.map((item) => {
              if (item.id !== block.id || (item.pulledAt || 0) !== (block.pulledAt || 0)) return item;
              if (!Array.isArray(item.records) || item.records.length >= records.length) return item;
              hit = true;
              return { ...item, records };
            });
            return hit ? { ...prev, [page]: next } : prev;
          });
        });
      }
    }
  }, [blocksByPage, owner, ready]);

  useEffect(() => {
    if (!ready) return;
    const now = Date.now();
    setBlocksByPage((prev) => {
      let changed = false;
      const next = {};
      for (const [page, list] of Object.entries(prev || {})) {
        if (!Array.isArray(list)) {
          next[page] = list;
          continue;
        }
        next[page] = list.map((block) => {
          if (block?.type !== "sheet" || block.source !== "integration-run" || block.pulledAt) return block;
          changed = true;
          return { ...block, pulledAt: now };
        });
      }
      return changed ? next : prev;
    });
  }, [ready]);

  useEffect(() => {
    if (!ready || user === undefined) return undefined;
    const cap = getHistoricalPullRowLimit(user);
    for (const block of blocks) {
      if (!repullsTradeSheet(block) || !block.columns?.length) continue;
      const ticker = tradeTickerFromBlock(block);
      const limit = block.pull?.limit || cap;
      ensureFullTradeSheet(block.id, ticker, block.columns, limit, owner).then((sheet) => {
        if (sheet?.status !== "ready") return;
        setBlocksByPage((prev) => {
          const list = prev[pageId] || [];
          const current = list.find((item) => item.id === block.id);
          if (!current) return prev;
          const pull = { lake: "kalshi", table: "trades", ticker, limit };
          if (current.rowCount === sheet.rowCount && current.pull?.ticker === ticker && current.pull?.limit === limit) return prev;
          return {
            ...prev,
            [pageId]: list.map((item) => (item.id === block.id ? { ...item, rowCount: sheet.rowCount, pull } : item)),
          };
        });
      });
    }
    return undefined;
  }, [blocks, pageId, ready, user]);

  useEffect(() => {
    if (readOnly) return undefined;
    const flush = () => {
      if (!docIdRef.current) return;
      void flushSave({ keepalive: true });
    };
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, [flushSave, readOnly]);

  const updateBlock = useCallback(
    (id, patch) => {
      setBlocksByPage((prev) => {
        const list = prev[pageId] || [];
        const next = list.map((block) => (block.id === id ? { ...block, ...patch } : block));
        const geometry = ["x", "y", "w", "h"].some((key) => Object.prototype.hasOwnProperty.call(patch || {}, key));
        return { ...prev, [pageId]: geometry ? separateOverlaps(next) : next };
      });
    },
    [pageId],
  );

  const reportRun = useCallback((next) => {
    setRunFeed((current) => (typeof next === "function" ? next(current) : next));
  }, []);
  const armReplay = useCallback((fn) => {
    replayRunRef.current = typeof fn === "function" ? fn : null;
    setReplayReady(Boolean(replayRunRef.current));
  }, []);
  const replayRun = useCallback(() => {
    const fn = replayRunRef.current;
    if (fn) void fn();
  }, []);
  const dismissRun = useCallback(() => {
    replayRunRef.current = null;
    setReplayReady(false);
    setRunFeed(null);
  }, []);

  const registerTables = useCallback((incoming) => {
    const list = Array.isArray(incoming) ? incoming : [];
    setTables((prev) => {
      const map = new Map((prev || []).map((table) => [table.id, table]));
      for (const table of list) {
        if (table?.id) map.set(table.id, table);
      }
      return [...map.values()];
    });
  }, []);

  const placeIntegrationSheets = useCallback(
    (sheets, options) => {
      const incoming = Array.isArray(sheets) ? sheets : [];
      const targetId = options?.pageId || pageId;
      setBlocksByPage((prev) => {
        const existing = prev[targetId] || [];
        const kept = existing;
        const originY = kept.reduce((max, block) => Math.max(max, (block.y || 0) + (block.h || 0) + 24), 88);
        const placed = assignUniqueIds(layoutRunSheets(incoming, { originY: kept.length ? originY : 88 }), kept);
        placedSheetIdRef.current = placed[0]?.id || "";
        return { ...prev, [targetId]: [...kept, ...placed] };
      });
      const firstId = placedSheetIdRef.current || incoming[0]?.id || "";
      setSelectedId(firstId || null);
      setTool("select");
      if (!firstId) return;
      if (targetId !== pageId) {
        pendingRevealRef.current = firstId;
        return;
      }
      setSpotlightId(firstId);
      setRevealNonce((nonce) => nonce + 1);
    },
    [pageId],
  );

  const revealRunSheets = useCallback((sheets, options = {}) => {
    const rewriteId = typeof options.rewriteId === "function" ? options.rewriteId : (id) => id;
    const incoming = (Array.isArray(sheets) ? sheets : [])
      .filter((sheet) => sheet && (sheet.columns?.length || sheet.title))
      .map((sheet) => {
        const id = rewriteId(sheet.id) || sheet.id;
        return id && id !== sheet.id ? { ...sheet, id } : sheet;
      });
    if (!incoming.length) return;
    const targetId = options.pageId || pageIdRef.current;
    const holdChartsFor = rewriteId(String(options.holdChartsFor || "")) || "";
    const spotlightChartsFor = rewriteId(String(options.spotlightChartsFor || "")) || "";
    const existing = blocksByPageRef.current[targetId] || [];
    const previousById = new Map(existing.map((block) => [block.id, block]));
    const columnKey = (columns) => (columns || []).map((column) => column?.id || "").join("\0");
    const rowKey = (sheet) => Math.max(Array.isArray(sheet?.rows) ? sheet.rows.length : 0, Math.floor(Number(sheet?.rowCount) || 0));
    let focusId = "";
    for (const sheet of incoming) {
      const id = sheet.id;
      if (!id) continue;
      const prior = previousById.get(id);
      if (!prior) {
        focusId = id;
        continue;
      }
      if (columnKey(prior.columns) !== columnKey(sheet.columns) || (prior.rowCount || 0) !== rowKey(sheet)) focusId = id;
    }
    setBlocksByPage((prev) => {
      const list = prev[targetId] || [];
      const priorById = new Map(list.map((block) => [block.id, block]));
      const laidIds = new Set(incoming.map((sheet) => sheet.id).filter(Boolean));
      const kept = list.filter((block) => {
        if (laidIds.has(block.id)) return false;
        if (block.type === "chart" && block.source === "sheet-chart" && laidIds.has(block.sourceSheetId)) return false;
        return true;
      });
      const originY = kept.reduce((max, block) => Math.max(max, (block.y || 0) + (block.h || 0) + 24), 88);
      const placed = layoutRunSheets(incoming, { originY: kept.length ? originY : 88 });
      /** @type {Map<string, object[]>} */
      const chartsBySheet = new Map();
      for (const block of placed) {
        const specs = chartSpecsForSheet(block);
        chartsBySheet.set(
          block.id,
          specs.map((spec) => {
            const chartId = `chart-${block.id}-${spec.chartView || "view"}`;
            const prior = priorById.get(chartId);
            return {
              ...(prior || {}),
              id: chartId,
              type: "chart",
              source: "sheet-chart",
              sourceSheetId: block.id,
              ...(spec.chartView ? { chartView: spec.chartView } : {}),
              title: spec.title,
              w: spec.w || 540,
              h: spec.h || 360,
              body: "",
              arrive: prior ? prior.arrive : true,
            };
          }),
        );
      }
      const laid = layoutRunCharts(placed, chartsBySheet, { holdSheetId: holdChartsFor });
      const animated = laid.sheets.map((block) => {
        const prior = priorById.get(block.id);
        if (!prior) return { ...block, arrive: true };
        const sameData = columnKey(prior.columns) === columnKey(block.columns) && (prior.rowCount || 0) === (block.rowCount || 0);
        const filled = sameData && (block.records?.length || 0) > (prior.records?.length || 0);
        return {
          ...(sameData ? prior : block),
          ...(filled ? { records: block.records, cells: block.cells } : {}),
          x: block.x,
          y: block.y,
          w: block.w,
          h: block.h,
          arrive: prior.arrive,
          ...(sameData ? {} : { pulse: Date.now() }),
          ...(block.query ? { query: block.query } : {}),
          ...(block.provenance ? { provenance: block.provenance } : {}),
          ...(block.pull ? { pull: block.pull } : {}),
          ...(block.dataset ? { dataset: block.dataset } : {}),
          ...(block.integrationId ? { integrationId: block.integrationId } : {}),
          ...(block.table ? { table: block.table } : {}),
          ...(block.title ? { title: block.title } : {}),
        };
      });
      if (spotlightChartsFor) {
        const spotlight = (chartsBySheet.get(spotlightChartsFor) || [])[0];
        if (spotlight?.id) focusId = spotlight.id;
      }
      return { ...prev, [targetId]: [...kept, ...animated, ...laid.charts] };
    });
    if (!focusId) return;
    if (targetId !== pageIdRef.current) {
      pendingRevealRef.current = focusId;
      return;
    }
    setSpotlightId(focusId);
    setRevealNonce((nonce) => nonce + 1);
  }, []);

  const addBlock = useCallback(
    (type) => {
      const size = BLOCK_SIZE[type] || BLOCK_SIZE.text;
      const copy = BLOCK_COPY[type] || BLOCK_COPY.text;
      const id = newId();
      setBlocksByPage((prev) => {
        const list = prev[pageId] || [];
        const n = list.length;
        const block = {
          id,
          type,
          x: 32 + (n % 4) * 24,
          y: 72 + (n % 5) * 24,
          w: size.w,
          h: size.h,
          title: copy.title,
          body: copy.body,
        };
        return { ...prev, [pageId]: [...list, block] };
      });
      setSelectedId(id);
      setTool("select");
    },
    [pageId],
  );

  const duplicateBlock = useCallback(
    (id) => {
      const source = blocks.find((block) => block.id === id);
      if (!source) return;
      const nextId = newId();
      const label = source.type === "text" ? source.body : source.title;
      const names = blocks.map((block) => (block.type === "text" ? block.body : block.title));
      const nextLabel = duplicateTabName(label, names);
      setBlocksByPage((prev) => {
        const list = prev[pageId] || [];
        const current = list.find((block) => block.id === id) || source;
        const copy = {
          ...current,
          id: nextId,
          x: current.x + 24,
          y: current.y + 24,
          title: current.type === "text" ? current.title : nextLabel,
          body: current.type === "text" ? nextLabel : current.body,
        };
        return { ...prev, [pageId]: [...list, copy] };
      });
      setSelectedId(nextId);
    },
    [blocks, pageId],
  );

  const createChartFromBlock = useCallback(
    (id, forcedView) => {
      const sheet = blocks.find((block) => block.id === id && block.type === "sheet");
      if (!sheet) return;
      const base = String(sheet.title || "Sheet").replace(/\s+chart$/, "").trim() || "Sheet";
      const specs = chartSpecsForSheet(sheet, forcedView);
      const chartsForSheet = specs.length ? specs : [{ chartView: "", title: `${base} chart`, w: 540, h: 360 }];
      const chartId = newId();
      setBlocksByPage((prev) => {
        const list = prev[pageId] || [];
        const current = list.find((block) => block.id === id) || sheet;
        const charts = chartsForSheet.map((spec, index) => ({
          id: index === 0 ? chartId : newId(),
          type: "chart",
          source: "sheet-chart",
          sourceSheetId: current.id,
          ...(spec.chartView ? { chartView: spec.chartView } : {}),
          x: current.x,
          y: (current.y || 0) + index,
          w: spec.w || 540,
          h: spec.h || 360,
          title: spec.title,
          body: "",
        }));
        return { ...prev, [pageId]: packClippedBlocks([...list, ...charts]) };
      });
      setSelectedId(chartId);
      setTool("select");
    },
    [blocks, pageId],
  );

  const chartRunLock = useRef(false);
  const generateChartsForSheets = useCallback(async () => {
    if (readOnly || chartRunLock.current) return;
    const page = pageIdRef.current;
    const sheets = [...(blocksByPageRef.current[page] || [])]
      .filter((block) => block.type === "sheet")
      .sort((a, b) => (a.y || 0) - (b.y || 0) || (a.x || 0) - (b.x || 0));
    if (!sheets.length) return;
    chartRunLock.current = true;
    const reporter = createRunReporter((feed) => setRunFeed(feed));
    reporter.plan(
      sheets.map((sheet) => ({ id: sheet.id, name: sheet.title || "Sheet", status: "pending" })),
      {
        title: `${sheets.length} ${sheets.length === 1 ? "sheet" : "sheets"} on this tab`,
        runningLabel: "Generating charts",
        doneLabel: "Charts ready",
        failLabel: "Chart generation failed",
        readyDetail: "The charts are on the canvas behind this card.",
      },
    );
    let working = blocksByPageRef.current[page] || [];
    try {
      for (const sheet of sheets) {
        if (pageIdRef.current !== page) break;
        reporter.start(sheet.id);
        const specs = chartSpecsForSheet(sheet);
        const have = new Set(
          working.filter((block) => block.type === "chart" && block.sourceSheetId === sheet.id).map((block) => block.chartView || ""),
        );
        const missing = specs.filter((spec) => !have.has(spec.chartView || ""));
        if (!missing.length) {
          reporter.succeed(sheet.id, {
            result: specs.length ? "Charts already on the canvas." : "This sheet stays in the table.",
          });
          continue;
        }
        const charts = missing.map((spec) => ({
          id: newId(),
          type: "chart",
          source: "sheet-chart",
          sourceSheetId: sheet.id,
          ...(spec.chartView ? { chartView: spec.chartView } : {}),
          w: spec.w || 540,
          h: spec.h || 360,
          title: spec.title,
          body: "",
          arrive: true,
        }));
        const placed = placeChartsBelow(working, charts);
        working = [...working, ...placed];
        setBlocksByPage((prev) => {
          const current = prev[page] || [];
          if (current.some((block) => block.id === charts[0].id)) return prev;
          const known = new Set(current.map((block) => block.id));
          const incoming = placed.filter((block) => !known.has(block.id));
          return incoming.length ? { ...prev, [page]: [...current, ...incoming] } : prev;
        });
        setSpotlightId(charts[0].id);
        setRevealNonce((nonce) => nonce + 1);
        reporter.succeed(sheet.id, {
          result: charts.length === 1 ? "1 chart on the canvas." : `${charts.length} charts on the canvas.`,
        });
        await new Promise((resolve) => window.setTimeout(resolve, 340));
      }
      reporter.finish();
    } catch (error) {
      reporter.fail(null, error instanceof Error ? error.message : "Could not generate charts");
    } finally {
      chartRunLock.current = false;
    }
  }, [readOnly]);

  useEffect(() => {
    if (readOnly) return;
    setBlocksByPage((prev) => {
      let changed = false;
      const next = {};
      for (const [id, list] of Object.entries(prev)) {
        const paired = withOrderBookChartPairs(list);
        if (paired !== list) changed = true;
        next[id] = paired;
      }
      return changed ? next : prev;
    });
  }, [blocksByPage, readOnly]);

  const removeBlock = useCallback(
    (id) => {
      setBlocksByPage((prev) => ({
        ...prev,
        [pageId]: packReadingOrder((prev[pageId] || []).filter((block) => block.id !== id)),
      }));
      setSelectedId((current) => (current === id ? null : current));
    },
    [pageId],
  );

  useEffect(() => {
    if (pendingSelectRef.current) {
      setSelectedId(pendingSelectRef.current);
      pendingSelectRef.current = "";
      return;
    }
    setSelectedId(null);
  }, [pageId]);

  const focusBlock = useCallback((id, nextPageId) => {
    if (nextPageId && nextPageId !== pageIdRef.current) pendingSelectRef.current = id || "";
    setSelectedId(id || null);
  }, []);

  const switchTab = useCallback((tabId, revealId) => {
    if (revealId) {
      pendingRevealRef.current = revealId;
      pendingSelectRef.current = revealId;
      setSelectedId(revealId);
    }
    ctxRef.current?.setViewing?.("welcome");
    ctxRef.current?.setActiveWorkspaceStartTabId?.(tabId);
  }, []);

  const requestTab = useCallback((tabId, revealId) => {
    if (!tabId) return;
    const nextPage = pageIdForTab(tabId);
    if (nextPage === pageIdRef.current) {
      if (revealId) {
        setSelectedId(revealId);
        setSpotlightId(revealId);
        setRevealNonce((nonce) => nonce + 1);
      }
      return;
    }
    if (realtimeModeRef.current[pageIdRef.current]) {
      setLeavePrompt({ tabId, revealId: revealId || "" });
      return;
    }
    switchTab(tabId, revealId);
  }, [switchTab]);

  const startRealtimeMode = useCallback((targetPageId) => {
    const page = targetPageId || pageIdRef.current;
    const sheets = (blocksByPageRef.current[page] || []).filter(
      (block) => block?.type === "sheet" && realtimeTargetForBlock(block) && !sheetMarketClosed(block),
    );
    if (!sheets.length) return;
    setRealtimeModeByPage((prev) => (prev[page] ? prev : { ...prev, [page]: true }));
    for (const sheet of sheets) startSheetRealtime(sheet.id, page);
  }, [startSheetRealtime]);

  const stopRealtimeMode = useCallback((targetPageId) => {
    const page = targetPageId || pageIdRef.current;
    setRealtimeModeByPage((prev) => {
      if (!prev[page]) return prev;
      const next = { ...prev };
      delete next[page];
      return next;
    });
    stopPageRealtime(page);
  }, [stopPageRealtime]);

  /** Drops a tab's blocks and tables here, and from the saved dashboard on the next save. */
  const deleteTab = useCallback((tabId) => {
    if (!tabId || readOnly) return;
    const page = pageIdForTab(tabId);
    removedTabsRef.current.add(tabId);
    tabFetchRef.current.delete(tabId);
    tabFailuresRef.current.delete(tabId);
    stopPageRealtime(page);
    setRealtimeModeByPage((prev) => {
      if (!prev[page]) return prev;
      const next = { ...prev };
      delete next[page];
      return next;
    });
    const current = blocksByPageRef.current;
    const goneIds = new Set((current[page] || []).map((block) => block?.id).filter(Boolean));
    for (const [otherPage, list] of Object.entries(current)) {
      if (otherPage === page) continue;
      for (const block of Array.isArray(list) ? list : []) goneIds.delete(block?.id);
    }
    setBlocksByPage((prev) => {
      if (!(page in prev)) return prev;
      const next = { ...prev };
      delete next[page];
      return next;
    });
    if (goneIds.size) setTables((prev) => prev.filter((table) => !goneIds.has(table.id)));
    setPendingTabs((prev) => (prev.includes(tabId) ? prev.filter((id) => id !== tabId) : prev));
    const localOwner = liveRef.current?.owner;
    if (localOwner) {
      try {
        window.localStorage.removeItem(canvasStorageKey(localOwner, page));
      } catch {
        /* storage unavailable */
      }
    }
  }, [readOnly, stopPageRealtime]);

  const resolveLeave = useCallback((choice) => {
    const prompt = leavePromptRef.current;
    setLeavePrompt(null);
    if (!prompt) return;
    if (choice === "stop") stopRealtimeMode(pageIdRef.current);
    switchTab(prompt.tabId, prompt.revealId);
  }, [stopRealtimeMode, switchTab]);

  const replayTab = useCallback(() => {
    if (readOnly) return;
    const page = pageIdRef.current;
    const reporter = createRunReporter((feed) => {
      setRunFeed(feed);
    });
    const planLimit = getHistoricalPullRowLimit(user);
    void replayTabSheets(blocksByPageRef.current[page] || [], {
      planLimit,
      reporter,
      onSheet(id, cells, rowCount, records, query, extra) {
        setBlocksByPage((prev) => {
          const list = prev[page] || [];
          const current = list.find((block) => block.id === id);
          if (!current && extra?.columns?.length) {
            const originY = list.reduce((max, block) => Math.max(max, (block.y || 0) + (block.h || 0) + 24), 88);
            const placed = layoutRunSheets(
              [{
                id,
                title: extra.title || "Sheet",
                columns: extra.columns,
                rows: extra.rows || [],
                rowCount,
                table: extra.table || query?.table,
                integrationId: extra.integrationId || "polymarket",
                query,
                ...(query?.address ? { pull: { table: extra.table || query.table, address: query.address, kind: "profile" } } : {}),
                keepAllRows: true,
                span: "half",
              }],
              { originY },
            );
            return { ...prev, [page]: [...list, ...placed] };
          }
          if (!current) return prev;
          const nextSheet = {
            ...current,
            cells,
            ...(Array.isArray(records) ? { records } : {}),
            ...(extra?.title ? { title: extra.title } : {}),
            ...(extra?.columns?.length ? { columns: extra.columns } : {}),
            ...(query && typeof query === "object" ? { query: { ...(current.query || {}), ...query } } : {}),
          };
          const tokens = sheetAssetIds(nextSheet);
          const table = current.table || current.pull?.table || "";
          const address = String(query?.address || "").trim();
          const wallet = /^0x[a-fA-F0-9]{40}$/.test(address) ? address : "";
          const pull = table
            ? {
                ...(current.pull || {}),
                table,
                ...(tokens.length ? { tokens } : {}),
                ...(wallet ? { address: wallet, kind: "profile" } : {}),
              }
            : current.pull;
          return {
            ...prev,
            [page]: list.map((block) =>
              block.id === id ? { ...nextSheet, rowCount, pulledAt: Date.now(), ...(pull ? { pull } : {}) } : block,
            ),
          };
        });
      },
    });
  }, [readOnly, user]);

  const revealBlock = useCallback((id, nextPageId) => {
    if (!id) return;
    let page = nextPageId || pageIdRef.current;
    if (!nextPageId) {
      for (const [pageKey, list] of Object.entries(blocksByPageRef.current || {})) {
        if ((list || []).some((block) => block.id === id)) {
          page = pageKey;
          break;
        }
      }
    }
    if (page !== pageIdRef.current) {
      requestTab(tabIdFromPage(page), id);
      return;
    }
    pendingRevealRef.current = "";
    setSelectedId(id);
    setSpotlightId(id);
    setRevealNonce((nonce) => nonce + 1);
  }, [requestTab]);

  const focusSheetRow = useCallback((sheetId, row) => {
    const id = String(sheetId || "");
    const index = Number(row);
    if (!id || !Number.isFinite(index)) return;
    setSheetRowFocus({ sheetId: id, row: index, nonce: Date.now() });
    revealBlock(id);
  }, [revealBlock]);

  useEffect(() => {
    const id = pendingRevealRef.current;
    if (!id) return undefined;
    if (!(blocksByPage[pageId] || []).some((block) => block.id === id)) return undefined;
    pendingRevealRef.current = "";
    setSpotlightId(id);
    setRevealNonce((nonce) => nonce + 1);
    return undefined;
  }, [blocksByPage, pageId]);

  useEffect(() => {
    if (!spotlightId) return undefined;
    const timer = window.setTimeout(() => setSpotlightId(null), 1800);
    return () => window.clearTimeout(timer);
  }, [spotlightId, revealNonce]);

  const renameDashboard = useCallback((next) => {
    setDashboardName(String(next || "").trim().slice(0, 120) || "Untitled");
  }, []);

  const saveNow = useCallback(async () => {
    const live = liveRef.current;
    const localOwner = live.owner || "local";
    writeLocalDashboard(localOwner, draftFromLive(live));
    if (localOwner === "local") return { ok: true };
    while (savingRef.current) await savingRef.current;
    return flushSave();
  }, [flushSave]);

  useEffect(() => {
    setBlocksByPage((prev) => {
      let changed = false;
      const next = {};
      for (const [page, list] of Object.entries(prev || {})) {
        const unique = assignUniqueIds(list);
        if (unique.some((block, index) => block !== (list || [])[index])) changed = true;
        next[page] = unique;
      }
      return changed ? next : prev;
    });
  }, [blocks.length, pageId, ready]);

  const value = useMemo(
    () => ({
      tool,
      setTool,
      handDown,
      setHandDown,
      dashboardName,
      renameDashboard,
      saveNow,
      deleteTab,
      readOnly,
      ready,
      tabLoading: pendingTabs.includes(tabIdFromPage(pageId)),
      markTabSettled,
      pageId,
      previewTabs,
      previewActiveId,
      blocks,
      blocksByPage,
      tables,
      selectedId,
      setSelectedId,
      focusBlock,
      revealBlock,
      focusSheetRow,
      sheetRowFocus,
      spotlightId,
      revealNonce,
      realtimeById,
      realtimeModeByPage,
      startRealtimeMode,
      stopRealtimeMode,
      requestTab,
      resolveLeave,
      leavePrompt,
      replayTab,
      startSheetRealtime,
      stopSheetRealtime,
      renameId,
      setRenameId,
      addBlock,
      placeIntegrationSheets,
      revealRunSheets,
      registerTables,
      runFeed,
      reportRun,
      replayReady,
      armReplay,
      replayRun,
      dismissRun,
      updateBlock,
      duplicateBlock,
      removeBlock,
      createChartFromBlock,
      generateChartsForSheets,
    }),
    [addBlock, armReplay, blocks, blocksByPage, createChartFromBlock, dashboardName, deleteTab, dismissRun, duplicateBlock, focusBlock, focusSheetRow, generateChartsForSheets, handDown, leavePrompt, markTabSettled, pageId, pendingTabs, placeIntegrationSheets, previewActiveId, previewTabs, readOnly, ready, realtimeById, realtimeModeByPage, registerTables, removeBlock, renameDashboard, renameId, replayReady, replayRun, replayTab, reportRun, requestTab, resolveLeave, revealBlock, revealNonce, revealRunSheets, runFeed, saveNow, selectedId, sheetRowFocus, spotlightId, startRealtimeMode, startSheetRealtime, stopRealtimeMode, stopSheetRealtime, tables, tool, updateBlock],
  );

  return (
    <WorkspaceCanvasContext.Provider value={value}>
      <style>{SHEET_ARRIVE_CSS}</style>
      {children}
      {leavePrompt ? (
        <div className="fixed inset-0 z-[700] flex items-center justify-center bg-black/40 p-6">
          <div
            role="dialog"
            aria-labelledby="realtime-leave-title"
            className="w-full max-w-md rounded-xl border border-border/70 bg-background p-6 shadow-sm"
          >
            <h2 id="realtime-leave-title" className="text-[15px] font-semibold text-foreground">
              Realtime mode is on
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
              This tab is still pulling live data. Stop the pulls, or keep them running while you leave.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                className="inline-flex h-8 items-center rounded-md border border-border/70 px-3 text-[13px] font-medium hover:bg-muted"
                onClick={() => resolveLeave("stop")}
              >
                Stop pulls
              </button>
              <button
                type="button"
                className="inline-flex h-8 items-center rounded-md bg-[#0d99ff] px-3 text-[13px] font-medium text-white hover:bg-[#0b87e0]"
                onClick={() => resolveLeave("keep")}
              >
                Keep running
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </WorkspaceCanvasContext.Provider>
  );
}

function EditableText({ value, onChange, className, placeholder }) {
  const canvas = useWorkspaceCanvas();
  const ref = useRef(null);
  useEffect(() => {
    if (canvas?.readOnly) return;
    const el = ref.current;
    if (!el || document.activeElement === el) return;
    if (el.textContent !== value) el.textContent = value || "";
  }, [canvas?.readOnly, value]);
  if (canvas?.readOnly) {
    return <div className={className}>{value || placeholder || ""}</div>;
  }
  return (
    <div
      ref={ref}
      data-editable=""
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-label={value ? undefined : placeholder || "Edit text"}
      className={cn("cursor-text outline-none", className)}
      onBlur={(e) => onChange(e.currentTarget.textContent || "")}
    />
  );
}

function chartSnapshotKey(chart) {
  if (chart?.kind === "order-book") {
    const bid = chart.bids?.[0];
    const ask = chart.asks?.[0];
    const bidDepth = chart.bids?.[chart.bids.length - 1]?.total ?? 0;
    const askDepth = chart.asks?.[chart.asks.length - 1]?.total ?? 0;
    return `order-book|${chart.bids?.length || 0}|${chart.asks?.length || 0}|${bid?.price}|${bid?.size}|${ask?.price}|${ask?.size}|${bidDepth}|${askDepth}|${chart.symbol || ""}`;
  }
  const candles = chart?.candles;
  if (candles?.length) {
    const last = candles[candles.length - 1];
    return `${chart.kind}|${candles.length}|${last.t}|${last.close}|${last.volume}|${chart.volumeLabel || ""}`;
  }
  const points = chart?.points;
  if (!points?.length) return "";
  const last = points[points.length - 1];
  return `${chart.kind}|${points.length}|${last.time || last.label}|${last.price ?? last.value}|${chart.sizeTitle || ""}`;
}

function formatPulledAt(value) {
  const time = Number(value);
  if (!Number.isFinite(time) || time <= 0) return "";
  const date = new Date(time);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function shownRowCount(block) {
  const stored = Array.isArray(block?.records) ? block.records.length : 0;
  return Math.max(stored, filledRowCount(block?.cells), Number(block?.rowCount) || 0);
}

function filledRowCount(cells) {
  const rows = new Set();
  for (const key of Object.keys(cells || {})) {
    const row = Number(String(key).split(",")[1]);
    if (Number.isFinite(row)) rows.add(row);
  }
  return rows.size;
}

function SheetSkeleton() {
  return (
    <div className="min-h-0 flex-1 overflow-hidden" aria-hidden>
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className="flex items-center gap-3 border-b border-border/40 px-3 py-2.5 last:border-0">
          <span className="w-5 text-[12px] text-muted-foreground/70">{index + 1}</span>
          <span className="h-3 animate-pulse rounded bg-muted" style={{ width: `${42 - index * 2}%`, animationDelay: `${index * 70}ms` }} />
          <span className="h-3 w-[16%] animate-pulse rounded bg-muted" style={{ animationDelay: `${index * 90}ms` }} />
          <span className="h-3 flex-1 animate-pulse rounded bg-muted" style={{ animationDelay: `${index * 110}ms` }} />
        </div>
      ))}
    </div>
  );
}

function liveSession(canvas, blockId) {
  if (!canvas?.realtimeById || !blockId) return null;
  return canvas.realtimeById[realtimeSessionKey(canvas.pageId, blockId)] || null;
}

function MarketLifeBar({ sheet, session, enabled }) {
  const life = sheetLife(sheet);
  const streaming = !!session?.running;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!streaming || !life?.closeMs) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, [streaming, life?.closeMs]);
  if (!enabled && !session?.notice) return null;
  const countdown = streaming ? lifeCountdown(life, now) : "";
  const notice = session?.notice || (life?.stopped ? closedLifeMessage(life?.outcome) : "");
  if (notice && (session?.closed || life?.stopped)) {
    return <div className="border-b border-border/70 bg-muted/70 px-3 py-1.5 text-[12px] leading-5 text-foreground">{notice}</div>;
  }
  if (!countdown) return null;
  return <div className="border-b border-border/70 px-3 py-1 text-[12px] text-muted-foreground">{countdown}</div>;
}

function liveBlock(block, canvas) {
  const session = liveSession(canvas, block?.id);
  if (Array.isArray(session?.liveRecords) && session.liveRecords.length) {
    return { ...block, records: session.liveRecords };
  }
  if (!session?.liveCells) return block;
  return { ...block, cells: session.liveCells, records: null };
}

const rememberedMarkets = new Set();

function useRememberMarket(block) {
  const canvas = useWorkspaceCanvas();
  const complete = marketMetaComplete(block);
  const updateRef = useRef(canvas?.updateBlock);
  updateRef.current = canvas?.updateBlock;
  const stopRef = useRef(canvas?.stopSheetRealtime);
  stopRef.current = canvas?.stopSheetRealtime;
  const blockRef = useRef(block);
  blockRef.current = block;
  useEffect(() => {
    const snapshot = blockRef.current;
    if (canvas?.readOnly || complete || snapshot?.type !== "sheet" || rememberedMarkets.has(snapshot.id)) return undefined;
    rememberedMarkets.add(snapshot.id);
    void enqueueMarketLookup(() => lookupSheetMarket(snapshot))
      .then((meta) => {
        if (!meta) {
          rememberedMarkets.delete(snapshot.id);
          return;
        }
        updateRef.current?.(snapshot.id, marketMetaPatch(snapshot, meta));
        if (meta.closed) stopRef.current?.(snapshot.id);
      })
      .catch(() => {
        rememberedMarkets.delete(snapshot.id);
      });
    return undefined;
  }, [block?.id, canvas?.readOnly, complete]);
}

function SheetMarketCaption({ block }) {
  const life = sheetLife(block);
  const ticking = !!(life && !life.stopped && life.closeMs && life.closeMs > Date.now());
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!ticking) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, [ticking, life?.closeMs]);
  const caption = sheetMarketCaption(block, now);
  if (!caption) return <span className="min-w-0 flex-1" />;
  return (
    <span className="min-w-0 flex-1 truncate text-[12px] font-normal text-muted-foreground" title={caption}>
      {caption}
    </span>
  );
}

function SheetPresentation({ sheet, dataset, hidden, readOnly, onHideColumn }) {
  if (dataset?.datasetType === "trader_activity") {
    return <ActivityRichTableView sheet={sheet} dataset={dataset} />;
  }
  if (dataset?.datasetType === "markets" || dataset?.datasetType === "events" || dataset?.datasetType === "series") {
    return (
      <CatalogRichTableView
        sheet={sheet}
        dataset={dataset}
        hidden={hidden}
        readOnly={readOnly}
        onHideColumn={onHideColumn}
      />
    );
  }
  return (
    <VisualTableView
      sheet={sheet}
      dataset={dataset}
      hidden={hidden}
      readOnly={readOnly}
      onHideColumn={onHideColumn}
    />
  );
}

function SheetBlockBody({ block, onChange, booting }) {
  const canvas = useWorkspaceCanvas();
  useRememberMarket(block);
  const view = liveBlock(block, canvas);
  const running = !!liveSession(canvas, block.id)?.running;
  const closed = sheetMarketClosed(block);
  const hasRealtime = !canvas?.readOnly && !closed && !!realtimeSheetForBlock(block, canvas?.blocks || []);
  const pulled = formatPulledAt(block.pulledAt);
  const shownCount = shownRowCount(view);
  const label = useTradeSheetLabel(usesHistoricalTradeSheet(block) ? block.id : "", shownCount);
  const dataset = describeSheet(view);
  const visual = block.presentation === "visual" && hasVisualTable(dataset);
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-border/70 px-3 py-2">
        <Table2 className="size-3.5 text-muted-foreground" aria-hidden />
        <EditableText
          value={block.title}
          placeholder="Data sheet"
          onChange={(title) => onChange({ title })}
          className="w-fit max-w-[40%] shrink-0 truncate text-[13px] font-semibold text-foreground"
        />
        <SheetMarketCaption block={block} />
        {running ? <span className="shrink-0 text-[11px] font-medium text-emerald-600">Live</span> : null}
        <span
          className={cn(
            "flex shrink-0 items-center text-[12px] tabular-nums text-muted-foreground transition-[padding] duration-200 ease-out",
            canvas?.readOnly ? "pr-1" : "pr-8",
            hasRealtime &&
              (running
                ? "pr-[3.75rem]"
                : "group-hover/block:pr-[3.75rem] group-focus-within/block:pr-[3.75rem]"),
          )}
        >
          <span>{booting ? "Loading…" : label}</span>
          {pulled && visual ? <span className="whitespace-nowrap pl-2">Pulled {pulled}</span> : null}
          {pulled && !visual ? (
            <span
              className={cn(
                "grid grid-cols-[0fr] opacity-0 transition-[grid-template-columns,opacity] duration-200 ease-out",
                "group-hover/block:grid-cols-[1fr] group-hover/block:opacity-100",
                "group-focus-within/block:grid-cols-[1fr] group-focus-within/block:opacity-100",
              )}
            >
              <span className="min-w-0 overflow-hidden">
                <span className="whitespace-nowrap pl-2">Pulled {pulled}</span>
              </span>
            </span>
          ) : null}
        </span>
      </div>
      <MarketLifeBar sheet={block} session={liveSession(canvas, block.id)} enabled={hasRealtime} />
      {booting ? (
        <SheetSkeleton />
      ) : visual ? (
        <SheetPresentation
          sheet={view}
          dataset={dataset}
          hidden={block.visualHidden}
          readOnly={!!canvas?.readOnly}
          onHideColumn={(id) => {
            const next = new Set(Array.isArray(block.visualHidden) ? block.visualHidden : []);
            next.add(id);
            onChange({ visualHidden: [...next] });
          }}
        />
      ) : (
        <DashboardSheetGrid block={view} onChange={onChange} readOnly={!!canvas?.readOnly} />
      )}
    </div>
  );
}

function TextSkeleton() {
  return (
    <div className="flex flex-col gap-2 px-3 py-3" aria-hidden>
      <span className="h-3 w-[72%] animate-pulse rounded bg-muted" />
      <span className="h-3 w-[54%] animate-pulse rounded bg-muted" style={{ animationDelay: "80ms" }} />
      <span className="h-3 w-[36%] animate-pulse rounded bg-muted" style={{ animationDelay: "160ms" }} />
    </div>
  );
}

function ChartSkeleton() {
  const bars = [42, 68, 50, 84, 58, 74];
  return (
    <div className="mx-3 mb-3 flex min-h-16 flex-1 items-end gap-2" aria-hidden>
      {bars.map((height, index) => (
        <span
          key={height}
          className="flex-1 animate-pulse rounded-t bg-muted"
          style={{ height: `${height}%`, animationDelay: `${index * 80}ms` }}
        />
      ))}
    </div>
  );
}

function BlockBody({ block, onChange, booting }) {
  if (block.type === "text") {
    if (booting) return <TextSkeleton />;
    return (
      <EditableText
        value={block.body}
        placeholder="Text"
        onChange={(body) => onChange({ body })}
        className="min-h-8 px-3 py-2 text-[15px] leading-relaxed text-foreground"
      />
    );
  }

  if (block.type === "sheet") {
    return <SheetBlockBody block={block} onChange={onChange} booting={booting} />;
  }

  if (block.type === "source") {
    return (
      <div className="flex items-start gap-2 px-3 py-3">
        <Database className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
        <div className="min-w-0 flex-1">
          <EditableText
            value={block.title}
            placeholder="Data source"
            onChange={(title) => onChange({ title })}
            className="text-[13px] font-semibold text-foreground"
          />
          <EditableText
            value={block.body}
            placeholder="Connect a source"
            onChange={(body) => onChange({ body })}
            className="mt-0.5 text-[12px] text-muted-foreground"
          />
        </div>
      </div>
    );
  }

  return <ChartBlockBody block={block} onChange={onChange} booting={booting} />;
}

function chartViewForBlock(block, canvas) {
  const source = block.sourceSheetId ? (canvas?.blocks || []).find((item) => item.id === block.sourceSheetId) : null;
  const sourceSession = source ? liveSession(canvas, source.id) : null;
  const sourceView = source?.type === "sheet" ? liveBlock(source, canvas) : null;
  const chartSheet =
    sourceView && sourceSession?.running && !isOrderBookSheet(sourceView) && !isPriceHistorySheet(sourceView) && !isPriceStreamSheet(sourceView)
      ? Array.isArray(sourceView.records) && sourceView.records.length > 80
        ? { ...sourceView, records: sourceView.records.slice(-80) }
        : sourceView.records?.length
          ? sourceView
          : { ...sourceView, cells: tailCells(sourceView.cells, 80), records: null }
      : sourceView;
  return { source, sourceSession, chartSheet };
}

function ChartCanvas({ block, onChange, booting, chartSheet, sourceSession }) {
  const canvas = useWorkspaceCanvas();
  const fitted = useRef(0);
  const fitLadder = useCallback(
    (height) => {
      const next = Math.round(Number(height) || 0);
      if (!next || fitted.current === next) return;
      fitted.current = next;
      if ((block.h || 0) >= next - 2) return;
      onChange({ h: next });
    },
    [block.h, onChange],
  );
  if (booting) return <ChartSkeleton />;
  if (!block.sourceSheetId) return <div className="min-h-16 flex-1 rounded-lg bg-muted/40" />;
  return (
    <SheetBlockChart
      sheet={chartSheet}
      live={!!sourceSession?.running}
      view={block.chartView || ""}
      vizCustom={Boolean(block.vizCustom)}
      onViewChange={(chartView) => onChange({ chartView, vizCustom: true })}
      onOpenRow={(row) => {
        if (block.sourceSheetId) canvas?.focusSheetRow?.(block.sourceSheetId, row);
      }}
      onFitHeight={block.chartView === "depth" ? undefined : fitLadder}
      snapshot={block.chart}
      onSnapshot={(chart) => {
        if (canvas?.readOnly) return;
        if (chartSnapshotKey(block.chart) === chartSnapshotKey(chart)) return;
        onChange({ chart });
      }}
    />
  );
}

function ChartBlockBody({ block, onChange, booting }) {
  const canvas = useWorkspaceCanvas();
  const { source, sourceSession, chartSheet } = chartViewForBlock(block, canvas);
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 px-3 py-2">
        <BarChart3 className="size-3.5 text-muted-foreground" aria-hidden />
        <EditableText
          value={block.title}
          placeholder="Chart"
          onChange={(title) => onChange({ title })}
          className="min-w-0 flex-1 text-[13px] font-semibold text-foreground"
        />
        {sourceSession?.running ? (
          <span
            className={cn(
              "shrink-0 text-[11px] font-medium text-emerald-600",
              canvas?.readOnly ? "pr-1" : "pr-[3.75rem]",
            )}
          >
            Live
          </span>
        ) : null}
      </div>
      <MarketLifeBar
        sheet={source}
        session={sourceSession}
        enabled={!!source && !!realtimeSheetForBlock(source, canvas?.blocks || [])}
      />
      <ChartCanvas
        block={block}
        onChange={onChange}
        booting={booting}
        chartSheet={chartSheet}
        sourceSession={sourceSession}
      />
    </div>
  );
}

function ChartFullscreen({ block, onChange, onClose, booting }) {
  const canvas = useWorkspaceCanvas();
  const { source, sourceSession, chartSheet } = chartViewForBlock(block, canvas);
  return (
    <FullscreenFrame
      icon={<BarChart3 className="size-4 text-muted-foreground" aria-hidden />}
      title={block.title || "Chart"}
      caption={source ? <SheetMarketCaption block={source} /> : <span className="min-w-0 flex-1" />}
      meta={sourceSession?.running ? <span className="text-[12px] font-medium text-emerald-600">Live</span> : null}
      bar={
        <MarketLifeBar
          sheet={source}
          session={sourceSession}
          enabled={!!source && !!realtimeSheetForBlock(source, canvas?.blocks || [])}
        />
      }
      onClose={onClose}
    >
      <ChartCanvas
        block={block}
        onChange={onChange}
        booting={booting}
        chartSheet={chartSheet}
        sourceSession={sourceSession}
      />
    </FullscreenFrame>
  );
}

function blockLabel(block) {
  return block.type === "text" ? block.body || "Text" : block.title || "Element";
}

function FullscreenFrame({ icon, title, caption, meta, bar, onClose, children }) {
  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  return createPortal(
    <div
      data-sheet-fullscreen=""
      className="fixed inset-0 z-[640] flex flex-col bg-background"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="flex items-center gap-3 border-b border-border/70 px-4 py-3">
        {icon}
        <span className="w-fit max-w-[40%] shrink-0 truncate text-[15px] font-semibold">{title}</span>
        {caption}
        {meta}
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onClose();
          }}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border/70 px-2.5 text-[13px] font-medium hover:bg-muted"
        >
          <X className="size-3.5" aria-hidden />
          Close
        </button>
      </div>
      {bar}
      <div className="flex min-h-0 flex-1 flex-col p-4">{children}</div>
    </div>,
    document.body,
  );
}

function SheetFullscreen({ block, onChange, onClose }) {
  const canvas = useWorkspaceCanvas();
  const view = liveBlock(block, canvas);
  const shownCount = shownRowCount(view);
  const label = useTradeSheetLabel(usesHistoricalTradeSheet(block) ? block.id : "", shownCount);
  const dataset = describeSheet(view);
  const visual = block.presentation === "visual" && hasVisualTable(dataset);
  const pulled = formatPulledAt(block.pulledAt);
  return (
    <FullscreenFrame
      icon={<Table2 className="size-4 text-muted-foreground" aria-hidden />}
      title={block.title || "Data sheet"}
      caption={<SheetMarketCaption block={block} />}
      meta={
        <span className="text-[12px] tabular-nums text-muted-foreground">
          {label}
          {pulled ? ` · Pulled ${pulled}` : ""}
        </span>
      }
      bar={
        <MarketLifeBar
          sheet={block}
          session={liveSession(canvas, block.id)}
          enabled={!!realtimeSheetForBlock(block, canvas?.blocks || [])}
        />
      }
      onClose={onClose}
    >
      {visual ? (
        <SheetPresentation sheet={view} dataset={dataset} hidden={block.visualHidden} readOnly />
      ) : (
        <DashboardSheetGrid block={view} onChange={onChange} />
      )}
    </FullscreenFrame>
  );
}

/** Feed charts that already showed the play tip, and feeds started once, this session. */
const feedTipsShown = new Set();
const feedsStarted = new Set();
const FEED_TIP_MS = 6000;

function RealtimeToggle({ block }) {
  const canvas = useWorkspaceCanvas();
  const match = realtimeSheetForBlock(block, canvas?.blocks || []);
  const session = match ? liveSession(canvas, match.sheet.id) : null;
  const running = !!session?.running;
  const feedChart = block.type === "chart" && block.chartView === "liveline" && !!match && isPriceStreamSheet(match.sheet);
  const feedId = feedChart ? match.sheet.id : "";
  const [tip, setTip] = useState(() => feedChart && !!block.arrive && !feedTipsShown.has(block.id));
  // The run card sits over the canvas, so the tip waits until it is dismissed.
  const runCard = Boolean(canvas?.runFeed);
  useEffect(() => {
    if (!tip || runCard) return undefined;
    feedTipsShown.add(block.id);
    const timer = window.setTimeout(() => setTip(false), FEED_TIP_MS);
    return () => window.clearTimeout(timer);
  }, [tip, runCard, block.id]);
  useEffect(() => {
    if (running && feedId) feedsStarted.add(feedId);
  }, [feedId, running]);
  if (!match || canvas?.readOnly || (sheetMarketClosed(match.sheet) && !running)) return null;
  const nudge = Boolean(feedId) && !running && !feedsStarted.has(feedId);
  const showTip = tip && !running && !runCard;
  const button = (
    <button
      type="button"
      data-realtime-toggle=""
      title={showTip ? undefined : running ? "Stop realtime" : session?.status || "Start realtime"}
      aria-label={running ? "Stop realtime" : feedId ? "Start feed" : "Start realtime"}
      aria-pressed={running}
      className={cn(
        "absolute right-8 top-1.5 z-10 inline-flex size-5 items-center justify-center rounded-sm bg-background/80 transition-opacity duration-200",
        running
          ? "text-emerald-600 opacity-100"
          : nudge || showTip
            ? "lychee-play-nudge text-[#0d99ff] opacity-100"
            : "pointer-events-none text-muted-foreground opacity-0 group-hover/block:pointer-events-auto group-hover/block:opacity-100 group-focus-within/block:pointer-events-auto group-focus-within/block:opacity-100",
      )}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        setTip(false);
        if (running) canvas?.stopSheetRealtime?.(match.sheet.id);
        else canvas?.startSheetRealtime?.(match.sheet.id);
      }}
    >
      {running ? <Square className="size-3" /> : <Play className="size-3" />}
    </button>
  );
  if (!feedId) return button;
  return (
    <TooltipProvider>
      <Tooltip open={showTip}>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="top" sideOffset={8} className="!z-[520] text-xs">
          Hit play to start your feed
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

const RESIZE_EDGES = [
  { edge: "n", edges: { top: true }, cursor: "ns-resize", className: "inset-x-3 top-0 h-2" },
  { edge: "s", edges: { bottom: true }, cursor: "ns-resize", className: "inset-x-3 bottom-0 h-2" },
  { edge: "e", edges: { right: true }, cursor: "ew-resize", className: "inset-y-3 right-0 w-2" },
  { edge: "w", edges: { left: true }, cursor: "ew-resize", className: "inset-y-3 left-0 w-2" },
  { edge: "nw", edges: { top: true, left: true }, cursor: "nwse-resize", className: "left-0 top-0 z-20 size-3" },
  { edge: "ne", edges: { top: true, right: true }, cursor: "nesw-resize", className: "right-0 top-0 z-20 size-3" },
  { edge: "sw", edges: { bottom: true, left: true }, cursor: "nesw-resize", className: "bottom-0 left-0 z-20 size-3" },
  { edge: "se", edges: { bottom: true, right: true }, cursor: "nwse-resize", className: "bottom-0 right-0 z-20 size-3" },
];

function CanvasBlock({ block, selected, spotlight = false, onSelect, onChange, booting = false, locked = false, exportTour = false, onExportTourDone }) {
  const canvas = useWorkspaceCanvas();
  const readOnly = !!canvas?.readOnly || locked;
  const dragRef = useRef(null);
  const rootRef = useRef(null);
  const blockRef = useRef(block);
  const onChangeRef = useRef(onChange);
  blockRef.current = block;
  onChangeRef.current = onChange;
  const [menuOpen, setMenuOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [resizing, setResizing] = useState(false);
  const arriveRef = useRef(!!block.arrive);
  const [dataReady, setDataReady] = useState(!block.arrive);
  useEffect(() => {
    if (dataReady) return undefined;
    const timer = window.setTimeout(() => setDataReady(true), 280);
    return () => window.clearTimeout(timer);
  }, [dataReady]);
  const sheetDataset = block.type === "sheet" ? describeSheet(block) : null;
  const createLabel =
    sheetDataset &&
    resolveVisualization(sheetDataset, {
      columnIds: (block.columns || []).map((column) => columnKey(column)).filter(Boolean),
    }).view === "stat-cards"
      ? "Create stats card"
      : "Create chart";
  const logLabel = visualPresentationLabel(sheetDataset);
  const logWidth = sheetDataset?.datasetType === "trader_activity" || sheetDataset?.datasetType === "markets" || sheetDataset?.datasetType === "events" || sheetDataset?.datasetType === "series"
    ? RICH_TABLE_WIDTH
    : VISUAL_TABLE_WIDTH;
  const bodyRef = useRef(null);
  const richTable = block.type === "sheet" && block.presentation === "visual" && hasVisualTable(sheetDataset);
  const exportFormats =
    block.type === "sheet" ? (richTable ? IMAGE_EXPORT_FORMATS : SHEET_EXPORT_FORMATS) : block.type === "chart" ? IMAGE_EXPORT_FORMATS : null;
  const runExport = async (format) => {
    try {
      if (block.type === "sheet" && !richTable) {
        await exportSheet(liveBlock(block, canvas), format);
        return;
      }
      await exportNodeImage(bodyRef.current, format, block.title || (block.type === "chart" ? "chart" : "table"), {
        background: rootRef.current ? getComputedStyle(rootRef.current).backgroundColor : undefined,
      });
    } catch {
      toast.error("That export didn't work. Try again.");
    }
  };

  const landingDemo = !!useMyStateV2()?.landingDemo;
  const [exportLocked, setExportLocked] = useState(false);
  const touring = exportTour && !!exportFormats && !readOnly;
  const [exportItem, setExportItem] = useState(null);
  const exportItemRef = useMemo(() => ({ current: exportItem }), [exportItem]);
  const [exportTipReady, setExportTipReady] = useState(false);
  useEffect(() => {
    setMenuOpen(touring);
  }, [touring]);
  useEffect(() => {
    if (!touring || !menuOpen || !exportItem) {
      setExportTipReady(false);
      return undefined;
    }
    // Let the menu finish its open animation so the tip lines up with the settled item.
    const timer = window.setTimeout(() => setExportTipReady(true), 220);
    return () => window.clearTimeout(timer);
  }, [touring, menuOpen, exportItem]);
  const endExportTour = () => {
    setMenuOpen(false);
    onExportTourDone?.();
  };

  useLayoutEffect(() => {
    const live = dragRef.current?.live;
    if (live) paintSnap(live);
  });

  useEffect(() => {
    if (canvas?.renameId !== block.id) return;
    const el = rootRef.current?.querySelector("[data-editable]");
    if (el instanceof HTMLElement) {
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
    canvas?.setRenameId?.(null);
  }, [block.id, canvas?.renameId, canvas?.setRenameId]);

  const paintSnap = (snapped) => {
    const el = rootRef.current;
    if (!el || !snapped) return;
    el.style.transition = "none";
    el.style.left = `${snapped.x}px`;
    el.style.top = `${snapped.y}px`;
    el.style.width = `${snapped.w}px`;
    el.style.height = `${snapped.h}px`;
  };

  const endGesture = (commit) => {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    window.removeEventListener("pointermove", drag.onMove);
    window.removeEventListener("pointerup", drag.onEnd);
    window.removeEventListener("pointercancel", drag.onEnd);
    window.removeEventListener("blur", drag.onEnd);
    canvas?.setHandDown?.(false);
    setLayoutGuide(false);
    if (commit && drag.moved && drag.snapped) {
      paintSnap(drag.snapped);
      onChangeRef.current(drag.snapped);
      notifyBlockGesture(drag.mode);
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setResizing(false));
      });
      return;
    }
    setResizing(false);
    if (drag.moved) {
      const current = blockRef.current;
      paintSnap({ x: current.x, y: current.y, w: current.w, h: current.h });
    }
  };

  const resizeLive = (drag, dx, dy) => {
    const edges = drag.edges || {};
    let x = drag.origX;
    let y = drag.origY;
    let w = drag.origW;
    let h = drag.origH;
    if (edges.right) w = drag.origW + dx;
    if (edges.left) {
      x = drag.origX + dx;
      w = drag.origW - dx;
    }
    if (edges.bottom) h = drag.origH + dy;
    if (edges.top) {
      y = drag.origY + dy;
      h = drag.origH - dy;
    }
    if (w < 32) {
      if (edges.left) x = drag.origX + drag.origW - 32;
      w = 32;
    }
    if (h < 32) {
      if (edges.top) y = drag.origY + drag.origH - 32;
      h = 32;
    }
    return { x, y: Math.max(0, y), w, h };
  };

  const beginGesture = (event, mode, edges) => {
    if (dragRef.current) endGesture(true);
    const pointerId = event.pointerId;
    const origin = blockRef.current;
    const drag = {
      mode,
      pointerId,
      x: event.clientX,
      y: event.clientY,
      origX: origin.x,
      origY: origin.y,
      origW: origin.w,
      origH: origin.h,
      moved: false,
      snapped: null,
      edges: edges || null,
      fromText: mode === "move" && event.target instanceof Element && !!event.target.closest("[data-editable]"),
      onMove: null,
      onEnd: null,
    };
    drag.onMove = (moveEvent) => {
      const active = dragRef.current;
      if (!active || moveEvent.pointerId !== active.pointerId) return;
      const dx = moveEvent.clientX - active.x;
      const dy = moveEvent.clientY - active.y;
      if (!active.moved && Math.hypot(dx, dy) < 4) return;
      if (!active.moved) {
        active.moved = true;
        setResizing(true);
        setLayoutGuide(true, null);
        if (active.fromText) {
          const focused = document.activeElement;
          if (focused instanceof HTMLElement) focused.blur();
        }
      }
      const current = blockRef.current;
      const others = canvas?.blocks || [];
      let live;
      let snapped;
      if (active.mode === "resize") {
        live = resizeLive(active, dx, dy);
        snapped = snapResizeEdges(
          { id: current.id, x: active.origX, y: active.origY, w: active.origW, h: active.origH },
          live,
          active.edges,
          others,
        );
      } else {
        live = { x: active.origX + dx, y: Math.max(0, active.origY + dy), w: active.origW, h: active.origH };
        snapped = snapMove({ ...current, id: current.id, x: live.x, y: live.y, w: live.w, h: live.h }, others);
      }
      active.live = live;
      active.snapped = snapped;
      paintSnap(live);
      const key = `${snapped.x}|${snapped.y}|${snapped.w}|${snapped.h}`;
      if (key !== active.previewKey) {
        active.previewKey = key;
        setLayoutGuide(true, snapped);
      }
    };
    drag.onEnd = (endEvent) => {
      if (endEvent?.pointerId != null && endEvent.pointerId !== pointerId) return;
      endGesture(true);
    };
    dragRef.current = drag;
    canvas?.setHandDown?.(true);
    window.addEventListener("pointermove", drag.onMove);
    window.addEventListener("pointerup", drag.onEnd);
    window.addEventListener("pointercancel", drag.onEnd);
    window.addEventListener("blur", drag.onEnd);
    onSelect(block.id);
  };

  useEffect(() => () => {
    const drag = dragRef.current;
    if (!drag) return;
    window.removeEventListener("pointermove", drag.onMove);
    window.removeEventListener("pointerup", drag.onEnd);
    window.removeEventListener("pointercancel", drag.onEnd);
    window.removeEventListener("blur", drag.onEnd);
    dragRef.current = null;
    setLayoutGuide(false);
  }, []);

  const onPointerDown = (e) => {
    if (readOnly || e.button !== 0) return;
    const hand = canvas?.tool === "hand";
    if (
      e.target instanceof Element &&
      e.target.closest(
        hand
          ? "[data-sheet-fullscreen],[data-resize],[data-block-menu],[data-realtime-toggle],[role='menu'],[role='menuitem']"
          : "[data-sheet-fullscreen],[data-sheet-grid],[data-visual-table],[data-sheet-chart],[data-resize],[data-block-menu],[data-realtime-toggle],[role='menu'],[role='menuitem'],.gdg-style,.gdg-unstyle,textarea,input",
      )
    ) {
      return;
    }
    if (!hand) {
      onSelect(block.id);
      return;
    }
    e.preventDefault();
    beginGesture(e, "move");
  };

  const onResizeDown = (edge) => (e) => {
    if (canvas?.tool !== "hand" || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    beginGesture(e, "resize", edge);
  };

  return (
    <div
      ref={rootRef}
      role="group"
      data-block-id={block.id}
      aria-label={block.title || block.body || block.type}
      aria-hidden={locked || undefined}
      inert={locked ? "" : undefined}
      onPointerDown={readOnly ? undefined : onPointerDown}
      className={cn(
        "absolute flex flex-col overflow-hidden rounded-xl border bg-background shadow-sm",
        locked ? "pointer-events-none select-none blur-[6px] saturate-[0.85]" : "pointer-events-auto",
        block.arrive && (block.branch ? "lychee-sheet-branch" : "lychee-sheet-arrive"),
        readOnly ? "border-border/70" : "group/block",
        !readOnly && spotlight
          ? "border-emerald-500 ring-2 ring-emerald-400/80"
          : !readOnly && selected
            ? "border-[#0d99ff] ring-2 ring-[#0d99ff]/25"
            : !readOnly && "border-border/70 hover:border-[#0d99ff]",
      )}
      style={{
        left: block.x,
        top: block.y,
        width: block.w,
        height: block.h,
        cursor: canvas?.tool === "hand" && !readOnly ? "grab" : undefined,
        transition: resizing ? "none" : "left 480ms cubic-bezier(0.22, 1, 0.36, 1), top 480ms cubic-bezier(0.22, 1, 0.36, 1), width 480ms cubic-bezier(0.22, 1, 0.36, 1), height 480ms cubic-bezier(0.22, 1, 0.36, 1)",
      }}
    >
      {readOnly ? null : <RealtimeToggle block={block} />}
      {readOnly ? null : (
      <DropdownMenu
        open={menuOpen}
        modal={!touring}
        onOpenChange={(open) => {
          setMenuOpen(open);
          if (!open && touring) onExportTourDone?.();
        }}
      >
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            data-block-menu=""
            aria-label={`Actions for ${blockLabel(block)}`}
            className={cn(
              "absolute right-1.5 top-1.5 z-10 inline-flex size-5 translate-x-1 items-center justify-center rounded-sm bg-background/80 text-muted-foreground opacity-0 transition-[opacity,transform] duration-200 ease-out hover:bg-muted hover:text-foreground",
              "pointer-events-none group-hover/block:pointer-events-auto group-hover/block:translate-x-0 group-hover/block:opacity-100 group-focus-within/block:pointer-events-auto group-focus-within/block:translate-x-0 group-focus-within/block:opacity-100 data-[state=open]:pointer-events-auto data-[state=open]:translate-x-0 data-[state=open]:opacity-100",
            )}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onSelect(block.id);
            }}
          >
            <MoreVertical className="size-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={6}
          className="z-[520] w-48 rounded-xl p-1 shadow-lg"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
          onInteractOutside={touring ? (event) => event.preventDefault() : undefined}
        >
          {block.type === "sheet" || block.type === "chart" ? (
            <DropdownMenuItem
              className="gap-2.5 rounded-md px-2 py-2 text-[13px]"
              onSelect={() => setFullscreen(true)}
            >
              <Maximize2 className="size-4 text-muted-foreground" />
              Full screen
            </DropdownMenuItem>
          ) : null}
          {block.type === "sheet" ? (
            <>
              <DropdownMenuItem
                className="gap-2.5 rounded-md px-2 py-2 text-[13px]"
                onSelect={() => canvas?.createChartFromBlock?.(block.id)}
              >
                <BarChart3 className="size-4 text-muted-foreground" />
                {createLabel}
              </DropdownMenuItem>
              {hasVisualTable(sheetDataset) ? (
                block.visualReady ? (
                  <div
                    className="flex items-center gap-2.5 rounded-md px-2 py-2 text-[13px]"
                    onPointerDown={(event) => event.stopPropagation()}
                  >
                    <Switch
                      size="sm"
                      checked={block.presentation === "visual"}
                      aria-label={logLabel}
                      onCheckedChange={(on) => {
                        if (on) {
                          onChange({
                            presentation: "visual",
                            visualReady: true,
                            sheetW: block.sheetW || block.w,
                            w: widthForSpan(spanOf({ w: logWidth })),
                          });
                          return;
                        }
                        onChange({
                          presentation: "sheet",
                          w: widthForSpan(spanOf({ w: block.sheetW || block.w })),
                        });
                      }}
                      onClick={(event) => event.stopPropagation()}
                    />
                    <span>{logLabel}</span>
                  </div>
                ) : (
                  <DropdownMenuItem
                    className="gap-2.5 rounded-md px-2 py-2 text-[13px]"
                    onSelect={() =>
                      onChange({
                        presentation: "visual",
                        visualReady: true,
                        sheetW: block.w,
                        w: widthForSpan(spanOf({ w: logWidth })),
                      })
                    }
                  >
                    <Table2 className="size-4 text-muted-foreground" />
                    {logLabel}
                  </DropdownMenuItem>
                )
              ) : null}
              <DropdownMenuSeparator />
            </>
          ) : block.type === "chart" ? (
            <DropdownMenuSeparator />
          ) : null}
          {exportFormats && landingDemo ? (
            <DropdownMenuItem
              ref={touring ? setExportItem : undefined}
              className={cn(
                "gap-2.5 rounded-md px-2 py-2 text-[13px]",
                touring && "bg-[#0d99ff]/10 text-[#0b6fc2] ring-1 ring-[#0d99ff]/40 dark:text-[#5cb8ff]",
              )}
              onSelect={() => setExportLocked(true)}
            >
              <Download className={cn("size-4 text-muted-foreground", touring && "text-[#0d99ff]")} />
              Export
            </DropdownMenuItem>
          ) : exportFormats ? (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger
                ref={touring ? setExportItem : undefined}
                className={cn(
                  "gap-2.5 rounded-md px-2 py-2 text-[13px] focus:bg-accent data-[state=open]:bg-accent dark:focus:bg-accent dark:data-[state=open]:bg-accent [&>svg:last-child]:size-3.5 [&>svg:last-child]:text-muted-foreground",
                  touring && "bg-[#0d99ff]/10 text-[#0b6fc2] ring-1 ring-[#0d99ff]/40 dark:text-[#5cb8ff]",
                )}
              >
                <Download className={cn("size-4 text-muted-foreground", touring && "text-[#0d99ff]")} />
                Export
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent
                  sideOffset={6}
                  className="z-[521] w-40 rounded-xl p-1 shadow-lg"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => event.stopPropagation()}
                >
                  {exportFormats.map((format) => (
                    <DropdownMenuItem
                      key={format.id}
                      className="rounded-md px-2 py-2 text-[13px]"
                      onSelect={() => void runExport(format.id)}
                    >
                      {format.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          ) : null}
          <DropdownMenuItem
            className="gap-2.5 rounded-md px-2 py-2 text-[13px]"
            onSelect={() => canvas?.duplicateBlock?.(block.id)}
          >
            <Copy className="size-4 text-muted-foreground" />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem
            className="gap-2.5 rounded-md px-2 py-2 text-[13px]"
            onSelect={() => {
              onSelect(block.id);
              canvas?.setRenameId?.(block.id);
            }}
          >
            <Pencil className="size-4 text-muted-foreground" />
            Rename
          </DropdownMenuItem>
          <DestructiveConfirmMenuItem onConfirm={() => canvas?.removeBlock?.(block.id)} />
        </DropdownMenuContent>
      </DropdownMenu>
      )}
      {touring && exportItem ? <ExportFeatureTip anchorRef={exportItemRef} open={exportTipReady} onDone={endExportTour} /> : null}
      {landingDemo ? <LandingDemoMembersOnlyPortal open={exportLocked} feature="Exporting" onClose={() => setExportLocked(false)} /> : null}
      {fullscreen && block.type === "sheet" && !readOnly ? (
        <SheetFullscreen block={block} onChange={onChange} onClose={() => setFullscreen(false)} />
      ) : fullscreen && block.type === "chart" && !readOnly ? (
        <ChartFullscreen block={block} onChange={onChange} onClose={() => setFullscreen(false)} booting={booting} />
      ) : (
        <div ref={bodyRef} className={cn("flex min-h-0 min-w-0 flex-1 flex-col", arriveRef.current && dataReady && "lychee-sheet-fill")}>
          <BlockBody block={block} onChange={onChange} booting={booting || !dataReady} />
        </div>
      )}
      {block.pulse ? <span key={block.pulse} aria-hidden className="lychee-sheet-pulse pointer-events-none absolute inset-0 z-20 rounded-xl" /> : null}
      {readOnly || canvas?.tool !== "hand" ? null : (
        <>
          {RESIZE_EDGES.map((handle) => (
            <div
              key={handle.edge}
              data-resize=""
              aria-hidden="true"
              onPointerDown={onResizeDown(handle.edges)}
              className={cn("absolute z-10", handle.className)}
              style={{ cursor: handle.cursor }}
            />
          ))}
        </>
      )}
    </div>
  );
}

/** Finished moves and resizes ("move" | "resize"), for tips that wait on the user doing one. */
const blockGestureListeners = new Set();

function notifyBlockGesture(mode) {
  blockGestureListeners.forEach((listener) => listener(mode));
}

function subscribeBlockGesture(listener) {
  blockGestureListeners.add(listener);
  return () => blockGestureListeners.delete(listener);
}

function blocksTopToBottom(blocks) {
  return (blocks || []).slice().sort((a, b) => (a.y || 0) - (b.y || 0) || (a.x || 0) - (b.x || 0));
}

const DEMO_OPEN_SHEETS = 3;

/** Landing demo: the first sheets stay open with their charts; everything else is behind the upgrade. */
function demoLockedIds(blocks) {
  const ordered = blocksTopToBottom(blocks);
  const open = new Set(ordered.filter((block) => block.type === "sheet").slice(0, DEMO_OPEN_SHEETS).map((block) => block.id));
  if (!open.size) return new Set();
  return new Set(
    ordered.filter((block) => !open.has(block.id) && !(block.type === "chart" && open.has(block.sourceSheetId))).map((block) => block.id),
  );
}

/** Where the paywall starts: under the last open block, so the card never covers what the demo shows. */
function paywallTop(blocks, lockedIds) {
  const bottom = (block) => (block.y || 0) + (block.h || 0);
  const locked = blocks.filter((block) => lockedIds.has(block.id));
  const open = blocks.filter((block) => !lockedIds.has(block.id));
  const firstLocked = Math.min(...locked.map((block) => block.y || 0));
  const openBottom = open.length ? Math.max(...open.map(bottom)) + 16 : 0;
  const lastLocked = Math.max(...locked.map(bottom));
  return Math.max(0, Math.min(Math.max(firstLocked - 8, openBottom), lastLocked - 260));
}

function lockedSummary(blocks) {
  const sheets = blocks.filter((block) => block.type === "sheet").length;
  const charts = blocks.filter((block) => block.type === "chart").length;
  const parts = [];
  if (sheets) parts.push(`${sheets} more ${sheets === 1 ? "sheet" : "sheets"}`);
  if (charts) parts.push(`${charts}${sheets ? "" : " more"} ${charts === 1 ? "chart" : "charts"}`);
  if (!parts.length) return "More of your dashboard is waiting.";
  return `${parts.join(" and ")} ${sheets + charts === 1 ? "is" : "are"} waiting.`;
}

function DemoPaywall({ top, locked }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 px-6" style={{ top }}>
      <div className="sticky top-24 mx-auto mt-16 w-full max-w-[420px]">
        <div
          role="dialog"
          aria-labelledby="demo-paywall-title"
          className="pointer-events-auto rounded-xl border border-border/70 bg-background p-6 text-center shadow-lg"
        >
          <span className="mx-auto grid size-10 place-items-center rounded-full bg-[#e5f4ff] text-[#0d99ff] dark:bg-[#1f3347]">
            <Lock className="size-4" strokeWidth={2.25} aria-hidden />
          </span>
          <h2 id="demo-paywall-title" className="mt-3 text-[15px] font-semibold text-foreground">
            Unlock your full dashboard
          </h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
            {lockedSummary(locked)} Continue your work by upgrading.
          </p>
          <button
            type="button"
            onClick={() => exitLandingDemoToSection("pricing")}
            className="mt-5 inline-flex h-9 w-full items-center justify-center rounded-lg bg-[#0d99ff] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[#0b87e0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d99ff]/40"
          >
            Upgrade
          </button>
        </div>
      </div>
    </div>
  );
}

/** Freeform blocks for the dashboard currently on screen. */
export function WorkspaceCanvas() {
  const canvas = useWorkspaceCanvas();
  const ctx = useMyStateV2();
  const blocks = canvas?.blocks || [];
  const lockedIds = useMemo(
    () => (ctx?.landingDemo && !canvas?.runFeed ? demoLockedIds(blocks) : new Set()),
    [blocks, canvas?.runFeed, ctx?.landingDemo],
  );
  const lockedBlocks = blocks.filter((block) => lockedIds.has(block.id));
  const scrollerRef = useRef(null);
  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;

  const firstPullTip = useFeatureTipDismissal(FIRST_PULL_TIP_ID);
  const exportTip = useFeatureTipDismissal(EXPORT_TIP_ID);
  const dismissExportTip = exportTip.dismiss;
  const [exportTourId, setExportTourId] = useState("");
  const tipBlockId = useMemo(
    () =>
      blocksTopToBottom(blocks).find((block) => (block.type === "sheet" || block.type === "chart") && !lockedIds.has(block.id))?.id ||
      "",
    [blocks, lockedIds],
  );
  const exportTourDue =
    !!tipBlockId &&
    !!canvas?.ready &&
    !canvas?.runFeed &&
    !canvas?.readOnly &&
    firstPullTip.dismissed === true &&
    exportTip.dismissed === false;

  useEffect(() => {
    if (!exportTourDue) {
      setExportTourId("");
      return undefined;
    }
    if (exportTourId) return undefined;
    const timers = [];
    // After the run card closes: let the dashboard settle, scroll up to the block, then open its menu.
    timers.push(
      window.setTimeout(() => {
        const scroller = scrollerRef.current;
        const el = scroller?.querySelector(`[data-block-id="${CSS.escape(tipBlockId)}"]`);
        if (scroller && el instanceof HTMLElement) {
          const top = scroller.scrollTop + el.getBoundingClientRect().top - scroller.getBoundingClientRect().top - 24;
          scroller.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
        }
        timers.push(window.setTimeout(() => setExportTourId(tipBlockId), 650));
      }, 900),
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [exportTourDue, exportTourId, tipBlockId]);

  const endExportTour = useCallback(() => {
    dismissExportTip();
    setExportTourId("");
  }, [dismissExportTip]);

  const handTip = useFeatureTipDismissal(HAND_TIP_ID);
  const resizeTip = useFeatureTipDismissal(RESIZE_TIP_ID);
  const moveTip = useFeatureTipDismissal(MOVE_TIP_ID);
  const dismissResizeTip = resizeTip.dismiss;
  const dismissMoveTip = moveTip.dismiss;
  const editTipsOn =
    !!tipBlockId && !!canvas?.ready && !canvas?.runFeed && !canvas?.readOnly && canvas?.tool === "hand" && handTip.dismissed === true;
  const editTip = !editTipsOn
    ? null
    : resizeTip.dismissed === false
      ? "resize"
      : resizeTip.dismissed === true && moveTip.dismissed === false
        ? "move"
        : null;
  const tipBlock = editTip ? blocks.find((block) => block.id === tipBlockId) : null;

  useEffect(() => {
    if (!editTip) return undefined;
    // After any reflow settles (blocks glide for 480ms), bring the block's top into view if it's off screen.
    const timer = window.setTimeout(() => {
      const scroller = scrollerRef.current;
      const el = scroller?.querySelector(`[data-block-id="${CSS.escape(tipBlockId)}"]`);
      if (!scroller || !(el instanceof HTMLElement)) return;
      const view = scroller.getBoundingClientRect();
      const rect = el.getBoundingClientRect();
      if (rect.top >= view.top && rect.top + 120 <= view.bottom) return;
      scroller.scrollTo({ top: Math.max(0, scroller.scrollTop + rect.top - view.top - 24), behavior: "smooth" });
    }, 520);
    return () => window.clearTimeout(timer);
  }, [editTip, tipBlockId]);

  useEffect(() => {
    if (!editTip) return undefined;
    return subscribeBlockGesture((mode) => {
      if (editTip === "resize" && mode === "resize") dismissResizeTip();
      if (editTip === "move" && mode === "move") dismissMoveTip();
    });
  }, [editTip, dismissResizeTip, dismissMoveTip]);

  const editTipAnchorRef = useMemo(() => {
    const element = () => scrollerRef.current?.querySelector(`[data-block-id="${CSS.escape(tipBlockId)}"]`) || null;
    return {
      current: {
        get contextElement() {
          return element() || undefined;
        },
        getBoundingClientRect() {
          const rect = element()?.getBoundingClientRect();
          if (!rect) return new DOMRect();
          if (editTip === "move") return new DOMRect(rect.left, rect.top, rect.width, Math.min(44, rect.height));
          // The right edge, trimmed to what's on screen so the tip points at a visible spot.
          const top = Math.max(rect.top, 0);
          const bottom = Math.min(rect.bottom, window.innerHeight);
          return bottom > top ? new DOMRect(rect.right - 1, top, 2, bottom - top) : new DOMRect(rect.right - 1, rect.top, 2, rect.height);
        },
      },
    };
  }, [editTip, tipBlockId]);

  const [bootingIds, setBootingIds] = useState(() => new Set());
  const [layoutGuide, setGuideVisible] = useState(false);
  const [snapPreview, setSnapPreview] = useState(null);
  const [gridMetrics, setGridMetrics] = useState(() => canvasGridMetrics());
  const skipNearestScrollRef = useRef(false);

  useEffect(() => subscribeLayoutGuide((state) => {
    setGuideVisible(!!state?.active);
    if (state?.preview) setSnapPreview(state.preview);
  }), []);

  useEffect(() => {
    if (canvas?.tool === "hand") return undefined;
    canvas?.setHandDown?.(false);
    return undefined;
  }, [canvas?.setHandDown, canvas?.tool]);

  useEffect(() => {
    if (canvas?.tool !== "hand") return undefined;
    const setDown = canvas.setHandDown;
    const down = (event) => {
      if (event.button !== 0) return;
      if (event.target instanceof Element && event.target.closest("[role='toolbar']")) return;
      setDown?.(true);
    };
    const up = () => setDown?.(false);
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [canvas?.setHandDown, canvas?.tool]);

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return undefined;
    const apply = () => {
      const width = Math.floor(scroller.clientWidth);
      if (!Number.isFinite(width) || width < 320) return;
      setCanvasGridWidth(width);
      setGridMetrics((prev) => {
        const next = canvasGridMetrics();
        if (prev.width === next.width && prev.unit === next.unit && prev.track === next.track && prev.inner === next.inner) return prev;
        return next;
      });
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(scroller);
    return () => observer.disconnect();
  }, [canvas?.ready, blocks.length]);

  const hasBlocks = blocks.length > 0;
  const bootedPageRef = useRef("");
  const markTabSettled = canvas?.markTabSettled;
  useLayoutEffect(() => {
    const pageId = canvas?.pageId || "";
    if (!canvas?.ready || !hasBlocks || bootedPageRef.current === pageId) return undefined;
    bootedPageRef.current = pageId;
    const scroller = scrollerRef.current;
    const top = scroller?.scrollTop || 0;
    const bottom = top + (scroller?.clientHeight || window.innerHeight) + 160;
    const ordered = blocksTopToBottom(blocksRef.current);
    const inView = (block) => (block.y || 0) < bottom && (block.y || 0) + (block.h || 0) > top;
    const visible = ordered.filter(inView).map((block) => block.id);
    const below = ordered.filter((block) => !inView(block)).map((block) => block.id);
    setBootingIds(new Set([...visible, ...below]));
    const release = (ids) =>
      setBootingIds((current) => {
        if (!ids.some((id) => current.has(id))) return current;
        const next = new Set(current);
        for (const id of ids) next.delete(id);
        return next;
      });
    let stopped = false;
    let cancelIdle = null;
    const timers = visible.map((id, index) => window.setTimeout(() => release([id]), 60 + index * 90));
    const drainBelow = () => {
      if (stopped) return;
      const id = below.shift();
      if (!id) return;
      release([id]);
      cancelIdle = whenIdle(drainBelow, 800);
    };
    timers.push(
      window.setTimeout(() => {
        markTabSettled?.(pageId);
        cancelIdle = whenIdle(drainBelow, 800);
      }, 60 + visible.length * 90 + 120),
    );
    const onScroll = () => {
      const view = scrollerRef.current;
      if (!view) return;
      const from = view.scrollTop - 160;
      const to = view.scrollTop + view.clientHeight + 320;
      const near = blocksRef.current
        .filter((block) => (block.y || 0) < to && (block.y || 0) + (block.h || 0) > from)
        .map((block) => block.id);
      release(near);
    };
    scroller?.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      stopped = true;
      for (const timer of timers) window.clearTimeout(timer);
      cancelIdle?.();
      scroller?.removeEventListener("scroll", onScroll);
      bootedPageRef.current = "";
      setBootingIds(new Set());
    };
  }, [canvas?.ready, canvas?.pageId, hasBlocks, markTabSettled]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") canvas?.setSelectedId?.(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canvas]);

  useEffect(() => {
    const id = canvas?.spotlightId;
    const scroller = scrollerRef.current;
    if (!canvas?.revealNonce || !id || !scroller) return;
    skipNearestScrollRef.current = true;
    const scrollToBlock = () => {
      const el = scroller.querySelector(`[data-block-id="${CSS.escape(id)}"]`);
      if (!(el instanceof HTMLElement)) return false;
      const top = scroller.scrollTop + el.getBoundingClientRect().top - scroller.getBoundingClientRect().top - 24;
      scroller.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
      return true;
    };
    if (scrollToBlock()) return undefined;
    const frame = window.requestAnimationFrame(() => {
      scrollToBlock();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [canvas?.revealNonce, canvas?.spotlightId, canvas?.pageId]);

  useEffect(() => {
    const id = canvas?.selectedId;
    const scroller = scrollerRef.current;
    if (skipNearestScrollRef.current) {
      skipNearestScrollRef.current = false;
      return;
    }
    if (!id || !scroller) return;
    const el = scroller.querySelector(`[data-block-id="${CSS.escape(id)}"]`);
    if (el instanceof HTMLElement) el.scrollIntoView({ block: "nearest" });
  }, [canvas?.selectedId]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return undefined;
    const onWheel = (event) => {
      const visual = event.target instanceof Element ? event.target.closest("[data-visual-scroll]") : null;
      if (visual instanceof HTMLElement) {
        const vertical = Math.abs(event.deltaY) >= Math.abs(event.deltaX);
        const maxTop = visual.scrollHeight - visual.clientHeight;
        const maxLeft = visual.scrollWidth - visual.clientWidth;
        const canY =
          vertical &&
          ((event.deltaY > 0 && visual.scrollTop < maxTop - 1) || (event.deltaY < 0 && visual.scrollTop > 0));
        const canX =
          !vertical &&
          ((event.deltaX > 0 && visual.scrollLeft < maxLeft - 1) || (event.deltaX < 0 && visual.scrollLeft > 0));
        if (canY || canX) {
          event.preventDefault();
          event.stopPropagation();
          if (canY) visual.scrollTop += event.deltaY;
          else visual.scrollLeft += event.deltaX;
          return;
        }
      }
      const grid = event.target instanceof Element ? event.target.closest("[data-sheet-grid]") : null;
      if (grid) {
        const inner = grid.querySelector(".dvn-scroller");
        if (inner instanceof HTMLElement) {
          const vertical = Math.abs(event.deltaY) >= Math.abs(event.deltaX);
          const maxTop = inner.scrollHeight - inner.clientHeight;
          const maxLeft = inner.scrollWidth - inner.clientWidth;
          const canY =
            vertical &&
            ((event.deltaY > 0 && inner.scrollTop < maxTop - 1) || (event.deltaY < 0 && inner.scrollTop > 0));
          const canX =
            !vertical &&
            ((event.deltaX > 0 && inner.scrollLeft < maxLeft - 1) || (event.deltaX < 0 && inner.scrollLeft > 0));
          if (canY || canX) {
            event.preventDefault();
            event.stopPropagation();
            if (canY) inner.scrollTop += event.deltaY;
            else inner.scrollLeft += event.deltaX;
            return;
          }
        }
      }
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      if (scroller.scrollHeight <= scroller.clientHeight + 1) return;
      event.preventDefault();
      event.stopPropagation();
      scroller.scrollTop += event.deltaY;
    };
    scroller.addEventListener("wheel", onWheel, { passive: false, capture: true });
    return () => scroller.removeEventListener("wheel", onWheel, { capture: true });
  }, [blocks.length]);

  if (!canvas?.ready) {
    return (
      <div className="pointer-events-none absolute inset-x-0 bottom-0 top-[var(--dashboard-tab-clearance,0px)] z-20 flex items-center justify-center">
        <SpectrumLoadingState label="Loading dashboard" />
      </div>
    );
  }

  const progress = canvas.runFeed ? (
    <RunProgressCard feed={canvas.runFeed} onDismiss={canvas.dismissRun} onReplay={canvas.replayReady ? canvas.replayRun : undefined} />
  ) : null;

  if (!blocks.length && canvas.tabLoading) {
    return (
      <div className="pointer-events-none absolute inset-x-0 bottom-0 top-[var(--dashboard-tab-clearance,0px)] z-20 flex items-center justify-center">
        <SpectrumLoadingState label="Loading dashboard" />
      </div>
    );
  }

  if (!blocks.length) return progress;

  return (
    <>
    <div
      ref={scrollerRef}
      className="pointer-events-auto absolute inset-0 z-20 overflow-auto"
      style={canvas?.tool === "hand" ? { cursor: canvas.handDown ? "grabbing" : "grab" } : undefined}
    >
      <div
        className="relative min-h-full min-w-full"
        style={{
          height: blocks.reduce((max, block) => Math.max(max, (block.y || 0) + (block.h || 0) + 120), 0),
          width: Math.max(
            gridMetrics.width,
            blocks.reduce((max, block) => Math.max(max, (block.x || 0) + (block.w || 0) + 32), 0),
          ),
        }}
      >
      <div
        aria-hidden="true"
        data-layout-guide=""
        className={cn(
          "pointer-events-none absolute inset-0 z-0 transition-opacity duration-300 ease-out",
          layoutGuide ? "opacity-100" : "opacity-0",
        )}
      >
        <div
          className="absolute inset-0 dark:hidden"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(23, 23, 23, 0.28) 1px, transparent 1.2px)",
            backgroundSize: `${gridMetrics.unit}px ${gridMetrics.unit}px`,
            backgroundPosition: `${gridMetrics.x0}px ${gridMetrics.originY}px`,
          }}
        />
        <div
          className="absolute inset-0 hidden dark:block"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255, 255, 255, 0.3) 1px, transparent 1.2px)",
            backgroundSize: `${gridMetrics.unit}px ${gridMetrics.unit}px`,
            backgroundPosition: `${gridMetrics.x0}px ${gridMetrics.originY}px`,
          }}
        />
      </div>
      {blocks.map((block) => (
        <CanvasBlock
          key={block.id}
          block={block}
          booting={bootingIds.has(block.id)}
          locked={lockedIds.has(block.id)}
          exportTour={exportTourId === block.id}
          onExportTourDone={endExportTour}
          selected={canvas.selectedId === block.id}
          spotlight={canvas.spotlightId === block.id}
          onSelect={canvas.setSelectedId}
          onChange={(patch) => canvas.updateBlock(block.id, patch)}
        />
      ))}
      {lockedBlocks.length ? <DemoPaywall top={paywallTop(blocks, lockedIds)} locked={lockedBlocks} /> : null}
      {editTip === "resize" && tipBlock ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute z-30 w-1 rounded-full bg-[#0d99ff] motion-safe:animate-pulse"
          style={{ left: tipBlock.x + tipBlock.w - 2, top: tipBlock.y + 16, height: Math.max(24, tipBlock.h - 32) }}
        />
      ) : null}
      {editTip === "move" && tipBlock ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute z-30 rounded-xl ring-2 ring-[#0d99ff]/70 motion-safe:animate-pulse"
          style={{ left: tipBlock.x, top: tipBlock.y, width: tipBlock.w, height: tipBlock.h }}
        />
      ) : null}
      {editTip === "resize" ? <ResizeFeatureTip anchorRef={editTipAnchorRef} /> : null}
      {editTip === "move" ? <MoveFeatureTip anchorRef={editTipAnchorRef} /> : null}
      {snapPreview ? (
        <div
          aria-hidden="true"
          data-snap-outline=""
          className={cn(
            "pointer-events-none absolute z-30 rounded-xl border border-[#0d99ff]/80 shadow-[0_0_0_1px_rgba(13,153,255,0.35),0_0_18px_rgba(13,153,255,0.35)] transition-[left,top,width,height,opacity] duration-150 ease-out dark:border-[#7cc4ff]/90 dark:shadow-[0_0_0_1px_rgba(124,196,255,0.45),0_0_22px_rgba(124,196,255,0.4)]",
            layoutGuide ? "opacity-100" : "opacity-0",
          )}
          style={{ left: snapPreview.x, top: snapPreview.y, width: snapPreview.w, height: snapPreview.h }}
        />
      ) : null}
      </div>
    </div>
    {progress}
    </>
  );
}
