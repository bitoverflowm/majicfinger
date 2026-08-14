import { flushSync } from "react-dom";

import {
  applyConnectHomePullData,
  prepareConnectHomePullSheet,
} from "@/lib/connectHomePullDestination";
import {
  marketRefFromListMarketsRow,
  marketRefFromPublicSearchSuggestion,
  normalizePolymarketHoldersByMarketsComposeState,
  normalizePolymarketHoldersByMarketsSheetLayout,
  POLYMARKET_HOLDERS_BY_MARKETS_SHEET_LAYOUT_PER_MARKET,
} from "@/lib/polymarketLive/holdersByMarketsCompose";
import { buildPolymarketMarketsListQueryValues } from "@/lib/polymarketLive/marketsCompose";

/**
 * @param {Record<string, unknown>} dataSheets
 * @returns {string}
 */
function allocateNextSheetId(dataSheets) {
  const keys = Object.keys(dataSheets || {});
  const nextNum =
    keys.reduce((max, k) => {
      const n = parseInt(String(k).replace(/\D/g, ""), 10) || 0;
      return Math.max(max, n);
    }, 0) + 1;
  return `sheet-${nextNum}`;
}

/**
 * @param {{ title?: string; slug?: string; id?: string; conditionId?: string }} meta
 * @param {number} index
 * @returns {string}
 */
function sheetNameForMarket(meta, index) {
  const title = String(meta?.title || "").trim();
  if (title) return title.slice(0, 80);
  const slug = String(meta?.slug || "").trim();
  if (slug) return slug.slice(0, 80);
  const id = String(meta?.id || "").trim();
  if (id) return `Market ${id}`.slice(0, 80);
  const cid = String(meta?.conditionId || "").trim();
  if (cid) return `Holders ${cid.slice(0, 10)}…`.slice(0, 80);
  return `Market ${index + 1}`;
}

/**
 * @param {unknown} payload
 * @param {{
 *   selectedColumns?: string[];
 *   marketMetaByConditionId?: Record<string, { id?: string; slug?: string; title?: string; conditionId?: string }>;
 * }} [opts]
 * @returns {Record<string, unknown>[]}
 */
export function flattenPolymarketHoldersPayloadToRows(payload, opts = {}) {
  const arr = Array.isArray(payload) ? payload : payload != null ? [payload] : [];
  const selected = Array.isArray(opts.selectedColumns)
    ? opts.selectedColumns.map((c) => String(c || "").trim()).filter(Boolean)
    : [];
  const selectedSet = selected.length ? new Set(selected) : null;
  const metaByCid = opts.marketMetaByConditionId || {};

  /** @type {Record<string, unknown>[]} */
  const rows = [];
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const meta = /** @type {Record<string, unknown>} */ (item);
    // Already flattened holder rows (from API expand)
    if (
      meta.proxyWallet != null ||
      meta.amount != null ||
      (meta.token != null && !Array.isArray(meta.holders))
    ) {
      const conditionId = String(meta.conditionId || "").trim();
      const m = conditionId ? metaByCid[conditionId] : null;
      const row = {
        ...meta,
        ...(m
          ? {
              conditionId: m.conditionId || conditionId || meta.conditionId || "",
              market_id: m.id || meta.market_id || "",
              market_slug: m.slug || meta.market_slug || "",
              market_title: m.title || meta.market_title || "",
            }
          : {}),
      };
      rows.push(selectedSet ? pickColumns(row, selectedSet) : row);
      continue;
    }
    const token = meta.token != null ? String(meta.token) : "";
    const holders = Array.isArray(meta.holders) ? meta.holders : [];
    if (!holders.length) {
      const row = { token };
      rows.push(selectedSet ? pickColumns(row, selectedSet) : row);
      continue;
    }
    for (const h of holders) {
      if (!h || typeof h !== "object") continue;
      const holder = /** @type {Record<string, unknown>} */ (h);
      const row = { token, ...holder };
      rows.push(selectedSet ? pickColumns(row, selectedSet) : row);
    }
  }
  return rows;
}

/**
 * @param {Record<string, unknown>} row
 * @param {Set<string>} selectedSet
 */
function pickColumns(row, selectedSet) {
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const k of Object.keys(row)) {
    if (selectedSet.has(k)) out[k] = row[k];
  }
  return out;
}

/**
 * Resolve condition ids for market refs that are missing them (via Gamma listMarkets).
 *
 * @param {import("@/lib/polymarketLive/holdersByMarketsCompose").PolymarketHoldersMarketRef[]} refs
 * @returns {Promise<import("@/lib/polymarketLive/holdersByMarketsCompose").PolymarketHoldersMarketRef[]>}
 */
export async function resolveHoldersMarketConditionIds(refs) {
  const list = Array.isArray(refs) ? refs : [];
  const needResolve = list.filter((r) => !String(r.conditionId || "").trim() && (r.id || r.slug));
  if (!needResolve.length) return list;

  /** @type {Map<string, string>} */
  const resolved = new Map();

  await Promise.all(
    needResolve.map(async (r) => {
      const params = new URLSearchParams({ query: "listMarkets", limit: "5" });
      if (r.id) params.set("id", String(r.id));
      else if (r.slug) params.set("slug", String(r.slug));
      try {
        const res = await fetch(`/api/integrations/polymarket?${params.toString()}`, {
          method: "GET",
          headers: { Accept: "application/json" },
          credentials: "same-origin",
        });
        const data = await res.json().catch(() => []);
        if (!res.ok) return;
        const arr = Array.isArray(data) ? data : data != null ? [data] : [];
        const hit = arr.find((m) => m && typeof m === "object") || null;
        if (!hit) return;
        const cid = String(
          /** @type {Record<string, unknown>} */ (hit).conditionId ||
            /** @type {Record<string, unknown>} */ (hit).condition_id ||
            "",
        ).trim();
        if (!cid) return;
        const key = `${r.id || ""}:${r.slug || ""}`;
        resolved.set(key, cid);
      } catch {
        /* ignore */
      }
    }),
  );

  return list.map((r) => {
    if (r.conditionId) return r;
    const key = `${r.id || ""}:${r.slug || ""}`;
    const cid = resolved.get(key);
    return cid ? { ...r, conditionId: cid } : r;
  });
}

/**
 * List markets matching advanced filters, then map to holder market refs.
 *
 * @param {import("@/lib/polymarketLive/marketsCompose").PolymarketMarketsComposeState} marketsFilters
 * @returns {Promise<import("@/lib/polymarketLive/holdersByMarketsCompose").PolymarketHoldersMarketRef[]>}
 */
export async function discoverHoldersMarketsFromListFilters(marketsFilters) {
  const values = buildPolymarketMarketsListQueryValues({
    ...marketsFilters,
    mode: "advanced",
  });
  const params = new URLSearchParams({ query: "listMarkets" });
  for (const [k, v] of Object.entries(values)) {
    if (v === undefined || v === null || v === "") continue;
    params.set(k, String(v));
  }
  // Need conditionId on each market — request a focused field set.
  params.set("fields", "id,slug,question,conditionId,condition_id,groupItemTitle,title");

  const res = await fetch(`/api/integrations/polymarket?${params.toString()}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    credentials: "same-origin",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data?.message === "string" ? data.message : "Failed to list markets");
  }
  const arr = Array.isArray(data) ? data : data != null ? [data] : [];
  /** @type {import("@/lib/polymarketLive/holdersByMarketsCompose").PolymarketHoldersMarketRef[]} */
  const refs = [];
  const seen = new Set();
  for (const row of arr) {
    const ref = marketRefFromListMarketsRow(row);
    if (!ref) continue;
    const key = ref.conditionId || `${ref.id}:${ref.slug}`;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    refs.push(ref);
  }
  return refs;
}

/**
 * Fetch holders for compose state and return flattened rows (plus per-market groups).
 *
 * @param {import("@/lib/polymarketLive/holdersByMarketsCompose").PolymarketHoldersByMarketsComposeState} compose
 * @param {{ selectedColumns?: string[]; marketRefsOverride?: import("@/lib/polymarketLive/holdersByMarketsCompose").PolymarketHoldersMarketRef[] }} [opts]
 * @returns {Promise<{
 *   rows: Record<string, unknown>[];
 *   byMarket: Array<{ conditionId: string; sheetName: string; rows: Record<string, unknown>[] }>;
 *   market: string;
 *   sheetLayout: import("@/lib/polymarketLive/holdersByMarketsCompose").PolymarketHoldersByMarketsSheetLayout;
 *   marketsDiscovered: number;
 * }>}
 */
export async function fetchPolymarketHoldersByMarketsRows(compose, opts = {}) {
  const normalized = normalizePolymarketHoldersByMarketsComposeState(compose);
  const sheetLayout = normalizePolymarketHoldersByMarketsSheetLayout(normalized.sheetLayout);

  let seedRefs = Array.isArray(opts.marketRefsOverride)
    ? opts.marketRefsOverride
    : normalized.marketRefs;

  // Advanced compose: discover markets via GET /markets filters first.
  if (!opts.marketRefsOverride && normalized.mode === "advanced") {
    seedRefs = await discoverHoldersMarketsFromListFilters(normalized.marketsFilters);
    if (!seedRefs.length) {
      throw new Error("No markets matched your filters.");
    }
  }

  const resolvedRefs = await resolveHoldersMarketConditionIds(seedRefs);
  const conditionIds = [
    ...new Set(resolvedRefs.map((r) => String(r.conditionId || "").trim()).filter(Boolean)),
  ];
  if (!conditionIds.length) {
    throw new Error("Select at least one market with a condition id.");
  }

  /** @type {Record<string, { id?: string; slug?: string; title?: string; conditionId?: string }>} */
  const marketMetaByConditionId = {};
  for (const r of resolvedRefs) {
    const cid = String(r.conditionId || "").trim();
    if (!cid) continue;
    marketMetaByConditionId[cid] = {
      id: r.id || undefined,
      slug: r.slug || undefined,
      title: r.title || undefined,
      conditionId: cid,
    };
  }

  const selected = Array.isArray(opts.selectedColumns) ? opts.selectedColumns : [];
  const limit = String(normalized.limit);
  const minBalance = String(normalized.minBalance);

  /** @type {Record<string, unknown>[]} */
  const allRows = [];
  /** @type {Array<{ conditionId: string; sheetName: string; rows: Record<string, unknown>[] }>} */
  const byMarket = [];

  // Fetch per condition id so we can attach market meta / split sheets.
  for (let i = 0; i < conditionIds.length; i++) {
    const cid = conditionIds[i];
    const params = new URLSearchParams({
      query: "getTopHolders",
      market: cid,
      limit,
      minBalance,
    });
    if (selected.length) {
      const fields = new Set(selected);
      fields.add("token");
      fields.add("proxyWallet");
      fields.add("amount");
      params.set("fields", [...fields].join(","));
    }

    const res = await fetch(`/api/integrations/polymarket?${params.toString()}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "same-origin",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(typeof data?.message === "string" ? data.message : "Request failed");
    }

    const meta = marketMetaByConditionId[cid] || { conditionId: cid };
    const rowsRaw = flattenPolymarketHoldersPayloadToRows(data, {
      selectedColumns: [],
      marketMetaByConditionId: { [cid]: meta },
    }).map((row) => ({
      ...row,
      conditionId: meta.conditionId || cid,
      market_id: meta.id || row.market_id || "",
      market_slug: meta.slug || row.market_slug || "",
      market_title: meta.title || row.market_title || "",
    }));

    const rows = selected.length
      ? rowsRaw.map((row) => {
          /** @type {Record<string, unknown>} */
          const out = {};
          for (const k of selected) {
            if (k in row) out[k] = row[k];
          }
          return out;
        })
      : rowsRaw;

    byMarket.push({
      conditionId: cid,
      sheetName: sheetNameForMarket(meta, i),
      rows,
    });
    allRows.push(...rows);
  }

  return {
    rows: allRows,
    byMarket,
    market: conditionIds.join(","),
    sheetLayout,
    marketsDiscovered: conditionIds.length,
  };
}

/**
 * @param {Record<string, unknown>} ctx
 * @param {{
 *   rows: Record<string, unknown>[];
 *   byMarket?: Array<{ conditionId: string; sheetName: string; rows: Record<string, unknown>[] }>;
 *   sheetLayout?: string;
 * }} payload
 */
export function applyPolymarketHoldersByMarketsRows(ctx, payload) {
  const rows = Array.isArray(payload?.rows) ? payload.rows : Array.isArray(payload) ? payload : [];
  const byMarket = Array.isArray(payload?.byMarket) ? payload.byMarket : [];
  const sheetLayout = normalizePolymarketHoldersByMarketsSheetLayout(payload?.sheetLayout);

  if (
    sheetLayout === POLYMARKET_HOLDERS_BY_MARKETS_SHEET_LAYOUT_PER_MARKET &&
    byMarket.length > 1 &&
    ctx?.setDataSheets
  ) {
    prepareConnectHomePullSheet(ctx);
    let firstSheetId = ctx?.activeSheetId || null;
    flushSync(() => {
      ctx.setDataSheets((prev) => {
        let next = { ...(prev || {}) };
        /** @type {string[]} */
        const writtenIds = [];
        for (let i = 0; i < byMarket.length; i++) {
          const group = byMarket[i];
          const groupRows = Array.isArray(group.rows) ? group.rows : [];
          let targetSheetId;
          if (i === 0 && firstSheetId && next[firstSheetId]) {
            targetSheetId = firstSheetId;
          } else {
            targetSheetId = allocateNextSheetId(next);
          }
          writtenIds.push(targetSheetId);
          const existing = next[targetSheetId] || { name: `Sheet`, data: [] };
          next = {
            ...next,
            [targetSheetId]: {
              ...existing,
              name: String(group.sheetName || existing.name || `Market ${i + 1}`).slice(0, 80),
              data: groupRows,
            },
          };
        }
        firstSheetId = writtenIds[0] || firstSheetId;
        return next;
      });
      if (firstSheetId && ctx?.setActiveSheetId) {
        ctx.setActiveSheetId(firstSheetId);
      }
      ctx?.setConnectHomeAnalyzeActive?.(true);
    });
    ctx?.requestConnectAnalyzeScroll?.();
    return byMarket.reduce((sum, g) => sum + (Array.isArray(g.rows) ? g.rows.length : 0), 0);
  }

  if (!rows.length) return 0;
  prepareConnectHomePullSheet(ctx);
  flushSync(() => {
    applyConnectHomePullData(ctx, rows);
    ctx.setConnectHomeAnalyzeActive?.(true);
  });
  ctx.requestConnectAnalyzeScroll?.();
  return rows.length;
}

/**
 * Search-mode Go: build market refs from suggestions, fetch holders, apply to sheet(s).
 *
 * @param {Record<string, unknown>} ctx
 * @param {import("@/lib/polymarketLive/polymarketPublicSearch").PolymarketPublicSearchSuggestion[]} suggestions
 * @param {{
 *   compose: import("@/lib/polymarketLive/holdersByMarketsCompose").PolymarketHoldersByMarketsComposeState;
 *   selectedColumns?: string[];
 * }} opts
 */
export async function applyPolymarketHoldersByMarketsSearchAll(ctx, suggestions, opts) {
  const refs = (suggestions || [])
    .map((s) => marketRefFromPublicSearchSuggestion(s))
    .filter(Boolean);
  if (!refs.length) {
    throw new Error("Select at least one market.");
  }
  const compose = normalizePolymarketHoldersByMarketsComposeState({
    ...(opts.compose || {}),
    mode: "search",
    marketRefs: refs,
  });
  const fetched = await fetchPolymarketHoldersByMarketsRows(compose, {
    selectedColumns: opts.selectedColumns,
    marketRefsOverride: refs,
  });
  if (!fetched.rows.length) {
    throw new Error("No holders found for the selected markets.");
  }
  return applyPolymarketHoldersByMarketsRows(ctx, fetched);
}
