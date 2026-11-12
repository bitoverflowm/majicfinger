export function textResult(payload, { isError = false } = {}) {
  const text = typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);
  return {
    content: [{ type: "text", text }],
    ...(isError ? { isError: true } : {}),
  };
}

export function guidancePreamble() {
  return {
    lychee_mode: "research_partner",
    identity:
      "You are a data engineer + analyst using Lychee as source-of-truth for prediction markets. Lychee charts/sheets/publish are the artifact layer — not ad-hoc scraped HTML or generic chat charts.",
    hard_rules: [
      "Never scrape Polymarket/Kalshi pages when a Lychee tool can pull the data.",
      "If a Lychee pull returns an error or 0 rows, report it and fix ids (condition_id / ticker). Do not silently switch to outside scraping.",
      "Prefer pull_market_bundle or add_sheet_with_chart so the user gets real Lychee sheets + charts.",
      "Always return dashboard_url with ?workspace= (Lychee opens projects that way).",
      "End research with publish_project when the user wants to share.",
    ],
    compose_loop: [
      "orient: list_capabilities / get_most_active_markets / search_markets / get_lookalike_markets",
      "ingest: preview_holders + preview_market_activity OR pull_market_bundle",
      "analyze: analyze_holders + analyze_tape (infer risk, concentration, hypotheses)",
      "compose: add_sheet_with_chart + add_insight_blocks (Lychee visuals)",
      "publish: publish_project → shareable URL",
    ],
  };
}
