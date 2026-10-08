import { loadKalshiLiveMarketByTicker } from "@/components/dashboardComposer/integrationBuildCatalog";
import { polymarketMarketMeta } from "@/components/dashboardComposer/polymarketLiveBuild";
import { lifeOfMarket } from "@/lib/markets/marketLife";
import { sheetAssetIds, sheetMarketTicker } from "@/lib/realtime/sheetRealtime";

/** The sheet already remembers the market question and whether it is still open. */
export function marketMetaComplete(block) {
  const pull = block?.pull;
  if (!pull || !String(pull.marketTitle || "").trim()) return false;
  return pull.closed === true || pull.closed === false || Number(pull.openAt) > 0 || Number(pull.closeAt) > 0;
}

function titledCells(block, title) {
  const name = String(title || "").trim();
  if (!name) return null;
  const columns = Array.isArray(block?.columns) ? block.columns : [];
  const index = columns.findIndex((column) => column?.id === "market_title" || column?.id === "question" || column?.id === "yes_sub_title");
  if (index < 0) return null;
  const sheetTitle = String(block?.title || "").trim();
  const cells = { ...(block?.cells || {}) };
  let changed = false;
  for (const key of Object.keys(cells)) {
    if (Number(String(key).split(",")[0]) !== index) continue;
    const value = String(cells[key] || "").trim();
    if (value && value !== sheetTitle && value !== name) continue;
    if (value === name) continue;
    cells[key] = name;
    changed = true;
  }
  return changed ? cells : null;
}

/**
 * @param {object} block
 * @returns {Promise<{ marketTitle: string, ticker?: string, side?: string, openAt?: number, closeAt?: number, closed: boolean, outcome?: string, status?: string } | null>}
 */
export async function lookupSheetMarket(block) {
  const integration = String(block?.integrationId || "");
  if (integration === "polymarket") {
    const token = sheetAssetIds(block)[0];
    if (!token) return null;
    const meta = await polymarketMarketMeta(token);
    return meta?.marketTitle ? meta : null;
  }
  if (integration === "kalshiLive") {
    const ticker = sheetMarketTicker(block);
    if (!ticker) return null;
    const row = await loadKalshiLiveMarketByTicker(ticker);
    if (!row) return null;
    const life = lifeOfMarket({
      openTime: row.open_time,
      closeTime: row.close_time,
      status: row.status,
      result: row.result,
    });
    const marketTitle = String(row.yes_sub_title || row.ticker || "").trim();
    if (!marketTitle) return null;
    return {
      marketTitle,
      ticker: String(row.ticker || ticker),
      side: "",
      openAt: life?.openMs || 0,
      closeAt: life?.closeMs || 0,
      closed: !!life?.stopped,
      outcome: life?.stopped ? life.outcome : "",
      status: String(row.status || ""),
    };
  }
  return null;
}

/** Pull fields, plus a market-title column that still says the sheet's own name. */
export function marketMetaPatch(block, meta) {
  const table = block?.table || block?.pull?.table || "";
  const pull = {
    ...(block?.pull || {}),
    ...(table ? { table } : {}),
    marketTitle: meta.marketTitle,
    ...(meta.ticker && !block?.pull?.ticker ? { ticker: meta.ticker } : {}),
    ...(meta.side ? { side: meta.side } : {}),
    ...(meta.openAt ? { openAt: meta.openAt } : {}),
    ...(meta.closeAt ? { closeAt: meta.closeAt } : {}),
    closed: !!meta.closed,
    ...(meta.outcome ? { outcome: meta.outcome } : {}),
    ...(meta.status ? { status: meta.status } : {}),
  };
  const cells = titledCells(block, meta.marketTitle);
  return cells ? { pull, cells } : { pull };
}
