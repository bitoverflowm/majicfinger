/**
 * Holder Terminal grouping for live positions: one bucket per parent event
 * (event_id, else event_slug), summing value/PnL across outcome markets.
 */

const WALLET_RE = /^0x[a-fA-F0-9]{40}$/;

export function isProxyWallet(value) {
  return WALLET_RE.test(String(value || "").trim());
}

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function round2(value) {
  return Math.round(num(value) * 100) / 100;
}

function text(value) {
  return String(value ?? "").trim();
}

/** Rank Gamma public-search profiles: exact name / handle / xUsername first. */
export function rankProfileHits(profiles, query) {
  const q = text(query).replace(/^@/, "").toLowerCase();
  const rows = (Array.isArray(profiles) ? profiles : [])
    .map((p) => {
      const wallet = text(p?.proxyWallet || p?.proxy_wallet).toLowerCase();
      if (!isProxyWallet(wallet)) return null;
      const name = text(p.name);
      const pseudonym = text(p.pseudonym);
      const xUsername = text(p.xUsername || p.x_username).replace(/^@/, "");
      const hay = [name, pseudonym, xUsername].map((s) => s.toLowerCase());
      const exact = Boolean(q) && hay.some((s) => s === q);
      const prefix = Boolean(q) && hay.some((s) => s.startsWith(q));
      return {
        proxy_wallet: wallet,
        name: name || pseudonym || null,
        pseudonym: pseudonym || null,
        x_username: xUsername || null,
        bio: text(p.bio) || null,
        verified: Boolean(p.verifiedBadge || p.verified_badge),
        exact,
        prefix,
      };
    })
    .filter(Boolean);
  rows.sort((a, b) => Number(b.exact) - Number(a.exact) || Number(b.prefix) - Number(a.prefix) || String(a.name || "").localeCompare(String(b.name || "")));
  return rows;
}

/**
 * Group live (or closed) position rows the way Holder Terminal rolls them up:
 * parent event first, then list each market outcome inside.
 */
export function groupPositionsByEvent(positions) {
  const groups = new Map();
  for (const raw of Array.isArray(positions) ? positions : []) {
    const eventId = text(raw?.event_id);
    const eventSlug = text(raw?.event_slug);
    const conditionId = text(raw?.condition_id);
    const key = eventId || eventSlug || conditionId || text(raw?.title) || "unknown";
    let group = groups.get(key);
    if (!group) {
      group = {
        event_id: eventId || null,
        event_slug: eventSlug || null,
        title: text(raw?.title) || eventSlug || null,
        markets: 0,
        current_value: 0,
        total_pnl: 0,
        unrealized_pnl: 0,
        realized_pnl: 0,
        outcomes: [],
      };
      groups.set(key, group);
    }
    const currentValue = num(raw?.current_value);
    const totalPnl = num(raw?.total_pnl);
    const unrealized = num(raw?.unrealized_pnl);
    const realized = num(raw?.realized_pnl);
    group.markets += 1;
    group.current_value += currentValue;
    group.total_pnl += totalPnl;
    group.unrealized_pnl += unrealized;
    group.realized_pnl += realized;
    if (eventSlug && !group.event_slug) group.event_slug = eventSlug;
    if (eventId && !group.event_id) group.event_id = eventId;
    group.outcomes.push({
      title: text(raw?.title) || null,
      outcome: text(raw?.outcome) || null,
      status: text(raw?.status) || null,
      current_size: round2(raw?.current_size),
      current_value: round2(currentValue),
      total_pnl: round2(totalPnl),
      condition_id: conditionId || null,
    });
  }
  return [...groups.values()]
    .map((group) => ({
      ...group,
      current_value: round2(group.current_value),
      total_pnl: round2(group.total_pnl),
      unrealized_pnl: round2(group.unrealized_pnl),
      realized_pnl: round2(group.realized_pnl),
    }))
    .sort((a, b) => Math.abs(b.current_value) - Math.abs(a.current_value));
}
