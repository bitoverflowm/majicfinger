import {
  inferPageNameFromPath,
  inferPageTypeFromPath,
} from "@/lib/analytics/sessionStartMeta";
import { resolveHubAnalyticsFromPath } from "@/lib/hubs/analyticsManifest";

/** @type {Record<string, unknown>} */
let surfaceContext = {};

/** @param {Record<string, unknown>} ctx */
export function setDataPullSurfaceContext(ctx = {}) {
  surfaceContext = { ...surfaceContext, ...ctx };
}

/** @param {Record<string, unknown>} [overrides] */
export function clearDataPullSurfaceContext(overrides = {}) {
  surfaceContext = { ...overrides };
}

/**
 * @param {Record<string, unknown>} ctx
 * @returns {string}
 */
export function inferQuerySurface(ctx = {}) {
  const pathname =
    String(ctx.queryPath || (typeof window !== "undefined" ? window.location.pathname : "") || "").trim() ||
    "/";
  const href = String(
    ctx.queryUrl || (typeof window !== "undefined" ? window.location.href : "") || "",
  );

  if (ctx.hubQueryHandoff || ctx.sourceHubPath) return "hub_query_handoff";
  if (ctx.isDemo && (pathname === "/" || href.includes("#demo"))) return "homepage_demo";
  if (ctx.isDemo) return "dashboard_demo";
  if (pathname.startsWith("/guides")) return "guide_page";

  const hub = resolveHubAnalyticsFromPath(pathname);
  if (hub) return "marketing_hub";

  if (pathname.startsWith("/dashboard")) {
    return ctx.isLoggedIn || ctx.userId ? "dashboard_logged_in" : "dashboard_anonymous";
  }

  return "other";
}

/**
 * @param {string} surface
 * @param {Record<string, unknown>} ctx
 */
export function querySurfaceLabel(surface, ctx = {}) {
  const workspace = ctx.connectWorkspace ? String(ctx.connectWorkspace) : "";

  switch (surface) {
    case "homepage_demo":
      return "Homepage demo (#demo)";
    case "dashboard_logged_in":
      if (ctx.connectHomeMode && workspace) {
        return `Logged-in dashboard · Connect home · ${workspace}`;
      }
      if (ctx.connectHomeMode) return "Logged-in dashboard · Connect home";
      if (workspace) return `Logged-in dashboard · ${workspace}`;
      return "Logged-in dashboard";
    case "dashboard_demo":
      if (ctx.connectHomeMode && workspace) {
        return `Homepage demo · Connect home · ${workspace}`;
      }
      return "Homepage demo (embedded dashboard)";
    case "dashboard_anonymous":
      return workspace ? `Dashboard (anonymous) · ${workspace}` : "Dashboard (anonymous)";
    case "hub_query_handoff":
      if (ctx.sourceHubName) return `Hub query → dashboard (from ${ctx.sourceHubName})`;
      if (ctx.sourceHubPath) return `Hub query → dashboard (from ${ctx.sourceHubPath})`;
      return "Hub query → dashboard";
    case "marketing_hub":
      return ctx.pageName ? `Marketing hub · ${ctx.pageName}` : "Marketing hub page";
    case "guide_page":
      return ctx.pageName ? `Guide · ${ctx.pageName}` : "Guide page";
    case "other":
      return ctx.pageName ? `Other · ${ctx.pageName}` : "Other page";
    default:
      return "Unknown surface";
  }
}

/**
 * Client-side context merged into every data-pull analytics event.
 * @param {Record<string, unknown>} [overrides]
 */
export function buildDataPullContext(overrides = {}) {
  if (typeof window === "undefined") {
    return { ...surfaceContext, ...overrides };
  }

  const pathname = window.location.pathname || "/";
  const href = window.location.href || pathname;
  const search = window.location.search || "";
  const pageType = inferPageTypeFromPath(pathname);
  const pageName = inferPageNameFromPath(pathname);

  const merged = {
    queryPath: pathname,
    queryUrl: href.slice(0, 240),
    querySearch: search,
    pageType,
    pageName,
    ...surfaceContext,
    ...overrides,
  };

  const querySurface = inferQuerySurface(merged);
  return {
    ...merged,
    querySurface,
    querySurfaceLabel: querySurfaceLabel(querySurface, merged),
  };
}

/**
 * @param {Record<string, unknown>} meta
 */
export function buildDataPullTelegramFields(meta = {}) {
  /** @type {Record<string, string>} */
  const fields = {};

  if (meta.querySurfaceLabel) fields["Run from"] = String(meta.querySurfaceLabel);
  if (meta.pageType) fields["Page type"] = String(meta.pageType);
  if (meta.pageName) fields.Page = String(meta.pageName);
  if (meta.queryUrl) fields.URL = String(meta.queryUrl).slice(0, 240);
  else if (meta.queryPath) fields.Path = String(meta.queryPath);
  if (meta.connectWorkspace) fields.Workspace = String(meta.connectWorkspace);
  if (meta.sourceHubPath) fields["Hub origin"] = String(meta.sourceHubPath);

  return fields;
}
