import { parseMentionIntent } from "./intent.js";
import { jarvisPulse } from "@/lib/mcp/data/jarvis";
import {
  getMostActivePolymarketMarkets,
  searchPolymarket,
  getPolymarketMarketByCondition,
  getPolymarketHolders,
} from "@/lib/mcp/data/providers";
import { compareVenues } from "@/lib/mcp/data/compareVenues";
import { analyzeHolders } from "@/lib/mcp/data/stats";

/**
 * Execute a bounded Jarvis social pack from a mention intent.
 * Never posts — returns draft text + research payload for dry-run / deliver.
 */
export async function runXJarvisJob({
  text = "",
  parent_text = "",
  author_handle = "",
  deliver_default = "public_reply",
  live = false,
} = {}) {
  const intent = parseMentionIntent({ text, parent_text, author_handle, deliver_default });
  const as_of = new Date().toISOString();

  if (intent.mode === "clarify") {
    return {
      as_of,
      intent,
      status: "needs_clarification",
      draft_reply: intent.ask_user,
      research: null,
      live,
    };
  }

  let research = { kind: intent.mode };
  let draft = "";

  try {
    if (intent.mode === "pulse") {
      const pulse = await jarvisPulse({ limit: 6 });
      const top = (pulse.alerts || []).slice(0, 3);
      research = { kind: "pulse", alerts: top };
      draft = formatPulseReply(top);
    } else if (intent.mode === "gap") {
      const q = intent.subject.query || intent.subject.ticker || "election";
      const compared = await compareVenues({
        query: q,
        ticker: intent.subject.ticker || "",
        conditionId: intent.subject.condition_id || "",
        limit: 4,
      });
      research = { kind: "gap", compared };
      draft = formatGapReply(compared, q);
    } else if (intent.mode === "holders" || intent.mode === "research") {
      let conditionId = intent.subject.condition_id || "";
      let market = null;
      if (!conditionId) {
        const q = intent.subject.query || "active";
        const hits = await searchPolymarket(q, { limit: 5 });
        const top = hits[0] || (await getMostActivePolymarketMarkets({ limit: 1 }))[0];
        conditionId = top?.condition_id || "";
        market = top || null;
      }
      if (!conditionId) {
        draft = "Couldn't resolve a Polymarket condition_id from that mention — reply with a market link or clearer name.";
        research = { kind: intent.mode, error: "no_condition" };
      } else {
        market = market || (await getPolymarketMarketByCondition(conditionId));
        const holders = await getPolymarketHolders(conditionId, { limit: 200 });
        const analysis = analyzeHolders(holders.rows, { marketTitle: market?.title });
        research = {
          kind: intent.mode,
          market: { title: market?.title, condition_id: conditionId },
          holders_count: holders.count,
          inferences: analysis.inferences.slice(0, 3),
          hypotheses: analysis.trade_hypotheses.slice(0, 2),
        };
        draft = formatResearchReply(research);
      }
    } else if (intent.mode === "calibrate") {
      const q = intent.subject.query || "election";
      draft = `Calibration pack queued for “${q}” — open Lychee MCP / search_closed_markets for settled races + Brier. (Social v1 returns a CTA; full chart pack lands in Lychee.)`;
      research = { kind: "calibrate", query: q };
    } else {
      const pulse = await jarvisPulse({ limit: 4 });
      research = { kind: "fallback_pulse", alerts: pulse.alerts?.slice(0, 2) };
      draft = formatPulseReply(research.alerts || []);
    }
  } catch (err) {
    draft = `Jarvis hit a snag pulling Lychee data (${err?.message || "error"}). Try again or open lycheedata.com/mcp.`;
    research = { kind: "error", message: err?.message || String(err) };
  }

  // Soft CTA — tasteful, not spammy
  if (draft && !draft.includes("lycheedata.com")) {
    draft = `${draft.trim()} → lycheedata.com/jarvis`;
  }

  return {
    as_of,
    intent,
    status: "draft_ready",
    draft_reply: draft.slice(0, 260),
    research,
    live: false,
    note: live
      ? "Live mode requested — cron/poll will post via JARVIS_TWITTER_* OAuth when X_JARVIS_LIVE=1."
      : "Dry-run only. Review draft_reply; cron with live=1 posts when JARVIS_TWITTER_* + X_JARVIS_LIVE=1 are set.",
  };
}

function formatPulseReply(alerts) {
  if (!alerts?.length) return "Jarvis scanned Lychee — nothing spicy enough to ping you on yet.";
  const a = alerts[0];
  const extra = alerts[1] ? ` Also watching: ${alerts[1].headline}.` : "";
  return `Hey — ${a.headline}. ${a.detail || a.why_interesting || ""}${extra}`.replace(/\s+/g, " ").trim();
}

function formatGapReply(compared, q) {
  const hits = compared?.candidates || compared?.matches || [];
  const n = Array.isArray(hits) ? hits.length : 0;
  return n
    ? `Cross-venue scan on "${q}": ${n} Lychee match(es). Open Lychee for the gap chart + pull hints.`
    : `Ran a Kalshi↔Polymarket gap look for "${q}" — thin matches. Try a ticker or clearer theme.`;
}

function formatResearchReply(research) {
  const title = research.market?.title || "that market";
  const line = research.inferences?.[0] || "Holders pulled via Lychee.";
  const hypo = research.hypotheses?.[0]?.idea;
  return `On ${title}: ${line}${hypo ? ` Trade idea (not advice): ${hypo}.` : ""}`.slice(0, 220);
}

/** Offline-safe fixture runner for tests (no network). */
export function draftFromIntentOnly(intent, { marketTitle = "Test market" } = {}) {
  if (intent.mode === "clarify") return intent.ask_user;
  if (intent.mode === "pulse") return "Hey — hottest markets moved. Open Lychee for the brief.";
  return `On ${marketTitle}: Jarvis draft ready. → lycheedata.com/jarvis`;
}
