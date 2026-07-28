import { getKalshiLiveSearchTradersColumns } from "@/lib/kalshiLive/searchTradersColumns";

/**
 * @param {Record<string, unknown> | null | undefined} profile
 * @param {Record<string, unknown> | null | undefined} [metricsPayload]
 * @param {Record<string, unknown> | null | undefined} [holding]
 * @param {{ includeMetrics?: boolean; includeHoldings?: boolean; closedPositions?: boolean }} [opts]
 */
export function normalizeKalshiLiveSearchTradersRow(
  profile,
  metricsPayload,
  holding,
  opts = {},
) {
  const p = profile && typeof profile === "object" ? profile : {};
  const metricsRoot =
    metricsPayload && typeof metricsPayload === "object" ? metricsPayload : {};
  const metrics =
    metricsRoot.metrics && typeof metricsRoot.metrics === "object"
      ? /** @type {Record<string, unknown>} */ (metricsRoot.metrics)
      : {};
  const h = holding && typeof holding === "object" ? holding : {};

  const asNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const asInt = (v) => {
    const n = Math.floor(Number(v));
    return Number.isFinite(n) ? n : null;
  };

  /** @type {Record<string, unknown>} */
  const row = {
    nickname: p.nickname == null ? "" : String(p.nickname),
    profile_image_path:
      p.profile_image_path == null ? "" : String(p.profile_image_path),
  };

  if (opts.includeMetrics) {
    row.volume = asNum(metrics.volume);
    row.volume_fp = metrics.volume_fp == null ? "" : String(metrics.volume_fp);
    row.pnl = asNum(metrics.pnl);
    row.dollars_traded = asNum(metrics.dollars_traded);
    row.open_interest = asNum(metrics.open_interest);
    row.open_interest_fp =
      metrics.open_interest_fp == null ? "" : String(metrics.open_interest_fp);
    row.num_markets_traded = asInt(metrics.num_markets_traded);
    row.metrics_social_id =
      metricsRoot.social_id == null ? "" : String(metricsRoot.social_id);
  }

  if (opts.includeHoldings) {
    row.holdings_visibility_state =
      h.holdings_visibility_state == null ? "" : String(h.holdings_visibility_state);
    row.holdings_social_id =
      h.holdings_social_id == null ? "" : String(h.holdings_social_id);
    row.closed_positions = Boolean(opts.closedPositions ?? h.closed_positions);
    row.event_ticker = h.event_ticker == null ? "" : String(h.event_ticker);
    row.series_ticker = h.series_ticker == null ? "" : String(h.series_ticker);
    row.total_absolute_position = asNum(h.total_absolute_position);
    row.total_absolute_position_fp =
      h.total_absolute_position_fp == null ? "" : String(h.total_absolute_position_fp);
    row.market_id = h.market_id == null ? "" : String(h.market_id);
    row.market_ticker = h.market_ticker == null ? "" : String(h.market_ticker);
    row.signed_open_position = asNum(h.signed_open_position);
    row.signed_open_position_fp =
      h.signed_open_position_fp == null ? "" : String(h.signed_open_position_fp);
    row.holding_pnl = asNum(h.holding_pnl);
  }

  return row;
}

/**
 * Flatten holdings payload into market-level holding stubs.
 *
 * @param {{
 *   holdings?: unknown[];
 *   visibility_state?: string;
 *   social_id?: string;
 * } | null | undefined} payload
 * @param {{ closedPositions?: boolean }} [opts]
 * @returns {Record<string, unknown>[]}
 */
export function flattenKalshiLiveSearchTraderHoldings(payload, opts = {}) {
  const root = payload && typeof payload === "object" ? payload : {};
  const visibility =
    root.visibility_state == null ? "" : String(root.visibility_state);
  const socialId = root.social_id == null ? "" : String(root.social_id);
  const holdings = Array.isArray(root.holdings) ? root.holdings : [];
  /** @type {Record<string, unknown>[]} */
  const out = [];

  for (const eventHold of holdings) {
    if (!eventHold || typeof eventHold !== "object") continue;
    const eh = /** @type {Record<string, unknown>} */ (eventHold);
    const markets = Array.isArray(eh.market_holdings) ? eh.market_holdings : [];
    if (!markets.length) {
      out.push({
        holdings_visibility_state: visibility,
        holdings_social_id: socialId,
        closed_positions: Boolean(opts.closedPositions),
        event_ticker: eh.event_ticker == null ? "" : String(eh.event_ticker),
        series_ticker: eh.series_ticker == null ? "" : String(eh.series_ticker),
        total_absolute_position: eh.total_absolute_position,
        total_absolute_position_fp: eh.total_absolute_position_fp,
        market_id: "",
        market_ticker: "",
        signed_open_position: null,
        signed_open_position_fp: "",
        holding_pnl: null,
      });
      continue;
    }
    for (const mh of markets) {
      if (!mh || typeof mh !== "object") continue;
      const m = /** @type {Record<string, unknown>} */ (mh);
      out.push({
        holdings_visibility_state: visibility,
        holdings_social_id: socialId,
        closed_positions: Boolean(opts.closedPositions),
        event_ticker: eh.event_ticker == null ? "" : String(eh.event_ticker),
        series_ticker: eh.series_ticker == null ? "" : String(eh.series_ticker),
        total_absolute_position: eh.total_absolute_position,
        total_absolute_position_fp: eh.total_absolute_position_fp,
        market_id: m.market_id == null ? "" : String(m.market_id),
        market_ticker: m.market_ticker == null ? "" : String(m.market_ticker),
        signed_open_position: m.signed_open_position,
        signed_open_position_fp: m.signed_open_position_fp,
        holding_pnl: m.pnl,
      });
    }
  }

  if (!out.length) {
    out.push({
      holdings_visibility_state: visibility,
      holdings_social_id: socialId,
      closed_positions: Boolean(opts.closedPositions),
      event_ticker: "",
      series_ticker: "",
      total_absolute_position: null,
      total_absolute_position_fp: "",
      market_id: "",
      market_ticker: "",
      signed_open_position: null,
      signed_open_position_fp: "",
      holding_pnl: null,
    });
  }

  return out;
}

/**
 * @param {Array<{
 *   profile: Record<string, unknown>;
 *   metrics?: Record<string, unknown> | null;
 *   holdingsPayload?: Record<string, unknown> | null;
 * }>} items
 * @param {string[]} [selectedColumns]
 * @param {{ includeMetrics?: boolean; includeHoldings?: boolean; closedPositions?: boolean }} [opts]
 */
export function projectKalshiLiveSearchTradersRows(items, selectedColumns, opts = {}) {
  const colDefs = getKalshiLiveSearchTradersColumns({
    includeMetrics: !!opts.includeMetrics,
    includeHoldings: !!opts.includeHoldings,
  });
  const cols =
    Array.isArray(selectedColumns) && selectedColumns.length
      ? selectedColumns
      : colDefs.map((c) => c.name);

  /** @type {Record<string, unknown>[]} */
  const rows = [];

  for (const item of Array.isArray(items) ? items : []) {
    const profile = item?.profile && typeof item.profile === "object" ? item.profile : {};
    const metrics = item?.metrics ?? null;
    const holdingsPayload = item?.holdingsPayload ?? null;

    if (opts.includeHoldings) {
      const holdings = flattenKalshiLiveSearchTraderHoldings(holdingsPayload, {
        closedPositions: !!opts.closedPositions,
      });
      for (const h of holdings) {
        const full = normalizeKalshiLiveSearchTradersRow(profile, metrics, h, opts);
        /** @type {Record<string, unknown>} */
        const out = {};
        for (const name of cols) out[name] = full[name] ?? null;
        rows.push(out);
      }
    } else {
      const full = normalizeKalshiLiveSearchTradersRow(profile, metrics, null, opts);
      /** @type {Record<string, unknown>} */
      const out = {};
      for (const name of cols) out[name] = full[name] ?? null;
      rows.push(out);
    }
  }

  return rows;
}
