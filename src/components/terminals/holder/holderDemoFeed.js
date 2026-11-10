"use client";

import { createContext, useContext } from "react";

/**
 * Stands in for the network under panels that load their own data, so a recorded market can play
 * back with no requests (the landing page's hero demo). Every function is optional:
 * `priceHistory(tokenIds, startSec, endSec)` → `{ t, p }[]` per token,
 * `news(source, params)` → the `/api/news` result, `market(conditionId)` → market details,
 * `fills(wallet, conditionId)` → `{ rows, next }`. `quiet` keeps the quote socket closed.
 */
export const HolderDemoFeedContext = createContext(null);

export function useHolderDemoFeed() {
  return useContext(HolderDemoFeedContext);
}
