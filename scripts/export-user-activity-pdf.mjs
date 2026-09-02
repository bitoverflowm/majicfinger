/**
 * Export user activity as a formatted PDF for dispute resolution.
 *
 * Usage:
 *   node --import ./scripts/register-alias.mjs scripts/export-user-activity-pdf.mjs --email user@example.com --prod-db
 */
import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";
import PDFDocument from "pdfkit";
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

const COLORS = {
  headerBg: "#1e293b",
  headerText: "#ffffff",
  rowAlt: "#f8fafc",
  row: "#ffffff",
  border: "#cbd5e1",
  text: "#0f172a",
  muted: "#64748b",
  accent: "#2563eb",
};

/** @param {Date | string | undefined | null} ts */
function fmtTs(ts) {
  if (!ts) return "";
  return new Date(ts).toISOString().replace("T", " ").replace(/\.\d{3}Z$/, " UTC");
}

/** @param {Record<string, unknown>} session */
function formatLocation(session = {}) {
  const parts = [
    session.country,
    session.region,
    session.city,
  ].filter(Boolean);
  return parts.join(", ");
}

/** @typedef {{ ts: Date; activity: string; description: string; session_id: string; path: string; ip: string; location: string; details: string }} ActivityRow */

async function collectActivityRows() {
  const uri = resolveAppMongoUri();
  if (!uri) throw new Error("Missing MongoDB URI");

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

  /** @type {Map<string, { ip: string; location: string }>} */
  const sessionGeo = new Map();
  for (const s of sessions) {
    sessionGeo.set(s.session_id, {
      ip: s.client_ip || "",
      location: formatLocation(s),
    });
  }

  const sessionIds = sessions.map((s) => s.session_id);
  const eventsBySession =
    sessionIds.length > 0
      ? await VisitorEvent.find({ session_id: { $in: sessionIds } }).sort({ ts: 1 }).lean()
      : [];
  const eventsByEmailMeta = await VisitorEvent.find({ "meta.email": emailRegex })
    .sort({ ts: 1 })
    .lean();

  /** @type {ActivityRow[]} */
  const rows = [];
  const seenEvents = new Set();
  const eventKey = (e) =>
    `${e.session_id}:${new Date(e.ts).getTime()}:${e.type}:${e.path}:${e.label}`;

  function geoForSession(sessionId) {
    return sessionGeo.get(sessionId) || { ip: "", location: "" };
  }

  function pushRow(row) {
    rows.push(row);
  }

  if (user) {
    pushRow({
      ts: new Date(user.subscribedAt || user.confirmedAt || 0),
      activity: "account_record",
      description: "User account created / subscribed",
      session_id: "",
      path: "",
      ...geoForSession(""),
      details: [
        `Name: ${user.name || "—"}`,
        `Tier: ${user.subscriptionTier || "—"} (${user.subscriptionStatus || "—"})`,
        `Billing: ${user.billingCycle || "—"}`,
        `Subscribed: ${user.subscribedAt ? fmtTs(user.subscribedAt) : "—"}`,
        `Stripe customer: ${user.stripeCustomerId || "—"}`,
        `Stripe subscription: ${user.stripeSubscriptionId || "—"}`,
      ].join(" · "),
    });
  }

  for (const session of sessions) {
    const geo = geoForSession(session.session_id);

    if (session.start_notified_at || session.started_at) {
      pushRow({
        ts: new Date(session.start_notified_at || session.started_at),
        activity: session.session_kind === "auth" ? "auth_session_start" : "visitor_session_start",
        description:
          session.session_kind === "auth"
            ? `Authenticated session started — ${session.entry_path || "/dashboard"}`
            : `Visitor session started — ${session.page_name || session.entry_path || "/"}`,
        session_id: session.session_id.slice(0, 8) + "…",
        path: session.entry_path || "",
        ip: geo.ip,
        location: geo.location,
        details: session.referrer ? `Referrer: ${session.referrer}` : "",
      });
    }

    for (const event of eventsBySession.filter((e) => e.session_id === session.session_id)) {
      const key = eventKey(event);
      if (seenEvents.has(key)) continue;
      seenEvents.add(key);
      const meta = event.meta && typeof event.meta === "object" ? event.meta : {};
      pushRow({
        ts: new Date(event.ts),
        activity: event.type,
        description: formatJourneyStep(event, 0).replace(/^\d+\.\s*/, ""),
        session_id: event.session_id.slice(0, 8) + "…",
        path: event.path || "",
        ip: geo.ip,
        location: geo.location,
        details: meta.integration
          ? `${meta.integration}${meta.table ? ` / ${meta.table}` : ""}${meta.rowCount != null ? ` → ${meta.rowCount} rows` : ""}`
          : meta.label || meta.href || "",
      });
    }

    if (session.summary_sent_at && !session.summary_skip_reason) {
      pushRow({
        ts: new Date(session.summary_sent_at),
        activity: session.session_kind === "auth" ? "auth_session_end" : "visitor_session_end",
        description: "Session ended",
        session_id: session.session_id.slice(0, 8) + "…",
        path: session.entry_path || "",
        ip: geo.ip,
        location: geo.location,
        details: session.started_at && session.ended_at
          ? `Duration: ${Math.round((new Date(session.ended_at) - new Date(session.started_at)) / 1000)}s`
          : "",
      });
    }
  }

  for (const event of eventsByEmailMeta) {
    const key = eventKey(event);
    if (seenEvents.has(key)) continue;
    seenEvents.add(key);
    const geo = geoForSession(event.session_id);
    const meta = event.meta && typeof event.meta === "object" ? event.meta : {};
    pushRow({
      ts: new Date(event.ts),
      activity: event.type,
      description: formatJourneyStep(event, 0).replace(/^\d+\.\s*/, ""),
      session_id: event.session_id.slice(0, 8) + "…",
      path: event.path || "",
      ip: geo.ip,
      location: geo.location,
      details: meta.label || meta.href || "",
    });
  }

  rows.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());

  await mongoose.disconnect();

  const uniqueIps = [...new Set(sessions.map((s) => s.client_ip).filter(Boolean))];

  return { user, sessions, rows, uniqueIps };
}

/**
 * @param {PDFKit.PDFDocument} doc
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {string} text
 * @param {{ bold?: boolean; fill?: string; color?: string; size?: number; align?: string }} opts
 */
function drawCell(doc, x, y, w, h, text, opts = {}) {
  const fill = opts.fill || COLORS.row;
  doc.rect(x, y, w, h).fill(fill);
  doc.rect(x, y, w, h).strokeColor(COLORS.border).lineWidth(0.5).stroke();
  doc
    .fillColor(opts.color || COLORS.text)
    .fontSize(opts.size || 8)
    .font(opts.bold ? "Helvetica-Bold" : "Helvetica")
    .text(String(text || ""), x + 4, y + 4, {
      width: w - 8,
      height: h - 6,
      align: opts.align || "left",
      ellipsis: true,
    });
}

/** @param {PDFKit.PDFDocument} doc @param {ActivityRow[]} rows */
function drawActivityTable(doc, rows) {
  const margins = { left: 40, right: 40, top: 40, bottom: 50 };
  const pageWidth = doc.page.width - margins.left - margins.right;

  const cols = [
    { key: "ts", label: "Timestamp (UTC)", width: 0.17 },
    { key: "activity", label: "Activity", width: 0.13 },
    { key: "description", label: "Description", width: 0.28 },
    { key: "ip", label: "IP address", width: 0.12 },
    { key: "location", label: "Location", width: 0.14 },
    { key: "path", label: "Path", width: 0.16 },
  ];

  const colWidths = cols.map((c) => Math.floor(pageWidth * c.width));
  const rowHeight = 28;
  const headerHeight = 22;

  let y = doc.y;

  function ensureSpace(needed) {
    if (y + needed > doc.page.height - margins.bottom) {
      doc.addPage();
      y = margins.top;
      drawHeaderRow();
    }
  }

  function drawHeaderRow() {
    let x = margins.left;
    for (let i = 0; i < cols.length; i++) {
      drawCell(doc, x, y, colWidths[i], headerHeight, cols[i].label, {
        bold: true,
        fill: COLORS.headerBg,
        color: COLORS.headerText,
        size: 7,
      });
      x += colWidths[i];
    }
    y += headerHeight;
  }

  drawHeaderRow();

  rows.forEach((row, idx) => {
    ensureSpace(rowHeight);
    const fill = idx % 2 === 0 ? COLORS.row : COLORS.rowAlt;
    let x = margins.left;
    const values = [
      fmtTs(row.ts),
      row.activity,
      row.description,
      row.ip || "—",
      row.location || "—",
      row.path || "—",
    ];
    for (let i = 0; i < values.length; i++) {
      drawCell(doc, x, y, colWidths[i], rowHeight, values[i], { fill, size: 7 });
      x += colWidths[i];
    }
    y += rowHeight;
  });

  doc.y = y;
}

async function main() {
  console.log(`Fetching activity for ${TARGET_EMAIL} from ${mongoDatabaseTarget()}…`);
  const { user, sessions, rows, uniqueIps } = await collectActivityRows();

  const safeEmail = TARGET_EMAIL.replace(/[^a-z0-9@._-]+/gi, "_");
  const OUT_DIR = path.join(process.cwd(), "exports");
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const pdfPath = path.join(
    OUT_DIR,
    `user-activity_${safeEmail}_${new Date().toISOString().slice(0, 10)}.pdf`,
  );

  const doc = new PDFDocument({ margin: 40, size: "A4", layout: "landscape" });
  const stream = fs.createWriteStream(pdfPath);
  doc.pipe(stream);

  // Cover / summary
  doc
    .fillColor(COLORS.text)
    .font("Helvetica-Bold")
    .fontSize(20)
    .text("Lychee — User Activity Report", { align: "left" });
  doc.moveDown(0.5);
  doc.font("Helvetica").fontSize(11).fillColor(COLORS.muted);
  doc.text(`Prepared for dispute resolution · Generated ${new Date().toISOString()}`);
  doc.moveDown(1);

  doc.font("Helvetica-Bold").fontSize(12).fillColor(COLORS.text).text("Account summary");
  doc.moveDown(0.3);
  doc.font("Helvetica").fontSize(10);
  const summaryLines = [
    ["Email", TARGET_EMAIL],
    ["Name", user?.name || "—"],
    ["User ID", user?._id ? String(user._id) : "—"],
    ["Subscription", `${user?.subscriptionTier || "—"} · ${user?.subscriptionStatus || "—"} · ${user?.billingCycle || "—"}`],
    ["Subscribed (UTC)", user?.subscribedAt ? fmtTs(user.subscribedAt) : "—"],
    ["Stripe customer", user?.stripeCustomerId || "—"],
    ["Stripe subscription", user?.stripeSubscriptionId || "—"],
    ["Sessions logged", String(sessions.length)],
    ["Activity events", String(rows.length)],
    ["Unique IP addresses", uniqueIps.length ? uniqueIps.join(", ") : "Not recorded for early sessions"],
  ];
  for (const [label, value] of summaryLines) {
    doc.font("Helvetica-Bold").text(`${label}: `, { continued: true });
    doc.font("Helvetica").text(String(value));
  }

  doc.moveDown(0.8);
  doc.font("Helvetica").fontSize(9).fillColor(COLORS.muted);
  doc.text(
    "IP address and location are captured from Vercel geo headers at session start/end when available. " +
      "Sessions before July 2026 may not include IP data. Full JSON metadata is available in the companion CSV export.",
  );

  doc.addPage();
  doc.font("Helvetica-Bold").fontSize(14).fillColor(COLORS.text).text("Activity log");
  doc.moveDown(0.5);
  drawActivityTable(doc, rows);

  doc.end();

  await new Promise((resolve, reject) => {
    stream.on("finish", resolve);
    stream.on("error", reject);
  });

  console.log(`Wrote PDF (${rows.length} rows): ${pdfPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
