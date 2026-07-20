/**
 * Market Ticker Search — shared helpers for validating and resolving Kalshi market tickers.
 */

import { extractKalshiMarketTiming } from "@/lib/kalshiLive/kalshiMarketTiming";

export {
  aggregateKalshiMarketTiming,
  extractKalshiMarketTiming,
  formatKalshiMarketDate,
  formatKalshiMarketDateRange,
  formatKalshiMarketStatusLabel,
  isKalshiMarketLiveStatus,
} from "@/lib/kalshiLive/kalshiMarketTiming";

/** Strict ticker token: letters, digits, hyphens (Kalshi market tickers). */
export const MARKET_TICKER_TOKEN_RE = /^[A-Z0-9][A-Z0-9-]{0,63}$/i;

/**
 * @typedef {{
 *   ticker: string;
 *   title: string;
 *   subtitle?: string;
 *   eventTicker?: string;
 *   status?: string;
 *   openTime?: string;
 *   closeTime?: string;
 * }} MarketTickerSelection
 */

/**
 * @param {string} raw
 */
export function isValidMarketTickerToken(raw) {
  const t = String(raw || "").trim();
  return t.length > 0 && MARKET_TICKER_TOKEN_RE.test(t);
}

/**
 * Split committed ticker lists (commas / whitespace / newlines).
 * @param {string} raw
 * @returns {string[]}
 */
export function parseMarketTickerList(raw) {
  const parts = String(raw || "")
    .split(/[\s,]+/)
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean);
  return [...new Set(parts)];
}

/**
 * Current in-progress search segment (text after the last comma).
 * @param {string} raw
 */
export function getMarketTickerSearchSegment(raw) {
  const s = String(raw || "");
  const idx = s.lastIndexOf(",");
  return (idx >= 0 ? s.slice(idx + 1) : s).trim();
}

/**
 * True when the segment looks like a ticker (not natural language).
 * @param {string} raw
 */
export function isTickerLikeSegment(raw) {
  const t = String(raw || "").trim();
  if (!t || /\s/.test(t)) return false;
  return MARKET_TICKER_TOKEN_RE.test(t);
}

/**
 * Resolve tickers against Kalshi GET /markets?tickers=…
 * @param {string[]} tickers
 * @param {{ signal?: AbortSignal }} [opts]
 * @returns {Promise<{ found: MarketTickerSelection[]; missing: string[] }>}
 */
export async function resolveMarketTickers(tickers, opts = {}) {
  const unique = [...new Set((tickers || []).map((t) => String(t).trim().toUpperCase()).filter(Boolean))];
  if (!unique.length) return { found: [], missing: [] };

  const invalid = unique.filter((t) => !isValidMarketTickerToken(t));
  const valid = unique.filter((t) => isValidMarketTickerToken(t));
  /** @type {MarketTickerSelection[]} */
  const found = [];
  /** @type {string[]} */
  const missing = [...invalid];

  if (!valid.length) return { found, missing };

  // Kalshi accepts comma-separated tickers; chunk to keep URLs reasonable.
  const CHUNK = 50;
  for (let i = 0; i < valid.length; i += CHUNK) {
    const chunk = valid.slice(i, i + CHUNK);
    const params = new URLSearchParams({
      tickers: chunk.join(","),
      limit: String(Math.min(100, chunk.length)),
    });
    const res = await fetch(`/api/integrations/kalshi-live/markets?${params.toString()}`, {
      headers: { Accept: "application/json" },
      credentials: "same-origin",
      signal: opts.signal,
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      missing.push(...chunk.filter((t) => !found.some((f) => f.ticker === t)));
      continue;
    }
    const markets = Array.isArray(body?.markets) ? body.markets : [];
    /** @type {Set<string>} */
    const hit = new Set();
    for (const m of markets) {
      const ticker = String(m?.ticker || "").trim().toUpperCase();
      if (!ticker) continue;
      hit.add(ticker);
      const title =
        String(m?.title || m?.subtitle || m?.yes_sub_title || "").trim() || ticker;
      const subtitle = String(m?.yes_sub_title || m?.event_ticker || "").trim() || undefined;
      const eventTicker = String(m?.event_ticker || "").trim() || undefined;
      const timing = extractKalshiMarketTiming(m);
      if (!found.some((f) => f.ticker === ticker)) {
        found.push({
          ticker,
          title,
          subtitle,
          eventTicker,
          status: timing.status,
          openTime: timing.openTime,
          closeTime: timing.closeTime,
        });
      }
    }
    for (const t of chunk) {
      if (!hit.has(t) && !missing.includes(t)) missing.push(t);
    }
  }

  return { found, missing };
}

/**
 * Serialize selections to the comma-separated string stored in connect state.
 * @param {MarketTickerSelection[]} selections
 */
export function serializeMarketTickerSelections(selections) {
  return (Array.isArray(selections) ? selections : [])
    .map((s) => String(s?.ticker || "").trim().toUpperCase())
    .filter(Boolean)
    .join(", ");
}

/**
 * Normalize nested embedding / series markets into selectable rows.
 * @param {unknown[]} markets
 * @returns {MarketTickerSelection[]}
 */
export function normalizeSeriesMarketsForPicker(markets) {
  const list = Array.isArray(markets) ? markets : [];
  /** @type {MarketTickerSelection[]} */
  const out = [];
  for (const m of list) {
    if (!m || typeof m !== "object") continue;
    const row = /** @type {Record<string, unknown>} */ (m);
    const ticker = String(row.ticker || "").trim().toUpperCase();
    if (!ticker || !isValidMarketTickerToken(ticker)) continue;
    if (out.some((x) => x.ticker === ticker)) continue;
    const title =
      String(row.yes_subtitle || row.yes_sub_title || row.title || row.subtitle || "").trim() ||
      ticker;
    const timing = extractKalshiMarketTiming(row);
    out.push({
      ticker,
      title,
      subtitle: String(row.event_ticker || "").trim() || undefined,
      eventTicker: String(row.event_ticker || "").trim() || undefined,
      status: timing.status,
      openTime: timing.openTime,
      closeTime: timing.closeTime,
    });
  }
  return out;
}

/**
 * Which Kalshi surface owns the Market Ticker Search instance.
 * Historical search is not wired yet — keep `"historical"` for future inverse messaging.
 *
 * @typedef {"live" | "historical"} KalshiTickerSearchDataSource
 */

/**
 * @typedef {"ended_before_cutoff" | "spans_cutoff" | "fully_after_cutoff" | "unknown"} MarketCutoffRelation
 */

/**
 * @param {string | undefined | null} cutoffIso
 * @returns {number}
 */
export function parseKalshiHistoricalCutoffMs(cutoffIso) {
  const ms = Date.parse(String(cutoffIso || "").trim());
  return Number.isFinite(ms) ? ms : NaN;
}

/**
 * Classify a selected market against the live/historical cutoff.
 * Suggestions stay visible either way; this only drives post-select notes.
 *
 * @param {{ openTime?: string; closeTime?: string } | null | undefined} selection
 * @param {number} cutoffMs
 * @returns {MarketCutoffRelation}
 */
export function classifyMarketVsHistoricalCutoff(selection, cutoffMs) {
  if (!Number.isFinite(cutoffMs)) return "unknown";
  const openMs = selection?.openTime ? Date.parse(selection.openTime) : NaN;
  const closeMs = selection?.closeTime ? Date.parse(selection.closeTime) : NaN;

  if (Number.isFinite(closeMs) && closeMs < cutoffMs) {
    return "ended_before_cutoff";
  }
  if (
    Number.isFinite(openMs) &&
    openMs < cutoffMs &&
    (!Number.isFinite(closeMs) || closeMs >= cutoffMs)
  ) {
    return "spans_cutoff";
  }
  if (Number.isFinite(openMs) && openMs >= cutoffMs) {
    return "fully_after_cutoff";
  }
  return "unknown";
}

/**
 * @param {string | undefined | null} iso
 * @param {{ withTime?: boolean }} [opts]
 * @returns {string}
 */
export function formatKalshiCutoffDisplay(iso, opts = {}) {
  const raw = String(iso || "").trim();
  if (!raw) return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  try {
    if (opts.withTime) {
      return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
    }
    return d.toLocaleDateString(undefined, { dateStyle: "medium" });
  } catch {
    return opts.withTime ? d.toLocaleString() : d.toLocaleDateString();
  }
}

