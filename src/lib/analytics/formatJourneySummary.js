import { escapeHtml, ordinal } from "@/lib/telegram/format";

/** @param {number} ms */
export function formatDuration(ms) {
  const totalSec = Math.max(1, Math.round(ms / 1000));
  if (totalSec < 60) return `${totalSec}s`;
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min < 60) return sec ? `${min}m ${sec}s` : `${min}m`;
  const hr = Math.floor(min / 60);
  const remMin = min % 60;
  return remMin ? `${hr}h ${remMin}m` : `${hr}h`;
}

/**
 * @param {{ type: string; path?: string; label?: string; meta?: Record<string, unknown> }} event
 * @param {number} index
 */
export function formatJourneyStep(event, index) {
  const meta = event.meta && typeof event.meta === "object" ? event.meta : {};
  const path = event.path || meta.path || "";

  switch (event.type) {
    case "page_view":
      return `${index}. Landed on ${meta.pageName || path || "page"}`;
    case "page_click":
      return `${index}. Clicked "${meta.label || event.label || "element"}"${
        meta.section ? ` (${meta.section})` : ""
      }`;
    case "content_view":
      return `${index}. Opened ${meta.contentType || "content"}: ${meta.name || path}`;
    case "content_leave":
      return `${index}. Left ${meta.contentType || "content"}: ${meta.name || path}${
        meta.durationSeconds ? ` (${meta.durationSeconds}s)` : ""
      }`;
    case "fork_click":
      return `${index}. Clicked Run for yourself on ${meta.displayName || meta.kind || "chart"}`;
    case "hero_cta_click":
      return `${index}. Hero CTA "${meta.buttonText || event.label || "button"}" → ${
        meta.destination || meta.href || ""
      } (${meta.eventLabel || "unlabeled"})`;
    case "signup":
      return `${index}. Signed up (${meta.method || "unknown"}) — ${meta.email || "email unknown"}`;
    case "identity_linked":
      return `${index}. Identified as ${meta.email || meta.userId || "user"}`;
    case "integration_select":
      return `${index}. Opened integration: ${meta.integrationName || meta.integrationId || event.label || "unknown"}`;
    case "data_source_select":
      return `${index}. Selected data source: ${meta.label || meta.sampleId || event.label || "unknown"}${
        meta.integration ? ` (${meta.integration})` : ""
      }`;
    case "query_submit":
      if (meta.status === "zero_rows") {
        return `${index}. Query returned 0 rows on ${meta.table || meta.integration || "table"}${
          meta.mode ? ` (${meta.mode})` : ""
        }`;
      }
      return `${index}. Ran query on ${meta.table || "table"}${meta.mode ? ` (${meta.mode})` : ""}${
        meta.rowCount != null ? ` → ${meta.rowCount} rows` : ""
      }`;
    case "query_error":
      return `${index}. Query failed: ${meta.message || event.label || "unknown error"}`;
    case "workspace_dwell":
      return `${index}. Spent ${meta.durationSeconds || "?"}s in ${meta.workspace || meta.integrationId || "workspace"}`;
    case "error":
      return `${index}. Error: ${meta.message || event.label || "unknown"}${
        meta.source ? ` (${meta.source})` : ""
      }`;
    default:
      return `${index}. ${event.type}${path ? ` (${path})` : ""}`;
  }
}

/**
 * @param {Array<{ type: string; meta?: Record<string, unknown> }>} events
 */
export function inferSessionOutcome(events) {
  const types = events.map((e) => e.type);
  if (types.includes("signup")) return "Signed up";
  if (types.includes("hero_cta_click")) return "Clicked hero CTA";
  if (types.includes("fork_click")) return "Clicked Run for yourself";
  if (types.includes("content_view")) return "Browsed content";
  if (types.includes("page_click")) return "Explored marketing pages";
  return "Left without converting";
}

/**
 * @param {Array<{ type: string; meta?: Record<string, unknown> }>} events
 */
export function inferAuthSessionOutcome(events) {
  const types = events.map((e) => e.type);
  if (types.includes("query_error") || types.includes("error")) return "Hit an error";
  const zeroRowQuery = events.some(
    (e) => e.type === "query_submit" && e.meta?.status === "zero_rows",
  );
  if (zeroRowQuery) return "Query returned zero rows";
  if (types.includes("query_submit")) return "Ran data queries";
  if (types.includes("data_source_select")) return "Explored data sources";
  if (types.includes("integration_select")) return "Browsed integrations";
  return "Active session";
}

/**
 * @param {{
 *   session: { session_id: string; started_at: Date; ended_at?: Date; entry_path?: string; email?: string; is_logged_in?: boolean };
 *   events: Array<{ type: string; path?: string; label?: string; meta?: Record<string, unknown>; ts?: Date }>;
 *   sessionCount?: number;
 * }} opts
 */
export function buildSessionEndTelegramMessage({ session, events, sessionCount }) {
  const startedAt = session.started_at ? new Date(session.started_at).getTime() : Date.now();
  const endedAt = session.ended_at ? new Date(session.ended_at).getTime() : Date.now();
  const duration = formatDuration(Math.max(0, endedAt - startedAt));
  const shortId = String(session.session_id || "").slice(0, 8);
  const rank = sessionCount ? ordinal(sessionCount) : null;

  const steps = events.slice(0, 25).map((event, i) => formatJourneyStep(event, i + 1));
  const more = events.length > 25 ? `\n… and ${events.length - 25} more steps` : "";

  const lines = [
    rank ? `<b>📋 ${rank} session summary</b>` : "<b>📋 Session summary</b>",
    "",
    `<b>Session:</b> ${escapeHtml(shortId)}`,
    `<b>Duration:</b> ${escapeHtml(duration)}`,
    `<b>Entry:</b> ${escapeHtml(session.entry_path || "/")}`,
    `<b>Logged in:</b> ${session.is_logged_in || session.email ? "yes" : "no"}`,
  ];

  if (session.email) {
    lines.push(`<b>Email:</b> ${escapeHtml(session.email)}`);
  }

  lines.push("", "<b>Journey:</b>");
  if (steps.length) {
    lines.push(...steps.map((s) => escapeHtml(s)));
    if (more) lines.push(escapeHtml(more.trim()));
  } else {
    lines.push("No tracked steps recorded.");
  }

  lines.push("", `<b>Outcome:</b> ${escapeHtml(inferSessionOutcome(events))}`);

  return lines.join("\n");
}

/**
 * @param {{
 *   session: { session_id: string; entry_path?: string; referrer?: string; is_logged_in?: boolean; email?: string };
 *   sessionCount?: number;
 * }} opts
 */
export function buildSessionStartTelegramMessage({ session, sessionCount }) {
  const shortId = String(session.session_id || "").slice(0, 8);
  const rank = sessionCount ? ordinal(sessionCount) : null;

  const lines = [
    rank ? `<b>🟢 ${rank} new visitor session</b>` : "<b>🟢 New visitor session</b>",
    "",
    `<b>Session:</b> ${escapeHtml(shortId)}`,
    `<b>Entry:</b> ${escapeHtml(session.entry_path || "/")}`,
    `<b>Logged in:</b> ${session.is_logged_in || session.email ? "yes" : "no"}`,
  ];

  if (session.referrer) {
    lines.push(`<b>Referrer:</b> ${escapeHtml(session.referrer.slice(0, 120))}`);
  }
  if (session.email) {
    lines.push(`<b>Email:</b> ${escapeHtml(session.email)}`);
  }

  return lines.join("\n");
}

/**
 * @param {{
 *   session: { session_id: string; entry_path?: string; email?: string };
 *   sessionCount?: number;
 * }} opts
 */
export function buildAuthSessionStartTelegramMessage({ session, sessionCount }) {
  const shortId = String(session.session_id || "").slice(0, 8);
  const rank = sessionCount ? ordinal(sessionCount) : null;

  const lines = [
    rank ? `<b>🔐 ${rank} authenticated session</b>` : "<b>🔐 Authenticated session started</b>",
    "",
    `<b>Session:</b> ${escapeHtml(shortId)}`,
    `<b>Entry:</b> ${escapeHtml(session.entry_path || "/dashboard")}`,
  ];

  if (session.email) {
    lines.push(`<b>Email:</b> ${escapeHtml(session.email)}`);
  }

  return lines.join("\n");
}

/**
 * @param {{
 *   session: { session_id: string; started_at: Date; ended_at?: Date; entry_path?: string; email?: string; chain_count?: number };
 *   events: Array<{ type: string; path?: string; label?: string; meta?: Record<string, unknown>; ts?: Date }>;
 *   sessionCount?: number;
 * }} opts
 */
export function buildAuthSessionEndTelegramMessage({ session, events, sessionCount }) {
  const startedAt = session.started_at ? new Date(session.started_at).getTime() : Date.now();
  const endedAt = session.ended_at ? new Date(session.ended_at).getTime() : Date.now();
  const duration = formatDuration(Math.max(0, endedAt - startedAt));
  const shortId = String(session.session_id || "").slice(0, 8);
  const rank = sessionCount ? ordinal(sessionCount) : null;

  const steps = events.slice(0, 30).map((event, i) => formatJourneyStep(event, i + 1));
  const more = events.length > 30 ? `\n… and ${events.length - 30} more steps` : "";

  const lines = [
    rank ? `<b>📋 ${rank} auth session summary</b>` : "<b>📋 Auth session summary</b>",
    "",
    `<b>Session:</b> ${escapeHtml(shortId)}`,
    `<b>Duration:</b> ${escapeHtml(duration)}`,
    `<b>Entry:</b> ${escapeHtml(session.entry_path || "/dashboard")}`,
  ];

  if (session.email) {
    lines.push(`<b>Email:</b> ${escapeHtml(session.email)}`);
  }

  if (session.chain_count) {
    lines.push(`<b>Chain updates:</b> ${session.chain_count}`);
  }

  lines.push("", "<b>Activity:</b>");
  if (steps.length) {
    lines.push(...steps.map((s) => escapeHtml(s)));
    if (more) lines.push(escapeHtml(more.trim()));
  } else {
    lines.push("No tracked activity recorded.");
  }

  lines.push("", `<b>Outcome:</b> ${escapeHtml(inferAuthSessionOutcome(events))}`);

  return lines.join("\n");
}

/**
 * @param {{
 *   session: { session_id: string; started_at: Date; email?: string; chain_count?: number };
 *   events: Array<{ type: string; meta?: Record<string, unknown>; ts?: Date }>;
 *   chainIndex: number;
 * }} opts
 */
export function buildAuthSessionChainTelegramMessage({ session, events, chainIndex }) {
  const startedAt = session.started_at ? new Date(session.started_at).getTime() : Date.now();
  const elapsed = formatDuration(Math.max(0, Date.now() - startedAt));
  const shortId = String(session.session_id || "").slice(0, 8);

  const recent = events.slice(-15);
  const steps = recent.map((event, i) => formatJourneyStep(event, i + 1));

  const lines = [
    `<b>⏱ Auth session update #${chainIndex}</b>`,
    "",
    `<b>Session:</b> ${escapeHtml(shortId)}`,
    `<b>Elapsed:</b> ${escapeHtml(elapsed)}`,
  ];

  if (session.email) {
    lines.push(`<b>Email:</b> ${escapeHtml(session.email)}`);
  }

  lines.push("", "<b>Recent activity:</b>");
  if (steps.length) {
    lines.push(...steps.map((s) => escapeHtml(s)));
  } else {
    lines.push("No new activity since last update.");
  }

  return lines.join("\n");
}

/**
 * @param {{
 *   session: { session_id: string; email?: string };
 *   meta: { message?: string; source?: string; integration?: string; stack?: string; path?: string };
 * }} opts
 */
export function buildAuthSessionErrorTelegramMessage({ session, meta = {} }) {
  const shortId = String(session.session_id || "").slice(0, 8);

  const lines = [
    "<b>🚨 Auth session error</b>",
    "",
    `<b>Session:</b> ${escapeHtml(shortId)}`,
  ];

  if (session.email) {
    lines.push(`<b>Email:</b> ${escapeHtml(session.email)}`);
  }

  if (meta.path) {
    lines.push(`<b>Path:</b> ${escapeHtml(meta.path)}`);
  }

  if (meta.integration) {
    lines.push(`<b>Integration:</b> ${escapeHtml(meta.integration)}`);
  }

  if (meta.source) {
    lines.push(`<b>Source:</b> ${escapeHtml(meta.source)}`);
  }

  if (meta.message) {
    lines.push("", `<b>Error:</b> ${escapeHtml(String(meta.message).slice(0, 400))}`);
  }

  if (meta.stack) {
    lines.push("", `<b>Stack:</b> ${escapeHtml(String(meta.stack).slice(0, 300))}`);
  }

  return lines.join("\n");
}
