"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DataEditor, GridCellKind } from "@glideapps/glide-data-grid";
import "@glideapps/glide-data-grid/dist/index.css";
import { FormulaHeaderEditor } from "@/components/dashboardComposer/integrationFormulaEditor";
import { useHtmlDarkClass } from "@/hooks/use-html-dark-class";

function themeFor(dark, fontFamily) {
  const shared = {
    accentColor: "#0d99ff",
    accentFg: "#ffffff",
    accentLight: "rgba(13, 153, 255, 0.16)",
    fontFamily,
    headerFontStyle: "600 12px",
    baseFontStyle: "13px",
    markerFontStyle: "12px",
    cellHorizontalPadding: 8,
    cellVerticalPadding: 3,
  };
  if (dark) {
    return {
      ...shared,
      textDark: "#f4f4f5",
      textMedium: "#a1a1aa",
      textHeader: "#d4d4d8",
      bgCell: "#222226",
      bgHeader: "#2a2a2e",
      bgHeaderHovered: "#303036",
      borderColor: "rgba(255,255,255,0.08)",
      horizontalBorderColor: "rgba(255,255,255,0.06)",
    };
  }
  return {
    ...shared,
    textDark: "#171717",
    textMedium: "#525252",
    textHeader: "#404040",
    bgCell: "#ffffff",
    bgHeader: "#fafafa",
    bgHeaderHovered: "#f3f3f3",
    borderColor: "rgba(0,0,0,0.08)",
    horizontalBorderColor: "rgba(0,0,0,0.06)",
  };
}

function asDate(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (Number.isFinite(n) && n > 1e9) {
    const ms = n > 1e16 ? n / 1e6 : n > 1e12 ? n : n * 1000;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function displayFor(value, column) {
  const type = column?.type;
  if (value == null || value === "") return "";
  if (type === "boolean") {
    const on = value === true || value === "true" || value === "True";
    return on ? "Yes" : "No";
  }
  if (type === "date") {
    const date = asDate(value);
    return date ? date.toLocaleString() : String(value);
  }
  if (type === "number") {
    let n = Number(value);
    if (!Number.isFinite(n)) return String(value);
    if (column.scale === "cents") n = n / 100;
    if (column.scale === "cents") return `${Math.round(n * 100)}¢`;
    if (column.exact || column.id === "t") return Number.isInteger(n) ? String(n) : String(Math.round(n * 10000) / 10000);
    if (Math.abs(n) >= 1000) {
      return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
    }
    return String(Math.round(n * 10000) / 10000);
  }
  return String(value);
}

const HIGHLIGHT_THEME = {
  light: {
    bgCell: "#e7f3ff",
    bgHeader: "#d7ebff",
    bgHeaderHovered: "#c5e4ff",
    textHeader: "#0b3a66",
  },
  dark: {
    bgCell: "rgba(13, 153, 255, 0.18)",
    bgHeader: "rgba(13, 153, 255, 0.32)",
    bgHeaderHovered: "rgba(13, 153, 255, 0.42)",
    textHeader: "#e8f4ff",
  },
};

const LYCHEE_FLASH = {
  light: {
    bgCell: "rgba(230, 57, 70, 0.22)",
    bgHeader: "rgba(230, 57, 70, 0.38)",
    bgHeaderHovered: "rgba(230, 57, 70, 0.48)",
    textHeader: "#7f1d1d",
  },
  dark: {
    bgCell: "rgba(230, 57, 70, 0.28)",
    bgHeader: "rgba(230, 57, 70, 0.5)",
    bgHeaderHovered: "rgba(230, 57, 70, 0.62)",
    textHeader: "#fff1f2",
  },
};

const REF_THEME = {
  light: {
    bgCell: "#fff6d8",
    bgHeader: "#ffe8a3",
    bgHeaderHovered: "#ffdf80",
    textHeader: "#6a4b00",
  },
  dark: {
    bgCell: "rgba(255, 196, 64, 0.16)",
    bgHeader: "rgba(255, 196, 64, 0.32)",
    bgHeaderHovered: "rgba(255, 196, 64, 0.42)",
    textHeader: "#ffe7a3",
  },
};

function columnTheme(columnId, highlightColumnId, highlightColumnIds, referencedColumnIds, flashColumnIds, dark) {
  if (columnId && flashColumnIds?.includes(columnId)) return LYCHEE_FLASH[dark ? "dark" : "light"];
  if (columnId && (columnId === highlightColumnId || highlightColumnIds?.includes(columnId))) {
    return HIGHLIGHT_THEME[dark ? "dark" : "light"];
  }
  if (referencedColumnIds?.includes(columnId)) return REF_THEME[dark ? "dark" : "light"];
  return undefined;
}

export default function IntegrationBuildGridInner({
  columns,
  rows,
  highlightColumnId = "",
  highlightColumnIds = [],
  flashColumnIds = [],
  activeCell = null,
  scrollToken = 0,
  scrollSmooth = false,
  scrollAlign = "end",
  referencedColumnIds = [],
  referencedCells = [],
  formulaEditor = null,
  onFormulaPick,
}) {
  const dark = useHtmlDarkClass();
  const frameRef = useRef(null);
  const editorRef = useRef(null);
  const gridSlotRef = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [fontFamily, setFontFamily] = useState("ui-sans-serif, system-ui, sans-serif");
  const [columnWidths, setColumnWidths] = useState({});
  const gridColumns = useMemo(
    () =>
      columns.map((column) => ({
        id: column.id,
        title: column.title,
        width:
          columnWidths[column.id] ??
          (column.id === highlightColumnId
            ? Math.max(220, Math.min(360, String(formulaEditor?.value || column.title || "").length * 7.2 + 36))
            : column.id === "title" || column.id === "question"
              ? 280
              : column.type === "date"
                ? 188
                : 140),
        themeOverride: columnTheme(column.id, highlightColumnId, highlightColumnIds, referencedColumnIds, flashColumnIds, dark),
      })),
    [columnWidths, columns, dark, flashColumnIds, highlightColumnId, highlightColumnIds, referencedColumnIds, formulaEditor?.value],
  );

  const onColumnResize = useCallback((column, newSize) => {
    const id = column?.id;
    if (!id) return;
    const width = Math.round(newSize);
    setColumnWidths((prev) => (prev[id] === width ? prev : { ...prev, [id]: width }));
  }, []);

  useEffect(() => {
    const next = getComputedStyle(document.body).fontFamily;
    if (next) setFontFamily(next);
  }, []);

  useEffect(() => {
    const el = gridSlotRef.current;
    if (!el) return undefined;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      setSize({ width: Math.floor(rect.width), height: Math.floor(rect.height) });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const highlightIndex = highlightColumnId ? columns.findIndex((column) => column.id === highlightColumnId) : -1;
  const formulaRow = Number.isInteger(formulaEditor?.row) ? formulaEditor.row : null;
  const [formulaBox, setFormulaBox] = useState(null);

  const formulaHeader = Boolean(formulaEditor) && !formulaEditor?.bar;
  const placeFormula = useCallback(() => {
    if (!formulaHeader || highlightIndex < 0) {
      setFormulaBox(null);
      return;
    }
    const frame = gridSlotRef.current;
    if (!frame) return;
    const scroller = frame.querySelector(".dvn-scroller");
    const scrollLeft = scroller?.scrollLeft || 0;
    const scrollTop = scroller?.scrollTop || 0;
    let x = 46;
    for (let index = 0; index < highlightIndex; index += 1) x += gridColumns[index]?.width || 0;
    const next = {
      x: x - scrollLeft,
      y: formulaRow == null ? 0 : 32 + formulaRow * 28 - scrollTop,
      width: gridColumns[highlightIndex]?.width || 220,
      height: formulaRow == null ? 32 : 28,
    };
    setFormulaBox((prev) =>
      prev && prev.x === next.x && prev.y === next.y && prev.width === next.width && prev.height === next.height ? prev : next,
    );
  }, [formulaHeader, formulaRow, gridColumns, highlightIndex]);

  useEffect(() => {
    if (!formulaHeader || highlightIndex < 0) return undefined;
    let frame = 0;
    const tick = () => {
      placeFormula();
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [formulaHeader, highlightIndex, placeFormula]);

  useEffect(() => {
    if (scrollSmooth || highlightIndex < 0 || size.width <= 0) return undefined;
    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      editorRef.current?.scrollTo(highlightIndex, formulaRow ?? 0, formulaRow == null ? "horizontal" : "both", 16, 0, {
        hAlign: "end",
        vAlign: "start",
      });
      placeFormula();
    };
    const frame = window.requestAnimationFrame(run);
    const timer = window.setTimeout(run, 90);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [formulaRow, highlightIndex, placeFormula, scrollSmooth, scrollToken, size.width]);

  useEffect(() => {
    if (!scrollSmooth || highlightIndex < 0 || size.width <= 0) return undefined;
    let cancelled = false;
    let moved = false;
    const glideToNewColumns = () => {
      if (cancelled || moved) return;
      const scroller = gridSlotRef.current?.querySelector(".dvn-scroller");
      const editor = editorRef.current;
      if (!scroller || !editor) return;
      const origin = editor.getBounds(0, 0);
      const next = editor.getBounds(highlightIndex, 0);
      if (!origin?.width || !next?.width) return;
      const span = next.x - origin.x;
      const target = Math.max(0, scrollAlign === "end" ? span + next.width - scroller.clientWidth : span - 16);
      if (Math.abs(target - scroller.scrollLeft) < 2) return;
      moved = true;
      const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
      scroller.scrollTo({ left: target, behavior });
    };
    const timers = [];
    for (let delay = 60; delay <= 1500; delay += 120) timers.push(window.setTimeout(glideToNewColumns, delay));
    return () => {
      cancelled = true;
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [highlightIndex, scrollAlign, scrollSmooth, scrollToken, size.width]);

  const referencedKey = referencedCells.map((cell) => `${cell.columnId}:${cell.row}`).join("|");

  const getCellContent = useCallback(
    ([col, row]) => {
      const column = columns[col];
      const raw = rows[row]?.[column?.id];
      const display = displayFor(raw, column);
      const active = activeCell?.columnId === column?.id && activeCell?.row === row;
      const referenced = referencedCells.some((cell) => cell.columnId === column?.id && cell.row === row + 1);
      const flashed = flashColumnIds?.includes(column?.id);
      const themeOverride = flashed
        ? LYCHEE_FLASH[dark ? "dark" : "light"]
        : active
          ? HIGHLIGHT_THEME[dark ? "dark" : "light"]
          : referenced
            ? REF_THEME[dark ? "dark" : "light"]
            : undefined;
      if (column?.type === "number" && raw != null && raw !== "") {
        const parsed = Number(raw);
        const n = column.scale === "cents" && Number.isFinite(parsed) ? parsed / 100 : parsed;
        return {
          kind: GridCellKind.Number,
          data: Number.isFinite(n) ? n : undefined,
          displayData: display,
          allowOverlay: false,
          readonly: true,
          themeOverride,
        };
      }
      if (column?.type === "boolean") {
        const on = raw === true || raw === "true" || raw === "True";
        return { kind: GridCellKind.Boolean, data: on, allowOverlay: false, readonly: true, themeOverride };
      }
      return {
        kind: GridCellKind.Text,
        data: display,
        displayData: display,
        allowOverlay: false,
        readonly: true,
        themeOverride,
      };
    },
    [activeCell, columns, dark, flashColumnIds, referencedKey, rows],
  );

  const reportPick = useCallback(
    (index, row) => {
      const column = columns[index];
      if (!column) return;
      onFormulaPick?.({
        column,
        row: row == null ? null : row + 1,
        self: column.id === highlightColumnId,
      });
    },
    [columns, highlightColumnId, onFormulaPick],
  );

  const gridHeight = size.height;

  return (
    <div ref={frameRef} data-sheet-grid="" className="relative flex h-full min-h-0 w-full flex-col overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm">
      {formulaEditor?.bar ? (
        <div className="z-20 shrink-0 border-b border-border/70 px-2 py-2">
          <FormulaHeaderEditor bar {...formulaEditor} />
        </div>
      ) : null}
      <div ref={gridSlotRef} className="relative min-h-0 flex-1">
        {gridHeight > 0 && size.width > 0 ? (
          <DataEditor
            ref={editorRef}
            width={size.width}
            height={gridHeight}
            columns={gridColumns}
            rows={rows.length}
            getCellContent={getCellContent}
            rowMarkers="number"
            rowMarkerWidth={46}
            headerHeight={32}
            rowHeight={28}
            theme={themeFor(dark, fontFamily)}
            smoothScrollX
            smoothScrollY
            getCellsForSelection
            rangeSelect="cell"
            minColumnWidth={64}
            maxColumnWidth={1600}
            onColumnResize={onColumnResize}
            onVisibleRegionChanged={placeFormula}
            onHeaderClicked={(index) => reportPick(index, null)}
            onCellClicked={([index, row]) => reportPick(index, row)}
          />
        ) : null}
        {formulaEditor && !formulaEditor.bar ? <FormulaHeaderEditor box={formulaBox} {...formulaEditor} /> : null}
      </div>
    </div>
  );
}
