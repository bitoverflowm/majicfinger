import { whereOpsForKind } from "@/lib/composeWhereFilterUi";
import { normalizeHubQueryWhereFilters } from "@/lib/hubs/hubQueryDraft";

const OP_FALLBACK_LABELS = {
  eq: "=",
  neq: "≠",
  gt: ">",
  lt: "<",
  gte: "≥",
  lte: "≤",
  in: "in",
  not_in: "not in",
  is_null: "is null",
  is_not_null: "is not null",
};

function whereOpLabel(op, kind) {
  const id = String(op || "").trim();
  const fromKind = whereOpsForKind(kind || "string").find((o) => o.id === id);
  if (fromKind?.label) return fromKind.label;
  return OP_FALLBACK_LABELS[id] || id || "?";
}

function formatWhereClause(f) {
  const column = String(f?.column || "").trim();
  if (!column) return "";
  const op = String(f?.op || "").trim();
  const kind = f?.kind || "string";
  const opLabel = whereOpLabel(op, kind);
  if (op === "is_null" || op === "is_not_null") return `${column} ${opLabel}`;
  if (op === "in" || op === "not_in") {
    const raw = f?.value;
    const vals = Array.isArray(raw)
      ? raw
      : String(raw ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
    if (!vals.length) return `${column} ${opLabel} (…)`;
    const shown = vals.slice(0, 3).map((v) => `"${v}"`).join(", ");
    return vals.length > 3
      ? `${column} ${opLabel} (${shown}, …)`
      : `${column} ${opLabel} (${shown})`;
  }
  const v = f?.value;
  if (kind === "boolean") {
    const truthy = v === true || v === "true" || v === 1 || v === "1";
    return `${column} ${opLabel} ${truthy ? "true" : "false"}`;
  }
  if (v == null || v === "") return `${column} ${opLabel}`;
  return `${column} ${opLabel} ${typeof v === "number" ? v : `"${v}"`}`;
}

/**
 * Human-readable summary of refine/query criteria that bands inherit.
 *
 * @param {object | null | undefined} composeDraft
 * @returns {{ items: string[]; emptyMessage: string }}
 */
export function summarizeComposeDraftForBands(composeDraft) {
  const draft = composeDraft && typeof composeDraft === "object" ? composeDraft : {};
  const items = [];

  const whereFilters = normalizeHubQueryWhereFilters(draft.whereFilters);
  for (const f of whereFilters) {
    const line = formatWhereClause(f);
    if (line) items.push(`WHERE ${line}`);
  }

  const having = Array.isArray(draft.havingFilters) ? draft.havingFilters : [];
  for (const f of having) {
    const line = formatWhereClause(f);
    if (line) items.push(`HAVING ${line}`);
  }

  const joins = Array.isArray(draft.joins) ? draft.joins : [];
  for (const j of joins) {
    const table = String(j?.table || j?.sampleId || j?.rightSampleId || "").trim();
    if (table) items.push(`JOIN ${table}`);
  }

  const composeItems = Array.isArray(draft.columnComposeItems) ? draft.columnComposeItems : [];
  const hasSummarize = composeItems.some(
    (i) => i?.aggregate || i?.dateBucket || i?.sumCase?.enabled || i?.equation?.enabled,
  );
  if (hasSummarize) items.push("Summarize / roll-ups from Refine your query");

  const orderBy = Array.isArray(draft.orderBy) ? draft.orderBy : [];
  if (orderBy.length) {
    const cols = orderBy
      .map((o) => String(o?.column || o?.alias || "").trim())
      .filter(Boolean);
    if (cols.length) items.push(`Sort by ${cols.join(", ")}`);
  }

  if (draft.randomSampleEnabled) {
    const n = String(draft.randomSampleSize ?? "").trim();
    items.push(n ? `Random sample (n = ${n})` : "Random sample");
  } else if (draft.composeLimitOpen && String(draft.composeLimitValue ?? "").trim()) {
    items.push(`Limit ${String(draft.composeLimitValue).trim()}`);
  }

  return {
    items,
    emptyMessage:
      "No extra filters from Refine your query — bands run on the full selected-column result.",
  };
}
