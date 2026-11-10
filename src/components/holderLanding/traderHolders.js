"use client";

import { useEffect, useRef, useState } from "react";
import { polymarketGet } from "@/components/dashboardComposer/recipes/polymarketTradeHistorySource";
import { PROTOCOL_CONTRACT } from "@/components/dashboardComposer/recipes/polymarketHolderAnalysisSource";

/** wallet -> Promise<boolean>, true when the wallet is a trader rather than one of Polymarket's contracts. */
const verdicts = new Map();

function isTrader(wallet) {
  if (!verdicts.has(wallet)) {
    verdicts.set(
      wallet,
      polymarketGet("getTraderPositions", { user: wallet, limit: "1" }).then(
        () => true,
        (err) => !PROTOCOL_CONTRACT.test(String(err?.message || "")),
      ),
    );
  }
  return verdicts.get(wallet);
}

/**
 * The largest `count` holders on each side that can be followed as traders. Polymarket's own
 * contracts (adapters, exchanges) can hold most of a side but have no trades or P&L, so they are
 * skipped. Null until checked.
 */
export function useTraderHolders(sides, { count = 5, enabled = true } = {}) {
  const [picked, setPicked] = useState(null);
  const sidesRef = useRef(sides);
  sidesRef.current = sides;
  const key = enabled && sides ? sides.map((side) => side.rows.slice(0, count + 3).map((row) => row.wallet).join(",")).join("|") : "";

  useEffect(() => {
    const current = sidesRef.current;
    if (!key || !current) return undefined;
    let live = true;
    Promise.all(
      current.map(async (side) => {
        const rows = side.rows.slice(0, count + 3);
        const ok = await Promise.all(rows.map((row) => isTrader(row.wallet)));
        return { outcome: side.outcome, rows: rows.filter((_, index) => ok[index]).slice(0, count) };
      }),
    ).then((result) => {
      if (live) setPicked({ key, result });
    });
    return () => {
      live = false;
    };
  }, [key, count]);

  return key && picked?.key === key ? picked.result : null;
}
