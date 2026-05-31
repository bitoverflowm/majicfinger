import dbConnect from "@/lib/dbConnect";
import VisitorSession from "@/models/VisitorSession";
import VisitorEvent from "@/models/VisitorEvent";
import { sendTelegramMessage } from "@/lib/telegram/notify";
import { incrementTelegramEventCounter } from "@/lib/telegram/trackEvent";
import {
  buildSessionEndTelegramMessage,
  buildSessionStartTelegramMessage,
} from "@/lib/analytics/formatJourneySummary";

async function recordSessionStart(sessionId, meta = {}) {
  await dbConnect();
  const now = new Date();

  const existing = await VisitorSession.findOne({ session_id: sessionId });
  if (existing?.started_at) {
    await VisitorSession.updateOne(
      { session_id: sessionId },
      {
        $set: {
          last_seen_at: now,
          ...(meta.email ? { email: meta.email } : {}),
          ...(meta.userId ? { user_id: String(meta.userId) } : {}),
          is_logged_in: !!meta.isLoggedIn,
        },
      },
    );
    return existing;
  }

  const doc = await VisitorSession.create({
    session_id: sessionId,
    started_at: now,
    last_seen_at: now,
    entry_path: meta.entryPath || "/",
    referrer: meta.referrer || "",
    ...(meta.email ? { email: meta.email } : {}),
    ...(meta.userId ? { user_id: String(meta.userId) } : {}),
    is_logged_in: !!meta.isLoggedIn,
  });

  const { count } = await incrementTelegramEventCounter("visitor_session");
  const text = buildSessionStartTelegramMessage({
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

async function recordSessionBatch(sessionId, events = []) {
  if (!events.length) return;
  await dbConnect();
  const now = new Date();

  await VisitorSession.findOneAndUpdate(
    { session_id: sessionId },
    { $set: { last_seen_at: now } },
    { upsert: true, setDefaultsOnInsert: { started_at: now, entry_path: "/" } },
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

async function recordSessionEnd(sessionId, meta = {}) {
  await dbConnect();
  const now = new Date();

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
    .limit(100)
    .lean();

  const { count } = await incrementTelegramEventCounter("visitor_session_end");
  const text = buildSessionEndTelegramMessage({
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

  const { action, sessionId, events = [], meta = {} } = body || {};
  if (!sessionId || typeof sessionId !== "string") {
    return res.status(400).json({ ok: false, message: "Missing sessionId" });
  }

  try {
    switch (action) {
      case "session_start": {
        await recordSessionStart(sessionId, meta);
        return res.status(200).json({ ok: true });
      }
      case "batch": {
        await recordSessionBatch(sessionId, events);
        return res.status(200).json({ ok: true, count: events.length });
      }
      case "identity": {
        await recordSessionIdentity(sessionId, meta);
        return res.status(200).json({ ok: true });
      }
      case "session_end": {
        if (events.length) {
          await recordSessionBatch(sessionId, events);
        }
        const result = await recordSessionEnd(sessionId, meta);
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
