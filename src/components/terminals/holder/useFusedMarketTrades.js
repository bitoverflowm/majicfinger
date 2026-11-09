"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { tradeSheetRow } from "@/components/dashboardComposer/polymarketLiveBuild";
import {
  freshTradesEnd,
  planTradeSources,
  polymarketGet,
  pullPolymarketTradeHistory,
} from "@/components/dashboardComposer/recipes/polymarketTradeHistorySource";
import { openPolymarketLastTradeSocket } from "@/lib/polymarketLive/openPolymarketMarketSocket";

const CATCH_UP_PAGE = 500;
const CATCH_UP_PAGES = 40;
/** Polymarket's REST feed lags the socket by a few seconds. A print not on REST after this is dropped for REST's copy. */
const PENDING_GRACE_MS = 30_000;
const PENDING_MATCH_SEC = 20;
const SOCKET_SETTLE_MS = 2500;
const SAFETY_POLL_MS = 20_000;
const PENDING_CAP = 2000;

const IDLE = { phase: "idle", progress: "", error: "", truncated: false, label: "", socket: "connecting", historyCount: 0 };

function lower(value) {
  return String(value || "").toLowerCase();
}

/** Same identity the trade-history recipe dedupes on, with a fallback for rows that have no hash. */
export function tradeKey(row) {
  const hash = lower(row.transaction_hash);
  if (hash) return `${hash}|${lower(row.proxy_wallet)}|${row.token_id}|${row.side}`;
  return `${row.timestamp}|${row.token_id}|${row.side}|${row.price}|${row.size}|${lower(row.proxy_wallet)}`;
}

const byNewest = (a, b) => Number(b.timestamp) - Number(a.timestamp);

function near(a, b, tolerance) {
  return Math.abs(Number(a) - Number(b)) <= tolerance;
}

/** A REST row that is the same trade as a socket print. REST prices come back as 0.5099998 for a 0.51 print. */
function confirms(row, print) {
  if (print.transaction_hash && row.transaction_hash) {
    return lower(print.transaction_hash) === lower(row.transaction_hash) && row.token_id === print.token_id;
  }
  return (
    row.token_id === print.token_id &&
    near(row.timestamp, print.timestamp, PENDING_MATCH_SEC) &&
    near(row.price, print.price, 0.005) &&
    (!Number(print.size) || near(row.size, print.size, Math.max(1e-4, Number(print.size) * 0.02)))
  );
}

/**
 * One market's trades from its first to its latest, kept live.
 *
 * History is the trade-history recipe's pull (Polymarket Live for 2026 on, Polymarket
 * Historical before). The websocket opens first and buffers prints while history loads.
 * Once history lands, REST pages back from now until it reaches trades already held, which
 * closes the gap the history pull left. Socket prints show at once and are swapped for
 * REST's copy (with wallet and hash) when it arrives.
 *
 * While history loads, `streamRows` holds the pages read so far (plus socket prints), so the chart
 * and trade list can fill in; `rows` stays on the prints alone until the whole history is in.
 *
 * @param {object | null} meta from `resolvePolymarketMarket`
 * @returns {{ rows: object[], streamRows: object[], status: typeof IDLE }} rows newest first
 */
export function useFusedMarketTrades(meta) {
  const [rows, setRows] = useState([]);
  const [historyPages, setHistoryPages] = useState([]);
  const [status, setStatus] = useState(IDLE);
  const metaRef = useRef(meta);
  metaRef.current = meta;
  const conditionId = meta?.conditionId || "";
  const tokensKey = (meta?.tokenIds || []).join(",");

  useEffect(() => {
    const market = metaRef.current;
    if (!conditionId || !tokensKey || !market) return undefined;
    const abort = new AbortController();
    const { signal } = abort;
    const ref = { entityId: market.marketId, title: market.title, slug: market.slug, conditionId };
    const outcomeIndex = new Map(market.tokenIds.map((token, index) => [String(token), index]));

    let confirmed = [];
    const known = new Set();
    let pending = [];
    let newestSec = 0;
    let historyDone = false;
    let rowsTimer = 0;
    let lastRowsAt = 0;
    let settleTimer = 0;
    let pollTimer = 0;
    let catching = false;
    let catchAgain = false;

    setRows([]);
    setHistoryPages([]);
    setStatus({ ...IDLE, phase: "history", progress: "Reading the trade history" });

    const flushRows = () => {
      rowsTimer = 0;
      lastRowsAt = Date.now();
      if (!signal.aborted) setRows(pending.length ? [...pending, ...confirmed] : confirmed);
    };
    // Charting the whole history on every print would stall a big market, so updates are spaced by size.
    const publishRows = (now = false) => {
      const gap = confirmed.length > 100_000 ? 4000 : confirmed.length > 20_000 ? 2000 : 500;
      const wait = lastRowsAt + gap - Date.now();
      if (now || wait <= 0) {
        window.clearTimeout(rowsTimer);
        flushRows();
      } else if (!rowsTimer) {
        rowsTimer = window.setTimeout(flushRows, wait);
      }
    };

    const settlePending = () => {
      if (!pending.length) return;
      const cutoff = Date.now() - PENDING_GRACE_MS;
      const head = confirmed.slice(0, 3000);
      pending = pending.filter((print) => print._arrived > cutoff && !head.some((row) => confirms(row, print)));
    };

    const catchUp = async () => {
      if (catching) {
        catchAgain = true;
        return;
      }
      catching = true;
      try {
        const fresh = [];
        let cursor = "";
        const end = freshTradesEnd();
        for (let page = 0; page < CATCH_UP_PAGES; page += 1) {
          const body = await polymarketGet(
            "getTradesByMarket",
            { condition: conditionId, limit: String(CATCH_UP_PAGE), end, ...(cursor ? { cursor } : {}) },
            signal,
            { retries: 2 },
          );
          const root = Array.isArray(body) ? body[0] : body;
          const list = Array.isArray(root?.data) ? root.data.filter((item) => item && typeof item === "object") : [];
          let overlap = false;
          for (const raw of list) {
            const row = tradeSheetRow(raw, ref);
            const key = tradeKey(row);
            if (known.has(key) || (newestSec && Number(row.timestamp) < newestSec - 300)) {
              overlap = true;
              continue;
            }
            known.add(key);
            fresh.push(row);
          }
          cursor = String(root?.pagination?.next_cursor || "").trim();
          if (overlap || !cursor || !list.length) break;
        }
        if (fresh.length) {
          const head = fresh.concat(confirmed.slice(0, 500)).sort(byNewest);
          confirmed = head.concat(confirmed.slice(500));
          newestSec = Math.max(newestSec, Number(confirmed[0]?.timestamp) || 0);
        }
        settlePending();
        publishRows(fresh.length > 0);
      } catch (err) {
        if (err?.name === "AbortError") return;
        setStatus((prev) => ({ ...prev, error: err?.message || "Couldn't reach Polymarket for the newest trades." }));
      } finally {
        catching = false;
        if (catchAgain && !signal.aborted) {
          catchAgain = false;
          scheduleCatchUp(500);
        }
      }
    };

    // A busy market prints every second, so a pending catch-up is kept rather than pushed back.
    const scheduleCatchUp = (delay) => {
      if (!historyDone || signal.aborted || settleTimer) return;
      settleTimer = window.setTimeout(() => {
        settleTimer = 0;
        void catchUp();
      }, delay);
    };

    const closeSocket = openPolymarketLastTradeSocket({
      assetIds: market.tokenIds,
      onStatus: (socket) => {
        if (!signal.aborted) setStatus((prev) => ({ ...prev, socket }));
      },
      onTrade: (print) => {
        if (signal.aborted) return;
        const index = outcomeIndex.get(String(print.asset_id));
        const ms = Number(print.timestamp);
        const row = tradeSheetRow(
          {
            title: market.title,
            slug: market.slug,
            event_slug: market.eventSlug,
            token_id: print.asset_id,
            outcome: index == null ? "" : market.outcomes[index] || "",
            outcome_index: index ?? "",
            side: print.side,
            price: print.price,
            size: print.size,
            timestamp: Math.floor((Number.isFinite(ms) ? ms : Date.now()) / 1000),
            transaction_hash: print.transaction_hash,
          },
          ref,
        );
        row._live = true;
        row._arrived = Date.now();
        pending = [row, ...pending].slice(0, PENDING_CAP);
        publishRows();
        scheduleCatchUp(SOCKET_SETTLE_MS);
      },
    });

    // One synchronous step, so no frame shows the streamed pages gone before the full history is in.
    const finishHistory = (patch) => {
      if (signal.aborted || historyDone) return;
      historyDone = true;
      setHistoryPages([]);
      setStatus((prev) => ({ ...prev, phase: "live", progress: "", ...patch }));
      settlePending();
      publishRows(true);
      void catchUp();
      pollTimer = window.setInterval(() => void catchUp(), SAFETY_POLL_MS);
    };

    const plan = planTradeSources(market);
    // Live + Historical hands back Live-shaped rows for every market, so prints and history share columns.
    const fusedPlan = plan.kind === "historical" ? { ...plan, kind: "live+historical" } : plan;
    pullPolymarketTradeHistory(market, fusedPlan, {
      signal,
      onProgress: (progress) => {
        if (!signal.aborted) setStatus((prev) => ({ ...prev, progress }));
      },
      onRows: (partial) => {
        if (!signal.aborted && !historyDone) setHistoryPages(partial.rows);
      },
    })
      .then((pulled) => {
        if (signal.aborted) return;
        const unique = [];
        for (const row of pulled.rows) {
          const key = tradeKey(row);
          if (known.has(key)) continue;
          known.add(key);
          unique.push(row);
        }
        confirmed = unique.sort(byNewest);
        newestSec = Number(confirmed[0]?.timestamp) || 0;
        finishHistory({ truncated: !!pulled.truncated, label: pulled.label || "", historyCount: confirmed.length });
      })
      .catch((err) => {
        if (signal.aborted || err?.name === "AbortError") return;
        finishHistory({ error: `The full history didn't load (${err?.message || "pull failed"}). New trades still stream in.` });
      });

    return () => {
      abort.abort();
      closeSocket();
      window.clearTimeout(rowsTimer);
      window.clearTimeout(settleTimer);
      window.clearInterval(pollTimer);
    };
  }, [conditionId, tokensKey]);

  const filling = status.phase === "history";
  const streamRows = useMemo(
    () => (filling && historyPages.length ? rows.concat(historyPages) : rows),
    [filling, historyPages, rows],
  );
  return { rows, streamRows, status };
}
