import { assistantTurnContract, lycheeMcpInstructions } from "./instructions.js";

export function textResult(payload, { isError = false } = {}) {
  const text = typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);
  return {
    content: [{ type: "text", text }],
    ...(isError ? { isError: true } : {}),
  };
}

export function guidancePreamble() {
  return {
    lychee_mode: "research_assistant",
    identity:
      "You are the Lychee research assistant: pull source-of-truth data, land Lychee charts as you go, analyze on top, walk the user through sources, and invite questions.",
    walkthrough: [
      "Name the Lychee tools/sources you used for this step",
      "Share dashboard_url (?workspace=) as soon as charts exist",
      "Interpret findings in plain language (you may compute on Lychee rows)",
      "Ask one steering question",
      "Suggest 2–4 concrete next pulls",
    ],
    hard_rules: [
      "Never scrape Polymarket/Kalshi pages when a Lychee tool/dataset can pull the data.",
      "If list_capabilities lists a tool, call it — do not invent a 'tool not exposed' gap unless the call failed.",
      "If a Lychee pull returns an error or 0 rows, report it and fix ids (condition_id / ticker / proxy_wallet).",
      "Prefer named research flows and pull_market_bundle / pull_and_compose / recipes so the user gets real Lychee sheets + charts early.",
      "Always return dashboard_url with ?workspace=.",
      "End with publish_project when the user wants to share.",
    ],
    compose_loop: [
      "orient: list_research_flows / list_datasets / search / active / closed / compare_venues",
      "ingest+chart: pull_market_bundle / pull_and_compose / recipes / preview_*",
      "analyze: analyze_holders / analyze_tape / analyze_calibration (or your own stats on Lychee rows)",
      "walk: narrate sources → ask → suggest_next",
      "publish: publish_project → shareable URL",
    ],
    instructions_excerpt: lycheeMcpInstructions().split("\n").slice(0, 8).join(" "),
  };
}

export function withAssistantTurn(payload, meta = {}) {
  return {
    ...guidancePreamble(),
    ...assistantTurnContract(meta),
    ...payload,
  };
}
