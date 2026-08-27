/**
 * Unseeded uniform random row sampling for Athena compose SQL.
 * Sampling wraps the eligible query; user ORDER BY applies only after the sample.
 */

/** Keep aligned with `COMPOSE_SQL_LIMIT_ABSOLUTE_MAX` in buildComposeAthenaSql.js */
export const RANDOM_SAMPLE_ABSOLUTE_MAX = 500000;

const SAFE_ALIAS = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

/**
 * @param {unknown} raw
 * @param {{ maxSize?: number }} [opts]
 * @returns {{ size: number } | null}
 */
export function normalizeRandomSampleConfig(raw, opts = {}) {
  if (raw == null) return null;
  if (typeof raw !== "object" || Array.isArray(raw)) return null;
  const enabled = raw.enabled === true || raw.enabled === "true" || raw.enabled === 1;
  // Accept `{ size }` without enabled when nested on compose (server payload).
  const treatAsEnabled = enabled || (raw.enabled == null && (raw.size != null || raw.sampleSize != null));
  if (!treatAsEnabled) return null;
  const maxSize =
    opts.maxSize != null && Number.isFinite(Number(opts.maxSize))
      ? Math.min(RANDOM_SAMPLE_ABSOLUTE_MAX, Math.max(1, Math.floor(Number(opts.maxSize))))
      : RANDOM_SAMPLE_ABSOLUTE_MAX;
  const size = parseRandomSampleSize(raw.size ?? raw.sampleSize, { maxSize });
  if (size == null) return null;
  return { size };
}

/**
 * @param {unknown} raw
 * @param {{ maxSize?: number }} [opts]
 * @returns {number | null}
 */
export function parseRandomSampleSize(raw, opts = {}) {
  if (raw == null || raw === "") return null;
  const maxSize =
    opts.maxSize != null && Number.isFinite(Number(opts.maxSize))
      ? Math.min(RANDOM_SAMPLE_ABSOLUTE_MAX, Math.max(1, Math.floor(Number(opts.maxSize))))
      : RANDOM_SAMPLE_ABSOLUTE_MAX;
  const n = Number(raw);
  if (!Number.isFinite(n) || Number.isNaN(n)) return null;
  if (Math.floor(n) !== n) return null;
  const floored = Math.floor(n);
  if (floored < 1) return null;
  if (floored > maxSize) return null;
  return floored;
}

/**
 * Client/server validation message for sample size.
 * @param {unknown} raw
 * @param {{ maxSize?: number; required?: boolean }} [opts]
 * @returns {string | null} error message or null if ok
 */
export function validateRandomSampleSizeInput(raw, opts = {}) {
  const required = opts.required !== false;
  const trimmed = raw == null ? "" : String(raw).trim();
  if (!trimmed) {
    return required ? "Enter a sample size, or turn off Random Sample." : null;
  }
  const n = Number(trimmed);
  if (!Number.isFinite(n) || Number.isNaN(n)) {
    return "Sample size must be a whole number.";
  }
  if (Math.floor(n) !== n) {
    return "Sample size must be a whole number (no decimals).";
  }
  const floored = Math.floor(n);
  if (floored < 1) {
    return "Sample size must be at least 1.";
  }
  const maxSize =
    opts.maxSize != null && Number.isFinite(Number(opts.maxSize))
      ? Math.min(RANDOM_SAMPLE_ABSOLUTE_MAX, Math.max(1, Math.floor(Number(opts.maxSize))))
      : RANDOM_SAMPLE_ABSOLUTE_MAX;
  if (floored > maxSize) {
    return `Sample size cannot exceed ${maxSize.toLocaleString()}.`;
  }
  return null;
}

/**
 * When Random Sample is active, drop ordinary limit-scope from compose.
 * @param {object} compose
 * @param {{ size: number } | null | undefined} randomSample
 * @returns {object}
 */
export function sanitizeComposeForRandomSample(compose, randomSample) {
  if (!randomSample || !(randomSample.size >= 1)) return compose || {};
  const next = { ...(compose || {}) };
  delete next.limitScope;
  return {
    ...next,
    randomSample: { size: Math.floor(Number(randomSample.size)) },
  };
}

/**
 * Wrap eligible compose SQL with unseeded ORDER BY random() LIMIT n,
 * then optional user ORDER BY on the sampled rows only.
 *
 * @param {string} eligibleSql
 * @param {{
 *   sampleSize: number;
 *   orderBy?: Array<{ alias: string; direction: "asc" | "desc" }>;
 * }} opts
 * @returns {string}
 */
export function wrapComposeSqlWithRandomSample(eligibleSql, opts) {
  const sql = String(eligibleSql || "").trim();
  if (!sql) {
    const err = new Error("Cannot sample an empty query");
    err.code = "BAD_REQUEST";
    throw err;
  }
  const n = parseRandomSampleSize(opts?.sampleSize);
  if (n == null) {
    const err = new Error("Invalid random sample size");
    err.code = "BAD_REQUEST";
    throw err;
  }

  const sampledInner = `SELECT * FROM (${sql}) AS "__lychee_eligible" ORDER BY random() LIMIT ${n}`;

  const orderBy = Array.isArray(opts?.orderBy) ? opts.orderBy : [];
  if (!orderBy.length) {
    return sampledInner;
  }

  const parts = [];
  for (const o of orderBy) {
    const a = String(o?.alias || "").trim();
    const dir = String(o?.direction || "asc").toLowerCase() === "desc" ? "DESC" : "ASC";
    if (!SAFE_ALIAS.test(a)) {
      const err = new Error(`ORDER BY must reference a SELECT alias: ${a}`);
      err.code = "BAD_REQUEST";
      throw err;
    }
    parts.push(`"${a}" ${dir}`);
  }
  return `SELECT * FROM (${sampledInner}) AS "__lychee_sampled" ORDER BY ${parts.join(", ")}`;
}
