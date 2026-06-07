import { ChartSeoFallback } from "@/components/publicEmbed/ChartSeoFallback";
import type { PublicDashboardPayload } from "@/lib/server/publicDashboardPayload";

type DashboardLayout = NonNullable<PublicDashboardPayload["data"]>["layout"];

/** Server-rendered chart accessibility text (kept out of the client hydration tree). */
export function PublicDashboardChartSeoLayer({
  layout,
}: {
  layout?: DashboardLayout;
}) {
  const rows = Array.isArray(layout?.rows) ? layout.rows : [];
  const charts: Array<{ key: string; title: string; payload: unknown }> = [];

  for (const row of rows) {
    if (!row || typeof row !== "object" || row.type !== "cards") continue;
    const columns = (row as { columns?: unknown[] }).columns;
    if (!Array.isArray(columns)) continue;
    for (const col of columns) {
      if (!col || typeof col !== "object") continue;
      const column = col as {
        id?: string;
        chart_id?: string | null;
        h2?: string;
        chartPayload?: { chart?: { chart_name?: string }; rows?: unknown[]; dataSheets?: unknown } | null;
      };
      if (!column.chartPayload) continue;
      charts.push({
        key: String(column.id || column.chart_id || charts.length),
        title: String(column.h2 || column.chartPayload.chart?.chart_name || "Chart"),
        payload: column.chartPayload,
      });
    }
  }

  if (!charts.length) return null;

  return (
    <div className="sr-only" aria-hidden="true">
      {charts.map((c) => (
        <ChartSeoFallback
          key={c.key}
          title={c.title}
          chartPayload={c.payload as Parameters<typeof ChartSeoFallback>[0]["chartPayload"]}
        />
      ))}
    </div>
  );
}
