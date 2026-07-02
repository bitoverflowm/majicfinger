import { getOrCreateVisitorId } from "@/lib/analytics/visitorSession";
import { resolveHubAnalyticsFromPath } from "@/lib/hubs/analyticsManifest";

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];

/** @param {string} pathname */
export function inferPageTypeFromPath(pathname) {
  const path = String(pathname || "").replace(/\/+$/, "") || "/";
  if (path === "/") return "homepage";
  if (path.startsWith("/guides")) return path === "/guides" ? "guides_index" : "guide";
  if (path.startsWith("/try")) return "try";
  if (path.startsWith("/dashboard")) return "dashboard";
  const hub = resolveHubAnalyticsFromPath(path);
  if (hub) return hub.pageType;
  return "marketing";
}

/** @param {string} pathname */
export function inferPageNameFromPath(pathname) {
  const path = String(pathname || "").replace(/\/+$/, "") || "/";
  if (path === "/") return "Homepage";
  if (path.startsWith("/guides/")) {
    return path.slice("/guides/".length) || "Guide";
  }
  if (path === "/guides") return "Guides index";
  const hub = resolveHubAnalyticsFromPath(path);
  if (hub?.name) return hub.name;
  return path;
}

/** @param {string} search */
export function extractUtmParams(search = "") {
  /** @type {Record<string, string>} */
  const utm = {};
  if (!search) return utm;
  try {
    const params = new URLSearchParams(search.startsWith("?") ? search : `?${search}`);
    for (const key of UTM_KEYS) {
      const value = params.get(key);
      if (value) utm[key] = value;
    }
  } catch {
    /* ignore malformed query strings */
  }
  return utm;
}

/**
 * Rich landing context for session_start (client-only).
 * @param {{ isLoggedIn?: boolean; email?: string; userId?: string }} [identity]
 */
export function buildSessionStartMeta(identity = {}) {
  if (typeof window === "undefined") return {};

  const { pathname, search, href } = window.location;
  const entryPath = pathname || "/";
  const utm = extractUtmParams(search);

  return {
    entryPath,
    entryUrl: href || entryPath,
    entrySearch: search || "",
    referrer: document.referrer || "",
    pageType: inferPageTypeFromPath(entryPath),
    pageName: inferPageNameFromPath(entryPath),
    visitorId: getOrCreateVisitorId(),
    ...utm,
    isLoggedIn: !!identity.isLoggedIn,
    email: identity.email,
    userId: identity.userId,
  };
}
