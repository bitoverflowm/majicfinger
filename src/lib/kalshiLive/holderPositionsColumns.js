import { KALSHI_LIVE_METRIC_DOLLAR_SCALE } from "@/lib/kalshiLive/holderProfileColumns";

/** Holdings pages hold up to 100 events. */
export const KALSHI_LIVE_HOLDER_POSITIONS_PAGE_SIZE_MAX = 100;

export const KALSHI_LIVE_HOLDER_POSITION_STATUSES = ["open", "closed", "all"];

/**
 * One row per market a trader holds or held, from GET /v1/social/profile/holdings.
 * Most traders keep holdings hidden; those rows come back with visibility "hidden" and no market.
 */
export const KALSHI_LIVE_HOLDER_POSITIONS_COLUMNS = [
  { name: "nickname", type: "string", description: "Trader nickname" },
  { name: "social_id", type: "string", description: "Social profile id" },
  { name: "visibility", type: "string", description: "visible, or hidden when the trader keeps holdings private" },
  { name: "status", type: "string", description: "open or closed" },
  { name: "event_ticker", type: "string", description: "Event ticker", label: "event" },
  { name: "series_ticker", type: "string", description: "Series ticker", label: "series" },
  { name: "market_ticker", type: "string", description: "Market ticker", label: "market" },
  { name: "market_id", type: "string", description: "Market UUID" },
  { name: "side", type: "string", description: "YES for a long position, NO for a short one" },
  { name: "position", type: "number", description: "Contracts held (absolute)" },
  { name: "signed_position", type: "number", description: "Contracts held; negative is NO", label: "signed position" },
  { name: "event_position", type: "number", description: "Absolute contracts across the event", label: "event position" },
  { name: "pnl", type: "number", description: "Profit and loss on this market, in dollars" },
];

/** @param {unknown} raw */
export function normalizeKalshiLiveHolderPositionStatus(raw) {
  const value = String(raw || "").trim().toLowerCase();
  return KALSHI_LIVE_HOLDER_POSITION_STATUSES.includes(value) ? value : "open";
}

/**
 * Flatten one holdings page into market rows.
 *
 * @param {Record<string, unknown> | null | undefined} payload
 * @param {{ nickname?: string; status?: string }} [opts]
 */
export function normalizeKalshiLiveHolderPositionRows(payload, opts = {}) {
  const root = payload && typeof payload === "object" ? payload : {};
  const nickname = String(opts.nickname || root.nickname || "");
  const socialId = root.social_id == null ? "" : String(root.social_id);
  const visibility = String(root.visibility_state || "").toLowerCase().includes("hidden") ? "hidden" : "visible";
  const status = opts.status === "closed" ? "closed" : "open";
  const num = (v) => {
    if (v == null || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const rows = [];
  for (const event of Array.isArray(root.holdings) ? root.holdings : []) {
    if (!event || typeof event !== "object") continue;
    const eventPosition = num(event.total_absolute_position_fp) ?? num(event.total_absolute_position);
    for (const market of Array.isArray(event.market_holdings) ? event.market_holdings : []) {
      if (!market || typeof market !== "object") continue;
      const signed = num(market.signed_open_position_fp) ?? num(market.signed_open_position);
      const pnl = num(market.pnl);
      rows.push({
        nickname,
        social_id: socialId,
        visibility,
        status,
        event_ticker: String(event.event_ticker || ""),
        series_ticker: String(event.series_ticker || ""),
        market_ticker: String(market.market_ticker || ""),
        market_id: String(market.market_id || ""),
        side: signed == null || signed === 0 ? "" : signed > 0 ? "YES" : "NO",
        position: signed == null ? null : Math.abs(signed),
        signed_position: signed,
        event_position: eventPosition,
        pnl: pnl == null ? null : Math.round((pnl / KALSHI_LIVE_METRIC_DOLLAR_SCALE) * 100) / 100,
      });
    }
  }
  return rows;
}

/** The row a hidden trader gets, so the sheet says why it is empty. */
export function kalshiLiveHiddenPositionRow(nickname, socialId = "") {
  return {
    nickname: String(nickname || ""),
    social_id: String(socialId || ""),
    visibility: "hidden",
    status: "",
    event_ticker: "",
    series_ticker: "",
    market_ticker: "",
    market_id: "",
    side: "",
    position: null,
    signed_position: null,
    event_position: null,
    pnl: null,
  };
}
