import { flushSync } from "react-dom";

import {
  applyConnectHomeSheetNameToSheet,
  resolveConnectHomeSheetDestination,
} from "@/lib/connectHomePullDestination";
import {
  attachPolymarketLiveRequestMetadata,
} from "@/lib/polymarketLive/polymarketLiveRequestHistory";
import {
  discoverOrderbooksMarketsFromListFilters,
  resolveOrderbooksMarketTokenIds,
} from "@/lib/polymarketLive/polymarketOrderbooksPull";
import {
  flattenPricesHistoryRowsForMarket,
  minimumPolymarketPricesHistoryFidelity,
  normalizePolymarketPricesHistoryComposeState,
  normalizePolymarketPricesHistorySheetLayout,
  pricesHistoryLayoutIncludesMetadata,
  pricesHistoryRefFromListMarketsRow,
  pricesHistoryRefFromSuggestion,
  projectPricesHistoryMarketMetadataRow,
  selectPricesHistoryOutcomeTokens,
  POLYMARKET_PRICES_HISTORY_ENDPOINT_ID,
  POLYMARKET_PRICES_HISTORY_MAX_MARKETS_PER_REQUEST,
  POLYMARKET_PRICES_HISTORY_METADATA_DEFAULT_COLUMNS,
} from "@/lib/polymarketLive/pricesHistoryCompose";
import { parseTokenIdList } from "@/lib/polymarketLive/orderbooksCompose";

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
  if (cid) return `History ${cid.slice(0, 10)}…`.slice(0, 80);
  return `Market ${index + 1}`;
}

/**
 * @param {unknown} payload
 * @returns {Record<string, Array<{ t?: number; p?: number }>>}
 */
function asHistoryMap(payload) {
  if (!payload || typeof payload !== "object") return {};
  const root = /** @type {Record<string, unknown>} */ (payload);
  const history = root.history && typeof root.history === "object" ? root.history : root;
  /** @type {Record<string, Array<{ t?: number; p?: number }>>} */
  const out = {};
  for (const [tokenId, points] of Object.entries(
    /** @type {Record<string, unknown>} */ (history),
  )) {
    const key = String(tokenId || "").trim();
    if (!key || !Array.isArray(points)) continue;
    out[key] = points.filter((p) => p && typeof p === "object");
  }
  return out;
}

/**
 * @param {string[]} tokenIds
 * @param {{
 *   startTs?: string;
 *   endTs?: string;
 *   interval?: string;
 *   fidelity?: number;
 *   windowMode?: "interval" | "date_range";
 * }} params
 */
async function fetchBatchPricesHistory(tokenIds, params) {
  const unique = [...new Set(tokenIds.map((t) => String(t || "").trim()).filter(Boolean))];
  if (!unique.length) return {};
  if (unique.length > POLYMARKET_PRICES_HISTORY_MAX_MARKETS_PER_REQUEST) {
    throw new Error(
      `A maximum of ${POLYMARKET_PRICES_HISTORY_MAX_MARKETS_PER_REQUEST} token IDs may be requested per batch`,
    );
  }

  /** @type {Record<string, unknown>} */
  const body = { markets: unique };
  if (params.windowMode === "date_range") {
    if (params.startTs) body.start_ts = Number(params.startTs);
    if (params.endTs) body.end_ts = Number(params.endTs);
  } else if (params.interval) {
    body.interval = params.interval;
  }
  if (params.fidelity != null && Number.isFinite(Number(params.fidelity))) {
    body.fidelity = Number(params.fidelity);
  }

  const qs = new URLSearchParams({ query: POLYMARKET_PRICES_HISTORY_ENDPOINT_ID });
  const res = await fetch(`/api/integrations/polymarket?${qs.toString()}`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data?.message === "string"
        ? data.message
        : typeof data?.error === "string"
          ? data.error
          : "Price history request failed",
    );
  }
  return asHistoryMap(data);
}

/**
 * @param {import("@/lib/polymarketLive/pricesHistoryCompose").PolymarketPricesHistoryComposeState} compose
 * @param {{
 *   selectedColumns?: string[];
 *   marketRefsOverride?: import("@/lib/polymarketLive/pricesHistoryCompose").PolymarketPricesHistoryMarketRef[];
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
export async function fetchPolymarketPricesHistoryRows(compose, opts = {}) {
  const normalized = normalizePolymarketPricesHistoryComposeState(compose);
  if (!normalized.outcomeSelection) {
    throw new Error("Choose YES, NO, or both outcomes before pulling price history.");
  }
  const usesDateRange = normalized.windowMode === "date_range";
  if (usesDateRange && (!normalized.startTs || !normalized.endTs)) {
    throw new Error("Choose a complete date range before pulling price history.");
  }
  if (usesDateRange && Number(normalized.startTs) >= Number(normalized.endTs)) {
    throw new Error("Price history end date must be after the start date.");
  }
  const minimumFidelity = usesDateRange
    ? 1
    : minimumPolymarketPricesHistoryFidelity(normalized.interval);
  if (normalized.fidelity < minimumFidelity) {
    throw new Error(
      `${normalized.interval} interval requires fidelity of at least ${minimumFidelity} minutes.`,
    );
  }

  const sheetLayout = normalizePolymarketPricesHistorySheetLayout(normalized.sheetLayout);
  const selected = Array.isArray(opts.selectedColumns) ? opts.selectedColumns : [];

  /** @type {import("@/lib/polymarketLive/pricesHistoryCompose").PolymarketPricesHistoryMarketRef[]} */
  let refs = [];
  /** @type {Map<string, Record<string, unknown>>} */
  const marketRowByKey = new Map();

  if (Array.isArray(opts.marketRefsOverride) && opts.marketRefsOverride.length) {
    refs = opts.marketRefsOverride;
  } else if (normalized.mode === "advanced") {
    const discovered = await discoverOrderbooksMarketsFromListFilters(normalized.marketsFilters);
    refs = discovered.refs;
    for (const row of discovered.marketRows) {
      const ref = pricesHistoryRefFromListMarketsRow(row);
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

  /** @type {import("@/lib/polymarketLive/pricesHistoryCompose").PolymarketPricesHistoryMarketRef[]} */
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

  const allPairs = selectPricesHistoryOutcomeTokens(unique, normalized.outcomeSelection);
  if (!allPairs.length) {
    throw new Error(
      `No ${normalized.outcomeSelection.toUpperCase()} outcome tokens were found for the selected markets.`,
    );
  }

  /** @type {Map<string, { tokenId: string; outcome: string }[]>} */
  const pairsByMarketKey = new Map();
  for (const pair of allPairs) {
    const ref = pair.ref;
    const marketKey =
      String(ref.conditionId || "").trim() ||
      `${ref.id || ""}:${ref.slug || ""}` ||
      (ref.tokenIds || []).join(",");
    if (!pairsByMarketKey.has(marketKey)) pairsByMarketKey.set(marketKey, []);
    pairsByMarketKey.get(marketKey)?.push({ tokenId: pair.tokenId, outcome: pair.outcome });
  }

  const tokenIds = [...new Set(allPairs.map((p) => p.tokenId))];
  /** @type {Record<string, Array<{ t?: number; p?: number }>>} */
  let historyByToken = {};
  const batchFailures = [];
  for (let offset = 0; offset < tokenIds.length; offset += POLYMARKET_PRICES_HISTORY_MAX_MARKETS_PER_REQUEST) {
    const batch = tokenIds.slice(
      offset,
      offset + POLYMARKET_PRICES_HISTORY_MAX_MARKETS_PER_REQUEST,
    );
    try {
      const chunk = await fetchBatchPricesHistory(batch, {
        startTs: normalized.startTs,
        endTs: normalized.endTs,
        interval: normalized.interval,
        fidelity: normalized.fidelity,
        windowMode: normalized.windowMode,
      });
      historyByToken = { ...historyByToken, ...chunk };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Request failed";
      batchFailures.push(msg);
      // Continue so remaining batches / markets can still produce sheets.
    }
  }
  if (!Object.keys(historyByToken).length && batchFailures.length) {
    throw new Error(batchFailures[0]);
  }

  /** @type {Record<string, unknown>[]} */
  const allRows = [];
  /** @type {Record<string, unknown>[]} */
  const metadataRows = [];
  /** @type {Array<{ marketKey: string; sheetName: string; metadataRow: Record<string, unknown>; rows: Record<string, unknown>[] }>} */
  const byMarket = [];

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
    const metadataRow = projectPricesHistoryMarketMetadataRow(
      sourceRow,
      selected.length
        ? selected.filter(
            (c) =>
              POLYMARKET_PRICES_HISTORY_METADATA_DEFAULT_COLUMNS.includes(c) ||
              ["id", "question", "conditionId", "slug", "outcomes", "clobTokenIds"].includes(c),
          )
        : undefined,
    );
    const pairs = pairsByMarketKey.get(marketKey) || [];
    const rows = flattenPricesHistoryRowsForMarket(historyByToken, ref, pairs, selected);
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
  }

  if (!byMarket.length) {
    throw new Error(batchFailures[0] || "No price history found for the selected markets.");
  }

  return {
    rows: allRows,
    metadataRows,
    byMarket,
    sheetLayout,
    marketsDiscovered: unique.length,
    tokenIds,
    refs: unique,
    failures: batchFailures,
    compose: normalized,
  };
}

/**
 * @param {Record<string, unknown>} ctx
 * @param {{
 *   sheetLayout?: string;
 *   requestMeta?: Record<string, unknown>;
 * }} [opts]
 */
export function createPolymarketPricesHistoryWaterfallWriter(ctx, opts = {}) {
  const sheetLayout = normalizePolymarketPricesHistorySheetLayout(opts.sheetLayout);
  const includeMeta = pricesHistoryLayoutIncludesMetadata(sheetLayout);
  const requestMeta =
    opts.requestMeta && typeof opts.requestMeta === "object" ? opts.requestMeta : null;
  let prepared = false;
  let metadataSheetId = null;
  let firstMarketSheetId = null;
  let writtenMarkets = 0;
  /** @type {string[]} */
  const createdSheetIds = [];

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

  const attachMeta = (sheetId, loadedRowCount) => {
    if (!requestMeta || !sheetId) return;
    attachPolymarketLiveRequestMetadata(ctx, {
      ...requestMeta,
      sheetId,
      loadedRowCount,
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
    if (createdId) createdSheetIds.push(createdId);
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
            if (newId) createdSheetIds.push(newId);
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
        if (activeId) createdSheetIds.push(activeId);
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
      // Empty history still creates a market sheet when we have metadata.
      if (!rows.length && !metadataRow) return 0;
      prepareSheets();

      let marketSheetId = null;
      flushSync(() => {
        if (includeMeta && metadataSheetId && metadataRow) {
          appendRows(metadataSheetId, [metadataRow]);
        }

        if (writtenMarkets === 0 && firstMarketSheetId) {
          marketSheetId = firstMarketSheetId;
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
          marketSheetId = createSheet(batch.sheetName || "Market 1", rows);
          firstMarketSheetId = marketSheetId;
        } else {
          marketSheetId = createSheet(batch.sheetName || `Market ${writtenMarkets + 1}`, rows);
        }
      });

      if (includeMeta && metadataSheetId && writtenMarkets === 0) {
        attachMeta(metadataSheetId, writtenMarkets === 0 ? 1 : undefined);
      }
      attachMeta(marketSheetId, rows.length);
      writtenMarkets += 1;
      return rows.length;
    },
    getCreatedSheetIds: () => [...createdSheetIds],
  };
}

/**
 * @param {Record<string, unknown>} ctx
 * @param {import("@/lib/polymarketLive/polymarketPublicSearch").PolymarketPublicSearchSuggestion[]} suggestions
 * @param {{
 *   compose: import("@/lib/polymarketLive/pricesHistoryCompose").PolymarketPricesHistoryComposeState;
 *   selectedColumns?: string[];
 * }} opts
 */
export async function applyPolymarketPricesHistorySearchAll(ctx, suggestions, opts) {
  const pullStartMs =
    typeof performance !== "undefined" && performance?.now ? performance.now() : Date.now();
  const refs = (suggestions || []).map(pricesHistoryRefFromSuggestion).filter(Boolean);
  if (!refs.length) throw new Error("Select at least one market.");
  const compose = normalizePolymarketPricesHistoryComposeState({
    ...(opts.compose || {}),
    mode: "search",
    marketRefs: refs,
  });

  const requestMeta = {
    endpointId: POLYMARKET_PRICES_HISTORY_ENDPOINT_ID,
    mode: "search",
    marketRefs: refs,
    selectedColumns: opts.selectedColumns,
    outcomeSelection: compose.outcomeSelection,
    startTs: compose.windowMode === "date_range" ? compose.startTs : "",
    endTs: compose.windowMode === "date_range" ? compose.endTs : "",
    interval: compose.windowMode === "interval" ? compose.interval : "",
    fidelity: compose.fidelity,
  };

  const waterfall = createPolymarketPricesHistoryWaterfallWriter(ctx, {
    sheetLayout: compose.sheetLayout,
    requestMeta,
  });

  const fetched = await fetchPolymarketPricesHistoryRows(compose, {
    selectedColumns: opts.selectedColumns,
    marketRefsOverride: refs,
    onMarketRows: (batch) => {
      waterfall.write(batch);
      const completed = batch.index + 1;
      ctx?.setConnectDataLakePullState?.((prev) => ({
        ...prev,
        loading: true,
        error: null,
        label: `Pulled price history for ${completed} of ${batch.total} markets…`,
        progress: Math.max(
          Number(prev?.progress) || 0,
          Math.round(10 + (completed / Math.max(batch.total, 1)) * 85),
        ),
      }));
    },
  });

  const elapsedMs =
    (typeof performance !== "undefined" && performance?.now ? performance.now() : Date.now()) -
    pullStartMs;

  // Refresh request cards with final token ids / elapsed on every sheet created.
  for (const sheetId of waterfall.getCreatedSheetIds()) {
    attachPolymarketLiveRequestMetadata(ctx, {
      ...requestMeta,
      sheetId,
      tokenIds: fetched.tokenIds,
      marketRefs: fetched.refs || refs,
      elapsedMs,
      loadedRowCount: undefined,
    });
  }

  if (!fetched.byMarket.length) {
    throw new Error("No price history found for the selected markets.");
  }
  return fetched.rows.length;
}
