"use client";

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BarChart3, Copy, Database, Maximize2, MoreVertical, Pencil, Play, Square, Table2, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DestructiveConfirmMenuItem } from "@/components/ui/destructive-confirm-menu-item";
import { useMyStateV2 } from "@/context/stateContextV2";
import { duplicateTabName, saveWorkspaceStartTabs } from "@/lib/workspaceStartTabs";
import { DashboardSheetGrid } from "@/components/dashboardComposer/dashboardSheetGrid";
import { VisualTableView } from "@/components/dashboardComposer/visualTableView";
import { Switch } from "@/components/ui/switch";
import { isOrderBookSheet } from "@/components/dashboardComposer/orderBookLadder";
import { countObservations, describeSheet } from "@/lib/visualizations/datasetDescriptor";
import { isStatsDataset, resolveVisualization } from "@/lib/visualizations/presetRegistry";
import { isPriceHistorySheet } from "@/components/dashboardComposer/priceHistorySeries";
import { SheetBlockChart } from "@/components/dashboardComposer/sheetBlockChart";
import { layoutRunSheets } from "@/components/dashboardComposer/integrationRunSheets";
import { CLIP, packClippedBlocks, snapBlockPosition } from "@/components/dashboardComposer/clipLayout";
import { useUser } from "@/lib/hooks";
import { getHistoricalPullRowLimit } from "@/lib/athenaEntitlement";
import {
  ensureFullTradeSheet,
  tradeTickerFromBlock,
  usesHistoricalTradeSheet,
  useTradeSheetLabel,
} from "@/components/dashboardComposer/fullTradeSheet";
import {
  createWorkspaceDashboard,
  loadCurrentWorkspaceDashboard,
  loadWorkspaceDashboardPreview,
  saveWorkspaceDashboard,
} from "@/lib/workspaceDashboardClient";
import { pageIdForTab, tabIdFromPage } from "@/lib/workspaceDashboardDocument";
import { useSheetRealtime } from "@/components/dashboardComposer/sheetRealtimeSession";
import { realtimeSessionKey, realtimeSheetForBlock, realtimeTargetForBlock, sheetAssetIds, tailCells } from "@/lib/realtime/sheetRealtime";
import { replayTabSheets } from "@/components/dashboardComposer/replayTabQueries";
import { createRunReporter } from "@/components/dashboardComposer/integrationRunFeed";
import { closedLifeMessage, lifeCountdown, sheetLife, sheetMarketCaption, sheetMarketClosed } from "@/lib/markets/marketLife";
import { enqueueMarketLookup, lookupSheetMarket, marketMetaComplete, marketMetaPatch } from "@/components/dashboardComposer/sheetMarketLookup";
import { SpectrumLoadingState } from "@/components/ui/spectrum-loading-state";
import { RunProgressCard } from "@/components/dashboardComposer/integrationRunProgress";
import { cn } from "@/lib/utils";

const WorkspaceCanvasContext = createContext(null);

export function useWorkspaceCanvas() {
  return useContext(WorkspaceCanvasContext);
}

const VISUAL_TABLE_WIDTH = 660;

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
  const owner = user === undefined ? "" : user?.userId || "local";
  const storageKey = owner ? canvasStorageKey(owner, pageId) : "";
  const [tool, setTool] = useState("select");
  const [blocksByPage, setBlocksByPage] = useState({});
  const [tables, setTables] = useState([]);
  const [ready, setReady] = useState(false);
  const [dashboardName, setDashboardName] = useState("Untitled");
  const [previewTabs, setPreviewTabs] = useState([]);
  const [previewActiveId, setPreviewActiveId] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [renameId, setRenameId] = useState(null);
  const [runFeed, setRunFeed] = useState(null);
  const [replayReady, setReplayReady] = useState(false);
  const replayRunRef = useRef(null);
  const blocks = blocksByPage[pageId] || [];
  const docIdRef = useRef("");
  const lastPayloadRef = useRef("");
  const draftRef = useRef(null);
  const pendingSelectRef = useRef("");
  const pendingRevealRef = useRef("");
  const placedSheetIdRef = useRef("");
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;
  const blocksByPageRef = useRef(blocksByPage);
  blocksByPageRef.current = blocksByPage;
  const commitLiveCells = useCallback((targetPageId, sheetId, cells) => {
    if (!targetPageId || !sheetId || !cells) return;
    const rowCount = filledRowCount(cells);
    setBlocksByPage((prev) => {
      const list = prev[targetPageId] || [];
      const current = list.find((block) => block.id === sheetId);
      if (!current || current.type !== "sheet") return prev;
      return {
        ...prev,
        [targetPageId]: list.map((block) => (block.id === sheetId ? { ...block, cells, rowCount } : block)),
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

  function draftFromState(nextBlocks, nextTables) {
    return {
      name: String(dashboardName || "").trim().slice(0, 120) || "Untitled",
      active_tab_id: activeTabId,
      welcome_removed: welcomeRemoved,
      tabs: tabs.length ? tabs : [{ id: "welcome", name: "Welcome", blank: false }],
      blocks: blocksForDocument(nextBlocks),
      tables: nextTables,
      charts: [],
    };
  }

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
      const loaded = readOnly ? await loadWorkspaceDashboardPreview() : await loadCurrentWorkspaceDashboard();
      if (cancel) return;
      let doc = loaded.ok ? loaded.data : null;
      if (readOnly) {
        if (!doc) {
          setReady(true);
          return;
        }
        const nextBlocks = blocksByPageFromDoc(doc);
        lastPayloadRef.current = JSON.stringify({ name: doc.name, blocks: doc.blocks });
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
      const payload = JSON.stringify({
        name: doc.name,
        tabs: doc.tabs,
        active_tab_id: doc.active_tab_id,
        blocks: doc.blocks,
        tables: nextTables,
      });
      lastPayloadRef.current = payload;
      docIdRef.current = String(doc._id || "");
      setDashboardName(String(doc.name || "").trim() || "Untitled");
      writeLocalDashboard(owner, {
        name: doc.name,
        active_tab_id: doc.active_tab_id,
        welcome_removed: doc.welcome_removed,
        tabs: doc.tabs,
        blocks: doc.blocks,
        tables: nextTables,
        charts: [],
      });
      setTables(nextTables);
      setBlocksByPage((prev) => ({ ...nextBlocks, ...prev }));
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
    };
    // Load once per signed-in user. Tab edits after that are saved by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owner]);

  useEffect(() => {
    if (readOnly || !ready || !owner || owner === "local") return undefined;
    const draft = draftFromState(blocksByPage, tables);
    draftRef.current = draft;
    writeLocalDashboard(owner, draft);
    const payload = JSON.stringify({
      name: draft.name,
      tabs: draft.tabs,
      active_tab_id: draft.active_tab_id,
      blocks: draft.blocks,
      tables: draft.tables,
    });
    if (payload === lastPayloadRef.current) return undefined;
    const timer = window.setTimeout(() => {
      const finish = (id) => {
        docIdRef.current = id;
        lastPayloadRef.current = payload;
      };
      if (!docIdRef.current) {
        createWorkspaceDashboard(draft)
          .then((result) => {
            if (result.ok && result.data?._id) finish(String(result.data._id));
          })
          .catch(() => {});
        return;
      }
      saveWorkspaceDashboard(docIdRef.current, draft)
        .then((result) => {
          if (result.ok) lastPayloadRef.current = payload;
        })
        .catch(() => {});
    }, 700);
    return () => window.clearTimeout(timer);
  }, [activeTabId, blocksByPage, dashboardName, owner, readOnly, ready, tables, tabs, welcomeRemoved]);

  useEffect(() => {
    if (readOnly || !ready || !storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(blocks));
    } catch {
      // The full dashboard document is the copy that survives a reload.
    }
  }, [blocks, readOnly, ready, storageKey]);

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
      if (!usesHistoricalTradeSheet(block) || !block.columns?.length) continue;
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
      const id = docIdRef.current;
      const draft = draftRef.current;
      if (!id || !draft || owner === "local") return;
      saveWorkspaceDashboard(id, draft, { keepalive: true }).catch(() => {});
    };
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, [owner, readOnly]);

  const updateBlock = useCallback(
    (id, patch) => {
      setBlocksByPage((prev) => {
        const list = prev[pageId] || [];
        return {
          ...prev,
          [pageId]: list.map((block) => (block.id === id ? { ...block, ...patch } : block)),
        };
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
      const append = options?.append === true;
      setBlocksByPage((prev) => {
        const existing = prev[targetId] || [];
        const kept = append ? existing : existing.filter((block) => block.source !== "integration-run");
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
      const dataset = describeSheet(sheet);
      const resolved = resolveVisualization(dataset, {
        columnIds: (sheet.columns || []).map((column) => column?.id || column?.name).filter(Boolean),
        observations: dataset ? countObservations(sheet, dataset) : undefined,
      });
      const base = String(sheet.title || "Sheet").replace(/\s+chart$/, "").trim();
      const requested = String(forcedView || "").trim();
      const chartView = requested || (resolved.view === "table" ? "" : resolved.view);
      const specs = [
        {
          chartView,
          title: chartView === "order-book" && /^order\s*books?/i.test(base) ? base : `${base} chart`,
        },
      ];
      const chartId = newId();
      setBlocksByPage((prev) => {
        const list = prev[pageId] || [];
        const current = list.find((block) => block.id === id) || sheet;
        const charts = specs.map((spec, index) => ({
          id: index === 0 ? chartId : newId(),
          type: "chart",
          source: "sheet-chart",
          sourceSheetId: current.id,
          ...(spec.chartView ? { chartView: spec.chartView } : {}),
          x: current.x,
          y: (current.y || 0) + index,
          w: 540,
          h: 360,
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

  const removeBlock = useCallback(
    (id) => {
      setBlocksByPage((prev) => ({
        ...prev,
        [pageId]: (prev[pageId] || []).filter((block) => block.id !== id),
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

  const pageIdRef = useRef(pageId);
  pageIdRef.current = pageId;

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
      onSheet(id, cells, rowCount) {
        setBlocksByPage((prev) => {
          const list = prev[page] || [];
          const current = list.find((block) => block.id === id);
          if (!current) return prev;
          const tokens = sheetAssetIds({ ...current, cells });
          const table = current.table || current.pull?.table || "";
          const pull = table
            ? {
                ...(current.pull || {}),
                table,
                ...(tokens.length ? { tokens } : {}),
              }
            : current.pull;
          return {
            ...prev,
            [page]: list.map((block) =>
              block.id === id ? { ...block, cells, rowCount, pulledAt: Date.now(), ...(pull ? { pull } : {}) } : block,
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
    const draft = draftFromState(blocksByPage, tables);
    draftRef.current = draft;
    if (!owner || owner === "local") {
      writeLocalDashboard(owner || "local", draft);
      return { ok: true };
    }
    writeLocalDashboard(owner, draft);
    const payload = JSON.stringify({
      name: draft.name,
      tabs: draft.tabs,
      active_tab_id: draft.active_tab_id,
      blocks: draft.blocks,
      tables: draft.tables,
    });
    if (!docIdRef.current) {
      const created = await createWorkspaceDashboard(draft);
      if (!created.ok || !created.data?._id) return { ok: false };
      docIdRef.current = String(created.data._id);
      lastPayloadRef.current = payload;
      return { ok: true };
    }
    const saved = await saveWorkspaceDashboard(docIdRef.current, draft);
    if (saved.ok) lastPayloadRef.current = payload;
    return { ok: !!saved.ok };
  }, [blocksByPage, dashboardName, owner, tables, tabs, activeTabId, welcomeRemoved]);

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
      dashboardName,
      renameDashboard,
      saveNow,
      readOnly,
      ready,
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
    }),
    [addBlock, armReplay, blocks, blocksByPage, createChartFromBlock, dashboardName, dismissRun, duplicateBlock, focusBlock, leavePrompt, pageId, placeIntegrationSheets, previewActiveId, previewTabs, readOnly, ready, realtimeById, realtimeModeByPage, registerTables, removeBlock, renameDashboard, renameId, replayReady, replayRun, replayTab, reportRun, requestTab, resolveLeave, revealBlock, revealNonce, runFeed, saveNow, selectedId, spotlightId, startRealtimeMode, startSheetRealtime, stopRealtimeMode, stopSheetRealtime, tables, tool, updateBlock],
  );

  return (
    <WorkspaceCanvasContext.Provider value={value}>
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
  const liveCells = liveSession(canvas, block?.id)?.liveCells;
  if (!liveCells) return block;
  return { ...block, cells: liveCells };
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

function SheetBlockBody({ block, onChange, booting }) {
  const canvas = useWorkspaceCanvas();
  useRememberMarket(block);
  const view = liveBlock(block, canvas);
  const running = !!liveSession(canvas, block.id)?.running;
  const closed = sheetMarketClosed(block);
  const hasRealtime = !canvas?.readOnly && !closed && !!realtimeSheetForBlock(block, canvas?.blocks || []);
  const pulled = formatPulledAt(block.pulledAt);
  const shownCount = Math.max(filledRowCount(view.cells), Number(block.rowCount) || 0);
  const label = useTradeSheetLabel(usesHistoricalTradeSheet(block) ? block.id : "", shownCount);
  const dataset = describeSheet(view);
  const visual = block.presentation === "visual" && isStatsDataset(dataset);
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
        <VisualTableView
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

function ChartBlockBody({ block, onChange, booting }) {
  const canvas = useWorkspaceCanvas();
  const source = block.sourceSheetId ? (canvas?.blocks || []).find((item) => item.id === block.sourceSheetId) : null;
  const sourceSession = source ? liveSession(canvas, source.id) : null;
  const sourceView = source?.type === "sheet" ? liveBlock(source, canvas) : null;
  const chartSheet =
    sourceView && sourceSession?.running && !isOrderBookSheet(sourceView) && !isPriceHistorySheet(sourceView)
      ? { ...sourceView, cells: tailCells(sourceView.cells, 80) }
      : sourceView;
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
      {booting ? (
        <ChartSkeleton />
      ) : block.sourceSheetId ? (
        <SheetBlockChart
          sheet={chartSheet}
          live={!!sourceSession?.running}
          view={block.chartView || ""}
          onViewChange={(chartView) => onChange({ chartView, vizCustom: true })}
          snapshot={block.chart}
          onSnapshot={(chart) => {
            if (canvas?.readOnly) return;
            if (chartSnapshotKey(block.chart) === chartSnapshotKey(chart)) return;
            onChange({ chart });
          }}
        />
      ) : (
        <div className="mx-3 mb-3 min-h-16 flex-1 rounded-lg bg-muted/40" />
      )}
    </div>
  );
}

function blockLabel(block) {
  return block.type === "text" ? block.body || "Text" : block.title || "Element";
}

function SheetFullscreen({ block, onChange, onClose }) {
  const canvas = useWorkspaceCanvas();
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

  const view = liveBlock(block, canvas);
  const shownCount = Math.max(filledRowCount(view.cells), Number(block.rowCount) || 0);
  const label = useTradeSheetLabel(usesHistoricalTradeSheet(block) ? block.id : "", shownCount);
  const dataset = describeSheet(view);
  const visual = block.presentation === "visual" && isStatsDataset(dataset);
  const pulled = formatPulledAt(block.pulledAt);
  return createPortal(
    <div
      data-sheet-fullscreen=""
      className="fixed inset-0 z-[640] flex flex-col bg-background"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="flex items-center gap-3 border-b border-border/70 px-4 py-3">
        <Table2 className="size-4 text-muted-foreground" aria-hidden />
        <span className="w-fit max-w-[40%] shrink-0 truncate text-[15px] font-semibold">{block.title || "Data sheet"}</span>
        <SheetMarketCaption block={block} />
        <span className="text-[12px] tabular-nums text-muted-foreground">
          {label}
          {pulled ? ` · Pulled ${pulled}` : ""}
        </span>
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
      <MarketLifeBar
        sheet={block}
        session={liveSession(canvas, block.id)}
        enabled={!!realtimeSheetForBlock(block, canvas?.blocks || [])}
      />
      <div className="flex min-h-0 flex-1 flex-col p-4">
        {visual ? (
          <VisualTableView sheet={view} dataset={dataset} hidden={block.visualHidden} readOnly />
        ) : (
          <DashboardSheetGrid block={view} onChange={onChange} />
        )}
      </div>
    </div>,
    document.body,
  );
}

function RealtimeToggle({ block }) {
  const canvas = useWorkspaceCanvas();
  const match = realtimeSheetForBlock(block, canvas?.blocks || []);
  const session = match ? liveSession(canvas, match.sheet.id) : null;
  const running = !!session?.running;
  if (!match || canvas?.readOnly || (sheetMarketClosed(match.sheet) && !running)) return null;
  return (
    <button
      type="button"
      data-realtime-toggle=""
      title={running ? "Stop realtime" : session?.status || "Start realtime"}
      aria-label={running ? "Stop realtime" : "Start realtime"}
      aria-pressed={running}
      className={cn(
        "absolute right-8 top-1.5 z-10 inline-flex size-5 items-center justify-center rounded-sm bg-background/80 transition-opacity duration-200",
        running
          ? "text-emerald-600 opacity-100"
          : "pointer-events-none text-muted-foreground opacity-0 group-hover/block:pointer-events-auto group-hover/block:opacity-100 group-focus-within/block:pointer-events-auto group-focus-within/block:opacity-100",
      )}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        if (running) canvas?.stopSheetRealtime?.(match.sheet.id);
        else canvas?.startSheetRealtime?.(match.sheet.id);
      }}
    >
      {running ? <Square className="size-3" /> : <Play className="size-3" />}
    </button>
  );
}

function CanvasBlock({ block, selected, spotlight = false, onSelect, onChange, booting = false }) {
  const canvas = useWorkspaceCanvas();
  const readOnly = !!canvas?.readOnly;
  const dragRef = useRef(null);
  const rootRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [resizing, setResizing] = useState(false);

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

  const onPointerDown = (e) => {
    if (readOnly || e.button !== 0) return;
    if (
      e.target instanceof Element &&
      e.target.closest(
        "[data-sheet-fullscreen],[data-sheet-grid],[data-visual-table],[data-sheet-chart],[data-resize],[data-block-menu],[data-realtime-toggle],[role='menu'],[role='menuitem'],.gdg-style,.gdg-unstyle,textarea,input",
      )
    ) {
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      mode: "move",
      x: e.clientX,
      y: e.clientY,
      origX: block.x,
      origY: block.y,
      moved: false,
      fromText: !!e.target.closest("[data-editable]"),
    };
    onSelect(block.id);
  };

  const onResizeDown = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    setResizing(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      mode: "resize",
      x: e.clientX,
      y: e.clientY,
      origW: block.w,
      origH: block.h,
    };
    onSelect(block.id);
  };

  const onPointerMove = (e) => {
    const drag = dragRef.current;
    if (!drag) return;
    if (drag.mode === "move") {
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) < 4) return;
      if (!drag.moved && drag.fromText) {
        const active = document.activeElement;
        if (active instanceof HTMLElement && e.currentTarget.contains(active)) active.blur();
      }
      drag.moved = true;
      drag.nextX = Math.max(0, drag.origX + dx);
      drag.nextY = Math.max(CLIP.originY, drag.origY + dy);
      onChange({
        x: drag.nextX,
        y: drag.nextY,
      });
      return;
    }
    const w = Math.max(160, drag.origW + (e.clientX - drag.x));
    const h = Math.max(72, drag.origH + (e.clientY - drag.y));
    if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 4) return;
    drag.moved = true;
    drag.nextW = w;
    drag.nextH = h;
    onChange({ w, h });
  };

  const onPointerUp = () => {
    const drag = dragRef.current;
    dragRef.current = null;
    setResizing(false);
    if (!drag?.moved) return;
    const others = canvas?.blocks || [];
    if (drag.mode === "move") {
      onChange(snapBlockPosition({ ...block, x: drag.nextX ?? block.x, y: drag.nextY ?? block.y }, others));
      return;
    }
    if (drag.mode === "resize") {
      onChange(snapBlockPosition({ ...block, w: drag.nextW ?? block.w, h: drag.nextH ?? block.h }, others));
    }
  };

  return (
    <div
      ref={rootRef}
      role="group"
      data-block-id={block.id}
      aria-label={block.title || block.body || block.type}
      onPointerDown={readOnly ? undefined : onPointerDown}
      onPointerMove={readOnly ? undefined : onPointerMove}
      onPointerUp={readOnly ? undefined : onPointerUp}
      className={cn(
        "pointer-events-auto absolute flex flex-col overflow-hidden rounded-xl border bg-background shadow-sm",
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
        transition: resizing ? "none" : "width 480ms cubic-bezier(0.22, 1, 0.36, 1), height 480ms cubic-bezier(0.22, 1, 0.36, 1)",
      }}
    >
      {readOnly ? null : <RealtimeToggle block={block} />}
      {readOnly ? null : (
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
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
        >
          {block.type === "sheet" ? (
            <>
              <DropdownMenuItem
                className="gap-2.5 rounded-md px-2 py-2 text-[13px]"
                onSelect={() => setFullscreen(true)}
              >
                <Maximize2 className="size-4 text-muted-foreground" />
                Full screen
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2.5 rounded-md px-2 py-2 text-[13px]"
                onSelect={() => canvas?.createChartFromBlock?.(block.id)}
              >
                <BarChart3 className="size-4 text-muted-foreground" />
                Create chart
              </DropdownMenuItem>
              {isStatsDataset(describeSheet(block)) ? (
                block.visualReady ? (
                  <div
                    className="flex items-center gap-2.5 rounded-md px-2 py-2 text-[13px]"
                    onPointerDown={(event) => event.stopPropagation()}
                  >
                    <Switch
                      size="sm"
                      checked={block.presentation === "visual"}
                      aria-label="Visual table"
                      onCheckedChange={(on) => {
                        if (on) {
                          onChange({
                            presentation: "visual",
                            visualReady: true,
                            sheetW: block.sheetW || block.w,
                            w: VISUAL_TABLE_WIDTH,
                          });
                          return;
                        }
                        onChange({
                          presentation: "sheet",
                          w: block.sheetW || block.w,
                        });
                      }}
                      onClick={(event) => event.stopPropagation()}
                    />
                    <span>Visual table</span>
                  </div>
                ) : (
                  <DropdownMenuItem
                    className="gap-2.5 rounded-md px-2 py-2 text-[13px]"
                    onSelect={() =>
                      onChange({
                        presentation: "visual",
                        visualReady: true,
                        sheetW: block.w,
                        w: VISUAL_TABLE_WIDTH,
                      })
                    }
                  >
                    <Table2 className="size-4 text-muted-foreground" />
                    Visual Table
                  </DropdownMenuItem>
                )
              ) : null}
              <DropdownMenuSeparator />
            </>
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
      {fullscreen && block.type === "sheet" && !readOnly ? (
        <SheetFullscreen block={block} onChange={onChange} onClose={() => setFullscreen(false)} />
      ) : (
        <BlockBody block={block} onChange={onChange} booting={booting} />
      )}
      {readOnly ? null : (
      <div
        data-resize=""
        aria-hidden="true"
        onPointerDown={onResizeDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="absolute bottom-0 right-0 z-10 size-4"
        style={{ cursor: "nwse-resize" }}
      />
      )}
    </div>
  );
}

function blocksTopToBottom(blocks) {
  return (blocks || []).slice().sort((a, b) => (a.y || 0) - (b.y || 0) || (a.x || 0) - (b.x || 0));
}

/** Freeform blocks for the dashboard currently on screen. */
export function WorkspaceCanvas() {
  const canvas = useWorkspaceCanvas();
  const blocks = canvas?.blocks || [];
  const scrollerRef = useRef(null);
  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;
  const [bootingIds, setBootingIds] = useState(() => new Set());
  const skipNearestScrollRef = useRef(false);

  useLayoutEffect(() => {
    if (!canvas?.ready) return undefined;
    const ids = blocksTopToBottom(blocksRef.current).map((block) => block.id);
    if (!ids.length) {
      setBootingIds(new Set());
      return undefined;
    }
    setBootingIds(new Set(ids));
    const timers = ids.map((id, index) =>
      window.setTimeout(() => {
        setBootingIds((current) => {
          if (!current.has(id)) return current;
          const next = new Set(current);
          next.delete(id);
          return next;
        });
      }, 320 + index * 460),
    );
    return () => {
      for (const timer of timers) window.clearTimeout(timer);
    };
  }, [canvas?.ready, canvas?.pageId]);

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

  if (!blocks.length) return progress;

  return (
    <>
    <div ref={scrollerRef} className="pointer-events-auto absolute inset-0 z-20 overflow-auto">
      <div
        className="relative min-h-full min-w-full"
        style={{
          height: blocks.reduce((max, block) => Math.max(max, (block.y || 0) + (block.h || 0) + 120), 0),
          width: blocks.reduce((max, block) => Math.max(max, (block.x || 0) + (block.w || 0) + 32), 0),
        }}
      >
      {blocks.map((block) => (
        <CanvasBlock
          key={block.id}
          block={block}
          booting={bootingIds.has(block.id)}
          selected={canvas.selectedId === block.id}
          spotlight={canvas.spotlightId === block.id}
          onSelect={canvas.setSelectedId}
          onChange={(patch) => canvas.updateBlock(block.id, patch)}
        />
      ))}
      </div>
    </div>
    {progress}
    </>
  );
}
