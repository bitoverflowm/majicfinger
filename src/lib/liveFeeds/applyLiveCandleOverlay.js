/**
 * Overlay on-demand live candle rows onto a published chart payload (no Mongo write).
 * Works even when chart structure has not loaded yet — synthesizes a candlestick config.
 * Merges by end_period_ts so published/seeded history is kept when live returns a window.
 */

/** Match publicLiveLookbackPeriods without importing the server cache module. */
function lookbackPeriodsForInterval(periodIntervalMinutes) {
  const m = Math.floor(Number(periodIntervalMinutes)) || 1;
  if (m === 1) return 360;
  if (m === 60) return 168;
  if (m === 1440) return 180;
  return 360;
}

/**
 * @param {object | null | undefined} payload
 * @returns {object | null}
 */
function readRechartsBuilder(payload) {
  const direct = payload?.chart?.rechartsBuilder;
  if (direct && typeof direct === "object" && direct.v === 1) return direct;
  const cp0 =
    Array.isArray(payload?.chart?.chart_properties) && payload.chart.chart_properties[0]
      ? payload.chart.chart_properties[0]
      : null;
  const nested = cp0?.rechartsBuilder;
  if (nested && typeof nested === "object" && nested.v === 1) return nested;
  return null;
}

/**
 * @param {unknown} value
 * @returns {number | null}
 */
function normalizeEndPeriodTs(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

/**
 * Upsert candle rows by end_period_ts; keep newest softRowCap.
 * @param {Record<string, unknown>[]} existing
 * @param {Record<string, unknown>[]} incoming
 * @param {number} softRowCap
 */
function mergeCandlesByEndPeriodTs(existing, incoming, softRowCap) {
  /** @type {Map<number, Record<string, unknown>>} */
  const byTs = new Map();
  for (const row of Array.isArray(existing) ? existing : []) {
    const ts = normalizeEndPeriodTs(row?.end_period_ts);
    if (ts == null) continue;
    byTs.set(ts, { ...row, end_period_ts: ts });
  }
  for (const row of Array.isArray(incoming) ? incoming : []) {
    const ts = normalizeEndPeriodTs(row?.end_period_ts);
    if (ts == null) continue;
    const prev = byTs.get(ts);
    byTs.set(ts, prev ? { ...prev, ...row, end_period_ts: ts } : { ...row, end_period_ts: ts });
  }
  let rows = [...byTs.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, row]) => row);
  const cap = Math.max(1, Math.floor(Number(softRowCap)) || 360);
  if (rows.length > cap) rows = rows.slice(rows.length - cap);
  return rows;
}

/**
 * @param {object | null | undefined} payload
 * @param {string} [preferred]
 */
export function resolveLiveCandleSheetId(payload, preferred) {
  const preferredId = String(preferred || "").trim();
  if (preferredId) return preferredId;
  return String(readRechartsBuilder(payload)?.candlestickSheetId || "").trim();
}

/**
 * @param {object | null | undefined} payload
 */
export function hasCandlestickChartConfig(payload) {
  const rb = readRechartsBuilder(payload);
  return !!rb && String(rb.selChartType || "") === "candlestick";
}

/**
 * @param {{ sheetId: string; rows: object[] }} overlay
 * @param {object | null | undefined} [seed]
 */
export function synthesizeLiveCandlestickBase(overlay, seed) {
  const sheetId =
    String(overlay?.sheetId || "").trim() ||
    resolveLiveCandleSheetId(seed) ||
    "sheet-1";
  const seedName =
    typeof seed?.chart?.chart_name === "string" && seed.chart.chart_name.trim()
      ? seed.chart.chart_name.trim()
      : "Candlesticks";
  return {
    chart: {
      chart_name: seedName,
      rechartsBuilder: {
        v: 1,
        selChartType: "candlestick",
        candlestickSheetId: sheetId,
        candlestickOhlcSetId: "auto",
        titleHidden: true,
        subTitleHidden: true,
        selX: null,
        selY: [],
      },
    },
    rows: [],
    dataSheets: {
      [sheetId]: { name: sheetId, data: [] },
    },
  };
}

/**
 * @param {object | null | undefined} base
 * @param {{ sheetId: string; rows: object[]; periodInterval?: number } | null | undefined} overlay
 * @returns {object | null}
 */
export function applyLiveCandleOverlay(base, overlay) {
  if (!overlay?.rows?.length) return base ?? null;

  const effectiveBase =
    base && hasCandlestickChartConfig(base)
      ? base
      : synthesizeLiveCandlestickBase(overlay, base);

  const sheetId = resolveLiveCandleSheetId(effectiveBase, overlay.sheetId);
  if (!sheetId) return effectiveBase;

  const prevSheets =
    effectiveBase.dataSheets && typeof effectiveBase.dataSheets === "object"
      ? { ...effectiveBase.dataSheets }
      : {};
  const prevSheet =
    prevSheets[sheetId] && typeof prevSheets[sheetId] === "object"
      ? prevSheets[sheetId]
      : { name: sheetId };

  const existing = Array.isArray(prevSheet.data) ? prevSheet.data : [];
  const lookback = lookbackPeriodsForInterval(overlay.periodInterval);
  const softRowCap = Math.max(lookback, overlay.rows.length, 360);
  const merged = mergeCandlesByEndPeriodTs(existing, overlay.rows, softRowCap);

  prevSheets[sheetId] = {
    ...prevSheet,
    data: merged,
    rowCount: merged.length,
    fullRowCount: merged.length,
  };

  return {
    ...effectiveBase,
    rows: merged,
    dataSheets: prevSheets,
  };
}
