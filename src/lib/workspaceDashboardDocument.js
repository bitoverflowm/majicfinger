import { ATHENA_SUBSCRIBER_QUERY_ROW_LIMIT } from "@/config/dataLakeParquetSamples";

/** Shape of the dashboard project the editor saves. Tabs share one document. */

const MAX_SAVED_ROWS = ATHENA_SUBSCRIBER_QUERY_ROW_LIMIT;
const MAX_SAVED_CELLS = ATHENA_SUBSCRIBER_QUERY_ROW_LIMIT * 32;

export function emptyWorkspaceDashboard() {
  return {
    name: "Untitled",
    active_tab_id: "welcome",
    welcome_removed: false,
    tabs: [{ id: "welcome", name: "Welcome", blank: false }],
    blocks: {},
    tables: [],
    charts: [],
  };
}

function num(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function cleanText(value, max) {
  return String(value ?? "").slice(0, max);
}

function cleanCells(cells) {
  if (!cells || typeof cells !== "object") return {};
  const out = {};
  let count = 0;
  for (const [key, value] of Object.entries(cells)) {
    if (count >= MAX_SAVED_CELLS) break;
    if (!/^\d+,\d+$/.test(key)) continue;
    const text = cleanText(value, 500);
    if (!text) continue;
    out[key] = text;
    count += 1;
  }
  return out;
}

function cleanPoint(point, kind) {
  if (!point || typeof point !== "object") return null;
  if (kind === "trade-price") {
    const time = Number(point.time);
    const price = Number(point.price);
    if (!Number.isFinite(time) || !Number.isFinite(price)) return null;
    const size = Number(point.size);
    return { time, price, size: Number.isFinite(size) ? size : 0 };
  }
  const value = Number(point.value);
  if (!Number.isFinite(value)) return null;
  return { label: cleanText(point.label, 80), value };
}

function cleanChartSnapshot(chart) {
  if (!chart || typeof chart !== "object") return null;
  const kind = chart.kind === "trade-price" || chart.kind === "sheet-series" ? chart.kind : "";
  if (!kind) return null;
  const points = (Array.isArray(chart.points) ? chart.points : []).slice(0, 200).map((point) => cleanPoint(point, kind)).filter(Boolean);
  if (!points.length) return null;
  return {
    kind,
    points,
    ...(chart.valueTitle ? { valueTitle: cleanText(chart.valueTitle, 120) } : {}),
    ...(chart.labelTitle ? { labelTitle: cleanText(chart.labelTitle, 120) } : {}),
    ...(chart.sizeTitle ? { sizeTitle: cleanText(chart.sizeTitle, 40) } : {}),
    ...(chart.seriesKind === "line" || chart.seriesKind === "bar" ? { seriesKind: chart.seriesKind } : {}),
  };
}

function cleanPull(pull) {
  if (!pull || typeof pull !== "object") return null;
  const lake = cleanText(pull.lake, 40);
  const table = cleanText(pull.table, 40);
  if (!lake || !table) return null;
  const ticker = cleanText(pull.ticker, 80);
  const limit = Math.floor(num(pull.limit, 0));
  return {
    lake,
    table,
    ...(ticker ? { ticker } : {}),
    ...(limit > 0 ? { limit: Math.min(limit, MAX_SAVED_ROWS) } : {}),
  };
}

function tradeTickerFromTitle(title) {
  const match = String(title || "").match(/^Trades\s·\s(.+)$/);
  return match ? match[1].trim() : "";
}

function cleanBlock(block) {
  if (!block || typeof block !== "object") return null;
  const id = cleanText(block.id, 80);
  if (!id) return null;
  const columns = Array.isArray(block.columns)
    ? block.columns.slice(0, 80).map((column) => ({
        title: cleanText(column?.title, 120) || " ",
        width: Math.max(40, num(column?.width, 120)),
      }))
    : [];
  const title = cleanText(block.title, 200);
  const type = cleanText(block.type || "sheet", 20) || "sheet";
  const chart = type === "chart" ? cleanChartSnapshot(block.chart) : null;
  const pull = type === "sheet"
    ? cleanPull(block.pull) || (tradeTickerFromTitle(title) ? { lake: "kalshi", table: "trades", ticker: tradeTickerFromTitle(title) } : null)
    : null;
  const rowCount = Math.floor(num(block.rowCount, 0));
  return {
    id,
    type,
    ...(block.source ? { source: cleanText(block.source, 40) } : {}),
    ...(block.sourceSheetId ? { sourceSheetId: cleanText(block.sourceSheetId, 80) } : {}),
    x: num(block.x),
    y: num(block.y),
    w: Math.max(120, num(block.w, 320)),
    h: Math.max(72, num(block.h, 200)),
    title,
    body: cleanText(block.body, 4000),
    columns,
    cells: cleanCells(block.cells),
    ...(rowCount > 0 ? { rowCount } : {}),
    ...(pull ? { pull } : {}),
    ...(chart ? { chart } : {}),
  };
}

function cleanTable(table) {
  if (!table || typeof table !== "object") return null;
  const id = cleanText(table.id, 80);
  if (!id) return null;
  const columns = Array.isArray(table.columns)
    ? table.columns.slice(0, 80).map((column) => ({
        id: cleanText(column?.id, 80),
        title: cleanText(column?.title, 120),
        type: cleanText(column?.type, 20),
        ...(column?.scale ? { scale: cleanText(column.scale, 20) } : {}),
      }))
    : [];
  const title = cleanText(table.title, 200);
  const ticker = tradeTickerFromTitle(title);
  const storedRows = Array.isArray(table.rows) ? table.rows : [];
  const rowCap = ticker ? 50 : MAX_SAVED_ROWS;
  const rows = storedRows.slice(0, rowCap);
  const rowCount = Math.max(rows.length, Math.floor(num(table.rowCount, 0)));
  const query = cleanQuery(table.query, title, rowCount);
  return {
    id,
    title,
    kind: cleanText(table.kind || "query", 20) || "query",
    columns,
    rows,
    ...(rowCount > rows.length ? { rowCount } : {}),
    ...(query ? { query } : {}),
  };
}

function cleanQuery(query, title, rowCount) {
  const source = query && typeof query === "object" ? query : {};
  const ticker = tradeTickerFromTitle(title);
  const join = source.join && typeof source.join === "object"
    ? {
        target: cleanText(source.join.target, 80),
        tickers: (Array.isArray(source.join.tickers) ? source.join.tickers : []).slice(0, 80).map((item) => cleanText(item, 80)).filter(Boolean),
        ...(source.join.previewTicker ? { previewTicker: cleanText(source.join.previewTicker, 80) } : {}),
      }
    : null;
  const base = {
    summary: cleanText(source.summary, 300),
    integrationId: cleanText(source.integrationId, 80),
    tableId: ticker ? "trades" : cleanText(source.tableId, 40),
    formula: cleanText(source.formula, 500),
    ...(join ? { join } : {}),
  };
  if (ticker) {
    const limit = Math.floor(num(source.pull?.limit || source.limit, 0));
    return {
      ...base,
      pull: {
        lake: "kalshi",
        table: "trades",
        ticker,
        ...(limit > 0 ? { limit: Math.min(limit, MAX_SAVED_ROWS) } : {}),
      },
      ...(rowCount > 0 ? { rowCount } : {}),
    };
  }
  if (source.athena && typeof source.athena === "object") return { ...base, athena: source.athena };
  return base.summary || base.integrationId ? base : null;
}

export function sanitizeWorkspaceDashboard(input) {
  const source = input && typeof input === "object" ? input : {};
  const tabsIn = Array.isArray(source.tabs) ? source.tabs : [];
  const tabs = [];
  const seen = new Set();
  for (const tab of tabsIn.slice(0, 30)) {
    const id = cleanText(tab?.id, 80);
    const name = cleanText(tab?.name, 80);
    if (!id || !name || seen.has(id)) continue;
    seen.add(id);
    tabs.push({ id, name, blank: !!tab.blank });
  }
  if (!tabs.length) tabs.push({ id: "welcome", name: "Welcome", blank: false });

  const blocksIn = source.blocks && typeof source.blocks === "object" ? source.blocks : {};
  const blocks = {};
  for (const [tabId, list] of Object.entries(blocksIn)) {
    const id = cleanText(tabId, 80);
    if (!id || !Array.isArray(list)) continue;
    blocks[id] = list.map(cleanBlock).filter(Boolean).slice(0, 80);
  }

  const tables = (Array.isArray(source.tables) ? source.tables : []).map(cleanTable).filter(Boolean).slice(0, 80);
  const sheetsById = new Map();
  for (const list of Object.values(blocks)) {
    for (const block of list) {
      if (block.type === "sheet") sheetsById.set(block.id, block);
    }
  }
  for (const table of tables) {
    const sheet = sheetsById.get(table.id);
    if (!sheet) continue;
    if (sheet.rowCount > (table.rowCount || table.rows.length)) {
      table.rowCount = sheet.rowCount;
      if (table.query) table.query.rowCount = sheet.rowCount;
    }
    if (sheet.pull?.limit && table.query?.pull && !table.query.pull.limit) table.query.pull.limit = sheet.pull.limit;
  }
  const active = cleanText(source.active_tab_id, 80);
  return {
    name: cleanText(source.name, 120) || "Untitled",
    active_tab_id: tabs.some((tab) => tab.id === active) ? active : tabs[0].id,
    welcome_removed: !!source.welcome_removed,
    tabs,
    blocks,
    tables,
    charts: chartsFromBlocks(blocks),
  };
}

function chartsFromBlocks(blocks) {
  const charts = [];
  for (const list of Object.values(blocks || {})) {
    for (const block of list || []) {
      if (block.type !== "chart") continue;
      charts.push({
        id: block.id,
        title: block.title,
        ...(block.sourceSheetId ? { sourceSheetId: block.sourceSheetId } : {}),
        ...(block.chart ? { chart: block.chart } : {}),
      });
    }
  }
  return charts;
}

export function tabIdFromPage(pageId) {
  const id = String(pageId || "");
  return id.startsWith("welcome:") ? id.slice("welcome:".length) : id;
}

export function pageIdForTab(tabId) {
  return `welcome:${tabId || "welcome"}`;
}
