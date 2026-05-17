export function integrationLabelFromLake(lake) {
  const key = String(lake || "").toLowerCase();
  if (key === "kalshi") return "Kalshi Historical";
  if (key === "polymarket") return "Polymarket Historical";
  return key ? `${key.charAt(0).toUpperCase()}${key.slice(1)}` : "Data Lake";
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
