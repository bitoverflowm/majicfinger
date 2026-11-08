"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { holderPage, liveHolders, tradesSince } from "./useMarketHolders";

/** 100 holders a side per page, so 3,000 a side; past that the stats cover the largest holders. */
const MAX_PAGES = 30;
const REFRESH_MS = 5 * 60_000;

async function walkHolders(meta, signal) {
  const sides = [[], []];
  const seen = [new Set(), new Set()];
  let cursor = "";
  let capped = false;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const next = await holderPage(meta, cursor, signal);
    next.sides.forEach((list, index) => {
      for (const holder of list) {
        if (seen[index].has(holder.wallet)) continue;
        seen[index].add(holder.wallet);
        sides[index].push(holder);
      }
    });
    cursor = next.cursor;
    if (!cursor) break;
    if (page === MAX_PAGES - 1) capped = true;
  }
  return { sides, capped };
}

function bucket() {
  return { value: 0, pnl: 0, users: 0 };
}

/**
 * Where each outcome's supply sits: the dollars held in positions above and below their entry price,
 * how many holders are on each side of that line, and how concentrated ownership is. Kept live
 * between re-pulls by the same trades and prices that move the holders table.
 *
 * @param {object | null} meta      the market (conditionId, tokenIds, outcomes)
 * @param {object[]} trades         the market's trade rows, newest first
 * @param {number[]} livePrices     the live price of each outcome
 * @param {object[] | null} census  the holders table's sides, for counts and shares past the walk
 */
export function useHolderSupply(meta, trades, livePrices, census) {
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState("");
  const metaRef = useRef(meta);
  metaRef.current = meta;
  const conditionId = meta?.conditionId || "";

  useEffect(() => {
    if (!conditionId) return undefined;
    const abort = new AbortController();
    let timer = 0;
    setSnapshot(null);
    setError("");
    const load = () => {
      const at = Math.floor(Date.now() / 1000);
      return walkHolders(metaRef.current, abort.signal)
        .then((next) => {
          if (abort.signal.aborted) return;
          setSnapshot({ ...next, at });
          setError("");
        })
        .catch((err) => {
          if (abort.signal.aborted || err?.name === "AbortError") return;
          setError((prev) => prev || err?.message || "Couldn't read the holders' positions.");
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

  const priceKey = (livePrices || []).slice(0, 2).join(",");
  const censusKey = (census || []).map((side) => `${side?.count ?? ""}:${side?.shares ?? ""}:${side?.capped ? 1 : 0}`).join("|");
  const sides = useMemo(() => {
    if (!meta || !snapshot) return null;
    const prices = priceKey ? priceKey.split(",").map(Number) : [];
    const totals = censusKey ? censusKey.split("|").map((part) => part.split(":")) : [];
    const recent = tradesSince(trades, snapshot.at);
    return [0, 1].map((index) => {
      const { rows } = liveHolders(snapshot.sides[index], recent, meta.tokenIds?.[index], prices[index]);
      const profit = bucket();
      const loss = bucket();
      let walkedShares = 0;
      let entryCost = 0;
      for (const holder of rows) {
        walkedShares += holder.amount;
        entryCost += holder.amount * holder.avgPrice;
        if (!Number.isFinite(holder.unrealized)) continue;
        const into = holder.unrealized > 0 ? profit : loss;
        into.value += Number.isFinite(holder.value) ? holder.value : 0;
        into.pnl += holder.unrealized;
        into.users += 1;
      }
      const [countText, sharesText, cappedText] = totals[index] || [];
      const censusShares = Number(sharesText);
      const supply = snapshot.capped && censusShares > walkedShares ? censusShares : walkedShares;
      const top1 = rows[0]?.amount || 0;
      const top10 = rows.slice(1, 10).reduce((sum, holder) => sum + holder.amount, 0);
      const rest = Math.max(0, supply - top1 - top10);
      const share = (amount) => (supply > 0 ? (amount / supply) * 100 : 0);
      return {
        outcome: meta.outcomes?.[index] || (index ? "No" : "Yes"),
        price: prices[index],
        rows,
        holders: rows.length,
        count: countText ? Number(countText) : null,
        countCapped: cappedText === "1",
        capped: snapshot.capped,
        avgEntry: walkedShares > 0 ? entryCost / walkedShares : null,
        profit,
        loss,
        distribution: [
          { key: "top1", label: "Top 1", shares: top1, pct: share(top1), holder: rows[0]?.name || "" },
          { key: "top10", label: "Top 10 (excluding top 1)", shares: top10, pct: share(top10) },
          { key: "rest", label: "Rest", shares: rest, pct: share(rest) },
        ],
      };
    });
  }, [censusKey, meta, priceKey, snapshot, trades]);

  return { sides, loading: !snapshot && !error, error };
}
