/** Client-side progress messages while building published chart snapshot. */
export const CHART_PUBLISH_CACHE_MESSAGES = [
  "Preparing chart data for public view…",
  "Running saved lake queries…",
  "Building chart snapshot…",
  "Applying chart filters…",
  "Large charts can take a minute — still working…",
  "Almost there — finishing public preview…",
];

/** Send in-memory sheet rows from the editor so publish can skip Athena when data is already loaded. */
export function pickWorkspaceDataSheetsForPublish(dataSheets) {
  if (!dataSheets || typeof dataSheets !== "object") return null;
  const out = {};
  for (const [sheetId, sheet] of Object.entries(dataSheets)) {
    if (!sheet || typeof sheet !== "object" || !Array.isArray(sheet.data) || !sheet.data.length) continue;
    out[sheetId] = {
      data: sheet.data,
      columns: sheet.columns,
      name: sheet.name,
      storageMode: sheet.storageMode,
      fullRowCount: sheet.fullRowCount ?? sheet.data.length,
      rowCount: sheet.data.length,
    };
  }
  return Object.keys(out).length ? out : null;
}

/**
 * Build and persist published_bundle on a chart document.
 * @param {string} chartId
 * @param {(pct: number, message: string) => void} [onProgress]
 * @param {Record<string, object> | null} [workspaceDataSheets]
 */
export async function rebuildChartPublishCache(chartId, onProgress, workspaceDataSheets = null) {
  if (!chartId) return { ok: false, message: "Missing chart id" };

  onProgress?.(10, "Checking chart…");
  const planRes = await fetch(`/api/charts/chart/${chartId}/publish-cache`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ step: "plan" }),
  });
  const planJson = await planRes.json().catch(() => null);
  if (!planRes.ok || !planJson?.success) {
    return { ok: false, message: planJson?.message || "Failed to plan chart publish cache" };
  }
  if (!planJson.hasDataSet) {
    return { ok: false, message: "Chart has no dataset" };
  }

  onProgress?.(25, CHART_PUBLISH_CACHE_MESSAGES[0]);
  const materializeRes = await fetch(`/api/charts/chart/${chartId}/publish-cache`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      step: "materialize",
      workspaceDataSheets: workspaceDataSheets || undefined,
    }),
  });
  const materializeJson = await materializeRes.json().catch(() => null);
  if (!materializeRes.ok || !materializeJson?.success) {
    return {
      ok: false,
      message: materializeJson?.message || "Failed to build chart snapshot",
    };
  }

  onProgress?.(90, CHART_PUBLISH_CACHE_MESSAGES[4]);
  const doneRes = await fetch(`/api/charts/chart/${chartId}/publish-cache`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ step: "complete" }),
  });
  const doneJson = await doneRes.json().catch(() => null);
  if (!doneRes.ok || !doneJson?.success) {
    return { ok: false, message: doneJson?.message || "Failed to finalize chart snapshot" };
  }

  onProgress?.(100, "Chart snapshot ready");
  return {
    ok: true,
    materialization_mode: materializeJson.materialization_mode,
    row_count: materializeJson.row_count,
    live_lake: !!materializeJson.live_lake,
    warnings: materializeJson.warnings || [],
  };
}

/**
 * Slow-creep progress while materialize step runs.
 */
export function createChartPublishProgressTicker(bump, getProgress, { min = 30, max = 85 } = {}) {
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
      const message = CHART_PUBLISH_CACHE_MESSAGES[tick % CHART_PUBLISH_CACHE_MESSAGES.length];
      const current = Number.isFinite(Number(getProgress())) ? Number(getProgress()) : min;
      if (current >= max) {
        bump(current, message);
        return;
      }
      const remaining = max - current;
      const step = Math.max(0.2, Math.min(1.2, remaining * 0.06));
      bump(Math.min(max, current + step), message);
    }, 850);
  };

  return { start, stop };
}
