/** Hard ceiling for compose LIMIT (aligned with `buildComposeAthenaSql`). */
export const COMPOSE_LIMIT_ABSOLUTE_MAX = 500000;

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
