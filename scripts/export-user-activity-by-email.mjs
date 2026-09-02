/**
 * Export all logged platform activity for a user email (Stripe dispute / audit).
 *
 * Usage:
 *   node --import ./scripts/register-alias.mjs scripts/export-user-activity-by-email.mjs --email user@example.com
 *   node --import ./scripts/register-alias.mjs scripts/export-user-activity-by-email.mjs --email user@example.com --prod-db
 */
import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";
import { loadRepoEnvForAws } from "./loadRepoEnvForAws.js";
import { mongoDatabaseTarget, resolveAppMongoUri } from "@/lib/resolveMongoUri";
import { formatJourneyStep } from "@/lib/analytics/formatJourneySummary";

loadRepoEnvForAws();

const args = process.argv.slice(2);
if (args.includes("--prod-db")) {
  process.env.USE_PRODUCTION_DB = "1";
}

function parseArg(flag) {
  const idx = args.indexOf(flag);
  if (idx === -1 || !args[idx + 1]) return "";
  return args[idx + 1];
}

const TARGET_EMAIL = parseArg("--email").trim().toLowerCase();
if (!TARGET_EMAIL) {
  console.error("Usage: ... --email user@example.com [--prod-db]");
  process.exit(1);
}

const emailRegex = new RegExp(`^${TARGET_EMAIL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");

/** @param {Date | string | undefined | null} ts */
function fmtTs(ts) {
  if (!ts) return "";
  return new Date(ts).toISOString().replace("T", " ").replace(/\.\d{3}Z$/, " UTC");
}

/** @param {unknown} value */
function csvCell(value) {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** @param {string[]} row */
function csvLine(row) {
  return row.map(csvCell).join(",");
}

/** @param {Record<string, unknown>} obj */
function compactJson(obj) {
  if (!obj || typeof obj !== "object") return "";
  try {
    return JSON.stringify(obj);
  } catch {
    return "";
  }
}

/** @param {Record<string, unknown>} session */
function sessionContextData(session) {
  return compactJson({
    session_kind: session.session_kind,
    entry_path: session.entry_path,
    entry_url: session.entry_url,
    page_type: session.page_type,
    page_name: session.page_name,
    referrer: session.referrer,
    country: session.country,
    region: session.region,
    city: session.city,
    client_ip: session.client_ip,
    user_agent: session.user_agent?.toString?.().slice?.(0, 120),
    utm_source: session.utm_source,
    utm_medium: session.utm_medium,
    utm_campaign: session.utm_campaign,
    duration:
      session.started_at && session.ended_at
        ? Math.round((new Date(session.ended_at) - new Date(session.started_at)) / 1000) + "s"
        : undefined,
  });
}

/** @param {{ type: string; path?: string; label?: string; meta?: Record<string, unknown> }} event */
function eventData(event) {
  const meta = event.meta && typeof event.meta === "object" ? event.meta : {};
  return compactJson({
    path: event.path || meta.path,
    label: event.label || meta.label,
    ...meta,
  });
}

/** @typedef {{ ts: Date; activity: string; description: string; session_id: string; path: string; data: string }} ActivityRow */

async function main() {
  const uri = resolveAppMongoUri();
  if (!uri) {
    console.error("Missing MongoDB URI");
    process.exit(1);
  }

  console.log(`Connecting to ${mongoDatabaseTarget()} Mongo…`);
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 20000,
    connectTimeoutMS: 20000,
  });

  const User = (await import("@/models/Users")).default;
  const VisitorSession = (await import("@/models/VisitorSession")).default;
  const VisitorEvent = (await import("@/models/VisitorEvent")).default;

  const user = await User.findOne({ email: emailRegex }).lean();

  const sessions = await VisitorSession.find({
    $or: [{ email: emailRegex }, ...(user?._id ? [{ user_id: String(user._id) }] : [])],
  })
    .sort({ started_at: 1 })
    .lean();

  const sessionIds = sessions.map((s) => s.session_id);

  const eventsByEmailMeta = await VisitorEvent.find({
    "meta.email": emailRegex,
  })
    .sort({ ts: 1 })
    .lean();

  const eventsBySession =
    sessionIds.length > 0
      ? await VisitorEvent.find({ session_id: { $in: sessionIds } })
          .sort({ ts: 1 })
          .lean()
      : [];

  const eventKey = (e) => `${e.session_id}:${new Date(e.ts).getTime()}:${e.type}:${e.path}:${e.label}`;
  const seenEvents = new Set();
  /** @type {ActivityRow[]} */
  const rows = [];

  function pushRow(row) {
    rows.push(row);
  }

  if (user) {
    pushRow({
      ts: user.confirmedAt || user.subscribedAt || user.createdAt || new Date(0),
      activity: "account_record",
      description: "User account in database",
      session_id: "",
      path: "",
      data: compactJson({
        email: user.email,
        name: user.name,
        user_id: String(user._id),
        subscriptionTier: user.subscriptionTier,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionType: user.subscriptionType,
        billingCycle: user.billingCycle,
        lifetimeMember: user.lifetimeMember,
        subscribedAt: user.subscribedAt,
        nextPaymentDate: user.nextPaymentDate,
        stripeCustomerId: user.stripeCustomerId,
        stripeSubscriptionId: user.stripeSubscriptionId,
        stripePriceId: user.stripePriceId,
        netPay: user.netPay,
        lastLoginAt: user.lastLoginAt,
        confirmedAt: user.confirmedAt,
        run_yourself_used_at: user.run_yourself_used_at,
        run_yourself_interactive_consumed_at: user.run_yourself_interactive_consumed_at,
      }),
    });
  }

  for (const session of sessions) {
    if (session.start_notified_at || session.started_at) {
      pushRow({
        ts: new Date(session.start_notified_at || session.started_at),
        activity: session.session_kind === "auth" ? "auth_session_start" : "visitor_session_start",
        description:
          session.session_kind === "auth"
            ? `Authenticated session started — ${session.entry_path || "/dashboard"}`
            : `Visitor session started — ${session.page_name || session.entry_path || "/"}`,
        session_id: session.session_id,
        path: session.entry_path || "",
        data: sessionContextData(session),
      });
    }

    for (const event of eventsBySession.filter((e) => e.session_id === session.session_id)) {
      const key = eventKey(event);
      if (seenEvents.has(key)) continue;
      seenEvents.add(key);
      pushRow({
        ts: new Date(event.ts),
        activity: event.type,
        description: formatJourneyStep(event, 0).replace(/^\d+\.\s*/, ""),
        session_id: event.session_id,
        path: event.path || "",
        data: eventData(event),
      });
    }

    if (session.summary_sent_at && !session.summary_skip_reason) {
      pushRow({
        ts: new Date(session.summary_sent_at),
        activity: session.session_kind === "auth" ? "auth_session_end" : "visitor_session_end",
        description:
          session.session_kind === "auth"
            ? "Authenticated session ended (summary sent)"
            : "Visitor session ended (summary sent)",
        session_id: session.session_id,
        path: session.entry_path || "",
        data: sessionContextData(session),
      });
    }
  }

  for (const event of eventsByEmailMeta) {
    const key = eventKey(event);
    if (seenEvents.has(key)) continue;
    seenEvents.add(key);
    pushRow({
      ts: new Date(event.ts),
      activity: event.type,
      description: formatJourneyStep(event, 0).replace(/^\d+\.\s*/, ""),
      session_id: event.session_id,
      path: event.path || "",
      data: eventData(event),
    });
  }

  rows.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());

  const safeEmail = TARGET_EMAIL.replace(/[^a-z0-9@._-]+/gi, "_");
  const OUT_DIR = path.join(process.cwd(), "exports");
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const stamp = new Date().toISOString().slice(0, 10);
  const csvPath = path.join(OUT_DIR, `user-activity_${safeEmail}_${stamp}.csv`);
  const txtPath = path.join(OUT_DIR, `user-activity_${safeEmail}_${stamp}.txt`);

  const csvHeader = ["timestamp_utc", "activity", "description", "session_id", "path", "data"];
  const csvBody = [csvHeader.join(",")];
  for (const row of rows) {
    csvBody.push(
      csvLine([
        fmtTs(row.ts),
        row.activity,
        row.description,
        row.session_id,
        row.path,
        row.data,
      ]),
    );
  }
  fs.writeFileSync(csvPath, csvBody.join("\n"), "utf8");

  const txtHeader = [
    "Lychee — user activity export for dispute resolution",
    `Email: ${TARGET_EMAIL}`,
    `Database: ${mongoDatabaseTarget()}`,
    `Generated: ${new Date().toISOString()}`,
    `Sessions matched: ${sessions.length}`,
    `Activity rows: ${rows.length}`,
    user ? `User ID: ${user._id}` : "User ID: (no Users record — journey data only)",
    "",
    "=".repeat(80),
    "",
  ].join("\n");

  const txtBody = rows
    .map(
      (row) =>
        [
          "─".repeat(80),
          `[${fmtTs(row.ts)}] ${row.activity}`,
          row.description,
          row.session_id ? `Session: ${row.session_id}` : "",
          row.path ? `Path: ${row.path}` : "",
          row.data ? `Data: ${row.data}` : "",
          "",
        ]
          .filter(Boolean)
          .join("\n"),
    )
    .join("\n");

  fs.writeFileSync(txtPath, txtHeader + txtBody, "utf8");

  console.log(`Wrote ${rows.length} activity rows:`);
  console.log(`  CSV: ${csvPath}`);
  console.log(`  TXT: ${txtPath}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
