/** Price History sheets chart `p` against time. Indicator panes can be added later. */

import { sheetRecords } from "@/lib/visualizations/datasetDescriptor";

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
  return readPoints(sheet).map(({ t, price }) => ({ t, price }));
}

function readPoints(sheet) {
  const columns = Array.isArray(sheet?.columns) ? sheet.columns : [];
  const tokenHistory = String(sheet?.table || "") === "getTokenPriceHistory";
  const timeIndex = pickIndex(columns, tokenHistory ? ["observed_at", "timestamp"] : ["timestamp", "observed_at"]);
  const unixIndex = pickIndex(columns, tokenHistory ? ["timestamp", "t"] : ["t", "timestamp"]);
  const priceIndex = pickIndex(columns, tokenHistory ? ["price", "p"] : ["p", "price"]);
  if (priceIndex < 0 || (timeIndex < 0 && unixIndex < 0)) return [];
  const timeKey = timeIndex >= 0 ? columns[timeIndex]?.id : "";
  const unixKey = unixIndex >= 0 ? columns[unixIndex]?.id : "";
  const priceKey = columns[priceIndex]?.id;
  const outcomeIndex = columnIndex(columns, "outcome");
  const outcomeKey = outcomeIndex >= 0 ? columns[outcomeIndex]?.id : "";

  const points = [];
  for (const row of sheetRecords(sheet)) {
    const price = parsePrice(priceKey ? row?.[priceKey] : "");
    const t = parseTime(timeKey ? row?.[timeKey] : "", unixKey ? row?.[unixKey] : "");
    if (price == null || t == null) continue;
    points.push({ t, price, outcome: outcomeKey ? String(row?.[outcomeKey] ?? "").trim() : "" });
  }
  points.sort((a, b) => a.t - b.t);
  return points;
}

function outcomeRank(outcome) {
  const key = outcome.toLowerCase();
  if (key === "yes") return 0;
  if (key === "no") return 1;
  return 2;
}

/**
 * One line per outcome, Yes first and No second.
 * A sheet without an outcome column is one unnamed line.
 * @param {object | null | undefined} sheet
 * @returns {{ outcome: string, points: { t: number, price: number }[] }[]}
 */
export function priceHistoryLines(sheet) {
  const byOutcome = new Map();
  for (const point of readPoints(sheet)) {
    const list = byOutcome.get(point.outcome);
    const entry = { t: point.t, price: point.price };
    if (list) list.push(entry);
    else byOutcome.set(point.outcome, [entry]);
  }
  return [...byOutcome.entries()]
    .map(([outcome, points]) => ({ outcome, points }))
    .sort((a, b) => outcomeRank(a.outcome) - outcomeRank(b.outcome));
}

/** The outcome label when every price row shares one. */
export function priceHistoryOutcome(sheet) {
  const index = columnIndex(sheet?.columns, "outcome");
  if (index < 0) return "";
  const key = sheet.columns[index]?.id;
  if (!key) return "";
  let found = "";
  for (const row of sheetRecords(sheet)) {
    const text = String(row?.[key] ?? "").trim();
    if (!text) continue;
    if (!found) found = text;
    else if (found !== text) return "";
  }
  return found;
}
