import { getConnectDataLakeConfig } from "@/lib/connectQueryComposeConfig";
import { genComposeJoinId, genComposeRowId } from "@/lib/dataLakeComposeHelpers";
import { normalizeHubQueryDraft, normalizeHubQueryWhereFilters } from "@/lib/hubs/hubQueryDraft";

/**
 * @param {string | null | undefined} lake
 * @returns {"polymarketHistorical" | "kalshiHistorical" | null}
 */
export function integrationIdFromLake(lake) {
  const L = String(lake || "").toLowerCase().trim();
  if (L === "polymarket" || L === "polymarket-historical") return "polymarketHistorical";
  if (L === "kalshi" || L === "kalshi-historical") return "kalshiHistorical";
  return null;
}

/**
 * @param {string} integrationId
 * @param {string | null | undefined} table
 */
export function sampleIdForLakeTable(integrationId, table) {
  const cfg = getConnectDataLakeConfig(integrationId);
  const t = String(table || "").toLowerCase().trim();
  if (!cfg || !t) return null;
  const hit = (cfg.sampleOptions || []).find((s) => String(s.table || "").toLowerCase() === t);
  return hit?.id || null;
}

/**
 * @param {object | null | undefined} selectRow
 */
function composeItemFromSelectRow(selectRow) {
  const column = String(selectRow?.column || "").trim();
  if (!column) return null;
  const alias = String(selectRow?.alias || column).trim() || column;
  const aggregate = selectRow?.aggregate != null ? String(selectRow.aggregate) : null;
  return {
    id: genComposeRowId(),
    column,
    alias,
    aggregate,
    dateBucket: selectRow?.dateBucket ?? null,
    dateFormat: selectRow?.dateFormat ?? null,
    stringBucket: selectRow?.stringBucket ?? null,
    numberBucket: selectRow?.numberBucket != null ? Number(selectRow.numberBucket) : null,
    numberScale: selectRow?.numberScale || "none",
    decimals: selectRow?.decimals != null ? Number(selectRow.decimals) : null,
    treatAsDate: selectRow?.treatAsDate === true,
    sumCase:
      selectRow?.sumCase && typeof selectRow.sumCase === "object"
        ? selectRow.sumCase
        : { enabled: false, branches: [], elseColumn: "" },
    equation:
      selectRow?.equation && typeof selectRow.equation === "object"
        ? selectRow.equation
        : { enabled: false },
    displayName: alias !== column ? alias : null,
    ...(selectRow?.sourceTable
      ? { sourceTable: String(selectRow.sourceTable).trim().toLowerCase() }
      : {}),
  };
}

/**
 * @param {object | null | undefined} composeSpec
 * @param {object | null | undefined} provenance
 */
function joinsFromProvenance(composeSpec, provenance) {
  /** @type {object[]} */
  const out = [];
  const tableJoins = Array.isArray(composeSpec?.joins) ? composeSpec.joins : [];
  for (const j of tableJoins) {
    const table = String(j?.table || "").trim().toLowerCase();
    const leftColumn = String(j?.on?.leftColumn || "").trim();
    const rightColumn = String(j?.on?.rightColumn || "").trim();
    if (!table || !leftColumn || !rightColumn) continue;
    out.push({
      id: genComposeJoinId(),
      targetKind: "table",
      targetTable: table,
      targetSheetId: "",
      joinType: j?.joinType || "inner",
      mergeStrategy: "server",
      leftColumn,
      rightColumn,
    });
  }

  const serverSheetJoins = Array.isArray(provenance?.serverSheetJoins)
    ? provenance.serverSheetJoins
    : [];
  for (const j of serverSheetJoins) {
    const targetSheetId = String(j?.targetSheetId || "").trim();
    const leftColumn = String(j?.leftColumn || "").trim();
    const rightColumn = String(j?.rightColumn || "").trim();
    if (!targetSheetId || !leftColumn || !rightColumn) continue;
    out.push({
      id: genComposeJoinId(),
      targetKind: "sheet",
      targetTable: "",
      targetSheetId,
      joinType: j?.joinType || "left",
      mergeStrategy: "server",
      leftColumn,
      rightColumn,
    });
  }

  const browserSheetJoins = Array.isArray(provenance?.browserSheetJoins)
    ? provenance.browserSheetJoins
    : [];
  for (const j of browserSheetJoins) {
    const targetSheetId = String(j?.targetSheetId || "").trim();
    const leftColumn = String(j?.leftColumn || "").trim();
    const rightColumn = String(j?.rightColumn || "").trim();
    if (!targetSheetId || !leftColumn || !rightColumn) continue;
    out.push({
      id: genComposeJoinId(),
      targetKind: "sheet",
      targetTable: "",
      targetSheetId,
      joinType: j?.joinType || "left",
      mergeStrategy: "browser",
      leftColumn,
      rightColumn,
    });
  }

  return out;
}

/**
 * Derive which refine panels should be open from restored compose state.
 * @param {object} draft partial
 */
export function activeComposeOpsFromDraftParts(draft) {
  /** @type {string[]} */
  const ops = [];
  if (Array.isArray(draft.whereFilters) && draft.whereFilters.length > 0) ops.push("where");
  if (Array.isArray(draft.orderBy) && draft.orderBy.length > 0) ops.push("sort");
  if (draft.composeLimitOpen) ops.push("row_limit");
  if (
    Array.isArray(draft.columnComposeItems) &&
    draft.columnComposeItems.some((i) => i?.aggregate != null)
  ) {
    ops.push("summarize");
  }
  if (
    Array.isArray(draft.columnComposeItems) &&
    draft.columnComposeItems.some((i) => i?.sumCase?.enabled)
  ) {
    ops.push("if_else");
  }
  if (Array.isArray(draft.havingFilters) && draft.havingFilters.length > 0) ops.push("having");
  if (Array.isArray(draft.joins) && draft.joins.length > 0) ops.push("join");
  return ops;
}

/**
 * Build a hub query draft from sheet provenance so Edit can reopen compose.
 *
 * @param {{
 *   provenance?: object | null;
 *   sheet?: object | null;
 *   sheetId?: string | null;
 * }} args
 * @returns {import("./hubQueryDraft").HubQueryDraft | null}
 */
export function buildHubQueryDraftFromProvenance({ provenance, sheet, sheetId } = {}) {
  const prov = provenance || sheet?.provenance;
  if (!prov || typeof prov !== "object") return null;

  const kind = String(prov.kind || "").trim();
  if (kind && kind !== "compose" && kind !== "compose_browser_join") return null;

  const lake = prov.lake || prov.source;
  const integrationId = integrationIdFromLake(lake);
  if (!integrationId) return null;

  const table = String(prov.table || "").trim().toLowerCase();
  const sampleId = sampleIdForLakeTable(integrationId, table);
  if (!sampleId) return null;

  const composeSpec = prov.composeSpec && typeof prov.composeSpec === "object" ? prov.composeSpec : {};
  const selectRows = Array.isArray(composeSpec.select) ? composeSpec.select : [];
  const columnComposeItems = selectRows.map(composeItemFromSelectRow).filter(Boolean);
  if (!columnComposeItems.length) return null;

  const selectedColumns = [
    ...new Set(columnComposeItems.map((i) => String(i.column || "").trim()).filter(Boolean)),
  ];

  const whereFilters = normalizeHubQueryWhereFilters(
    Array.isArray(prov.composeFilters?.and) ? prov.composeFilters.and : [],
  );

  const orderBy = (Array.isArray(composeSpec.orderBy) ? composeSpec.orderBy : [])
    .map((o) => ({
      alias: String(o?.alias || "").trim(),
      direction: String(o?.direction || "asc").toLowerCase().trim() === "desc" ? "desc" : "asc",
    }))
    .filter((o) => o.alias);

  const havingFilters = (Array.isArray(composeSpec.having?.and) ? composeSpec.having.and : [])
    .map((f) => ({
      id: `h-${Date.now().toString(36)}-${Math.random().toString(16).slice(2)}`,
      havingAlias: String(f?.alias || "").trim(),
      op: String(f?.op || "gt").trim() || "gt",
      value: f?.value ?? "",
    }))
    .filter((f) => f.havingAlias);

  const joins = joinsFromProvenance(composeSpec, prov);

  const randomSample =
    composeSpec.randomSample && typeof composeSpec.randomSample === "object"
      ? composeSpec.randomSample
      : null;
  const randomSampleEnabled = randomSample?.enabled === true;
  const randomSampleSize =
    randomSampleEnabled && randomSample?.size != null ? String(randomSample.size) : "";

  const limitFromProv =
    prov.composeAthenaRowLimit != null && Number.isFinite(Number(prov.composeAthenaRowLimit))
      ? String(Math.floor(Number(prov.composeAthenaRowLimit)))
      : "";
  const composeLimitOpen = !randomSampleEnabled && !!limitFromProv;
  const composeLimitScope =
    composeSpec.limitScope === "result" || composeSpec.limitScope === "primary"
      ? composeSpec.limitScope
      : "primary";

  const sheetName = String(sheet?.name || "").trim();

  const partial = {
    integrationId,
    sampleId,
    columnSelections: { [sampleId]: selectedColumns },
    whereFilters,
    columnComposeItems,
    orderBy,
    havingFilters,
    joins,
    composeLimitOpen,
    composeLimitValue: composeLimitOpen ? limitFromProv : "",
    composeLimitScope,
    randomSampleEnabled,
    randomSampleSize,
    pendingSheetName: sheetName || undefined,
    sourceSheetId: sheetId ? String(sheetId) : undefined,
  };
  partial.activeComposeOps = activeComposeOpsFromDraftParts(partial);

  return normalizeHubQueryDraft(partial);
}
