import {
  formatConnectRequestCardQuery,
  integrationLabelFromLake,
} from "@/lib/connectHomeRequestQuery";
import { getRunYourselfAnalysisById } from "@/config/runYourselfAnalyses";

/** @typedef {{ sheetId: string; sheet: object; cards: object[]; rowCount: number }} ConnectHomeSheetHistoryEntry */

export { integrationLabelFromLake };

const CATEGORY_FILTER_COLUMNS = new Set([
  "kalshi_taxonomy_category",
  "category",
  "kalshi_event_ticker_category",
  "subcategory",
  "tags",
]);

const TICKER_FILTER_COLUMNS = new Set([
  "ticker",
  "market_ticker",
  "event_ticker",
  "market",
  "market_id",
]);

function normalizeFilterColumn(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");
}

function labelForFilterColumn(column) {
  const n = normalizeFilterColumn(column);
  if (CATEGORY_FILTER_COLUMNS.has(n)) return "Category";
  if (TICKER_FILTER_COLUMNS.has(n) || n.endsWith("_ticker")) return "Market";
  return String(column || "").trim() || "Filter";
}

function collectProvenanceFilters(provenance) {
  /** @type {object[]} */
  const out = [];
  const composeFilters = provenance?.composeFilters;
  if (composeFilters && typeof composeFilters === "object") {
    for (const key of ["and", "or"]) {
      const arr = Array.isArray(composeFilters[key]) ? composeFilters[key] : [];
      out.push(...arr);
    }
  }
  const where = provenance?.composeSpec?.where;
  if (Array.isArray(where)) out.push(...where);
  return out;
}

export function sortConnectSheetIds(dataSheets) {
  return Object.keys(dataSheets || {}).sort((a, b) => {
    const na = parseInt(String(a).replace(/\D/g, ""), 10) || 0;
    const nb = parseInt(String(b).replace(/\D/g, ""), 10) || 0;
    return na - nb;
  });
}

/** Sheets with loaded rows and/or saved request cards (cross-integration history). */
export function listConnectHomeSheetHistory(dataSheets) {
  /** @type {ConnectHomeSheetHistoryEntry[]} */
  const out = [];
  for (const sheetId of sortConnectSheetIds(dataSheets)) {
    const sheet = dataSheets[sheetId];
    if (!sheet) continue;
    const cards = Array.isArray(sheet.requestCards) ? sheet.requestCards.filter((c) => c?.id) : [];
    const rowCount = Array.isArray(sheet.data) ? sheet.data.length : 0;
    if (rowCount === 0 && cards.length === 0) continue;
    out.push({ sheetId, sheet, cards, rowCount });
  }
  return out;
}

/** @param {object | null | undefined} meta Loaded project / DataSet document */
export function isRunYourselfForkProject(meta) {
  if (!meta || typeof meta !== "object") return false;
  if (meta.forked_from_user_id || meta.run_yourself_analysis_id) return true;
  return Array.isArray(meta.labels) && meta.labels.includes("run-yourself");
}

/**
 * @param {object | null | undefined} meta
 * @returns {{ handle: string | null; analysisLabel: string | null; line: string } | null}
 */
export function describeForkProject(meta) {
  if (!isRunYourselfForkProject(meta)) return null;

  const handle = String(meta.forked_from_user_handle || "").trim() || null;
  const analysisId = String(meta.run_yourself_analysis_id || "").trim();
  const analysis = analysisId ? getRunYourselfAnalysisById(analysisId) : null;
  const analysisLabel = analysis?.label ? String(analysis.label).trim() : null;

  let line = "Run for yourself fork";
  if (handle && analysisLabel) line = `Forked from @${handle} · ${analysisLabel}`;
  else if (handle) line = `Forked from @${handle}`;
  else if (analysisLabel) line = `Run for yourself · ${analysisLabel}`;

  return { handle, analysisLabel, line };
}

/** Human-readable parameter lines (e.g. Category · Science/Tech) from sheet provenance. */
export function extractSheetVariationLines(provenance) {
  const filters = collectProvenanceFilters(provenance);
  /** @type {string[]} */
  const lines = [];
  const seen = new Set();

  for (const f of filters) {
    const col = String(f?.column ?? f?.field ?? "").trim();
    const op = String(f?.op || "").trim();
    if (!col || (op !== "eq" && op !== "in")) continue;

    const label = labelForFilterColumn(col);
    let value = "";
    if (op === "eq") {
      const v = f?.value;
      if (v == null || String(v).trim() === "") continue;
      value = String(v).trim();
    } else {
      const vals = Array.isArray(f?.value) ? f.value : [];
      const cleaned = vals.map((v) => String(v).trim()).filter(Boolean);
      if (!cleaned.length) continue;
      value = cleaned.join(", ");
    }

    const key = `${label}:${value}`;
    if (seen.has(key)) continue;
    seen.add(key);
    lines.push(`${label} · ${value}`);
  }

  return lines;
}

export function requestCardSummaryLabel(card, sheet) {
  const summary = formatConnectRequestCardQuery(card, sheet);
  if (summary) {
    const first = summary.split(" · ")[0];
    return first || summary;
  }
  const prov = sheet?.provenance;
  const lake = prov?.lake || card?.lake;
  const table = prov?.table || card?.table;
  const integration = integrationLabelFromLake(lake);
  if (table) return `${integration} · ${table}`;
  return integration;
}
