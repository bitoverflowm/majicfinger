import { temporalToMs } from "@/lib/temporalParse";

const DATE_LIKE = /^\d{4}-\d{2}-\d{2}/;

function safeColumnName(s) {
  const t = String(s || "").trim();
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(t) ? t : "";
}

function escapeSqlString(s) {
  return String(s).replace(/'/g, "''");
}

function escapeLike(s) {
  return String(s).replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/**
 * @param {string} column
 * @param {Record<string, string> | null | undefined} dataTypes
 * @param {object[] | null | undefined} rows
 * @returns {"number" | "string" | "boolean" | "date"}
 */
export function inferRefineColumnKind(column, dataTypes, rows) {
  const t = dataTypes?.[column];
  if (t === "number") return "number";
  if (t === "boolean") return "boolean";
  if (t === "date" || t === "dateString") return "date";
  if (t === "text" || t === "string") return "string";

  const sample = (Array.isArray(rows) ? rows : []).find((row) => row && column in row);
  if (!sample) return "string";
  const v = sample[column];
  if (typeof v === "boolean") return "boolean";
  if (typeof v === "number" && Number.isFinite(v)) return "number";
  if (v instanceof Date) return "date";
  if (typeof v === "string") {
    if (DATE_LIKE.test(v)) return "date";
    const lower = v.trim().toLowerCase();
    if (lower === "true" || lower === "false") return "boolean";
    const n = Number(v);
    if (v !== "" && Number.isFinite(n)) return "number";
  }
  return "string";
}

/** @param {"number" | "string" | "boolean" | "date"} kind */
export function defaultRefineOpForKind(kind) {
  if (kind === "number" || kind === "date") return "gte";
  return "eq";
}

/** @param {"number" | "string" | "boolean" | "date"} kind */
export function refineOpsForKind(kind) {
  if (kind === "boolean") {
    return [
      { id: "eq", label: "=" },
      { id: "neq", label: "≠" },
    ];
  }
  if (kind === "string") {
    return [
      { id: "eq", label: "=" },
      { id: "neq", label: "≠" },
      { id: "contains", label: "contains" },
      { id: "not_contains", label: "not contains" },
    ];
  }
  return [
    { id: "gte", label: "≥" },
    { id: "lte", label: "≤" },
    { id: "gt", label: ">" },
    { id: "lt", label: "<" },
    { id: "eq", label: "=" },
    { id: "neq", label: "≠" },
  ];
}

export function parseBooleanish(value) {
  if (typeof value === "boolean") return value;
  if (value == null || value === "") return null;
  const s = String(value).trim().toLowerCase();
  if (s === "true" || s === "1" || s === "yes") return true;
  if (s === "false" || s === "0" || s === "no") return false;
  return null;
}

/**
 * @param {string} rawValue
 * @param {"number" | "string" | "boolean" | "date"} kind
 * @returns {number | string | boolean | null}
 */
export function parseRefineFilterInput(rawValue, kind) {
  const text = String(rawValue ?? "").trim();
  if (!text) return null;
  if (kind === "boolean") return parseBooleanish(text);
  if (kind === "number") {
    const n = Number(text);
    return Number.isFinite(n) ? n : null;
  }
  if (kind === "date") {
    const ms = temporalToMs(text);
    return Number.isFinite(ms) ? ms : null;
  }
  return text;
}

/**
 * @param {{
 *   column: string;
 *   op: string;
 *   kind: "number" | "string" | "boolean" | "date";
 *   value: number | string | boolean | null;
 * }} predicate
 */
export function rowMatchesRefinePredicate(row, predicate) {
  if (!predicate?.column || predicate.value == null) return true;
  const raw = row?.[predicate.column];
  const op = String(predicate.op || "eq").toLowerCase();
  const kind = predicate.kind || "string";

  if (kind === "boolean") {
    const left = parseBooleanish(raw);
    const right = parseBooleanish(predicate.value);
    if (left == null || right == null) return false;
    if (op === "eq") return left === right;
    if (op === "neq" || op === "ne") return left !== right;
    return true;
  }

  if (kind === "date") {
    const leftMs = temporalToMs(raw);
    const rightMs = Number(predicate.value);
    if (!Number.isFinite(leftMs) || !Number.isFinite(rightMs)) return false;
    if (op === "gte" || op === "ge") return leftMs >= rightMs;
    if (op === "lte" || op === "le") return leftMs <= rightMs;
    if (op === "gt") return leftMs > rightMs;
    if (op === "lt") return leftMs < rightMs;
    if (op === "eq") return leftMs === rightMs;
    if (op === "neq" || op === "ne") return leftMs !== rightMs;
    return true;
  }

  if (kind === "number") {
    const left = typeof raw === "number" ? raw : Number(raw);
    const right = Number(predicate.value);
    if (!Number.isFinite(left) || !Number.isFinite(right)) return false;
    if (op === "gte" || op === "ge") return left >= right;
    if (op === "lte" || op === "le") return left <= right;
    if (op === "gt") return left > right;
    if (op === "lt") return left < right;
    if (op === "eq") return left === right;
    if (op === "neq" || op === "ne") return left !== right;
    return true;
  }

  const leftStr = String(raw ?? "").toLowerCase();
  const rightStr = String(predicate.value ?? "").toLowerCase();
  if (op === "contains") return leftStr.includes(rightStr);
  if (op === "not_contains") return !leftStr.includes(rightStr);
  if (op === "eq") return leftStr === rightStr;
  if (op === "neq" || op === "ne") return leftStr !== rightStr;
  return true;
}

/**
 * @param {{
 *   column: string;
 *   op: string;
 *   kind: "number" | "string" | "boolean" | "date";
 *   rawValue: string;
 * }} input
 */
export function buildRefineFilterPredicate(input) {
  const column = String(input.column || "").trim();
  if (!column) return null;
  const kind = input.kind || "string";
  const value = parseRefineFilterInput(input.rawValue, kind);
  if (value == null) return null;
  return {
    column,
    op: String(input.op || defaultRefineOpForKind(kind)).toLowerCase(),
    kind,
    value,
  };
}

export function genRefineWhereClauseId() {
  return `rw-${Date.now().toString(36)}-${Math.random().toString(16).slice(2)}`;
}

/**
 * @param {string} column
 * @param {Record<string, string> | null | undefined} dataTypes
 * @param {object[] | null | undefined} rows
 */
export function createRefineWhereClause(column, dataTypes, rows) {
  const col = String(column || "").trim();
  const kind = col ? inferRefineColumnKind(col, dataTypes, rows) : "string";
  return {
    id: genRefineWhereClauseId(),
    column: col,
    op: defaultRefineOpForKind(kind),
    kind,
    value: kind === "boolean" ? "true" : "",
  };
}

/**
 * @param {Array<{ column?: string; op?: string; kind?: string; value?: string }>} clauses
 * @param {Record<string, string> | null | undefined} dataTypes
 * @param {object[] | null | undefined} rows
 */
export function buildRefineFiltersFromClauses(clauses, dataTypes, rows) {
  const and = [];
  for (const clause of Array.isArray(clauses) ? clauses : []) {
    const column = String(clause?.column || "").trim();
    if (!column) continue;
    const kind = clause.kind || inferRefineColumnKind(column, dataTypes, rows);
    const predicate = buildRefineFilterPredicate({
      column,
      op: clause.op,
      kind,
      rawValue: clause.value,
    });
    if (predicate) and.push(predicate);
  }
  return { and };
}

/**
 * @param {object[]} rows
 * @param {{ selectColumns?: string[]; filters?: { and?: object[] } }} spec
 */
export function applyRefineQueryToRows(rows, spec) {
  const list = Array.isArray(rows) ? rows : [];
  const cols = Array.isArray(spec?.selectColumns) ? spec.selectColumns.filter(Boolean) : [];
  const preds = Array.isArray(spec?.filters?.and) ? spec.filters.and : [];

  let out = list;
  if (preds.length) {
    out = out.filter((row) => preds.every((p) => rowMatchesRefinePredicate(row, p)));
  }

  if (!cols.length) return out;
  return out.map((row) => {
    const o = {};
    for (const c of cols) {
      if (row && typeof row === "object" && c in row) o[c] = row[c];
    }
    return o;
  });
}

/** @param {{ and?: Array<{ column?: string; op?: string; kind?: string; value?: any }> } | null | undefined} filters */
export function summarizeRefineFilters(filters) {
  const and = Array.isArray(filters?.and) ? filters.and : [];
  if (!and.length) return { hasWhere: false, text: "" };
  const parts = and
    .map((f) => {
      const c = String(f?.column || "").trim();
      const op = String(f?.op || "").trim();
      const v = f?.value;
      if (!c || !op) return "";
      if (f?.kind === "boolean") return `${c} ${op} ${v ? "true" : "false"}`;
      if (typeof v === "string") return `${c} ${op} "${v}"`;
      if (typeof v === "number" && Number.isFinite(v)) return `${c} ${op} ${v}`;
      return `${c} ${op}`;
    })
    .filter(Boolean);
  return { hasWhere: parts.length > 0, text: parts.join(" AND ") };
}

/**
 * @param {string} baseAlias
 * @param {{ and?: Array<{ column?: string; op?: string; kind?: string; value?: any }> } | null | undefined} refineFilters
 */
export function buildRefineOuterWhereSql(baseAlias, refineFilters) {
  const andPreds = Array.isArray(refineFilters?.and) ? refineFilters.and : [];
  if (!andPreds.length) return "";

  const alias = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(String(baseAlias || "").trim())
    ? String(baseAlias).trim()
    : "t0";

  const parts = [];
  for (const p of andPreds) {
    const col = safeColumnName(p.column);
    if (!col) continue;

    const kind = String(p.kind || "string").toLowerCase();
    const op = String(p.op || "eq").toLowerCase();
    const csql = `${alias}."${col}"`;

    if (kind === "boolean") {
      const boolVal = parseBooleanish(p.value);
      if (boolVal == null) continue;
      const boolCmp = `LOWER(CAST(${csql} AS VARCHAR))`;
      const lit = boolVal ? "true" : "false";
      if (op === "eq") parts.push(`${boolCmp} = '${lit}'`);
      else if (op === "neq" || op === "ne") parts.push(`${boolCmp} <> '${lit}'`);
      continue;
    }

    if (kind === "date") {
      const v = Number(p.value);
      if (!Number.isFinite(v)) continue;
      const colMs = `CASE WHEN ${csql} < 1000000000000 THEN ${csql} * 1000 ELSE ${csql} END`;
      const opSql = op === "gte" || op === "ge" ? ">=" : op === "lte" || op === "le" ? "<=" : op === "gt" ? ">" : op === "lt" ? "<" : op === "eq" ? "=" : "<>";
      parts.push(`${colMs} ${opSql} ${v}`);
      continue;
    }

    if (kind === "number") {
      const v = Number(p.value);
      if (!Number.isFinite(v)) continue;
      const cast = `CAST(${csql} AS DOUBLE)`;
      if (op === "gte" || op === "ge") parts.push(`${cast} >= ${v}`);
      else if (op === "lte" || op === "le") parts.push(`${cast} <= ${v}`);
      else if (op === "gt") parts.push(`${cast} > ${v}`);
      else if (op === "lt") parts.push(`${cast} < ${v}`);
      else if (op === "eq") parts.push(`${cast} = ${v}`);
      else if (op === "neq" || op === "ne") parts.push(`${cast} <> ${v}`);
      continue;
    }

    const colLower = `LOWER(CAST(${csql} AS VARCHAR))`;
    const esc = escapeSqlString(String(p.value ?? ""));
    const lit = `LOWER('${esc}')`;
    if (op === "contains") {
      const pattern = `%${escapeLike(String(p.value ?? ""))}%`;
      parts.push(`${colLower} LIKE LOWER('${escapeSqlString(pattern)}') ESCAPE '\\\\'`);
    } else if (op === "not_contains") {
      const pattern = `%${escapeLike(String(p.value ?? ""))}%`;
      parts.push(`${colLower} NOT LIKE LOWER('${escapeSqlString(pattern)}') ESCAPE '\\\\'`);
    } else if (op === "eq") {
      parts.push(`${colLower} = ${lit}`);
    } else if (op === "neq" || op === "ne") {
      parts.push(`${colLower} <> ${lit}`);
    }
  }

  return parts.length ? ` WHERE ${parts.join(" AND ")}` : "";
}

/**
 * @param {{
 *   scope: "preview" | "athena";
 *   sourceSheetId: string;
 *   selectColumns: string[];
 *   filters: { and: object[] };
 *   destination?: "replace" | "new_sheet";
 * }} payload
 */
export function buildRefineQueryOperation(payload) {
  return {
    type: "refine.query",
    scope: payload.scope,
    sourceSheetId: payload.sourceSheetId,
    destination: payload.destination || "replace",
    selectColumns: Array.isArray(payload.selectColumns) ? payload.selectColumns : [],
    filters: payload.filters && typeof payload.filters === "object" ? payload.filters : { and: [] },
  };
}
