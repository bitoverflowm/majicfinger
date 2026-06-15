/** Hard ceiling for compose LIMIT (aligned with `buildComposeAthenaSql`). */
export const COMPOSE_LIMIT_ABSOLUTE_MAX = 500000;

/**
 * Max joined rows fetched into the browser sheet after a primary-table LIMIT + join.
 * One market can fan out to hundreds of thousands of trades; uncapped pulls freeze the UI.
 */
export const COMPOSE_PRIMARY_JOIN_EXPAND_CAP_DEFAULT = 25_000;

/** @param {number} tierCap — server `maxComposeRows` for the user */
export function composePrimaryJoinExpandCap(tierCap) {
  const env = parseInt(process.env.COMPOSE_PRIMARY_JOIN_EXPAND_CAP || "", 10);
  const configured =
    Number.isFinite(env) && env > 0 ? Math.min(env, COMPOSE_LIMIT_ABSOLUTE_MAX) : COMPOSE_PRIMARY_JOIN_EXPAND_CAP_DEFAULT;
  const tier = Math.max(1, Math.floor(Number(tierCap) || COMPOSE_PRIMARY_JOIN_EXPAND_CAP_DEFAULT));
  return Math.min(tier, configured);
}

/**
 * True when LIMIT applies to the base table inside a CTE and joined rows fan out without an outer LIMIT.
 * Result fetch pagination must use the tier cap, not the user's primary-table limit.
 */
export function composeUsesPrimaryTableLimit(compose, limit) {
  if (!compose || typeof compose !== "object") return false;
  const lim =
    limit != null && Number.isFinite(Number(limit))
      ? Math.min(COMPOSE_LIMIT_ABSOLUTE_MAX, Math.max(1, Math.floor(Number(limit))))
      : null;
  if (lim == null) return false;
  const tableJoins = Array.isArray(compose.joins) ? compose.joins : [];
  if (!tableJoins.length) return false;
  const limitScope = String(compose.limitScope || "result").toLowerCase() === "primary" ? "primary" : "result";
  if (limitScope !== "primary") return false;
  const groupBy = Array.isArray(compose.groupByAliases) ? compose.groupByAliases : [];
  if (groupBy.length > 0) return false;
  const rows = Array.isArray(compose.select) ? compose.select : [];
  const hasAgg = rows.some((r) => r && r.aggregate != null);
  return !hasAgg;
}

/**
 * Row cap for Athena fetch + SQL outer LIMIT when primary-table scope expands a join.
 * @returns {number | null} finite cap, or null when not a primary join expand
 */
export function resolveComposeExpandedFetchRowLimit(compose, explicitLimit, tierCap) {
  if (!composeUsesPrimaryTableLimit(compose, explicitLimit)) return null;
  return composePrimaryJoinExpandCap(tierCap);
}
