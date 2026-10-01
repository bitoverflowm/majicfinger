"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DataEditor, GridCellKind } from "@glideapps/glide-data-grid";
import "@glideapps/glide-data-grid/dist/index.css";
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

export default function IntegrationBuildGridInner({ columns, rows, highlightColumnId = "", scrollToken = 0 }) {
  const dark = useHtmlDarkClass();
  const frameRef = useRef(null);
  const editorRef = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [fontFamily, setFontFamily] = useState("ui-sans-serif, system-ui, sans-serif");
  const gridColumns = useMemo(
    () =>
      columns.map((column) => ({
        id: column.id,
        title: column.title,
        width:
          column.id === highlightColumnId
            ? Math.max(168, Math.min(280, String(column.title || "").length * 8 + 28))
            : column.id === "title" || column.id === "question"
              ? 280
              : column.type === "date"
                ? 188
                : 140,
        themeOverride: column.id === highlightColumnId ? HIGHLIGHT_THEME[dark ? "dark" : "light"] : undefined,
      })),
    [columns, dark, highlightColumnId],
  );

  useEffect(() => {
    const next = getComputedStyle(document.body).fontFamily;
    if (next) setFontFamily(next);
  }, []);

  useEffect(() => {
    const el = frameRef.current;
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

  useEffect(() => {
    if (highlightIndex < 0 || size.width <= 0) return undefined;
    let cancelled = false;
    const run = () => {
      if (!cancelled) editorRef.current?.scrollTo(highlightIndex, 0, "horizontal", 16, 0, { hAlign: "end" });
    };
    const frame = window.requestAnimationFrame(run);
    const timer = window.setTimeout(run, 80);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [highlightIndex, scrollToken, size.width]);

  const getCellContent = useCallback(
    ([col, row]) => {
      const column = columns[col];
      const raw = rows[row]?.[column?.id];
      const display = displayFor(raw, column);
      if (column?.type === "number" && raw != null && raw !== "") {
        const parsed = Number(raw);
        const n = column.scale === "cents" && Number.isFinite(parsed) ? parsed / 100 : parsed;
        return {
          kind: GridCellKind.Number,
          data: Number.isFinite(n) ? n : undefined,
          displayData: display,
          allowOverlay: false,
          readonly: true,
        };
      }
      if (column?.type === "boolean") {
        const on = raw === true || raw === "true" || raw === "True";
        return { kind: GridCellKind.Boolean, data: on, allowOverlay: false, readonly: true };
      }
      return {
        kind: GridCellKind.Text,
        data: display,
        displayData: display,
        allowOverlay: false,
        readonly: true,
      };
    },
    [columns, rows],
  );

  return (
    <div ref={frameRef} data-sheet-grid="" className="h-full min-h-0 w-full overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm">
      {size.width > 0 && size.height > 0 ? (
        <DataEditor
          ref={editorRef}
          width={size.width}
          height={size.height}
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
        />
      ) : null}
    </div>
  );
}
