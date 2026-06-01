import { warmDuckDbWasm } from "@/lib/duckdb/duckdbWasmClient";
import { projectKalshiLiveCandlestickRows } from "@/lib/kalshiLive/normalizeCandlestickRow";
import { projectKalshiLiveMarketRows } from "@/lib/kalshiLive/normalizeMarketRow";
import { projectKalshiLiveSeriesRows } from "@/lib/kalshiLive/normalizeSeriesRow";

/** @type {Map<string, { virtualFileName: string; viewName: string }>} */
const kalshiLiveRegistry = new Map();

function sanitizeKeyPart(s) {
  const t = String(s || "x")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  return t || "x";
}

function logicalKey(endpointId) {
  return `kalshi_live_${sanitizeKeyPart(endpointId)}`;
}

function viewNameFor(key) {
  return `v_kalshi_live_${key}`;
}

/**
 * Register Kalshi Live rows in DuckDB-WASM (background; sheet uses inline rows immediately).
 *
 * @param {{
 *   endpointId: string;
 *   markets?: unknown[];
 *   series?: Record<string, unknown> | null;
 *   seriesList?: unknown[];
 *   candlesticks?: unknown[];
 *   selectedColumns?: string[];
 * }} opts
 */
export async function ingestKalshiLiveAsView(opts) {
  const endpointId = String(opts.endpointId || "markets").trim() || "markets";
  let sheetRows;
  if (endpointId === "candlesticks") {
    sheetRows = projectKalshiLiveCandlestickRows(
      Array.isArray(opts.candlesticks) ? opts.candlesticks : [],
      opts.selectedColumns,
    );
  } else if (endpointId === "markets") {
    sheetRows = projectKalshiLiveMarketRows(opts.markets, opts.selectedColumns);
  } else if (endpointId === "series") {
    sheetRows = projectKalshiLiveSeriesRows(
      opts.series ? [opts.series] : [],
      opts.selectedColumns,
    );
  } else if (endpointId === "seriesList") {
    sheetRows = projectKalshiLiveSeriesRows(
      Array.isArray(opts.seriesList) ? opts.seriesList : [],
      opts.selectedColumns,
    );
  } else {
    sheetRows = projectKalshiLiveMarketRows(opts.markets, opts.selectedColumns);
  }

  void registerKalshiLiveView(endpointId, sheetRows).catch((err) => {
    console.warn("[ingestKalshiLiveAsView] DuckDB registration failed:", err);
  });

  return {
    rows: sheetRows,
    rowCount: sheetRows.length,
    logicalKey: logicalKey(endpointId),
    viewName: viewNameFor(logicalKey(endpointId)),
  };
}

/**
 * @param {string} endpointId
 * @param {Record<string, unknown>[]} objects
 */
async function registerKalshiLiveView(endpointId, objects) {
  const key = logicalKey(endpointId);
  const viewName = viewNameFor(key);
  const jsonFileName = `kalshi_live_${key}.json`;

  const { db, conn } = await warmDuckDbWasm();

  const prev = kalshiLiveRegistry.get(key);
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

  if (!objects.length) {
    await conn.query(`CREATE OR REPLACE VIEW ${viewName} AS SELECT 1 WHERE FALSE`);
    kalshiLiveRegistry.set(key, { virtualFileName: jsonFileName, viewName });
    return;
  }

  const jsonBytes = new TextEncoder().encode(JSON.stringify(objects));
  await db.registerFileBuffer(jsonFileName, jsonBytes);
  const escapedFile = jsonFileName.replace(/'/g, "''");
  await conn.query(
    `CREATE OR REPLACE VIEW ${viewName} AS SELECT * FROM read_json_auto('${escapedFile}')`,
  );
  kalshiLiveRegistry.set(key, { virtualFileName: jsonFileName, viewName });
}
