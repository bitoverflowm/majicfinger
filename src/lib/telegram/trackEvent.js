import dbConnect from "@/lib/dbConnect";
import TelegramEventCounter from "@/models/TelegramEventCounter";
import { sendTelegramMessage } from "@/lib/telegram/notify";
import { escapeHtml, formatFieldLines, ordinal } from "@/lib/telegram/format";
import { buildGeoTelegramFields, countryCodeToFlag, currentUtcMonthKey } from "@/lib/telegram/geoFormat";

/** @typedef {ReturnType<import("@/lib/analytics/requestClientMeta").extractClientMeta>} TelegramGeoContext */

/** @typedef {'fork_click' | 'signup' | 'content_view' | 'content_leave' | 'page_view' | 'page_click' | 'hero_cta_click' | 'telegram_visitor_session_start' | 'telegram_visitor_session_end' | 'telegram_auth_session_start' | 'telegram_auth_session_end' | 'raw_visitor_session' | 'raw_auth_session' | 'test_ping'} TelegramEventKey */

const COUNTER_TIMEOUT_MS = 5000;

function monthlyEventKey(eventKey, monthKey = currentUtcMonthKey()) {
  return `${eventKey}:${monthKey}`;
}

/** Clear a stuck connect so later routes are not blocked by a poisoned promise. */
function resetMongooseCache() {
  if (global.mongoose) {
    global.mongoose.promise = null;
    global.mongoose.conn = null;
  }
}

function memoryCounters() {
  if (!global.__telegramEventCounters) {
    global.__telegramEventCounters = new Map();
  }
  return global.__telegramEventCounters;
}

async function incrementCounterKey(eventKey) {
  const doc = await TelegramEventCounter.findOneAndUpdate(
    { event_key: eventKey },
    { $inc: { count: 1 }, $set: { last_event_at: new Date() } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return doc?.count ?? 1;
}

async function incrementFromDb(eventKey) {
  await dbConnect();
  const monthKey = monthlyEventKey(eventKey);
  const [count, monthCount] = await Promise.all([
    incrementCounterKey(eventKey),
    incrementCounterKey(monthKey),
  ]);
  return { count, monthCount };
}

function incrementFromMemory(eventKey) {
  const counters = memoryCounters();
  const monthKey = monthlyEventKey(eventKey);
  const next = (counters.get(eventKey) || 0) + 1;
  const nextMonth = (counters.get(monthKey) || 0) + 1;
  counters.set(eventKey, next);
  counters.set(monthKey, nextMonth);
  return { count: next, monthCount: nextMonth };
}

/**
 * Atomically increment all-time + current-month counters.
 * Falls back to in-memory counts if MongoDB is unreachable.
 * @param {TelegramEventKey} eventKey
 */
export async function incrementTelegramEventCounter(eventKey) {
  try {
    const result = await Promise.race([
      incrementFromDb(eventKey),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("MongoDB counter timeout")), COUNTER_TIMEOUT_MS),
      ),
    ]);
    return { ...result, source: "mongodb" };
  } catch (err) {
    resetMongooseCache();
    console.warn(`[telegram] counter ${eventKey} using memory fallback:`, err?.message || err);
    const { count, monthCount } = incrementFromMemory(eventKey);
    return {
      count,
      monthCount,
      source: "memory",
      dbError: err?.message || "MongoDB unavailable",
    };
  }
}

/**
 * @param {Record<string, string | number | boolean | null | undefined>} fields
 * @param {TelegramGeoContext} [geo]
 */
function fieldsWithGeo(fields, geo = {}) {
  return { ...fields, ...buildGeoTelegramFields(geo) };
}

/**
 * @param {string} headline
 * @param {TelegramGeoContext} [geo]
 */
function headlineWithGeoFlag(headline, geo = {}) {
  const flag = countryCodeToFlag(geo.country);
  if (!flag || headline.includes(flag)) return headline;
  return `${flag} ${headline}`;
}

/**
 * @param {{ eventKey: TelegramEventKey; headline: string; fields?: Record<string, string | number | boolean | null | undefined>; geo?: TelegramGeoContext }} opts
 */
export async function trackAndNotifyTelegramEvent({ eventKey, headline, fields = {}, geo = {} }) {
  const { count, monthCount, source, dbError } = await incrementTelegramEventCounter(eventKey);
  const rank = ordinal(count);
  const monthRank = monthCount ? ordinal(monthCount) : null;
  const headlineWithRanks = monthRank
    ? headlineWithGeoFlag(headline, geo)
        .replace("{rank}", rank)
        .replace("{month_rank}", monthRank)
    : headlineWithGeoFlag(headline, geo)
        .replace("{rank}", rank)
        .replace(/\s*\{month_rank\}[^\n]*/g, "");
  const lines = [
    `<b>${escapeHtml(headlineWithRanks)}</b>`,
    "",
    `<b>Telegram alerts (all time):</b> ${escapeHtml(String(count))}`,
    ...(monthCount
      ? [
          `<b>Telegram alerts (this month):</b> ${escapeHtml(String(monthCount))} (${escapeHtml(currentUtcMonthKey())})`,
        ]
      : []),
    "",
    formatFieldLines(fieldsWithGeo(fields, geo)),
  ].filter(Boolean);
  if (source === "memory" && dbError) {
    lines.push("", `<i>Count from memory — MongoDB unavailable</i>`);
  }
  const text = lines.join("\n").trim();

  const result = await sendTelegramMessage(text);
  if (!result.ok) {
    return {
      ok: false,
      error: result.error || "Telegram send failed",
      count,
      monthCount,
      source,
      dbError,
    };
  }
  return { ok: true, count, monthCount, source, dbError };
}

/**
 * @param {{
 *   kind: 'chart' | 'dashboard' | 'dashboard_chart';
 *   displayName?: string;
 *   ownerHandle?: string;
 *   chartSlug?: string;
 *   dashboardSlug?: string;
 *   isLoggedIn?: boolean;
 *   userEmail?: string;
 *   geo?: TelegramGeoContext;
 * }} payload
 */
export async function notifyForkClick(payload) {
  const { geo, ...data } = payload;
  const kindLabel =
    data.kind === "dashboard"
      ? "dashboard"
      : data.kind === "dashboard_chart"
        ? "dashboard chart"
        : "chart";

  const name =
    data.displayName?.trim() ||
    data.chartSlug ||
    data.dashboardSlug ||
    "Unknown";

  return trackAndNotifyTelegramEvent({
    eventKey: "fork_click",
    headline: `{rank} person to click fork`,
    geo,
    fields: {
      Action: `Clicked fork on ${kindLabel}`,
      Name: name,
      Owner: data.ownerHandle ? `@${data.ownerHandle}` : undefined,
      "Chart slug": data.chartSlug,
      "Dashboard slug": data.dashboardSlug,
      "Logged in": data.isLoggedIn ? "yes" : "no",
      Email: data.userEmail,
    },
  });
}

/**
 * @param {{
 *   email?: string;
 *   name?: string;
 *   source?: string;
 *   method?: string;
 *   tier?: string;
 *   cycle?: string;
 *   status?: string;
 *   geo?: TelegramGeoContext;
 * }} payload
 */
export async function notifySignup(payload) {
  const { geo, ...data } = payload;
  const method = data.method || "magic link";
  return trackAndNotifyTelegramEvent({
    eventKey: "signup",
    headline: `{rank} user to sign up`,
    geo,
    fields: {
      Email: data.email,
      Name: data.name,
      Source: data.source,
      Method: method,
      Tier: data.tier,
      Cycle: data.cycle,
      Status: data.status,
    },
  });
}

/**
 * @param {{
 *   contentType: 'chart' | 'dashboard' | 'article';
 *   name: string;
 *   path?: string;
 *   ownerHandle?: string;
 *   geo?: TelegramGeoContext;
 * }} payload
 */
export async function notifyContentView(payload) {
  const { geo, ...data } = payload;
  const typeLabel =
    data.contentType === "article"
      ? "article"
      : data.contentType === "dashboard"
        ? "dashboard"
        : "chart";

  return trackAndNotifyTelegramEvent({
    eventKey: "content_view",
    headline: `{rank} person to open a ${typeLabel}`,
    geo,
    fields: {
      Action: `Reading ${typeLabel}`,
      Name: data.name,
      Path: data.path,
      Owner: data.ownerHandle ? `@${data.ownerHandle}` : undefined,
    },
  });
}

/**
 * @param {{
 *   pageType: 'homepage' | 'hub';
 *   pageName: string;
 *   path?: string;
 *   geo?: TelegramGeoContext;
 * }} payload
 */
export async function notifyPageView(payload) {
  const { geo, ...data } = payload;
  const typeLabel = data.pageType === "hub" ? "hub page" : "homepage";
  return trackAndNotifyTelegramEvent({
    eventKey: "page_view",
    headline: `{rank} person to visit a ${typeLabel}`,
    geo,
    fields: {
      Action: `Opened ${typeLabel}`,
      Page: data.pageName,
      Path: data.path,
      Type: data.pageType,
    },
  });
}

/**
 * @param {{
 *   pageType: 'homepage' | 'hub';
 *   pageName: string;
 *   path?: string;
 *   label?: string;
 *   targetType?: string;
 *   href?: string;
 *   section?: string;
 *   geo?: TelegramGeoContext;
 * }} payload
 */
export async function notifyPageClick(payload) {
  const { geo, ...data } = payload;
  const typeLabel = data.pageType === "hub" ? "hub page" : "homepage";
  return trackAndNotifyTelegramEvent({
    eventKey: "page_click",
    headline: `{rank} click on ${typeLabel}`,
    geo,
    fields: {
      Page: data.pageName,
      Path: data.path,
      Type: data.pageType,
      Label: data.label,
      Target: data.targetType,
      Link: data.href,
      Section: data.section,
    },
  });
}

/**
 * @param {{
 *   contentType: 'chart' | 'dashboard' | 'article';
 *   name: string;
 *   path?: string;
 *   ownerHandle?: string;
 *   durationSeconds?: number;
 *   geo?: TelegramGeoContext;
 * }} payload
 */
export async function notifyContentLeave(payload) {
  const { geo, ...data } = payload;
  const typeLabel =
    data.contentType === "article"
      ? "article"
      : data.contentType === "dashboard"
        ? "dashboard"
        : "chart";

  return trackAndNotifyTelegramEvent({
    eventKey: "content_leave",
    headline: `{rank} person to leave a ${typeLabel}`,
    geo,
    fields: {
      Action: `Left ${typeLabel}`,
      Name: data.name,
      Path: data.path,
      Owner: data.ownerHandle ? `@${data.ownerHandle}` : undefined,
      "Time on page (sec)": data.durationSeconds,
    },
  });
}

/**
 * @param {{
 *   eventLabel: string;
 *   buttonText: string;
 *   href?: string;
 *   page?: string;
 *   pagePath?: string;
 *   destination?: string;
 *   userState?: string;
 *   sessionId?: string;
 *   referrer?: string;
 *   userEmail?: string;
 *   isLoggedIn?: boolean;
 *   geo?: TelegramGeoContext;
 * }} payload
 */
export async function notifyHeroCtaClick(payload) {
  const { geo, ...data } = payload;
  const headlineLabel = data.eventLabel || data.buttonText || "hero CTA";
  return trackAndNotifyTelegramEvent({
    eventKey: "hero_cta_click",
    headline: `{rank} hero CTA — ${headlineLabel}`,
    geo,
    fields: {
      Page: data.pagePath || data.page,
      Button: data.buttonText,
      "Event label": data.eventLabel,
      Destination: data.destination,
      Link: data.href,
      "User state": data.userState,
      "Session id": data.sessionId,
      Referrer: data.referrer,
      Email: data.userEmail,
      "Logged in": data.isLoggedIn ? "yes" : "no",
    },
  });
}
