import { ATHENA_SUBSCRIBER_QUERY_ROW_LIMIT } from "@/config/dataLakeParquetSamples";
import { recordsFromRows } from "@/components/dashboardComposer/integrationRunSheets";
import { DATASET_TYPES } from "@/lib/visualizations/datasetDescriptor";
import { isSavedChartView } from "@/lib/visualizations/presetRegistry";

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

function cleanTokenList(tokens) {
  if (!Array.isArray(tokens)) return [];
  const out = [];
  for (const token of tokens) {
    const text = cleanText(token, 120).trim();
    if (!text || out.includes(text)) continue;
    out.push(text);
    if (out.length >= 40) break;
  }
  return out;
}

function cleanTickerList(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => cleanText(item, 80).trim()).filter(Boolean).slice(0, 40);
}

function cleanTime(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function cleanFilterMap(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const out = {};
  let count = 0;
  for (const [key, item] of Object.entries(value)) {
    if (count >= 24) break;
    const id = cleanText(key, 40).trim();
    if (!id) continue;
    const source = item && typeof item === "object" && !Array.isArray(item) ? item : { value: item };
    const next = {};
    for (const field of ["value", "min", "max"]) {
      const text = cleanText(source[field], 80).trim();
      if (text) next[field] = text;
    }
    if (!Object.keys(next).length) continue;
    out[id] = next;
    count += 1;
  }
  return count ? out : null;
}

function cleanReplayQuery(value) {
  if (!value || typeof value !== "object") return null;
  const rowLimit = Math.floor(num(value.rowLimit, 0));
  const address = cleanText(value.address, 80).trim();
  const filters = cleanFilterMap(value.filters);
  const sortKeys = Array.isArray(value.sortKeys)
    ? value.sortKeys
        .slice(0, 8)
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const columnId = cleanText(item.columnId || item.id, 40).trim();
          if (!columnId) return null;
          const direction = item.direction === "asc" ? "asc" : "desc";
          return { columnId, direction };
        })
        .filter(Boolean)
    : [];
  if (!(rowLimit > 0) && !address && !filters && !sortKeys.length) return null;
  return {
    ...(rowLimit > 0 ? { rowLimit: Math.min(rowLimit, MAX_SAVED_ROWS) } : {}),
    ...(address ? { address } : {}),
    ...(filters ? { filters } : {}),
    ...(sortKeys.length ? { sortKeys } : {}),
  };
}

function cleanPull(pull) {
  if (!pull || typeof pull !== "object") return null;
  const lake = cleanText(pull.lake, 40).trim();
  const table = cleanText(pull.table, 40).trim();
  const ticker = cleanText(pull.ticker, 180).trim();
  const tokens = cleanTokenList(pull.tokens);
  const eventTicker = cleanText(pull.eventTicker, 80).trim();
  const seriesTicker = cleanText(pull.seriesTicker, 80).trim();
  const eventTickers = cleanTickerList(pull.eventTickers);
  const seriesTickers = cleanTickerList(pull.seriesTickers);
  const marketTitle = cleanText(pull.marketTitle, 200).trim();
  const side = cleanText(pull.side, 40).trim();
  const outcome = cleanText(pull.outcome, 80).trim();
  const status = cleanText(pull.status, 40).trim();
  const address = cleanText(pull.address, 80).trim();
  const wallet = /^0x[a-fA-F0-9]{40}$/.test(address) ? address : "";
  const openAt = cleanTime(pull.openAt);
  const closeAt = cleanTime(pull.closeAt);
  if (!table || (!lake && !ticker && !tokens.length && !eventTicker && !seriesTicker && !eventTickers.length && !seriesTickers.length && !wallet)) {
    return null;
  }
  const limit = Math.floor(num(pull.limit, 0));
  return {
    ...(lake ? { lake } : {}),
    table,
    ...(ticker ? { ticker } : {}),
    ...(marketTitle ? { marketTitle } : {}),
    ...(side ? { side } : {}),
    ...(tokens.length ? { tokens } : {}),
    ...(eventTicker ? { eventTicker } : {}),
    ...(seriesTicker ? { seriesTicker } : {}),
    ...(eventTickers.length ? { eventTickers } : {}),
    ...(seriesTickers.length ? { seriesTickers } : {}),
    ...(limit > 0 ? { limit: Math.min(limit, MAX_SAVED_ROWS) } : {}),
    ...(pull.closed === true || pull.closed === false ? { closed: pull.closed === true } : {}),
    ...(outcome ? { outcome } : {}),
    ...(status ? { status } : {}),
    ...(wallet ? { address: wallet } : {}),
    ...(wallet && pull.kind === "profile" ? { kind: "profile" } : {}),
    ...(openAt ? { openAt } : {}),
    ...(closeAt ? { closeAt } : {}),
  };
}

function tradeTickerFromTitle(title) {
  const match = String(title || "").match(/^Trades\s·\s(.+)$/);
  return match ? match[1].trim() : "";
}

function cleanProvenance(value) {
  if (!value || typeof value !== "object") return null;
  const kind = cleanText(value.kind, 40);
  if (kind !== "compose" && kind !== "enrichment") return null;
  const lake = cleanText(value.lake, 40);
  const table = cleanText(value.table, 40);
  const summary = cleanText(value.summary, 300);
  const integrationId = cleanText(value.integrationId, 80);
  const operation = cleanText(value.operation, 40);
  const parentSheetId = cleanText(value.parentSheetId, 80);
  const sortLine = cleanText(value.sortLine, 200);
  const limit = Math.floor(num(value.composeAthenaRowLimit, 0));
  const attributeLines = Array.isArray(value.attributeLines)
    ? value.attributeLines.slice(0, 24).map((line) => cleanText(line, 200)).filter(Boolean)
    : [];
  const join = value.join && typeof value.join === "object"
    ? {
        match: cleanText(value.join.match, 40),
        ...(value.join.role ? { role: cleanText(value.join.role, 40) } : {}),
        ...(value.join.key ? { key: cleanText(value.join.key, 160) } : {}),
      }
    : null;
  return {
    kind,
    ...(lake ? { lake } : {}),
    ...(table ? { table } : {}),
    ...(value.composeSpec && typeof value.composeSpec === "object" ? { composeSpec: value.composeSpec } : {}),
    ...(value.composeFilters && typeof value.composeFilters === "object" ? { composeFilters: value.composeFilters } : {}),
    ...(limit > 0 ? { composeAthenaRowLimit: Math.min(limit, MAX_SAVED_ROWS) } : {}),
    serverSheetJoins: Array.isArray(value.serverSheetJoins) ? value.serverSheetJoins.slice(0, 40) : [],
    browserSheetJoins: Array.isArray(value.browserSheetJoins) ? value.browserSheetJoins.slice(0, 40) : [],
    ...(summary ? { summary } : {}),
    ...(integrationId ? { integrationId } : {}),
    ...(operation ? { operation } : {}),
    ...(parentSheetId ? { parentSheetId } : {}),
    ...(sortLine ? { sortLine } : {}),
    ...(attributeLines.length ? { attributeLines } : {}),
    ...(join && join.match ? { join } : {}),
    ...(value.detail && typeof value.detail === "object" ? { detail: value.detail } : {}),
  };
}

function cleanDataset(value) {
  if (!value || typeof value !== "object") return null;
  const datasetType = cleanText(value.datasetType, 40);
  if (!DATASET_TYPES.includes(datasetType)) return null;
  const fields = {};
  for (const [key, field] of Object.entries(value.fields || {}).slice(0, 16)) {
    const name = cleanText(key, 20);
    const column = cleanText(field, 40);
    if (name && column) fields[name] = column;
  }
  return {
    datasetType,
    shape: cleanText(value.shape, 20),
    scope: cleanText(value.scope, 20),
    priceBasis: cleanText(value.priceBasis, 20),
    delivery: cleanText(value.delivery, 20),
    coverage: cleanText(value.coverage, 20),
    sourceTable: cleanText(value.sourceTable, 80),
    seriesKeys: Array.isArray(value.seriesKeys) ? value.seriesKeys.slice(0, 8).map((key) => cleanText(key, 40)).filter(Boolean) : [],
    required: Array.isArray(value.required) ? value.required.slice(0, 12).map((key) => cleanText(key, 40)).filter(Boolean) : [],
    ...(value.category === "stats" ? { category: "stats" } : {}),
    fields,
    units: {
      price: cleanText(value.units?.price, 30),
      quantity: cleanText(value.units?.quantity, 30),
      currency: cleanText(value.units?.currency, 10),
      metric: cleanText(value.units?.metric, 30),
    },
  };
}

function cleanRecordValue(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const text = value.trim();
    return text ? text.slice(0, 500) : null;
  }
  return null;
}

/** The pull's own rows. The grid's cells are a view of this list. */
function cleanRecords(records) {
  if (!Array.isArray(records)) return null;
  const out = [];
  let used = 0;
  for (const row of records) {
    if (!row || typeof row !== "object" || Array.isArray(row)) continue;
    const clean = {};
    for (const [key, value] of Object.entries(row)) {
      const id = cleanText(key, 80);
      if (!id) continue;
      const kept = cleanRecordValue(value);
      if (kept == null || kept === "") continue;
      clean[id] = kept;
      used += 1;
      if (used >= MAX_SAVED_CELLS) break;
    }
    if (Object.keys(clean).length) out.push(clean);
    if (used >= MAX_SAVED_CELLS) break;
  }
  return out.length ? out : null;
}

function cleanBlock(block) {
  if (!block || typeof block !== "object") return null;
  const id = cleanText(block.id, 80);
  if (!id) return null;
  const columns = Array.isArray(block.columns)
    ? block.columns.slice(0, 80).map((column) => {
        const id = cleanText(column?.id, 80);
        const typeName = cleanText(column?.type, 20);
        return {
          ...(id ? { id } : {}),
          title: cleanText(column?.title, 120) || " ",
          width: Math.max(40, num(column?.width, 120)),
          ...(typeName ? { type: typeName } : {}),
          ...(column?.exact ? { exact: true } : {}),
        };
      })
    : [];
  const title = cleanText(block.title, 200);
  const type = cleanText(block.type || "sheet", 20) || "sheet";
  const integrationId = cleanText(block.integrationId || block.provenance?.integrationId, 80);
  const table = cleanText(block.table || block.provenance?.table || block.pull?.table, 40);
  const chart = type === "chart" ? cleanChartSnapshot(block.chart) : null;
  const provenance = cleanProvenance(block.provenance);
  const ticker = tradeTickerFromTitle(title);
  const pull = type === "sheet"
    ? cleanPull(block.pull) || (ticker ? { lake: provenance?.lake || "kalshi", table: provenance?.table || "trades", ticker } : null)
    : null;
  const query = type === "sheet" ? cleanReplayQuery(block.query) : null;
  const records = type === "sheet" ? cleanRecords(block.records) : null;
  const rowCount = Math.floor(num(block.rowCount, 0));
  const dataset = type === "sheet" ? cleanDataset(block.dataset) : null;
  return {
    id,
    type,
    ...(block.source ? { source: cleanText(block.source, 40) } : {}),
    ...(block.sourceSheetId ? { sourceSheetId: cleanText(block.sourceSheetId, 80) } : {}),
    ...(isSavedChartView(block.chartView) ? { chartView: block.chartView } : {}),
    ...(block.vizCustom ? { vizCustom: true } : {}),
    x: num(block.x),
    y: num(block.y),
    w: Math.max(120, num(block.w, 320)),
    h: Math.max(72, num(block.h, 200)),
    title,
    body: cleanText(block.body, 4000),
    columns,
    ...(records ? { records } : { cells: cleanCells(block.cells) }),
    ...(rowCount > 0 ? { rowCount } : {}),
    ...(integrationId ? { integrationId } : {}),
    ...(table ? { table } : {}),
    ...(dataset ? { dataset } : {}),
    ...(pull ? { pull } : {}),
    ...(query ? { query } : {}),
    ...(provenance ? { provenance } : {}),
    ...(chart ? { chart } : {}),
    ...(block.presentation === "visual" || block.presentation === "sheet" ? { presentation: block.presentation } : {}),
    ...(block.visualReady ? { visualReady: true } : {}),
    ...(Array.isArray(block.visualHidden) && block.visualHidden.length
      ? { visualHidden: block.visualHidden.slice(0, 12).map((id) => cleanText(id, 40)).filter(Boolean) }
      : {}),
    ...(num(block.sheetW) > 0 ? { sheetW: num(block.sheetW) } : {}),
    ...(num(block.pulledAt) > 0 ? { pulledAt: Math.floor(num(block.pulledAt)) } : {}),
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
  const recipe = table.query?.provenance?.kind === "compose" || table.provenance?.kind === "compose";
  const rowCap = ticker || recipe ? 50 : MAX_SAVED_ROWS;
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
  const provenance = cleanProvenance(source.provenance);
  if (ticker) {
    const limit = Math.floor(num(source.pull?.limit || source.limit || provenance?.composeAthenaRowLimit, 0));
    const lake = cleanText(source.pull?.lake || source.athena?.lake || provenance?.lake, 40) || "kalshi";
    const table = cleanText(source.pull?.table || provenance?.table, 40) || "trades";
    return {
      ...base,
      pull: {
        lake,
        table,
        ticker,
        ...(limit > 0 ? { limit: Math.min(limit, MAX_SAVED_ROWS) } : {}),
      },
      ...(source.athena && typeof source.athena === "object" ? { athena: source.athena } : {}),
      ...(provenance ? { provenance } : {}),
      ...(rowCount > 0 ? { rowCount } : {}),
    };
  }
  if (source.athena && typeof source.athena === "object") {
    return { ...base, athena: source.athena, ...(provenance ? { provenance } : {}) };
  }
  if (provenance) return { ...base, provenance };
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
    if (!sheet.records && table.rows.length) {
      const lifted = cleanRecords(recordsFromRows(sheet.columns, table.rows));
      if (lifted) {
        sheet.records = lifted;
        delete sheet.cells;
      }
    }
    if (sheet.records) table.rows = [];
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
