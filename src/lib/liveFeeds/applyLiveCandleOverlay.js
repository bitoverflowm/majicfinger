/**
 * Overlay on-demand live candle rows onto a published chart payload (no Mongo write).
 * Works even when chart structure has not loaded yet — synthesizes a candlestick config.
 */

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
 * @param {{ sheetId: string; rows: object[] } | null | undefined} overlay
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

  prevSheets[sheetId] = {
    ...prevSheet,
    data: overlay.rows,
    rowCount: overlay.rows.length,
    fullRowCount: overlay.rows.length,
  };

  return {
    ...effectiveBase,
    rows: overlay.rows,
    dataSheets: prevSheets,
  };
}
