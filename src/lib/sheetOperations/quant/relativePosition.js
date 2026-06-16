import {
  DEFAULT_BUCKET_RANGES,
  DEFAULT_SNAPSHOT_CHECKPOINTS,
  finiteMinMax,
  formatBucketLabel,
  parseProgressValue,
  uniqueFreeColumnName,
} from "./columnInference.js";

function parseFiniteNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value == null || value === "") return null;
  const n = Number(String(value).trim());
  return Number.isFinite(n) ? n : null;
}

function groupKey(row, groupColumn) {
  if (!groupColumn) return "__all__";
  const v = row?.[groupColumn];
  return v == null ? "__null__" : String(v);
}

function percentile(sorted, p) {
  if (!sorted.length) return null;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function aggregateValues(values, method, vwapPrice = [], vwapVolume = []) {
  const nums = values.filter((v) => v != null && Number.isFinite(v));
  if (!nums.length) return null;
  const m = String(method || "mean");
  if (m === "mean" || m === "average") return nums.reduce((a, b) => a + b, 0) / nums.length;
  if (m === "median") {
    const s = [...nums].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  }
  if (m === "min") {
    const { min } = finiteMinMax(nums);
    return min;
  }
  if (m === "max") {
    const { max } = finiteMinMax(nums);
    return max;
  }
  if (m === "sum") return nums.reduce((a, b) => a + b, 0);
  if (m === "count") return nums.length;
  if (m === "first") return nums[0];
  if (m === "last") return nums[nums.length - 1];
  if (m === "std" || m === "standard deviation") {
    const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
    const variance = nums.reduce((a, b) => a + (b - mean) ** 2, 0) / nums.length;
    return Math.sqrt(variance);
  }
  if (m === "variance" || m === "var") {
    const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
    return nums.reduce((a, b) => a + (b - mean) ** 2, 0) / nums.length;
  }
  if (m === "vwap") {
    let wSum = 0;
    let vSum = 0;
    for (let i = 0; i < nums.length; i += 1) {
      const p = parseFiniteNumber(vwapPrice[i]);
      const w = parseFiniteNumber(vwapVolume[i]);
      if (p == null || w == null) continue;
      wSum += p * w;
      vSum += w;
    }
    return vSum > 0 ? wSum / vSum : null;
  }
  if (m === "mode") {
    const freq = new Map();
    for (const v of nums) freq.set(v, (freq.get(v) || 0) + 1);
    let best = nums[0];
    let bestCount = 0;
    for (const [v, c] of freq) {
      if (c > bestCount) {
        best = v;
        bestCount = c;
      }
    }
    return best;
  }
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function resolveGroupRange(groupRows, config) {
  const progressCol = config.progressColumn;
  const endRule = config.endRule || "auto";
  const endColumn = config.endColumn || "";
  const manualEnd = config.manualEndValue;
  const outlierHandling = config.outlierHandling || "minmax";

  const progressVals = [];
  for (const row of groupRows) {
    const p = parseProgressValue(row?.[progressCol], progressCol);
    if (p != null) progressVals.push(p);
  }
  progressVals.sort((a, b) => a - b);

  if (!progressVals.length) return { start: null, end: null, progressVals: [] };

  let start = progressVals[0];
  let end = progressVals[progressVals.length - 1];

  if (outlierHandling === "percentile") {
    start = percentile(progressVals, 0.01);
    end = percentile(progressVals, 0.99);
  }

  if (endRule === "column" && endColumn) {
    const endVals = groupRows
      .map((r) => parseProgressValue(r?.[endColumn], endColumn))
      .filter((v) => v != null);
    if (endVals.length) {
      let endMax = -Infinity;
      for (const v of endVals) {
        if (v > endMax) endMax = v;
      }
      if (Number.isFinite(endMax)) end = endMax;
    }
  } else if (endRule === "manual" && manualEnd != null && manualEnd !== "") {
    const manual = parseProgressValue(manualEnd, progressCol);
    if (manual != null) end = manual;
  }

  return { start, end, progressVals };
}

function relativePositionForRow(progress, start, end) {
  if (progress == null || start == null || end == null) return null;
  if (end === start) return null;
  const rp = (progress - start) / (end - start);
  return Math.min(1, Math.max(0, rp));
}

function pickSnapshotRow(groupRows, checkpoint, rule, progressCol, start, end) {
  const target = start + checkpoint * (end - start);
  const withPos = groupRows
    .map((row) => {
      const progress = parseProgressValue(row?.[progressCol], progressCol);
      if (progress == null) return null;
      const rp = relativePositionForRow(progress, start, end);
      return { row, progress, rp };
    })
    .filter(Boolean);

  if (!withPos.length) return null;

  const r = String(rule || "latest_before");
  if (r === "closest") {
    return withPos.reduce((best, cur) =>
      Math.abs(cur.rp - checkpoint) < Math.abs(best.rp - checkpoint) ? cur : best,
    ).row;
  }
  if (r === "first_after") {
    const after = withPos.filter((x) => x.rp >= checkpoint).sort((a, b) => a.rp - b.rp);
    return after[0]?.row || null;
  }
  if (r === "avg_window" || r === "vwap_window") {
    const window = configSnapshotWindow(checkpoint);
    const inWindow = withPos.filter((x) => x.rp >= checkpoint - window && x.rp <= checkpoint + window);
    if (!inWindow.length) return null;
    return inWindow[inWindow.length - 1].row;
  }
  const before = withPos.filter((x) => x.rp <= checkpoint).sort((a, b) => b.rp - a.rp);
  return before[0]?.row || null;
}

function configSnapshotWindow(checkpoint) {
  return checkpoint <= 0.1 || checkpoint >= 0.9 ? 0.02 : 0.05;
}

function analyzeWarnings(groups, config) {
  const warnings = [];
  const blocking = [];
  const progressCol = config.progressColumn;

  let nullProgressCount = 0;
  let singleRowGroups = 0;
  let startEqualsEndGroups = 0;
  let nonMonotonicGroups = 0;
  const durations = [];

  for (const [, groupRows] of groups) {
    const { start, end, progressVals } = resolveGroupRange(groupRows, config);
    if (!progressVals.length) continue;

    const nulls = groupRows.filter((r) => parseProgressValue(r?.[progressCol], progressCol) == null).length;
    nullProgressCount += nulls;

    if (groupRows.length === 1) singleRowGroups += 1;
    if (start != null && end != null && start === end) startEqualsEndGroups += 1;

    if (progressVals.length > 2) {
      let decreasing = false;
      for (let i = 1; i < progressVals.length; i += 1) {
        if (progressVals[i] < progressVals[i - 1]) {
          decreasing = true;
          break;
        }
      }
      if (decreasing) nonMonotonicGroups += 1;
    }

    if (start != null && end != null && end > start) durations.push(end - start);
  }

  if (nullProgressCount > 0) {
    warnings.push({
      id: "null_progress",
      blocking: false,
      message: "Rows with missing values in the progress column were excluded.",
    });
  }
  if (singleRowGroups > 0) {
    warnings.push({
      id: "single_row_groups",
      blocking: false,
      message: `${singleRowGroups} group(s) have only one observation; relative position cannot be calculated for them and they will be dropped.`,
    });
  }
  if (startEqualsEndGroups > 0) {
    if (groups.size === startEqualsEndGroups) {
      blocking.push({
        id: "all_start_equals_end",
        message: "Start and end values are identical for all groups. Relative position requires a non-zero range.",
      });
    } else {
      warnings.push({
        id: "start_equals_end",
        blocking: false,
        message: `${startEqualsEndGroups} group(s) have identical start and end values and will be dropped.`,
      });
    }
  }
  if (nonMonotonicGroups > 0) {
    warnings.push({
      id: "non_monotonic",
      blocking: false,
      message:
        "Selected progress column is not monotonic within some groups. Relative position will still be calculated from min to max, but ordering may not represent a true lifecycle.",
    });
  }

  if (durations.length >= 2) {
    let minD = durations[0];
    let maxD = durations[0];
    for (const d of durations) {
      if (d < minD) minD = d;
      if (d > maxD) maxD = d;
    }
    if (minD > 0 && maxD / minD > 10) {
      warnings.push({
        id: "duration_mismatch",
        blocking: false,
        message:
          "Large duration mismatch detected. Some groups last much longer than others. Relative position lets you compare lifecycle stages, but 90% through a one-day group is not the same as 90% through a three-month group.",
      });
    }
  }

  if (config.outlierHandling === "minmax") {
    for (const [, groupRows] of groups) {
      const { progressVals } = resolveGroupRange(groupRows, config);
      if (progressVals.length < 10) continue;
      const p1 = percentile(progressVals, 0.01);
      const p99 = percentile(progressVals, 0.99);
      const range = progressVals[progressVals.length - 1] - progressVals[0];
      const trimmed = p99 - p1;
      if (range > 0 && trimmed / range < 0.5) {
        warnings.push({
          id: "outliers",
          blocking: false,
          message:
            "Outliers detected in the selected progress column. Relative position uses min and max, so extreme values may compress most rows into a small part of the lifecycle.",
        });
        break;
      }
    }
  }

  if (!config.groupColumn) {
    warnings.push({
      id: "no_group",
      blocking: false,
      message:
        "No group column selected. Lychee will treat the entire sheet as one lifecycle. Select a group column if you want normalization to happen separately for each market, asset, game, or event.",
    });
  }

  return { warnings, blocking };
}

function buildGroups(rows, groupColumn, progressColumn) {
  const groups = new Map();
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const key = groupKey(row, groupColumn);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  return groups;
}

/**
 * @param {object[]} rows
 * @param {object} config
 * @returns {{ rows: object[], warnings: object[], blocking: object[], meta: object }}
 */
export function computeRelativePosition(rows, config) {
  const sourceRows = Array.isArray(rows) ? rows.filter((r) => r && typeof r === "object") : [];
  const progressColumn = String(config?.progressColumn || "").trim();
  const groupColumn = String(config?.groupColumn || "").trim();
  const mode = config?.mode || "create_column";
  const singleRowPolicy = config?.singleRowPolicy || "drop";
  const outputPositionCol = config?.outputPositionColumn || "relative_position";
  const outputPctCol = config?.outputPositionPctColumn || "relative_position_pct";
  const checkpointCol = config?.checkpointColumn || "lifecycle_checkpoint";
  const bucketCol = config?.bucketColumn || "lifecycle_bucket";
  const metricColumns = Array.isArray(config?.metricColumns) ? config.metricColumns.filter(Boolean) : [];
  const joinValueColumn = String(config?.joinValueColumn || "").trim();
  const checkpoints = Array.isArray(config?.checkpoints) && config.checkpoints.length
    ? config.checkpoints
    : DEFAULT_SNAPSHOT_CHECKPOINTS;
  const bucketRanges = Array.isArray(config?.bucketRanges) && config.bucketRanges.length
    ? config.bucketRanges
    : DEFAULT_BUCKET_RANGES;
  const snapshotRule = config?.snapshotRule || "latest_before";
  const bucketAggregation = config?.bucketAggregation || "mean";
  const vwapPriceColumn = config?.vwapPriceColumn || "";
  const vwapVolumeColumn = config?.vwapVolumeColumn || "";

  if (!progressColumn) {
    return {
      rows: [],
      warnings: [],
      blocking: [{ id: "no_progress", message: "Select a progress column." }],
      meta: {},
    };
  }

  const groups = buildGroups(sourceRows, groupColumn, progressColumn);
  const { warnings, blocking } = analyzeWarnings(groups, config);
  if (blocking.length) return { rows: [], warnings, blocking, meta: {} };

  if (mode === "create_column") {
    const out = [];
    for (const [, groupRows] of groups) {
      const { start, end } = resolveGroupRange(groupRows, config);
      if (start == null || end == null) continue;
      if (start === end) continue;
      if (groupRows.length === 1 && singleRowPolicy === "drop") continue;

      for (const row of groupRows) {
        const progress = parseProgressValue(row?.[progressColumn], progressColumn);
        if (progress == null) continue;
        let rp = relativePositionForRow(progress, start, end);
        if (groupRows.length === 1) {
          if (singleRowPolicy === "zero") rp = 0;
          else if (singleRowPolicy === "one") rp = 1;
          else continue;
        }
        out.push({
          ...row,
          [outputPositionCol]: rp,
          [outputPctCol]: rp == null ? null : Math.round(rp * 10000) / 100,
        });
      }
    }
    return { rows: out, warnings, blocking, meta: { mode } };
  }

  if (mode === "snapshot") {
    const out = [];
    let sparseCheckpoints = false;
    for (const [gk, groupRows] of groups) {
      const { start, end } = resolveGroupRange(groupRows, config);
      if (start == null || end == null || start === end) continue;
      if (groupRows.length === 1 && singleRowPolicy === "drop") continue;

      const groupValue = gk === "__all__" ? null : groupRows[0]?.[groupColumn];

      for (const cp of checkpoints) {
        const picked = pickSnapshotRow(groupRows, cp, snapshotRule, progressColumn, start, end);
        if (!picked) {
          sparseCheckpoints = true;
          continue;
        }
        const progress = parseProgressValue(picked?.[progressColumn], progressColumn);
        const rp = relativePositionForRow(progress, start, end);
        const record = {
          ...(groupColumn ? { [groupColumn]: groupValue } : {}),
          [checkpointCol]: cp,
          [outputPositionCol]: rp,
          [outputPctCol]: rp == null ? null : Math.round(rp * 10000) / 100,
        };
        for (const col of metricColumns) {
          record[`selected_${col}`] = picked?.[col] ?? null;
        }
        if (joinValueColumn && !metricColumns.includes(joinValueColumn)) {
          record[`selected_${joinValueColumn}`] = picked?.[joinValueColumn] ?? null;
        }
        if (!metricColumns.includes(progressColumn)) {
          record[`selected_${progressColumn}`] = picked?.[progressColumn] ?? null;
        }
        out.push(record);
      }
    }
    if (sparseCheckpoints) {
      warnings.push({
        id: "sparse_checkpoints",
        blocking: false,
        message:
          "Some groups do not have observations near selected checkpoints. Lychee will use the latest row before each checkpoint where available.",
      });
    }
    return { rows: out, warnings, blocking, meta: { mode, checkpointCol } };
  }

  if (mode === "bucket") {
    const out = [];
    for (const [gk, groupRows] of groups) {
      const { start, end } = resolveGroupRange(groupRows, config);
      if (start == null || end == null || start === end) continue;

      const groupValue = gk === "__all__" ? null : groupRows[0]?.[groupColumn];
      const rowsWithRp = groupRows
        .map((row) => {
          const progress = parseProgressValue(row?.[progressColumn], progressColumn);
          if (progress == null) return null;
          const rp = relativePositionForRow(progress, start, end);
          return rp == null ? null : { row, rp };
        })
        .filter(Boolean);

      for (const [bStart, bEnd] of bucketRanges) {
        const inBucket = rowsWithRp.filter((x) => x.rp >= bStart && (bEnd >= 1 ? x.rp <= bEnd : x.rp < bEnd));
        if (!inBucket.length) continue;
        const record = {
          ...(groupColumn ? { [groupColumn]: groupValue } : {}),
          [bucketCol]: formatBucketLabel(bStart, bEnd),
        };
        for (const col of metricColumns) {
          const vals = inBucket.map((x) => parseFiniteNumber(x.row?.[col]));
          if (bucketAggregation === "vwap") {
            record[col] = aggregateValues(
              vals,
              "vwap",
              inBucket.map((x) => x.row?.[vwapPriceColumn]),
              inBucket.map((x) => x.row?.[vwapVolumeColumn]),
            );
          } else {
            record[col] = aggregateValues(vals, bucketAggregation);
          }
        }
        record.row_count = inBucket.length;
        out.push(record);
      }
    }
    return { rows: out, warnings, blocking, meta: { mode, bucketCol } };
  }

  return { rows: [], warnings, blocking: [{ id: "unknown_mode", message: "Unknown mode." }], meta: {} };
}

export function buildRelativePositionConfigFromInference(rows, columns, overrides = {}) {
  const existing = new Set(columns || []);
  return {
    groupColumn: overrides.groupColumn ?? "",
    progressColumn: overrides.progressColumn ?? "",
    mode: overrides.mode ?? "create_column",
    endRule: overrides.endRule ?? "auto",
    endColumn: overrides.endColumn ?? "",
    metricColumns: overrides.metricColumns ?? [],
    checkpoints: overrides.checkpoints ?? DEFAULT_SNAPSHOT_CHECKPOINTS,
    bucketRanges: overrides.bucketRanges ?? DEFAULT_BUCKET_RANGES,
    snapshotRule: overrides.snapshotRule ?? "latest_before",
    bucketAggregation: overrides.bucketAggregation ?? "mean",
    outputPositionColumn: uniqueFreeColumnName(columns, overrides.outputPositionColumn || "relative_position"),
    outputPositionPctColumn: uniqueFreeColumnName(columns, overrides.outputPositionPctColumn || "relative_position_pct"),
    checkpointColumn: uniqueFreeColumnName(columns, overrides.checkpointColumn || "lifecycle_checkpoint"),
    bucketColumn: uniqueFreeColumnName(columns, overrides.bucketColumn || "lifecycle_bucket"),
    singleRowPolicy: overrides.singleRowPolicy ?? "drop",
    outlierHandling: overrides.outlierHandling ?? "minmax",
    vwapPriceColumn: overrides.vwapPriceColumn ?? "",
    vwapVolumeColumn: overrides.vwapVolumeColumn ?? "",
    ...overrides,
  };
}
