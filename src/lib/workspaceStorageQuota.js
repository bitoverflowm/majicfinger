/** Included workspace storage for Elite + Lifetime (display + quota enforcement hooks). */
export const ELITE_WORKSPACE_CAP_BYTES = 10 * 1024 * 1024 * 1024;

/** Planning assumption for “~rows” copy (tabular JSON ≈ 0.5–2 KB/row). */
export const WORKSPACE_ASSUMED_BYTES_PER_ROW = 1024;

function estimateJsonBytes(value) {
  try {
    const text = JSON.stringify(value ?? null);
    if (typeof TextEncoder !== "undefined") {
      return new TextEncoder().encode(text).length;
    }
    return Buffer.byteLength(text, "utf8");
  } catch {
    return 0;
  }
}

/**
 * In-memory workspace usage only (loaded grid rows), not Mongo saved-project totals.
 * @param {Record<string, object> | null | undefined} dataSheets
 * @param {unknown[] | null | undefined} connectedData
 */
export function summarizeSessionWorkspaceUsage(dataSheets, connectedData) {
  let usedBytes = 0;
  let rowCount = 0;
  let sheetsWithData = 0;

  const sheets = dataSheets && typeof dataSheets === "object" ? dataSheets : {};
  for (const sheet of Object.values(sheets)) {
    const rows = Array.isArray(sheet?.data) ? sheet.data : [];
    if (!rows.length) continue;
    sheetsWithData += 1;
    rowCount += rows.length;
    usedBytes += estimateJsonBytes(rows);
  }

  if (rowCount === 0 && Array.isArray(connectedData) && connectedData.length > 0) {
    rowCount = connectedData.length;
    usedBytes = estimateJsonBytes(connectedData);
    sheetsWithData = 1;
  }

  return { usedBytes, rowCount, sheetsWithData };
}

/**
 * @param {{
 *   connectedData?: unknown[] | null;
 *   dataSheets?: Record<string, object> | null;
 *   chartDataOverride?: unknown;
 *   viewing?: string | null;
 * }} args
 */
export function workspaceHasDisplayableData({ connectedData, dataSheets, chartDataOverride, viewing }) {
  if (viewing === "charts" && chartDataOverride) return true;
  if (Array.isArray(connectedData) && connectedData.length > 0) return true;
  const sheets = dataSheets && typeof dataSheets === "object" ? dataSheets : {};
  return Object.values(sheets).some((sheet) => Array.isArray(sheet?.data) && sheet.data.length > 0);
}

/**
 * @param {object | null | undefined} userLike - merged `/api/user` payload
 * @returns {boolean}
 */
export function userGetsWorkspaceQuotaMeter(userLike) {
  if (!userLike || typeof userLike !== "object") return false;
  if (userLike.lifetimeMember) return true;
  return String(userLike.subscriptionTier || "").toLowerCase() === "elite";
}

/**
 * Circle fill color for usage % (no text label — color only).
 * Bands: comfortable under 75%, getting full 75–89%, near limit 90%+.
 * @param {number} pct 0–100
 * @returns {string} CSS color
 */
export function workspaceUsageIndicatorColor(pct) {
  const p = Math.max(0, Math.min(100, Number(pct) || 0));
  if (p >= 90) return "rgb(239 68 68)"; // red
  if (p >= 75) return "rgb(245 158 11)"; // amber
  return "rgb(16 185 129)"; // emerald
}
