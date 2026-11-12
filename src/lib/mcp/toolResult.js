import { assistantTurnContract, lycheeMcpInstructions } from "./instructions.js";
import { linkLeadText, sharePayloadFromResult } from "./shareLinks.js";

export function textResult(payload, { isError = false, share } = {}) {
  const resolvedShare = share || (payload && typeof payload === "object" ? sharePayloadFromResult(payload) : null);
  const lead = resolvedShare ? linkLeadText(resolvedShare) : "";
  const body = typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);
  const text = lead ? `${lead}${body}` : body;
  const content = [{ type: "text", text }];

  // Clickable resource links for clients that render them (in addition to markdown).
  if (resolvedShare?.dashboard_url) {
    content.push({
      type: "resource_link",
      uri: resolvedShare.dashboard_url,
      name: "lychee-workspace",
      title: "Open Lychee charts",
      description: "Workspace dashboard with live Lychee sheets/charts (?workspace=)",
      mimeType: "text/html",
    });
  }
  if (resolvedShare?.publish_url) {
    content.push({
      type: "resource_link",
      uri: resolvedShare.publish_url,
      name: "lychee-publish",
      title: "Shareable Lychee research",
      description: "Published research URL for friends",
      mimeType: "text/html",
    });
  }
  if (resolvedShare?.og_image_url) {
    content.push({
      type: "resource_link",
      uri: resolvedShare.og_image_url,
      name: "lychee-preview",
      title: "Research preview image",
      description: "OG / share preview image agents can surface in chat",
      mimeType: "image/png",
    });
  }

  return {
    content,
    ...(isError ? { isError: true } : {}),
  };
}

export function guidancePreamble() {
  return {
    lychee_mode: "research_assistant",
    identity:
      "You are the Lychee research assistant: pull source-of-truth data, land Lychee charts as you go, analyze on top, walk the user through sources, and invite questions.",
    walkthrough: [
      "If the user is open-ended: pitch 3 crazy workflows from list_crazy_workflows before heavy pulls",
      "Name the Lychee tools/sources you used for this step",
      "Paste open_now_markdown / dashboard_url as a clickable markdown link in your reply (do not only mention it)",
      "Interpret findings in plain language (you may compute on Lychee rows)",
      "Ask one steering question",
      "Suggest 2–4 concrete next pulls (and offer a wilder workflow pivot when useful)",
    ],
    hard_rules: [
      "Never scrape Polymarket/Kalshi pages when a Lychee tool/dataset can pull the data.",
      "If list_capabilities lists a tool, call it by exact name — do not invent a 'tool not exposed' gap unless the call failed.",
      "For hottest / top volume markets: ALWAYS call get_most_active_markets (not search_markets with the word hottest).",
      "If a Lychee pull returns an error or 0 rows, report it and fix ids (condition_id / ticker / proxy_wallet).",
      "Prefer named research flows / crazy workflows and pull_market_bundle / pull_and_compose / recipes so the user gets real Lychee sheets + charts early.",
      "Whenever dashboard_url or publish_url is present, paste it as markdown: [label](url) so the user can click it.",
      "End with publish_project when the user wants to share — then paste publication.url as markdown.",
    ],
    compose_loop: [
      "pitch (open-ended): list_crazy_workflows → offer 3 spicy options",
      "orient: list_research_flows / list_datasets / get_most_active_markets / search / closed / compare_venues",
      "ingest+chart: pull_market_bundle / pull_and_compose / recipes / preview_*",
      "analyze: analyze_holders / analyze_tape / analyze_calibration (or your own stats on Lychee rows)",
      "walk: narrate sources → PASTE links → ask → suggest_next",
      "publish: publish_project → PASTE shareable URL",
      "bots: list_realtime_feeds → poll get_realtime_snapshot",
    ],
    instructions_excerpt: lycheeMcpInstructions().split("\n").slice(0, 8).join(" "),
  };
}

export function withAssistantTurn(payload, meta = {}) {
  const share = sharePayloadFromResult({ ...payload, ...meta });
  return {
    ...guidancePreamble(),
    ...assistantTurnContract({
      sources: meta.sources || [],
      dashboard_url: share.dashboard_url || "",
      suggest: meta.suggest || [],
    }),
    share,
    ...payload,
  };
}
