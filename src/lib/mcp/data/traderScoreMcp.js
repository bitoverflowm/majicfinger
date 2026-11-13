/**
 * Server-side Lychee Skill Score for MCP (DATA API — no browser /api session).
 * Mirrors holder-terminal traderScore.js math.
 */
import { traderScore, SKILL_SCORE_NAME, scoreTier, SCORE_TIERS } from "@/components/terminals/holder/traderScore";
import { positionSheetRow } from "@/lib/polymarketLive/traderPositionsCompose";

const DATA_API_BASE = (process.env.POLYMARKET_DATA_API_URL || "https://data-api.polymarket.com").replace(/\/$/, "");
const PAGE = 100;
const MAX_PAGES = 3;

async function fetchPositionsPage(user, { status, cursor = "" } = {}) {
  const params = new URLSearchParams({
    user,
    limit: String(PAGE),
    status: String(status || "open").toLowerCase(),
  });
  if (status === "closed" || status === "CLOSED") {
    params.set("sort_by", "TIMESTAMP");
    params.set("sort_direction", "DESC");
  }
  if (cursor) params.set("cursor", cursor);
  const res = await fetch(`${DATA_API_BASE}/v2/positions?${params}`, {
    headers: { accept: "application/json" },
  });
  const text = await res.text().catch(() => "");
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  if (!res.ok) {
    const err = new Error(body?.error || body?.message || text || `positions ${res.status}`);
    err.code = body?.code || null;
    throw err;
  }
  const rows = Array.isArray(body?.data) ? body.data : Array.isArray(body) ? body : [];
  const more = body?.pagination?.has_more ?? body?.pagination_has_more;
  const next = body?.pagination?.next_cursor ?? body?.pagination_next_cursor;
  return { rows, next: more && next ? String(next) : "" };
}

async function walk(user, status, maxPages = MAX_PAGES) {
  const out = [];
  let cursor = "";
  let truncated = false;
  for (let i = 0; i < maxPages; i++) {
    const page = await fetchPositionsPage(user, { status, cursor });
    out.push(...page.rows);
    if (!page.next) return { rows: out, truncated };
    cursor = page.next;
    truncated = i === maxPages - 1;
  }
  return { rows: out, truncated };
}

function lastEvent(row) {
  const at = Number(row?.last_event_at);
  return Number.isFinite(at) ? at : null;
}

/**
 * @param {string} proxyWallet
 * @param {{ exclude_condition_id?: string }} [opts]
 */
export async function getLycheeSkillScore(proxyWallet, { exclude_condition_id = "" } = {}) {
  const user = String(proxyWallet || "").trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(user)) throw new Error("proxy_wallet must be 0x…40 hex");

  let closed;
  let open;
  try {
    [closed, open] = await Promise.all([walk(user, "closed"), walk(user, "open")]);
  } catch (err) {
    if (/protocol contract|invalid_request/i.test(err?.message || "")) {
      throw new Error(
        `${err.message} — not a tradeable proxy. Pick another holder; do not magic-link login.`,
      );
    }
    throw err;
  }

  const skip = String(exclude_condition_id || "").toLowerCase();
  const since = closed.truncated
    ? Math.min(...closed.rows.map(lastEvent).filter((at) => at != null), Infinity)
    : -Infinity;
  const unredeemed = open.rows.filter(
    (row) =>
      String(row?.status || "").toUpperCase() === "REDEEMABLE" &&
      (lastEvent(row) ?? Infinity) >= since,
  );
  const finished = [...closed.rows, ...unredeemed].filter(
    (row) => String(row?.condition_id || "").toLowerCase() !== skip,
  );

  const scored = traderScore(finished);
  const sample = finished.slice(0, 8).map((row) => positionSheetRow(row, user));

  return {
    proxy_wallet: user,
    source: "lychee:skill-score",
    score_name: SKILL_SCORE_NAME,
    score: scored?.score ?? null,
    tier: scored ? scoreTier(scored.score) : null,
    tiers_legend: SCORE_TIERS.map((t) => ({ min: t.min, max: t.max, label: t.label })),
    detail: scored
      ? {
          z: scored.z,
          effective_bets: scored.effectiveBets,
          finished_positions: scored.positions,
          win_rate: scored.winRate,
          pnl: scored.pnl,
          edge_per_share: scored.edge,
          recent_sample_only: !!closed.truncated,
        }
      : null,
    finished_count: finished.length,
    closed_pulled: closed.rows.length,
    open_pulled: open.rows.length,
    sample_finished: sample,
    caveats: [
      "Score uses finished positions (CLOSED + redeemable in-window). Open books alone are not enough.",
      closed.truncated ? "Closed history was truncated to recent pages — score is on a recent sample." : null,
      "±20 ≈ two-sigma outlier vs a fair-odds null. Not financial advice.",
    ].filter(Boolean),
    next: {
      compose: "pull_trader_bundle with include_closed=true",
      theme: "analyze_trader_theme for Fed/macro subsets",
      news: "search_news for headline overlay",
    },
  };
}
