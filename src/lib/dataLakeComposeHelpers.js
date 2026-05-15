import { KALSHI_CONNECT_COLUMN_LABELS } from "@/lib/kalshiConnectColumns";

export function operatorSymbol(op) {
  if (op === "gt") return ">";
  if (op === "lt") return "<";
  if (op === "eq" || op === "contains") return "=";
  if (op === "neq" || op === "not_contains") return "!=";
  if (op === "in") return "IN";
  if (op === "not_in") return "NOT IN";
  return "=";
}

export function genComposeRowId() {
  return `cs-${Date.now().toString(36)}-${Math.random().toString(16).slice(2)}`;
}

export function genComposeJoinId() {
  return `cj-${Date.now().toString(36)}-${Math.random().toString(16).slice(2)}`;
}

/** @param {string} col */
export function composeSourceColumnLabel(col) {
  return KALSHI_CONNECT_COLUMN_LABELS[col] || col;
}

/** @param {string} name @param {Record<string, string>} typesByName */
export function kindForLakeColumn(name, typesByName) {
  const t = typesByName[name];
  if (!t) return "string";
  const typeNorm = String(t).toLowerCase();
  const isDateLike =
    /time|date|_at$|_ms$|timestamp/i.test(name) &&
    (typeNorm === "bigint" || typeNorm === "int" || typeNorm === "datetime");
  if ((typeNorm === "bigint" || typeNorm === "int") && isDateLike) return "date";
  if (typeNorm === "double" || typeNorm === "bigint" || typeNorm === "int") return "number";
  if (typeNorm === "string") return "string";
  return "string";
}
