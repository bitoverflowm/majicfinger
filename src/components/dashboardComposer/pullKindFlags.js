/**
 * Kind flags for a pull. Joins read these flags, not the endpoint name.
 * A later join can add a flag: a series pull that joins to markets gains `markets`.
 * `markets` is what unlocks trades, the order book, and candlesticks.
 */

export const PULL_KIND_FLAGS = {
  markets: { markets: true },
  series: { series: true },
  events: { events: true },
  multivariate_events: { events: true },
  event_forecast: { events: true },
  event_candlesticks: { events: true, candlesticks: true },
  candlesticks: { candlesticks: true },
  trades: { trades: true },
  orderbook: { orderbook: true },
  leaderboard: { traders: true },
  holder_profile: { traders: true },
  trades_by_holder: { traders: true },
  search_traders: { traders: true },
};

export function pullKindFlags(tableId, { realtime = false } = {}) {
  const flags = { ...(PULL_KIND_FLAGS[tableId] || {}) };
  if (realtime) flags.realtime = true;
  return flags;
}

/** Copy flags and set any kinds a join just produced. */
export function withJoinFlags(flags, produced = {}) {
  const next = { ...(flags || {}) };
  for (const [flag, on] of Object.entries(produced)) {
    if (on) next[flag] = true;
  }
  return next;
}

/**
 * A second markets join belongs on a pull that was not markets to start with,
 * once a join has put markets into the enrichment. Series is that pull today.
 */
export function allowsMarketDownstreamJoin(nativeFlags, enrichmentFlags) {
  return Boolean(enrichmentFlags?.markets) && !nativeFlags?.markets;
}
