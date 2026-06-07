type ChartPayload = {
  chart?: { chart_name?: string };
  rows?: unknown[];
  dataSheets?: Record<string, { data?: unknown[]; name?: string }>;
};

function sampleRows(payload: ChartPayload | null | undefined, max = 5): unknown[] {
  if (!payload) return [];
  const sheets = payload.dataSheets;
  if (sheets && typeof sheets === "object") {
    for (const sheet of Object.values(sheets)) {
      if (Array.isArray(sheet?.data) && sheet.data.length) {
        return sheet.data.slice(0, max);
      }
    }
  }
  return Array.isArray(payload.rows) ? payload.rows.slice(0, max) : [];
}

function summarizeRows(rows: unknown[]): string {
  if (!rows.length) return "Chart data available after page load.";
  const first = rows[0];
  if (!first || typeof first !== "object") return `${rows.length} data points.`;
  const keys = Object.keys(first as object).slice(0, 4);
  const preview = rows
    .slice(0, 3)
    .map((r) => {
      if (!r || typeof r !== "object") return String(r);
      return keys.map((k) => `${k}: ${(r as Record<string, unknown>)[k] ?? "—"}`).join(", ");
    })
    .join("; ");
  return `${rows.length}+ rows. Sample: ${preview}`;
}

export function ChartSeoFallback({
  title,
  chartPayload,
  id,
}: {
  title: string;
  chartPayload: ChartPayload | null | undefined;
  id?: string;
}) {
  const chartName = chartPayload?.chart?.chart_name || title;
  const rows = sampleRows(chartPayload);
  const summary = summarizeRows(rows);
  const structuredData = {
    name: chartName,
    rowCount: rows.length,
    sample: rows.slice(0, 5),
  };

  return (
    <div className="sr-only" aria-hidden="false">
      <figure aria-label={chartName}>
        <figcaption>{title || chartName}</figcaption>
        <p>{summary}</p>
        <script
          type="application/json"
          id={id ? `chart-data-${id}` : undefined}
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </figure>
    </div>
  );
}
