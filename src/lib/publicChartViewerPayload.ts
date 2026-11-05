type SheetLike = { data?: unknown[] } & Record<string, unknown>;

export type ViewerChartPayload = {
  chart?: Record<string, unknown> & { chart_name?: string };
  rows?: unknown[];
  rowsSheetId?: string;
  dataSheets?: Record<string, SheetLike>;
};

/**
 * Restore `rows` when the server sent them once via `rowsSheetId` instead of duplicating
 * the sheet's data (see slimChartPayloadForViewer). Safe to call more than once.
 */
export function expandViewerChartPayload<T extends ViewerChartPayload | null | undefined>(payload: T): T {
  if (!payload || !payload.rowsSheetId) return payload;
  if (Array.isArray(payload.rows) && payload.rows.length) return payload;
  const sheet = payload.dataSheets?.[payload.rowsSheetId];
  const rows = Array.isArray(sheet?.data) ? sheet.data : [];
  return { ...payload, rows };
}
