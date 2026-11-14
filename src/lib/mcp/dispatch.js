import { jarvisPowerUpPayload, jarvisPulse } from "@/lib/mcp/data/jarvis";
import { lycheePlatformGuide } from "@/lib/mcp/data/platformGuide";
import { searchNewsHeadlines } from "@/lib/mcp/data/news";
import { getPolymarketTrader, lookupPolymarketTrades, lookupPolymarketWallets } from "@/lib/mcp/data/providers";
import { runTradeHistoryRecipe } from "@/lib/mcp/data/recipes";
import { runResearchPack } from "@/lib/mcp/research/pack";

export const LYCHEE_CALL_TOOLS = [
  "search_news",
  "lookup_wallet",
  "preview_trader",
  "preview_market_activity",
  "lookup_trades",
  "run_recipe_trade_history",
  "jarvis_on",
  "jarvis_pulse",
  "jarvis_research",
  "platform",
];

function parseArgs(raw) {
  if (!raw) return {};
  if (typeof raw === "object" && !Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    const s = raw.trim();
    if (!s) return {};
    try {
      const parsed = JSON.parse(s);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

/**
 * Run a named Lychee tool when the host truncated the MCP tool list
 * (ChatGPT often advertises the catalog but only binds ~30–40 callables).
 */
export async function dispatchLycheeTool(actor, toolName, rawArgs) {
  const tool = String(toolName || "").trim();
  const args = parseArgs(rawArgs);

  if (tool === "jarvis_on" || tool === "platform") {
    if (tool === "platform") return lycheePlatformGuide();
    return {
      note: "Jarvis activated through lychee_call / list_capabilities (ChatGPT tool-list workaround).",
      ...jarvisPowerUpPayload(),
    };
  }
  if (tool === "jarvis_pulse") {
    return jarvisPulse({ limit: args.limit || 8 });
  }
  if (tool === "jarvis_research") {
    const { llm, ...pack } = await runResearchPack({
      text: args.text || args.query || "",
      parent_text: args.parent_text || "",
      author_handle: args.author_handle || "",
    });
    return pack;
  }
  if (tool === "search_news") {
    return searchNewsHeadlines(args);
  }
  if (tool === "lookup_wallet" || tool === "search_wallets" || tool === "search_profiles") {
    return lookupPolymarketWallets({
      query: args.query || args.name || args.handle || args.q || args.proxy_wallet || "",
      include_positions: args.include_positions !== false,
      include_closed: !!args.include_closed,
      limit: args.limit || 8,
    });
  }
  if (tool === "preview_trader") {
    let wallet = args.proxy_wallet || args.proxyWallet || args.user || "";
    if (!/^0x[a-fA-F0-9]{40}$/.test(String(wallet))) {
      const looked = await lookupPolymarketWallets({
        query: args.query || args.name || args.handle || wallet,
        include_positions: false,
      });
      wallet = looked.proxy_wallet || "";
    }
    if (!wallet) throw new Error("preview_trader needs proxy_wallet — call lookup_wallet with the trader name first");
    return getPolymarketTrader(wallet, {
      limit: args.limit || 50,
      includeClosed: args.include_closed !== false,
    });
  }
  if (tool === "preview_market_activity" || tool === "lookup_trades") {
    return lookupPolymarketTrades({
      conditionId: args.condition_id || args.conditionId || "",
      proxyWallet: args.proxy_wallet || args.proxyWallet || args.user || "",
      start: args.start_utc || args.start || args.start_unix || null,
      end: args.end_utc || args.end || args.end_unix || null,
      limit: args.limit || 200,
    });
  }
  if (tool === "run_recipe_trade_history") {
    const condition = args.condition_id || args.conditionId;
    if (!condition) throw new Error("run_recipe_trade_history needs condition_id");
    if (!actor?.userId) throw new Error("Signed-in Lychee user required for recipes");
    return runTradeHistoryRecipe(actor.userId, {
      conditionId: condition,
      projectId: args.project_id || "",
      projectName: args.project_name || "",
      tradesLimit: args.trades_limit || args.limit || 150,
    });
  }

  throw new Error(
    `Unknown Lychee tool "${tool}". Known via lychee_call: ${LYCHEE_CALL_TOOLS.join(", ")}. Stay on Lychee — do not use Polymarket or Kalshi outside these tools.`,
  );
}
