/**
 * Ambitious, copy-pasteable research workflows for /mcp connect + agent first-turn pitches.
 * Each maps to live Lychee MCP flows/tools (not vaporware).
 */

export const CRAZY_WORKFLOWS = [
  {
    id: "whale_war_room",
    vibe: "Whale war room",
    hook: "Hottest market → who owns both sides → risk + trade hypotheses → publish.",
    flow_ids: ["active_market_deep_dive", "holder_concentration", "shareable_research"],
    tools: ["get_most_active_markets", "pull_market_bundle", "analyze_holders", "publish_project"],
    prompt: `Be my Lychee research assistant. Run the whale war room:
1) get_most_active_markets — pick #1 by 24h volume
2) pull_market_bundle early; PASTE share.open_now_markdown so I can click charts
3) analyze_holders — concentration, both-sides wallets, risk checklist, trade hypotheses
4) add_insight_blocks with your blunt take
5) Ask me one question (whale hunt vs exit vs lookalikes), then suggest 2–4 next pulls
6) Offer publish_project and PASTE publication.url + og_image_url
Never scrape venue HTML — only Lychee tools.`,
  },
  {
    id: "cross_venue_arbitrage_radar",
    vibe: "Cross-venue gap radar",
    hook: "Same theme on Kalshi + Polymarket — price/liquidity gaps, then charts on both.",
    flow_ids: ["cross_venue_gap", "kalshi_market_snapshot", "active_market_deep_dive"],
    tools: ["compare_venues", "preview_kalshi_market", "pull_market_bundle", "add_insight_blocks"],
    prompt: `Be my Lychee research assistant. Hunt Kalshi ↔ Polymarket gaps:
1) compare_venues on a hot theme (or ask me for one)
2) preview_kalshi_market + pull_market_bundle on the best matched hits
3) PASTE dashboard links; write gap notes via add_insight_blocks
4) Ask whether I want more themes, lookalike deadlines, or publish
Never scrape — only Lychee tools.`,
  },
  {
    id: "calibration_roast",
    vibe: "Calibration roast",
    hook: "Were 70% favorites actually right? Settled races → Brier → reliability chart → share.",
    flow_ids: ["calibration_postmortem", "shareable_research"],
    tools: ["search_closed_markets", "preview_prices", "analyze_calibration", "pull_and_compose", "publish_project"],
    prompt: `Be my Lychee research assistant. Roast market calibration:
1) search_closed_markets for a theme (ask me if unclear — elections, crypto, sports…)
2) For a sample of races, preview_prices and take last YES before a horizon (start 24h)
3) analyze_calibration → land reliability bands with pull_and_compose
4) PASTE charts; explain Brier in plain language; ask 24h vs 7d
5) Offer publish_project + PASTE share links
Only Lychee tools.`,
  },
  {
    id: "smart_money_stalker",
    vibe: "Smart-money stalker",
    hook: "Pick a wallet from holders → positions, tape, PnL → stalk their next moves.",
    flow_ids: ["holder_concentration", "trader_deep_dive", "shareable_research"],
    tools: ["get_most_active_markets", "preview_holders", "preview_trader", "pull_and_compose", "publish_project"],
    prompt: `Be my Lychee research assistant. Stalk smart money:
1) get_most_active_markets → pull holders on #1
2) Pick the most interesting proxy_wallet (size, both-sides, or recent aggressor)
3) preview_trader + pull_and_compose trader_positions / trader_activity / trader_pnl
4) PASTE dashboard; tell me what they're doing and the risk
5) Ask if I want another wallet, related markets, or publish
Only Lychee tools.`,
  },
  {
    id: "deadline_mispricing_mesh",
    vibe: "Deadline mispricing mesh",
    hook: "One event, many deadlines — pull 2–3 lookalikes and compare holder/price structure.",
    flow_ids: ["lookalike_deadlines", "holder_concentration", "price_and_book"],
    tools: ["get_most_active_markets", "get_lookalike_markets", "pull_market_bundle", "analyze_holders", "preview_prices"],
    prompt: `Be my Lychee research assistant. Map deadline mispricing:
1) get_most_active_markets → take a juicy event market
2) get_lookalike_markets for related deadlines
3) pull_market_bundle on 2–3 condition_ids; PASTE links
4) Compare holders + prices; hypothesize which deadline is mispriced
5) Ask me which contract to dig deeper or publish
Only Lychee tools.`,
  },
  {
    id: "microstructure_pulse",
    vibe: "Microstructure pulse",
    hook: "Book + tape + prices on one market — levels, aggression, then a live bot poll loop.",
    flow_ids: ["price_and_book", "bot_realtime_poll"],
    tools: [
      "get_most_active_markets",
      "preview_orderbook",
      "preview_prices",
      "preview_market_activity",
      "analyze_tape",
      "list_realtime_feeds",
      "get_realtime_snapshot",
      "pull_and_compose",
    ],
    prompt: `Be my Lychee research assistant. Microstructure pulse + bot path:
1) get_most_active_markets → #1
2) preview_orderbook + preview_prices + preview_market_activity; analyze_tape
3) pull_and_compose charts; PASTE share.open_now_markdown
4) list_realtime_feeds → show me one get_realtime_snapshot (trades or book) and explain bot_poll_hint_ms
5) Ask if I want a poll loop recipe or human-only research next
Only Lychee tools. MCP cannot hold vendor websockets — poll snapshots.`,
  },
  {
    id: "recipe_to_share_pack",
    vibe: "One-shot recipe → share pack",
    hook: "Flagship holder-analysis recipe in one shot, then a public research URL.",
    flow_ids: ["recipe_holder_analysis", "shareable_research"],
    tools: ["get_most_active_markets", "run_recipe_holder_analysis", "publish_project"],
    prompt: `Be my Lychee research assistant. One-shot research pack:
1) get_most_active_markets (or ask me for a condition_id)
2) run_recipe_holder_analysis
3) PASTE dashboard_url / open_now_markdown immediately
4) Summarize the recipe outputs; ask one steering question
5) publish_project when I say go — PASTE publication.url + og_image_url
Only Lychee tools.`,
  },
  {
    id: "agent_picks_three",
    vibe: "Surprise me — pitch 3",
    hook: "Agent lists live flows, pitches 3 ambitious workflows, then runs the one you pick.",
    flow_ids: ["active_market_deep_dive", "cross_venue_gap", "calibration_postmortem"],
    tools: ["list_research_flows", "list_crazy_workflows"],
    prompt: `Be my Lychee research assistant. First turn only:
1) Call list_crazy_workflows (or list_research_flows)
2) Pitch 3 ambitious workflows from the catalog — spicy titles, why they'd be cool, which tools
3) Do NOT pull heavy data until I pick one (or say "just pick for me")
4) After I pick: execute that workflow — charts early, PASTE links, analyze, ask, suggest next, offer publish
Never scrape venue HTML.`,
  },
];

export function listCrazyWorkflows({ id } = {}) {
  if (id) {
    const hit = CRAZY_WORKFLOWS.find((w) => w.id === String(id).trim());
    return hit ? { workflow: hit, count: 1 } : { workflow: null, count: 0, error: `Unknown workflow id ${id}` };
  }
  return {
    role: "Ambitious Lychee MCP workflows users can copy or ask the agent to pitch.",
    first_turn:
      "If the user is open-ended ('what can you do?', 'surprise me', connect-page start): call list_crazy_workflows, pitch 3 spicy options, wait for a pick — unless they already named a workflow.",
    workflows: CRAZY_WORKFLOWS.map(({ id: wid, vibe, hook, flow_ids, tools }) => ({
      id: wid,
      vibe,
      hook,
      flow_ids,
      tools,
    })),
    count: CRAZY_WORKFLOWS.length,
  };
}

/** Agent-facing pitch lines (no full prompts — keep chat short). */
export function pitchCrazyWorkflows(limit = 3) {
  const n = Math.max(1, Math.min(CRAZY_WORKFLOWS.length, Number(limit) || 3));
  // Prefer a varied set: war room, cross-venue, calibration, then rotate others.
  const preferred = ["whale_war_room", "cross_venue_arbitrage_radar", "calibration_roast", "smart_money_stalker"];
  const ordered = [
    ...preferred.map((id) => CRAZY_WORKFLOWS.find((w) => w.id === id)).filter(Boolean),
    ...CRAZY_WORKFLOWS.filter((w) => !preferred.includes(w.id)),
  ];
  return ordered.slice(0, n).map((w, i) => ({
    rank: i + 1,
    id: w.id,
    vibe: w.vibe,
    hook: w.hook,
    start_with: w.tools.slice(0, 3),
  }));
}

export function findCrazyWorkflow(id) {
  return CRAZY_WORKFLOWS.find((w) => w.id === String(id || "").trim()) || null;
}
