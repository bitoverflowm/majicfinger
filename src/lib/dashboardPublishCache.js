/** Client-side progress messages while building public dashboard cache. */
export const DASHBOARD_PUBLISH_CACHE_MESSAGES = [
  "Building card grid previews…",
  "Querying Data Lake for card rows…",
  "Preparing charts for public view…",
  "Running saved lake queries for chart data…",
  "Large dashboards can take a minute — still working…",
  "Almost there — finishing public preview cache…",
];

export function collectChartIdsFromDashboardLayout(layout) {
  const ids = [];
  if (!layout || typeof layout !== "object") return ids;
  const rows = Array.isArray(layout.rows) ? layout.rows : [];
  for (const row of rows) {
    if (!row || row.type !== "cards" || !Array.isArray(row.columns)) continue;
    for (const col of row.columns) {
      const cid = col?.chart_id ? String(col.chart_id) : "";
      if (cid && !ids.includes(cid)) ids.push(cid);
    }
  }
  return ids;
}

/**
 * @param {(pct: number, message: string) => void} onProgress
 */
export async function rebuildDashboardPublishCache(dashboardId, layout, onProgress) {
  if (!dashboardId) return { ok: false, message: "Missing dashboard id" };

  const chartIds = collectChartIdsFromDashboardLayout(layout);
  const total = chartIds.length;

  onProgress(89, "Building card grid previews…");
  const cardRes = await fetch(`/api/chart-dashboards/${dashboardId}/publish-cache`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ step: "card_grids" }),
  });
  const cardJson = await cardRes.json().catch(() => null);
  if (!cardRes.ok || !cardJson?.success) {
    return { ok: false, message: cardJson?.message || "Failed to build card grid previews" };
  }

  for (let i = 0; i < total; i += 1) {
    const chartId = chartIds[i];
    const slice = total > 0 ? (i / total) * 8 : 0;
    const pct = Math.min(96, 90 + Math.round(slice));
    const label =
      total > 1
        ? `Preparing chart ${i + 1} of ${total} for public view…`
        : "Preparing chart for public view…";
    onProgress(pct, label);

    const chartRes = await fetch(`/api/chart-dashboards/${dashboardId}/publish-cache`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ step: "chart", chartId }),
    });
    const chartJson = await chartRes.json().catch(() => null);
    if (!chartRes.ok || !chartJson?.success) {
      return {
        ok: false,
        message: chartJson?.message || `Failed to prepare chart ${i + 1}`,
      };
    }
  }

  onProgress(97, "Finalizing public dashboard…");
  const doneRes = await fetch(`/api/chart-dashboards/${dashboardId}/publish-cache`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ step: "complete" }),
  });
  const doneJson = await doneRes.json().catch(() => null);
  if (!doneRes.ok || !doneJson?.success) {
    return { ok: false, message: doneJson?.message || "Failed to finalize public dashboard" };
  }

  return { ok: true, chartCount: total };
}

/**
 * Slow-creep progress + rotating status text while a long step runs.
 */
export function createSaveProjectProgressTicker(bump, getProgress, { min = 88, max = 96 } = {}) {
  let intervalId = null;
  let tick = 0;

  const stop = () => {
    if (intervalId != null) {
      window.clearInterval(intervalId);
      intervalId = null;
    }
    tick = 0;
  };

  const start = () => {
    stop();
    intervalId = window.setInterval(() => {
      tick += 1;
      const message = DASHBOARD_PUBLISH_CACHE_MESSAGES[tick % DASHBOARD_PUBLISH_CACHE_MESSAGES.length];
      const current = Number.isFinite(Number(getProgress())) ? Number(getProgress()) : min;
      if (current >= max) {
        bump(current, message);
        return;
      }
      const remaining = max - current;
      const step = Math.max(0.15, Math.min(0.9, remaining * 0.06));
      bump(Math.min(max, current + step), message);
    }, 850);
  };

  return { start, stop };
}
