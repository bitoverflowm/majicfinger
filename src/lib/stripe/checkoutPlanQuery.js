/**
 * Client-safe checkout plan/cycle checks. Keep aligned with planFromQuery in catalog.js.
 * No Stripe or Telegram imports — safe for browser bundles.
 */

const PAID_TIERS = new Set(["lite", "researcher", "quant", "basic", "pro", "elite"]);
const PAID_CYCLES = new Set(["weekly", "monthly", "annual"]);

export function normalizeCheckoutCycle(cycle) {
  const raw = String(cycle || "").trim().toLowerCase();
  if (raw === "yearly" || raw === "year") return "annual";
  return raw;
}

/** True when plan+cycle would resolve to a CHECKOUT_PLANS entry. */
export function isKnownCheckoutQuery(plan, cycle) {
  const name = String(plan || "").trim().toLowerCase();
  if (!name) return false;
  if (name === "lifetime") return true;
  if (name === "mcp_prereg" || name === "mcp-prereg" || name === "jarvis") return true;
  return PAID_TIERS.has(name) && PAID_CYCLES.has(normalizeCheckoutCycle(cycle));
}
