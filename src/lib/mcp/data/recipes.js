import { analyzeHolders, analyzeTape } from "@/lib/mcp/data/stats";
import {
  getPolymarketHolders,
  getPolymarketMarketByCondition,
  getPolymarketTrader,
  getPolymarketTradesPreview,
} from "@/lib/mcp/data/providers";
import {
  addInsightBlocks,
  addSheetWithChart,
  createResearchProject,
  openProject,
  pullMarketBundleIntoProject,
} from "@/lib/mcp/workspace";

/**
 * MCP cousin of the Polymarket Holder Analysis recipe:
 * holders (YES/NO charts) + tape + top trader deep-dives → one project.
 */
export async function runHolderAnalysisRecipe(
  userId,
  { conditionId, projectId = "", projectName = "", topTraders = 3, holdersLimit = 80, tradesLimit = 80 } = {},
) {
  const condition = String(conditionId || "").trim();
  if (!condition) throw new Error("condition_id required");

  const market = await getPolymarketMarketByCondition(condition);
  const [holders, trades] = await Promise.all([
    getPolymarketHolders(condition, { limit: holdersLimit }),
    getPolymarketTradesPreview(condition, { limit: tradesLimit }),
  ]);

  const prices = Array.isArray(market.outcome_prices) ? market.outcome_prices.map(Number) : [];
  const holderAnalysis = analyzeHolders(holders.rows, {
    marketTitle: market.title,
    yesPrice: prices[0],
    noPrice: prices[1],
  });
  const tapeAnalysis = analyzeTape(trades.rows, { marketTitle: market.title });

  const byWallet = new Map();
  for (const row of holders.rows) {
    const wallet = String(row.proxy_wallet || "").toLowerCase();
    if (!/^0x[a-f0-9]{40}$/.test(wallet)) continue;
    const prev = byWallet.get(wallet) || { wallet, name: row.name || row.pseudonym || wallet, amount: 0 };
    prev.amount += Number(row.amount) || 0;
    byWallet.set(wallet, prev);
  }
  const top = [...byWallet.values()].sort((a, b) => b.amount - a.amount).slice(0, Math.min(5, Math.max(1, topTraders)));

  const traderBundles = [];
  for (const trader of top) {
    try {
      const bundle = await getPolymarketTrader(trader.wallet, { limit: 40 });
      traderBundles.push({ label: trader.name, ...bundle });
    } catch {
      /* skip wallets Polymarket won't expand */
    }
  }

  const analysisMarkdown = [
    `## Holder analysis · ${market.title}`,
    "",
    "### Inferences",
    ...holderAnalysis.inferences.map((line) => `- ${line}`),
    "",
    "### Tape",
    ...tapeAnalysis.inferences.map((line) => `- ${line}`),
    "",
    "### Trade hypotheses (not advice)",
    ...holderAnalysis.trade_hypotheses.map((h) => `- **${h.idea}**: ${h.rationale} Risk: ${h.risk}`),
    "",
    "### Top wallets drilled",
    ...top.map((t) => `- ${t.name} · ${t.wallet} · shares≈${Math.round(t.amount)}`),
    "",
    "### Risk checklist",
    ...holderAnalysis.risk_checklist.map((line) => `- ${line}`),
  ].join("\n");

  const composed = await pullMarketBundleIntoProject(userId, {
    projectId,
    projectName: projectName || `Holders · ${market.title}`,
    question: market.title,
    market,
    holdersRows: holders.rows,
    tradesRows: trades.rows,
    analysisMarkdown,
  });

  const sheets = [...(composed.sheets || [])];
  for (const trader of traderBundles) {
    if (trader.positions?.length) {
      sheets.push(
        await addSheetWithChart(userId, composed.project_id, {
          title: `${trader.label} · positions`,
          rows: trader.positions,
          preferredColumns: ["title", "outcome", "size", "current_value", "cash_pnl"],
          chartView: "treemap",
          table: "getTraderPositions",
        }),
      );
    }
    if (trader.activity?.length) {
      sheets.push(
        await addSheetWithChart(userId, composed.project_id, {
          title: `${trader.label} · activity`,
          rows: trader.activity,
          preferredColumns: ["timestamp", "type", "side", "price", "size", "title"],
          chartView: "activity",
          table: "getTraderActivity",
        }),
      );
    }
  }

  return {
    market,
    holders_count: holders.count,
    trades_count: trades.trade_count,
    holder_analysis: holderAnalysis,
    tape_analysis: tapeAnalysis,
    top_traders: top,
    traders_expanded: traderBundles.length,
    composed: { ...composed, sheets },
    next: "Share composed.dashboard_url. Optionally compare_venues or publish_project.",
  };
}

/**
 * Lightweight trade-history compose (live tape). Full Athena lake recipe remains prepare_full_pull.
 */
export async function runTradeHistoryRecipe(
  userId,
  { conditionId, projectId = "", projectName = "", tradesLimit = 150 } = {},
) {
  const condition = String(conditionId || "").trim();
  if (!condition) throw new Error("condition_id required");
  const market = await getPolymarketMarketByCondition(condition);
  const trades = await getPolymarketTradesPreview(condition, { limit: tradesLimit });
  const tapeAnalysis = analyzeTape(trades.rows, { marketTitle: market.title });

  let project =
    projectId
      ? await openProject(userId, projectId)
      : await createResearchProject(userId, {
          name: projectName || `Trades · ${market.title}`,
          question: market.title,
        });
  if (!project?.project_id) throw new Error("Could not open project");

  const sheet = await addSheetWithChart(userId, project.project_id, {
    title: `${market.title} · trades`,
    rows: trades.rows.map((row) => ({ ...row, market_title: market.title })),
    preferredColumns: ["timestamp", "side", "price", "size", "outcome", "proxy_wallet"],
    chartView: "trade-price",
    table: "getTradesByMarket",
  });
  await addInsightBlocks(userId, project.project_id, {
    title: "Tape analysis",
    markdown: [
      `## ${market.title}`,
      ...tapeAnalysis.inferences.map((line) => `- ${line}`),
      "",
      "_Full Athena historical trade dumps: prepare_full_pull (confirm + expensive)._",
    ].join("\n"),
  });

  return {
    market,
    trades_count: trades.trade_count,
    tape_analysis: tapeAnalysis,
    composed: {
      project_id: project.project_id,
      dashboard_url: sheet.dashboard_url,
      sheets: [sheet],
    },
    next: "For lake-scale history use prepare_full_pull; otherwise publish_project when ready to share.",
  };
}
