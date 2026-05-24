import dbConnect from "@/lib/dbConnect";
import TelegramEventCounter from "@/models/TelegramEventCounter";
import { sendTelegramMessage } from "@/lib/telegram/notify";
import { escapeHtml, formatFieldLines, ordinal } from "@/lib/telegram/format";

/** @typedef {'fork_click' | 'signup' | 'content_view' | 'content_leave' | 'test_ping'} TelegramEventKey */

const COUNTER_TIMEOUT_MS = 5000;

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

async function incrementFromDb(eventKey) {
  await dbConnect();
  const doc = await TelegramEventCounter.findOneAndUpdate(
    { event_key: eventKey },
    { $inc: { count: 1 }, $set: { last_event_at: new Date() } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return doc?.count ?? 1;
}

function incrementFromMemory(eventKey) {
  const counters = memoryCounters();
  const next = (counters.get(eventKey) || 0) + 1;
  counters.set(eventKey, next);
  return next;
}

/**
 * Atomically increment a counter and return the new total.
 * Falls back to in-memory counts if MongoDB is unreachable.
 * @param {TelegramEventKey} eventKey
 */
export async function incrementTelegramEventCounter(eventKey) {
  try {
    const count = await Promise.race([
      incrementFromDb(eventKey),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("MongoDB counter timeout")), COUNTER_TIMEOUT_MS),
      ),
    ]);
    return { count, source: "mongodb" };
  } catch (err) {
    resetMongooseCache();
    console.warn(`[telegram] counter ${eventKey} using memory fallback:`, err?.message || err);
    return {
      count: incrementFromMemory(eventKey),
      source: "memory",
      dbError: err?.message || "MongoDB unavailable",
    };
  }
}

/**
 * @param {{ eventKey: TelegramEventKey; headline: string; fields?: Record<string, string | number | boolean | null | undefined> }} opts
 */
export async function trackAndNotifyTelegramEvent({ eventKey, headline, fields = {} }) {
  const { count, source, dbError } = await incrementTelegramEventCounter(eventKey);
  const rank = ordinal(count);
  const lines = [
    `<b>${escapeHtml(headline.replace("{rank}", rank))}</b>`,
    "",
    formatFieldLines(fields),
  ].filter(Boolean);
  if (source === "memory" && dbError) {
    lines.push("", `<i>Count from memory — MongoDB unavailable</i>`);
  }
  const text = lines.join("\n").trim();

  const result = await sendTelegramMessage(text);
  if (!result.ok) {
    return { ok: false, error: result.error || "Telegram send failed", count, source, dbError };
  }
  return { ok: true, count, source, dbError };
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
 * @param {{ email?: string; name?: string; source?: string; method?: string }} payload
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
