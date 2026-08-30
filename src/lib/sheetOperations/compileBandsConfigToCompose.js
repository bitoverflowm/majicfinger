/**
 * Compile research-tool Bands into Athena compose select items:
 * CASE WHEN … THEN 'band label' … END + COUNT/SUM/… + GROUP BY.
 *
 * When compilation is not possible (passthrough, conditional aggs, etc.),
 * callers keep the existing post-pull aggregateBandRows path.
 */

import { genComposeRowId } from "@/lib/dataLakeComposeHelpers";
import {
  formatBandPredicateLabel,
  normalizeBandsConfig,
} from "@/lib/sheetOperations/bandsConfig";

/** Aggregations we can push to Athena compose. */
const ATHENA_AGG_TYPE = {
  count: "count",
  count_distinct: "count_distinct",
  sum: "sum",
  average: "avg",
  avg: "avg",
  min: "min",
  max: "max",
  median: "median",
  std_dev: "stddev",
  stddev: "stddev",
};

/**
 * @param {object | null | undefined} bucketConfig — hub bucketConfig tab (activeMode + bandsConfig)
 * @returns {boolean}
 */
export function canCompileBandsConfigToAthena(bucketConfig) {
  if (!bucketConfig || typeof bucketConfig !== "object") return false;
  if (bucketConfig.activeMode !== "bands") return false;
  const config = normalizeBandsConfig(bucketConfig.bandsConfig);
  const bandColumn = String(config.bandColumn || "").trim();
  if (!bandColumn || !config.bands?.length) return false;

  const passthrough = (config.passthroughColumns || []).filter(Boolean);
  if (passthrough.length) return false;

  const extraGroupBy = (config.groupByColumns || []).filter(Boolean);
  if (extraGroupBy.length) return false;

  for (const band of config.bands) {
    if (!bandPredicateCompilable(band)) return false;
  }

  const aggs = Array.isArray(config.aggregations) ? config.aggregations : [];
  if (!aggs.length) return false;
  for (const agg of aggs) {
    if (!agg || typeof agg !== "object") return false;
    if (agg.filterEnabled) return false;
    const mapped = ATHENA_AGG_TYPE[String(agg.type || "count")];
    if (!mapped) return false;
    const out = String(agg.outputColumn || "").trim();
    if (!out) return false;
    if (mapped !== "count" && mapped !== "count_distinct") {
      const valueCol = String(agg.valueColumn || "").trim();
      if (!valueCol) return false;
    }
  }
  return true;
}

/**
 * @param {object} band
 * @returns {boolean}
 */
function bandPredicateCompilable(band) {
  if (!band || typeof band !== "object") return false;
  const kind = String(band.kind || "between");
  if (kind === "eq" || kind === "lt" || kind === "lte" || kind === "gt" || kind === "gte") {
    const n = Number(String(band.value ?? "").trim().replace(/,/g, ""));
    return Number.isFinite(n) || String(band.value ?? "").trim() !== "";
  }
  if (kind === "between") {
    const minRaw = String(band.min ?? "").trim();
    const maxRaw = String(band.max ?? "").trim();
    if (!minRaw && !maxRaw) return false;
    if (minRaw) {
      const n = Number(minRaw.replace(/,/g, ""));
      if (!Number.isFinite(n)) return false;
    }
    if (maxRaw) {
      const n = Number(maxRaw.replace(/,/g, ""));
      if (!Number.isFinite(n)) return false;
    }
    return true;
  }
  return false;
}

/**
 * @param {object} band
 * @param {string} column
 * @returns {{ and: Array<{ column: string; op: string; value: number | string }> }}
 */
export function bandToWhenClause(band, column) {
  const col = String(column || "").trim();
  const kind = String(band?.kind || "between");
  const parseNum = (v) => {
    const n = Number(String(v ?? "").trim().replace(/,/g, ""));
    return Number.isFinite(n) ? n : String(v ?? "");
  };

  if (kind === "eq") return { and: [{ column: col, op: "eq", value: parseNum(band.value) }] };
  if (kind === "lt") return { and: [{ column: col, op: "lt", value: parseNum(band.value) }] };
  if (kind === "lte") return { and: [{ column: col, op: "lte", value: parseNum(band.value) }] };
  if (kind === "gt") return { and: [{ column: col, op: "gt", value: parseNum(band.value) }] };
  if (kind === "gte") return { and: [{ column: col, op: "gte", value: parseNum(band.value) }] };

  /** @type {Array<{ column: string; op: string; value: number | string }>} */
  const and = [];
  const minRaw = String(band?.min ?? "").trim();
  const maxRaw = String(band?.max ?? "").trim();
  if (minRaw) {
    and.push({
      column: col,
      op: band?.minInclusive !== false ? "gte" : "gt",
      value: parseNum(minRaw),
    });
  }
  if (maxRaw) {
    and.push({
      column: col,
      op: band?.maxInclusive === true ? "lte" : "lt",
      value: parseNum(maxRaw),
    });
  }
  return { and };
}

function bandDisplayLabel(band, column) {
  const custom = String(band?.label || "").trim();
  if (custom) return custom;
  return formatBandPredicateLabel(band, column);
}

function emptyComposeRow(partial) {
  return {
    id: genComposeRowId(),
    column: "",
    alias: "",
    aggregate: null,
    dateBucket: null,
    dateFormat: null,
    stringBucket: null,
    numberBucket: null,
    numberScale: "none",
    decimals: null,
    treatAsDate: false,
    sumCase: { enabled: false, branches: [], elseColumn: "" },
    equation: { enabled: false },
    displayName: null,
    ...partial,
  };
}

/**
 * @param {object | null | undefined} bucketConfig
 * @returns {{ columnComposeItems: object[]; bandOutputColumn: string; sheetName: string } | null}
 */
export function compileBandsConfigToCompose(bucketConfig) {
  if (!canCompileBandsConfigToAthena(bucketConfig)) return null;
  const config = normalizeBandsConfig(bucketConfig.bandsConfig);
  const bandColumn = String(config.bandColumn || "").trim();
  const bandOutputColumn = String(config.bandOutputColumn || "band").trim() || "band";
  const sheetName = String(config.sheetName || bucketConfig.sheetName || "").trim();

  const branches = config.bands.map((band) => ({
    when: bandToWhenClause(band, bandColumn),
    thenLabel: bandDisplayLabel(band, bandColumn).slice(0, 200),
  }));

  /** @type {object[]} */
  const items = [
    emptyComposeRow({
      column: bandColumn,
      alias: bandOutputColumn,
      aggregate: null,
      bandCase: {
        enabled: true,
        branches,
      },
    }),
  ];

  for (const agg of config.aggregations || []) {
    const mapped = ATHENA_AGG_TYPE[String(agg.type || "count")];
    const out = String(agg.outputColumn || "").trim();
    if (!mapped || !out) continue;
    const valueCol =
      String(agg.valueColumn || "").trim() ||
      (mapped === "count" || mapped === "count_distinct" ? bandColumn : "");
    if (!valueCol) continue;
    items.push(
      emptyComposeRow({
        column: valueCol,
        alias: out,
        aggregate: mapped,
      }),
    );
  }

  return { columnComposeItems: items, bandOutputColumn, sheetName };
}
