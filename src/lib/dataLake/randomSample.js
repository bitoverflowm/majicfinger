/**
 * Random row sampling for Athena compose SQL.
 * - Unseeded: ORDER BY random() LIMIT n (new sample each run)
 * - Seeded: ORDER BY xxhash64(seed + row keys) LIMIT n (stable across reloads)
 */

/** Keep aligned with `COMPOSE_SQL_LIMIT_ABSOLUTE_MAX` in buildComposeAthenaSql.js */
export const RANDOM_SAMPLE_ABSOLUTE_MAX = 500000;

export const RANDOM_SAMPLE_MODE_SEEDED = "seeded";
export const RANDOM_SAMPLE_MODE_UNSEEDED = "unseeded";

const SAFE_ALIAS = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const SAFE_SEED = /^[a-zA-Z0-9_-]{1,80}$/;

/**
 * @returns {string}
 */
export function generateRandomSampleSeed() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `s_${crypto.randomUUID().replace(/-/g, "")}`;
  }
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * @param {unknown} raw
 * @returns {string | null}
 */
export function sanitizeRandomSampleSeed(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!SAFE_SEED.test(s)) return null;
  return s;
}

/**
 * @param {unknown} raw
 * @returns {"seeded" | "unseeded" | null}
 */
export function parseRandomSampleMode(raw) {
  const m = String(raw || "")
    .trim()
    .toLowerCase();
  if (m === RANDOM_SAMPLE_MODE_SEEDED || m === "true" || m === "1") return RANDOM_SAMPLE_MODE_SEEDED;
  if (m === RANDOM_SAMPLE_MODE_UNSEEDED || m === "false" || m === "0") return RANDOM_SAMPLE_MODE_UNSEEDED;
  return null;
}

/**
 * @param {unknown} raw
 * @param {{ maxSize?: number; defaultMode?: "seeded" | "unseeded"; generateSeedIfMissing?: boolean }} [opts]
 * @returns {{ size: number; mode: "seeded" | "unseeded"; seed?: string } | null}
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

  const seedFromRaw = sanitizeRandomSampleSeed(raw.seed);
  let mode = parseRandomSampleMode(raw.mode);
  if (mode == null && typeof raw.seeded === "boolean") {
    mode = raw.seeded ? RANDOM_SAMPLE_MODE_SEEDED : RANDOM_SAMPLE_MODE_UNSEEDED;
  }
  // Legacy recipes: size only → unseeded unless a seed is already present.
  if (mode == null) {
    mode = seedFromRaw
      ? RANDOM_SAMPLE_MODE_SEEDED
      : opts.defaultMode === RANDOM_SAMPLE_MODE_SEEDED
        ? RANDOM_SAMPLE_MODE_SEEDED
        : RANDOM_SAMPLE_MODE_UNSEEDED;
  }

  if (mode === RANDOM_SAMPLE_MODE_SEEDED) {
    let seed = seedFromRaw;
    if (!seed && opts.generateSeedIfMissing) seed = generateRandomSampleSeed();
    if (!seed) {
      // Seeded without a seed cannot run deterministically — treat as needing generation upstream.
      return { size, mode: RANDOM_SAMPLE_MODE_SEEDED };
    }
    return { size, mode: RANDOM_SAMPLE_MODE_SEEDED, seed };
  }
  return { size, mode: RANDOM_SAMPLE_MODE_UNSEEDED };
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
 * Persistable randomSample object for composeSpec.
 * @param {{ size: number; mode?: string; seed?: string } | null | undefined} randomSample
 * @returns {{ size: number; mode: "seeded" | "unseeded"; seed?: string; enabled: true } | null}
 */
export function toPersistedRandomSample(randomSample) {
  const normalized = normalizeRandomSampleConfig(
    randomSample ? { ...randomSample, enabled: true } : null,
    { generateSeedIfMissing: true, defaultMode: RANDOM_SAMPLE_MODE_UNSEEDED },
  );
  if (!normalized) return null;
  if (normalized.mode === RANDOM_SAMPLE_MODE_SEEDED) {
    const seed = normalized.seed || generateRandomSampleSeed();
    return {
      enabled: true,
      size: normalized.size,
      mode: RANDOM_SAMPLE_MODE_SEEDED,
      seed,
    };
  }
  return {
    enabled: true,
    size: normalized.size,
    mode: RANDOM_SAMPLE_MODE_UNSEEDED,
  };
}

/**
 * When Random Sample is active, drop ordinary limit-scope from compose.
 * @param {object} compose
 * @param {{ size: number; mode?: string; seed?: string } | null | undefined} randomSample
 * @returns {object}
 */
export function sanitizeComposeForRandomSample(compose, randomSample) {
  const persisted = toPersistedRandomSample(randomSample);
  if (!persisted) return compose || {};
  const next = { ...(compose || {}) };
  delete next.limitScope;
  return {
    ...next,
    randomSample: persisted,
  };
}

/**
 * SELECT aliases used as the deterministic sample key (stable row identity).
 * @param {object | null | undefined} compose
 * @returns {string[]}
 */
export function sampleKeyAliasesFromCompose(compose) {
  const sel = Array.isArray(compose?.select) ? compose.select : [];
  const out = [];
  const seen = new Set();
  for (const item of sel) {
    const a = String(item?.alias || item?.column || "").trim();
    if (!SAFE_ALIAS.test(a) || seen.has(a)) continue;
    seen.add(a);
    out.push(a);
  }
  return out;
}

/**
 * Athena ORDER BY expression for a seeded sample (deterministic given static data).
 * @param {string} seed
 * @param {string[]} aliases
 * @returns {string}
 */
export function buildSeededSampleOrderExpression(seed, aliases) {
  const safeSeed = sanitizeRandomSampleSeed(seed);
  if (!safeSeed) {
    const err = new Error("Invalid random sample seed");
    err.code = "BAD_REQUEST";
    throw err;
  }
  const parts = [`'${safeSeed}'`];
  for (const a of aliases) {
    if (!SAFE_ALIAS.test(a)) continue;
    parts.push(`chr(31)`);
    parts.push(`coalesce(cast("${a}" as varchar), '')`);
  }
  // Even with no aliases, seed-only hash is constant — still better than failing;
  // callers should pass aliases whenever available.
  const concatExpr = parts.length === 1 ? parts[0] : `concat(${parts.join(", ")})`;
  return `from_big_endian_64(xxhash64(to_utf8(${concatExpr})))`;
}

/**
 * Wrap eligible compose SQL with random or seeded sample LIMIT n,
 * then optional user ORDER BY on the sampled rows only.
 *
 * @param {string} eligibleSql
 * @param {{
 *   sampleSize: number;
 *   mode?: "seeded" | "unseeded";
 *   seed?: string | null;
 *   sampleKeyAliases?: string[];
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

  const mode =
    parseRandomSampleMode(opts?.mode) ||
    (sanitizeRandomSampleSeed(opts?.seed) ? RANDOM_SAMPLE_MODE_SEEDED : RANDOM_SAMPLE_MODE_UNSEEDED);

  let orderExpr = "random()";
  if (mode === RANDOM_SAMPLE_MODE_SEEDED) {
    const seed = sanitizeRandomSampleSeed(opts?.seed);
    if (!seed) {
      const err = new Error("Seeded random sample requires a seed");
      err.code = "BAD_REQUEST";
      throw err;
    }
    const aliases = Array.isArray(opts?.sampleKeyAliases) ? opts.sampleKeyAliases : [];
    orderExpr = buildSeededSampleOrderExpression(seed, aliases);
  }

  const sampledInner = `SELECT * FROM (${sql}) AS "__lychee_eligible" ORDER BY ${orderExpr} LIMIT ${n}`;

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

/**
 * Clone provenance with a fresh seed when the sample is seeded (e.g. replay → new sheet).
 * @param {object | null | undefined} provenance
 * @returns {object | null | undefined}
 */
export function withFreshRandomSampleSeed(provenance) {
  if (!provenance || typeof provenance !== "object") return provenance;
  const composeSpec = provenance.composeSpec;
  if (!composeSpec || typeof composeSpec !== "object") return provenance;
  const rs = composeSpec.randomSample;
  const normalized = normalizeRandomSampleConfig(rs ? { ...rs, enabled: true } : null, {
    defaultMode: RANDOM_SAMPLE_MODE_UNSEEDED,
  });
  if (!normalized || normalized.mode !== RANDOM_SAMPLE_MODE_SEEDED) return provenance;
  return {
    ...provenance,
    composeSpec: {
      ...composeSpec,
      randomSample: {
        enabled: true,
        size: normalized.size,
        mode: RANDOM_SAMPLE_MODE_SEEDED,
        seed: generateRandomSampleSeed(),
      },
    },
  };
}

/**
 * Inject seeds into legacy random-sample sheets and force pending rehydrate.
 * Used on project load so the next Athena pull freezes the sample.
 *
 * @param {Record<string, object> | null | undefined} dataSheets
 * @param {{ sheetNameAllowlist?: Set<string> | string[] | null }} [opts]
 * @returns {{ sheets: Record<string, object>; changedIds: string[] }}
 */
export function injectMissingRandomSampleSeeds(dataSheets, opts = {}) {
  const sheets = dataSheets && typeof dataSheets === "object" ? dataSheets : {};
  const allow = opts.sheetNameAllowlist
    ? new Set(
        (Array.isArray(opts.sheetNameAllowlist)
          ? opts.sheetNameAllowlist
          : [...opts.sheetNameAllowlist]
        ).map((n) => String(n).trim()),
      )
    : null;
  const out = {};
  const changedIds = [];

  for (const [sheetId, sheet] of Object.entries(sheets)) {
    if (!sheet || typeof sheet !== "object") {
      out[sheetId] = sheet;
      continue;
    }
    const name = String(sheet.name || "").trim();
    if (allow && !allow.has(name)) {
      out[sheetId] = sheet;
      continue;
    }

    const prov = sheet.provenance;
    if (!prov || typeof prov !== "object" || (prov.kind !== "compose" && prov.kind !== "compose_browser_join")) {
      out[sheetId] = sheet;
      continue;
    }
    const composeSpec = prov.composeSpec && typeof prov.composeSpec === "object" ? prov.composeSpec : null;
    const rs = composeSpec?.randomSample;
    if (!rs || typeof rs !== "object") {
      out[sheetId] = sheet;
      continue;
    }

    const size = parseRandomSampleSize(rs.size ?? rs.sampleSize);
    if (size == null) {
      out[sheetId] = sheet;
      continue;
    }

    const mode = parseRandomSampleMode(rs.mode);
    const existingSeed = sanitizeRandomSampleSeed(rs.seed);

    // Explicit unseeded stays unseeded.
    if (mode === RANDOM_SAMPLE_MODE_UNSEEDED || rs.seeded === false) {
      out[sheetId] = sheet;
      continue;
    }

    // Already seeded with a seed — leave data as-is (may still rehydrate via recipe rules).
    if ((mode === RANDOM_SAMPLE_MODE_SEEDED || existingSeed) && existingSeed) {
      if (mode !== RANDOM_SAMPLE_MODE_SEEDED || rs.enabled !== true) {
        out[sheetId] = {
          ...sheet,
          provenance: {
            ...prov,
            composeSpec: {
              ...composeSpec,
              randomSample: {
                enabled: true,
                size,
                mode: RANDOM_SAMPLE_MODE_SEEDED,
                seed: existingSeed,
              },
            },
          },
        };
        changedIds.push(sheetId);
      } else {
        out[sheetId] = sheet;
      }
      continue;
    }

    // Legacy size-only (or seeded without seed): inject seed and force Athena re-pull.
    const seed = generateRandomSampleSeed();
    const fullRowCount = Math.max(
      0,
      Math.floor(Number(sheet.fullRowCount) || 0),
      Math.floor(Number(sheet.rowCount) || 0),
      size,
    );
    out[sheetId] = {
      ...sheet,
      data: [],
      storageMode: "provenance",
      previewRowCount: 0,
      rowCount: fullRowCount || size,
      fullRowCount: fullRowCount || size,
      rehydrationStatus: "pending",
      provenance: {
        ...prov,
        composeSpec: {
          ...composeSpec,
          randomSample: {
            enabled: true,
            size,
            mode: RANDOM_SAMPLE_MODE_SEEDED,
            seed,
          },
        },
      },
      saveMeta: {
        ...(sheet.saveMeta && typeof sheet.saveMeta === "object" ? sheet.saveMeta : {}),
        recipeOnly: true,
        persistRows: false,
        truncated: true,
        randomSampleSeedInjectedAt: new Date().toISOString(),
      },
    };
    changedIds.push(sheetId);
  }

  return { sheets: out, changedIds };
}

/** Research workbook sample sheet names (100/1000/10000 × 5). */
export const RESEARCH_RANDOM_SAMPLE_SHEET_NAMES = [
  "100_0",
  "100_1",
  "100_2",
  "100_3",
  "100_4",
  "1000_0",
  "1000_1",
  "1000_2",
  "1000_3",
  "1000_4",
  "10000_0",
  "10000_1",
  "10000_2",
  "10000_3",
  "10000_4",
];
