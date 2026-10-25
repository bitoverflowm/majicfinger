/**
 * Build a downloadable user-behavior report (HTML + CSVs, zipped) from the
 * journey data that powers the Telegram alerts (VisitorSession, VisitorEvent,
 * Users, TelegramEventCounter).
 *
 * Usage:
 *   node --import ./scripts/register-alias.mjs scripts/export-behavior-report.mjs --prod-db
 *   node --import ./scripts/register-alias.mjs scripts/export-behavior-report.mjs --prod-db --months 6
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import mongoose from "mongoose";
import { loadRepoEnvForAws } from "./loadRepoEnvForAws.js";
import { mongoDatabaseTarget, resolveAppMongoUri } from "@/lib/resolveMongoUri";

loadRepoEnvForAws();

const args = process.argv.slice(2);
if (args.includes("--prod-db")) process.env.USE_PRODUCTION_DB = "1";

function parseArg(flag, fallback) {
  const idx = args.indexOf(flag);
  if (idx === -1 || !args[idx + 1]) return fallback;
  return args[idx + 1];
}

const MONTHS = Math.max(1, Number(parseArg("--months", "6")) || 6);
const NOW = new Date();
const RANGE_FROM = new Date(Date.UTC(NOW.getUTCFullYear(), NOW.getUTCMonth() - (MONTHS - 1), 1));
const RANGE_TO = NOW;

const BOT_RE = /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|python|curl|wget|httpclient|vercel-screenshot/i;
const HIGH_INTENT_RE = "pricing|checkout|stripe|choose |access now|explore for free|sign up|subscribe|upgrade|get started|try for free";
const OWN_DOMAINS = ["lycheedata.com", "localhost"];

// ---------- helpers ----------

const fmtN = (n) => (n == null || Number.isNaN(Number(n)) ? "—" : Number(n).toLocaleString("en-US"));
const pct = (num, den) => (den ? `${((num / den) * 100).toFixed(1)}%` : "—");
const ymd = (d) => new Date(d).toISOString().slice(0, 10);

function escHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function csvCell(v) {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function countryLabel(code) {
  const c = String(code || "").toUpperCase();
  if (!/^[A-Z]{2}$/.test(c)) return "Unknown";
  const flag = [...c].map((ch) => String.fromCodePoint(0x1f1e6 + ch.charCodeAt(0) - 65)).join("");
  let name = c;
  try {
    name = new Intl.DisplayNames(["en"], { type: "region" }).of(c) || c;
  } catch {
    /* ignore */
  }
  return `${flag} ${name}`;
}

function refDomain(r) {
  if (!r) return "(direct / none)";
  try {
    const host = new URL(r).hostname.replace(/^www\./, "");
    if (OWN_DOMAINS.some((d) => host.endsWith(d))) return "(internal navigation)";
    if (host.includes("stripe.com")) return "stripe.com (checkout return)";
    return host;
  } catch {
    return String(r).slice(0, 60);
  }
}

function parseUa(ua) {
  const s = ua || "";
  const device = /ipad|tablet/i.test(s)
    ? "Tablet"
    : /mobile|iphone|android|ipod/i.test(s)
      ? "Mobile"
      : s
        ? "Desktop"
        : "Unknown (not captured)";
  let browser = s ? "Other" : "Unknown (not captured)";
  if (/edg\//i.test(s)) browser = "Edge";
  else if (/opr\/|opera/i.test(s)) browser = "Opera";
  else if (/firefox|fxios/i.test(s)) browser = "Firefox";
  else if (/chrome|crios/i.test(s)) browser = "Chrome";
  else if (/safari/i.test(s)) browser = "Safari";
  let os = s ? "Other" : "Unknown (not captured)";
  if (/windows/i.test(s)) os = "Windows";
  else if (/iphone|ipad|ipod/i.test(s)) os = "iOS";
  else if (/android/i.test(s)) os = "Android";
  else if (/mac os x|macintosh/i.test(s)) os = "macOS";
  else if (/linux|cros/i.test(s)) os = "Linux / ChromeOS";
  return { device, browser, os, bot: BOT_RE.test(s) };
}

function median(arr) {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function fmtDuration(sec) {
  if (sec == null) return "—";
  const s = Math.round(sec);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function tally(rows, keyFn, valFn = () => 1) {
  const map = new Map();
  for (const r of rows) {
    const k = keyFn(r);
    map.set(k, (map.get(k) || 0) + valFn(r));
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

// ---------- table registry (feeds both HTML and CSV) ----------

/** @type {Record<string, { title: string; columns: { key: string; label: string; num?: boolean }[]; rows: Record<string, unknown>[] }>} */
const TABLES = {};

function table(name, title, columns, rows) {
  TABLES[name] = { title, columns, rows };
  return TABLES[name];
}

function renderTable(t, { barKey, limit = 25, note } = {}) {
  if (!t) return "";
  const rows = limit ? t.rows.slice(0, limit) : t.rows;
  const max = barKey ? Math.max(1, ...rows.map((r) => Number(r[barKey]) || 0)) : 0;
  const head = t.columns
    .map((c) => `<th class="${c.num ? "num" : ""}">${escHtml(c.label)}</th>`)
    .join("");
  const body = rows.length
    ? rows
        .map(
          (r) =>
            `<tr>${t.columns
              .map((c) => {
                const v = r[c.key];
                if (barKey && c.key === barKey) {
                  const w = Math.max(1, ((Number(v) || 0) / max) * 100);
                  return `<td class="num barcell"><span class="bar" style="width:${w.toFixed(1)}%"></span><b>${escHtml(fmtN(v))}</b></td>`;
                }
                return `<td class="${c.num ? "num" : ""}">${escHtml(c.num && typeof v === "number" ? fmtN(v) : v ?? "—")}</td>`;
              })
              .join("")}</tr>`,
        )
        .join("")
    : `<tr><td colspan="${t.columns.length}" class="muted">No data in range</td></tr>`;
  const more =
    limit && t.rows.length > limit
      ? `<p class="muted small">Showing top ${limit} of ${fmtN(t.rows.length)} — full list in <code>${escHtml(Object.keys(TABLES).find((k) => TABLES[k] === t))}.csv</code></p>`
      : "";
  return `<div class="card"><h3>${escHtml(t.title)}</h3>${note ? `<p class="muted small">${escHtml(note)}</p>` : ""}<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>${more}</div>`;
}

function lineChart(days, series, { height = 240 } = {}) {
  const width = 1000;
  const pad = { l: 44, r: 12, t: 12, b: 28 };
  const maxY = Math.max(1, ...series.flatMap((s) => days.map((d) => s.values.get(d) || 0)));
  const x = (i) => pad.l + (i / Math.max(1, days.length - 1)) * (width - pad.l - pad.r);
  const y = (v) => height - pad.b - (v / maxY) * (height - pad.t - pad.b);
  const grid = [0, 0.25, 0.5, 0.75, 1]
    .map((f) => {
      const val = Math.round(maxY * f);
      return `<line x1="${pad.l}" x2="${width - pad.r}" y1="${y(val)}" y2="${y(val)}" class="grid"/><text x="${pad.l - 6}" y="${y(val) + 4}" class="axis" text-anchor="end">${val}</text>`;
    })
    .join("");
  const step = Math.max(1, Math.ceil(days.length / 10));
  const xLabels = days
    .map((d, i) => (i % step === 0 ? `<text x="${x(i)}" y="${height - 8}" class="axis" text-anchor="middle">${d.slice(5)}</text>` : ""))
    .join("");
  const lines = series
    .map(
      (s) =>
        `<polyline fill="none" stroke="${s.color}" stroke-width="2" points="${days
          .map((d, i) => `${x(i).toFixed(1)},${y(s.values.get(d) || 0).toFixed(1)}`)
          .join(" ")}"/>`,
    )
    .join("");
  const legend = series
    .map((s) => `<span class="legend"><i style="background:${s.color}"></i>${escHtml(s.label)}</span>`)
    .join("");
  return `<div class="card"><div>${legend}</div><svg viewBox="0 0 ${width} ${height}" class="chart">${grid}${xLabels}${lines}</svg></div>`;
}

// ---------- main ----------

async function main() {
  const uri = resolveAppMongoUri();
  if (!uri) throw new Error("Missing MongoDB URI");

  console.log(`Connecting to ${mongoDatabaseTarget()} Mongo…`);
  console.log(`Range: ${ymd(RANGE_FROM)} → ${ymd(RANGE_TO)} (${MONTHS} months)`);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 20000, connectTimeoutMS: 20000 });

  const VisitorSession = (await import("@/models/VisitorSession")).default;
  const VisitorEvent = (await import("@/models/VisitorEvent")).default;
  const User = (await import("@/models/Users")).default;
  const TelegramEventCounter = (await import("@/models/TelegramEventCounter")).default;

  // ---- raw pulls (projected, lean) ----
  console.log("Loading sessions…");
  const sessions = await VisitorSession.find(
    { started_at: { $gte: RANGE_FROM, $lt: RANGE_TO } },
    {
      session_id: 1,
      session_kind: 1,
      started_at: 1,
      ended_at: 1,
      entry_path: 1,
      page_name: 1,
      referrer: 1,
      utm_source: 1,
      utm_medium: 1,
      utm_campaign: 1,
      visitor_id: 1,
      client_ip: 1,
      user_agent: 1,
      country: 1,
      region: 1,
      city: 1,
      email: 1,
      user_id: 1,
      is_logged_in: 1,
      start_telegram_skip_reason: 1,
    },
  ).lean();
  console.log(`  ${fmtN(sessions.length)} sessions`);

  const sessionById = new Map(sessions.map((s) => [s.session_id, s]));
  const isAuth = (s) => s?.session_kind === "auth";
  const visitorSessions = sessions.filter((s) => !isAuth(s));
  const authSessions = sessions.filter(isAuth);
  const monthOf = (d) => new Date(d).toISOString().slice(0, 7);
  const visitorKey = (s) =>
    s.visitor_id || (s.client_ip ? `${s.client_ip}|${s.user_agent || ""}` : `session:${s.session_id}`);
  const durationSec = (s) =>
    s.started_at && s.ended_at
      ? Math.max(0, (new Date(s.ended_at) - new Date(s.started_at)) / 1000)
      : null;

  console.log("Loading events…");
  const events = [];
  const eventCursor = VisitorEvent.collection.find(
    { ts: { $gte: RANGE_FROM, $lt: RANGE_TO } },
    { projection: { session_id: 1, ts: 1, type: 1, path: 1, label: 1, meta: 1 }, batchSize: 2000 },
  );
  for await (const e of eventCursor) {
    events.push(e);
    if (events.length % 20000 === 0) console.log(`  …${fmtN(events.length)}`);
  }
  console.log(`  ${fmtN(events.length)} events`);

  console.log("Loading users + counters…");
  const users = await User.find(
    {},
    { email: 1, subscriptionTier: 1, subscriptionStatus: 1, lifetimeMember: 1, subscribedAt: 1, billingCycle: 1 },
  ).lean();
  const counters = await TelegramEventCounter.find({}).lean();
  await mongoose.disconnect();

  const meta = (e) => (e.meta && typeof e.meta === "object" ? e.meta : {});
  const evLabel = (e) => String(meta(e).label || e.label || "").trim();
  const highIntentRe = new RegExp(HIGH_INTENT_RE, "i");
  const isHighIntentClick = (e) =>
    e.type === "page_click" && highIntentRe.test(`${evLabel(e)} ${meta(e).href || ""} ${meta(e).section || ""}`);

  // ---- bot filtering for visitor stats ----
  const botSessionIds = new Set(
    visitorSessions.filter((s) => parseUa(s.user_agent).bot).map((s) => s.session_id),
  );
  const humanVisitorSessions = visitorSessions.filter((s) => !botSessionIds.has(s.session_id));

  // ---- collapse runaway repeated pull starts into attempts ----
  const PULL_REPEAT_GAP_MS = 10_000;
  const rawPullStarts = events
    .filter((e) => e.type === "query_submit" && meta(e).status === "started")
    .sort((a, b) => new Date(a.ts) - new Date(b.ts));
  const lastStartByKey = new Map();
  const startsPerSession = new Map();
  const pullAttempts = [];
  for (const e of rawPullStarts) {
    const m = meta(e);
    const key = `${e.session_id}|${m.integration || ""}|${m.endpoint || m.table || m.sampleId || ""}|${m.querySummary || ""}`;
    const t = new Date(e.ts).getTime();
    const prev = lastStartByKey.get(key);
    if (prev == null || t - prev > PULL_REPEAT_GAP_MS) pullAttempts.push(e);
    lastStartByKey.set(key, t);
    startsPerSession.set(e.session_id, (startsPerSession.get(e.session_id) || 0) + 1);
  }
  const attemptIds = new Set(pullAttempts);

  // ---- monthly summary ----
  const months = [];
  for (let d = new Date(RANGE_FROM); d < RANGE_TO; d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))) {
    months.push(d.toISOString().slice(0, 7));
  }
  const userCreatedAt = (u) => new Date(parseInt(String(u._id).slice(0, 8), 16) * 1000);

  const monthly = months.map((m) => {
    const vs = humanVisitorSessions.filter((s) => monthOf(s.started_at) === m);
    const as = authSessions.filter((s) => monthOf(s.started_at) === m);
    const ev = events.filter((e) => monthOf(e.ts) === m);
    const q = ev.filter((e) => e.type === "query_submit");
    return {
      month: m,
      visitor_sessions: vs.length,
      unique_visitors: new Set(vs.map(visitorKey)).size,
      auth_sessions: as.length,
      active_logged_in_users: new Set(as.map((s) => s.email || s.user_id).filter(Boolean)).size,
      new_accounts: users.filter((u) => monthOf(userCreatedAt(u)) === m).length,
      new_paid: users.filter((u) => u.subscribedAt && monthOf(u.subscribedAt) === m).length,
      page_clicks: ev.filter((e) => e.type === "page_click").length,
      hero_ctas: ev.filter((e) => e.type === "hero_cta_click").length,
      pulls_started: pullAttempts.filter((e) => monthOf(e.ts) === m).length,
      raw_pull_starts: q.filter((e) => meta(e).status === "started").length,
      pulls_success: q.filter((e) => meta(e).status === "success").length,
      pulls_zero_rows: q.filter((e) => meta(e).status === "zero_rows").length,
      pull_errors: ev.filter((e) => e.type === "query_error").length,
      client_errors: ev.filter((e) => e.type === "error").length,
    };
  });
  table("monthly_summary", "Monthly summary", [
    { key: "month", label: "Month" },
    { key: "visitor_sessions", label: "Visitor sessions", num: true },
    { key: "unique_visitors", label: "Unique visitors", num: true },
    { key: "auth_sessions", label: "Logged-in sessions", num: true },
    { key: "active_logged_in_users", label: "Active logged-in users", num: true },
    { key: "new_accounts", label: "New accounts", num: true },
    { key: "new_paid", label: "New paid subs", num: true },
    { key: "page_clicks", label: "Page clicks", num: true },
    { key: "hero_ctas", label: "Hero CTA clicks", num: true },
    { key: "pulls_started", label: "Pull attempts", num: true },
    { key: "raw_pull_starts", label: "Raw start events", num: true },
    { key: "pulls_success", label: "Pulls OK", num: true },
    { key: "pulls_zero_rows", label: "Zero-row pulls", num: true },
    { key: "pull_errors", label: "Pull errors", num: true },
    { key: "client_errors", label: "Client errors", num: true },
  ], monthly);

  // ---- daily series ----
  const days = [];
  for (let d = new Date(Date.UTC(RANGE_FROM.getUTCFullYear(), RANGE_FROM.getUTCMonth(), RANGE_FROM.getUTCDate())); d < RANGE_TO; d = new Date(d.getTime() + 86400000)) {
    days.push(ymd(d));
  }
  const dailyVisitor = new Map(tally(humanVisitorSessions, (s) => ymd(s.started_at)));
  const dailyAuth = new Map(tally(authSessions, (s) => ymd(s.started_at)));
  const dailyPulls = new Map(tally(pullAttempts, (e) => ymd(e.ts)));
  table(
    "daily_activity",
    "Daily activity",
    [
      { key: "day", label: "Day" },
      { key: "visitor_sessions", label: "Visitor sessions", num: true },
      { key: "auth_sessions", label: "Logged-in sessions", num: true },
      { key: "pulls_started", label: "Pull attempts", num: true },
    ],
    days.map((d) => ({
      day: d,
      visitor_sessions: dailyVisitor.get(d) || 0,
      auth_sessions: dailyAuth.get(d) || 0,
      pulls_started: dailyPulls.get(d) || 0,
    })),
  );

  // ---- acquisition ----
  table(
    "referrers",
    "Top referrers (visitor sessions)",
    [
      { key: "source", label: "Source" },
      { key: "sessions", label: "Sessions", num: true },
      { key: "share", label: "Share" },
    ],
    tally(humanVisitorSessions, (s) => refDomain(s.referrer)).map(([source, n]) => ({
      source,
      sessions: n,
      share: pct(n, humanVisitorSessions.length),
    })),
  );

  table(
    "entry_pages",
    "Top landing pages",
    [
      { key: "path", label: "Entry path" },
      { key: "sessions", label: "Sessions", num: true },
      { key: "share", label: "Share" },
    ],
    tally(humanVisitorSessions, (s) => s.entry_path || "/").map(([p, n]) => ({
      path: p,
      sessions: n,
      share: pct(n, humanVisitorSessions.length),
    })),
  );

  table(
    "utm_campaigns",
    "UTM campaigns",
    [
      { key: "source", label: "utm_source" },
      { key: "medium", label: "utm_medium" },
      { key: "campaign", label: "utm_campaign" },
      { key: "sessions", label: "Sessions", num: true },
    ],
    tally(
      humanVisitorSessions.filter((s) => s.utm_source),
      (s) => `${s.utm_source}\u0000${s.utm_medium || ""}\u0000${s.utm_campaign || ""}`,
    ).map(([k, n]) => {
      const [source, medium, campaign] = k.split("\u0000");
      return { source, medium: medium || "—", campaign: campaign || "—", sessions: n };
    }),
  );

  const geoSessions = humanVisitorSessions.filter((s) => s.country);
  table(
    "countries",
    "Countries (sessions with geo captured)",
    [
      { key: "country", label: "Country" },
      { key: "sessions", label: "Sessions", num: true },
      { key: "visitors", label: "Unique visitors", num: true },
      { key: "share", label: "Share" },
    ],
    (() => {
      const groups = new Map();
      for (const s of geoSessions) {
        const g = groups.get(s.country) || { sessions: 0, visitors: new Set() };
        g.sessions += 1;
        g.visitors.add(visitorKey(s));
        groups.set(s.country, g);
      }
      return [...groups.entries()]
        .map(([c, g]) => ({
          country: countryLabel(c),
          sessions: g.sessions,
          visitors: g.visitors.size,
          share: pct(g.sessions, geoSessions.length),
        }))
        .sort((a, b) => b.sessions - a.sessions);
    })(),
  );

  table(
    "cities",
    "Top cities",
    [
      { key: "place", label: "City" },
      { key: "sessions", label: "Sessions", num: true },
    ],
    tally(geoSessions, (s) => [s.city, s.region, countryLabel(s.country)].filter(Boolean).join(", ")).map(
      ([place, n]) => ({ place, sessions: n }),
    ),
  );

  // ---- engagement ----
  const visitorDurations = humanVisitorSessions.map(durationSec).filter((d) => d != null && d < 86400);
  const authDurations = authSessions.map(durationSec).filter((d) => d != null && d < 86400);
  const buckets = [
    [0, 10, "< 10s (bounce)"],
    [10, 30, "10–30s"],
    [30, 60, "30s–1m"],
    [60, 180, "1–3m"],
    [180, 600, "3–10m"],
    [600, 1800, "10–30m"],
    [1800, 3600, "30–60m"],
    [3600, 86400, "1h+"],
  ];
  table(
    "session_durations",
    "Session length distribution",
    [
      { key: "bucket", label: "Length" },
      { key: "visitor", label: "Visitor sessions", num: true },
      { key: "visitor_share", label: "Share" },
      { key: "auth", label: "Logged-in sessions", num: true },
    ],
    buckets.map(([lo, hi, label]) => {
      const v = visitorDurations.filter((d) => d >= lo && d < hi).length;
      return {
        bucket: label,
        visitor: v,
        visitor_share: pct(v, visitorDurations.length),
        auth: authDurations.filter((d) => d >= lo && d < hi).length,
      };
    }),
  );

  const hourCounts = new Map(tally(humanVisitorSessions, (s) => new Date(s.started_at).getUTCHours()));
  table(
    "hour_of_day",
    "Visitor sessions by hour (UTC)",
    [
      { key: "hour", label: "Hour (UTC)" },
      { key: "sessions", label: "Sessions", num: true },
    ],
    Array.from({ length: 24 }, (_, h) => ({ hour: `${String(h).padStart(2, "0")}:00`, sessions: hourCounts.get(h) || 0 })),
  );

  const dowNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dowCounts = new Map(tally(humanVisitorSessions, (s) => new Date(s.started_at).getUTCDay()));
  table(
    "day_of_week",
    "Visitor sessions by weekday (UTC)",
    [
      { key: "day", label: "Day" },
      { key: "sessions", label: "Sessions", num: true },
    ],
    dowNames.map((d, i) => ({ day: d, sessions: dowCounts.get(i) || 0 })),
  );

  const uaSessions = visitorSessions.map((s) => ({ ...parseUa(s.user_agent), s }));
  for (const [name, title, key] of [
    ["devices", "Devices", "device"],
    ["browsers", "Browsers", "browser"],
    ["operating_systems", "Operating systems", "os"],
  ]) {
    table(
      name,
      title,
      [
        { key: "value", label: title },
        { key: "sessions", label: "Sessions", num: true },
        { key: "share", label: "Share" },
      ],
      tally(uaSessions.filter((u) => !u.bot), (u) => u[key]).map(([value, n]) => ({
        value,
        sessions: n,
        share: pct(n, humanVisitorSessions.length),
      })),
    );
  }

  // ---- funnels ----
  const eventsBySession = new Map();
  for (const e of events) {
    if (!eventsBySession.has(e.session_id)) eventsBySession.set(e.session_id, []);
    eventsBySession.get(e.session_id).push(e);
  }
  const sessionHas = (s, pred) => (eventsBySession.get(s.session_id) || []).some(pred);

  const vTotal = humanVisitorSessions.length;
  const vEngaged = humanVisitorSessions.filter((s) =>
    sessionHas(s, (e) => ["page_click", "hero_cta_click", "content_view", "fork_click"].includes(e.type)),
  ).length;
  const vIntent = humanVisitorSessions.filter((s) =>
    sessionHas(s, (e) => e.type === "hero_cta_click" || e.type === "fork_click" || isHighIntentClick(e)),
  ).length;
  const vPricing = humanVisitorSessions.filter((s) =>
    sessionHas(s, (e) => e.type === "page_click" && /pricing|choose |stripe|checkout/i.test(`${evLabel(e)} ${meta(e).href || ""} ${meta(e).section || ""}`)),
  ).length;
  const vSignup = humanVisitorSessions.filter((s) =>
    sessionHas(s, (e) => e.type === "signup" || e.type === "identity_linked"),
  ).length;
  table(
    "visitor_funnel",
    "Visitor funnel (per session)",
    [
      { key: "step", label: "Step" },
      { key: "sessions", label: "Sessions", num: true },
      { key: "of_total", label: "% of sessions" },
      { key: "of_prev", label: "% of previous step" },
    ],
    [
      ["Landed", vTotal],
      ["Engaged (clicked / opened content)", vEngaged],
      ["High-intent action (CTA, fork, pricing/signup click)", vIntent],
      ["Clicked pricing / checkout", vPricing],
      ["Signed up / logged in", vSignup],
    ].map(([step, n], i, arr) => ({
      step,
      sessions: n,
      of_total: pct(n, vTotal),
      of_prev: i === 0 ? "—" : pct(n, arr[i - 1][1]),
    })),
  );

  const aTotal = authSessions.length;
  const aBrowsed = authSessions.filter((s) =>
    sessionHas(s, (e) => ["integration_select", "data_source_select"].includes(e.type)),
  ).length;
  const aQueried = authSessions.filter((s) => sessionHas(s, (e) => e.type === "query_submit")).length;
  const aSuccess = authSessions.filter((s) =>
    sessionHas(s, (e) => e.type === "query_submit" && meta(e).status === "success"),
  ).length;
  const aFailed = authSessions.filter((s) =>
    sessionHas(s, (e) => e.type === "query_error" || (e.type === "query_submit" && meta(e).status === "zero_rows")),
  ).length;
  table(
    "logged_in_funnel",
    "Logged-in funnel (per session)",
    [
      { key: "step", label: "Step" },
      { key: "sessions", label: "Sessions", num: true },
      { key: "of_total", label: "% of sessions" },
    ],
    [
      ["Logged-in session", aTotal],
      ["Browsed integrations / data sources", aBrowsed],
      ["Started a data pull", aQueried],
      ["Got rows back", aSuccess],
      ["Hit zero rows or an error", aFailed],
    ].map(([step, n]) => ({ step, sessions: n, of_total: pct(n, aTotal) })),
  );

  // ---- marketing interactions ----
  const clicks = events.filter((e) => e.type === "page_click");
  table(
    "top_clicks",
    "Most-clicked elements on marketing pages",
    [
      { key: "label", label: "Element" },
      { key: "page", label: "Page" },
      { key: "section", label: "Section" },
      { key: "clicks", label: "Clicks", num: true },
      { key: "sessions", label: "Sessions", num: true },
    ],
    (() => {
      const g = new Map();
      for (const e of clicks) {
        const k = `${evLabel(e).slice(0, 80)}\u0000${meta(e).pageName || e.path || ""}\u0000${meta(e).section || ""}`;
        const row = g.get(k) || { clicks: 0, sessions: new Set() };
        row.clicks += 1;
        row.sessions.add(e.session_id);
        g.set(k, row);
      }
      return [...g.entries()]
        .map(([k, v]) => {
          const [label, page, section] = k.split("\u0000");
          return { label: label || "(unlabeled)", page, section: section || "—", clicks: v.clicks, sessions: v.sessions.size };
        })
        .sort((a, b) => b.clicks - a.clicks);
    })(),
  );

  table(
    "hero_ctas",
    "Hero CTA clicks",
    [
      { key: "cta", label: "CTA" },
      { key: "page", label: "Page" },
      { key: "clicks", label: "Clicks", num: true },
    ],
    tally(
      events.filter((e) => e.type === "hero_cta_click"),
      (e) => `${meta(e).buttonText || meta(e).eventLabel || e.label || "?"}\u0000${meta(e).pagePath || meta(e).page || e.path || ""}`,
    ).map(([k, n]) => {
      const [cta, page] = k.split("\u0000");
      return { cta, page, clicks: n };
    }),
  );

  table(
    "page_views",
    "Marketing page views",
    [
      { key: "page", label: "Page" },
      { key: "views", label: "Views", num: true },
    ],
    tally(events.filter((e) => e.type === "page_view"), (e) => meta(e).pageName || e.path || "?").map(([page, n]) => ({
      page,
      views: n,
    })),
  );

  const leaves = events.filter((e) => e.type === "content_leave" && Number(meta(e).durationSeconds) > 0);
  table(
    "content_reads",
    "Guides / charts / dashboards opened",
    [
      { key: "name", label: "Content" },
      { key: "type", label: "Type" },
      { key: "opens", label: "Opens", num: true },
      { key: "median_read", label: "Median time on page" },
    ],
    tally(events.filter((e) => e.type === "content_view"), (e) => `${meta(e).name || e.path || "?"}\u0000${meta(e).contentType || ""}`).map(
      ([k, n]) => {
        const [name, type] = k.split("\u0000");
        const durs = leaves.filter((e) => (meta(e).name || e.path) === name).map((e) => Number(meta(e).durationSeconds));
        return { name, type: type || "—", opens: n, median_read: fmtDuration(median(durs)) };
      },
    ),
  );

  // ---- product usage ----
  const pullsStarted = pullAttempts;
  const pullsDone = events.filter((e) => e.type === "query_submit" && ["success", "zero_rows"].includes(meta(e).status));
  const pullErrors = events.filter((e) => e.type === "query_error");
  const integrationOf = (e) => meta(e).integration || meta(e).integrationId || "unknown";
  const endpointOf = (e) => meta(e).sampleLabel || meta(e).endpoint || meta(e).table || meta(e).sampleId || "—";

  table(
    "data_pulls",
    "Data pulls by integration / endpoint",
    [
      { key: "integration", label: "Integration" },
      { key: "endpoint", label: "Endpoint / table" },
      { key: "started", label: "Attempts", num: true },
      { key: "raw", label: "Raw start events", num: true },
      { key: "success", label: "Rows returned", num: true },
      { key: "zero_rows", label: "Zero rows", num: true },
      { key: "errors", label: "Errors", num: true },
      { key: "median_rows", label: "Median rows", num: true },
      { key: "median_secs", label: "Median time" },
    ],
    (() => {
      const g = new Map();
      const key = (e) => `${integrationOf(e)}\u0000${endpointOf(e)}`;
      const get = (k) => {
        if (!g.has(k)) g.set(k, { started: 0, raw: 0, success: 0, zero_rows: 0, errors: 0, rows: [], secs: [] });
        return g.get(k);
      };
      for (const e of rawPullStarts) {
        const r = get(key(e));
        r.raw += 1;
        if (attemptIds.has(e)) r.started += 1;
      }
      for (const e of pullsDone) {
        const r = get(key(e));
        if (meta(e).status === "zero_rows") r.zero_rows += 1;
        else {
          r.success += 1;
          if (meta(e).rowCount != null) r.rows.push(Number(meta(e).rowCount));
        }
        if (meta(e).elapsedMs != null) r.secs.push(Number(meta(e).elapsedMs) / 1000);
      }
      for (const e of pullErrors) get(key(e)).errors += 1;
      return [...g.entries()]
        .map(([k, v]) => {
          const [integration, endpoint] = k.split("\u0000");
          return {
            integration,
            endpoint,
            started: v.started,
            raw: v.raw,
            success: v.success,
            zero_rows: v.zero_rows,
            errors: v.errors,
            median_rows: median(v.rows),
            median_secs: fmtDuration(median(v.secs)),
          };
        })
        .sort((a, b) => b.started + b.success - (a.started + a.success));
    })(),
  );

  table(
    "pull_loops",
    "Runaway pull loops (sessions with 50+ raw start events)",
    [
      { key: "user", label: "User" },
      { key: "day", label: "Day" },
      { key: "integration", label: "Integration / endpoint" },
      { key: "raw", label: "Raw start events", num: true },
      { key: "attempts", label: "Attempts", num: true },
      { key: "ok", label: "Rows returned", num: true },
      { key: "span", label: "Burst length" },
    ],
    [...startsPerSession.entries()]
      .filter(([, n]) => n >= 50)
      .map(([sid, n]) => {
        const starts = rawPullStarts.filter((e) => e.session_id === sid);
        const s = sessionById.get(sid);
        const first = new Date(starts[0].ts);
        const last = new Date(starts[starts.length - 1].ts);
        return {
          user: meta(starts[0]).email || s?.email || "(anonymous)",
          day: ymd(first),
          integration: [...new Set(starts.map((e) => `${meta(e).integration}/${meta(e).endpoint || meta(e).table || "?"}`))].join(", "),
          raw: n,
          attempts: starts.filter((e) => attemptIds.has(e)).length,
          ok: (eventsBySession.get(sid) || []).filter((e) => e.type === "query_submit" && meta(e).status === "success").length,
          span: fmtDuration((last - first) / 1000),
        };
      })
      .sort((a, b) => b.raw - a.raw),
  );

  table(
    "pull_surfaces",
    "Where pulls were run from",
    [
      { key: "surface", label: "Surface" },
      { key: "pulls", label: "Pulls started", num: true },
    ],
    tally(pullsStarted, (e) => meta(e).querySurfaceLabel || (meta(e).isDemo ? "Homepage demo" : "Not recorded (before Jul 2026)")).map(
      ([surface, n]) => ({ surface, pulls: n }),
    ),
  );

  table(
    "integrations_opened",
    "Integrations opened",
    [
      { key: "integration", label: "Integration" },
      { key: "opens", label: "Opens", num: true },
    ],
    tally(
      events.filter((e) => e.type === "integration_select"),
      (e) => meta(e).integrationName || meta(e).integrationId || e.label || "?",
    ).map(([integration, n]) => ({ integration, opens: n })),
  );

  table(
    "workspace_dwell",
    "Time spent per workspace (logged-in)",
    [
      { key: "workspace", label: "Workspace" },
      { key: "visits", label: "Visits", num: true },
      { key: "total", label: "Total time" },
      { key: "median", label: "Median visit" },
    ],
    (() => {
      const g = new Map();
      for (const e of events.filter((x) => x.type === "workspace_dwell")) {
        const k = meta(e).workspace || meta(e).integrationId || "?";
        const arr = g.get(k) || [];
        arr.push(Number(meta(e).durationSeconds) || 0);
        g.set(k, arr);
      }
      return [...g.entries()]
        .map(([workspace, arr]) => ({
          workspace,
          visits: arr.length,
          total: fmtDuration(arr.reduce((a, b) => a + b, 0)),
          total_sec: arr.reduce((a, b) => a + b, 0),
          median: fmtDuration(median(arr)),
        }))
        .sort((a, b) => b.total_sec - a.total_sec);
    })(),
  );

  table(
    "fork_clicks",
    "“Run for yourself” (fork) clicks",
    [
      { key: "name", label: "Chart / dashboard" },
      { key: "owner", label: "Owner" },
      { key: "clicks", label: "Clicks", num: true },
    ],
    tally(
      events.filter((e) => e.type === "fork_click"),
      (e) => `${meta(e).displayName || meta(e).chartSlug || meta(e).dashboardSlug || "?"}\u0000${meta(e).ownerHandle || ""}`,
    ).map(([k, n]) => {
      const [name, owner] = k.split("\u0000");
      return { name, owner: owner ? `@${owner}` : "—", clicks: n };
    }),
  );

  // ---- errors ----
  table(
    "pull_errors",
    "Data pull errors",
    [
      { key: "message", label: "Error" },
      { key: "integration", label: "Integration" },
      { key: "count", label: "Count", num: true },
    ],
    tally(pullErrors, (e) => `${String(meta(e).message || e.label || "?").slice(0, 140)}\u0000${integrationOf(e)}`).map(([k, n]) => {
      const [message, integration] = k.split("\u0000");
      return { message, integration, count: n };
    }),
  );

  table(
    "client_errors",
    "Client-side errors (logged-in)",
    [
      { key: "message", label: "Error" },
      { key: "source", label: "Source" },
      { key: "count", label: "Count", num: true },
    ],
    tally(
      events.filter((e) => e.type === "error"),
      (e) => `${String(meta(e).message || e.label || "?").slice(0, 140)}\u0000${String(meta(e).source || "").slice(0, 80)}`,
    ).map(([k, n]) => {
      const [message, source] = k.split("\u0000");
      return { message, source: source || "—", count: n };
    }),
  );

  // ---- top logged-in users ----
  const byUser = new Map();
  for (const s of authSessions) {
    const k = s.email || s.user_id;
    if (!k) continue;
    const u = byUser.get(k) || { sessions: 0, secs: 0, pulls: 0, ok: 0, zero: 0, errs: 0, first: s.started_at, last: s.started_at, countries: new Set() };
    u.sessions += 1;
    u.secs += Math.min(durationSec(s) || 0, 86400);
    if (s.started_at < u.first) u.first = s.started_at;
    if (s.started_at > u.last) u.last = s.started_at;
    if (s.country) u.countries.add(s.country);
    for (const e of eventsBySession.get(s.session_id) || []) {
      if (e.type === "query_submit" && meta(e).status === "started") {
        u.rawStarts = (u.rawStarts || 0) + 1;
        if (attemptIds.has(e)) u.pulls += 1;
      }
      if (e.type === "query_submit" && meta(e).status === "success") u.ok += 1;
      if (e.type === "query_submit" && meta(e).status === "zero_rows") u.zero += 1;
      if (e.type === "query_error") u.errs += 1;
    }
    byUser.set(k, u);
  }
  const userTier = new Map(users.map((u) => [String(u.email || "").toLowerCase(), u]));
  table(
    "top_users",
    "Most active logged-in users",
    [
      { key: "user", label: "User" },
      { key: "plan", label: "Plan" },
      { key: "sessions", label: "Sessions", num: true },
      { key: "time", label: "Time in app" },
      { key: "pulls", label: "Pull attempts", num: true },
      { key: "raw", label: "Raw start events", num: true },
      { key: "ok", label: "Rows returned", num: true },
      { key: "zero", label: "Zero rows", num: true },
      { key: "errs", label: "Errors", num: true },
      { key: "first", label: "First seen" },
      { key: "last", label: "Last seen" },
      { key: "countries", label: "Countries" },
    ],
    [...byUser.entries()]
      .map(([user, u]) => {
        const rec = userTier.get(String(user).toLowerCase());
        const plan = rec
          ? rec.lifetimeMember
            ? "lifetime"
            : rec.subscriptionTier
              ? `${rec.subscriptionTier}${rec.billingCycle ? ` ${rec.billingCycle}` : ""} (${rec.subscriptionStatus || "?"})`
              : "free"
          : "—";
        return {
          user,
          plan,
          sessions: u.sessions,
          time: fmtDuration(u.secs),
          pulls: u.pulls,
          raw: u.rawStarts || 0,
          ok: u.ok,
          zero: u.zero,
          errs: u.errs,
          first: ymd(u.first),
          last: ymd(u.last),
          countries: [...u.countries].map(countryLabel).join(", ") || "—",
          _score: u.pulls * 3 + u.sessions,
        };
      })
      .sort((a, b) => b._score - a._score),
  );

  // ---- subscriptions snapshot ----
  const activePaid = users.filter(
    (u) => u.lifetimeMember || ["active", "trialing"].includes(String(u.subscriptionStatus || "").toLowerCase()),
  );
  table(
    "paid_snapshot",
    "Current paid accounts (snapshot)",
    [
      { key: "plan", label: "Plan" },
      { key: "accounts", label: "Accounts", num: true },
    ],
    tally(activePaid, (u) =>
      u.lifetimeMember ? "lifetime" : `${u.subscriptionTier || "?"} ${u.billingCycle || ""}`.trim(),
    ).map(([plan, n]) => ({ plan, accounts: n })),
  );

  table(
    "telegram_counters",
    "Telegram alert counters (all-time + monthly keys)",
    [
      { key: "key", label: "Counter" },
      { key: "count", label: "Count", num: true },
      { key: "last", label: "Last event" },
    ],
    counters
      .map((c) => ({ key: c.event_key, count: c.count, last: c.last_event_at ? new Date(c.last_event_at).toISOString().replace("T", " ").slice(0, 16) : "—" }))
      .sort((a, b) => a.key.localeCompare(b.key)),
  );

  // ---- insights ----
  const lastFull = monthly.length >= 2 ? monthly[monthly.length - 2] : null;
  const prevFull = monthly.length >= 3 ? monthly[monthly.length - 3] : null;
  const current = monthly[monthly.length - 1];
  const growth = (a, b) => (b ? `${a >= b ? "+" : ""}${(((a - b) / b) * 100).toFixed(0)}%` : "n/a");
  const topRef = TABLES.referrers.rows.find((r) => !r.source.startsWith("("));
  const topEntry = TABLES.entry_pages.rows[0];
  const topCountry = TABLES.countries.rows[0];
  const zeroRate = pct(
    pullsDone.filter((e) => meta(e).status === "zero_rows").length,
    pullsDone.length,
  );
  const errRate = pct(pullErrors.length, pullsStarted.length);
  const bounce = pct(visitorDurations.filter((d) => d < 10).length, visitorDurations.length);
  const mobileShare = pct(
    uaSessions.filter((u) => !u.bot && u.device === "Mobile").length,
    uaSessions.filter((u) => !u.bot && !u.device.startsWith("Unknown")).length,
  );
  const topClick = TABLES.top_clicks.rows[0];
  const topPull = TABLES.data_pulls.rows[0];

  const insights = [
    `${fmtN(vTotal)} human visitor sessions from ~${fmtN(new Set(humanVisitorSessions.map(visitorKey)).size)} unique visitors, plus ${fmtN(aTotal)} logged-in sessions across ${fmtN(byUser.size)} users.`,
    lastFull && prevFull
      ? `Visitor sessions in ${lastFull.month}: ${fmtN(lastFull.visitor_sessions)} (${growth(lastFull.visitor_sessions, prevFull.visitor_sessions)} vs ${prevFull.month}). ${current.month} so far: ${fmtN(current.visitor_sessions)}.`
      : null,
    `Visitor funnel: ${pct(vEngaged, vTotal)} engage, ${pct(vIntent, vTotal)} take a high-intent action, ${pct(vPricing, vTotal)} click pricing/checkout, ${pct(vSignup, vTotal)} sign up or log in.`,
    `Median visitor session: ${fmtDuration(median(visitorDurations))}; ${bounce} leave within 10 seconds. Median logged-in session: ${fmtDuration(median(authDurations))}.`,
    topRef ? `Top external referrer: ${topRef.source} (${topRef.share} of sessions). Top landing page: ${topEntry?.path} (${topEntry?.share}).` : null,
    topCountry ? `Top country (where geo is captured): ${topCountry.country} (${topCountry.share}). Mobile share: ${mobileShare}.` : null,
    topClick ? `Most-clicked marketing element: “${topClick.label}” on ${topClick.page} (${fmtN(topClick.clicks)} clicks).` : null,
    `Data pulls: ${fmtN(pullsStarted.length)} attempts, ${fmtN(pullsDone.length)} completed (${pct(pullsDone.length, pullsStarted.length)}); ${zeroRate} of completed pulls returned zero rows; errors equal ${errRate} of attempts.${topPull ? ` Most-attempted endpoint: ${topPull.integration} / ${topPull.endpoint}.` : ""}`,
    TABLES.pull_loops.rows.length
      ? `⚠️ Bug: ${fmtN(TABLES.pull_loops.rows.length)} sessions hit a runaway pull loop (${fmtN(TABLES.pull_loops.rows.reduce((a, r) => a + r.raw, 0))} raw "pull started" events, mostly Kalshi Live, firing every few milliseconds and almost never returning rows). Each one also sent a Telegram alert. These users likely saw a pull that never finished — see “Runaway pull loops”.`
      : null,
    `${fmtN(activePaid.length)} accounts currently have paid access; ${fmtN(users.filter((u) => u.subscribedAt && u.subscribedAt >= RANGE_FROM).length)} subscribed during this window.`,
    botSessionIds.size ? `${fmtN(botSessionIds.size)} bot/crawler sessions were excluded from visitor stats.` : null,
  ].filter(Boolean);

  // ---- write output ----
  const stamp = ymd(NOW);
  const OUT_ROOT = path.join(process.cwd(), "exports");
  const dirName = `behavior-report_${stamp}`;
  const OUT_DIR = path.join(OUT_ROOT, dirName);
  const CSV_DIR = path.join(OUT_DIR, "csv");
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(CSV_DIR, { recursive: true });

  for (const [name, t] of Object.entries(TABLES)) {
    const lines = [t.columns.map((c) => csvCell(c.label)).join(",")];
    for (const r of t.rows) lines.push(t.columns.map((c) => csvCell(r[c.key])).join(","));
    fs.writeFileSync(path.join(CSV_DIR, `${name}.csv`), lines.join("\n"), "utf8");
  }

  const kpis = [
    ["Visitor sessions", fmtN(vTotal)],
    ["Unique visitors", fmtN(new Set(humanVisitorSessions.map(visitorKey)).size)],
    ["Logged-in sessions", fmtN(aTotal)],
    ["Active logged-in users", fmtN(byUser.size)],
    ["New accounts", fmtN(users.filter((u) => userCreatedAt(u) >= RANGE_FROM).length)],
    ["Paid accounts now", fmtN(activePaid.length)],
    ["Data pull attempts", fmtN(pullsStarted.length)],
    ["Zero-row rate", zeroRate],
  ];

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Lychee user behavior report ${stamp}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
:root{--bg:#f8fafc;--card:#fff;--text:#0f172a;--muted:#64748b;--border:#e2e8f0;--accent:#2563eb;--bar:#bfdbfe}
*{box-sizing:border-box}body{margin:0;font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:var(--bg);color:var(--text)}
header{background:#0f172a;color:#fff;padding:28px 40px}header h1{margin:0 0 4px;font-size:24px}header p{margin:0;color:#cbd5e1}
main{max-width:1280px;margin:0 auto;padding:24px 40px 60px}
h2{margin:36px 0 12px;font-size:19px;border-bottom:2px solid var(--border);padding-bottom:6px}
h3{margin:0 0 10px;font-size:15px}
.card{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:16px 18px;margin-bottom:16px;overflow-x:auto}
.grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(460px,1fr));gap:16px}.grid2 .card{margin-bottom:0}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin-bottom:16px}
.kpi{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:14px 16px}.kpi b{display:block;font-size:24px}.kpi span{color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.04em}
table{width:100%;border-collapse:collapse;font-size:13px}th,td{padding:6px 8px;border-bottom:1px solid var(--border);text-align:left;vertical-align:top}
th{background:#f1f5f9;font-weight:600;white-space:nowrap}td.num,th.num{text-align:right;white-space:nowrap}
tr:nth-child(even) td{background:#fbfdff}
.barcell{position:relative;min-width:120px}.barcell .bar{position:absolute;right:0;top:4px;bottom:4px;background:var(--bar);border-radius:3px;z-index:0}.barcell b{position:relative;z-index:1;font-weight:600}
ul.insights li{margin-bottom:6px}.muted{color:var(--muted)}.small{font-size:12px}
.chart{width:100%;height:auto}.chart .grid{stroke:#e2e8f0}.chart .axis{fill:#64748b;font-size:11px}
.legend{display:inline-flex;align-items:center;margin-right:16px;font-size:12px;color:var(--muted)}.legend i{width:12px;height:3px;margin-right:6px;display:inline-block}
code{background:#f1f5f9;padding:1px 5px;border-radius:4px;font-size:12px}
</style></head><body>
<header><h1>Lychee — user behavior report</h1>
<p>${escHtml(ymd(RANGE_FROM))} → ${escHtml(ymd(RANGE_TO))} (UTC) · source: ${escHtml(mongoDatabaseTarget())} journey logs behind the Telegram alerts · generated ${escHtml(NOW.toISOString().replace("T", " ").slice(0, 16))} UTC</p></header>
<main>
<div class="kpis">${kpis.map(([l, v]) => `<div class="kpi"><span>${escHtml(l)}</span><b>${escHtml(v)}</b></div>`).join("")}</div>
<div class="card"><h3>Key takeaways</h3><ul class="insights">${insights.map((i) => `<li>${escHtml(i)}</li>`).join("")}</ul></div>

<h2>Trends</h2>
${lineChart(days, [
  { label: "Visitor sessions", color: "#2563eb", values: dailyVisitor },
  { label: "Logged-in sessions", color: "#16a34a", values: dailyAuth },
  { label: "Pull attempts", color: "#f59e0b", values: dailyPulls },
])}
${renderTable(TABLES.monthly_summary, { limit: 0 })}

<h2>Acquisition</h2>
<div class="grid2">
${renderTable(TABLES.referrers, { barKey: "sessions", limit: 15 })}
${renderTable(TABLES.entry_pages, { barKey: "sessions", limit: 15 })}
${renderTable(TABLES.countries, { barKey: "sessions", limit: 15, note: "Geo is only captured for sessions after early July 2026." })}
${renderTable(TABLES.cities, { barKey: "sessions", limit: 15 })}
</div>
${TABLES.utm_campaigns.rows.length ? renderTable(TABLES.utm_campaigns, { barKey: "sessions", limit: 20 }) : ""}

<h2>Engagement</h2>
<div class="grid2">
${renderTable(TABLES.session_durations, { barKey: "visitor", limit: 0 })}
${renderTable(TABLES.day_of_week, { barKey: "sessions", limit: 0 })}
${renderTable(TABLES.hour_of_day, { barKey: "sessions", limit: 0 })}
<div>
${renderTable(TABLES.devices, { barKey: "sessions", limit: 0 })}
${renderTable(TABLES.browsers, { barKey: "sessions", limit: 0 })}
${renderTable(TABLES.operating_systems, { barKey: "sessions", limit: 0 })}
</div>
</div>

<h2>Funnels</h2>
<div class="grid2">
${renderTable(TABLES.visitor_funnel, { barKey: "sessions", limit: 0 })}
${renderTable(TABLES.logged_in_funnel, { barKey: "sessions", limit: 0 })}
</div>

<h2>Marketing page behavior</h2>
${renderTable(TABLES.top_clicks, { barKey: "clicks", limit: 30 })}
<div class="grid2">
${renderTable(TABLES.hero_ctas, { barKey: "clicks", limit: 15 })}
${renderTable(TABLES.page_views, { barKey: "views", limit: 15 })}
</div>
${renderTable(TABLES.content_reads, { barKey: "opens", limit: 20 })}

<h2>Product usage (logged-in + demo)</h2>
${renderTable(TABLES.data_pulls, { barKey: "started", limit: 25, note: "Attempts collapse repeated identical starts in the same session less than 10s apart; raw start events are shown for comparison." })}
${renderTable(TABLES.pull_loops, { barKey: "raw", limit: 30, note: "Sessions where the client fired “pull started” over and over (a client bug). Each raw start also produced a Telegram alert." })}
<div class="grid2">
${renderTable(TABLES.pull_surfaces, { barKey: "pulls", limit: 0 })}
${renderTable(TABLES.integrations_opened, { barKey: "opens", limit: 15 })}
${renderTable(TABLES.workspace_dwell, { limit: 15 })}
${renderTable(TABLES.fork_clicks, { barKey: "clicks", limit: 15 })}
</div>

<h2>Errors</h2>
<div class="grid2">
${renderTable(TABLES.pull_errors, { barKey: "count", limit: 15 })}
${renderTable(TABLES.client_errors, { barKey: "count", limit: 15 })}
</div>

<h2>Users &amp; revenue</h2>
${renderTable(TABLES.top_users, { limit: 40 })}
<div class="grid2">
${renderTable(TABLES.paid_snapshot, { barKey: "accounts", limit: 0 })}
${renderTable(TABLES.telegram_counters, { limit: 60 })}
</div>

<h2>Notes on the data</h2>
<div class="card small">
<ul>
<li>Built from <code>VisitorSession</code>, <code>VisitorEvent</code>, <code>Users</code> and <code>TelegramEventCounter</code> — the same records that generate the Telegram alerts. Telegram message text itself is not stored.</li>
<li>Visitor stats exclude ${fmtN(botSessionIds.size)} sessions whose user agent looks like a bot/crawler. Visitor sessions are per browser tab; one person can create several.</li>
<li>“Unique visitors” uses the persistent browser id when available, otherwise IP + user agent, otherwise the session itself — so early months overstate unique visitors.</li>
<li>IP / country / device data and “where the pull was run from” only exist for sessions after the July 2026 tracking update.</li>
<li>Landing-page data before July 2026 defaulted to <code>/</code>, so the homepage share of entries is overstated for May–June.</li>
<li>Session length is start → end beacon; tabs left open in the background inflate long sessions. Durations over 24h are excluded.</li>
<li>Immediate-only Telegram alerts (some hero CTA / page-view pings) are counted in the Telegram counters table even if the journey batch never reached Mongo.</li>
<li>Every table is also in <code>csv/</code> for spreadsheet analysis.</li>
</ul>
</div>
</main></body></html>`;

  const htmlPath = path.join(OUT_DIR, "report.html");
  fs.writeFileSync(htmlPath, html, "utf8");

  const zipPath = path.join(OUT_ROOT, `${dirName}.zip`);
  fs.rmSync(zipPath, { force: true });
  try {
    execFileSync("zip", ["-rq", zipPath, dirName], { cwd: OUT_ROOT });
  } catch (err) {
    console.warn("zip failed:", err?.message || err);
  }

  console.log("\nKey takeaways:");
  for (const i of insights) console.log(`  - ${i}`);
  console.log(`\nReport: ${htmlPath}`);
  console.log(`CSVs:   ${CSV_DIR} (${Object.keys(TABLES).length} files)`);
  console.log(`Zip:    ${zipPath}`);
}

main().catch(async (err) => {
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
