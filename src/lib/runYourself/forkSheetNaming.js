import { normalizeOperationHistory } from "@/lib/projectPersistence";
import { collectLakePullSheetIds } from "@/lib/runYourself/patchDashboardChartSheets";
import { slugifyForkTabName } from "@/lib/runYourself/forkPresentation";

/**
 * @param {object} sheet
 * @returns {string | null}
 */
function inferAnalysisLabelFromOperations(sheet) {
  const hist = normalizeOperationHistory(sheet).filter((op) => op?.type && op.type !== "source.compose");
  if (!hist.length) return null;

  /** @type {string[]} */
  const parts = [];

  for (const op of hist) {
    if (op.type === "bucket.sheet") {
      const mode = String(op.bucketMode || "time");
      const aggs = Array.isArray(op.aggregations) ? op.aggregations : [];
      const fns = aggs
        .map((a) => String(a?.fn || a?.aggregate || a?.function || "").toLowerCase())
        .filter(Boolean);
      const hasAvg = fns.some((f) => f === "avg" || f === "mean");
      const hasVwap = fns.some((f) => f.includes("vwap")) || aggs.some((a) =>
        String(a?.column || "").toLowerCase().includes("vwap"),
      );

      if (hasVwap || (mode === "time" && hasAvg)) {
        parts.push("probability_vwap_convergence");
      } else if (mode === "time") {
        parts.push("time_buckets");
      } else if (mode === "numeric") {
        const col = slugifyForkTabName(op.bucketColumn || "value", 24);
        parts.push(`${col}_buckets`);
      } else {
        parts.push("bucketed_analysis");
      }
      continue;
    }
    if (op.type === "aggregate") {
      parts.push("aggregate");
      continue;
    }
    if (op.type === "join.sheet") {
      parts.push("joined");
      continue;
    }
    if (op.type === "select.columns") {
      parts.push("selected_columns");
      continue;
    }
    if (op.type === "filter.rows") {
      parts.push("filtered");
      continue;
    }
    if (op.type === "sort.rows" || op.type === "limit.rows") {
      continue;
    }
    const typeSlug = slugifyForkTabName(String(op.type).replace(/\./g, "_"), 32);
    if (typeSlug) parts.push(typeSlug);
  }

  const meaningful = parts.filter((p) => p !== "selected_columns" && p !== "filtered");
  if (meaningful.length) return meaningful[0];
  if (parts.length) return parts[0];
  return "analysis";
}

/**
 * @param {object} sheet
 * @param {object} presentation
 * @param {boolean} multiplePulls
 */
function nameLakePullSheet(sheet, presentation, multiplePulls) {
  const table = String(sheet?.provenance?.table || "data").toLowerCase();
  const tableSuffix = table === "markets" ? "markets" : table === "trades" ? "trades" : slugifyForkTabName(table, 20);

  if (presentation.marketLabel) {
    const base = presentation.subjectSlug || slugifyForkTabName(presentation.marketLabel);
    return multiplePulls ? `${base}_${tableSuffix}` : `${base}_${tableSuffix}`;
  }
  if (presentation.categoryLabel) {
    const cat = slugifyForkTabName(presentation.categoryLabel, 24);
    return `${presentation.analysisSlug}_${cat}_${tableSuffix}`;
  }
  const base = presentation.subjectSlug || presentation.analysisSlug;
  return multiplePulls ? `${base}_${tableSuffix}` : `${base}_${tableSuffix}`;
}

/**
 * @param {object} sheet
 * @param {object} presentation
 * @param {number} derivedIndex
 */
function nameDerivedSheet(sheet, presentation, derivedIndex) {
  const cards = Array.isArray(sheet?.requestCards) ? sheet.requestCards : [];
  for (const card of cards) {
    const label = String(card?.title || card?.label || card?.name || "").trim();
    if (label) return slugifyForkTabName(label, 64);
  }

  const fromOps = inferAnalysisLabelFromOperations(sheet);
  if (fromOps) return fromOps;

  if (derivedIndex === 1 && presentation.analysisSlug) {
    return `${presentation.analysisSlug}_analysis`;
  }
  return `analysis_${derivedIndex}`;
}

/**
 * Rename forked sheet tabs from pull parameter + operation history (preserves sheet ids).
 *
 * @param {{
 *   dataSheets: Record<string, object>;
 *   sheetOrder: string[];
 *   presentation: ReturnType<typeof import("@/lib/runYourself/forkPresentation").buildForkPresentationContext>;
 * }} opts
 */
export function renameForkedSheets({ dataSheets, sheetOrder, presentation }) {
  const sheets = { ...(dataSheets || {}) };
  /** @type {Set<string>} */
  const lakePullIds = new Set();
  for (const sheetId of sheetOrder) {
    collectLakePullSheetIds(sheets, sheetId, lakePullIds);
  }

  let derivedIndex = 0;
  for (const sheetId of sheetOrder) {
    const sheet = sheets[sheetId];
    if (!sheet) continue;

    let name;
    if (lakePullIds.has(sheetId)) {
      name = nameLakePullSheet(sheet, presentation, lakePullIds.size > 1);
    } else {
      derivedIndex += 1;
      name = nameDerivedSheet(sheet, presentation, derivedIndex);
    }
    sheets[sheetId] = { ...sheet, name: String(name || sheet.name || sheetId).slice(0, 80) };
  }
  return sheets;
}
