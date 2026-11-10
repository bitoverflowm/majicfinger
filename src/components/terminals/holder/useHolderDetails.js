"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { polymarketGet } from "@/components/dashboardComposer/recipes/polymarketTradeHistorySource";
import { loadTraderScore } from "./traderScore";

/** Wallets looked up at once. Each takes three requests, and Polymarket rate-limits trader endpoints. */
const CONCURRENCY = 4;

/**
 * wallet|conditionId → {
 *   pnlRank, volumeRank: all-time leaderboard ranks, null when unranked;
 *   pnl: all-time PnL in USDC, null when unknown;
 *   firstTradeHere: whether the wallet's first trade ever was in this market, null when unknown;
 *   bought: total shares ever bought of each outcome;
 *   score: the Lychee trader score outside this market, null with no finished positions, undefined when it failed;
 * }
 */
const cache = new Map();

function rootOf(body) {
  return Array.isArray(body) ? body[0] : body;
}

function rank(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function lookUp(wallet, conditionId, tokenIds) {
  const [board, first, positions, scored] = await Promise.allSettled([
    polymarketGet("getTraderLeaderboard", { user: wallet, time_period: "all", category: "overall" }, undefined, { retries: 2 }),
    polymarketGet("getTraderActivity", { user: wallet, type: "TRADE", limit: "1", sort_direction: "ASC" }, undefined, { retries: 2 }),
    polymarketGet("getTraderPositions", { user: wallet, condition: conditionId }, undefined, { retries: 2 }),
    loadTraderScore(wallet, conditionId),
  ]);
  const entry = board.status === "fulfilled" ? rootOf(board.value)?.data : null;
  const firstTrade = first.status === "fulfilled" ? rootOf(first.value)?.data?.[0] : undefined;
  const held = positions.status === "fulfilled" ? rootOf(positions.value)?.data : null;
  const bought = tokenIds.map((token) => {
    if (!Array.isArray(held)) return null;
    const position = held.find((row) => String(row?.token_id) === String(token));
    const size = Number(position?.total_size);
    return Number.isFinite(size) ? size : 0;
  });
  const pnl = entry?.pnl == null || entry.pnl === "" ? NaN : Number(entry.pnl);
  return {
    pnlRank: rank(entry?.rank_pnl),
    volumeRank: rank(entry?.rank_volume),
    pnl: Number.isFinite(pnl) ? pnl : null,
    firstTradeHere:
      first.status !== "fulfilled" ? null : firstTrade ? String(firstTrade.condition_id || "").toLowerCase() === conditionId.toLowerCase() : null,
    bought,
    score: scored.status === "fulfilled" ? scored.value : undefined,
  };
}

/**
 * Leaderboard rank, total bought and first-trade check for the holders on screen. Call `request`
 * with the wallets in view; `details(wallet)` is undefined until a wallet's lookup lands.
 */
export function useHolderDetails(conditionId, tokenIds) {
  const [, setVersion] = useState(0);
  const queueRef = useRef([]);
  const activeRef = useRef(0);
  const aliveRef = useRef(true);
  const tokensRef = useRef(tokenIds);
  tokensRef.current = tokenIds;

  useEffect(() => {
    aliveRef.current = true;
    queueRef.current = [];
    return () => {
      aliveRef.current = false;
      for (const wallet of queueRef.current) cache.delete(`${wallet}|${conditionId}`);
      queueRef.current = [];
    };
  }, [conditionId]);

  const pump = useCallback(() => {
    while (activeRef.current < CONCURRENCY && queueRef.current.length) {
      const wallet = queueRef.current.shift();
      const key = `${wallet}|${conditionId}`;
      activeRef.current += 1;
      lookUp(wallet, conditionId, (tokensRef.current || []).slice(0, 2))
        .then((data) => cache.set(key, data))
        .catch(() => cache.delete(key))
        .finally(() => {
          activeRef.current -= 1;
          if (!aliveRef.current) return;
          setVersion((value) => value + 1);
          pump();
        });
    }
  }, [conditionId]);

  const request = useCallback(
    (wallets) => {
      if (!conditionId) return;
      let added = false;
      for (const wallet of wallets) {
        const key = `${wallet}|${conditionId}`;
        if (!/^0x[a-f0-9]{40}$/.test(wallet) || cache.has(key)) continue;
        cache.set(key, undefined);
        queueRef.current.push(wallet);
        added = true;
      }
      if (added) pump();
    },
    [conditionId, pump],
  );

  const details = useCallback((wallet) => cache.get(`${wallet}|${conditionId}`), [conditionId]);
  return { details, request };
}
