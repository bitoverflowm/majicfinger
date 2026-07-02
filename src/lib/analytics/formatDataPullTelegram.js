import { escapeHtml, formatFieldLines } from "@/lib/telegram/format";
import { formatDuration } from "@/lib/analytics/formatJourneySummary";
import { buildDataPullTelegramFields } from "@/lib/analytics/dataPullContext";
import { buildGeoTelegramFields } from "@/lib/telegram/geoFormat";

/**
 * @param {{
 *   phase: 'started' | 'completed' | 'zero_rows' | 'error';
 *   meta?: Record<string, unknown>;
 *   sessionEmail?: string;
 *   sessionGeo?: { country?: string; region?: string; city?: string; client_ip?: string; user_agent?: string; accept_language?: string };
 * }} opts
 */
export function buildDataPullTelegramMessage({ phase, meta = {}, sessionEmail, sessionGeo }) {
  const headline =
    phase === "started"
      ? "📥 Data pull started"
      : phase === "completed"
        ? "✅ Data pull complete"
        : phase === "zero_rows"
          ? "📡 Zero rows returned"
          : "❌ Data pull failed";

  const rowCount =
    meta.rowCount != null
      ? Number(meta.rowCount)
      : meta.loadedRowCount != null
        ? Number(meta.loadedRowCount)
        : undefined;

  /** @type {Record<string, string | number | boolean | null | undefined>} */
  const fields = {
    Integration: meta.integration || meta.integrationId,
    Endpoint: meta.endpoint || meta.sampleLabel || meta.sampleId || meta.table,
    Mode: meta.mode || meta.selectionTab,
    Query: meta.querySummary,
    Rows: rowCount,
    Duration:
      meta.elapsedMs != null
        ? formatDuration(Number(meta.elapsedMs))
        : undefined,
    Status: meta.status,
    "Live stream": meta.liveStream ? "yes" : undefined,
    Lake: meta.lake,
    Table: meta.table,
    Note:
      phase === "zero_rows"
        ? "Query ran successfully but returned no data — check filters, table, or UX clarity"
        : undefined,
    Error: phase === "error" ? meta.message : undefined,
  };

  const lines = [
    `<b>${headline}</b>`,
    "",
    formatFieldLines({
      ...buildDataPullTelegramFields(meta),
      ...fields,
      ...buildGeoTelegramFields(sessionGeo || {}),
    }),
  ].filter(Boolean);

  if (sessionEmail) {
    lines.push("", `<b>User:</b> ${escapeHtml(String(sessionEmail))}`);
  }

  return lines.join("\n").trim();
}
