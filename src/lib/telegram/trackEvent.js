import dbConnect from "@/lib/dbConnect";
import TelegramEventCounter from "@/models/TelegramEventCounter";
import { sendTelegramMessage } from "@/lib/telegram/notify";
import { escapeHtml, formatFieldLines, ordinal } from "@/lib/telegram/format";
import { currentUtcMonthKey } from "@/lib/telegram/geoFormat";

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
 * @param {{ eventKey: TelegramEventKey; headline: string; fields?: Record<string, string | number | boolean | null | undefined> }} opts
 */
export async function trackAndNotifyTelegramEvent({ eventKey, headline, fields = {} }) {
  const { count, monthCount, source, dbError } = await incrementTelegramEventCounter(eventKey);
  const rank = ordinal(count);
  const monthRank = monthCount ? ordinal(monthCount) : null;
  const headlineWithRanks = monthRank
    ? headline.replace("{rank}", rank).replace("{month_rank}", monthRank)
    : headline.replace("{rank}", rank).replace(/\s*\{month_rank\}[^\n]*/g, "");
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
    formatFieldLines(fields),
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
 * }} payload
 */
export async function notifyForkClick(payload) {
  const kindLabel =
    payload.kind === "dashboard"
      ? "dashboard"
      : payload.kind === "dashboard_chart"
        ? "dashboard chart"
        : "chart";

  const name =
    payload.displayName?.trim() ||
    payload.chartSlug ||
    payload.dashboardSlug ||
    "Unknown";

  return trackAndNotifyTelegramEvent({
    eventKey: "fork_click",
    headline: `{rank} person to click fork`,
    fields: {
      Action: `Clicked fork on ${kindLabel}`,
      Name: name,
      Owner: payload.ownerHandle ? `@${payload.ownerHandle}` : undefined,
      "Chart slug": payload.chartSlug,
      "Dashboard slug": payload.dashboardSlug,
      "Logged in": payload.isLoggedIn ? "yes" : "no",
      Email: payload.userEmail,
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
 * }} payload
 */
export async function notifySignup(payload) {
  const method = payload.method || "magic link";
  return trackAndNotifyTelegramEvent({
    eventKey: "signup",
    headline: `{rank} user to sign up`,
    fields: {
      Email: payload.email,
      Name: payload.name,
      Source: payload.source,
      Method: method,
      Tier: payload.tier,
      Cycle: payload.cycle,
      Status: payload.status,
    },
  });
}

/**
 * @param {{
 *   contentType: 'chart' | 'dashboard' | 'article';
 *   name: string;
 *   path?: string;
 *   ownerHandle?: string;
 * }} payload
 */
export async function notifyContentView(payload) {
  const typeLabel =
    payload.contentType === "article"
      ? "article"
      : payload.contentType === "dashboard"
        ? "dashboard"
        : "chart";

  return trackAndNotifyTelegramEvent({
    eventKey: "content_view",
    headline: `{rank} person to open a ${typeLabel}`,
    fields: {
      Action: `Reading ${typeLabel}`,
      Name: payload.name,
      Path: payload.path,
      Owner: payload.ownerHandle ? `@${payload.ownerHandle}` : undefined,
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
 * }} payload
 */
/**
 * @param {{
 *   pageType: 'homepage' | 'hub';
 *   pageName: string;
 *   path?: string;
 * }} payload
 */
export async function notifyPageView(payload) {
  const typeLabel = payload.pageType === "hub" ? "hub page" : "homepage";
  return trackAndNotifyTelegramEvent({
    eventKey: "page_view",
    headline: `{rank} person to visit a ${typeLabel}`,
    fields: {
      Action: `Opened ${typeLabel}`,
      Page: payload.pageName,
      Path: payload.path,
      Type: payload.pageType,
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
 * }} payload
 */
export async function notifyPageClick(payload) {
  const typeLabel = payload.pageType === "hub" ? "hub page" : "homepage";
  return trackAndNotifyTelegramEvent({
    eventKey: "page_click",
    headline: `{rank} click on ${typeLabel}`,
    fields: {
      Page: payload.pageName,
      Path: payload.path,
      Type: payload.pageType,
      Label: payload.label,
      Target: payload.targetType,
      Link: payload.href,
      Section: payload.section,
    },
  });
}

export async function notifyContentLeave(payload) {
  const typeLabel =
    payload.contentType === "article"
      ? "article"
      : payload.contentType === "dashboard"
        ? "dashboard"
        : "chart";

  return trackAndNotifyTelegramEvent({
    eventKey: "content_leave",
    headline: `{rank} person to leave a ${typeLabel}`,
    fields: {
      Action: `Left ${typeLabel}`,
      Name: payload.name,
      Path: payload.path,
      Owner: payload.ownerHandle ? `@${payload.ownerHandle}` : undefined,
      "Time on page (sec)": payload.durationSeconds,
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
 * }} payload
 */
export async function notifyHeroCtaClick(payload) {
  const headlineLabel = payload.eventLabel || payload.buttonText || "hero CTA";
  return trackAndNotifyTelegramEvent({
    eventKey: "hero_cta_click",
    headline: `{rank} hero CTA — ${headlineLabel}`,
    fields: {
      Page: payload.pagePath || payload.page,
      Button: payload.buttonText,
      "Event label": payload.eventLabel,
      Destination: payload.destination,
      Link: payload.href,
      "User state": payload.userState,
      "Session id": payload.sessionId,
      Referrer: payload.referrer,
      Email: payload.userEmail,
      "Logged in": payload.isLoggedIn ? "yes" : "no",
    },
  });
}
