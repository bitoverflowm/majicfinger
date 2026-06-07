import { ChartSeoFallback } from "@/components/publicEmbed/ChartSeoFallback";

type ChartPayload = {
  chart?: { chart_name?: string };
  rows?: unknown[];
  dataSheets?: Record<string, { data?: unknown[] }>;
};

type LayoutRow = {
  type?: string;
  columns?: Array<{
    id?: string;
    chart_id?: string | null;
    h2?: string;
    chartPayload?: ChartPayload | null;
  }>;
};

/** Server-rendered chart accessibility text (kept out of the client hydration tree). */
export function PublicDashboardChartSeoLayer({
  layout,
}: {
  layout?: { rows?: LayoutRow[] };
}) {
  const rows = Array.isArray(layout?.rows) ? layout.rows : [];
  const charts: Array<{ key: string; title: string; payload: ChartPayload }> = [];

  for (const row of rows) {
    if (row?.type !== "cards" || !Array.isArray(row.columns)) continue;
    for (const col of row.columns) {
      if (!col?.chartPayload) continue;
      charts.push({
        key: String(col.id || col.chart_id || charts.length),
        title: String(col.h2 || col.chartPayload.chart?.chart_name || "Chart"),
        payload: col.chartPayload,
      });
    }
  }

  if (!charts.length) return null;

  return (
    <div className="sr-only" aria-hidden="true">
      {charts.map((c) => (
        <ChartSeoFallback key={c.key} title={c.title} chartPayload={c.payload} />
      ))}
    </div>
  );
}
