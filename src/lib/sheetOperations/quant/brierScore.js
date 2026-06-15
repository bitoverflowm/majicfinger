import {
  detectProbabilityScale,
  finiteMinMax,
  formatCheckpointLabel,
  inferOutcomeMapping,
  mapOutcomeValue,
  toDecimalProbability,
} from "./columnInference.js";

function parseFiniteNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value == null || value === "") return null;
  const n = Number(String(value).trim());
  return Number.isFinite(n) ? n : null;
}

function groupKey(row, groupColumn) {
  if (!groupColumn) return null;
  const v = row?.[groupColumn];
  return v == null ? "__null__" : String(v);
}

function checkpointSortKey(label) {
  const s = String(label || "").trim().replace(/%$/, "");
  const n = Number(s);
  if (Number.isFinite(n)) return n > 1 ? n : n * 100;
  return Number.POSITIVE_INFINITY;
}

/**
 * @param {object[]} rows
 * @param {object} config
 * @returns {{ rows: object[], rowLevelRows: object[], warnings: object[], blocking: object[], meta: object }}
 */
export function computeBrierScore(rows, config) {
  const sourceRows = Array.isArray(rows) ? rows.filter((r) => r && typeof r === "object") : [];
  const probabilityColumn = String(config?.probabilityColumn || "").trim();
  const outcomeColumn = String(config?.outcomeColumn || "").trim();
  const bucketColumn = String(config?.bucketColumn || "").trim();
  const groupColumn = String(config?.groupColumn || "").trim();
  const weighting = config?.weighting || "equal_group";
  const weightColumn = String(config?.weightColumn || "").trim();
  const volumeColumn = String(config?.volumeColumn || "").trim();
  const outcomeMapping = config?.outcomeMapping || null;
  const probabilityScale = config?.probabilityScale || detectProbabilityScale(sourceRows, probabilityColumn).scale;
  const aggregateWithinGroupFirst = config?.aggregateWithinGroupFirst !== false;

  const warnings = [];
  const blocking = [];

  if (!probabilityColumn) {
    blocking.push({ id: "no_probability", message: "Select a probability column." });
    return { rows: [], rowLevelRows: [], warnings, blocking, meta: {} };
  }
  if (!outcomeColumn) {
    blocking.push({ id: "no_outcome", message: "Select an outcome column." });
    return { rows: [], rowLevelRows: [], warnings, blocking, meta: {} };
  }

  const scaleInfo = detectProbabilityScale(sourceRows, probabilityColumn);
  if (!scaleInfo.valid) {
    blocking.push({
      id: "invalid_probability",
      message:
        "The selected probability column contains values outside the expected range. Choose a probability column or confirm how values should be scaled.",
    });
    return { rows: [], rowLevelRows: [], warnings, blocking, meta: {} };
  }

  let mapping = outcomeMapping;
  if (!mapping || !Object.keys(mapping).length) {
    const inferred = inferOutcomeMapping(sourceRows, outcomeColumn);
    if (!inferred.ok) {
      blocking.push({
        id: "ambiguous_outcome",
        message: "Lychee could not automatically map outcome values to 1 and 0. Please map the outcome values manually before scoring.",
        unmapped: inferred.unmapped || [],
      });
      return { rows: [], rowLevelRows: [], warnings, blocking, meta: { inferredMapping: inferred.mapping } };
    }
    mapping = inferred.mapping;
  }

  const rowLevelRows = [];
  let missingOutcomes = 0;

  for (const row of sourceRows) {
    const probRaw = row?.[probabilityColumn];
    const prob = toDecimalProbability(probRaw, probabilityScale === "percent" ? "percent" : "decimal");
    const outcome = mapOutcomeValue(row?.[outcomeColumn], mapping);
    if (outcome == null) {
      missingOutcomes += 1;
      continue;
    }
    if (prob == null) continue;
    const absErr = Math.abs(prob - outcome);
    const brier = (prob - outcome) ** 2;
    rowLevelRows.push({
      ...row,
      predicted_probability: prob,
      outcome_binary: outcome,
      absolute_error: absErr,
      brier_score: brier,
    });
  }

  if (missingOutcomes > 0) {
    warnings.push({
      id: "missing_outcomes",
      blocking: false,
      message: "Rows with missing outcomes were excluded from scoring.",
    });
    if (missingOutcomes > sourceRows.length * 0.3) {
      warnings.push({
        id: "many_missing_outcomes",
        blocking: false,
        message: "Many rows are missing outcomes. Brier score requires final outcomes, so results may be incomplete.",
      });
    }
  }

  if (!rowLevelRows.length) {
    blocking.push({ id: "no_scorable_rows", message: "No rows could be scored with the selected columns." });
    return { rows: [], rowLevelRows: [], warnings, blocking, meta: {} };
  }

  if (!bucketColumn) {
    return {
      rows: [],
      rowLevelRows,
      warnings,
      blocking,
      meta: { mode: "row_level", probabilityScale: scaleInfo.scale },
    };
  }

  const bucketGroups = new Map();
  for (const row of rowLevelRows) {
    const bucket = row?.[bucketColumn];
    const bucketKey = bucket == null ? "__null__" : String(bucket);
    if (!bucketGroups.has(bucketKey)) bucketGroups.set(bucketKey, []);
    bucketGroups.get(bucketKey).push(row);
  }

  const multiplePerGroup = [...bucketGroups.values()].some((bucketRows) => {
    if (!groupColumn) return bucketRows.length > 1;
    const seen = new Set();
    for (const r of bucketRows) {
      const gk = groupKey(r, groupColumn);
      if (seen.has(gk)) return true;
      seen.add(gk);
    }
    return false;
  });

  if (multiplePerGroup) {
    warnings.push({
      id: "multiple_per_group",
      blocking: false,
      message:
        "Multiple observations per group exist inside some buckets. Lychee will aggregate within group first, then average across groups.",
    });
  }

  const aggregated = [];

  for (const [bucketKey, bucketRows] of bucketGroups) {
    let scoredUnits = bucketRows;

    if (aggregateWithinGroupFirst && groupColumn) {
      const byGroup = new Map();
      for (const row of bucketRows) {
        const gk = groupKey(row, groupColumn);
        if (!byGroup.has(gk)) byGroup.set(gk, []);
        byGroup.get(gk).push(row);
      }
      scoredUnits = [];
      for (const [, groupRows] of byGroup) {
        const probs = groupRows.map((r) => r.predicted_probability).filter((v) => v != null);
        const outcomes = groupRows.map((r) => r.outcome_binary).filter((v) => v != null);
        const absErrs = groupRows.map((r) => r.absolute_error).filter((v) => v != null);
        const briers = groupRows.map((r) => r.brier_score).filter((v) => v != null);
        if (!probs.length) continue;
        scoredUnits.push({
          predicted_probability: probs.reduce((a, b) => a + b, 0) / probs.length,
          outcome_binary: outcomes.reduce((a, b) => a + b, 0) / outcomes.length,
          absolute_error: absErrs.reduce((a, b) => a + b, 0) / absErrs.length,
          brier_score: briers.reduce((a, b) => a + b, 0) / briers.length,
          _groupWeight: weighting === "volume" ? groupRows.reduce((s, r) => s + (parseFiniteNumber(r?.[volumeColumn]) || 0), 0) : 1,
          _rowWeight: weighting === "equal_row" ? groupRows.length : 1,
        });
      }
    }

    const weightFor = (unit) => {
      if (weighting === "volume") return unit._groupWeight || parseFiniteNumber(unit?.[volumeColumn]) || 0;
      if (weighting === "custom") return parseFiniteNumber(unit?.[weightColumn]) || 0;
      if (weighting === "equal_row") return unit._rowWeight || 1;
      return 1;
    };

    let wSum = 0;
    let probSum = 0;
    let outcomeSum = 0;
    let absSum = 0;
    let brierSum = 0;
    const groupCount = aggregateWithinGroupFirst && groupColumn
      ? new Set(bucketRows.map((r) => groupKey(r, groupColumn))).size
      : bucketRows.length;

    for (const unit of scoredUnits) {
      const w = weightFor(unit);
      if (w <= 0 && weighting !== "equal_group" && weighting !== "equal_row") continue;
      const weight = weighting === "equal_group" || weighting === "equal_row" ? 1 : w;
      wSum += weight;
      probSum += (unit.predicted_probability || 0) * weight;
      outcomeSum += (unit.outcome_binary || 0) * weight;
      absSum += (unit.absolute_error || 0) * weight;
      brierSum += (unit.brier_score || 0) * weight;
    }

    const divisor = weighting === "equal_group" || weighting === "equal_row"
      ? scoredUnits.length || 1
      : wSum || 1;

    const brierVals = scoredUnits.map((u) => u.brier_score).filter(Number.isFinite);
    const { min: minBrier, max: maxBrier } = finiteMinMax(brierVals);

    aggregated.push({
      [bucketColumn]: bucketKey === "__null__" ? null : bucketKey,
      group_count: groupCount,
      row_count: bucketRows.length,
      avg_probability: probSum / divisor,
      yes_rate: outcomeSum / divisor,
      avg_absolute_error: absSum / divisor,
      avg_brier_score: brierSum / divisor,
      baseline_brier_50_50: 0.25,
      median_absolute_error: median(scoredUnits.map((u) => u.absolute_error)),
      brier_score_std: std(scoredUnits.map((u) => u.brier_score)),
      min_brier_score: minBrier,
      max_brier_score: maxBrier,
      _sortKey: checkpointSortKey(bucketKey),
    });
  }

  aggregated.sort((a, b) => a._sortKey - b._sortKey);
  const out = aggregated.map(({ _sortKey, ...rest }) => rest);

  const lowSample = out.some((r) => (r.group_count || 0) < 30);
  if (lowSample) {
    warnings.push({
      id: "low_sample",
      blocking: false,
      message: "Low sample size detected in some buckets. Results may be noisy.",
    });
  }

  if (scaleInfo.scale === "percent") {
    warnings.push({
      id: "percent_scale",
      blocking: false,
      message: "Probability column appears to use 0–100 scale. Lychee will convert it to 0–1 for scoring.",
    });
  }

  return {
    rows: out,
    rowLevelRows,
    warnings,
    blocking,
    meta: { mode: "aggregated", probabilityScale: scaleInfo.scale, bucketColumn },
  };
}

function median(nums) {
  const s = nums.filter(Number.isFinite).sort((a, b) => a - b);
  if (!s.length) return null;
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function std(nums) {
  const s = nums.filter(Number.isFinite);
  if (s.length < 2) return null;
  const mean = s.reduce((a, b) => a + b, 0) / s.length;
  return Math.sqrt(s.reduce((a, b) => a + (b - mean) ** 2, 0) / s.length);
}

export function addRowLevelBrierColumns(rows, config) {
  const result = computeBrierScore(rows, { ...config, bucketColumn: "" });
  return result.rowLevelRows;
}
