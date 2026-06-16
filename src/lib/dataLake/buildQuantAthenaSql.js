/**
 * Validated Athena SQL for quant operations (relative position snapshots, etc.).
 */
import { isValidColumnIdentifier, resolveAthenaTableName } from "./athenaTableMap";
import { isDateLikeColumnName } from "./lakeTableColumns";

const SAFE_ALIAS = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function quoteCol(name) {
  const c = String(name || "").trim();
  if (!isValidColumnIdentifier(c)) {
    const err = new Error(`Invalid column: ${c}`);
    err.code = "BAD_REQUEST";
    throw err;
  }
  return `"${c}"`;
}

function quoteTable(physical) {
  const t = String(physical || "").trim();
  return `"${t}"`;
}

function progressNumericExpr(colRef, columnName) {
  const name = String(columnName || "").toLowerCase();
  if (isDateLikeColumnName(name)) {
    return `COALESCE(
      TRY(CAST(${colRef} AS DOUBLE)),
      TRY(to_unixtime(CAST(${colRef} AS timestamp))),
      TRY(to_unixtime(from_iso8601_timestamp(CAST(${colRef} AS varchar))))
    )`;
  }
  return `TRY(CAST(${colRef} AS DOUBLE))`;
}

function validateCheckpoints(checkpoints) {
  const list = Array.isArray(checkpoints) ? checkpoints : [];
  const out = list
    .map((c) => Number(c))
    .filter((n) => Number.isFinite(n))
    .map((n) => (n > 1 ? n / 100 : n))
    .filter((n) => n >= 0 && n <= 1);
  if (!out.length) {
    const err = new Error("At least one checkpoint required");
    err.code = "BAD_REQUEST";
    throw err;
  }
  return [...new Set(out)].sort((a, b) => a - b);
}

/**
 * Returns CTE chain + outer SELECT to append after sheet base CTEs in a WITH clause.
 * @param {object} params
 */
export function buildRelativePositionSnapshotAthenaSql({
  baseCteName,
  join,
  quant,
  limit = 50000,
}) {
  const base = String(baseCteName || "").trim();
  if (!SAFE_ALIAS.test(base)) {
    const err = new Error("Invalid base CTE name");
    err.code = "BAD_REQUEST";
    throw err;
  }

  const lake = String(join?.lake || "").toLowerCase();
  const joinTable = String(join?.table || "trades").toLowerCase();
  const physical = resolveAthenaTableName(lake, joinTable);
  if (!physical) {
    const err = new Error(`Join table unavailable: ${lake}/${joinTable}`);
    err.code = "BAD_REQUEST";
    throw err;
  }

  const leftKey = String(join?.leftKeyColumn || quant?.groupColumn || "").trim();
  const rightKey = String(join?.rightKeyColumn || leftKey).trim();
  const groupCol = String(quant?.groupColumn || leftKey).trim();
  const progressCol = String(quant?.progressColumn || "").trim();
  const endCol = String(quant?.endColumn || "").trim();
  const endRule = String(quant?.endRule || "auto");
  const checkpoints = validateCheckpoints(quant?.checkpoints);

  if (!leftKey || !rightKey || !groupCol || !progressCol) {
    const err = new Error("groupColumn, progressColumn, and join keys are required");
    err.code = "BAD_REQUEST";
    throw err;
  }

  const joinType = String(join?.joinType || "inner").toLowerCase() === "left" ? "LEFT" : "INNER";
  const joinCols = Array.isArray(join?.columns)
    ? join.columns.filter((c) => isValidColumnIdentifier(String(c)))
    : [];
  const metricCols = (Array.isArray(quant?.metricColumns) ? quant.metricColumns : [])
    .map((m) => (typeof m === "string" ? m : m?.column))
    .filter((c) => isValidColumnIdentifier(String(c || "")));

  const bGroup = quoteCol(groupCol);
  const bLeft = quoteCol(leftKey);
  const jRight = quoteCol(rightKey);

  const progressOnJoin = joinCols.includes(progressCol);
  const progressRef = progressOnJoin ? `j.${quoteCol(progressCol)}` : `b.${quoteCol(progressCol)}`;
  const progressExpr = progressNumericExpr(progressRef, progressCol);

  const endExpr =
    endRule === "column" && endCol && isValidColumnIdentifier(endCol)
      ? progressNumericExpr(`b.${quoteCol(endCol)}`, endCol)
      : `MAX(progress_num)`;

  const joinExtraCols = joinCols
    .filter((c) => c !== progressCol)
    .map((c) => `j.${quoteCol(c)}`)
    .join(", ");

  const checkpointValues = checkpoints.map((c) => `(${c})`).join(", ");

  const metricSelects = metricCols
    .filter((c) => c !== groupCol && c !== progressCol)
    .map((c) => `r.${quoteCol(c)} AS ${quoteCol(`selected_${c}`)}`)
    .join(", ");

  const lim = Math.max(1, Math.floor(limit));

  return `
joined AS (
  SELECT
    b.*,
    ${joinExtraCols ? `${joinExtraCols},` : ""}
    ${progressExpr} AS progress_num
  FROM ${base} b
  ${joinType} JOIN ${quoteTable(physical)} j
    ON CAST(b.${bLeft} AS VARCHAR) = CAST(j.${jRight} AS VARCHAR)
  WHERE ${progressExpr} IS NOT NULL
),
with_bounds AS (
  SELECT
    j.*,
    MIN(progress_num) OVER (PARTITION BY ${bGroup}) AS progress_start,
    ${
      endRule === "column" && endCol
        ? `MAX(${progressNumericExpr(`j.${quoteCol(endCol)}`, endCol)}) OVER (PARTITION BY ${bGroup})`
        : "MAX(progress_num) OVER (PARTITION BY " + bGroup + ")"
    } AS progress_end
  FROM joined j
),
with_position AS (
  SELECT
    *,
    CASE
      WHEN progress_end IS NULL OR progress_start IS NULL OR progress_end = progress_start THEN NULL
      ELSE LEAST(1.0, GREATEST(0.0, (progress_num - progress_start) / NULLIF(progress_end - progress_start, 0)))
    END AS relative_position
  FROM with_bounds
),
checkpoints AS (
  SELECT checkpoint FROM (VALUES ${checkpointValues}) AS t(checkpoint)
),
ranked AS (
  SELECT
    w.*,
    c.checkpoint,
    CONCAT(CAST(ROUND(c.checkpoint * 1000) / 10 AS VARCHAR), '%') AS lifecycle_checkpoint,
    ROW_NUMBER() OVER (
      PARTITION BY w.${bGroup}, c.checkpoint
      ORDER BY w.relative_position DESC
    ) AS rn
  FROM with_position w
  INNER JOIN checkpoints c ON w.relative_position IS NOT NULL AND w.relative_position <= c.checkpoint
),
picked AS (
  SELECT
    r.${bGroup},
    r.lifecycle_checkpoint,
    r.relative_position,
    ROUND(r.relative_position * 10000) / 100 AS relative_position_pct,
    r.progress_num AS selected_progress_value
    ${metricSelects ? `, ${metricSelects}` : ""}
  FROM ranked r
  WHERE r.rn = 1
)
SELECT * FROM picked
ORDER BY ${bGroup}, checkpoint
LIMIT ${lim}
`.trim();
}
