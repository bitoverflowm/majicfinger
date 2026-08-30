import { aggregateBucketRows } from "./aggregateBucketRows.js";
import {
  formatBandPredicateLabel,
  normalizeBandsConfig,
} from "./bandsConfig.js";

function parseBandNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value == null || value === "") return null;
  const n = Number(String(value).trim().replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

/**
 * @param {unknown} raw
 * @param {import("@/lib/sheetOperations/bandsConfig").BandPredicateKind | string} kind
 * @param {object} band
 */
export function valueMatchesBandPredicate(raw, kind, band) {
  const n = parseBandNumber(raw);
  const k = String(kind || "between");

  if (k === "eq") {
    const target = parseBandNumber(band?.value);
    if (n != null && target != null) return n === target;
    return String(raw ?? "") === String(band?.value ?? "");
  }

  if (n == null) return false;

  if (k === "lt") {
    const target = parseBandNumber(band?.value);
    return target != null && n < target;
  }
  if (k === "lte") {
    const target = parseBandNumber(band?.value);
    return target != null && n <= target;
  }
  if (k === "gt") {
    const target = parseBandNumber(band?.value);
    return target != null && n > target;
  }
  if (k === "gte") {
    const target = parseBandNumber(band?.value);
    return target != null && n >= target;
  }

  // between
  const min = parseBandNumber(band?.min);
  const max = parseBandNumber(band?.max);
  if (min != null) {
    const okMin = band?.minInclusive !== false ? n >= min : n > min;
    if (!okMin) return false;
  }
  if (max != null) {
    const okMax = band?.maxInclusive === true ? n <= max : n < max;
    if (!okMax) return false;
  }
  return min != null || max != null;
}

function bandDisplayLabel(band, column) {
  const custom = String(band?.label || "").trim();
  if (custom) return custom;
  return formatBandPredicateLabel(band, column);
}

/**
 * Assign each row to the first matching band, aggregate, and zero-fill empty bands.
 *
 * @param {object[]} rows
 * @param {object} rawConfig
 * @returns {object[]}
 */
export function aggregateBandRows(rows, rawConfig) {
  const config = normalizeBandsConfig(rawConfig);
  const bandColumn = String(config.bandColumn || "").trim();
  const bandOutputColumn = String(config.bandOutputColumn || "band").trim() || "band";
  const bands = Array.isArray(config.bands) ? config.bands : [];
  if (!bandColumn || !bands.length) return [];

  const sourceRows = Array.isArray(rows) ? rows : [];
  const labeled = [];
  for (const row of sourceRows) {
    if (!row || typeof row !== "object") continue;
    let matched = null;
    for (const band of bands) {
      if (valueMatchesBandPredicate(row[bandColumn], band.kind, band)) {
        matched = band;
        break;
      }
    }
    if (!matched) continue;
    labeled.push({
      ...row,
      [bandOutputColumn]: bandDisplayLabel(matched, bandColumn),
    });
  }

  const aggregated = aggregateBucketRows(labeled, {
    bucketColumn: bandOutputColumn,
    bucketOutputColumn: bandOutputColumn,
    bucketMode: "category",
    groupByColumns: config.groupByColumns,
    passthroughColumns: config.passthroughColumns,
    aggregations: config.aggregations,
  });

  return zeroFillBandAggregateRows(aggregated, config);
}

/**
 * Ensure every configured band appears (zeros for empty), preserving band order.
 * Used after Athena CASE+GROUP BY (which omits empty groups) and after client aggregate.
 *
 * @param {object[]} aggregatedRows
 * @param {object} rawConfig
 * @returns {object[]}
 */
export function zeroFillBandAggregateRows(aggregatedRows, rawConfig) {
  const config = normalizeBandsConfig(rawConfig);
  const bandColumn = String(config.bandColumn || "").trim();
  const bandOutputColumn = String(config.bandOutputColumn || "band").trim() || "band";
  const bands = Array.isArray(config.bands) ? config.bands : [];
  const groupBy = Array.isArray(config.groupByColumns) ? config.groupByColumns.filter(Boolean) : [];
  const aggregated = Array.isArray(aggregatedRows) ? aggregatedRows : [];
  if (!bands.length || groupBy.length) return aggregated;

  const byLabel = new Map();
  for (const row of aggregated) {
    const label = String(row?.[bandOutputColumn] ?? "").trim();
    if (label) byLabel.set(label, row);
  }

  const aggCols = (Array.isArray(config.aggregations) ? config.aggregations : [])
    .map((a) => String(a?.outputColumn || "").trim())
    .filter(Boolean);

  return bands.map((band) => {
    const label = bandDisplayLabel(band, bandColumn);
    const existing = byLabel.get(label);
    if (existing) return existing;
    const empty = { [bandOutputColumn]: label };
    for (const col of aggCols) {
      empty[col] = 0;
    }
    return empty;
  });
}
