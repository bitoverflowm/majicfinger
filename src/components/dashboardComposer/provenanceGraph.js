/** Mind map of one dashboard project: sources, filters, enrichments, sheets, tabs. */

import { pageIdForTab, tabIdFromPage } from "@/lib/workspaceDashboardDocument";

const COL_W = 248;
const ROW_H = 92;
const NODE_W = 220;
const NODE_H = 72;

const LAKE_LABEL = {
  kalshi: "Kalshi",
  polymarket: "Polymarket",
};

const INTEGRATION_LAKE = {
  kalshiHistorical: "kalshi",
  kalshiHistoricalV2: "kalshi",
  kalshiLive: "kalshi",
  polymarketHistorical: "polymarket",
  polymarket: "polymarket",
};

export function buildProvenanceGraph({ name, tabs, blocksByPage, tables, dataSheets } = {}) {
  const tableById = new Map((Array.isArray(tables) ? tables : []).map((table) => [table?.id, table]));
  const sheets = dataSheets && typeof dataSheets === "object" ? dataSheets : {};
  const pages = blocksByPage && typeof blocksByPage === "object" ? blocksByPage : {};
  const tabList = normalizeTabs(tabs, pages);

  const nodes = [];
  const edges = [];
  const sourceIndex = new Map();

  tabList.forEach((tab) => {
    const pageId = pageIdForTab(tab.id);
    const blocks = Array.isArray(pages[pageId]) ? pages[pageId] : Array.isArray(pages[tab.id]) ? pages[tab.id] : [];
    const tabNode = node(`tab:${tab.id}`, "tab", tab.name || "Tab", blocks.length ? `${blocks.length} on this tab` : "Empty tab", "tab");
    nodes.push(tabNode);
    blocks.forEach((block) => {
      if (!block?.id) return;
      const facts = sheetFacts(block, tableById.get(block.id), sheets[block.id]);
      const sheetNode = node(
        `sheet:${block.id}`,
        block.type === "chart" ? "chart" : block.type === "text" ? "text" : "sheet",
        block.title || (block.type === "chart" ? "Chart" : block.type === "text" ? "Text" : "Sheet"),
        sheetSubtitle(block, facts),
        block.type || "sheet",
        facts,
      );
      nodes.push(sheetNode);
      edges.push(edge(sheetNode.id, tabNode.id, "on"));

      if (block.type === "chart" && block.sourceSheetId) {
        edges.push(edge(`sheet:${block.sourceSheetId}`, sheetNode.id, "chart"));
      }
      if (facts.parentSheetId) {
        edges.push(edge(`sheet:${facts.parentSheetId}`, sheetNode.id, facts.enrichment ? "enrichment" : "join"));
      }
      if (!facts.lake && !facts.table && !facts.enrichment) return;

      if (facts.enrichment && !facts.lake) {
        const enrich = node(
          `enrich:${block.id}`,
          "enrichment",
          enrichmentTitle(facts.enrichment),
          facts.summary || facts.detail || "Derived on the dashboard",
          "enrichment",
          facts,
        );
        nodes.push(enrich);
        edges.push(edge(enrich.id, sheetNode.id, "builds"));
        return;
      }

      const sourceKey = [facts.lake, facts.table, facts.filterText, facts.sortLine, facts.limit || "", facts.join?.key || ""].join("|");
      let source = sourceIndex.get(sourceKey);
      if (!source) {
        source = node(
          `source:${sourceKey}`,
          "source",
          sourceTitle(facts),
          sourceSubtitle(facts),
          facts.lake || "source",
          facts,
        );
        sourceIndex.set(sourceKey, source);
        nodes.push(source);
      }
      if (facts.filterText || (facts.attributeLines || []).length) {
        const filter = node(
          `filter:${block.id}`,
          "filter",
          "Attribute filters",
          facts.filterText || facts.attributeLines.join(" · "),
          "filter",
          facts,
        );
        nodes.push(filter);
        edges.push(edge(source.id, filter.id, "filters"));
        edges.push(edge(filter.id, sheetNode.id, "feeds"));
      } else {
        edges.push(edge(source.id, sheetNode.id, "feeds"));
      }
      if (facts.enrichment) {
        const enrich = node(
          `enrich:${block.id}`,
          "enrichment",
          enrichmentTitle(facts.enrichment),
          facts.summary || "Applied before this sheet",
          "enrichment",
          facts,
        );
        nodes.push(enrich);
        edges.push(edge(source.id, enrich.id, "then"));
        edges.push(edge(enrich.id, sheetNode.id, "builds"));
      }
    });
  });

  layout(nodes, edges);
  return {
    name: String(name || "Dashboard").trim() || "Dashboard",
    nodes,
    edges,
    width: nodes.reduce((max, item) => Math.max(max, item.x + NODE_W), 640) + 48,
    height: nodes.reduce((max, item) => Math.max(max, item.y + NODE_H), 360) + 48,
  };
}

function normalizeTabs(tabs, pages) {
  const list = [];
  const seen = new Set();
  for (const tab of Array.isArray(tabs) ? tabs : []) {
    const id = String(tab?.id || "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    list.push({ id, name: tab.name || id });
  }
  for (const pageId of Object.keys(pages || {})) {
    const id = tabIdFromPage(pageId);
    if (!id || seen.has(id)) continue;
    if (!Array.isArray(pages[pageId]) || !pages[pageId].length) continue;
    seen.add(id);
    list.push({ id, name: id });
  }
  if (!list.length) list.push({ id: "welcome", name: "Welcome" });
  return list;
}

function sheetFacts(block, table, dataSheet) {
  const query = table?.query && typeof table.query === "object" ? table.query : {};
  const provenance = firstObject(block?.provenance, query.provenance, dataSheet?.provenance);
  const athena = query.athena && typeof query.athena === "object" ? query.athena : null;
  const pull = firstObject(block?.pull, query.pull);
  const integrationId = String(provenance?.integrationId || query.integrationId || "").trim();
  const lake =
    String(provenance?.lake || athena?.lake || INTEGRATION_LAKE[integrationId] || pull?.lake || "").trim();
  const tableName = String(provenance?.table || athena?.table || pull?.table || query.tableId || "").trim();
  const filters = provenance?.composeFilters || athena?.filters || null;
  const attributeLines = Array.isArray(provenance?.attributeLines) ? provenance.attributeLines.filter(Boolean) : [];
  const filterText = describeFilters(filters);
  const sortLine = String(provenance?.sortLine || describeSort(provenance?.composeSpec || athena?.compose) || "").trim();
  const limit = Number(provenance?.composeAthenaRowLimit || athena?.limit || pull?.limit || 0) || 0;
  const enrichment = provenance?.sample
    ? "sample"
    : provenance?.kind === "enrichment"
      ? provenance.operation || "enrichment"
      : enrichmentFromTitle(block?.title, block?.source);
  const summary = String(provenance?.summary || query.summary || "").trim();
  const detail = enrichmentDetail(provenance?.detail);
  const parentSheetId = String(provenance?.parentSheetId || "").trim();
  const join = normalizeJoin(provenance, query, pull, lake);
  return {
    lake,
    table: tableName,
    filters,
    filterText,
    attributeLines,
    sortLine,
    limit,
    enrichment,
    summary,
    detail,
    parentSheetId,
    join,
    integrationId,
    rowCount: Number(block?.rowCount || table?.rowCount || dataSheet?.fullRowCount || dataSheet?.rowCount || 0) || 0,
    kind: provenance?.kind || "",
  };
}

function firstObject(...values) {
  return values.find((value) => value && typeof value === "object") || null;
}

function normalizeJoin(provenance, query, pull, lake) {
  if (provenance?.join?.match) return provenance.join;
  if (pull?.ticker) {
    return {
      match: lake === "polymarket" ? "outcomeToken" : "ticker",
      role: "trades",
      key: String(pull.ticker),
    };
  }
  const target = String(query?.join?.target || "");
  if (!target) return null;
  return { match: target.includes("polymarket") ? "outcomeToken" : "ticker", role: "join" };
}

function enrichmentFromTitle(title, source) {
  if (source !== "integration-run") return "";
  const text = String(title || "");
  if (text === "Summary") return "summary";
  if (text.startsWith("Buckets")) return "bucket";
  if (text.startsWith("Function")) return "function";
  return "";
}

function enrichmentTitle(operation) {
  if (operation === "bucket") return "Buckets";
  if (operation === "summary") return "Summary";
  if (operation === "function") return "Function column";
  if (operation === "sample") return "Random sample";
  return "Enrichment";
}

function enrichmentDetail(detail) {
  if (!detail || typeof detail !== "object") return "";
  if (detail.formula) return String(detail.formula);
  if (detail.column) return String(detail.column);
  if (detail.size) return `${Number(detail.size).toLocaleString()} ${detail.mode === "unseeded" ? "unseeded" : "seeded"} rows`;
  return "";
}

function sourceTitle(facts) {
  const lake = LAKE_LABEL[facts.lake] || facts.lake || "Source";
  const table = facts.table || "table";
  return `${lake} · ${table}`;
}

function sourceSubtitle(facts) {
  const parts = [];
  if (facts.join?.match) parts.push(facts.join.match === "outcomeToken" ? "Joined by outcome token" : `Joined by ${facts.join.match}`);
  if (facts.limit) parts.push(`${Number(facts.limit).toLocaleString()} row limit`);
  return parts.join(" · ") || "Archive query";
}

function sheetSubtitle(block, facts) {
  if (block?.type === "text") return "Text";
  if (block?.type === "chart") return "Chart";
  if (facts.rowCount) return `${facts.rowCount.toLocaleString()} rows`;
  if (facts.summary) return facts.summary;
  return "Sheet";
}

function describeFilters(filters) {
  if (!filters || typeof filters !== "object") return "";
  const parts = [];
  const walk = (node) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node.and)) node.and.forEach(walk);
    if (Array.isArray(node.or)) node.or.forEach(walk);
    if (node.column && node.op) {
      if (node.op === "is_not_null") {
        parts.push(`${titleCase(node.column)} excludes null`);
        return;
      }
      if (node.op === "neq" && (node.value == null || node.value === "")) {
        parts.push(`${titleCase(node.column)} excludes empty`);
        return;
      }
      const value = node.value == null || node.value === "" ? "" : ` ${formatFilterValue(node.value)}`;
      parts.push(`${titleCase(node.column)} ${opLabel(node.op)}${value}`);
    }
  };
  walk(filters);
  return parts.slice(0, 6).join(" · ");
}

function describeSort(compose) {
  const order = compose?.orderBy;
  if (!Array.isArray(order) || !order.length) return "";
  return order
    .slice(0, 2)
    .map((item) => `${titleCase(item.alias || item.column || "column")} ${item.direction === "asc" ? "ascending" : "descending"}`)
    .join(", ");
}

function opLabel(op) {
  const labels = {
    eq: "is",
    neq: "is not",
    in: "is one of",
    contains: "contains",
    not_contains: "excludes",
    gt: ">",
    lt: "<",
    gte: "≥",
    lte: "≤",
    is_not_null: "excludes null",
    is_null: "is null",
  };
  return labels[op] || op;
}

function formatFilterValue(value) {
  const text = String(value);
  return text.length > 42 ? `${text.slice(0, 40)}…` : text;
}

function titleCase(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function node(id, kind, title, subtitle, tone, facts) {
  return {
    id,
    kind,
    title,
    subtitle: subtitle || "",
    tone,
    facts: facts || null,
    x: 0,
    y: 0,
  };
}

function edge(from, to, label) {
  return { id: `${from}>${to}:${label}`, from, to, label };
}

function layout(nodes, edges) {
  const rank = { source: 0, filter: 1, enrichment: 2, sheet: 3, chart: 3, text: 3, tab: 4 };
  const columns = [[], [], [], [], []];
  nodes.forEach((item) => {
    const column = rank[item.kind] ?? 3;
    columns[column].push(item);
  });
  columns.forEach((column, index) => {
    column.forEach((item, row) => {
      item.x = 32 + index * COL_W;
      item.y = 32 + row * ROW_H;
    });
  });
  const byId = new Map(nodes.map((item) => [item.id, item]));
  edges.forEach((item) => {
    item.fromNode = byId.get(item.from) || null;
    item.toNode = byId.get(item.to) || null;
  });
}

export const PROVENANCE_NODE_SIZE = { w: NODE_W, h: NODE_H };
