import type { PublicDashboardPayload } from "@/lib/server/publicDashboardPayload";

/** Strip heavy chart rows / sheet data so RSC props stay small (charts load via API). */
export function stripDashboardPayloadChartData(
  payload: PublicDashboardPayload,
): PublicDashboardPayload {
  if (!payload.success || !payload.data) return payload;

  const rows = Array.isArray(payload.data.layout?.rows) ? payload.data.layout.rows : [];
  const nextRows = rows.map((row) => {
    if (!row || typeof row !== "object") return row;

    if (row.type === "cardGrid") {
      const { sheetRows: _sheetRows, ...rest } = row as { sheetRows?: unknown[]; [k: string]: unknown };
      return rest;
    }

    if (row.type === "cards" && Array.isArray((row as { columns?: unknown[] }).columns)) {
      const columns = (row as { columns: Array<Record<string, unknown>> }).columns.map((col) => {
        const chart = (col.chartPayload as { chart?: { chart_name?: string } } | null)?.chart;
        return {
          ...col,
          chartPayload: chart
            ? { chart: { chart_name: chart.chart_name || "" }, rows: [], dataSheets: {} }
            : null,
        };
      });
      return { ...row, columns };
    }

    return row;
  });

  return {
    ...payload,
    data: {
      ...payload.data,
      layout: { ...(payload.data.layout || {}), rows: nextRows as typeof rows },
    },
  };
}
