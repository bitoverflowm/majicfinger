import { flushSync } from "react-dom";

import {
  applyConnectHomePullData,
  prepareConnectHomePullSheet,
} from "@/lib/connectHomePullDestination";
import {
  normalizePolymarketOpenInterestComposeState,
  openInterestMarketRefFromSuggestion,
} from "@/lib/polymarketLive/openInterestCompose";
import { resolveHoldersMarketConditionIds } from "@/lib/polymarketLive/polymarketHoldersByMarketsPull";

/**
 * @param {unknown} payload
 * @param {{
 *   selectedColumns?: string[];
 *   marketMetaByConditionId?: Record<string, { id?: string; slug?: string; title?: string; conditionId?: string }>;
 * }} [opts]
 * @returns {Record<string, unknown>[]}
 */
export function flattenPolymarketOpenInterestPayloadToRows(payload, opts = {}) {
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
    const rowIn = /** @type {Record<string, unknown>} */ (item);
    const cid = String(rowIn.market || rowIn.conditionId || "").trim();
    const meta = cid ? metaByCid[cid] : null;
    const row = {
      market: cid || rowIn.market || "",
      value: rowIn.value ?? "",
      ...(meta
        ? {
            market_id: meta.id || "",
            market_slug: meta.slug || "",
            market_title: meta.title || "",
          }
        : {
            market_id: rowIn.market_id || "",
            market_slug: rowIn.market_slug || "",
            market_title: rowIn.market_title || "",
          }),
    };
    if (selectedSet) {
      /** @type {Record<string, unknown>} */
      const out = {};
      for (const k of Object.keys(row)) {
        if (selectedSet.has(k)) out[k] = row[k];
      }
      rows.push(out);
    } else {
      rows.push(row);
    }
  }
  return rows;
}

/**
 * @param {import("@/lib/polymarketLive/openInterestCompose").PolymarketOpenInterestComposeState} compose
 * @param {{ selectedColumns?: string[]; allowEmptyMarkets?: boolean }} [opts]
 * @returns {Promise<{ rows: Record<string, unknown>[]; market: string }>}
 */
export async function fetchPolymarketOpenInterestRows(compose, opts = {}) {
  const normalized = normalizePolymarketOpenInterestComposeState(compose);
  const resolvedRefs = await resolveHoldersMarketConditionIds(normalized.marketRefs);
  const conditionIds = [
    ...new Set(resolvedRefs.map((r) => String(r.conditionId || "").trim()).filter(Boolean)),
  ];

  if (!conditionIds.length && !opts.allowEmptyMarkets) {
    throw new Error("Select at least one market with a condition id (0x…).");
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

  const params = new URLSearchParams({ query: "getOpenInterest" });
  if (conditionIds.length) params.set("market", conditionIds.join(","));
  const selected = Array.isArray(opts.selectedColumns) ? opts.selectedColumns : [];
  if (selected.length) {
    const fields = new Set(selected);
    fields.add("market");
    fields.add("value");
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

  const rows = flattenPolymarketOpenInterestPayloadToRows(data, {
    selectedColumns: selected,
    marketMetaByConditionId,
  });
  return { rows, market: conditionIds.join(",") };
}

/**
 * @param {Record<string, unknown>} ctx
 * @param {Record<string, unknown>[]} rows
 */
export function applyPolymarketOpenInterestRows(ctx, rows) {
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
 * @param {Record<string, unknown>} ctx
 * @param {import("@/lib/polymarketLive/polymarketPublicSearch").PolymarketPublicSearchSuggestion[]} suggestions
 * @param {{
 *   compose: import("@/lib/polymarketLive/openInterestCompose").PolymarketOpenInterestComposeState;
 *   selectedColumns?: string[];
 * }} opts
 */
export async function applyPolymarketOpenInterestSearchAll(ctx, suggestions, opts) {
  const refs = (suggestions || [])
    .map((s) => openInterestMarketRefFromSuggestion(s))
    .filter(Boolean);
  if (!refs.length) {
    throw new Error("Select at least one market.");
  }
  const compose = normalizePolymarketOpenInterestComposeState({
    ...(opts.compose || {}),
    marketRefs: refs,
  });
  const { rows } = await fetchPolymarketOpenInterestRows(compose, {
    selectedColumns: opts.selectedColumns,
  });
  if (!rows.length) {
    throw new Error("No open interest found for the selected markets.");
  }
  return applyPolymarketOpenInterestRows(ctx, rows);
}
