import { flushSync } from "react-dom";

import {
  applyConnectHomeSheetNameToSheet,
  resolveConnectHomeSheetDestination,
} from "@/lib/connectHomePullDestination";
import { buildPolymarketMarketsListQueryValues } from "@/lib/polymarketLive/marketsCompose";
import {
  expandOrderBookSummaryToRows,
  normalizePolymarketOrderbooksComposeState,
  normalizePolymarketOrderbooksSheetLayout,
  normalizePolymarketOrderbooksSide,
  orderbooksLayoutIncludesMetadata,
  orderbooksMarketRefFromListMarketsRow,
  orderbooksMarketRefFromSuggestion,
  parseTokenIdList,
  projectOrderbooksMarketMetadataRow,
  POLYMARKET_ORDERBOOKS_METADATA_DEFAULT_COLUMNS,
} from "@/lib/polymarketLive/orderbooksCompose";

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
  if (cid) return `Orderbook ${cid.slice(0, 10)}…`.slice(0, 80);
  return `Market ${index + 1}`;
}

/**
 * @param {unknown} payload
 * @returns {Record<string, unknown>[]}
 */
function asObjectList(payload) {
  const arr = Array.isArray(payload) ? payload : payload != null ? [payload] : [];
  return arr.filter((item) => item && typeof item === "object");
}

/**
 * Resolve missing token ids (and fill title/condition) via Gamma listMarkets.
 *
 * @param {import("@/lib/polymarketLive/orderbooksCompose").PolymarketOrderbooksMarketRef[]} refs
 * @returns {Promise<import("@/lib/polymarketLive/orderbooksCompose").PolymarketOrderbooksMarketRef[]>}
 */
export async function resolveOrderbooksMarketTokenIds(refs) {
  const list = Array.isArray(refs) ? refs : [];
  const needResolve = list.filter(
    (r) =>
      !(Array.isArray(r.tokenIds) && r.tokenIds.length) &&
      (r.id || r.slug || r.conditionId),
  );
  if (!needResolve.length) return list;

  /** @type {Map<string, import("@/lib/polymarketLive/orderbooksCompose").PolymarketOrderbooksMarketRef>} */
  const resolved = new Map();

  await Promise.all(
    needResolve.map(async (r) => {
      const params = new URLSearchParams({
        query: "listMarkets",
        limit: "5",
        fields:
          "id,slug,question,conditionId,condition_id,groupItemTitle,title,outcomes,clobTokenIds,clob_token_ids,active,closed,volume,liquidity,bestBid,bestAsk,endDate",
      });
      if (r.id) params.set("id", String(r.id));
      else if (r.slug) params.set("slug", String(r.slug));
      else if (r.conditionId) params.set("condition_ids", String(r.conditionId));
      try {
        const res = await fetch(`/api/integrations/polymarket?${params.toString()}`, {
          method: "GET",
          headers: { Accept: "application/json" },
          credentials: "same-origin",
        });
        const data = await res.json().catch(() => []);
        if (!res.ok) return;
        const arr = asObjectList(data);
        const hit = arr[0] || null;
        if (!hit) return;
        const ref = orderbooksMarketRefFromListMarketsRow(hit);
        if (!ref) return;
        const key = `${r.id || ""}:${r.slug || ""}:${r.conditionId || ""}`;
        resolved.set(key, {
          ...ref,
          id: r.id || ref.id,
          slug: r.slug || ref.slug,
          conditionId: r.conditionId || ref.conditionId,
          title: r.title || ref.title,
        });
      } catch {
        /* ignore */
      }
    }),
  );

  return list.map((r) => {
    if (Array.isArray(r.tokenIds) && r.tokenIds.length) return r;
    const key = `${r.id || ""}:${r.slug || ""}:${r.conditionId || ""}`;
    return resolved.get(key) || r;
  });
}

/**
 * @param {import("@/lib/polymarketLive/marketsCompose").PolymarketMarketsComposeState} marketsFilters
 * @returns {Promise<{
 *   refs: import("@/lib/polymarketLive/orderbooksCompose").PolymarketOrderbooksMarketRef[];
 *   marketRows: Record<string, unknown>[];
 * }>}
 */
export async function discoverOrderbooksMarketsFromListFilters(marketsFilters) {
  const values = buildPolymarketMarketsListQueryValues({
    ...marketsFilters,
    mode: "advanced",
  });
  const params = new URLSearchParams({ query: "listMarkets" });
  for (const [k, v] of Object.entries(values)) {
    if (v === undefined || v === null || v === "") continue;
    params.set(k, String(v));
  }
  params.set(
    "fields",
    "id,slug,question,conditionId,condition_id,groupItemTitle,title,outcomes,clobTokenIds,clob_token_ids,active,closed,volume,liquidity,bestBid,bestAsk,endDate",
  );

  const res = await fetch(`/api/integrations/polymarket?${params.toString()}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    credentials: "same-origin",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data?.message === "string" ? data.message : "Failed to list markets");
  }
  const marketRows = asObjectList(data);
  /** @type {import("@/lib/polymarketLive/orderbooksCompose").PolymarketOrderbooksMarketRef[]} */
  const refs = [];
  const seen = new Set();
  for (const row of marketRows) {
    const ref = orderbooksMarketRefFromListMarketsRow(row);
    if (!ref) continue;
    const key = ref.conditionId || `${ref.id}:${ref.slug}` || (ref.tokenIds || []).join(",");
    if (!key || seen.has(key)) continue;
    seen.add(key);
    refs.push(ref);
  }
  return { refs, marketRows };
}

/**
 * @param {string} tokenId
 * @returns {Promise<Record<string, unknown>>}
 */
async function fetchOrderBookGet(tokenId) {
  const params = new URLSearchParams({
    query: "getOrderBook",
    token_id: tokenId,
  });
  const res = await fetch(`/api/integrations/polymarket?${params.toString()}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    credentials: "same-origin",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data?.message === "string" ? data.message : "Order book request failed");
  }
  const list = asObjectList(data);
  return list[0] || /** @type {Record<string, unknown>} */ (data);
}

/**
 * @param {string[]} tokenIds
 * @returns {Promise<Record<string, unknown>[]>}
 */
async function fetchOrderBooksPost(tokenIds) {
  const unique = [...new Set(tokenIds.map((t) => String(t || "").trim()).filter(Boolean))];
  if (!unique.length) return [];
  const params = new URLSearchParams({ query: "getOrderBooks" });
  const res = await fetch(`/api/integrations/polymarket?${params.toString()}`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(unique.map((token_id) => ({ token_id }))),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data?.message === "string" ? data.message : "Order books request failed");
  }
  return asObjectList(data);
}

/**
 * @param {import("@/lib/polymarketLive/orderbooksCompose").PolymarketOrderbooksMarketRef} ref
 * @param {boolean} usePost
 * @returns {Promise<Record<string, unknown>[]>}
 */
async function fetchBooksForMarket(ref, usePost) {
  const tokenIds = parseTokenIdList(ref.tokenIds);
  if (!tokenIds.length) {
    throw new Error("Market is missing CLOB token ids");
  }
  if (!usePost) {
    /** @type {Record<string, unknown>[]} */
    const books = [];
    for (const tokenId of tokenIds) {
      books.push(await fetchOrderBookGet(tokenId));
    }
    return books;
  }
  return fetchOrderBooksPost(tokenIds);
}

/**
 * Fetch orderbooks for compose state and stream batches as each market completes.
 *
 * @param {import("@/lib/polymarketLive/orderbooksCompose").PolymarketOrderbooksComposeState} compose
 * @param {{
 *   selectedColumns?: string[];
 *   marketRefsOverride?: import("@/lib/polymarketLive/orderbooksCompose").PolymarketOrderbooksMarketRef[];
 *   onMarketRows?: (batch: {
 *     marketKey: string;
 *     sheetName: string;
 *     metadataRow: Record<string, unknown>;
 *     rows: Record<string, unknown>[];
 *     index: number;
 *     total: number;
 *   }) => void | Promise<void>;
 * }} [opts]
 */
export async function fetchPolymarketOrderbooksRows(compose, opts = {}) {
  const normalized = normalizePolymarketOrderbooksComposeState(compose);
  const sheetLayout = normalizePolymarketOrderbooksSheetLayout(normalized.sheetLayout);
  const side = normalizePolymarketOrderbooksSide(normalized.side);
  const selected = Array.isArray(opts.selectedColumns) ? opts.selectedColumns : [];

  /** @type {import("@/lib/polymarketLive/orderbooksCompose").PolymarketOrderbooksMarketRef[]} */
  let refs = [];
  /** @type {Map<string, Record<string, unknown>>} */
  const marketRowByKey = new Map();

  if (Array.isArray(opts.marketRefsOverride) && opts.marketRefsOverride.length) {
    refs = opts.marketRefsOverride;
  } else if (normalized.mode === "advanced") {
    const discovered = await discoverOrderbooksMarketsFromListFilters(normalized.marketsFilters);
    refs = discovered.refs;
    for (const row of discovered.marketRows) {
      const ref = orderbooksMarketRefFromListMarketsRow(row);
      if (!ref) continue;
      const key = ref.conditionId || `${ref.id}:${ref.slug}` || (ref.tokenIds || []).join(",");
      if (key) marketRowByKey.set(key, row);
    }
    if (!refs.length) {
      throw new Error("No markets matched your filters.");
    }
  } else {
    refs = normalized.marketRefs;
  }

  refs = await resolveOrderbooksMarketTokenIds(refs);

  const unique = [];
  const seen = new Set();
  for (const r of refs) {
    const key =
      String(r.conditionId || "").trim() ||
      `${r.id || ""}:${r.slug || ""}` ||
      (Array.isArray(r.tokenIds) ? r.tokenIds.join(",") : "");
    if (!key || seen.has(key)) continue;
    const tokenIds = parseTokenIdList(r.tokenIds);
    if (!tokenIds.length) continue;
    seen.add(key);
    unique.push({ ...r, tokenIds });
  }
  if (!unique.length) {
    throw new Error("Select at least one market with CLOB token ids.");
  }

  const usePost = unique.length > 1;
  /** @type {Record<string, unknown>[]} */
  const allRows = [];
  /** @type {Record<string, unknown>[]} */
  const metadataRows = [];
  /** @type {Array<{ marketKey: string; sheetName: string; metadataRow: Record<string, unknown>; rows: Record<string, unknown>[] }>} */
  const byMarket = [];
  /** @type {string[]} */
  const failures = [];

  for (let i = 0; i < unique.length; i++) {
    const ref = unique[i];
    const marketKey =
      String(ref.conditionId || "").trim() ||
      `${ref.id || ""}:${ref.slug || ""}` ||
      (ref.tokenIds || []).join(",");
    const sheetName = sheetNameForMarket(ref, i);
    const sourceRow = marketRowByKey.get(marketKey) || {
      id: ref.id,
      slug: ref.slug,
      conditionId: ref.conditionId,
      question: ref.title,
      outcomes: ref.outcomes,
      clobTokenIds: ref.tokenIds,
    };
    const metadataRow = projectOrderbooksMarketMetadataRow(
      sourceRow,
      selected.length
        ? selected.filter((c) =>
            POLYMARKET_ORDERBOOKS_METADATA_DEFAULT_COLUMNS.includes(c) ||
            ["id", "question", "conditionId", "slug", "outcomes", "clobTokenIds"].includes(c),
          )
        : undefined,
    );

    try {
      const books = await fetchBooksForMarket(ref, usePost);
      /** @type {Record<string, unknown>[]} */
      const rows = [];
      for (const book of books) {
        rows.push(
          ...expandOrderBookSummaryToRows(book, {
            side,
            marketMeta: ref,
            selectedColumns: selected,
          }),
        );
      }
      metadataRows.push(metadataRow);
      allRows.push(...rows);
      byMarket.push({ marketKey, sheetName, metadataRow, rows });
      await opts.onMarketRows?.({
        marketKey,
        sheetName,
        metadataRow,
        rows,
        index: i,
        total: unique.length,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Request failed";
      failures.push(`${sheetName}: ${msg}`);
      metadataRows.push(metadataRow);
      byMarket.push({ marketKey, sheetName, metadataRow, rows: [] });
      await opts.onMarketRows?.({
        marketKey,
        sheetName,
        metadataRow,
        rows: [],
        index: i,
        total: unique.length,
      });
    }
  }

  if (!byMarket.length) {
    throw new Error(failures[0] || "No orderbooks found for the selected markets.");
  }
  if (!allRows.length && failures.length === unique.length) {
    throw new Error(failures[0] || "No orderbooks found for the selected markets.");
  }

  return {
    rows: allRows,
    metadataRows,
    byMarket,
    sheetLayout,
    side,
    marketsDiscovered: unique.length,
    failures,
  };
}

/**
 * Incremental sheet writer for orderbook pulls (never dumps all books into one sheet).
 *
 * @param {Record<string, unknown>} ctx
 * @param {{ sheetLayout?: string }} [opts]
 */
export function createPolymarketOrderbooksWaterfallWriter(ctx, opts = {}) {
  const sheetLayout = normalizePolymarketOrderbooksSheetLayout(opts.sheetLayout);
  const includeMeta = orderbooksLayoutIncludesMetadata(sheetLayout);
  let prepared = false;
  let metadataSheetId = null;
  let firstMarketSheetId = null;
  let writtenMarkets = 0;

  const renameSheet = (sheetId, name) => {
    if (!sheetId || !ctx?.setDataSheets) return;
    ctx.setDataSheets((prev) => {
      const existing = prev?.[sheetId];
      if (!existing) return prev;
      return {
        ...(prev || {}),
        [sheetId]: { ...existing, name: String(name || existing.name || "Sheet").slice(0, 80) },
      };
    });
  };

  const appendRows = (sheetId, rows) => {
    if (!sheetId || !rows.length) return;
    if (ctx?.setSheetData) {
      ctx.setSheetData(sheetId, (prev) => [...(Array.isArray(prev) ? prev : []), ...rows]);
      return;
    }
    ctx?.setDataSheets?.((prev) => {
      const existing = prev?.[sheetId] || { name: "Sheet", data: [] };
      return {
        ...(prev || {}),
        [sheetId]: {
          ...existing,
          data: [...(Array.isArray(existing.data) ? existing.data : []), ...rows],
        },
      };
    });
  };

  const createSheet = (name, rows) => {
    let createdId = null;
    ctx?.setDataSheets?.((prev) => {
      const next = { ...(prev || {}) };
      createdId = allocateNextSheetId(next);
      next[createdId] = {
        name: String(name || `Sheet`).slice(0, 80),
        data: Array.isArray(rows) ? rows : [],
      };
      return next;
    });
    return createdId;
  };

  const prepareSheets = () => {
    if (prepared) return;
    prepared = true;
    const destination = resolveConnectHomeSheetDestination(ctx);

    if (destination.action === "new_sheet" && ctx?.addNewSheetAndActivate) {
      flushSync(() => {
        ctx.addNewSheetAndActivate(
          (newId) => {
            if (includeMeta) metadataSheetId = newId;
            else firstMarketSheetId = newId;
            ctx.setSheetData?.(newId, []);
            if (!includeMeta) applyConnectHomeSheetNameToSheet(ctx, newId);
          },
          { syncActivate: true },
        );
      });
    } else {
      const activeId = ctx?.activeSheetId || null;
      flushSync(() => {
        if (activeId) ctx?.setSheetData?.(activeId, []);
        else ctx?.replaceCurrentSheetData?.([]);
        if (includeMeta) metadataSheetId = activeId;
        else firstMarketSheetId = activeId;
        if (!includeMeta && activeId) applyConnectHomeSheetNameToSheet(ctx, activeId);
      });
    }

    flushSync(() => {
      if (includeMeta && metadataSheetId) renameSheet(metadataSheetId, "Market metadata");
    });

    ctx?.setConnectHomeAnalyzeActive?.(true);
    ctx?.requestConnectAnalyzeScroll?.();
  };

  return {
    /**
     * @param {{
     *   sheetName?: string;
     *   metadataRow?: Record<string, unknown>;
     *   rows?: Record<string, unknown>[];
     * }} batch
     */
    write(batch) {
      const rows = Array.isArray(batch?.rows) ? batch.rows : [];
      const metadataRow =
        batch?.metadataRow && typeof batch.metadataRow === "object" ? batch.metadataRow : null;
      if (!rows.length && !metadataRow) return 0;
      prepareSheets();

      flushSync(() => {
        if (includeMeta && metadataSheetId && metadataRow) {
          appendRows(metadataSheetId, [metadataRow]);
        }

        if (writtenMarkets === 0 && firstMarketSheetId) {
          ctx?.setDataSheets?.((prev) => {
            const existing = prev?.[firstMarketSheetId] || { name: "Sheet", data: [] };
            return {
              ...(prev || {}),
              [firstMarketSheetId]: {
                ...existing,
                name: String(batch.sheetName || existing.name || "Market 1").slice(0, 80),
                data: rows,
              },
            };
          });
        } else if (includeMeta && writtenMarkets === 0 && !firstMarketSheetId) {
          firstMarketSheetId = createSheet(batch.sheetName || "Market 1", rows);
        } else {
          createSheet(batch.sheetName || `Market ${writtenMarkets + 1}`, rows);
        }
      });

      writtenMarkets += 1;
      return rows.length;
    },
  };
}

/**
 * Search-mode Go: resolve selected markets, pull orderbooks, waterfall into sheets.
 *
 * @param {Record<string, unknown>} ctx
 * @param {import("@/lib/polymarketLive/polymarketPublicSearch").PolymarketPublicSearchSuggestion[]} suggestions
 * @param {{
 *   compose: import("@/lib/polymarketLive/orderbooksCompose").PolymarketOrderbooksComposeState;
 *   selectedColumns?: string[];
 * }} opts
 */
export async function applyPolymarketOrderbooksSearchAll(ctx, suggestions, opts) {
  const refs = (suggestions || [])
    .map((s) => orderbooksMarketRefFromSuggestion(s))
    .filter(Boolean);
  if (!refs.length) {
    throw new Error("Select at least one market.");
  }
  const compose = normalizePolymarketOrderbooksComposeState({
    ...(opts.compose || {}),
    mode: "search",
    marketRefs: refs,
  });
  const waterfall = createPolymarketOrderbooksWaterfallWriter(ctx, {
    sheetLayout: compose.sheetLayout,
  });
  const fetched = await fetchPolymarketOrderbooksRows(compose, {
    selectedColumns: opts.selectedColumns,
    marketRefsOverride: refs,
    onMarketRows: (batch) => {
      waterfall.write(batch);
      const completed = batch.index + 1;
      ctx?.setConnectDataLakePullState?.((prev) => ({
        ...prev,
        loading: true,
        error: null,
        label: `Pulled orderbooks for ${completed} of ${batch.total} markets…`,
        progress: Math.max(
          Number(prev?.progress) || 0,
          Math.round(10 + (completed / Math.max(batch.total, 1)) * 85),
        ),
      }));
    },
  });
  if (!fetched.rows.length && !fetched.metadataRows.length) {
    throw new Error("No orderbooks found for the selected markets.");
  }
  return fetched.rows.length;
}
