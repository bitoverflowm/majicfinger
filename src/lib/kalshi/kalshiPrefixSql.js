/**
 * Kalshi virtual column: leading A–Z/0–9 token from `event_ticker` (Athena regexp_extract).
 * Shared by compose SELECT and WHERE predicate expansion.
 *
 * @param {string} eventTickerExpr SQL expression for event_ticker, e.g. t0."event_ticker"
 */
export function kalshiEventTickerCategorySql(eventTickerExpr) {
  return `(CASE
    WHEN ${eventTickerExpr} IS NULL
      OR CAST(${eventTickerExpr} AS VARCHAR) = '' THEN 'independent'
    WHEN regexp_extract(CAST(${eventTickerExpr} AS VARCHAR), '^([A-Z0-9]+)', 1) = '' THEN 'independent'
    ELSE regexp_extract(CAST(${eventTickerExpr} AS VARCHAR), '^([A-Z0-9]+)', 1)
  END)`;
}
