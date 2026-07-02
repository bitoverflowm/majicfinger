/**
 * Reconstruct Telegram bot notifications from MongoDB journey data.
 *
 * Note: Raw Telegram message text is NOT stored when sent. This script rebuilds
 * messages from VisitorSession + VisitorEvent using the same formatters as production.
 * Immediate alerts (fork click, some page views) that never hit Mongo are omitted.
 *
 * Usage:
 *   node --import ./scripts/register-alias.mjs scripts/export-telegram-history-from-mongo.mjs
 *   node --import ./scripts/register-alias.mjs scripts/export-telegram-history-from-mongo.mjs --prod-db
 *   node --import ./scripts/register-alias.mjs scripts/export-telegram-history-from-mongo.mjs --from 2026-06-22 --to 2026-06-23
 */
import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";
import { loadRepoEnvForAws } from "./loadRepoEnvForAws.js";
import {
  mongoDatabaseTarget,
  resolveAppMongoUri,
  useProductionDatabase,
} from "@/lib/resolveMongoUri";
import {
  buildAuthSessionChainTelegramMessage,
  buildAuthSessionEndTelegramMessage,
  buildAuthSessionErrorTelegramMessage,
  buildAuthSessionStartTelegramMessage,
  buildSessionEndTelegramMessage,
  buildSessionStartTelegramMessage,
} from "@/lib/analytics/formatJourneySummary";
import { buildDataPullTelegramMessage } from "@/lib/analytics/formatDataPullTelegram";
import { currentUtcMonthKey } from "@/lib/telegram/geoFormat";

loadRepoEnvForAws();

const args = process.argv.slice(2);
if (args.includes("--prod-db")) {
  process.env.USE_PRODUCTION_DB = "1";
}

function parseDateArg(flag, fallback) {
  const idx = args.indexOf(flag);
  if (idx === -1 || !args[idx + 1]) return fallback;
  return args[idx + 1];
}

function formatYmd(d) {
  return d.toISOString().slice(0, 10);
}

function utcDayStart(ymd) {
  return new Date(`${ymd}T00:00:00.000Z`);
}

function addUtcDays(ymd, days) {
  const d = utcDayStart(ymd);
  d.setUTCDate(d.getUTCDate() + days);
  return formatYmd(d);
}

const today = new Date();
const defaultTo = formatYmd(today);
const defaultFrom = formatYmd(new Date(today.getTime() - 24 * 60 * 60 * 1000));

const fromYmd = parseDateArg("--from", defaultFrom);
const toYmd = parseDateArg("--to", defaultTo);
const rangeStart = utcDayStart(fromYmd);
const rangeEnd = utcDayStart(addUtcDays(toYmd, 1));

const OUT_DIR = path.join(process.cwd(), "exports");
const OUT_FILE = path.join(
  OUT_DIR,
  `telegram-bot-history_${fromYmd}_to_${toYmd}.txt`,
);

/** @typedef {{ ts: Date; kind: string; text: string; sessionId?: string }} ExportLine */

/** @param {Date} ts */
function fmtTs(ts) {
  return ts ? new Date(ts).toISOString().replace("T", " ").replace(/\.\d{3}Z$/, " UTC") : "unknown time";
}

/** Strip HTML tags for plain-text export */
function stripHtml(html) {
  return String(html || "")
    .replace(/<b>/gi, "")
    .replace(/<\/b>/gi, "")
    .replace(/<i>/gi, "")
    .replace(/<\/i>/gi, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/** @param {ExportLine} line */
function formatBlock(line) {
  return [
    "─".repeat(72),
    `[${fmtTs(line.ts)}] ${line.kind}${line.sessionId ? ` · session ${line.sessionId.slice(0, 8)}` : ""}`,
    "",
    stripHtml(line.text),
    "",
  ].join("\n");
}

/** @param {import('mongoose').Model} VisitorSession */
async function loadSessionsInRange(VisitorSession) {
  return VisitorSession.find({
    $or: [
      { started_at: { $gte: rangeStart, $lt: rangeEnd } },
      { summary_sent_at: { $gte: rangeStart, $lt: rangeEnd } },
      { last_chain_at: { $gte: rangeStart, $lt: rangeEnd } },
    ],
  })
    .sort({ started_at: 1 })
    .lean();
}

/** @param {import('mongoose').Model} VisitorEvent */
async function loadEventsInRange(VisitorEvent) {
  return VisitorEvent.find({
    ts: { $gte: rangeStart, $lt: rangeEnd },
  })
    .sort({ ts: 1 })
    .lean();
}

/** @param {Record<string, unknown>} session */
function sessionGeoFields(session) {
  return {
    client_ip: session.client_ip,
    country: session.country,
    region: session.region,
    city: session.city,
    user_agent: session.user_agent,
    accept_language: session.accept_language,
  };
}

/** @param {import('mongoose').Model} VisitorSession */
async function buildSessionStartCountMap(VisitorSession) {
  const all = await VisitorSession.find({
    start_notified_at: { $exists: true },
    start_telegram_skip_reason: { $nin: ["start_dedupe", "ip_dedupe"] },
    $or: [{ start_telegram_sent: true }, { start_telegram_sent: { $exists: false } }],
  })
    .sort({ start_notified_at: 1 })
    .select("session_id session_kind start_notified_at")
    .lean();

  /** @type {Map<string, { count: number; monthCount: number }>} */
  const bySessionId = new Map();
  let visitorGlobal = 0;
  let authGlobal = 0;
  let visitorMonth = 0;
  let authMonth = 0;
  let monthCursor = "";

  for (const session of all) {
    const auth = session.session_kind === "auth";
    const mk = currentUtcMonthKey(new Date(session.start_notified_at));
    if (mk !== monthCursor) {
      visitorMonth = 0;
      authMonth = 0;
      monthCursor = mk;
    }
    if (auth) {
      authGlobal += 1;
      authMonth += 1;
      bySessionId.set(session.session_id, { count: authGlobal, monthCount: authMonth });
    } else {
      visitorGlobal += 1;
      visitorMonth += 1;
      bySessionId.set(session.session_id, { count: visitorGlobal, monthCount: visitorMonth });
    }
  }

  return bySessionId;
}

/** @param {import('mongoose').Model} VisitorSession */
async function buildSessionEndCountMap(VisitorSession) {
  const all = await VisitorSession.find({
    summary_sent_at: { $exists: true },
    summary_skip_reason: { $ne: "start_dedupe_no_intent" },
  })
    .sort({ summary_sent_at: 1 })
    .select("session_id session_kind summary_sent_at")
    .lean();

  /** @type {Map<string, { count: number; monthCount: number }>} */
  const bySessionId = new Map();
  let visitorGlobal = 0;
  let authGlobal = 0;
  let visitorMonth = 0;
  let authMonth = 0;
  let monthCursor = "";

  for (const session of all) {
    const auth = session.session_kind === "auth";
    const mk = currentUtcMonthKey(new Date(session.summary_sent_at));
    if (mk !== monthCursor) {
      visitorMonth = 0;
      authMonth = 0;
      monthCursor = mk;
    }
    if (auth) {
      authGlobal += 1;
      authMonth += 1;
      bySessionId.set(session.session_id, { count: authGlobal, monthCount: authMonth });
    } else {
      visitorGlobal += 1;
      visitorMonth += 1;
      bySessionId.set(session.session_id, { count: visitorGlobal, monthCount: visitorMonth });
    }
  }

  return bySessionId;
}

/** @param {Record<string, unknown>} event */
function dataPullPhaseFromEvent(event) {
  const meta = event.meta || {};
  if (event.type === "query_error") return "error";
  if (event.type !== "query_submit") return null;
  if (meta.status === "started") return "started";
  if (meta.status === "zero_rows") return "zero_rows";
  if (meta.status === "success") return "completed";
  return null;
}

async function main() {
  const uri = resolveAppMongoUri();
  if (!uri) {
    console.error("Missing MongoDB URI. Set MONGODB_URI_DEV or MONGODB_URI in .env");
    process.exit(1);
  }

  console.log(`Connecting to ${mongoDatabaseTarget()} Mongo…`);
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000,
  });

  const VisitorSession = (await import("@/models/VisitorSession")).default;
  const VisitorEvent = (await import("@/models/VisitorEvent")).default;
  const TelegramEventCounter = (await import("@/models/TelegramEventCounter")).default;

  const [sessions, events, counters, startCounts, endCounts] = await Promise.all([
    loadSessionsInRange(VisitorSession),
    loadEventsInRange(VisitorEvent),
    TelegramEventCounter.find({}).lean(),
    buildSessionStartCountMap(VisitorSession),
    buildSessionEndCountMap(VisitorSession),
  ]);

  /** @type {ExportLine[]} */
  const lines = [];

  const sessionById = new Map(sessions.map((s) => [s.session_id, s]));

  for (const session of sessions) {
    const auth = session.session_kind === "auth";
    const startedInRange =
      session.started_at && session.started_at >= rangeStart && session.started_at < rangeEnd;

    if (
      startedInRange &&
      session.start_telegram_skip_reason !== "start_dedupe" &&
      session.start_telegram_skip_reason !== "ip_dedupe"
    ) {
      const ranks = startCounts.get(session.session_id);
      const geo = sessionGeoFields(session);
      const text = auth
        ? buildAuthSessionStartTelegramMessage({
            session: {
              session_id: session.session_id,
              entry_path: session.entry_path,
              email: session.email,
              ...geo,
            },
            sessionCount: ranks?.count,
            monthSessionCount: ranks?.monthCount,
          })
        : buildSessionStartTelegramMessage({
            session: {
              session_id: session.session_id,
              entry_path: session.entry_path,
              referrer: session.referrer,
              is_logged_in: session.is_logged_in,
              email: session.email,
              ...geo,
            },
            sessionCount: ranks?.count,
            monthSessionCount: ranks?.monthCount,
          });
      lines.push({
        ts: session.started_at,
        kind: auth ? "auth_session_start" : "visitor_session_start",
        sessionId: session.session_id,
        text,
      });
    }

    const summaryInRange =
      session.summary_sent_at &&
      session.summary_sent_at >= rangeStart &&
      session.summary_sent_at < rangeEnd;

    if (summaryInRange && session.summary_skip_reason !== "start_dedupe_no_intent") {
      const sessionEvents = await VisitorEvent.find({ session_id: session.session_id })
        .sort({ ts: 1 })
        .limit(auth ? 150 : 100)
        .lean();

      const ranks = endCounts.get(session.session_id);
      const geo = sessionGeoFields(session);
      const text = auth
        ? buildAuthSessionEndTelegramMessage({
            session: {
              session_id: session.session_id,
              started_at: session.started_at,
              ended_at: session.ended_at || session.summary_sent_at,
              entry_path: session.entry_path,
              email: session.email,
              chain_count: session.chain_count || 0,
              ...geo,
            },
            events: sessionEvents,
            sessionCount: ranks?.count,
            monthSessionCount: ranks?.monthCount,
          })
        : buildSessionEndTelegramMessage({
            session: {
              session_id: session.session_id,
              started_at: session.started_at,
              ended_at: session.ended_at || session.summary_sent_at,
              entry_path: session.entry_path,
              email: session.email,
              is_logged_in: session.is_logged_in,
              ...geo,
            },
            events: sessionEvents,
            sessionCount: ranks?.count,
            monthSessionCount: ranks?.monthCount,
          });

      lines.push({
        ts: session.summary_sent_at,
        kind: auth ? "auth_session_end" : "visitor_session_end",
        sessionId: session.session_id,
        text,
      });
    }

    const chainInRange =
      session.last_chain_at &&
      session.last_chain_at >= rangeStart &&
      session.last_chain_at < rangeEnd &&
      auth &&
      !summaryInRange;

    if (chainInRange) {
      const since = session.last_chain_at;
      const chainEvents = await VisitorEvent.find({
        session_id: session.session_id,
        ts: { $gte: new Date(new Date(since).getTime() - 5 * 60 * 1000) },
      })
        .sort({ ts: 1 })
        .limit(30)
        .lean();

      const text = buildAuthSessionChainTelegramMessage({
        session: {
          session_id: session.session_id,
          started_at: session.started_at,
          email: session.email,
          chain_count: session.chain_count || 1,
        },
        events: chainEvents,
        chainIndex: session.chain_count || 1,
      });

      lines.push({
        ts: session.last_chain_at,
        kind: "auth_session_chain",
        sessionId: session.session_id,
        text,
      });
    }
  }

  for (const event of events) {
    if (event.type === "error") {
      const session = sessionById.get(event.session_id);
      const text = buildAuthSessionErrorTelegramMessage({
        session: {
          session_id: event.session_id,
          email: session?.email,
        },
        meta: event.meta || { message: event.label, path: event.path },
      });
      lines.push({
        ts: event.ts,
        kind: "auth_session_error",
        sessionId: event.session_id,
        text,
      });
      continue;
    }

    const pullPhase = dataPullPhaseFromEvent(event);
    if (pullPhase) {
      const session = sessionById.get(event.session_id);
      const text = buildDataPullTelegramMessage({
        phase: pullPhase,
        meta: event.meta || {},
        sessionEmail: session?.email || event.meta?.email,
        sessionGeo: session ? sessionGeoFields(session) : undefined,
      });
      lines.push({
        ts: event.ts,
        kind: `data_pull_${pullPhase}`,
        sessionId: event.session_id,
        text,
      });
    }
  }

  lines.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());

  const header = [
    "Lychee Zora Telegram bot — reconstructed history from MongoDB",
    `Database target: ${mongoDatabaseTarget()}`,
    `UTC range: ${fromYmd} 00:00:00 through ${toYmd} 23:59:59 (inclusive days)`,
    `Generated: ${new Date().toISOString()}`,
    "",
    "IMPORTANT:",
    "- Telegram does not store outbound message text in MongoDB.",
    "- This file rebuilds notifications from VisitorSession + VisitorEvent records.",
    "- Missing: immediate fork/page alerts sent via /api/analytics/telegram-event only.",
    "- Missing: data_pull_notify messages if the journey batch had not flushed before export.",
    "",
    `Sessions touched: ${sessions.length}`,
    `Events in range: ${events.length}`,
    `Reconstructed messages: ${lines.length}`,
    "",
    "Counter snapshot (TelegramEventCounter):",
    ...counters.map(
      (c) =>
        `  ${c.event_key}: count=${c.count}${c.last_event_at ? ` last=${fmtTs(c.last_event_at)}` : ""}`,
    ),
    "",
    "=".repeat(72),
    "",
  ].join("\n");

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, header + lines.map(formatBlock).join("\n"), "utf8");

  console.log(`Wrote ${lines.length} reconstructed messages to:\n${OUT_FILE}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
