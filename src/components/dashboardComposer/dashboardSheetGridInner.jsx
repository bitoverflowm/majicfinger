"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CompactSelection, DataEditor, GridCellKind } from "@glideapps/glide-data-grid";
import "@glideapps/glide-data-grid/dist/index.css";
import { useHtmlDarkClass } from "@/hooks/use-html-dark-class";
import { useReadyTradeSheet, usesHistoricalTradeSheet } from "@/components/dashboardComposer/fullTradeSheet";
import { useWorkspaceCanvas } from "@/components/dashboardComposer/workspaceCanvas";

const ROW_COUNT = 24;

const DEFAULT_COLUMNS = [
  { title: "A", width: 110 },
  { title: "B", width: 110 },
  { title: "C", width: 110 },
  { title: "D", width: 110 },
];

function columnsOf(block) {
  const list = Array.isArray(block?.columns) ? block.columns : [];
  const clean = list
    .map((column) => {
      const id = String(column?.id || column?.name || "").trim();
      return {
        ...(id ? { id } : {}),
        title: String(column?.title || "").trim() || " ",
        width: Number(column?.width) > 40 ? Number(column.width) : 110,
        ...(column?.type ? { type: column.type } : {}),
        ...(column?.exact ? { exact: true } : {}),
        ...(column?.scale ? { scale: column.scale } : {}),
        ...(column?.dateEpoch ? { dateEpoch: column.dateEpoch } : {}),
      };
    })
    .filter((column) => column.title);
  return clean.length ? clean : DEFAULT_COLUMNS;
}

function rowCountOf(cells) {
  let max = ROW_COUNT - 1;
  for (const key of Object.keys(cells || {})) {
    const row = Number(String(key).split(",")[1]);
    if (Number.isFinite(row)) max = Math.max(max, row);
  }
  return Math.max(ROW_COUNT, max + 8);
}

function themeFor(dark, fontFamily) {
  const shared = {
    accentColor: "#0d99ff",
    accentFg: "#ffffff",
    accentLight: "rgba(13, 153, 255, 0.16)",
    fontFamily,
    headerFontStyle: "600 12px",
    baseFontStyle: "13px",
    markerFontStyle: "12px",
    editorFontSize: "13px",
    headerIconSize: 16,
    lineHeight: 1.35,
    cellHorizontalPadding: 8,
    cellVerticalPadding: 3,
    drilldownBorder: "#0d99ff",
    linkColor: "#0d99ff",
  };
  if (dark) {
    return {
      ...shared,
      textDark: "#f4f4f5",
      textMedium: "#a1a1aa",
      textLight: "#71717a",
      textBubble: "#f4f4f5",
      textHeader: "#d4d4d8",
      textHeaderSelected: "#ffffff",
      bgIconHeader: "#a1a1aa",
      fgIconHeader: "#18181b",
      bgCell: "#222226",
      bgCellMedium: "#2a2a2e",
      bgHeader: "#2a2a2e",
      bgHeaderHasFocus: "#34343a",
      bgHeaderHovered: "#303036",
      bgBubble: "#3f3f46",
      bgBubbleSelected: "#1e3a5f",
      bgSearchResult: "#3f3a1e",
      borderColor: "rgba(255,255,255,0.08)",
      horizontalBorderColor: "rgba(255,255,255,0.06)",
    };
  }
  return {
    ...shared,
    textDark: "#171717",
    textMedium: "#525252",
    textLight: "#a3a3a3",
    textBubble: "#171717",
    textHeader: "#404040",
    textHeaderSelected: "#171717",
    bgIconHeader: "#737373",
    fgIconHeader: "#ffffff",
    bgCell: "#ffffff",
    bgCellMedium: "#f6f6f6",
    bgHeader: "#fafafa",
    bgHeaderHasFocus: "#f0f0f0",
    bgHeaderHovered: "#f3f3f3",
    bgBubble: "#f4f4f5",
    bgBubbleSelected: "#e7f3ff",
    bgSearchResult: "#fff4cc",
    borderColor: "rgba(0,0,0,0.08)",
    horizontalBorderColor: "rgba(0,0,0,0.06)",
  };
}

function emptySelection() {
  return {
    columns: CompactSelection.empty(),
    rows: CompactSelection.empty(),
  };
}

export default function DashboardSheetGridInner({ block, onChange, readOnly = false }) {
  const canvas = useWorkspaceCanvas();
  const dark = useHtmlDarkClass();
  const frameRef = useRef(null);
  const editorRef = useRef(null);
  const [gridSelection, setGridSelection] = useState(emptySelection);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [fontFamily, setFontFamily] = useState("ui-sans-serif, system-ui, sans-serif");
  const columns = useMemo(() => columnsOf(block), [block?.columns]);
  const cells = block?.cells || {};
  const storedSheet = useReadyTradeSheet(block?.id);
  const fullSheet = usesHistoricalTradeSheet(block) ? storedSheet : null;
  const rows = fullSheet ? fullSheet.rows.length : rowCountOf(cells);

  useEffect(() => {
    const next = getComputedStyle(document.body).fontFamily;
    if (next) setFontFamily(next);
  }, []);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return undefined;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      const width = Math.floor(rect.width);
      const height = Math.floor(rect.height);
      setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const getCellContent = useCallback(
    ([col, row]) => {
      const value = fullSheet
        ? String(fullSheet.rows[row]?.[col] ?? "")
        : String(cells[`${col},${row}`] ?? "");
      return {
        kind: GridCellKind.Text,
        data: value,
        displayData: value,
        allowOverlay: true,
      };
    },
    [cells, fullSheet],
  );

  const onCellEdited = useCallback(
    ([col, row], newValue) => {
      if (newValue.kind !== GridCellKind.Text) return;
      const value = String(newValue.data ?? "");
      if (fullSheet) {
        const line = fullSheet.rows[row];
        if (line) line[col] = value;
        return;
      }
      const key = `${col},${row}`;
      const next = { ...cells };
      if (value) next[key] = value;
      else delete next[key];
      onChange?.({ cells: next });
    },
    [cells, fullSheet, onChange],
  );

  useEffect(() => {
    const focus = canvas?.sheetRowFocus;
    if (!focus || focus.sheetId !== block?.id || !Number.isFinite(focus.row)) return;
    if (size.width <= 0) return;
    const row = focus.row;
    const width = Math.max(1, columns.length);
    setGridSelection({
      current: {
        cell: [0, row],
        range: { x: 0, y: row, width, height: 1 },
        rangeStack: [],
      },
      columns: CompactSelection.empty(),
      rows: CompactSelection.fromSingleSelection(row),
    });
    editorRef.current?.scrollTo(0, row, "both", 0, 0, { vAlign: "center" });
  }, [block?.id, canvas?.sheetRowFocus, columns.length, size.width]);

  const onColumnResize = useCallback(
    (_column, newSize, colIndex) => {
      onChange?.({
        columns: columns.map((column, index) =>
          index === colIndex ? { ...column, width: newSize } : column,
        ),
      });
    },
    [columns, onChange],
  );

  return (
    <div ref={frameRef} data-sheet-grid="" className="min-h-0 flex-1 overflow-hidden">
      {size.width > 0 && size.height > 0 ? (
        <DataEditor
          ref={editorRef}
          width={size.width}
          height={size.height}
          gridSelection={gridSelection}
          onGridSelectionChange={setGridSelection}
          initialSize={[size.width, size.height]}
          columns={columns}
          rows={rows}
          getCellContent={getCellContent}
          onCellEdited={readOnly ? undefined : onCellEdited}
          minColumnWidth={64}
          maxColumnWidth={1600}
          onColumnResize={onColumnResize}
          rowMarkers="number"
          headerHeight={32}
          rowHeight={28}
          theme={themeFor(dark, fontFamily)}
          smoothScrollX
          smoothScrollY
          getCellsForSelection
        />
      ) : null}
    </div>
  );
}
