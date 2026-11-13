const BANNED =
  /pull_market_bundle|condition_id|analysis_ready|undefined|NaN|0 wallets|snag pulling|Also watching:\s*Also moving/i;

function nonempty(s) {
  return String(s || "").trim().length > 0;
}

/**
 * Block empty / internal / irrelevant drafts before X post or MCP "ready to send".
 * @param {object} pack
 */
export function gateResearchPack(pack) {
  const issues = [];
  const draft = String(pack?.draft_reply || pack?.x_reply || "");
  const verdict = pack?.verdict || "";
  const markets = Array.isArray(pack?.markets) ? pack.markets : [];
  const take = String(pack?.take || "");

  if (!pack || pack.error) issues.push(pack?.error || "empty pack");
  if (BANNED.test(draft) || BANNED.test(take)) issues.push("internal_or_empty_copy");
  if (draft.includes("…") && /lycheedat$/i.test(draft.trim())) issues.push("truncated_cta");

  const usableMarkets = markets.filter((m) => nonempty(m.title) && (m.venue === "kalshi" || m.venue === "polymarket"));
  if (["market_for", "news_impact", "lookalikes", "gap", "research"].includes(pack?.intent?.mode)) {
    if (!usableMarkets.length && verdict !== "none" && verdict !== "clarify") {
      issues.push("no_markets_without_none_verdict");
    }
  }
  if (usableMarkets.some((m) => m.relevance != null && m.relevance < 0.12 && pack.verdict === "listed")) {
    issues.push("listed_but_low_relevance");
  }
  if (!nonempty(draft) && pack.status !== "needs_clarification") issues.push("empty_draft");

  const can_post = issues.length === 0 && pack?.status !== "needs_clarification" && nonempty(draft);
  return { ok: can_post, can_post, issues };
}
