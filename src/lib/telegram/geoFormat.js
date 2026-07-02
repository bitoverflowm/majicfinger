import { escapeHtml, ordinal } from "@/lib/telegram/format";
import { maskClientIpForTelegram } from "@/lib/analytics/requestClientMeta";

/** @returns {string} UTC month key e.g. "2026-07" */
export function currentUtcMonthKey(date = new Date()) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export const TELEGRAM_COUNTER_KEYS = {
  visitorSessionStart: "telegram_visitor_session_start",
  visitorSessionEnd: "telegram_visitor_session_end",
  authSessionStart: "telegram_auth_session_start",
  authSessionEnd: "telegram_auth_session_end",
  rawVisitorSession: "raw_visitor_session",
  rawAuthSession: "raw_auth_session",
};

/** @param {string} eventKey */
export function monthlyCounterKey(eventKey, date = new Date()) {
  return `${eventKey}:${currentUtcMonthKey(date)}`;
}

/** @param {string | undefined | null} code ISO 3166-1 alpha-2 */
export function countryCodeToFlag(code) {
  const upper = String(code || "")
    .trim()
    .toUpperCase();
  if (!/^[A-Z]{2}$/.test(upper)) return "";
  return [...upper]
    .map((char) => String.fromCodePoint(0x1f1e6 + char.charCodeAt(0) - 65))
    .join("");
}

/** @param {string | undefined | null} code */
export function countryDisplayName(code) {
  const upper = String(code || "")
    .trim()
    .toUpperCase();
  if (!/^[A-Z]{2}$/.test(upper)) return "";
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(upper) || upper;
  } catch {
    return upper;
  }
}

/**
 * @param {{ country?: string; region?: string; city?: string; client_ip?: string; maskIp?: boolean }} geo
 */
export function formatGeoLocationLabel(geo = {}) {
  const flag = countryCodeToFlag(geo.country);
  const country = countryDisplayName(geo.country) || geo.country || "";
  const parts = [country, geo.region, geo.city].filter(Boolean);
  const place = parts.join(" · ");
  const ip = geo.maskIp ? maskClientIpForTelegram(geo.client_ip) : geo.client_ip;
  if (!place && !ip) return "";
  const prefix = flag ? `${flag} ` : "";
  if (place && ip) return `${prefix}${place} (${ip})`;
  if (place) return `${prefix}${place}`;
  return ip || "";
}

/**
 * @param {{ country?: string; region?: string; city?: string; client_ip?: string; user_agent?: string; accept_language?: string; maskIp?: boolean }} geo
 * @returns {Record<string, string>}
 */
export function buildGeoTelegramFields(geo = {}) {
  const location = formatGeoLocationLabel({ ...geo, maskIp: true });
  /** @type {Record<string, string>} */
  const fields = {};
  if (location) fields.Location = location;
  if (geo.user_agent) fields["User agent"] = String(geo.user_agent).slice(0, 160);
  if (geo.accept_language) fields.Language = geo.accept_language;
  return fields;
}

/**
 * @param {number | undefined | null} count
 * @param {number | undefined | null} monthCount
 * @param {string} label
 * @param {string} [flag]
 */
export function formatDualRankHeadline({ count, monthCount, label, flag = "" }) {
  const flagPrefix = flag ? `${flag} ` : "";
  const globalRank = count ? ordinal(count) : null;
  const monthRank = monthCount ? ordinal(monthCount) : null;

  if (globalRank && monthRank) {
    return `${flagPrefix}${globalRank} ${label} (${monthRank} this month)`;
  }
  if (globalRank) {
    return `${flagPrefix}${globalRank} ${label}`;
  }
  return `${flagPrefix}${label}`;
}

/**
 * @param {string} headline
 * @param {{ count?: number; monthCount?: number }} ranks
 */
export function appendRankCountsBlock(headline, ranks = {}) {
  const lines = [`<b>${escapeHtml(headline)}</b>`];
  if (ranks.count) {
    lines.push(`<b>All time:</b> ${escapeHtml(String(ranks.count))}`);
  }
  if (ranks.monthCount) {
    lines.push(
      `<b>This month:</b> ${escapeHtml(String(ranks.monthCount))} (${escapeHtml(currentUtcMonthKey())})`,
    );
  }
  return lines;
}
