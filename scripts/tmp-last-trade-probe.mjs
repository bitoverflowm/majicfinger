import { fetchPolymarketLastTradePricesRows } from "@/lib/polymarketLive/polymarketLastTradePricesPull.js";
import { emptyPolymarketLastTradePricesComposeState } from "@/lib/polymarketLive/lastTradePricesCompose.js";
import { buildPolymarketMarketsListQueryValues } from "@/lib/polymarketLive/marketsCompose.js";

const BASE = "http://localhost:3000";
const realFetch = globalThis.fetch;
globalThis.fetch = (url, opts) =>
  realFetch(typeof url === "string" && url.startsWith("/") ? `${BASE}${url}` : url, opts);

async function suggestions(q) {
  const res = await realFetch(
    `${BASE}/api/integrations/polymarket?query=metadataSuggestions&q=${encodeURIComponent(q)}&limit_per_type=12&search_tags=false&search_profiles=false&keep_closed_markets=1`,
  );
  const data = await res.json();
  return (data.suggestions || []).filter((s) => s.entity === "market");
}

const picks = (await suggestions("next prime minister of sweden")).slice(0, 3);

// Advanced filters where the user added markets through the in-filters market search.
const marketRefs = picks.map((s) => ({
  id: String(s.id || ""),
  slug: s.slug || "",
  conditionId: s.conditionId || "",
  title: s.title || "",
  tokenId: JSON.parse(s.raw.clobTokenIds)[0],
}));

const compose = {
  ...emptyPolymarketLastTradePricesComposeState(),
  mode: "advanced",
  outcomeSelection: "both",
};
compose.marketsFilters = { ...compose.marketsFilters, marketRefs, limit: 20 };

console.log(
  "discovery query values:",
  JSON.stringify(buildPolymarketMarketsListQueryValues({ ...compose.marketsFilters, mode: "advanced" }), null, 2),
);

try {
  const out = await fetchPolymarketLastTradePricesRows(compose, { selectedColumns: [] });
  console.log(`advanced+refs/both: OK rows=${out.rows.length} tokens=${out.tokenIds.length}`);
  for (const r of out.rows) console.log(" ", r.outcome, r.last_trade_price, r.last_trade_side, r.market_title);
} catch (e) {
  console.log("advanced+refs/both: ERROR ->", e instanceof Error ? e.message : e);
}
