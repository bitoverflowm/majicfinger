/**
 * First URL segment values that must not be claimed as user_name — they collide with
 * app routes or reserved embed paths (`/{handle}/charts/...`, `/{handle}/dashboards/...`).
 */
const RESERVED = new Set(
  [
    "api",
    "_next",
    "static",
    "favicon.ico",
    "robots.txt",
    "sitemap.xml",
    "dashboard",
    "login",
    "logout",
    "guides",
    "blog",
    "playbooks",
    "integrations",
    "concepts",
    "search",
    "easy",
    "embed",
    "charts",
    "dashboards",
    "pricing",
    "playground",
    "landingpage_v2",
    "playground",
    "admin",
    "settings",
    "profile",
    "register",
    "upload",
    "data",
    "about",
    "terms",
    "privacy",
    "support",
    "help",
    "docs",
    "app",
    "www",
    "null",
    "undefined",
    "true",
    "false",
  ].map((s) => s.toLowerCase()),
);

export function isReservedUserHandle(handle) {
  if (handle == null || typeof handle !== "string") return true;
  const h = handle.trim().toLowerCase();
  if (h.length < 2) return true;
  return RESERVED.has(h);
}

export function reservedUserHandleMessage(handle) {
  return `The handle "${handle}" is reserved. Please choose another.`;
}
