/**
 * SQL expression for top-level taxonomy bucket (Sports, Weather, …) matching
 * getKalshiTaxonomyGroup(prefix) in kalshiCategoryTaxonomy.js — same pattern order as kalshiPatterns.json.
 */
import kalshiPatterns from "./kalshiPatterns.json";
import { KALSHI_GROUP_COLORS } from "./kalshiCategoryTaxonomy";
import { kalshiEventTickerCategorySql } from "./kalshiPrefixSql";

export const KALSHI_VIRTUAL_TAXONOMY_CATEGORY_COLUMN = "kalshi_taxonomy_category";

function escapeSqlString(s) {
  return String(s).replace(/'/g, "''");
}

/**
 * Taxonomy CASE body only — `prefixRefSql` must be a *short* SQL ref (e.g. `_kfb._kf_p`).
 * Do not pass a huge inlined prefix expression: each WHEN repeats UPPER(CAST(prefixRef …)).
 *
 * @param {string} prefixRefSql
 * @returns {string} `(CASE … END)`
 */
export function buildKalshiTaxonomyGroupCaseSqlForPrefixRef(prefixRefSql) {
  const trimmed = `TRIM(CAST(${prefixRefSql} AS VARCHAR))`;
  const u = `UPPER(CAST(${prefixRefSql} AS VARCHAR))`;

  const topKeys = Object.keys(KALSHI_GROUP_COLORS);
  const inList = topKeys.map((k) => `'${escapeSqlString(k)}'`).join(", ");

  /** @type {string[]} */
  const whenParts = [];
  for (const row of kalshiPatterns) {
    const pattern = row[0];
    const group = row[1];
    whenParts.push(`WHEN strpos(${u}, '${escapeSqlString(pattern)}') > 0 THEN '${escapeSqlString(group)}'`);
  }

  return `(CASE
    WHEN ${trimmed} IN (${inList}) THEN ${trimmed}
    ${whenParts.join("\n    ")}
    ELSE 'Other'
  END)`;
}

/**
 * @param {string} eventTickerExpr SQL expression referencing event_ticker (with table alias).
 * @returns {string} SQL scalar expression returning taxonomy group label.
 */
export function buildKalshiTaxonomyGroupSqlExpr(eventTickerExpr) {
  const prefixSql = kalshiEventTickerCategorySql(eventTickerExpr);
  const p = "_kf_p";
  // Scalar subquery: OK in WHERE; avoid in SELECT list next to `kb.*` — Athena can INTERNAL_ERROR.
  return `(
    SELECT ${buildKalshiTaxonomyGroupCaseSqlForPrefixRef(p)}
    FROM (SELECT ${prefixSql} AS ${p}) _kalshi_prefix
  )`;
}

/**
 * Two-level markets taxonomy layers (prefix once, then CASE on _kf_p).
 * Same pattern as buildComposeAthenaSql when materializing kalshi_taxonomy_category on markets.
 *
 * @param {string} marketsPhysical
 * @returns {{ prepped: string; taxCase: string; kfb: string }}
 */
export function buildKalshiMarketsTaxonomyLayers(marketsPhysical) {
  const safe = String(marketsPhysical || "").trim();
  if (!/^[a-zA-Z0-9_]+$/.test(safe)) {
    throw new Error("Invalid markets physical table name");
  }
  const kb = "kb";
  const kfb = "_kfb";
  const pExpr = kalshiEventTickerCategorySql(`${kb}."event_ticker"`);
  const prepped = `(SELECT ${kb}.*, ${pExpr} AS _kf_p FROM "${safe}" ${kb})`;
  const taxCase = buildKalshiTaxonomyGroupCaseSqlForPrefixRef(`${kfb}._kf_p`);
  return { prepped, taxCase, kfb };
}

/**
 * Markets subquery with ticker + materialized kalshi_taxonomy_category (for trades semi-joins).
 * @param {string} marketsPhysical
 * @param {string} [outAlias]
 * @returns {string}
 */
export function buildKalshiMarketsTaxonomySubquerySql(marketsPhysical, outAlias = "mcat") {
  const { prepped, taxCase, kfb } = buildKalshiMarketsTaxonomyLayers(marketsPhysical);
  const a = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(outAlias) ? outAlias : "mcat";
  return `(SELECT ${kfb}."ticker", ${taxCase} AS "${KALSHI_VIRTUAL_TAXONOMY_CATEGORY_COLUMN}" FROM ${prepped} ${kfb}) ${a}`;
}
