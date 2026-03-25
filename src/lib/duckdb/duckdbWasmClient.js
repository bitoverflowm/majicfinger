import { arrowTableToRows } from "@/lib/duckdb/arrowTableToRows";

/** @type {{ db: import('@duckdb/duckdb-wasm').AsyncDuckDB; conn: import('@duckdb/duckdb-wasm').AsyncDuckDBConnection } | null} */
let instance = null;
let initPromise = null;

async function getOrCreateInstance() {
  if (typeof window === "undefined") {
    throw new Error("DuckDB-WASM is only available in the browser.");
  }
  if (instance) return instance;
  if (!initPromise) {
    initPromise = (async () => {
      const duckdb = await import("@duckdb/duckdb-wasm");
      const bundle = await duckdb.selectBundle(duckdb.getJsDelivrBundles());
      const worker = await duckdb.createWorker(bundle.mainWorker);
      const logger = new duckdb.ConsoleLogger();
      const db = new duckdb.AsyncDuckDB(logger, worker);
      await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
      await db.open({ path: ":memory:" });
      const conn = await db.connect();
      instance = { db, conn };
      return instance;
    })();
  }
  await initPromise;
  return instance;
}

export async function warmDuckDbWasm() {
  return getOrCreateInstance();
}

export function isDuckDbWasmReady() {
  return instance != null;
}

function assertHttpsParquetUrl(url) {
  const u = String(url).trim();
  if (!/^https:\/\//i.test(u)) {
    throw new Error("Only https:// URLs are allowed for remote Parquet.");
  }
  if (!/\.parquet(\?|$)/i.test(u)) {
    throw new Error("URL should point to a .parquet file.");
  }
  return u;
}

function virtualParquetName(url) {
  let h = 2166136261;
  for (let i = 0; i < url.length; i++) {
    h ^= url.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `remote_${(h >>> 0).toString(16)}.parquet`;
}

const MAX_PARQUET_FETCH_BYTES = 80 * 1024 * 1024;

/** @type {Map<string, { virtualFileName: string; viewName: string }>} */
const beckerParquetRegistry = new Map();

function sanitizeBeckerKeyPart(s) {
  const t = String(s || "x")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  return t || "x";
}

/**
 * @param {"polymarket" | "kalshi"} dataset
 * @param {string} sampleId
 */
export function beckerLogicalKey(dataset, sampleId) {
  return `${sanitizeBeckerKeyPart(dataset)}_${sanitizeBeckerKeyPart(sampleId)}`;
}

function virtualFileNameForLogical(logicalKey) {
  return `becker_${logicalKey}.parquet`;
}

function viewNameForLogical(logicalKey) {
  return `v_becker_${logicalKey}`;
}

/**
 * @param {string | { proxyPath: string; lake?: string }} urlOrProxy
 * @returns {Promise<{ buf: Uint8Array; virtualKeySource: string }>}
 */
async function fetchParquetBytes(urlOrProxy) {
  let fetchUrl;
  let virtualKeySource;

  if (urlOrProxy && typeof urlOrProxy === "object" && urlOrProxy.proxyPath) {
    const p = String(urlOrProxy.proxyPath).replace(/^\/+/, "");
    if (p.includes("..") || !p.endsWith(".parquet")) {
      throw new Error("Invalid proxy path.");
    }
    const q = new URLSearchParams({ path: p });
    const lake = urlOrProxy.lake === "kalshi" ? "kalshi" : "";
    if (lake) q.set("lake", lake);
    fetchUrl = `/api/data-lake/parquet?${q.toString()}`;
    virtualKeySource = lake ? `proxy:${lake}:${p}` : `proxy:${p}`;
  } else {
    const safeUrl = assertHttpsParquetUrl(urlOrProxy);
    fetchUrl = safeUrl;
    virtualKeySource = safeUrl;
  }

  const res = await fetch(fetchUrl, {
    mode: typeof fetchUrl === "string" && fetchUrl.startsWith("/") ? "same-origin" : "cors",
    credentials: fetchUrl.startsWith("/") ? "same-origin" : "omit",
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const t = await res.text();
      const j = JSON.parse(t);
      if (j?.message) detail = j.message;
      else if (t && t.length < 400) detail = t;
    } catch {
      /* ignore */
    }
    const hint =
      res.status === 403 && !fetchUrl.startsWith("/")
        ? " Objects are not public — set NEXT_PUBLIC_DATA_LAKE_USE_S3_PROXY=true and server DATA_LAKE_* env vars, or allow public GetObject."
        : "";
    throw new Error(`Could not download Parquet (${res.status}): ${detail}.${hint}`);
  }

  const cl = res.headers.get("content-length");
  if (cl != null) {
    const n = Number(cl);
    if (Number.isFinite(n) && n > MAX_PARQUET_FETCH_BYTES) {
      throw new Error(
        `Parquet is too large to load in the browser (${Math.round(n / (1024 * 1024))} MB; max ${MAX_PARQUET_FETCH_BYTES / (1024 * 1024)} MB for this path).`,
      );
    }
  }

  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.byteLength > MAX_PARQUET_FETCH_BYTES) {
    throw new Error(
      `Parquet is too large to load in the browser (max ${MAX_PARQUET_FETCH_BYTES / (1024 * 1024)} MB for this path).`,
    );
  }

  return { buf, virtualKeySource };
}

/**
 * Fetch Parquet, register on WASM VFS, CREATE VIEW — multiple samples can coexist for JOINs.
 *
 * @param {{ dataset: "polymarket" | "kalshi"; sampleId: string; urlOrProxy: string | { proxyPath: string; lake?: string }; limit?: number }} opts
 */
export async function ingestRemoteParquetAsView(opts) {
  const { dataset, sampleId, urlOrProxy } = opts;
  const limit = Math.min(5000, Math.max(1, Number(opts.limit) || 200));

  const logicalKey = beckerLogicalKey(dataset, sampleId);
  const virtualFileName = virtualFileNameForLogical(logicalKey);
  const viewName = viewNameForLogical(logicalKey);

  const { buf } = await fetchParquetBytes(urlOrProxy);
  const { db, conn } = await getOrCreateInstance();

  const prev = beckerParquetRegistry.get(logicalKey);
  if (prev) {
    try {
      await conn.query(`DROP VIEW IF EXISTS ${prev.viewName}`);
    } catch {
      /* ignore */
    }
    try {
      await db.dropFile(prev.virtualFileName);
    } catch {
      /* ignore */
    }
  }

  await db.registerFileBuffer(virtualFileName, buf);

  const escapedFile = virtualFileName.replace(/'/g, "''");
  await conn.query(
    `CREATE OR REPLACE VIEW ${viewName} AS SELECT * FROM read_parquet('${escapedFile}')`,
  );

  beckerParquetRegistry.set(logicalKey, { virtualFileName, viewName });

  const table = await conn.query(`SELECT * FROM ${viewName} LIMIT ${limit}`);
  const rows = arrowTableToRows(table);
  return { rows, rowCount: rows.length, logicalKey, viewName };
}

/**
 * Register Athena result (column names + string cells) as JSON and expose a DuckDB view
 * (same registry pattern as Parquet — enables runBeckerSelectSql / joins).
 *
 * @param {{ dataset: "polymarket" | "kalshi"; sampleId: string; columns: string[]; rows: string[][]; limit?: number; ingestFullResult?: boolean }} opts
 */
export async function ingestAthenaResultAsView(opts) {
  const { dataset, sampleId, columns, rows } = opts;
  const full = opts.ingestFullResult === true;
  const limit = full ? null : Math.min(5000, Math.max(1, Number(opts.limit) || 200));

  if (!Array.isArray(columns) || !Array.isArray(rows)) {
    throw new Error("Athena ingest expects columns and rows arrays.");
  }

  const logicalKey = beckerLogicalKey(dataset, sampleId);
  const viewName = viewNameForLogical(logicalKey);
  const jsonFileName = `becker_${logicalKey}_athena.json`;

  const { db, conn } = await getOrCreateInstance();

  const prev = beckerParquetRegistry.get(logicalKey);
  if (prev) {
    try {
      await conn.query(`DROP VIEW IF EXISTS ${prev.viewName}`);
    } catch {
      /* ignore */
    }
    try {
      await db.dropFile(prev.virtualFileName);
    } catch {
      /* ignore */
    }
  }

  if (rows.length === 0 && columns.length === 0) {
    throw new Error("Athena returned no columns.");
  }

  /** Empty result set: JSON has no reliable schema; use an explicit zero-row view. */
  if (rows.length === 0 && columns.length > 0) {
    const colSql = columns
      .map((c) => {
        const safe = String(c).replace(/"/g, '""');
        return `CAST(NULL AS VARCHAR) AS "${safe}"`;
      })
      .join(", ");
    await conn.query(`CREATE OR REPLACE VIEW ${viewName} AS SELECT ${colSql} WHERE FALSE`);
    beckerParquetRegistry.set(logicalKey, { virtualFileName: jsonFileName, viewName });
    return { rows: [], rowCount: 0, logicalKey, viewName };
  }

  const objects = rows.map((row) => {
    const o = {};
    columns.forEach((col, i) => {
      const v = row[i];
      o[col] = v === "" || v == null ? null : v;
    });
    return o;
  });

  const jsonBytes = new TextEncoder().encode(JSON.stringify(objects));
  await db.registerFileBuffer(jsonFileName, jsonBytes);

  const escapedFile = jsonFileName.replace(/'/g, "''");
  await conn.query(
    `CREATE OR REPLACE VIEW ${viewName} AS SELECT * FROM read_json_auto('${escapedFile}')`,
  );

  beckerParquetRegistry.set(logicalKey, { virtualFileName: jsonFileName, viewName });

  const table = await conn.query(
    limit == null ? `SELECT * FROM ${viewName}` : `SELECT * FROM ${viewName} LIMIT ${limit}`,
  );
  const outRows = arrowTableToRows(table);
  return { rows: outRows, rowCount: outRows.length, logicalKey, viewName };
}

/** @returns {{ logicalKey: string; viewName: string }[]} */
export function listBeckerParquetViews() {
  return Array.from(beckerParquetRegistry.entries()).map(([logicalKey, v]) => ({
    logicalKey,
    viewName: v.viewName,
  }));
}

/**
 * Single SELECT only (e.g. JOIN across v_becker_* views).
 * @param {string} sql
 */
export async function runBeckerSelectSql(sql) {
  const trimmed = String(sql || "").trim();
  const parts = trimmed
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length !== 1) {
    throw new Error("Enter exactly one SQL statement (no multiple statements).");
  }
  const stmt = parts[0];
  if (!/^\s*select\b/i.test(stmt)) {
    throw new Error("Only SELECT queries are allowed.");
  }
  if (/\b(attach|copy|export|import|load|install|pragma|execute|call|checkpoint|vacuum)\b/i.test(stmt)) {
    throw new Error("This statement type is not allowed.");
  }

  const { conn } = await getOrCreateInstance();
  const table = await conn.query(stmt);
  const rows = arrowTableToRows(table);
  return { rows, rowCount: rows.length };
}

/**
 * One-shot: fetch → register → SELECT LIMIT → drop file (no persistent view).
 */
export async function queryRemoteParquet(urlOrProxy, opts = {}) {
  const limit = Math.min(5000, Math.max(1, Number(opts.limit) || 200));

  const { buf, virtualKeySource } = await fetchParquetBytes(urlOrProxy);
  const { db, conn } = await getOrCreateInstance();
  const virtualName = virtualParquetName(virtualKeySource);
  await db.registerFileBuffer(virtualName, buf);

  const escaped = virtualName.replace(/'/g, "''");
  const sql = `SELECT * FROM read_parquet('${escaped}') LIMIT ${limit}`;

  try {
    const table = await conn.query(sql);
    const rows = arrowTableToRows(table);
    return { rows, rowCount: rows.length };
  } finally {
    try {
      await db.dropFile(virtualName);
    } catch {
      /* ignore */
    }
  }
}
