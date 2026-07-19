/**
 * Shared Kalshi market status / open-close timing helpers.
 */

/**
 * True when Kalshi status means the market is open for trading.
 * @param {string | undefined} status
 */
export function isKalshiMarketLiveStatus(status) {
  const s = String(status || "").trim().toLowerCase();
  return s === "open" || s === "active";
}

/**
 * @param {string | undefined} status
 */
export function formatKalshiMarketStatusLabel(status) {
  const s = String(status || "").trim().toLowerCase();
  if (!s) return "";
  if (s === "open" || s === "active") return "Live";
  if (s === "unopened") return "Unopened";
  if (s === "paused") return "Paused";
  if (s === "closed") return "Closed";
  if (s === "settled") return "Settled";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * @param {string | undefined | null} raw
 */
export function formatKalshiMarketDate(raw) {
  const s = String(raw || "").trim();
  if (!s) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  try {
    return d.toLocaleDateString(undefined, { dateStyle: "medium" });
  } catch {
    return d.toLocaleDateString();
  }
}

/**
 * @param {string | undefined} openTime
 * @param {string | undefined} closeTime
 */
export function formatKalshiMarketDateRange(openTime, closeTime) {
  const open = formatKalshiMarketDate(openTime);
  const close = formatKalshiMarketDate(closeTime);
  if (open && close) return `${open} – ${close}`;
  if (open) return `Opens ${open}`;
  if (close) return `Closes ${close}`;
  return "";
}

/**
 * Infer / normalize timing fields from live or embedding market payloads.
 * @param {Record<string, unknown> | null | undefined} market
 */
export function extractKalshiMarketTiming(market) {
  if (!market || typeof market !== "object") {
    return { status: undefined, openTime: undefined, closeTime: undefined };
  }
  const openTime =
    String(market.open_time || market.open_ts || "").trim() || undefined;
  const closeTime =
    String(
      market.close_time || market.close_ts || market.expiration_time || "",
    ).trim() || undefined;
  let status = String(market.status || "").trim().toLowerCase();
  if (!status) {
    const result = String(market.result || "").trim();
    const now = Date.now();
    const openMs = openTime ? Date.parse(openTime) : NaN;
    const closeMs = closeTime ? Date.parse(closeTime) : NaN;
    if (result) status = "settled";
    else if (Number.isFinite(openMs) && now < openMs) status = "unopened";
    else if (Number.isFinite(closeMs) && now > closeMs) status = "closed";
    else if (Number.isFinite(openMs) || Number.isFinite(closeMs)) status = "active";
  }
  return {
    status: status || undefined,
    openTime,
    closeTime,
  };
}

/**
 * Aggregate open/close/status across nested series markets for suggestion rows.
 * @param {{ status?: string; openTime?: string; closeTime?: string }[]} markets
 */
export function aggregateKalshiMarketTiming(markets) {
  const list = Array.isArray(markets) ? markets : [];
  const live = list.some((m) => isKalshiMarketLiveStatus(m?.status));
  const status = live
    ? "active"
    : list.map((m) => m?.status).find((s) => String(s || "").trim()) || undefined;
  const opens = list.map((m) => m?.openTime).filter(Boolean).sort();
  const closes = list.map((m) => m?.closeTime).filter(Boolean).sort();
  return {
    status,
    openTime: opens[0],
    closeTime: closes.length ? closes[closes.length - 1] : undefined,
  };
}
