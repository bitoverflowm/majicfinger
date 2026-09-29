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
import { duplicateTabName } from "@/lib/workspaceStartTabs";
import { DashboardSheetGrid } from "@/components/dashboardComposer/dashboardSheetGrid";
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

export function WorkspaceCanvasProvider({ pageId, children }) {
  const [tool, setTool] = useState("select");
  const [blocksByPage, setBlocksByPage] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [renameId, setRenameId] = useState(null);
  const blocks = blocksByPage[pageId] || [];

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
      updateBlock,
      duplicateBlock,
      removeBlock,
    }),
    [addBlock, blocks, duplicateBlock, removeBlock, renameId, selectedId, tool, updateBlock],
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
      <button
        type="button"
        data-resize=""
        aria-label="Resize"
        onPointerDown={onResizeDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className={cn(
          "absolute bottom-1 right-1 size-3 cursor-nwse-resize rounded-sm border border-[#0d99ff] bg-white opacity-0 shadow-sm group-hover/block:opacity-100",
          selected && "opacity-100",
        )}
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

  if (!blocks.length) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
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
  );
}
