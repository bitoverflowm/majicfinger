/** Logged-in MCP / Jarvis playbook. X tags + MCP workflows. Lychee-only. */

export const JARVIS_X_TAGS = [
  {
    tag: "@lychee_data is there a market for this",
    use: "Reply under any tweet. Jarvis matches Kalshi + Polymarket from the parent, not a random pulse.",
  },
  {
    tag: "@lychee_data what markets is this affecting?",
    use: "Under a headline. Listed markets, related coverage, holder/whale line when we have a book.",
  },
  {
    tag: "@lychee_data is this accurate?",
    use: "Under a claim, wallet (0x…), or handle. Lychee evidence — never “fact check.”",
  },
  {
    tag: "@lychee_data pulse",
    use: "What’s moving on Lychee’s active board (volume), not “research this thread.”",
  },
  {
    tag: "@lychee_data holders / whales",
    use: "Concentration and top wallets on the matched market.",
  },
  {
    tag: "@lychee_data gap / kalshi vs polymarket",
    use: "Cross-venue scan for the theme in the tweet.",
  },
];

export const JARVIS_BEST_PRACTICES = [
  "One kernel: jarvis_research (MCP) is the same pack @lychee_data posts on X. Don’t invent a second method.",
  "Lychee only — never scrape Polymarket/Kalshi HTML. If a pull fails, fix ids (condition_id / ticker / proxy_wallet).",
  "Hottest / what’s hot → get_most_active_markets (or pulse). Don’t search_markets for the word “hottest.”",
  "Analyze full rows (analysis_ready). Tiny previews are a glance, not the analysis.",
  "SHOW Lychee chart images inline; paste publish_project URLs to share. Don’t send people a magic-link login.",
  "If gate.can_post is false, say we don’t have a clean Lychee read — don’t ship empty fields or tool names.",
  "ChatGPT caches tools: new chat if Jarvis looks missing. Escape hatch: list_capabilities action=jarvis_on / jarvis_pulse.",
  "X: tag @lychee_data in the tweet body. Replies without the @ won’t hit the mention timeline.",
];

export const JARVIS_MCP_LOOP = [
  "Ask: turn Jarvis mode on? → jarvis_on + jarvis_pulse",
  "Open-ended: list_crazy_workflows, pitch 3, wait for a pick",
  "Named subject: jarvis_research with text + parent_text, then pull_market_bundle / pull_trader_bundle for charts",
  "Lookalikes, whales, news: already in the pack; drill with get_lookalike_markets, analyze_holders, search_news",
  "Ask one question; suggest 2–4 next tools; publish_project when it’s shareable",
];
