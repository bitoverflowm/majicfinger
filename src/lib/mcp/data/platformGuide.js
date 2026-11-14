/**
 * Standing platform nuances for MCP agents — Lychee is not a thin dump API.
 * Call explain_lychee_platform / list_capabilities action=platform when unsure.
 */

export function lycheePlatformGuide() {
  return {
    title: "How Lychee actually works (read before thin pulls)",
    anti_patterns: [
      "Do NOT treat a tool result as 'metadata only' and then invent lesson/snapshot data. If rows are missing, fix ids / status filters / call the right tool — pull again.",
      "Do NOT open magic-link / email verification / dashboard login for research. Stay on MCP tools.",
      "Do NOT use bare dataset names like trader_positions — use polymarket.trader_positions (exact ids from list_datasets).",
      "Do NOT stop at a tiny preview[] when analysis_ready rows exist — analyze the full rows.",
      "Do NOT scrape Polymarket/Kalshi HTML, and do NOT send the user to those sites as a data source when a Lychee tool exists.",
      "Do NOT treat a truncated ChatGPT tool list as 'Lychee doesn't have it' — call lychee_call / list_capabilities action=call.",
    ],
    attributes_and_columns: {
      principle:
        "A Lychee pull returns a full row payload from the venue/lake. Column checkboxes / preferred_columns choose what the sheet *shows and charts*, not what the API fetched.",
      mcp: [
        "preview_* / resolveDatasetPull return full analysis rows + preferredColumns hints.",
        "add_sheet_with_chart preferredColumns orders visible columns (cap applies) but rows still carry other fields for analysis.",
        "Ask a focused question → still pull full trader/market rows, then filter/compute; do not invent a thinner fake dataset.",
      ],
      product: [
        "Connect / Refine query: attributes (status, condition, time_range, title, filters) shape the *query*.",
        "Selected columns project the sheet; they do not shrink the underlying pull.",
      ],
    },
    filtering: {
      trader_positions_status: ["OPEN", "REDEEMABLE", "REDEEMABLE_LOST", "MERGEABLE", "CLOSED"],
      tips: [
        "Open book ≠ finished history. For win/loss / Skill Score you need CLOSED (+ redeemable resolved) positions.",
        "preview_trader / pull_trader_bundle accept include_closed=true to land closed sheets.",
        "Market pulls: condition_id is the key; lookalikes for related deadlines; search_closed_markets for settled races.",
        "You may filter rows in analysis (theme keywords, outcome, size thresholds) after the pull.",
      ],
    },
    joins_buckets_aggregations: {
      joins: {
        live_dashboard:
          "Holder terminal / live build joins trader sheets → market leaves (prices, book, trades, holders, OI) and trader leaves (PnL, activity, profile).",
        mcp_today:
          "MCP lands related sheets side-by-side (pull_market_bundle + pull_trader_bundle). Join graph is documented here; server-side join execute is partial — compose multiple sheets then analyze across them in chat or publish.",
        lake: "Athena compose supports join presets / CTE joins for historical dumps (prepare_full_pull path expanding).",
      },
      buckets_and_aggs: [
        "Calibration: analyze_calibration bins forecasts into reliability bands.",
        "Sheet formulas (dashboard): SUM/AVERAGE/MIN/MAX/ROUND/IF/AND/OR/CONCAT across columns/sheets.",
        "Athena lake compose: dateBucket, sum/count aggregates, bandCase, equations, having, randomSample.",
        "MCP agents: prefer analyze_* tools + computing on full Lychee rows; land summaries via add_insight_blocks.",
      ],
    },
    wallet_depth: {
      layers: [
        "Open positions — current_size, unrealized_pnl, markets held (preview_trader / polymarket.trader_positions).",
        "Activity / tape — buys/sells with price, usdc_size, timestamps (polymarket.trader_activity).",
        "PnL equity curve — economic_pnl over time (polymarket.trader_pnl / portfolio chart).",
        "Closed / finished — status=CLOSED (+ redeemable) for realized outcomes (include_closed / get_lychee_skill_score).",
        "Theme score — analyze_trader_theme (e.g. Fed) hit-rates on settled markets.",
        "Lychee Skill Score — get_lychee_skill_score (−100…100 skill z with Kish shrink; ±20 ≈ two-sigma).",
      ],
      protocol_wallets:
        "Some holder addresses are protocol/contract wallets — Polymarket rejects them. Pick another proxy_wallet from holders; never magic-link.",
    },
    lychee_skill_score: {
      name: "Lychee Skill Score",
      range: "[-100, 100]",
      meaning:
        "How surprising results are if every paid price was fair. Uses finished positions only. ±20 ≈ two-sigma outlier.",
      tool: "get_lychee_skill_score",
    },
    news: {
      mcp: "search_news — Google News via Lychee; when DATA_LAKE archive is configured, prefers gdelt_news_articles Athena archive.",
      product: "Marketing /news-archive UI exists; Connect integration catalog may still hide news — backend is live for MCP.",
      usage: "Overlay article published_at / seen times vs trader first_ts/last_ts. Correlation ≠ private info.",
    },
    research_loop: [
      "orient: explain_lychee_platform / list_capabilities / list_research_flows / jarvis_pulse",
      "ingest: pull_market_bundle (prices+holders+trades) — SHOW Lychee-styled chart images",
      "wallet: pull_trader_bundle (include_closed) → get_lychee_skill_score → analyze_trader_theme",
      "context: search_news",
      "conclude: add_insight_blocks → publish_project (share URL, not magic-link)",
    ],
  };
}
