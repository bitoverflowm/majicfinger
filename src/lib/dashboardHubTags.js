/** Tag fallback for dashboards whose sheets carry no provenance. Most specific first. */
const TAG_HUB_RULES = [
  { test: (t) => t === "kalshi-live" || t.startsWith("kalshi live"), hub: "kalshi-live-data" },
  { test: (t) => t === "polymarket-live" || t.startsWith("polymarket live"), hub: "polymarket-live-data" },
  { test: (t) => t.includes("polymarket") && t.includes("historical"), hub: "polymarket-historical-data" },
  { test: (t) => t.includes("kalshi"), hub: "kalshi-historical-data" },
  { test: (t) => t.includes("polymarket"), hub: "polymarket-historical-data" },
];

export function hubSlugFromTags(tags) {
  const normalized = (Array.isArray(tags) ? tags : [])
    .map((t) => String(t || "").trim().toLowerCase())
    .filter(Boolean);
  for (const rule of TAG_HUB_RULES) {
    if (normalized.some(rule.test)) return rule.hub;
  }
  return null;
}
