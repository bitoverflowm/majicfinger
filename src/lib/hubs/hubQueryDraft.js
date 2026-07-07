const STORAGE_KEY = "lychee:hubQueryDraft";

/**
 * @typedef {object} HubQueryWhereFilter
 * @property {string} id
 * @property {string} column
 * @property {"string" | "number"} kind
 * @property {string} op
 * @property {string} value
 */

/**
 * @typedef {object} HubQueryDraft
 * @property {1} version
 * @property {"kalshiHistorical"} integrationId
 * @property {string} sampleId
 * @property {Record<string, string[]>} columnSelections
 * @property {HubQueryWhereFilter[]} [whereFilters]
 * @property {string[]} [activeComposeOps]
 * @property {object[]} [columnComposeItems]
 * @property {object[]} [orderBy]
 * @property {object[]} [havingFilters]
 * @property {object[]} [joins]
 * @property {boolean} [composeLimitOpen]
 * @property {string} [composeLimitValue]
 * @property {string} [composeLimitScope]
 * @property {string} [pendingSheetName]
 * @property {string} [sourceHubPath]
 * @property {string} [sourceHubName]
 * @property {{ ticker: string; entity: "markets" | "trades" }} [powerSearch]
 */

/**
 * @param {HubQueryDraft} draft
 */
export function saveHubQueryDraft(draft) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    /* ignore */
  }
}

/**
 * @returns {HubQueryDraft | null}
 */
export function loadHubQueryDraft() {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.version !== 1 || !parsed?.sampleId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearHubQueryDraft() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function buildHubQueryDashboardUrl() {
  return "/dashboard?hubQuery=1";
}

/**
 * @param {string} path
 */
export function navigateToHubQueryDashboard(path = buildHubQueryDashboardUrl()) {
  if (typeof window === "undefined") return;
  const url = path.startsWith("http") ? path : `${window.location.origin}${path}`;
  if (window.self !== window.top) {
    window.top.location.href = url;
    return;
  }
  window.location.href = url;
}

/**
 * @param {Partial<HubQueryDraft>} draft
 * @returns {HubQueryDraft | null}
 */
export function normalizeHubQueryDraft(draft) {
  const sampleId = String(draft?.sampleId || "").trim();
  if (!sampleId) return null;
  const selections = draft?.columnSelections?.[sampleId] || [];
  if (!Array.isArray(selections) || selections.length === 0) return null;
  return {
    version: 1,
    integrationId: "kalshiHistorical",
    sampleId,
    columnSelections: draft.columnSelections || { [sampleId]: selections },
    whereFilters: Array.isArray(draft.whereFilters) ? draft.whereFilters : [],
    activeComposeOps: Array.isArray(draft.activeComposeOps) ? draft.activeComposeOps : [],
    columnComposeItems: Array.isArray(draft.columnComposeItems) ? draft.columnComposeItems : [],
    orderBy: Array.isArray(draft.orderBy) ? draft.orderBy : [],
    havingFilters: Array.isArray(draft.havingFilters) ? draft.havingFilters : [],
    joins: Array.isArray(draft.joins) ? draft.joins : [],
    composeLimitOpen: !!draft.composeLimitOpen,
    composeLimitValue: draft.composeLimitValue != null ? String(draft.composeLimitValue) : "",
    composeLimitScope: draft.composeLimitScope ? String(draft.composeLimitScope) : "primary",
    pendingSheetName: draft.pendingSheetName ? String(draft.pendingSheetName).trim() : undefined,
    sourceHubPath: draft.sourceHubPath ? String(draft.sourceHubPath).trim() : undefined,
    sourceHubName: draft.sourceHubName ? String(draft.sourceHubName).trim() : undefined,
    powerSearch: draft.powerSearch,
  };
}
