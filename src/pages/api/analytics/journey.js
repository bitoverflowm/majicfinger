import dbConnect from "@/lib/dbConnect";
import VisitorEvent from "@/models/VisitorEvent";
import { sendTelegramMessage } from "@/lib/telegram/notify";
import { incrementTelegramEventCounter } from "@/lib/telegram/trackEvent";
import {
  buildAuthSessionChainTelegramMessage,
  buildAuthSessionEndTelegramMessage,
  buildAuthSessionErrorTelegramMessage,
  buildAuthSessionStartTelegramMessage,
  buildSessionEndTelegramMessage,
  buildSessionStartTelegramMessage,
} from "@/lib/analytics/formatJourneySummary";
import { buildDataPullTelegramMessage } from "@/lib/analytics/formatDataPullTelegram";
import VisitorSession from "@/models/VisitorSession";

function isAuthSession(sessionKind) {
  return sessionKind === "auth";
}

/** Auth sessions with no real activity for this long are treated as abandoned. */
const AUTH_SESSION_STALE_MS = 30 * 60 * 1000;

async function recordSessionStart(sessionId, meta = {}, sessionKind = "visitor") {
  await dbConnect();
  const now = new Date();
  const auth = isAuthSession(sessionKind);

  const existing = await VisitorSession.findOne({ session_id: sessionId });
  if (existing?.started_at) {
    await VisitorSession.updateOne(
      { session_id: sessionId },
      {
        $set: {
          last_seen_at: now,
          ...(meta.email ? { email: meta.email } : {}),
          ...(meta.userId ? { user_id: String(meta.userId) } : {}),
          is_logged_in: auth || !!meta.isLoggedIn,
        },
      },
    );
    return existing;
  }

  const doc = await VisitorSession.create({
    session_id: sessionId,
    session_kind: auth ? "auth" : "visitor",
    started_at: now,
    last_seen_at: now,
    entry_path: meta.entryPath || (auth ? "/dashboard" : "/"),
    referrer: auth ? "" : meta.referrer || "",
    ...(meta.email ? { email: meta.email } : {}),
    ...(meta.userId ? { user_id: String(meta.userId) } : {}),
    is_logged_in: auth || !!meta.isLoggedIn,
  });

  const counterKey = auth ? "auth_session" : "visitor_session";
  const { count } = await incrementTelegramEventCounter(counterKey);

  const text = auth
    ? buildAuthSessionStartTelegramMessage({
        session: {
          session_id: sessionId,
          entry_path: doc.entry_path,
          email: doc.email,
        },
        sessionCount: count,
      })
    : buildSessionStartTelegramMessage({
        session: {
          session_id: sessionId,
          entry_path: doc.entry_path,
          referrer: doc.referrer,
          is_logged_in: doc.is_logged_in,
          email: doc.email,
        },
        sessionCount: count,
      });

  await sendTelegramMessage(text);
  return doc;
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
        entry_path: auth ? "/dashboard" : "/",
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

  const session = await VisitorSession.findOneAndUpdate(
    { session_id: sessionId, summary_sent_at: { $exists: false } },
    {
      $set: {
        ended_at: now,
        last_seen_at: now,
        summary_sent_at: now,
        ...(meta.email ? { email: meta.email } : {}),
        ...(meta.userId ? { user_id: String(meta.userId) } : {}),
        ...(meta.isLoggedIn != null ? { is_logged_in: !!meta.isLoggedIn } : {}),
      },
    },
    { new: true },
  );

  if (!session) {
    return { ok: true, deduped: true };
  }

  const events = await VisitorEvent.find({ session_id: sessionId })
    .sort({ ts: 1 })
    .limit(auth ? 150 : 100)
    .lean();

  const counterKey = auth ? "auth_session_end" : "visitor_session_end";
  const { count } = await incrementTelegramEventCounter(counterKey);

  const text = auth
    ? buildAuthSessionEndTelegramMessage({
        session: {
          session_id: sessionId,
          started_at: session.started_at,
          ended_at: now,
          entry_path: session.entry_path,
          email: session.email || meta.email,
          chain_count: session.chain_count || 0,
        },
        events,
        sessionCount: count,
      })
    : buildSessionEndTelegramMessage({
        session: {
          session_id: sessionId,
          started_at: session.started_at,
          ended_at: now,
          entry_path: session.entry_path,
          email: session.email || meta.email,
          is_logged_in: session.is_logged_in || !!meta.isLoggedIn,
        },
        events,
        sessionCount: count,
      });

  await sendTelegramMessage(text);
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

async function recordDataPullNotify(sessionId, meta = {}) {
  await dbConnect();

  const phase = meta.phase;
  if (!phase || !["started", "completed", "zero_rows", "error"].includes(phase)) {
    return { ok: false, message: "Invalid data pull phase" };
  }

  const session = await VisitorSession.findOne({ session_id: sessionId }).lean();
  const { phase: _phase, ...pullMeta } = meta;

  const text = buildDataPullTelegramMessage({
    phase,
    meta: pullMeta,
    sessionEmail: pullMeta.email || session?.email,
  });

  await sendTelegramMessage(text);
  return { ok: true };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, message: "Method not allowed" });
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
        await recordSessionStart(sessionId, meta, sessionKind);
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
        const result = await recordSessionEnd(sessionId, meta, sessionKind);
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
        const result = await recordDataPullNotify(sessionId, meta);
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
