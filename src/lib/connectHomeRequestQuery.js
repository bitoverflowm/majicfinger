export function integrationLabelFromLake(lake) {
  const key = String(lake || "").toLowerCase();
  if (key === "kalshi") return "Kalshi Historical";
  if (key === "polymarket") return "Polymarket Historical";
  return key ? `${key.charAt(0).toUpperCase()}${key.slice(1)}` : "Data Lake";
}

/** Human-readable WHERE clause from compose filter `{ and, or }`. */
export function summarizeComposeWhereFilters(filters) {
  const and = Array.isArray(filters?.and) ? filters.and : [];
  if (!and.length) return { hasWhere: false, text: "" };
  const parts = and
    .map((f) => {
      const c = String(f?.column ?? f?.field ?? "").trim();
      const op = String(f?.op || "").trim();
      const v = f?.value;
      if (!c || !op) return "";
      if (op === "in" || op === "not_in") {
        const vals = Array.isArray(v) ? v : [];
        const cleaned = vals.map((x) => String(x).trim()).filter(Boolean);
        if (cleaned.length <= 3) return `${c} ${op} (${cleaned.map((x) => `"${x}"`).join(", ")})`;
        return `${c} ${op} (…)`;
      }
      if (typeof v === "string") return `${c} ${op} "${v}"`;
      if (typeof v === "number" && Number.isFinite(v)) return `${c} ${op} ${v}`;
      return `${c} ${op}`;
    })
    .filter(Boolean);
  return { hasWhere: parts.length > 0, text: parts.join(" AND ") };
}

function selectLabelsFromCardOrSpec(card, composeSpec) {
  if (Array.isArray(card?.selectAliases) && card.selectAliases.length) {
    return card.selectAliases.map((s) => String(s).trim()).filter(Boolean);
  }
  if (Array.isArray(composeSpec?.select) && composeSpec.select.length) {
    return composeSpec.select
      .map((i) => String(i?.alias || i?.column || "").trim())
      .filter(Boolean);
  }
  if (Array.isArray(card?.selectColumns) && card.selectColumns.length) {
    return card.selectColumns.map((s) => String(s).trim()).filter(Boolean);
  }
  return [];
}

/**
 * Human-readable summary of the compose query (for request history + replay).
 */
export function formatConnectRequestCardQuery(card, sheet) {
  if (!card && !sheet?.provenance) return "";

  const stored = String(card?.querySummary || "").trim();
  if (stored) return stored;

  const prov = sheet?.provenance;
  const lake = card?.lake || prov?.lake;
  const table = card?.table || prov?.table;
  const composeSpec = prov?.composeSpec;
  const integration = integrationLabelFromLake(lake);

  const lines = [];

  if (table) {
    lines.push(`${integration} · ${table}`);
  } else if (integration) {
    lines.push(integration);
  }

  const selectList = selectLabelsFromCardOrSpec(card, composeSpec);
  if (selectList.length) {
    lines.push(`SELECT ${selectList.join(", ")}`);
  }

  const groupBy = Array.isArray(composeSpec?.groupByAliases)
    ? composeSpec.groupByAliases.map((s) => String(s).trim()).filter(Boolean)
    : [];
  if (groupBy.length) {
    lines.push(`GROUP BY ${groupBy.join(", ")}`);
  }

  if (card?.hasWhere) {
    const where = String(card?.whereText || "").trim();
    if (where) lines.push(`WHERE ${where}`);
  }

  const orderBy = Array.isArray(composeSpec?.orderBy) ? composeSpec.orderBy : [];
  if (orderBy.length) {
    const ord = orderBy
      .map((o) => {
        const alias = String(o?.alias || "").trim();
        if (!alias) return "";
        const dir = String(o?.direction || "asc").toLowerCase() === "desc" ? "DESC" : "ASC";
        return `${alias} ${dir}`;
      })
      .filter(Boolean)
      .join(", ");
    if (ord) lines.push(`ORDER BY ${ord}`);
  }

  if (card?.composeRowLimit != null && card.composeRowLimit !== "") {
    lines.push(`LIMIT ${card.composeRowLimit}`);
  }

  return lines.join(" · ");
}

/** Persist on request card at pull time (matches formatConnectRequestCardQuery). */
export function buildRequestCardQuerySummary({
  lake,
  table,
  composeSpec,
  selectAliases,
  hasWhere,
  whereText,
  composeRowLimit,
}) {
  return formatConnectRequestCardQuery(
    {
      lake,
      table,
      selectAliases,
      hasWhere,
      whereText,
      composeRowLimit,
    },
    { provenance: { lake, table, composeSpec } },
  );
}
