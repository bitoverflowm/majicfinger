import { temporalToMs } from "@/lib/temporalParse";

const GROUP_COLUMN_PRIORITY = [
  "market_id",
  "ticker",
  "event_id",
  "game_id",
  "asset",
  "contract",
  "contract_id",
  "city",
  "symbol",
  "slug",
];

const PROGRESS_COLUMN_PRIORITY = [
  "trade_time",
  "timestamp",
  "created_at",
  "date",
  "time",
  "datetime",
  "block_time",
];

const END_COLUMN_PRIORITY = [
  "resolution_time",
  "resolved_at",
  "close_time",
  "end_time",
  "settlement_time",
  "expiration_time",
];

const PROBABILITY_COLUMN_PRIORITY = [
  "probability",
  "yes_price",
  "last_price",
  "price",
  "forecast",
  "odds",
  "close",
];

const OUTCOME_COLUMN_PRIORITY = [
  "resolution",
  "result",
  "outcome",
  "resolved_yes",
  "resolved",
  "final_result",
  "status",
];

const CHECKPOINT_COLUMN_PRIORITY = [
  "lifecycle_checkpoint",
  "lifecycle_bucket",
  "relative_position_bucket",
  "days_before_resolution",
  "time_bucket",
  "date_bucket",
];

const OUTCOME_TRUE_VALUES = new Set([
  "yes",
  "true",
  "1",
  "resolved_yes",
  "y",
  "won",
  "win",
]);

const OUTCOME_FALSE_VALUES = new Set([
  "no",
  "false",
  "0",
  "resolved_no",
  "n",
  "lost",
  "lose",
]);

function normalizeName(name) {
  return String(name || "").trim().toLowerCase();
}

function columnMatchesPriority(name, priorityList) {
  const n = normalizeName(name);
  return priorityList.findIndex((p) => n === p || n.includes(p));
}

export function suggestColumn(columns, priorityList) {
  const cols = Array.isArray(columns) ? columns.filter(Boolean) : [];
  if (!cols.length) return "";
  const ranked = cols
    .map((c) => ({ c, rank: columnMatchesPriority(c, priorityList) }))
    .filter((x) => x.rank >= 0)
    .sort((a, b) => a.rank - b.rank);
  return ranked[0]?.c || cols[0] || "";
}

export function suggestGroupColumn(columns) {
  return suggestColumn(columns, GROUP_COLUMN_PRIORITY);
}

export function suggestProgressColumn(columns) {
  return suggestColumn(columns, PROGRESS_COLUMN_PRIORITY);
}

export function suggestEndColumn(columns) {
  return suggestColumn(columns, END_COLUMN_PRIORITY);
}

export function suggestProbabilityColumn(columns) {
  return suggestColumn(columns, PROBABILITY_COLUMN_PRIORITY);
}

export function suggestOutcomeColumn(columns) {
  return suggestColumn(columns, OUTCOME_COLUMN_PRIORITY);
}

export function suggestCheckpointColumn(columns) {
  return suggestColumn(columns, CHECKPOINT_COLUMN_PRIORITY);
}

export function isTemporalColumnName(name) {
  const n = normalizeName(name);
  if (!n) return false;
  return (
    /^(timestamp|time|date|datetime|created_at|updated_at|ts|trade_time)$/.test(n) ||
    /(_at$)|(_time$)|(_date$)/.test(n)
  );
}

function parseFiniteNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value == null || value === "") return null;
  const n = Number(String(value).trim());
  return Number.isFinite(n) ? n : null;
}

export function finiteMinMax(values) {
  let min = Infinity;
  let max = -Infinity;
  let count = 0;
  for (const value of values) {
    const n = typeof value === "number" ? value : parseFiniteNumber(value);
    if (n == null || !Number.isFinite(n)) continue;
    count += 1;
    if (n < min) min = n;
    if (n > max) max = n;
  }
  if (!count) return { min: null, max: null, count: 0 };
  return { min, max, count };
}

function finiteMinMaxFromRows(rows, columnName, sampleSize = 5000) {
  const col = String(columnName || "").trim();
  if (!col) return { min: null, max: null, count: 0 };
  const source = Array.isArray(rows) ? rows : [];
  if (!source.length) return { min: null, max: null, count: 0 };

  let min = Infinity;
  let max = -Infinity;
  let count = 0;
  const step = source.length > sampleSize ? Math.ceil(source.length / sampleSize) : 1;

  for (let i = 0; i < source.length && count < sampleSize; i += step) {
    const n = parseFiniteNumber(source[i]?.[col]);
    if (n == null) continue;
    count += 1;
    if (n < min) min = n;
    if (n > max) max = n;
  }

  if (!count) return { min: null, max: null, count: 0 };
  return { min, max, count };
}

export function parseProgressValue(value, columnName) {
  if (value == null || value === "") return null;
  if (isTemporalColumnName(columnName)) {
    const ms = temporalToMs(value);
    return Number.isFinite(ms) ? ms : null;
  }
  return parseFiniteNumber(value);
}

export function detectColumnType(rows, columnName) {
  const col = String(columnName || "").trim();
  if (!col) return "unknown";
  if (isTemporalColumnName(col)) return "datetime";

  const values = (Array.isArray(rows) ? rows : [])
    .slice(0, 500)
    .map((r) => r?.[col])
    .filter((v) => v != null && v !== "");

  if (!values.length) return "unknown";

  const boolCount = values.filter((v) => typeof v === "boolean" || /^(true|false)$/i.test(String(v))).length;
  if (boolCount / values.length > 0.8) return "boolean";

  const nums = values.map(parseFiniteNumber).filter((n) => n != null);
  if (nums.length / values.length < 0.6) return "categorical";

  const { min, max } = finiteMinMax(nums);
  if (min == null || max == null) return "unknown";
  if (min >= 0 && max <= 1) return "probability";
  if (min >= 0 && max <= 100 && max > 1) return "percentage";
  if (nums.every((n) => Number.isInteger(n))) return "integer";
  return "float";
}

export function isProgressColumnSupported(rows, columnName) {
  const type = detectColumnType(rows, columnName);
  return ["datetime", "integer", "float", "percentage", "probability"].includes(type);
}

export function detectProbabilityScale(rows, columnName) {
  const col = String(columnName || "").trim();
  if (!col) return { scale: "unknown", valid: false, max: null, min: null };
  const { min, max, count } = finiteMinMaxFromRows(rows, col);
  if (!count) return { scale: "unknown", valid: false, max: null, min: null };
  if (min < 0 || max > 100) return { scale: "invalid", valid: false, max, min };
  if (max <= 1) return { scale: "decimal", valid: true, max, min };
  if (max <= 100) return { scale: "percent", valid: true, max, min };
  return { scale: "invalid", valid: false, max, min };
}

export function toDecimalProbability(value, scale) {
  const n = parseFiniteNumber(value);
  if (n == null) return null;
  if (scale === "percent") return n / 100;
  return n;
}

export function uniqueColumnValues(rows, columnName, limit = 50) {
  const col = String(columnName || "").trim();
  if (!col) return [];
  const seen = new Set();
  const out = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    const v = row?.[col];
    const key = v == null ? "__null__" : String(v);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
    if (out.length >= limit) break;
  }
  return out;
}

export function inferOutcomeMapping(rows, columnName) {
  const values = uniqueColumnValues(rows, columnName, 20);
  if (!values.length) return { ok: false, mapping: {}, ambiguous: true };

  const mapping = {};
  const unmapped = [];

  for (const raw of values) {
    if (raw == null || raw === "") continue;
    const key = String(raw).trim();
    const lower = key.toLowerCase();
    if (OUTCOME_TRUE_VALUES.has(lower) || lower === "1") {
      mapping[key] = 1;
    } else if (OUTCOME_FALSE_VALUES.has(lower) || lower === "0") {
      mapping[key] = 0;
    } else {
      const n = parseFiniteNumber(raw);
      if (n === 0 || n === 1) mapping[key] = n;
      else unmapped.push(key);
    }
  }

  if (unmapped.length) return { ok: false, mapping, ambiguous: true, unmapped };
  const hasOne = Object.values(mapping).includes(1);
  const hasZero = Object.values(mapping).includes(0);
  if (!hasOne || !hasZero) return { ok: false, mapping, ambiguous: true };
  return { ok: true, mapping, ambiguous: false };
}

export function mapOutcomeValue(raw, mapping) {
  if (raw == null || raw === "") return null;
  const key = String(raw).trim();
  if (Object.prototype.hasOwnProperty.call(mapping || {}, key)) return mapping[key];
  const lower = key.toLowerCase();
  if (Object.prototype.hasOwnProperty.call(mapping || {}, lower)) return mapping[lower];
  return null;
}

export function uniqueFreeColumnName(existingColumns, baseName) {
  const existing = new Set((existingColumns || []).map(String));
  if (!existing.has(baseName)) return baseName;
  let n = 2;
  while (existing.has(`${baseName}_${n}`)) n += 1;
  return `${baseName}_${n}`;
}

export function groupCardinality(rows, columnName) {
  const col = String(columnName || "").trim();
  if (!col) return 0;
  const seen = new Set();
  for (const row of Array.isArray(rows) ? rows : []) {
    seen.add(row?.[col] == null ? "__null__" : String(row[col]));
  }
  return seen.size;
}

export function looksLikePredictionMarketData(columns) {
  const cols = (columns || []).map(normalizeName);
  const hasMarket = cols.some((c) => /market|ticker|contract/.test(c));
  const hasTradeTime = cols.some((c) => /trade_time|timestamp/.test(c));
  const hasPrice = cols.some((c) => /yes_price|price|probability/.test(c));
  return hasMarket && hasTradeTime && hasPrice;
}

export const DEFAULT_SNAPSHOT_CHECKPOINTS = [0, 0.25, 0.5, 0.75, 0.9, 0.95, 0.99, 1];
export const PM_PRESET_CHECKPOINTS = [0, 0.25, 0.5, 0.75, 0.9, 0.95, 0.99];

export const DEFAULT_BUCKET_RANGES = [
  [0, 0.1],
  [0.1, 0.2],
  [0.2, 0.3],
  [0.3, 0.4],
  [0.4, 0.5],
  [0.5, 0.6],
  [0.6, 0.7],
  [0.7, 0.8],
  [0.8, 0.9],
  [0.9, 0.95],
  [0.95, 0.99],
  [0.99, 1],
];

export function formatCheckpointLabel(fraction) {
  const pct = Math.round(fraction * 1000) / 10;
  if (pct === 100 || pct === 0) return `${pct}%`;
  return `${pct % 1 === 0 ? pct : pct.toFixed(1)}%`;
}

export function formatBucketLabel(start, end, progressType) {
  if (progressType === "probability") {
    return `${start.toFixed(1)}–${end.toFixed(1)}`;
  }
  if (progressType === "percentage") {
    return `${start}–${end}%`;
  }
  return `${formatCheckpointLabel(start)}–${formatCheckpointLabel(end)}`;
}

export function parseCheckpointInput(text) {
  const s = String(text || "").trim().replace(/%$/, "");
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  if (n > 1) return Math.min(1, Math.max(0, n / 100));
  return Math.min(1, Math.max(0, n));
}

export function parseBucketRangeInput(text) {
  const s = String(text || "").trim();
  const m = s.match(/^([\d.]+)\s*[–-]\s*([\d.]+)%?$/);
  if (!m) return null;
  let a = Number(m[1]);
  let b = Number(m[2]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  if (a > 1 || b > 1) {
    a /= 100;
    b /= 100;
  }
  return [Math.min(a, b), Math.max(a, b)];
}
