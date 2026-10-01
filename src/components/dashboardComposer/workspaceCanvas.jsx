"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, Copy, Database, MoreVertical, Pencil, Table2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DestructiveConfirmMenuItem } from "@/components/ui/destructive-confirm-menu-item";
import { useMyStateV2 } from "@/context/stateContextV2";
import { duplicateTabName, saveWorkspaceStartTabs } from "@/lib/workspaceStartTabs";
import { DashboardSheetGrid } from "@/components/dashboardComposer/dashboardSheetGrid";
import { layoutRunSheets } from "@/components/dashboardComposer/integrationRunSheets";
import { useUser } from "@/lib/hooks";
import {
  createWorkspaceDashboard,
  loadCurrentWorkspaceDashboard,
  saveWorkspaceDashboard,
} from "@/lib/workspaceDashboardClient";
import { pageIdForTab, tabIdFromPage } from "@/lib/workspaceDashboardDocument";
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

export function WorkspaceCanvasProvider({ pageId, children }) {
  const user = useUser();
  const ctx = useMyStateV2();
  const owner = user === undefined ? "" : user?.userId || "local";
  const storageKey = owner ? canvasStorageKey(owner, pageId) : "";
  const [tool, setTool] = useState("select");
  const [blocksByPage, setBlocksByPage] = useState({});
  const [tables, setTables] = useState([]);
  const [ready, setReady] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [renameId, setRenameId] = useState(null);
  const blocks = blocksByPage[pageId] || [];
  const docIdRef = useRef("");
  const lastPayloadRef = useRef("");
  const draftRef = useRef(null);

  const tabs = Array.isArray(ctx?.workspaceStartTabs) ? ctx.workspaceStartTabs : [];
  const activeTabId = ctx?.activeWorkspaceStartTabId || "welcome";
  const welcomeRemoved = !!ctx?.welcomeTabRemoved;

  function draftFromState(nextBlocks, nextTables) {
    return {
      name: "Untitled",
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
      const loaded = await loadCurrentWorkspaceDashboard();
      if (cancel) return;
      let doc = loaded.ok ? loaded.data : null;
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
        tabs: doc.tabs,
        active_tab_id: doc.active_tab_id,
        blocks: doc.blocks,
        tables: nextTables,
      });
      lastPayloadRef.current = payload;
      docIdRef.current = String(doc._id || "");
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
    if (!ready || !owner || owner === "local") return undefined;
    const draft = draftFromState(blocksByPage, tables);
    draftRef.current = draft;
    writeLocalDashboard(owner, draft);
    const payload = JSON.stringify({
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
  }, [activeTabId, blocksByPage, owner, ready, tables, tabs, welcomeRemoved]);

  useEffect(() => {
    if (!ready || !storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(blocks));
    } catch {
      // The full dashboard document is the copy that survives a reload.
    }
  }, [blocks, ready, storageKey]);

  useEffect(() => {
    const flush = () => {
      const id = docIdRef.current;
      const draft = draftRef.current;
      if (!id || !draft || owner === "local") return;
      saveWorkspaceDashboard(id, draft, { keepalive: true }).catch(() => {});
    };
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, [owner]);

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
    (sheets) => {
      const incoming = Array.isArray(sheets) ? sheets : [];
      setBlocksByPage((prev) => {
        const kept = (prev[pageId] || []).filter((block) => block.source !== "integration-run");
        const originY = kept.reduce((max, block) => Math.max(max, (block.y || 0) + (block.h || 0) + 24), 88);
        const placed = layoutRunSheets(incoming, { originY: kept.length ? originY : 88 });
        return { ...prev, [pageId]: [...kept, ...placed] };
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
    setSelectedId(null);
  }, [pageId]);

  const value = useMemo(
    () => ({
      tool,
      setTool,
      blocks,
      selectedId,
      setSelectedId,
      renameId,
      setRenameId,
      addBlock,
      placeIntegrationSheets,
      registerTables,
      updateBlock,
      duplicateBlock,
      removeBlock,
    }),
    [addBlock, blocks, duplicateBlock, placeIntegrationSheets, registerTables, removeBlock, renameId, selectedId, tool, updateBlock],
  );

  return <WorkspaceCanvasContext.Provider value={value}>{children}</WorkspaceCanvasContext.Provider>;
}

function EditableText({ value, onChange, className, placeholder }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || document.activeElement === el) return;
    if (el.textContent !== value) el.textContent = value || "";
  }, [value]);
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

function BlockBody({ block, onChange }) {
  if (block.type === "text") {
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
        </div>
        <DashboardSheetGrid block={block} onChange={onChange} />
      </div>
    );
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
      <div className="mx-3 mb-3 min-h-16 flex-1 rounded-lg bg-muted/40" />
    </div>
  );
}

function blockLabel(block) {
  return block.type === "text" ? block.body || "Text" : block.title || "Element";
}

function CanvasBlock({ block, selected, onSelect, onChange }) {
  const canvas = useWorkspaceCanvas();
  const dragRef = useRef(null);
  const rootRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);

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
    if (e.button !== 0) return;
    if (
      e.target instanceof Element &&
      e.target.closest(
        "[data-sheet-grid],[data-resize],[data-block-menu],[role='menu'],[role='menuitem'],.gdg-style,.gdg-unstyle,textarea,input",
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
      onChange({
        x: Math.max(0, drag.origX + dx),
        y: Math.max(0, drag.origY + dy),
      });
      return;
    }
    onChange({
      w: Math.max(160, drag.origW + (e.clientX - drag.x)),
      h: Math.max(72, drag.origH + (e.clientY - drag.y)),
    });
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  return (
    <div
      ref={rootRef}
      role="group"
      aria-label={block.title || block.body || block.type}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      className={cn(
        "group/block pointer-events-auto absolute flex flex-col overflow-hidden rounded-xl border bg-background shadow-sm",
        selected
          ? "border-[#0d99ff] ring-2 ring-[#0d99ff]/25"
          : "border-border/70 hover:border-[#0d99ff]",
      )}
      style={{ left: block.x, top: block.y, width: block.w, height: block.h }}
    >
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
      <BlockBody block={block} onChange={onChange} />
      <div
        data-resize=""
        aria-hidden="true"
        onPointerDown={onResizeDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="absolute bottom-0 right-0 z-10 size-4"
        style={{ cursor: "nwse-resize" }}
      />
    </div>
  );
}

/** Freeform blocks for the dashboard currently on screen. */
export function WorkspaceCanvas() {
  const canvas = useWorkspaceCanvas();
  const blocks = canvas?.blocks || [];

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") canvas?.setSelectedId?.(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canvas]);

  const scrollerRef = useRef(null);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return undefined;
    const onWheel = (event) => {
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      if (scroller.scrollHeight <= scroller.clientHeight + 1) return;
      event.preventDefault();
      event.stopPropagation();
      scroller.scrollTop += event.deltaY;
    };
    scroller.addEventListener("wheel", onWheel, { passive: false, capture: true });
    return () => scroller.removeEventListener("wheel", onWheel, { capture: true });
  }, [blocks.length]);

  if (!blocks.length) return null;

  return (
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
          selected={canvas.selectedId === block.id}
          onSelect={canvas.setSelectedId}
          onChange={(patch) => canvas.updateBlock(block.id, patch)}
        />
      ))}
      </div>
    </div>
  );
}
