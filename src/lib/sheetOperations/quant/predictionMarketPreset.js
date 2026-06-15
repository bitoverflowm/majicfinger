import {
  inferOutcomeMapping,
  looksLikePredictionMarketData,
  PM_PRESET_CHECKPOINTS,
  suggestEndColumn,
  suggestGroupColumn,
  suggestOutcomeColumn,
  suggestProbabilityColumn,
  suggestProgressColumn,
  uniqueFreeColumnName,
  detectProbabilityScale,
  isProgressColumnSupported,
} from "./columnInference.js";
import { computeBrierScore } from "./brierScore.js";
import { computeRelativePosition } from "./relativePosition.js";

/**
 * Infer setup for Prediction Market Lifecycle Accuracy preset.
 * @param {object[]} rows
 * @param {string[]} columns
 */
export function inferPredictionMarketSetup(rows, columns) {
  const cols = Array.isArray(columns) ? columns : [];
  const groupColumn = suggestGroupColumn(cols);
  const progressColumn = suggestProgressColumn(cols);
  const endColumn = suggestEndColumn(cols);
  const probabilityColumn = suggestProbabilityColumn(cols);
  const outcomeColumn = suggestOutcomeColumn(cols);
  const endRule = endColumn ? "column" : "auto";
  const outcomeInference = outcomeColumn ? inferOutcomeMapping(rows, outcomeColumn) : { ok: false, mapping: {} };
  const probabilityInfo = probabilityColumn ? detectProbabilityScale(rows, probabilityColumn) : { valid: false };
  const progressSupported = progressColumn ? isProgressColumnSupported(rows, progressColumn) : false;

  return {
    groupColumn,
    progressColumn,
    endColumn,
    endRule,
    probabilityColumn,
    outcomeColumn,
    checkpoints: PM_PRESET_CHECKPOINTS,
    snapshotRule: "latest_before",
    weighting: "equal_group",
    mode: "snapshot",
    metricColumns: [probabilityColumn, outcomeColumn, progressColumn].filter(Boolean),
    outcomeMapping: outcomeInference.mapping,
    outcomeMappingOk: outcomeInference.ok,
    probabilityScale: probabilityInfo.scale,
    probabilityValid: probabilityInfo.valid,
    progressSupported,
    isPredictionMarket: looksLikePredictionMarketData(cols),
    checkpointColumn: uniqueFreeColumnName(cols, "lifecycle_checkpoint"),
    outputPositionColumn: uniqueFreeColumnName(cols, "relative_position"),
    accuracySheetName: "Lifecycle Accuracy",
    snapshotSheetName: "Lifecycle Snapshots",
  };
}

/**
 * Run full prediction market lifecycle accuracy workflow.
 * @param {object[]} rows
 * @param {object} setup
 */
export function runPredictionMarketLifecycleAccuracy(rows, setup) {
  const columns = Object.keys(rows?.[0] || {}).filter((k) => k !== "_origIndex");
  const blocking = [];
  const warnings = [];

  if (!setup.progressColumn || !isProgressColumnSupported(rows, setup.progressColumn)) {
    blocking.push({
      id: "invalid_progress",
      message:
        "This column cannot be normalized because it is not numeric or time-based. Choose a number, timestamp, date, or ordered column.",
    });
  }
  if (!setup.probabilityColumn || !setup.probabilityValid) {
    blocking.push({
      id: "invalid_probability",
      message: "Selected probability column contains values outside the expected probability range.",
    });
  }
  if (!setup.outcomeColumn) {
    blocking.push({ id: "no_outcome", message: "Select an outcome column." });
  }
  if (!setup.outcomeMappingOk && setup.outcomeColumn) {
    blocking.push({
      id: "ambiguous_outcome",
      message: "Lychee could not automatically map outcome values to 1 and 0. Please map the outcome values manually before scoring.",
    });
  }

  if (blocking.length) {
    return { blocking, warnings, snapshotRows: [], accuracyRows: [], meta: {} };
  }

  const snapshotConfig = {
    groupColumn: setup.groupColumn,
    progressColumn: setup.progressColumn,
    mode: "snapshot",
    endRule: setup.endRule,
    endColumn: setup.endColumn,
    metricColumns: [
      setup.probabilityColumn,
      setup.outcomeColumn,
      setup.progressColumn,
    ].filter(Boolean),
    checkpoints: setup.checkpoints || PM_PRESET_CHECKPOINTS,
    snapshotRule: setup.snapshotRule || "latest_before",
    checkpointColumn: setup.checkpointColumn || "lifecycle_checkpoint",
    outputPositionColumn: setup.outputPositionColumn || "relative_position",
    outputPositionPctColumn: setup.outputPositionPctColumn || "relative_position_pct",
  };

  const snapshotResult = computeRelativePosition(rows, snapshotConfig);
  warnings.push(...snapshotResult.warnings);
  if (snapshotResult.blocking.length) {
    return {
      blocking: snapshotResult.blocking,
      warnings,
      snapshotRows: [],
      accuracyRows: [],
      meta: {},
    };
  }

  const snapshotRows = snapshotResult.rows.map((row) => {
    const probCol = `selected_${setup.probabilityColumn}`;
    const outCol = `selected_${setup.outcomeColumn}`;
    const timeCol = `selected_${setup.progressColumn}`;
    return {
      ...(setup.groupColumn ? { [setup.groupColumn]: row[setup.groupColumn] } : {}),
      checkpoint: row[snapshotConfig.checkpointColumn],
      selected_time: row[timeCol] ?? row[setup.progressColumn] ?? null,
      probability: row[probCol] ?? row[setup.probabilityColumn] ?? null,
      outcome: row[outCol] ?? row[setup.outcomeColumn] ?? null,
      relative_position: row[snapshotConfig.outputPositionColumn],
      relative_position_pct: row[snapshotConfig.outputPositionPctColumn],
    };
  });

  const brierResult = computeBrierScore(snapshotRows, {
    probabilityColumn: "probability",
    outcomeColumn: "outcome",
    bucketColumn: "checkpoint",
    groupColumn: setup.groupColumn,
    weighting: setup.weighting || "equal_group",
    outcomeMapping: setup.outcomeMapping,
    probabilityScale: setup.probabilityScale,
  });

  warnings.push(...brierResult.warnings);
  if (brierResult.blocking.length) {
    return {
      blocking: brierResult.blocking,
      warnings,
      snapshotRows,
      accuracyRows: [],
      meta: { snapshotConfig },
    };
  }

  const accuracyRows = brierResult.rows.map((row) => ({
    checkpoint: row.checkpoint,
    market_count: row.group_count,
    row_count: row.row_count,
    avg_probability: row.avg_probability,
    yes_rate: row.yes_rate,
    avg_absolute_error: row.avg_absolute_error,
    avg_brier_score: row.avg_brier_score,
    baseline_brier_50_50: row.baseline_brier_50_50,
  }));

  return {
    blocking: [],
    warnings,
    snapshotRows,
    accuracyRows,
    meta: {
      snapshotConfig,
      checkpointColumn: snapshotConfig.checkpointColumn,
    },
  };
}
