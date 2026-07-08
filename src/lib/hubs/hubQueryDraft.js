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
 * @property {string} [guidedWorkflowId]
 */

/** @param {unknown} filters */
export function normalizeHubQueryWhereFilters(filters) {
  if (!Array.isArray(filters)) return [];
  return filters
    .map((f) => {
      if (!f || typeof f !== "object") return null;
      const column = String(f.column || "").trim();
      const value = String(f.value ?? "").trim();
      if (!column || !value) return null;
      const kindRaw = String(f.kind || "").toLowerCase().trim();
      const kind =
        kindRaw === "date" ? "date" : kindRaw === "number" ? "number" : "string";
      const op = String(f.op || "eq").trim() || "eq";
      return {
        id: String(f.id || `w-${column}-${Math.random().toString(36).slice(2)}`),
        column,
        kind,
        op,
        value,
      };
    })
    .filter(Boolean);
}

/** @param {unknown} draft */
export function hasComposeDraftPayload(draft) {
  if (!draft || typeof draft !== "object") return false;
  return (
    (Array.isArray(draft.whereFilters) && draft.whereFilters.length > 0) ||
    (Array.isArray(draft.columnComposeItems) && draft.columnComposeItems.length > 0) ||
    (Array.isArray(draft.orderBy) && draft.orderBy.length > 0) ||
    (Array.isArray(draft.activeComposeOps) && draft.activeComposeOps.length > 0) ||
    !!draft.composeLimitOpen
  );
}

/**
 * Compose WHERE filters from live panel state, with guided inline-pull draft fallback.
 * @param {unknown} composeWhereFilters
 * @param {boolean} guidedWorkflowPull
 * @param {React.MutableRefObject<import("./hubQueryDraft").HubQueryDraft | null> | null | undefined} guidedHubDraftRef
 */
export function resolveEffectiveHubWhereFilters(
  composeWhereFilters,
  guidedWorkflowPull,
  guidedHubDraftRef,
) {
  const fromCompose = normalizeHubQueryWhereFilters(composeWhereFilters);
  if (fromCompose.length > 0) return fromCompose;
  if (!guidedWorkflowPull || !guidedHubDraftRef?.current) return [];
  return normalizeHubQueryWhereFilters(guidedHubDraftRef.current.whereFilters);
}

/** @param {HubQueryWhereFilter[]} whereFilters */
export function buildComposeFiltersPayload(whereFilters) {
  const normalized = normalizeHubQueryWhereFilters(whereFilters);
  if (!normalized.length) return null;
  return { and: normalized, or: [] };
}

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

/** Guided workflow handoffs that may run without logging in first. */
export function isGuidedGuestHubQueryDraft(draft) {
  return !!draft?.guidedWorkflowId;
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
    whereFilters: normalizeHubQueryWhereFilters(draft.whereFilters),
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
    guidedWorkflowId: draft.guidedWorkflowId
      ? String(draft.guidedWorkflowId).trim()
      : undefined,
  };
}
