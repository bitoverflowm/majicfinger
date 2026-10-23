import dbConnect from "@/lib/dbConnect";
import VisitorEvent from "@/models/VisitorEvent";
import { isTelegramConfigured, sendTelegramMessage } from "@/lib/telegram/notify";
import { incrementTelegramEventCounter } from "@/lib/telegram/trackEvent";
import {
  buildAuthSessionChainTelegramMessage,
  buildAuthSessionEndTelegramMessage,
  buildAuthSessionErrorTelegramMessage,
  buildAuthSessionStartTelegramMessage,
  buildSessionEndTelegramMessage,
} from "@/lib/analytics/formatJourneySummary";
import { buildDataPullTelegramMessage } from "@/lib/analytics/formatDataPullTelegram";
import { extractClientMeta, geoFieldsFromMeta } from "@/lib/analytics/requestClientMeta";
import { landingFieldsFromMeta } from "@/lib/analytics/sessionFieldsFromMeta";
import {
  hasNoteworthyVisitorActivity,
  wasVisitorStartDeferredToSummary,
  wasVisitorStartTelegramSuppressed,
} from "@/lib/analytics/sessionOutcome";
import {
  buildVisitorStartDedupeKey,
  hasRecentVisitorStartTelegram,
} from "@/lib/analytics/visitorDedupe";
import {
  formatReturningVisitorLine,
  lookupReturningVisitor,
} from "@/lib/analytics/returningVisitor";
import { TELEGRAM_COUNTER_KEYS } from "@/lib/telegram/geoFormat";
import { isProdAnalyticsEnabled } from "@/lib/analytics/isProdAnalyticsEnabled";
import VisitorSession from "@/models/VisitorSession";

/** Skip the visitor session-start ping; one Telegram at session end covers the full journey. */
const VISITOR_START_DEFER_REASON = "deferred_to_summary";

function isAuthSession(sessionKind) {
  return sessionKind === "auth";
}

/** Auth sessions with no real activity for this long are treated as abandoned. */
const AUTH_SESSION_STALE_MS = 30 * 60 * 1000;

function mergeRequestMeta(meta = {}, req) {
  return { ...meta, ...extractClientMeta(req) };
}

/** @param {Record<string, unknown>} doc */
function sessionContextFromDoc(doc) {
  return {
    session_id: doc.session_id,
    entry_path: doc.entry_path,
    entry_url: doc.entry_url,
    entry_search: doc.entry_search,
    page_type: doc.page_type,
    page_name: doc.page_name,
    referrer: doc.referrer,
    visitor_id: doc.visitor_id,
    utm_source: doc.utm_source,
    utm_medium: doc.utm_medium,
    utm_campaign: doc.utm_campaign,
    utm_term: doc.utm_term,
    utm_content: doc.utm_content,
    client_ip: doc.client_ip,
    country: doc.country,
    region: doc.region,
    city: doc.city,
    user_agent: doc.user_agent,
    accept_language: doc.accept_language,
    email: doc.email,
    is_logged_in: doc.is_logged_in,
  };
}

async function incrementCounterSafe(eventKey) {
  try {
    return await incrementTelegramEventCounter(eventKey);
  } catch (err) {
    console.warn(`[journey] counter ${eventKey} failed:`, err?.message || err);
    return { count: undefined, monthCount: undefined };
  }
}

/**
 * Claim the session-start notification slot.
 * Visitors are deferred to the end-of-journey summary (one Telegram per visit).
 * Auth sessions still get an immediate start alert.
 * @param {{ session_id: string; session_kind?: string }} doc
 * @param {boolean} auth
 * @param {Date} now
 * @param {{ countRaw?: boolean }} [opts]
 */
async function deliverSessionStartTelegram(doc, auth, now, opts = {}) {
  if (doc.start_telegram_sent || doc.start_telegram_skip_reason) {
    return { delivered: false, reason: "already_handled" };
  }

  // Dev-only short-circuit. Production always uses the normal delivery path below
  // (isTelegramConfigured already keeps prod sends on when credentials are set).
  if (process.env.NODE_ENV !== "production" && !isTelegramConfigured()) {
    await VisitorSession.updateOne(
      { session_id: doc.session_id },
      {
        $set: {
          start_telegram_skip_reason: "notifications_disabled",
          start_telegram_sent: false,
        },
      },
    );
    return { delivered: false, skipped: true };
  }

  const claim = await VisitorSession.updateOne(
    {
      session_id: doc.session_id,
      start_telegram_sent: { $ne: true },
      start_telegram_skip_reason: { $exists: false },
    },
    { $set: { start_delivery_claimed_at: now } },
  );
  if ((claim.modifiedCount ?? 0) === 0) {
    return { delivered: false, reason: "delivery_claimed_elsewhere" };
  }

  const sessionContext = sessionContextFromDoc(doc);
  const dedupeKey = !auth ? buildVisitorStartDedupeKey(doc) : null;

  if (
    !auth &&
    dedupeKey &&
    (await hasRecentVisitorStartTelegram(VisitorSession, doc.session_id, dedupeKey, now))
  ) {
    await VisitorSession.updateOne(
      { session_id: doc.session_id },
      {
        $set: {
          start_telegram_skip_reason: "start_dedupe",
          start_telegram_sent: false,
          ...(dedupeKey.strategy !== "visitor_id" ? { start_dedupe_key: dedupeKey.key } : {}),
        },
        $unset: { start_delivery_claimed_at: "" },
      },
    );
    return { delivered: false, deduped: true };
  }

  if (opts.countRaw) {
    const rawCounterKey = auth
      ? TELEGRAM_COUNTER_KEYS.rawAuthSession
      : TELEGRAM_COUNTER_KEYS.rawVisitorSession;
    await incrementCounterSafe(rawCounterKey);
  }

  // Visitor journeys: one Telegram at session end with entry → exit. No start ping.
  if (!auth) {
    await VisitorSession.updateOne(
      { session_id: doc.session_id },
      {
        $set: {
          start_telegram_sent: false,
          start_telegram_skip_reason: VISITOR_START_DEFER_REASON,
          ...(dedupeKey && dedupeKey.strategy !== "visitor_id"
            ? { start_dedupe_key: dedupeKey.key }
            : {}),
        },
        $unset: { start_delivery_claimed_at: "" },
      },
    );
    return { delivered: false, deferred: true };
  }

  const { count, monthCount } = await incrementCounterSafe(TELEGRAM_COUNTER_KEYS.authSessionStart);

  const text = buildAuthSessionStartTelegramMessage({
    session: sessionContext,
    sessionCount: count,
    monthSessionCount: monthCount,
  });

  const result = await sendTelegramMessage(text);
  if (!result.ok) {
    console.error("[journey] session start telegram failed:", result.error || result);
    await VisitorSession.updateOne(
      { session_id: doc.session_id },
      { $unset: { start_delivery_claimed_at: "" } },
    );
    return { delivered: false, error: result.error || "telegram_failed" };
  }

  await VisitorSession.updateOne(
    { session_id: doc.session_id },
    {
      $set: {
        start_telegram_sent: true,
        start_telegram_skip_reason: null,
      },
      $unset: { start_delivery_claimed_at: "" },
    },
  );
  return { delivered: true };
}

async function recordSessionStart(sessionId, meta = {}, sessionKind = "visitor") {
  await dbConnect();
  const now = new Date();
  const auth = isAuthSession(sessionKind);
  const geo = geoFieldsFromMeta(meta);
  const landing = landingFieldsFromMeta(meta);

  const entryPath = landing.entry_path || meta.entryPath || (auth ? "/dashboard" : "/");
  const referrer = auth ? "" : landing.referrer || meta.referrer || "";

  const updateResult = await VisitorSession.updateOne(
    { session_id: sessionId, start_notified_at: { $exists: false } },
    {
      $set: {
        start_notified_at: now,
        last_seen_at: now,
        entry_path: entryPath,
        ...geo,
        ...landing,
        ...(!auth ? { referrer } : {}),
        ...(meta.email ? { email: meta.email } : {}),
        ...(meta.userId ? { user_id: String(meta.userId) } : {}),
        is_logged_in: auth || !!meta.isLoggedIn,
      },
      $setOnInsert: {
        session_id: sessionId,
        session_kind: auth ? "auth" : "visitor",
        started_at: now,
        entry_path: entryPath,
        referrer,
        ...geo,
        ...landing,
        ...(meta.email ? { email: meta.email } : {}),
        ...(meta.userId ? { user_id: String(meta.userId) } : {}),
        is_logged_in: auth || !!meta.isLoggedIn,
      },
    },
    { upsert: true },
  );

  const claimedStartNotify =
    (updateResult.upsertedCount ?? 0) > 0 || (updateResult.modifiedCount ?? 0) > 0;

  if (!claimedStartNotify) {
    await VisitorSession.updateOne(
      { session_id: sessionId },
      {
        $set: {
          last_seen_at: now,
          ...geo,
          ...landing,
          ...(meta.email ? { email: meta.email } : {}),
          ...(meta.userId ? { user_id: String(meta.userId) } : {}),
          is_logged_in: auth || !!meta.isLoggedIn,
        },
      },
    );
  }

  const doc = await VisitorSession.findOne({ session_id: sessionId });
  if (!doc) return null;

  if (doc.start_telegram_sent || doc.start_telegram_skip_reason) {
    return doc;
  }

  const shouldDeliver = claimedStartNotify || !!doc.start_notified_at;
  if (shouldDeliver) {
    await deliverSessionStartTelegram(doc, auth, now, { countRaw: claimedStartNotify });
  }

  return VisitorSession.findOne({ session_id: sessionId });
}

async function recordSessionBatch(sessionId, events = [], sessionKind = "visitor") {
  if (!events.length) return;
  await dbConnect();
  const now = new Date();
  const auth = isAuthSession(sessionKind);

  await VisitorSession.findOneAndUpdate(
    { session_id: sessionId },
    {
      $set: { last_seen_at: now },
      $setOnInsert: {
        started_at: now,
        session_kind: auth ? "auth" : "visitor",
      },
    },
    { upsert: true },
  );

  await VisitorEvent.insertMany(
    events.map((event) => ({
      session_id: sessionId,
      ts: event.ts ? new Date(event.ts) : now,
      type: event.type,
      path: event.path || "",
      label: event.label || "",
      meta: event.meta || {},
    })),
  );
}

async function recordSessionIdentity(sessionId, meta = {}) {
  await dbConnect();
  await VisitorSession.findOneAndUpdate(
    { session_id: sessionId },
    {
      $set: {
        last_seen_at: new Date(),
        ...(meta.email ? { email: meta.email } : {}),
        ...(meta.userId ? { user_id: String(meta.userId) } : {}),
        is_logged_in: !!meta.isLoggedIn,
      },
    },
  );
}

async function recordSessionEnd(sessionId, meta = {}, sessionKind = "visitor") {
  await dbConnect();
  const now = new Date();
  const auth = isAuthSession(sessionKind);

  const existing = await VisitorSession.findOne({ session_id: sessionId });
  if (existing?.summary_sent_at) {
    return { ok: true, deduped: true };
  }

  const geo = geoFieldsFromMeta(meta);
  const landing = landingFieldsFromMeta(meta);

  const events = await VisitorEvent.find({ session_id: sessionId })
    .sort({ ts: 1 })
    .limit(auth ? 150 : 100)
    .lean();

  // Only silence empty bounce revisits within the dedupe window. Any real browsing
  // (page views, clicks, content) still gets one journey summary.
  if (
    !auth &&
    existing &&
    wasVisitorStartTelegramSuppressed(existing.start_telegram_skip_reason) &&
    !hasNoteworthyVisitorActivity(events)
  ) {
    await VisitorSession.updateOne(
      { session_id: sessionId },
      {
        $set: {
          ended_at: now,
          last_seen_at: now,
          summary_sent_at: now,
          summary_skip_reason: "start_dedupe_no_activity",
          ...geo,
          ...landing,
          ...(meta.email ? { email: meta.email } : {}),
          ...(meta.userId ? { user_id: String(meta.userId) } : {}),
          ...(meta.isLoggedIn != null ? { is_logged_in: !!meta.isLoggedIn } : {}),
        },
      },
    );
    return { ok: true, suppressed: true, reason: "start_dedupe_no_activity" };
  }

  const endFields = {
    ended_at: now,
    last_seen_at: now,
    summary_delivery_claimed_at: now,
    ...geo,
    ...landing,
    ...(meta.email ? { email: meta.email } : {}),
    ...(meta.userId ? { user_id: String(meta.userId) } : {}),
    ...(meta.isLoggedIn != null ? { is_logged_in: !!meta.isLoggedIn } : {}),
  };

  let session = await VisitorSession.findOneAndUpdate(
    {
      session_id: sessionId,
      summary_sent_at: { $exists: false },
      summary_delivery_claimed_at: { $exists: false },
    },
    { $set: endFields },
    { new: true },
  );

  // Reclaim if a prior send attempt died after claiming (e.g. Telegram timeout).
  if (!session) {
    session = await VisitorSession.findOneAndUpdate(
      {
        session_id: sessionId,
        summary_sent_at: { $exists: false },
        summary_delivery_claimed_at: { $lt: new Date(now.getTime() - 60_000) },
      },
      { $set: endFields },
      { new: true },
    );
  }

  if (!session) {
    return { ok: true, deduped: true };
  }

  // Auth only: backfill a missed start alert. Visitors defer start entirely
  // (deferred_to_summary) so the end summary is the single journey message.
  if (
    auth &&
    !session.start_telegram_sent &&
    !wasVisitorStartTelegramSuppressed(session.start_telegram_skip_reason) &&
    !wasVisitorStartDeferredToSummary(session.start_telegram_skip_reason)
  ) {
    await deliverSessionStartTelegram(session, auth, now, { countRaw: false });
    const refreshed = await VisitorSession.findOne({ session_id: sessionId });
    if (refreshed) session = refreshed;
  }

  const counterKey = auth
    ? TELEGRAM_COUNTER_KEYS.authSessionEnd
    : TELEGRAM_COUNTER_KEYS.visitorSessionEnd;
  const { count, monthCount } = await incrementTelegramEventCounter(counterKey);

  const sessionContext = sessionContextFromDoc(session);

  let returningVisitor = null;
  let returningVisitorLine = "";
  if (!auth) {
    try {
      returningVisitor = await lookupReturningVisitor(VisitorSession, {
        sessionId,
        clientIp: session.client_ip || sessionContext.client_ip,
        visitorId: session.visitor_id || sessionContext.visitor_id,
        now,
      });
      returningVisitorLine = formatReturningVisitorLine(returningVisitor, now);
    } catch (err) {
      console.warn("[journey] returning visitor lookup failed:", err?.message || err);
    }
  }

  const text = auth
    ? buildAuthSessionEndTelegramMessage({
        session: {
          ...sessionContext,
          session_id: sessionId,
          started_at: session.started_at,
          ended_at: now,
          email: session.email || meta.email,
          chain_count: session.chain_count || 0,
        },
        events,
        sessionCount: count,
        monthSessionCount: monthCount,
      })
    : buildSessionEndTelegramMessage({
        session: {
          ...sessionContext,
          session_id: sessionId,
          started_at: session.started_at,
          ended_at: now,
          email: session.email || meta.email,
          is_logged_in: session.is_logged_in || !!meta.isLoggedIn,
        },
        events,
        sessionCount: count,
        monthSessionCount: monthCount,
        returningVisitor,
        returningVisitorLine,
      });

  const sent = await sendTelegramMessage(text);
  if (!sent?.ok) {
    // Allow a later pagehide/retry to try again instead of silently dropping the journey.
    await VisitorSession.updateOne(
      { session_id: sessionId },
      {
        $unset: { summary_delivery_claimed_at: "", ended_at: "" },
        $set: {
          summary_skip_reason: sent?.skipped ? "telegram_not_configured" : "telegram_send_failed",
        },
      },
    );
    console.error("[journey] session end telegram failed:", sent?.error || sent);
    return { ok: false, error: sent?.error || "telegram_failed" };
  }

  await VisitorSession.updateOne(
    { session_id: sessionId },
    {
      $set: {
        summary_sent_at: now,
        summary_skip_reason: null,
        ended_at: now,
      },
      $unset: { summary_delivery_claimed_at: "" },
    },
  );
  return { ok: true };
}

async function recordSessionChain(sessionId, meta = {}) {
  await dbConnect();
  const now = new Date();

  const existing = await VisitorSession.findOne({
    session_id: sessionId,
    session_kind: "auth",
    summary_sent_at: { $exists: false },
  });

  if (!existing) {
    return { ok: true, skipped: true };
  }

  if (meta.tabVisible === false) {
    return { ok: true, skipped: true };
  }

  const lastActivityAt = existing.last_seen_at || existing.started_at;
  const idleMs = now.getTime() - new Date(lastActivityAt).getTime();
  if (idleMs > AUTH_SESSION_STALE_MS) {
    return recordSessionEnd(sessionId, meta, "auth");
  }

  const since = existing.last_chain_at || existing.started_at;

  const session = await VisitorSession.findOneAndUpdate(
    { session_id: sessionId },
    {
      $set: { last_chain_at: now },
      $inc: { chain_count: 1 },
    },
    { new: true },
  );

  const chainIndex = session.chain_count || 1;

  const events = await VisitorEvent.find({
    session_id: sessionId,
    ts: { $gte: since },
  })
    .sort({ ts: 1 })
    .limit(30)
    .lean();

  const text = buildAuthSessionChainTelegramMessage({
    session: {
      session_id: sessionId,
      started_at: session.started_at,
      email: session.email || meta.email,
      chain_count: chainIndex,
    },
    events,
    chainIndex,
  });

  await sendTelegramMessage(text);
  return { ok: true, chainIndex };
}

async function recordSessionError(sessionId, meta = {}) {
  await dbConnect();
  const now = new Date();

  const session = await VisitorSession.findOne({ session_id: sessionId, session_kind: "auth" });
  if (!session || session.summary_sent_at) {
    return { ok: true, skipped: true };
  }

  await VisitorSession.updateOne({ session_id: sessionId }, { $set: { last_seen_at: now } });

  await VisitorEvent.create({
    session_id: sessionId,
    ts: now,
    type: "error",
    path: meta.path || "",
    label: meta.message || "",
    meta: {
      message: meta.message,
      source: meta.source,
      integration: meta.integration,
      stack: meta.stack,
    },
  });

  const text = buildAuthSessionErrorTelegramMessage({
    session: {
      session_id: sessionId,
      email: session?.email || meta.email,
    },
    meta,
  });

  await sendTelegramMessage(text);
  return { ok: true };
}

async function recordDataPullNotify(sessionId, meta = {}, reqGeo = {}) {
  await dbConnect();

  const phase = meta.phase;
  if (!phase || !["started", "completed", "zero_rows", "error"].includes(phase)) {
    return { ok: false, message: "Invalid data pull phase" };
  }

  const session = await VisitorSession.findOne({ session_id: sessionId }).lean();
  const { phase: _phase, ...pullMeta } = meta;

  const sessionGeo = {
    client_ip: session?.client_ip || reqGeo.client_ip,
    country: session?.country || reqGeo.country,
    region: session?.region || reqGeo.region,
    city: session?.city || reqGeo.city,
    user_agent: session?.user_agent || reqGeo.user_agent,
    accept_language: session?.accept_language || reqGeo.accept_language,
  };

  const text = buildDataPullTelegramMessage({
    phase,
    meta: pullMeta,
    sessionEmail: pullMeta.email || session?.email,
    sessionGeo: Object.values(sessionGeo).some(Boolean) ? sessionGeo : undefined,
  });

  await sendTelegramMessage(text);
  return { ok: true };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, message: "Method not allowed" });
  }

  if (!isProdAnalyticsEnabled()) {
    return res.status(200).json({ ok: true, skipped: true, reason: "dev_disabled" });
  }

  let body = req.body;
  if (Buffer.isBuffer(body)) {
    try {
      body = JSON.parse(body.toString("utf8"));
    } catch {
      return res.status(400).json({ ok: false, message: "Invalid JSON" });
    }
  } else if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ ok: false, message: "Invalid JSON" });
    }
  }

  const { action, sessionId, events = [], meta = {}, sessionKind = "visitor" } = body || {};
  if (!sessionId || typeof sessionId !== "string") {
    return res.status(400).json({ ok: false, message: "Missing sessionId" });
  }

  try {
    switch (action) {
      case "session_start": {
        await recordSessionStart(sessionId, mergeRequestMeta(meta, req), sessionKind);
        return res.status(200).json({ ok: true });
      }
      case "batch": {
        await recordSessionBatch(sessionId, events, sessionKind);
        return res.status(200).json({ ok: true, count: events.length });
      }
      case "identity": {
        await recordSessionIdentity(sessionId, meta);
        return res.status(200).json({ ok: true });
      }
      case "session_end": {
        if (events.length) {
          await recordSessionBatch(sessionId, events, sessionKind);
        }
        const result = await recordSessionEnd(
          sessionId,
          mergeRequestMeta(meta, req),
          sessionKind,
        );
        return res.status(200).json(result);
      }
      case "session_chain": {
        const result = await recordSessionChain(sessionId, meta);
        return res.status(200).json(result);
      }
      case "session_error": {
        const result = await recordSessionError(sessionId, meta);
        return res.status(200).json(result);
      }
      case "data_pull_notify": {
        const result = await recordDataPullNotify(
          sessionId,
          meta,
          extractClientMeta(req),
        );
        return res.status(200).json(result);
      }
      default:
        return res.status(400).json({ ok: false, message: "Invalid action" });
    }
  } catch (err) {
    console.error("[journey]", err);
    return res.status(500).json({ ok: false, message: err?.message || "Server error" });
  }
}
