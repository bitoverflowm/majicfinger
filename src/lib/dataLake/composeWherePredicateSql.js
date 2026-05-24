/**
 * Compose WHERE filters → SQL (matches behavior expected by runAthenaSelect / Athena compose).
 * Expands Kalshi virtual columns on `markets` (prefix + taxonomy) so predicates push down correctly.
 */
import { kalshiEventTickerCategorySql } from "@/lib/kalshi/kalshiPrefixSql";
import {
  buildKalshiMarketsTaxonomySubquerySql,
  buildKalshiTaxonomyGroupSqlExpr,
  KALSHI_VIRTUAL_TAXONOMY_CATEGORY_COLUMN,
} from "@/lib/kalshi/kalshiTaxonomySql";
import { resolveAthenaTableName } from "@/lib/dataLake/athenaTableMap";

const KALSHI_VIRTUAL_CATEGORY = "kalshi_event_ticker_category";

const KALSHI_MARKETS_VIRTUALS = new Set([KALSHI_VIRTUAL_TAXONOMY_CATEGORY_COLUMN, KALSHI_VIRTUAL_CATEGORY]);

function addFilterColumns(filters, into) {
  if (!filters || typeof filters !== "object") return;
  for (const key of ["and", "or", "mergeAnd", "mergeOrBranch"]) {
    const arr = filters[key];
    if (!Array.isArray(arr)) continue;
    for (const p of arr) {
      if (!p || typeof p !== "object") continue;
      if (p.column != null && String(p.column).trim()) into.add(String(p.column).trim());
    }
  }
}

function walkEquationRoot(root, into) {
  if (!root || typeof root !== "object") return;
  const t = String(root.type || "").trim();
  if (t === "col" && root.name != null) into.add(String(root.name).trim());
  if (t === "bin") {
    walkEquationRoot(root.left, into);
    walkEquationRoot(root.right, into);
  }
  if (t === "grp") walkEquationRoot(root.inner, into);
  if (t === "case") {
    const branches = Array.isArray(root.branches) ? root.branches : [];
    for (const b of branches) {
      const w = b?.when;
      if (w && typeof w === "object" && w.column != null) into.add(String(w.column).trim());
      walkEquationRoot(b?.then, into);
    }
    walkEquationRoot(root.elseNode, into);
  }
}

/**
 * Kalshi `markets` virtual columns referenced in compose/filters. When non-empty, SQL generation
 * should define each once in an inner subquery so SELECT / GROUP BY / WHERE do not duplicate huge CASEs.
 *
 * @param {{ compose: any; filters: any; lake?: string | null; table?: string | null }} args
 * @returns {Set<string>}
 */
export function collectKalshiMarketsMaterializedVirtuals({ compose, filters, lake, table }) {
  const L = String(lake || "").toLowerCase();
  const T = String(table || "").toLowerCase();
  if (L !== "kalshi" || T !== "markets") return new Set();

  const cols = new Set();
  addFilterColumns(filters, cols);

  const rows = Array.isArray(compose?.select) ? compose.select : [];
  for (const r of rows) {
    if (r && r.column != null) cols.add(String(r.column).trim());

    const sc = r?.sumCase;
    if (sc && typeof sc === "object" && sc.enabled) {
      const branches = Array.isArray(sc.branches) ? sc.branches : [];
      for (const b of branches) {
        const w = b?.when;
        if (w && typeof w === "object" && w.column != null) cols.add(String(w.column).trim());
      }
    }

    const eq = r?.equation;
    if (eq && typeof eq === "object" && eq.enabled && eq.root) walkEquationRoot(eq.root, cols);
  }

  const out = new Set();
  for (const c of cols) {
    if (KALSHI_MARKETS_VIRTUALS.has(c)) out.add(c);
  }
  return out;
}

function escapeSqlStringLiteral(s) {
  return String(s).replace(/'/g, "''");
}

/**
 * Kalshi trades have no taxonomy column — restrict to market tickers in the taxonomy bucket.
 * @param {string} categoryValue
 * @param {string} tradesAlias
 * @param {boolean} caseSensitive
 */
function buildKalshiTradesTaxonomyCategoryPredicate(categoryValue, tradesAlias, caseSensitive) {
  const marketsPhysical = resolveAthenaTableName("kalshi", "markets");
  if (!marketsPhysical) return "TRUE";
  const ta = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tradesAlias) ? tradesAlias : "t0";
  const mcat = "mcat";
  const marketsWithTaxonomy = buildKalshiMarketsTaxonomySubquerySql(marketsPhysical, mcat);
  const taxCol = `${mcat}."${KALSHI_VIRTUAL_TAXONOMY_CATEGORY_COLUMN}"`;
  const esc = escapeSqlStringLiteral(String(categoryValue ?? ""));
  const lit = caseSensitive ? `'${esc}'` : `LOWER('${esc}')`;
  const taxCmp = caseSensitive ? taxCol : `LOWER(${taxCol})`;
  return `EXISTS (
    SELECT 1 FROM ${marketsWithTaxonomy}
    WHERE CAST(${ta}."ticker" AS VARCHAR) = CAST(${mcat}."ticker" AS VARCHAR)
      AND ${taxCmp} = ${lit}
  )`;
}

/**
 * @param {string} column
 * @param {string} baseAlias
 * @param {string | null | undefined} lake
 * @param {string | null | undefined} table
 * @param {Set<string> | null | undefined} materializedVirtualColumns — when set and contains the virtual id, use `${alias}."column"`
 * @returns {string | null} SQL expression, or null to use `${baseAlias}."column"`
 */
export function resolveComposeFilterColumnSql(column, baseAlias, lake, table, materializedVirtualColumns = null) {
  const L = String(lake || "").toLowerCase();
  const T = String(table || "").toLowerCase();
  const a = String(baseAlias || "t0").trim();
  const safeAlias = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(a) ? a : "t0";
  const ref = (name) => `${safeAlias}."${name}"`;
  const mat = materializedVirtualColumns instanceof Set ? materializedVirtualColumns : null;

  if (L !== "kalshi" || T !== "markets") return null;

  const c = String(column || "").trim();
  if (c === KALSHI_VIRTUAL_TAXONOMY_CATEGORY_COLUMN) {
    if (mat?.has(KALSHI_VIRTUAL_TAXONOMY_CATEGORY_COLUMN)) return ref(KALSHI_VIRTUAL_TAXONOMY_CATEGORY_COLUMN);
    return buildKalshiTaxonomyGroupSqlExpr(ref("event_ticker"));
  }
  if (c === KALSHI_VIRTUAL_CATEGORY) {
    if (mat?.has(KALSHI_VIRTUAL_CATEGORY)) return ref(KALSHI_VIRTUAL_CATEGORY);
    return kalshiEventTickerCategorySql(ref("event_ticker"));
  }
  return null;
}

/**
 * @param {{
 *   filters: { and?: any[]; or?: any[]; mergeAnd?: any[]; mergeOrBranch?: any[] } | null | undefined;
 *   caseSensitive?: boolean;
 *   baseAlias?: string;
 *   lake?: string | null;
 *   table?: string | null;
 *   materializedVirtualColumns?: Set<string> | null;
 * }} opts
 * @returns {string} ` WHERE …` or ""
 */
export function buildComposeFiltersWhereSql(opts) {
  const {
    filters,
    caseSensitive = false,
    baseAlias = "t0",
    lake = null,
    table = null,
    materializedVirtualColumns = null,
  } = opts || {};
  if (!filters) return "";

  const andPreds = Array.isArray(filters.and) ? filters.and : [];
  const orPreds = Array.isArray(filters.or) ? filters.or : [];
  const mergeAndPreds = Array.isArray(filters.mergeAnd) ? filters.mergeAnd : [];
  const mergeOrBranchPreds = Array.isArray(filters.mergeOrBranch) ? filters.mergeOrBranch : [];

  const escapeSqlString = (s) => String(s).replace(/'/g, "''");
  const escapeLike = (s) => String(s).replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");

  const ba = String(baseAlias || "t0").trim();
  const safeBa = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(ba) ? ba : "t0";

  const mat = materializedVirtualColumns instanceof Set ? materializedVirtualColumns : null;
  const L = String(lake || "").toLowerCase();
  const T = String(table || "").toLowerCase();

  /** @param {{ column: string; kind: string; op: string; value: any }} p */
  const predicateToSql = (p) => {
    const colName = String(p.column || "").trim();
    if (
      L === "kalshi" &&
      T === "trades" &&
      colName === KALSHI_VIRTUAL_TAXONOMY_CATEGORY_COLUMN &&
      p.op === "eq" &&
      p.kind === "string"
    ) {
      return buildKalshiTradesTaxonomyCategoryPredicate(p.value, safeBa, caseSensitive);
    }

    const virt = resolveComposeFilterColumnSql(p.column, safeBa, lake, table, mat);
    const colSql = virt ?? `${safeBa}."${String(p.column || "").trim()}"`;

    if (p.op === "in" || p.op === "not_in") {
      const opSql = p.op === "in" ? "IN" : "NOT IN";

      if (p.kind === "number") {
        const values = Array.isArray(p.value) ? p.value : [];
        if (!values.length) return "TRUE";
        const list = values.map((v) => Number(v)).map((n) => (Number.isFinite(n) ? String(n) : "NULL")).join(", ");
        return `${colSql} ${opSql} (${list})`;
      }

      if (p.kind === "string") {
        const values = Array.isArray(p.value) ? p.value : [];
        if (!values.length) return "TRUE";
        const colMaybeLower = caseSensitive ? colSql : `LOWER(${colSql})`;
        const lits = values.map((v) => {
          const s = String(v);
          return caseSensitive ? `'${escapeSqlString(s)}'` : `LOWER('${escapeSqlString(s)}')`;
        });
        return `${colMaybeLower} ${opSql} (${lits.join(", ")})`;
      }

      return "TRUE";
    }

    if (p.kind === "date") {
      const colMs = `CASE WHEN ${colSql} < 1000000000000 THEN ${colSql} * 1000 ELSE ${colSql} END`;
      const opSql = p.op === "gt" ? ">" : p.op === "lt" ? "<" : p.op === "eq" ? "=" : "<>";
      return `${colMs} ${opSql} ${Number(p.value)}`;
    }

    if (p.kind === "number") {
      const opSql = p.op === "gt" ? ">" : p.op === "lt" ? "<" : p.op === "eq" ? "=" : "<>";
      return `${colSql} ${opSql} ${Number(p.value)}`;
    }

    const colMaybeLower = caseSensitive ? colSql : `LOWER(${colSql})`;
    if (p.op === "contains" || p.op === "not_contains") {
      const pattern = `%${escapeLike(p.value)}%`;
      const litMaybeLower = caseSensitive ? `'${escapeSqlString(pattern)}'` : `LOWER('${escapeSqlString(pattern)}')`;
      const opLike = p.op === "contains" ? "LIKE" : "NOT LIKE";
      return `${colMaybeLower} ${opLike} ${litMaybeLower} ESCAPE '\\'`;
    }

    const litMaybeLower = caseSensitive ? `'${escapeSqlString(p.value)}'` : `LOWER('${escapeSqlString(p.value)}')`;
    const opSql = p.op === "eq" ? "=" : "!=";
    return `${colMaybeLower} ${opSql} ${litMaybeLower}`;
  };

  const andExpr = andPreds.length ? andPreds.map(predicateToSql).join(" AND ") : null;
  const orExpr = orPreds.length ? orPreds.map(predicateToSql).join(" OR ") : null;
  const baseExpr = andExpr && orExpr ? `(${andExpr}) AND (${orExpr})` : andExpr ? `(${andExpr})` : orExpr ? `(${orExpr})` : "TRUE";

  if (mergeAndPreds.length > 0 || mergeOrBranchPreds.length > 0) {
    const baseWithAnd =
      mergeAndPreds.length > 0 ? `((${baseExpr}) AND (${mergeAndPreds.map(predicateToSql).join(" AND ")}))` : `(${baseExpr})`;
    if (mergeOrBranchPreds.length > 0) {
      return ` WHERE ${baseWithAnd} OR (${mergeOrBranchPreds.map(predicateToSql).join(" OR ")})`;
    }
    return ` WHERE ${baseWithAnd}`;
  }

  if (andPreds.length > 0 || orPreds.length > 0) {
    return ` WHERE ${baseExpr}`;
  }

  return "";
}
