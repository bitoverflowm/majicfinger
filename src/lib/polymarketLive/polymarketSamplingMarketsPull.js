import { flushSync } from "react-dom";

import {
  applyConnectHomeSheetNameToSheet,
  resolveConnectHomeSheetDestination,
} from "@/lib/connectHomePullDestination";
import {
  flattenSamplingMarketsRows,
  normalizePolymarketSamplingMarketsComposeState,
} from "@/lib/polymarketLive/samplingMarketsCompose";

/**
 * @param {unknown} payload
 * @returns {{ data: unknown[]; nextCursor: string; count: number }}
 */
export function parseSamplingMarketsPage(payload) {
  const wrapper = Array.isArray(payload) ? payload[0] : payload;
  const page = wrapper && typeof wrapper === "object" ? wrapper : {};
  return {
    data: Array.isArray(page.data) ? page.data : [],
    nextCursor: String(page.next_cursor || "").trim(),
    count: Number(page.count) || 0,
  };
}

/**
 * @param {import("@/lib/polymarketLive/samplingMarketsCompose").PolymarketSamplingMarketsComposeState} compose
 * @param {{
 *   selectedColumns?: string[];
 *   onPageRows?: (batch: {
 *     rows: Record<string, unknown>[];
 *     pulled: number;
 *     limit: number;
 *     page: number;
 *     nextCursor: string;
 *   }) => void | Promise<void>;
 * }} [opts]
 */
export async function fetchPolymarketSamplingMarketsRows(compose, opts = {}) {
  const normalized = normalizePolymarketSamplingMarketsComposeState(compose);
  const selected = Array.isArray(opts.selectedColumns) ? opts.selectedColumns : [];
  /** @type {Record<string, unknown>[]} */
  const rows = [];
  const seenCursors = new Set();
  let nextCursor = "";
  let page = 0;

  while (rows.length < normalized.limit) {
    const params = new URLSearchParams({ query: "getSamplingMarkets", skipFlatten: "1" });
    if (nextCursor) params.set("next_cursor", nextCursor);
    const res = await fetch(`/api/integrations/polymarket?${params.toString()}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "same-origin",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(typeof data?.message === "string" ? data.message : "Request failed");
    }

    const parsed = parseSamplingMarketsPage(data);
    const remaining = normalized.limit - rows.length;
    const pageRows = flattenSamplingMarketsRows(parsed.data.slice(0, remaining), selected);
    rows.push(...pageRows);
    page += 1;
    await opts.onPageRows?.({
      rows: pageRows,
      pulled: rows.length,
      limit: normalized.limit,
      page,
      nextCursor: parsed.nextCursor,
    });

    if (
      !parsed.nextCursor ||
      parsed.nextCursor === "LTE=" ||
      parsed.data.length === 0 ||
      rows.length >= normalized.limit
    ) {
      break;
    }
    if (seenCursors.has(parsed.nextCursor)) break;
    seenCursors.add(parsed.nextCursor);
    nextCursor = parsed.nextCursor;
  }

  return { rows, pages: page, limit: normalized.limit };
}

/**
 * One-sheet incremental writer for cursor-paginated sampling markets.
 *
 * @param {Record<string, unknown>} ctx
 */
export function createPolymarketSamplingMarketsWaterfallWriter(ctx) {
  let prepared = false;
  let targetSheetId = null;

  const prepare = () => {
    if (prepared) return;
    prepared = true;
    const destination = resolveConnectHomeSheetDestination(ctx);
    if (destination.action === "new_sheet" && ctx?.addNewSheetAndActivate) {
      flushSync(() => {
        ctx.addNewSheetAndActivate(
          (newId) => {
            targetSheetId = newId;
            ctx.setSheetData?.(newId, []);
            applyConnectHomeSheetNameToSheet(ctx, newId);
          },
          { syncActivate: true },
        );
      });
    } else {
      targetSheetId = ctx?.activeSheetId || null;
      flushSync(() => {
        if (targetSheetId) {
          ctx?.setSheetData?.(targetSheetId, []);
          applyConnectHomeSheetNameToSheet(ctx, targetSheetId);
        } else {
          ctx?.replaceCurrentSheetData?.([]);
        }
      });
    }
    ctx?.setConnectHomeAnalyzeActive?.(true);
    ctx?.requestConnectAnalyzeScroll?.();
  };

  return {
    /** @param {Record<string, unknown>[]} rows */
    write(rows) {
      const batch = Array.isArray(rows) ? rows : [];
      if (!batch.length) return 0;
      prepare();
      flushSync(() => {
        if (targetSheetId && ctx?.setSheetData) {
          ctx.setSheetData(targetSheetId, (prev) => [
            ...(Array.isArray(prev) ? prev : []),
            ...batch,
          ]);
        } else {
          ctx?.setConnectedData?.((prev) => [
            ...(Array.isArray(prev) ? prev : []),
            ...batch,
          ]);
        }
      });
      return batch.length;
    },
  };
}
