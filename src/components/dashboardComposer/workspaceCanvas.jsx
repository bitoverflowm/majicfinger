"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, Database, Table2 } from "lucide-react";
import { cn } from "@/lib/utils";

const WorkspaceCanvasContext = createContext(null);

export function useWorkspaceCanvas() {
  return useContext(WorkspaceCanvasContext);
}

const BLOCK_SIZE = {
  sheet: { w: 440, h: 240 },
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
      addBlock,
      updateBlock,
    }),
    [addBlock, blocks, selectedId, tool, updateBlock],
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
        <div className="grid min-h-0 flex-1 grid-cols-4 gap-px bg-border p-px">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="bg-background" />
          ))}
        </div>
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

function CanvasBlock({ block, selected, onSelect, onChange }) {
  const dragRef = useRef(null);

  const onPointerDown = (e) => {
    if (e.button !== 0) return;
    if (e.target.closest("[data-resize]")) return;
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
      role="group"
      aria-label={block.title || block.body || block.type}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      className={cn(
        "group pointer-events-auto absolute flex flex-col overflow-hidden rounded-xl border bg-background shadow-sm",
        selected
          ? "border-[#0d99ff] ring-2 ring-[#0d99ff]/25"
          : "border-border/70 hover:border-[#0d99ff]",
      )}
      style={{ left: block.x, top: block.y, width: block.w, height: block.h }}
    >
      <BlockBody block={block} onChange={onChange} />
      <button
        type="button"
        data-resize=""
        aria-label="Resize"
        onPointerDown={onResizeDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className={cn(
          "absolute bottom-1 right-1 size-3 cursor-nwse-resize rounded-sm border border-[#0d99ff] bg-white opacity-0 shadow-sm group-hover:opacity-100",
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
