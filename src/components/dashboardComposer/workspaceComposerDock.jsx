"use client";

import { createContext, useCallback, useContext, useLayoutEffect, useRef, useState } from "react";
import { useMyStateV2 } from "@/context/stateContextV2";
import { CONNECT_HOME_CENTER_VIEW } from "@/lib/connectHomeFlow";
import { createEmptyDashboardLayout, DEFAULT_CHART_CARD_ROW_SPAN } from "@/lib/dashboardLayoutDefaults";
import { DASHBOARD_FREE_TEXT_PLACEHOLDER } from "@/lib/dashboardFreeTextTheme";
import {
  createCardGridRow,
  getSheetColumnNames,
  inferCardGridFieldMappings,
} from "@/lib/dashboardCardGrid";
import { WorkspaceCanvasProvider } from "@/components/dashboardComposer/workspaceCanvas";
import { WorkspaceDock } from "@/components/dashboardComposer/workspaceDock";
import { IntegrationConnectProvider } from "@/components/dashboardComposer/integrationConnectDialog";

const DockInsetContext = createContext(() => {});

function rid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function clampChartColSpan(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 12;
  return Math.min(12, Math.max(1, Math.round(x)));
}

function sumChartRowColSpans(columns) {
  if (!Array.isArray(columns)) return 0;
  return columns.reduce((s, c) => s + clampChartColSpan(c?.colSpan), 0);
}

function emptyColumn(overrides = {}) {
  return {
    id: rid("col"),
    chart_id: null,
    colSpan: 12,
    rowSpan: DEFAULT_CHART_CARD_ROW_SPAN,
    h2: "",
    caption: "",
    microtext: "",
    link: { mode: "none", url: "" },
    ...overrides,
  };
}

function computeRowsAfterAddChart(layout) {
  const base = layout && typeof layout === "object" ? layout : createEmptyDashboardLayout();
  const rows = Array.isArray(base.rows) ? [...base.rows] : [];

  let lastCardsIdx = -1;
  for (let i = rows.length - 1; i >= 0; i--) {
    if (rows[i]?.type === "cards" && Array.isArray(rows[i].columns)) {
      lastCardsIdx = i;
      break;
    }
  }

  if (lastCardsIdx < 0) {
    const rowId = rid("row");
    const col = emptyColumn({ colSpan: 12 });
    rows.push({ id: rowId, type: "cards", columns: [col] });
    return { rows, selection: { rowId, colId: col.id } };
  }

  const row = rows[lastCardsIdx];
  const cols = Array.isArray(row.columns) ? [...row.columns] : [];
  const sum = sumChartRowColSpans(cols);

  if (sum < 12) {
    const remaining = 12 - sum;
    const col = emptyColumn({ colSpan: remaining });
    rows[lastCardsIdx] = { ...row, columns: [...cols, col] };
    return { rows, selection: { rowId: row.id, colId: col.id } };
  }

  if (sum === 12 && cols.length === 1 && clampChartColSpan(cols[0].colSpan) === 12) {
    const first = { ...cols[0], colSpan: 6 };
    const col = emptyColumn({ colSpan: 6 });
    rows[lastCardsIdx] = { ...row, columns: [first, col] };
    return { rows, selection: { rowId: row.id, colId: col.id } };
  }

  const rowId = rid("row");
  const col = emptyColumn({ colSpan: 12 });
  rows.push({ id: rowId, type: "cards", columns: [col] });
  return { rows, selection: { rowId, colId: col.id } };
}

function revealDashboardEditor(ctx) {
  const viewing = ctx?.viewing;
  const onDashboard =
    viewing === "dashboardComposer" ||
    (viewing === "connectDataHome" &&
      ctx?.connectHomeCenterView === CONNECT_HOME_CENTER_VIEW.DASHBOARD);
  if (onDashboard) return;
  ctx?.setConnectHomeCenterView?.(CONNECT_HOME_CENTER_VIEW.DASHBOARD);
  ctx?.setViewing?.("dashboardComposer");
}

function useRegisterComposerLayoutActions() {
  const ctx = useMyStateV2();
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;

  const addChart = useCallback(() => {
    const current = ctxRef.current;
    current?.setPageFormatDockTarget?.(null);
    current?.setCardGridComposerDock?.(null);
    const { rows: nextRows, selection } = computeRowsAfterAddChart(current?.chartDashboardDraft?.layout);
    current?.setSelectedDashboardCard?.(selection);
    current?.setChartComposerDock?.(selection);
    current?.setChartPickerEmphasis?.(selection);
    current?.setChartDashboardDraft?.((d) => {
      const cur = d || {};
      const curLayout = cur.layout || createEmptyDashboardLayout();
      return { ...cur, layout: { ...curLayout, rows: nextRows } };
    });
    revealDashboardEditor(current);
  }, []);

  const addText = useCallback((textVariant) => {
    const current = ctxRef.current;
    current?.setPageFormatDockTarget?.(null);
    current?.setCardGridComposerDock?.(null);
    const variant = textVariant === "heading" ? "heading" : "paragraph";
    const newRow = {
      id: rid("row"),
      type: "text",
      textVariant: variant,
      body: DASHBOARD_FREE_TEXT_PLACEHOLDER,
    };
    current?.setChartDashboardDraft?.((d) => {
      const cur = d || {};
      const layout = cur.layout || createEmptyDashboardLayout();
      return { ...cur, layout: { ...layout, rows: [...layout.rows, newRow] } };
    });
    revealDashboardEditor(current);
  }, []);

  const addCards = useCallback(() => {
    const current = ctxRef.current;
    current?.setPageFormatDockTarget?.(null);
    current?.setSelectedDashboardCard?.(null);
    current?.setChartComposerDock?.(null);
    current?.setChartPickerEmphasis?.(null);
    const sheets = current?.dataSheets && typeof current.dataSheets === "object" ? current.dataSheets : {};
    const firstSheetId = Object.keys(sheets)[0] || "";
    const sheet = firstSheetId ? sheets[firstSheetId] : null;
    const sheetRows = Array.isArray(sheet?.data) ? sheet.data : [];
    const columns = getSheetColumnNames(sheet, sheetRows);
    const fields = inferCardGridFieldMappings(columns, sheetRows);
    const newRow = createCardGridRow({ sheetId: firstSheetId, fields });
    current?.setCardGridComposerDock?.({ rowId: newRow.id });
    current?.setChartDashboardDraft?.((d) => {
      const cur = d || {};
      const layout = cur.layout || createEmptyDashboardLayout();
      return { ...cur, layout: { ...layout, rows: [...layout.rows, newRow] } };
    });
    revealDashboardEditor(current);
  }, []);

  useLayoutEffect(() => {
    const setActions = ctxRef.current?.setDashboardComposerLayoutActions;
    setActions?.({ addChart, addText, addCards });
    return () => setActions?.(null);
  }, [addChart, addText, addCards]);
}

/** Publish the editor column rect so the dock stays aligned when a side panel is open. */
export function useDashboardDockInset(inset) {
  const setInset = useContext(DockInsetContext);
  useLayoutEffect(() => {
    setInset(inset ?? null);
    return () => setInset(null);
  }, [inset, setInset]);
}

/**
 * The dashboard editor dock, mounted for the whole workspace.
 * Later views can opt out by not wrapping with this provider.
 */
export function WorkspaceComposerDockProvider({ children }) {
  const ctx = useMyStateV2();
  const pageId =
    ctx?.viewing === "welcome"
      ? `welcome:${ctx?.activeWorkspaceStartTabId || "welcome"}`
      : ctx?.viewing || "workspace";
  const [, setInset] = useState(null);
  useRegisterComposerLayoutActions();
  return (
    <DockInsetContext.Provider value={setInset}>
      <WorkspaceCanvasProvider pageId={pageId}>
        <IntegrationConnectProvider inlineStart={!!ctx?.landingDemo}>
          {children}
          <WorkspaceDock />
        </IntegrationConnectProvider>
      </WorkspaceCanvasProvider>
    </DockInsetContext.Provider>
  );
}
