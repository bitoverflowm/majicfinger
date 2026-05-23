const STORAGE_KEY = "lychee:runSource";

/**
 * @typedef {object} RunSourceContext
 * @property {"chart" | "dashboard"} kind
 * @property {string} ownerHandle
 * @property {string} [chartSlug]
 * @property {string} [dashboardSlug]
 */

/**
 * @param {RunSourceContext} ctx
 */
export function saveRunSourceContext(ctx) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ctx));
  } catch {
    /* ignore */
  }
}

/**
 * @returns {RunSourceContext | null}
 */
export function loadRunSourceContext() {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.ownerHandle) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * @param {RunSourceContext} ctx
 * @returns {string}
 */
export function buildTryUrlFromContext(ctx) {
  const params = new URLSearchParams();
  if (ctx.kind === "dashboard" && ctx.dashboardSlug) {
    params.set("from", `${ctx.ownerHandle}/dashboards/${ctx.dashboardSlug}`);
  } else if (ctx.chartSlug) {
    params.set("from", `${ctx.ownerHandle}/charts/${ctx.chartSlug}`);
  }
  const q = params.toString();
  return q ? `/try?${q}` : "/try";
}

/**
 * @param {string} fromParam e.g. misterrpink/charts/foo
 * @returns {RunSourceContext | null}
 */
export function parseFromQueryParam(fromParam) {
  const raw = String(fromParam || "").trim();
  if (!raw) return null;
  const parts = raw.split("/").filter(Boolean);
  if (parts.length < 3) return null;
  const [ownerHandle, kind, slug] = parts;
  if (kind === "charts") {
    return { kind: "chart", ownerHandle, chartSlug: slug };
  }
  if (kind === "dashboards") {
    return { kind: "dashboard", ownerHandle, dashboardSlug: slug };
  }
  return null;
}

/**
 * Open URL in top window when iframe-embedded.
 * @param {string} path
 */
export function navigateToRunFlow(path) {
  if (typeof window === "undefined") return;
  const url = path.startsWith("http") ? path : `${window.location.origin}${path}`;
  if (window.self !== window.top) {
    window.top.location.href = url;
    return;
  }
  window.location.href = url;
}
