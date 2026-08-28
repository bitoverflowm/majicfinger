/**
 * Shared WHERE filter UI helpers for lake compose (Connect hubs + integrations panel).
 * Only use constrained controls when column kind is known with certainty.
 */

import { parseBooleanish } from "@/lib/sheetOperations/refineQuery";

export { parseBooleanish };

/** Ops that do not take a comparison value (SQL IS NULL / IS NOT NULL). */
export function isNullaryWhereOp(op) {
  const o = String(op || "").trim();
  return o === "is_null" || o === "is_not_null";
}

const NULLARY_WHERE_OPS = [
  { id: "is_not_null", label: "is not null" },
  { id: "is_null", label: "is null" },
];

/**
 * @param {"string" | "number" | "date" | "boolean"} kind
 * @returns {Array<{ id: string; label: string }>}
 */
export function whereOpsForKind(kind) {
  if (kind === "boolean") {
    return [
      { id: "eq", label: "is equal to" },
      { id: "neq", label: "not equal to" },
      ...NULLARY_WHERE_OPS,
    ];
  }
  if (kind === "string") {
    return [
      { id: "eq", label: "is equal to" },
      { id: "neq", label: "not equal to" },
      { id: "in", label: "in set" },
      { id: "not_in", label: "not in set" },
      ...NULLARY_WHERE_OPS,
    ];
  }
  if (kind === "date") {
    return [
      { id: "gt", label: "greater than" },
      { id: "lt", label: "less than" },
      { id: "eq", label: "is equal to" },
      { id: "neq", label: "not equal to" },
      ...NULLARY_WHERE_OPS,
    ];
  }
  // number
  return [
    { id: "gt", label: "greater than" },
    { id: "lt", label: "less than" },
    { id: "eq", label: "is equal to" },
    { id: "neq", label: "not equal to" },
    { id: "in", label: "in set" },
    { id: "not_in", label: "not in set" },
    ...NULLARY_WHERE_OPS,
  ];
}

/**
 * Compact op list for hub compose panel (matches prior Connect UX).
 * @param {"string" | "number" | "date" | "boolean"} kind
 */
export function whereOpsForKindCompact(kind) {
  if (kind === "boolean") {
    return [
      { id: "eq", label: "is equal to" },
      { id: "neq", label: "not equal to" },
      ...NULLARY_WHERE_OPS,
    ];
  }
  if (kind === "string") {
    return [
      { id: "eq", label: "is equal to" },
      { id: "neq", label: "not equal to" },
      { id: "in", label: "in set" },
      ...NULLARY_WHERE_OPS,
    ];
  }
  if (kind === "date") {
    return [
      { id: "gt", label: "greater than" },
      { id: "lt", label: "less than" },
      { id: "eq", label: "is equal to" },
      ...NULLARY_WHERE_OPS,
    ];
  }
  return [
    { id: "gt", label: "greater than" },
    { id: "lt", label: "less than" },
    { id: "eq", label: "is equal to" },
    { id: "in", label: "in set" },
    ...NULLARY_WHERE_OPS,
  ];
}

/**
 * @param {"string" | "number" | "date" | "boolean"} kind
 * @param {string} [op]
 */
export function defaultWhereValueForKind(kind, op) {
  if (isNullaryWhereOp(op)) return "";
  if (op === "in" || op === "not_in") {
    if (kind === "number") return "1, 2, 3";
    if (kind === "string") return '"yes", "no"';
    if (kind === "date") return String(Date.now());
    return "";
  }
  if (kind === "boolean") return "true";
  if (kind === "date") return "";
  // Numbers start empty so 0 is an intentional value, never a stand-in for "unset"/null.
  if (kind === "number") return "";
  return "";
}

/**
 * @param {string} currentOp
 * @param {"string" | "number" | "date" | "boolean"} kind
 * @param {{ compact?: boolean }} [opts]
 */
export function coerceWhereOpForKind(currentOp, kind, opts = {}) {
  const ops = (opts.compact ? whereOpsForKindCompact(kind) : whereOpsForKind(kind)).map((o) => o.id);
  const op = String(currentOp || "eq").trim() || "eq";
  return ops.includes(op) ? op : "eq";
}

/**
 * @param {{ column?: string; op?: string; kind?: string; value?: unknown } | null | undefined} f
 * @returns {boolean} true when the filter is incomplete / invalid for run
 */
export function isComposeWhereFilterIncomplete(f) {
  if (!f?.column || !f?.op || !f?.kind) return true;
  if (isNullaryWhereOp(f.op)) return false;
  const kind = String(f.kind).toLowerCase();
  if (f.op === "in" || f.op === "not_in") return !String(f.value ?? "").trim();
  if (kind === "boolean") return parseBooleanish(f.value) == null;
  if (kind === "string") return !String(f.value ?? "").trim();
  if (kind === "date" || kind === "number") {
    // "" must stay incomplete — Number("") === 0 and must not be treated as a real zero.
    if (f.value === "" || f.value == null) return true;
    return !Number.isFinite(Number(f.value));
  }
  // Unknown kinds: do not invent controls; require a non-empty value.
  return !String(f.value ?? "").trim();
}

/**
 * Normalize kind from lake registry / drafts.
 * @param {unknown} raw
 * @returns {"string" | "number" | "date" | "boolean"}
 */
export function normalizeComposeWhereKind(raw) {
  const k = String(raw || "").toLowerCase().trim();
  if (k === "boolean") return "boolean";
  if (k === "date") return "date";
  if (k === "number") return "number";
  return "string";
}
