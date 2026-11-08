"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { polymarketGet } from "@/components/dashboardComposer/recipes/polymarketTradeHistorySource";
import { holderLabel, pullWalletCreated, walletAge } from "@/components/dashboardComposer/recipes/polymarketHolderAnalysisSource";

/** Polymarket caps holder pages with profit columns at 100 per outcome. */
const PNL_PAGE = 100;
const MAX_PNL_PAGES = 10;
/** Without profit columns a page holds 1,000 holders per outcome; enough pages to count most markets. */
const CENSUS_PAGE = 1000;
const MAX_CENSUS_PAGES = 20;
const REFRESH_MS = 60_000;
const CENSUS_REFRESH_MS = 5 * 60_000;
const DUST_SHARES = 0.0001;

function num(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function lower(value) {
  return String(value || "").toLowerCase();
}

function sideOf(tokenIds, tokenId, outcomeIndex) {
  const at = (tokenIds || []).map(String).indexOf(String(tokenId || ""));
  if (at === 0 || at === 1) return at;
  const n = Number(outcomeIndex);
  return n === 0 || n === 1 ? n : -1;
}

function rootOf(body) {
  return Array.isArray(body) ? body[0] : body;
}

function toHolder(raw) {
  const amount = num(raw.amount) || 0;
  const avgPrice = num(raw.avg_price) || 0;
  return {
    wallet: lower(raw.proxy_wallet),
    name: holderLabel(raw),
    pseudonym: String(raw.pseudonym || "").trim(),
    image: String(raw.profile_image_optimized || raw.profile_image || "").trim(),
    verified: raw.verified === true,
    amount,
    avgPrice,
    cost: num(raw.entry_cost_usdc) ?? amount * avgPrice,
    price: num(raw.current_price),
    value: num(raw.current_value),
    realized: num(raw.realized_pnl) || 0,
    unrealized: num(raw.unrealized_pnl),
    total: num(raw.total_pnl),
  };
}

/** One page of the largest holders on both outcomes, with profit columns. */
export async function holderPage(meta, cursor, signal) {
  const body = await polymarketGet(
    "getHoldersByMarket",
    { condition: meta.conditionId, limit: String(PNL_PAGE), include_pnl: "true", ...(cursor ? { cursor } : {}) },
    signal,
    { retries: 3 },
  );
  const root = rootOf(body);
  const sides = [[], []];
  for (const group of Array.isArray(root?.data) ? root.data : []) {
    for (const raw of Array.isArray(group?.holders) ? group.holders : []) {
      const index = sideOf(meta.tokenIds, group?.token_id || raw?.token_id, raw?.outcome_index);
      if (index >= 0) sides[index].push(toHolder(raw));
    }
  }
  const next = root?.pagination?.has_more ? String(root.pagination.next_cursor || "") : "";
  return { sides, cursor: next };
}

async function holderPages(meta, pages, signal) {
  const sides = [[], []];
  const seen = [new Set(), new Set()];
  let cursor = "";
  let loaded = 0;
  for (; loaded < pages; loaded += 1) {
    const page = await holderPage(meta, cursor, signal);
    page.sides.forEach((list, index) => {
      for (const holder of list) {
        if (seen[index].has(holder.wallet)) continue;
        seen[index].add(holder.wallet);
        sides[index].push(holder);
      }
    });
    cursor = page.cursor;
    if (!cursor) {
      loaded += 1;
      break;
    }
  }
  return { sides, cursor, pages: loaded };
}

/** Every holder's balance: how many hold each outcome, the shares they hold between them, and who they are. */
async function holderCensus(meta, signal) {
  const counts = [0, 0];
  const shares = [0, 0];
  const wallets = [new Set(), new Set()];
  let cursor = "";
  let capped = false;
  for (let page = 0; page < MAX_CENSUS_PAGES; page += 1) {
    const body = await polymarketGet(
      "getHoldersByMarket",
      { condition: meta.conditionId, limit: String(CENSUS_PAGE), ...(cursor ? { cursor } : {}) },
      signal,
      { retries: 3 },
    );
    const root = rootOf(body);
    for (const group of Array.isArray(root?.data) ? root.data : []) {
      for (const raw of Array.isArray(group?.holders) ? group.holders : []) {
        const index = sideOf(meta.tokenIds, group?.token_id || raw?.token_id, raw?.outcome_index);
        if (index < 0) continue;
        counts[index] += 1;
        shares[index] += num(raw.amount) || 0;
        wallets[index].add(lower(raw.proxy_wallet));
      }
    }
    cursor = root?.pagination?.has_more ? String(root.pagination.next_cursor || "") : "";
    if (!cursor) break;
    if (page === MAX_CENSUS_PAGES - 1) capped = true;
  }
  return { counts, shares, wallets, capped };
}

/** A trade by a holder we already list, applied to their position. */
function applyTrade(holder, trade) {
  const size = num(trade.size) || 0;
  const price = num(trade.price);
  if (!size || price == null) return holder;
  if (String(trade.side).toUpperCase() === "BUY") {
    const amount = holder.amount + size;
    const avgPrice = (holder.amount * holder.avgPrice + size * price) / amount;
    return { ...holder, amount, avgPrice, cost: holder.cost + size * price };
  }
  const sold = Math.min(size, holder.amount);
  const amount = holder.amount - sold;
  return { ...holder, amount, cost: amount * holder.avgPrice, realized: holder.realized + sold * (price - holder.avgPrice) };
}

function priced(holder, price) {
  if (!Number.isFinite(price)) return holder;
  const value = holder.amount * price;
  const unrealized = holder.amount * (price - holder.avgPrice);
  return { ...holder, price, value, unrealized, total: holder.realized + unrealized };
}

/** Confirmed trades newer than `at`, oldest first. */
export function tradesSince(trades, at) {
  const recent = [];
  for (const trade of trades || []) {
    if (Number(trade.timestamp) <= at) break;
    if (trade.proxy_wallet) recent.push(trade);
  }
  return recent.reverse();
}

/**
 * One outcome's holders brought up to date: trades since the snapshot move the positions of holders
 * already listed, the live price re-values them all, and emptied positions drop out. Largest first.
 */
export function liveHolders(holders, recent, tokenId, price) {
  const token = String(tokenId ?? "");
  const byWallet = new Map(holders.map((holder) => [holder.wallet, holder]));
  const changed = new Map();
  for (const trade of recent) {
    if (String(trade.token_id) !== token) continue;
    const wallet = lower(trade.proxy_wallet);
    const holder = byWallet.get(wallet);
    if (!holder) continue;
    byWallet.set(wallet, applyTrade(holder, trade));
    changed.set(wallet, Number(trade.timestamp) * 1000);
  }
  const rows = [...byWallet.values()]
    .filter((holder) => holder.amount > DUST_SHARES)
    .map((holder) => priced(holder, price))
    .sort((a, b) => b.amount - a.amount);
  return { rows, changed };
}

/**
 * The market's holders on each outcome, largest first, kept live: the list re-pulls every minute,
 * confirmed trades in between move the positions of holders already listed, and the live price
 * re-values every position. A census of every holder gives the counts, the share of supply, and
 * who holds both outcomes.
 *
 * @param {object | null} meta  the market (conditionId, tokenIds, outcomes)
 * @param {object[]} trades     the market's trade rows, newest first
 * @param {number[]} livePrices the live price of each outcome
 */
export function useMarketHolders(meta, trades, livePrices) {
  const [snapshot, setSnapshot] = useState(null);
  const [census, setCensus] = useState(null);
  const [created, setCreated] = useState(() => new Map());
  const [error, setError] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);
  const metaRef = useRef(meta);
  metaRef.current = meta;
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;
  const conditionId = meta?.conditionId || "";

  useEffect(() => {
    if (!conditionId) return undefined;
    const abort = new AbortController();
    let timer = 0;
    setSnapshot(null);
    setError("");
    const load = () => {
      const pages = snapshotRef.current?.pages || 1;
      const at = Math.floor(Date.now() / 1000);
      return holderPages(metaRef.current, pages, abort.signal)
        .then((next) => {
          if (abort.signal.aborted) return;
          setSnapshot({ ...next, at });
          setError("");
        })
        .catch((err) => {
          if (abort.signal.aborted || err?.name === "AbortError") return;
          if (!snapshotRef.current) setError(err?.message || "Couldn't load the holders.");
        })
        .finally(() => {
          if (!abort.signal.aborted && !metaRef.current?.closed) timer = window.setTimeout(load, REFRESH_MS);
        });
    };
    void load();
    return () => {
      abort.abort();
      window.clearTimeout(timer);
    };
  }, [conditionId]);

  useEffect(() => {
    if (!conditionId) return undefined;
    const abort = new AbortController();
    let timer = 0;
    setCensus(null);
    const load = () =>
      holderCensus(metaRef.current, abort.signal)
        .then((next) => {
          if (!abort.signal.aborted) setCensus(next);
        })
        .catch(() => {})
        .finally(() => {
          if (!abort.signal.aborted && !metaRef.current?.closed) timer = window.setTimeout(load, CENSUS_REFRESH_MS);
        });
    void load();
    return () => {
      abort.abort();
      window.clearTimeout(timer);
    };
  }, [conditionId]);

  const walletKey = snapshot ? snapshot.sides.flat().map((holder) => holder.wallet).join(",") : "";
  useEffect(() => {
    if (!walletKey) return undefined;
    const missing = walletKey.split(",").filter((wallet) => wallet && !created.has(wallet));
    if (!missing.length) return undefined;
    const abort = new AbortController();
    pullWalletCreated(missing, { signal: abort.signal })
      .then((found) => {
        if (abort.signal.aborted) return;
        setCreated((prev) => {
          const next = new Map(prev);
          for (const wallet of missing) next.set(wallet, found.get(wallet) ?? null);
          return next;
        });
      })
      .catch(() => {});
    return () => abort.abort();
    // `created` only grows; re-running on it would refetch nothing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletKey]);

  const loadMore = useCallback(() => {
    const current = snapshotRef.current;
    if (!current?.cursor || loadingMore || current.pages >= MAX_PNL_PAGES) return;
    setLoadingMore(true);
    holderPage(metaRef.current, current.cursor, undefined)
      .then((page) => {
        setSnapshot((prev) => {
          if (!prev || prev.cursor !== current.cursor) return prev;
          const sides = prev.sides.map((list, index) => {
            const seen = new Set(list.map((holder) => holder.wallet));
            return [...list, ...page.sides[index].filter((holder) => !seen.has(holder.wallet))];
          });
          return { ...prev, sides, cursor: page.cursor, pages: prev.pages + 1 };
        });
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  }, [loadingMore]);

  const priceKey = (livePrices || []).slice(0, 2).join(",");
  const sides = useMemo(() => {
    if (!meta || !snapshot) return null;
    const prices = priceKey ? priceKey.split(",").map(Number) : [];
    const recent = tradesSince(trades, snapshot.at);
    const both = census ? census.wallets : snapshot.sides.map((list) => new Set(list.map((holder) => holder.wallet)));
    const now = Date.now();
    return [0, 1].map((index) => {
      const { rows: live, changed } = liveHolders(snapshot.sides[index], recent, meta.tokenIds?.[index], prices[index]);
      const other = both[1 - index];
      const rows = live.map((holder, at) => {
        const createdMs = created.get(holder.wallet);
        return {
          ...holder,
          rank: at + 1,
          changedAt: changed.get(holder.wallet) || 0,
          supplyPct: census?.shares[index] > 0 ? (holder.amount / census.shares[index]) * 100 : null,
          newWallet: createdMs == null ? false : walletAge(createdMs, now).new_wallet,
          bothSides: other.has(holder.wallet),
        };
      });
      return {
        outcome: meta.outcomes?.[index] || (index ? "No" : "Yes"),
        rows,
        count: census ? census.counts[index] : null,
        shares: census ? census.shares[index] : null,
        capped: !!census?.capped,
      };
    });
  }, [census, created, meta, priceKey, snapshot, trades]);

  return {
    sides,
    loading: !snapshot && !error,
    error,
    hasMore: !!snapshot?.cursor && snapshot.pages < MAX_PNL_PAGES,
    loadingMore,
    loadMore,
  };
}
