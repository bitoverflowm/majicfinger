"use client";

import { useEffect, useState } from "react";
import { loadPolymarketLiveTable, loadPolymarketTraderJoin } from "@/components/dashboardComposer/polymarketLiveBuild";
import { TRADER_ACTIVITY_ENDPOINT_ID } from "@/lib/polymarketLive/traderActivityCompose";
import { TRADER_BY_ADDRESS_ENDPOINT_ID } from "@/lib/polymarketLive/traderByAddressCompose";
import { TRADER_PNL_ENDPOINT_ID } from "@/lib/polymarketLive/traderPnlCompose";
import { TRADER_ACTIVITY_FILTERS, TRADER_PNL_FILTERS } from "./holderTerminalSheets";

const PROFILE_REFRESH_MS = 30_000;
const ACTIVITY_POLL_MS = 10_000;
const PNL_REFRESH_MS = 120_000;
const ACTIVITY_HISTORY_ROWS = 2000;
const ACTIVITY_POLL_ROWS = 100;

function activityKey(row) {
  return [row.transaction_hash, row.timestamp, row.type, row.condition_id, row.token_id, row.side, row.outcome_index, row.size]
    .map((part) => String(part ?? ""))
    .join("|");
}

function stampMs(value) {
  const n = Number(value);
  if (Number.isFinite(n) && n > 0) return n < 1e12 ? n * 1000 : n;
  const parsed = Date.parse(String(value || ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

const EMPTY_PART = { columns: [], rows: [], status: "loading", error: "", updatedAt: 0 };

/** Re-run one loader on an interval while mounted. `merge` folds each new result into the last. */
function usePolled(key, load, intervalMs, merge) {
  const [part, setPart] = useState(EMPTY_PART);
  useEffect(() => {
    if (!key) return undefined;
    let alive = true;
    let timer = 0;
    setPart(EMPTY_PART);
    const run = (first) =>
      load(first)
        .then((next) => {
          if (!alive) return;
          setPart((prev) => ({
            columns: next.columns?.length ? next.columns : prev.columns,
            rows: merge && !first ? merge(prev.rows, next.rows || []) : next.rows || [],
            status: "ready",
            error: "",
            updatedAt: Date.now(),
          }));
        })
        .catch((err) => {
          if (!alive) return;
          setPart((prev) => (first ? { ...prev, status: "error", error: err?.message || "Pull failed." } : prev));
        })
        .finally(() => {
          if (alive) timer = window.setTimeout(() => void run(false), intervalMs);
        });
    void run(true);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
    // `load` and `merge` are rebuilt each render; the key decides when to restart.
  }, [key, intervalMs]);
  return part;
}

function mergeActivity(prev, next) {
  const seen = new Set(prev.map(activityKey));
  const fresh = next.filter((row) => {
    const key = activityKey(row);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (!fresh.length) return prev;
  return fresh.concat(prev).sort((a, b) => stampMs(b.timestamp) - stampMs(a.timestamp));
}

/** One trader's profile stats, trade activity and PnL series, each kept fresh on its own clock. */
export function useLiveTrader(address) {
  const wallet = String(address || "").toLowerCase();
  const pick = { address: wallet };

  const profile = usePolled(
    wallet && `profile:${wallet}`,
    () => loadPolymarketLiveTable(TRADER_BY_ADDRESS_ENDPOINT_ID, [{ kind: "profile", address: wallet }]),
    PROFILE_REFRESH_MS,
  );
  const activity = usePolled(
    wallet && `activity:${wallet}`,
    (first) =>
      loadPolymarketTraderJoin(TRADER_ACTIVITY_ENDPOINT_ID, pick, {
        rowLimit: first ? ACTIVITY_HISTORY_ROWS : ACTIVITY_POLL_ROWS,
        filters: TRADER_ACTIVITY_FILTERS,
      }),
    ACTIVITY_POLL_MS,
    mergeActivity,
  );
  const pnl = usePolled(
    wallet && `pnl:${wallet}`,
    () => loadPolymarketTraderJoin(TRADER_PNL_ENDPOINT_ID, pick, { rowLimit: 5000, filters: TRADER_PNL_FILTERS }),
    PNL_REFRESH_MS,
  );

  return { profile, activity, pnl };
}
