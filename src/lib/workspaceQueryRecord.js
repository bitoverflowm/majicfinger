/** Saved searches and executed pulls stored for one signed-in user. */

const MAX_JSON = 60_000;
const LIMITS = { saved: 40, pull: 80 };

export function queryRecordLimit(kind) {
  return LIMITS[kind] || 0;
}

function cloneData(value, depth = 0) {
  if (depth > 8 || value == null) return null;
  if (typeof value === "string") return value.slice(0, 4000);
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    return value
      .slice(0, 80)
      .map((item) => cloneData(item, depth + 1))
      .filter((item) => item != null);
  }
  if (typeof value !== "object") return null;
  const out = {};
  let count = 0;
  for (const [key, item] of Object.entries(value)) {
    if (count >= 80) break;
    const name = String(key).slice(0, 80);
    if (!name || name === "__proto__" || name === "constructor" || name === "prototype") continue;
    if (name === "rows" || name === "cells" || name === "data") continue;
    const next = cloneData(item, depth + 1);
    if (next == null) continue;
    out[name] = next;
    count += 1;
  }
  return out;
}

function fit(payload) {
  if (JSON.stringify(payload).length <= MAX_JSON) return payload;
  const withoutAthena = { ...payload };
  delete withoutAthena.athena;
  if (JSON.stringify(withoutAthena).length <= MAX_JSON) return withoutAthena;
  const compact = { ...withoutAthena };
  delete compact.join;
  delete compact.attributeFilters;
  delete compact.sheets;
  if (JSON.stringify(compact).length <= MAX_JSON) return compact;
  return null;
}

export function sanitizeQueryRecord(kind, input) {
  if (kind !== "saved" && kind !== "pull") return null;
  const source = input && typeof input === "object" ? input : null;
  if (!source) return null;
  const id = String(source.id || "").trim().slice(0, 80);
  const integrationId = String(source.integrationId || "").trim().slice(0, 80);
  const label = String(source.label || "").trim().slice(0, 240);
  if (!id || !integrationId) return null;
  const savedAt = Number(source.savedAt);
  const base = {
    id,
    integrationId,
    label: label || (kind === "saved" ? "Saved search" : "Earlier pull"),
    savedAt: Number.isFinite(savedAt) ? savedAt : Date.now(),
    tableId: String(source.tableId || "").slice(0, 80),
    fingerprint: String(source.fingerprint || "").slice(0, 2000),
  };
  if (kind === "saved") {
    return fit({
      ...base,
      hidden: Array.isArray(source.hidden) ? source.hidden.map((item) => String(item).slice(0, 80)).slice(0, 80) : [],
      filterColumn: String(source.filterColumn || "").slice(0, 80),
      filterValue: String(source.filterValue || "").slice(0, 200),
      rowLimit: String(source.rowLimit || "").slice(0, 20),
      attributeFilters: cloneData(source.attributeFilters) || {},
      sortKeys: cloneData(source.sortKeys) || [],
      athena: cloneData(source.athena),
      join: cloneData(source.join),
    });
  }
  return fit({
    ...base,
    formula: String(source.formula || "").slice(0, 500),
    sheets: cloneData(source.sheets) || [],
    athena: cloneData(source.athena),
    join: cloneData(source.join),
  });
}
