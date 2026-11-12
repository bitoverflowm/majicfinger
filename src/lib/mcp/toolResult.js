import { assistantTurnContract, lycheeMcpInstructions } from "./instructions.js";
import { linkLeadText, sharePayloadFromResult } from "./shareLinks.js";
import { chartLeadMarkdown, collectChartImages } from "./chartSnapshots.js";

function stripHeavyImages(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return payload;
  const clone = { ...payload };
  delete clone.chart_images;
  delete clone.jarvis_power_up;
  if (clone.chart_snapshot?.image) {
    clone.chart_snapshot = {
      title: clone.chart_snapshot.title,
      chart_view: clone.chart_snapshot.chart_view,
      markdown: clone.chart_snapshot.markdown,
      note: "Inline image attached as MCP image content — paste chart markdown into your reply.",
    };
  }
  if (Array.isArray(clone.sheets)) {
    clone.sheets = clone.sheets.map((sheet) => {
      if (!sheet || typeof sheet !== "object") return sheet;
      const next = { ...sheet };
      delete next.chart_images;
      if (next.chart_snapshot?.image) {
        next.chart_snapshot = {
          title: next.chart_snapshot.title,
          chart_view: next.chart_snapshot.chart_view,
          markdown: next.chart_snapshot.markdown,
        };
      }
      return next;
    });
  }
  if (clone.composed?.chart_snapshot?.image) {
    clone.composed = {
      ...clone.composed,
      chart_snapshot: {
        title: clone.composed.chart_snapshot.title,
        chart_view: clone.composed.chart_snapshot.chart_view,
        markdown: clone.composed.chart_snapshot.markdown,
      },
    };
  }
  if (clone.result?.chart_snapshot?.image) {
    clone.result = {
      ...clone.result,
      chart_snapshot: {
        title: clone.result.chart_snapshot.title,
        chart_view: clone.result.chart_snapshot.chart_view,
        markdown: clone.result.chart_snapshot.markdown,
      },
    };
  }
  return clone;
}

export function textResult(payload, { isError = false, share, images } = {}) {
  const resolvedShare = share || (payload && typeof payload === "object" ? sharePayloadFromResult(payload) : null);
  const chartImages = [
    ...(images || []),
    ...(payload && typeof payload === "object" ? collectChartImages(payload) : []),
  ];
  const leadParts = [];
  if (resolvedShare) {
    const shareLead = linkLeadText(resolvedShare);
    if (shareLead) leadParts.push(shareLead.trimEnd());
  }
  const chartLead = chartLeadMarkdown(chartImages);
  if (chartLead) {
    leadParts.push(chartLead);
    leadParts.push("_Inline chart image(s) above — show them in your reply when you mention Chart N. Do not only link._");
  }
  const lead = leadParts.length ? `${leadParts.join("\n\n")}\n\n` : "";
  const body =
    typeof payload === "string" ? payload : JSON.stringify(stripHeavyImages(payload), null, 2);
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

  for (const img of chartImages.slice(0, 6)) {
    content.push({
      type: "image",
      data: img.data,
      mimeType: img.mimeType || "image/svg+xml",
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
      "On session start / open-ended: ask \"Would you like to turn Jarvis mode on?\" then pitch crazy workflows if they decline",
      "If Jarvis is on: call jarvis_pulse at the start of every turn and narrate 1–3 unprompted alerts",
      "Name the Lychee tools/sources you used for this step",
      "When you mention Chart N, show the inline chart image / chart_snapshot.markdown from the tool result (Higgsfield-style — not a bare link)",
      "Paste open_now_markdown / dashboard_url as well so they can open the full Lychee workspace",
      "Interpret findings in plain language on FULL analysis rows (not tiny previews)",
      "Ask one steering question",
      "Suggest 2–4 concrete next pulls (and offer a wilder workflow pivot when useful)",
    ],
    hard_rules: [
      "Never scrape Polymarket/Kalshi pages when a Lychee tool/dataset can pull the data.",
      "If list_capabilities lists a tool, call it by exact name — do not invent a 'tool not exposed' gap unless the call failed.",
      "Jarvis missing from your tool list? Call list_capabilities with action=jarvis_on or action=jarvis_pulse — never tell the user it is unavailable.",
      "For hottest / top volume markets: ALWAYS call get_most_active_markets (not search_markets with the word hottest).",
      "If a Lychee pull returns an error or 0 rows, report it and fix ids (condition_id / ticker / proxy_wallet).",
      "Prefer named research flows / crazy workflows and pull_market_bundle / pull_and_compose / recipes so the user gets real Lychee sheets + charts early.",
      "Use Lychee chart presets (trade-price, treemap, price, order-book, liveline) — not homemade blue bar dumps.",
      "Analysis/charting may pull full live datasets; only prepare_full_pull / Athena dumps need confirm + spend gates.",
      "Whenever dashboard_url or publish_url is present, paste it as markdown: [label](url) so the user can click it.",
      "End with publish_project when the user wants to share — then paste publication.url as markdown.",
    ],
    compose_loop: [
      "session: ask Jarvis on? → jarvis_on power-up → jarvis_pulse",
      "pitch (open-ended): list_crazy_workflows → offer 3 spicy options",
      "orient: list_research_flows / list_datasets / get_most_active_markets / search / closed / compare_venues",
      "ingest+chart: pull_market_bundle / pull_and_compose / recipes (inline chart images)",
      "analyze: analyze_holders / analyze_tape / analyze_calibration on full rows",
      "walk: narrate sources → SHOW charts → PASTE workspace links → ask → suggest_next",
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
