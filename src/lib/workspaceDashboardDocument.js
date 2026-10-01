/** Shape of the dashboard project the editor saves. Tabs share one document. */

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
    if (count >= 4000) break;
    if (!/^\d+,\d+$/.test(key)) continue;
    const text = cleanText(value, 500);
    if (!text) continue;
    out[key] = text;
    count += 1;
  }
  return out;
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
  return {
    id,
    type: cleanText(block.type || "sheet", 20) || "sheet",
    ...(block.source ? { source: cleanText(block.source, 40) } : {}),
    x: num(block.x),
    y: num(block.y),
    w: Math.max(120, num(block.w, 320)),
    h: Math.max(72, num(block.h, 200)),
    title: cleanText(block.title, 200),
    body: cleanText(block.body, 4000),
    columns,
    cells: cleanCells(block.cells),
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
  const rows = Array.isArray(table.rows) ? table.rows.slice(0, 500) : [];
  const query = table.query && typeof table.query === "object" ? table.query : null;
  return {
    id,
    title: cleanText(table.title, 200),
    kind: cleanText(table.kind || "query", 20) || "query",
    columns,
    rows,
    ...(query ? { query } : {}),
  };
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
  const active = cleanText(source.active_tab_id, 80);
  return {
    name: cleanText(source.name, 120) || "Untitled",
    active_tab_id: tabs.some((tab) => tab.id === active) ? active : tabs[0].id,
    welcome_removed: !!source.welcome_removed,
    tabs,
    blocks,
    tables,
    charts: [],
  };
}

export function tabIdFromPage(pageId) {
  const id = String(pageId || "");
  return id.startsWith("welcome:") ? id.slice("welcome:".length) : id;
}

export function pageIdForTab(tabId) {
  return `welcome:${tabId || "welcome"}`;
}
