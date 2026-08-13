import { flushSync } from "react-dom";

import {
  applyConnectHomePullData,
  prepareConnectHomePullSheet,
} from "@/lib/connectHomePullDestination";
import {
  marketRefFromPublicSearchSuggestion,
  normalizePolymarketHoldersByMarketsComposeState,
} from "@/lib/polymarketLive/holdersByMarketsCompose";

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
    if (meta.proxyWallet != null || meta.amount != null || (meta.token != null && !Array.isArray(meta.holders))) {
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
        const data = await res.json().catch(() => ([]));
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
 * Fetch holders for compose state and return flattened rows.
 *
 * @param {import("@/lib/polymarketLive/holdersByMarketsCompose").PolymarketHoldersByMarketsComposeState} compose
 * @param {{ selectedColumns?: string[] }} [opts]
 * @returns {Promise<{ rows: Record<string, unknown>[]; market: string }>}
 */
export async function fetchPolymarketHoldersByMarketsRows(compose, opts = {}) {
  const normalized = normalizePolymarketHoldersByMarketsComposeState(compose);
  const resolvedRefs = await resolveHoldersMarketConditionIds(normalized.marketRefs);
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

  // Fetch per condition id so we can attach market meta onto each holder row.
  for (const cid of conditionIds) {
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
    const rows = flattenPolymarketHoldersPayloadToRows(data, {
      selectedColumns: [],
      marketMetaByConditionId: { [cid]: meta },
    }).map((row) => ({
      ...row,
      conditionId: meta.conditionId || cid,
      market_id: meta.id || row.market_id || "",
      market_slug: meta.slug || row.market_slug || "",
      market_title: meta.title || row.market_title || "",
    }));
    allRows.push(...rows);
  }

  const filtered = selected.length
    ? allRows.map((row) => {
        /** @type {Record<string, unknown>} */
        const out = {};
        for (const k of selected) {
          if (k in row) out[k] = row[k];
        }
        return out;
      })
    : allRows;

  return { rows: filtered, market: conditionIds.join(",") };
}

/**
 * @param {Record<string, unknown>} ctx
 * @param {Record<string, unknown>[]} rows
 */
export function applyPolymarketHoldersByMarketsRows(ctx, rows) {
  if (!rows?.length) return 0;
  prepareConnectHomePullSheet(ctx);
  flushSync(() => {
    applyConnectHomePullData(ctx, rows);
    ctx.setConnectHomeAnalyzeActive?.(true);
  });
  ctx.requestConnectAnalyzeScroll?.();
  return rows.length;
}

/**
 * Search-mode Go: build market refs from suggestions, fetch holders, apply to sheet.
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
    marketRefs: refs,
  });
  const { rows } = await fetchPolymarketHoldersByMarketsRows(compose, {
    selectedColumns: opts.selectedColumns,
  });
  if (!rows.length) {
    throw new Error("No holders found for the selected markets.");
  }
  return applyPolymarketHoldersByMarketsRows(ctx, rows);
}
