import {
  clampCardGridRowLimit,
  patchCardGridRowFieldsOnSheetChange,
  getSheetColumnNames,
} from "@/lib/dashboardCardGrid";

export function patchDashboardCardGridRow(setChartDashboardDraft, rowId, partial) {
  setChartDashboardDraft?.((prev) => {
    if (!prev) return prev;
    const layout = prev.layout && typeof prev.layout === "object" ? prev.layout : { version: 1, rows: [] };
    const rows = Array.isArray(layout.rows) ? layout.rows : [];
    const nextRows = rows.map((r) => {
      if (r.id !== rowId || r.type !== "cardGrid") return r;
      return { ...r, ...partial };
    });
    return { ...prev, layout: { ...layout, rows: nextRows } };
  });
}

export function patchDashboardCardGridSheet(
  setChartDashboardDraft,
  rowId,
  sheetId,
  sheet,
) {
  const rows = Array.isArray(sheet?.data) ? sheet.data : [];
  const columns = getSheetColumnNames(sheet, rows);
  setChartDashboardDraft?.((prev) => {
    if (!prev) return prev;
    const layout = prev.layout && typeof prev.layout === "object" ? prev.layout : { version: 1, rows: [] };
    const layoutRows = Array.isArray(layout.rows) ? layout.rows : [];
    const nextRows = layoutRows.map((r) => {
      if (r.id !== rowId || r.type !== "cardGrid") return r;
      const fields = patchCardGridRowFieldsOnSheetChange(r.fields, columns, rows);
      return {
        ...r,
        sheetId: sheetId ? String(sheetId) : "",
        fields,
      };
    });
    return { ...prev, layout: { ...layout, rows: nextRows } };
  });
}

export function patchDashboardCardGridField(
  setChartDashboardDraft,
  rowId,
  fieldSlot,
  partial,
) {
  setChartDashboardDraft?.((prev) => {
    if (!prev) return prev;
    const layout = prev.layout && typeof prev.layout === "object" ? prev.layout : { version: 1, rows: [] };
    const rows = Array.isArray(layout.rows) ? layout.rows : [];
    const nextRows = rows.map((r) => {
      if (r.id !== rowId || r.type !== "cardGrid") return r;
      const prevFields = r.fields && typeof r.fields === "object" ? r.fields : {};
      const prevSlot = prevFields[fieldSlot] && typeof prevFields[fieldSlot] === "object"
        ? prevFields[fieldSlot]
        : {};
      return {
        ...r,
        fields: {
          ...prevFields,
          [fieldSlot]: { ...prevSlot, ...partial },
        },
      };
    });
    return { ...prev, layout: { ...layout, rows: nextRows } };
  });
}

export function patchDashboardCardGridRowLimit(setChartDashboardDraft, rowId, rowLimit) {
  patchDashboardCardGridRow(setChartDashboardDraft, rowId, {
    rowLimit: clampCardGridRowLimit(rowLimit),
  });
}
