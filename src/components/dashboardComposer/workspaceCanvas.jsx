"use client";

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BarChart3, Copy, Database, Maximize2, MoreVertical, Pencil, Table2, X } from "lucide-react";
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
import { SheetBlockChart } from "@/components/dashboardComposer/sheetBlockChart";
import { layoutRunSheets } from "@/components/dashboardComposer/integrationRunSheets";
import { CLIP, packClippedBlocks, snapBlockPosition } from "@/components/dashboardComposer/clipLayout";
import { useUser } from "@/lib/hooks";
import { getHistoricalPullRowLimit } from "@/lib/athenaEntitlement";
import {
  ensureFullTradeSheet,
  tradeTickerFromBlock,
  useTradeSheetLabel,
} from "@/components/dashboardComposer/fullTradeSheet";
import {
  createWorkspaceDashboard,
  loadCurrentWorkspaceDashboard,
  loadWorkspaceDashboardPreview,
  saveWorkspaceDashboard,
} from "@/lib/workspaceDashboardClient";
import { pageIdForTab, tabIdFromPage } from "@/lib/workspaceDashboardDocument";
import { SpectrumLoadingState } from "@/components/ui/spectrum-loading-state";
import { RunProgressCard } from "@/components/dashboardComposer/integrationRunProgress";
import { cn } from "@/lib/utils";

const WorkspaceCanvasContext = createContext(null);

export function useWorkspaceCanvas() {
  return useContext(WorkspaceCanvasContext);
}

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
  const blocks = blocksByPage[pageId] || [];
  const docIdRef = useRef("");
  const lastPayloadRef = useRef("");
  const draftRef = useRef(null);
  const pendingSelectRef = useRef("");

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
    if (!ready || user === undefined) return undefined;
    const cap = getHistoricalPullRowLimit(user);
    for (const block of blocks) {
      const ticker = tradeTickerFromBlock(block);
      if (!ticker || !block.columns?.length) continue;
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
  const dismissRun = useCallback(() => setRunFeed(null), []);

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
        const placed = layoutRunSheets(incoming, { originY: kept.length ? originY : 88 });
        return { ...prev, [targetId]: [...kept, ...placed] };
      });
      setSelectedId(incoming[0]?.id || null);
      setTool("select");
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
    (id) => {
      const sheet = blocks.find((block) => block.id === id && block.type === "sheet");
      if (!sheet) return;
      const chartId = newId();
      setBlocksByPage((prev) => {
        const list = prev[pageId] || [];
        const current = list.find((block) => block.id === id) || sheet;
        const chart = {
          id: chartId,
          type: "chart",
          source: "sheet-chart",
          sourceSheetId: current.id,
          x: current.x,
          y: current.y,
          w: 540,
          h: 360,
          title: `${current.title || "Sheet"} chart`,
          body: "",
        };
        return { ...prev, [pageId]: packClippedBlocks([...list, chart]) };
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
      selectedId,
      setSelectedId,
      focusBlock,
      renameId,
      setRenameId,
      addBlock,
      placeIntegrationSheets,
      registerTables,
      runFeed,
      reportRun,
      dismissRun,
      updateBlock,
      duplicateBlock,
      removeBlock,
      createChartFromBlock,
    }),
    [addBlock, blocks, blocksByPage, createChartFromBlock, dashboardName, dismissRun, duplicateBlock, focusBlock, pageId, placeIntegrationSheets, previewActiveId, previewTabs, readOnly, ready, registerTables, removeBlock, renameDashboard, renameId, reportRun, runFeed, saveNow, selectedId, tool, updateBlock],
  );

  return <WorkspaceCanvasContext.Provider value={value}>{children}</WorkspaceCanvasContext.Provider>;
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
  const points = chart?.points;
  if (!points?.length) return "";
  const last = points[points.length - 1];
  return `${chart.kind}|${points.length}|${last.time || last.label}|${last.price ?? last.value}|${chart.sizeTitle || ""}`;
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

function SheetBlockBody({ block, onChange, booting }) {
  const canvas = useWorkspaceCanvas();
  const label = useTradeSheetLabel(block.id, Math.max(filledRowCount(block.cells), Number(block.rowCount) || 0));
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-border/70 px-3 py-2">
        <Table2 className="size-3.5 text-muted-foreground" aria-hidden />
        <EditableText
          value={block.title}
          placeholder="Data sheet"
          onChange={(title) => onChange({ title })}
          className="min-w-0 flex-1 text-[13px] font-semibold text-foreground"
        />
        <span className={cn("shrink-0 text-[12px] tabular-nums text-muted-foreground", canvas?.readOnly ? "pr-1" : "pr-4")}>
          {booting ? "Loading…" : label}
        </span>
      </div>
      {booting ? <SheetSkeleton /> : <DashboardSheetGrid block={block} onChange={onChange} readOnly={!!canvas?.readOnly} />}
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
      </div>
      {booting ? (
        <ChartSkeleton />
      ) : block.sourceSheetId ? (
        <SheetBlockChart
          sheet={source?.type === "sheet" ? source : null}
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

  const label = useTradeSheetLabel(block.id, Math.max(filledRowCount(block.cells), Number(block.rowCount) || 0));
  return createPortal(
    <div
      data-sheet-fullscreen=""
      className="fixed inset-0 z-[640] flex flex-col bg-background"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="flex items-center gap-3 border-b border-border/70 px-4 py-3">
        <Table2 className="size-4 text-muted-foreground" aria-hidden />
        <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{block.title || "Data sheet"}</span>
        <span className="text-[12px] tabular-nums text-muted-foreground">{label}</span>
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
      <div className="flex min-h-0 flex-1 flex-col p-4">
        <DashboardSheetGrid block={block} onChange={onChange} />
      </div>
    </div>,
    document.body,
  );
}

function CanvasBlock({ block, selected, onSelect, onChange, booting = false }) {
  const canvas = useWorkspaceCanvas();
  const readOnly = !!canvas?.readOnly;
  const dragRef = useRef(null);
  const rootRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

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
        "[data-sheet-fullscreen],[data-sheet-grid],[data-resize],[data-block-menu],[role='menu'],[role='menuitem'],.gdg-style,.gdg-unstyle,textarea,input",
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
        !readOnly && selected
          ? "border-[#0d99ff] ring-2 ring-[#0d99ff]/25"
          : !readOnly && "border-border/70 hover:border-[#0d99ff]",
      )}
      style={{ left: block.x, top: block.y, width: block.w, height: block.h }}
    >
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
    const id = canvas?.selectedId;
    const scroller = scrollerRef.current;
    if (!id || !scroller) return;
    const el = scroller.querySelector(`[data-block-id="${CSS.escape(id)}"]`);
    if (el instanceof HTMLElement) el.scrollIntoView({ block: "nearest" });
  }, [canvas?.selectedId]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return undefined;
    const onWheel = (event) => {
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

  const progress = canvas.runFeed ? <RunProgressCard feed={canvas.runFeed} onDismiss={canvas.dismissRun} /> : null;

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
