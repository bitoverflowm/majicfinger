/** Price History sheets chart `p` against time. Indicator panes can be added later. */

export function isPriceHistorySheet(sheet) {
  if (!sheet || sheet.type === "chart") return false;
  const table = String(sheet.table || "");
  if (table === "getBatchPricesHistory" || table === "getTokenPriceHistory") return true;
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
  const text = String(timestamp ?? "").trim();
  const asNumber = Number(text);
  if (text && Number.isFinite(asNumber) && asNumber > 1e8) {
    return asNumber > 1e12 ? asNumber : asNumber * 1000;
  }
  const stamped = Date.parse(text);
  if (text && Number.isFinite(stamped)) return stamped;
  const seconds = Number(String(unixSeconds ?? "").trim());
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return seconds > 1e12 ? seconds : seconds * 1000;
}

function pickIndex(columns, ids) {
  for (const id of ids) {
    if (!id) continue;
    const index = columnIndex(columns, id);
    if (index >= 0) return index;
  }
  return -1;
}

/**
 * One point per filled price row, oldest first.
 * @param {object | null | undefined} sheet
 * @returns {{ t: number, price: number }[]}
 */
export function priceHistoryPoints(sheet) {
  const columns = Array.isArray(sheet?.columns) ? sheet.columns : [];
  const cells = sheet?.cells || {};
  const tokenHistory = String(sheet?.table || "") === "getTokenPriceHistory";
  const timeIndex = pickIndex(columns, tokenHistory ? ["observed_at", "timestamp"] : ["timestamp", "observed_at"]);
  const unixIndex = pickIndex(columns, tokenHistory ? ["timestamp", "t"] : ["t", "timestamp"]);
  const priceIndex = pickIndex(columns, tokenHistory ? ["price", "p"] : ["p", "price"]);
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

/** The outcome label when every price row shares one. */
export function priceHistoryOutcome(sheet) {
  const index = columnIndex(sheet?.columns, "outcome");
  if (index < 0) return "";
  const cells = sheet?.cells || {};
  let found = "";
  for (const [key, value] of Object.entries(cells)) {
    if (Number(String(key).split(",")[0]) !== index) continue;
    const text = String(value ?? "").trim();
    if (!text) continue;
    if (!found) found = text;
    else if (found !== text) return "";
  }
  return found;
}
