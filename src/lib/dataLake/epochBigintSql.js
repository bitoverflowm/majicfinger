/**
 * Bigint epoch seconds/ms/us/ns → numeric seconds (Athena/Presto).
 * @param {string} colExpr
 */
export function epochBigintToSecondsExpr(colExpr) {
  return `(CASE
    WHEN ${colExpr} IS NULL THEN NULL
    WHEN ABS(CAST(${colExpr} AS DOUBLE)) >= 1e17 THEN CAST(${colExpr} AS DOUBLE) / 1e9
    WHEN ABS(CAST(${colExpr} AS DOUBLE)) >= 1e14 THEN CAST(${colExpr} AS DOUBLE) / 1e6
    WHEN ABS(CAST(${colExpr} AS DOUBLE)) >= 1e11 THEN CAST(${colExpr} AS DOUBLE) / 1e3
    ELSE CAST(${colExpr} AS DOUBLE)
  END)`;
}

/** @param {string} colExpr */
export function epochBigintToTimestampExpr(colExpr) {
  return `from_unixtime(${epochBigintToSecondsExpr(colExpr)})`;
}
