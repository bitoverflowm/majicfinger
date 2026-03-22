import { arrowTableToRows } from "@/lib/duckdb/arrowTableToRows";

/** @type {{ db: import('@duckdb/duckdb-wasm').AsyncDuckDB; conn: import('@duckdb/duckdb-wasm').AsyncDuckDBConnection } | null} */
let instance = null;
let initPromise = null;

/**
 * Lazily boot DuckDB-WASM (worker + module from jsDelivr). Browser only.
 */
async function getOrCreateInstance() {
  if (typeof window === "undefined") {
    throw new Error("DuckDB-WASM is only available in the browser.");
  }
  if (instance) return instance;
  if (!initPromise) {
    initPromise = (async () => {
      // Resolved to duckdb-browser.mjs via next.config.js webpack alias (avoids duckdb-node.cjs).
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

/**
 * Pre-create DuckDB-WASM (worker + in-memory DB) so the first Parquet query feels instant.
 * Safe to call multiple times; subsequent calls resolve to the same instance.
 * @returns {Promise<{ db: import('@duckdb/duckdb-wasm').AsyncDuckDB; conn: import('@duckdb/duckdb-wasm').AsyncDuckDBConnection }>}
 */
export async function warmDuckDbWasm() {
  return getOrCreateInstance();
}

/** True after the first successful {@link warmDuckDbWasm} in this tab (skips redundant loaders). */
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

/** Stable virtual filename on the WASM VFS. */
function virtualParquetName(url) {
  let h = 2166136261;
  for (let i = 0; i < url.length; i++) {
    h ^= url.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `remote_${(h >>> 0).toString(16)}.parquet`;
}

/** Guardrail: full file is buffered in memory before DuckDB reads it. */
const MAX_PARQUET_FETCH_BYTES = 80 * 1024 * 1024;

/**
 * Run a bounded SELECT over a single remote Parquet file via DuckDB read_parquet.
 *
 * We **fetch bytes in the browser** then **registerFileBuffer** (reliable vs WASM httpfs on S3).
 *
 * @param {string | { proxyPath: string }} urlOrProxy
 *        - HTTPS URL for **public** objects (CORS + bucket policy).
 *        - `{ proxyPath: 'markets/foo.parquet' }` fetches same-origin `/api/data-lake/parquet` (**private** bucket; server uses AWS keys).
 * @param {{ limit?: number }} [opts]
 * @returns {Promise<{ rows: Record<string, unknown>[]; rowCount: number }>}
 */
export async function queryRemoteParquet(urlOrProxy, opts = {}) {
  const limit = Math.min(5000, Math.max(1, Number(opts.limit) || 200));

  let fetchUrl;
  let virtualKeySource;

  if (urlOrProxy && typeof urlOrProxy === "object" && urlOrProxy.proxyPath) {
    const p = String(urlOrProxy.proxyPath).replace(/^\/+/, "");
    if (p.includes("..") || !p.endsWith(".parquet")) {
      throw new Error("Invalid proxy path.");
    }
    const q = new URLSearchParams({ path: p });
    fetchUrl = `/api/data-lake/parquet?${q.toString()}`;
    virtualKeySource = `proxy:${p}`;
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
