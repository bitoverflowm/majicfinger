/** Legacy compose provenance, plus the enrichment link the provenance map reads. */

const PREVIEW_CAP = 50;

export function composeProvenance(request, extra = {}) {
  if (!request || typeof request !== "object") return null;
  const lake = String(request.lake || "").trim();
  const table = String(request.table || "").trim();
  if (!lake || !table) return null;
  const limit = Number(request.limit);
  const join = extra.join && typeof extra.join === "object" ? extra.join : null;
  return {
    kind: "compose",
    lake,
    table,
    composeSpec: request.compose && typeof request.compose === "object" ? request.compose : {},
    composeFilters: request.filters && typeof request.filters === "object" ? request.filters : null,
    ...(Number.isFinite(limit) && limit > 0 ? { composeAthenaRowLimit: Math.floor(limit) } : {}),
    serverSheetJoins: [],
    browserSheetJoins: [],
    ...(extra.integrationId ? { integrationId: String(extra.integrationId) } : {}),
    ...(extra.summary ? { summary: String(extra.summary) } : {}),
    ...(Array.isArray(extra.attributeLines) && extra.attributeLines.length ? { attributeLines: extra.attributeLines.map(String) } : {}),
    ...(extra.sortLine ? { sortLine: String(extra.sortLine) } : {}),
    ...(extra.parentSheetId ? { parentSheetId: String(extra.parentSheetId) } : {}),
    ...(join ? { join } : {}),
  };
}

export function enrichmentProvenance({ operation, parentSheetId, summary, detail } = {}) {
  const op = String(operation || "").trim();
  if (!op) return null;
  return {
    kind: "enrichment",
    operation: op,
    ...(parentSheetId ? { parentSheetId: String(parentSheetId) } : {}),
    ...(summary ? { summary: String(summary) } : {}),
    ...(detail && typeof detail === "object" ? { detail } : {}),
    serverSheetJoins: [],
    browserSheetJoins: [],
  };
}

export function requestCardForSheet(sheet, historyId) {
  const provenance = sheet?.provenance;
  if (!provenance || provenance.kind !== "compose") return null;
  return {
    id: `${historyId}:${sheet.id}`,
    kind: "compose",
    createdAt: new Date().toISOString(),
    lake: provenance.lake,
    table: provenance.table,
    querySummary: sheet.summary || provenance.summary || "",
    loadedRowCount: sheet.rowCount || (sheet.rows || []).length,
    ...(provenance.join ? { join: provenance.join } : {}),
  };
}

/**
 * Keep a short preview on the sheet. The compose recipe is what a later open replays.
 * Enrichment sheets keep their computed preview and point at the parent recipe.
 */
export function stampRunSheets(sheets, { integrationId } = {}) {
  const list = Array.isArray(sheets) ? sheets : [];
  const primary = list.find((sheet) => sheet?.composeRequest && !sheet.pull && !sheet.enrichment);
  const parentId = primary?.id || list[0]?.id || "";
  return list.map((sheet) => {
    const rows = Array.isArray(sheet?.rows) ? sheet.rows : [];
    const rowCount = Math.max(rows.length, Math.floor(Number(sheet?.rowCount) || 0));
    const kept = sheet?.keepAllRows ? rows.length : PREVIEW_CAP;
    let provenance = sheet?.provenance || null;
    if (!provenance && sheet?.enrichment) {
      provenance = enrichmentProvenance({
        ...sheet.enrichment,
        parentSheetId: sheet.enrichment.parentSheetId || parentId,
        summary: sheet.summary,
      });
    } else if (!provenance && (sheet?.composeRequest || sheet?.pull)) {
      provenance = composeProvenance(sheet.composeRequest || requestFromPull(sheet.pull), {
        integrationId: integrationId || sheet.integrationId,
        summary: sheet.summary,
        attributeLines: sheet.attributeLines,
        sortLine: sheet.sortLine,
        parentSheetId: sheet.pull || sheet.joinMeta ? parentId : "",
        join: sheet.joinMeta || joinFromPull(sheet.pull),
      });
    }
    return {
      ...sheet,
      rows: rows.slice(0, kept),
      rowCount,
      provenance,
    };
  });
}

function joinFromPull(pull) {
  if (!pull || typeof pull !== "object") return null;
  const tokens = Array.isArray(pull.tokens) ? pull.tokens.filter(Boolean) : [];
  return {
    match: tokens.length ? "outcomeToken" : "ticker",
    role: "trades",
    ...(pull.ticker ? { key: String(pull.ticker) } : {}),
  };
}

function requestFromPull(pull) {
  if (!pull?.lake || !pull?.table) return null;
  const tokens = Array.isArray(pull.tokens) ? pull.tokens.map((token) => String(token || "").trim()).filter(Boolean) : [];
  if (tokens.length) {
    return {
      lake: pull.lake,
      table: "trades",
      limit: pull.limit,
      filters: {
        or: tokens.slice(0, 24).flatMap((token) => [
          { column: "maker_asset_id", kind: "string", op: "eq", value: token },
          { column: "taker_asset_id", kind: "string", op: "eq", value: token },
        ]),
      },
      compose: {
        select: [],
        groupByAliases: [],
        orderBy: [{ alias: "timestamp", direction: "desc" }],
      },
    };
  }
  return {
    lake: pull.lake,
    table: pull.table,
    limit: pull.limit,
    filters: {
      and: [{ column: "ticker", kind: "string", op: "eq", value: String(pull.ticker || "") }],
    },
    compose: {
      select: [],
      groupByAliases: [],
      orderBy: [{ alias: "created_time", direction: "desc" }],
    },
  };
}
