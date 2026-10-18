import { pageIdForTab } from "@/lib/workspaceDashboardDocument";

/**
 * What the server holds, as of the last successful save.
 * Lists and tables are compared by reference first; only changed ones are serialized.
 */
export function createSaveBaseline() {
  return {
    meta: "",
    lists: new Map(),
    sigs: new Map(),
    tables: new Map(),
    tableSigs: new Map(),
    serverTabs: new Set(),
  };
}

export function rememberMeta(base, meta) {
  base.meta = JSON.stringify(meta);
}

/**
 * Tabs whose blocks the server already has, keyed by page id.
 * `savedBlocks` is the same tabs in the trimmed form a save would send, so signatures line up.
 */
export function rememberLoadedTabs(base, blocksByPage, savedBlocks) {
  for (const [page, list] of Object.entries(blocksByPage || {})) {
    if (!Array.isArray(list)) continue;
    const tabId = page.startsWith("welcome:") ? page.slice("welcome:".length) : page;
    base.lists.set(page, list);
    base.sigs.set(tabId, JSON.stringify(savedBlocks?.[page] || list));
    base.serverTabs.add(tabId);
  }
}

/** Tabs the server has blocks for that are not loaded in this browser yet. */
export function rememberServerTabs(base, tabIds) {
  for (const tabId of tabIds || []) if (tabId) base.serverTabs.add(tabId);
}

export function rememberTables(base, tables) {
  for (const table of Array.isArray(tables) ? tables : []) {
    const id = String(table?.id || "");
    if (!id) continue;
    base.tables.set(id, table);
    base.tableSigs.set(id, JSON.stringify(table));
  }
}

/**
 * The smallest patch that brings the server up to date.
 * Pending tabs are never sent: their blocks are not known here yet.
 * @param {ReturnType<typeof createSaveBaseline>} base
 * @param {{
 *   meta: object,
 *   tabIds: string[],
 *   blocksByPage: Record<string, object[]>,
 *   savedBlocks: Record<string, object[]>,
 *   tables: object[],
 *   savedTableList: object[],
 *   pendingTabs?: string[],
 *   removedTabs?: Iterable<string>,
 * }} state
 * @returns {{ patch: object | null, commit: () => void, removedTabs: string[] }} `patch` is null when the server is already up to date.
 */
export function buildSavePatch(base, state) {
  const patch = {};
  const commits = [];
  const pending = new Set(state.pendingTabs || []);
  const removed = new Set(state.removedTabs || []);
  const live = new Set(state.tabIds || []);

  const metaSig = JSON.stringify(state.meta);
  if (metaSig !== base.meta) {
    patch.meta = state.meta;
    commits.push(() => {
      base.meta = metaSig;
    });
  }

  const blocks = {};
  for (const tabId of live) {
    if (pending.has(tabId) || removed.has(tabId)) continue;
    const page = pageIdForTab(tabId);
    const raw = state.blocksByPage?.[page];
    if (base.lists.has(page) && base.lists.get(page) === raw) continue;
    const list = Array.isArray(raw) ? raw : [];
    if (!list.length) {
      if (base.serverTabs.has(tabId)) removed.add(tabId);
      else base.lists.set(page, raw);
      continue;
    }
    const saved = state.savedBlocks?.[page] || list;
    const sig = JSON.stringify(saved);
    if (sig === base.sigs.get(tabId)) {
      base.lists.set(page, raw);
      continue;
    }
    blocks[tabId] = saved;
    commits.push(() => {
      base.lists.set(page, raw);
      base.sigs.set(tabId, sig);
      base.serverTabs.add(tabId);
    });
  }
  if (Object.keys(blocks).length) patch.blocks = blocks;

  const removeTabs = [...removed].filter((tabId) => base.serverTabs.has(tabId));
  if (removeTabs.length) patch.remove_tabs = removeTabs;
  commits.push(() => {
    for (const tabId of removed) {
      base.serverTabs.delete(tabId);
      base.sigs.delete(tabId);
      base.lists.set(pageIdForTab(tabId), state.blocksByPage?.[pageIdForTab(tabId)]);
    }
  });

  const upsert = [];
  const seen = new Set();
  (Array.isArray(state.tables) ? state.tables : []).forEach((raw, index) => {
    const id = String(raw?.id || "");
    if (!id) return;
    seen.add(id);
    if (base.tables.get(id) === raw) return;
    const saved = state.savedTableList?.[index] || raw;
    const sig = JSON.stringify(saved);
    if (sig === base.tableSigs.get(id)) {
      base.tables.set(id, raw);
      return;
    }
    upsert.push(saved);
    commits.push(() => {
      base.tables.set(id, raw);
      base.tableSigs.set(id, sig);
    });
  });
  const removeTables = [...base.tableSigs.keys()].filter((id) => !seen.has(id));
  if (upsert.length || removeTables.length) {
    patch.tables = { ...(upsert.length ? { upsert } : {}), ...(removeTables.length ? { remove: removeTables } : {}) };
    commits.push(() => {
      for (const id of removeTables) {
        base.tables.delete(id);
        base.tableSigs.delete(id);
      }
    });
  }

  if (!Object.keys(patch).length) {
    for (const commit of commits) commit();
    return { patch: null, removedTabs: [...removed], commit: () => {} };
  }
  return {
    patch,
    removedTabs: [...removed],
    commit: () => {
      for (const commit of commits) commit();
    },
  };
}
