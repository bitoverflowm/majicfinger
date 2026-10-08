/** Price History sheets chart `p` against time. Indicator panes can be added later. */

export function isPriceHistorySheet(sheet) {
  if (!sheet || sheet.type === "chart") return false;
  if (String(sheet.table || "") === "getBatchPricesHistory") return true;
  const ids = new Set((sheet.columns || []).map((column) => String(column?.id || "")));
  return ids.has("p") && (ids.has("timestamp") || ids.has("t"));
}

function columnIndex(columns, id) {
  return (columns || []).findIndex((column) => column?.id === id);
}

function parsePrice(value) {
  const text = String(value ?? "").trim().replace(/,/g, "");
  if (!text) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

function parseTime(timestamp, unixSeconds) {
  const stamped = Date.parse(String(timestamp || "").trim());
  if (Number.isFinite(stamped)) return stamped;
  const seconds = Number(String(unixSeconds ?? "").trim());
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return seconds > 1e12 ? seconds : seconds * 1000;
}

/**
 * One point per filled price row, oldest first.
 * @param {object | null | undefined} sheet
 * @returns {{ t: number, price: number }[]}
 */
export function priceHistoryPoints(sheet) {
  const columns = Array.isArray(sheet?.columns) ? sheet.columns : [];
  const cells = sheet?.cells || {};
  const timeIndex = columnIndex(columns, "timestamp");
  const unixIndex = columnIndex(columns, "t");
  const priceIndex = columnIndex(columns, "p");
  if (priceIndex < 0 || (timeIndex < 0 && unixIndex < 0)) return [];

  const rows = new Set();
  for (const key of Object.keys(cells)) {
    const row = Number(String(key).split(",")[1]);
    if (Number.isFinite(row)) rows.add(row);
  }

  const points = [];
  for (const row of [...rows].sort((a, b) => a - b)) {
    const price = parsePrice(cells[`${priceIndex},${row}`]);
    const t = parseTime(
      timeIndex >= 0 ? cells[`${timeIndex},${row}`] : "",
      unixIndex >= 0 ? cells[`${unixIndex},${row}`] : "",
    );
    if (price == null || t == null) continue;
    points.push({ t, price });
  }
  points.sort((a, b) => a.t - b.t);
  return points;
}
