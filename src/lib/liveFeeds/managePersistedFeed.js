/**
 * Server-side helpers to pause / resume / stop / restart / delete persisted live feeds
 * and keep DataSet sheet stamps + dashboard live_backed in sync.
 */

import LiveFeed from "@/models/LiveFeeds";
import DataSet from "@/models/DataSets";
import { createLiveFeedConfig, liveFeedSheetIds } from "@/lib/liveFeeds/feedConfig";
import {
  buildLiveFeedEndedStamp,
  clearLiveFeedEndedOnSheets,
  stampLiveFeedEndedOnSheets,
} from "@/lib/liveFeeds/marketClosure";
import {
  datasetHasActivePersistedLiveFeeds,
  markDashboardsLiveBacked,
} from "@/lib/liveFeeds/syncLiveFeedIndex";

/**
 * @param {Record<string, object>} dataSheets
 * @param {import("@/lib/liveFeeds/feedConfig").LiveFeedConfig} feed
 * @param {string} status
 * @param {Record<string, unknown>} [extra]
 */
export function patchLiveFeedStatusOnSheets(dataSheets, feed, status, extra = {}) {
  const next = { ...(dataSheets || {}) };
  const patchLf = (lf) => {
    if (!lf || typeof lf !== "object") return lf;
    return {
      ...lf,
      ...extra,
      status,
      isRunning: status === "persisted",
      isPaused: status === "paused",
    };
  };
  for (const sheetId of liveFeedSheetIds(feed)) {
    const sheet = next[sheetId];
    if (!sheet) continue;
    next[sheetId] = {
      ...sheet,
      ...(sheet.liveFeed ? { liveFeed: patchLf(sheet.liveFeed) } : {}),
      ...(sheet.saveMeta?.liveFeed
        ? { saveMeta: { ...sheet.saveMeta, liveFeed: patchLf(sheet.saveMeta.liveFeed) } }
        : {}),
      ...(sheet.provenance?.liveFeed
        ? {
            provenance: {
              ...sheet.provenance,
              liveFeed: patchLf(sheet.provenance.liveFeed),
            },
          }
        : {}),
    };
  }
  return next;
}

/**
 * Strip all live-feed stamps so Save won't re-register this feed.
 * @param {Record<string, object>} dataSheets
 * @param {import("@/lib/liveFeeds/feedConfig").LiveFeedConfig} feed
 */
export function removeLiveFeedStampsFromSheets(dataSheets, feed) {
  const next = { ...(dataSheets || {}) };
  for (const sheetId of liveFeedSheetIds(feed)) {
    const sheet = next[sheetId];
    if (!sheet) continue;
    const saveMeta =
      sheet.saveMeta && typeof sheet.saveMeta === "object" ? { ...sheet.saveMeta } : null;
    if (saveMeta && "liveFeed" in saveMeta) delete saveMeta.liveFeed;
    const provenance =
      sheet.provenance && typeof sheet.provenance === "object" ? { ...sheet.provenance } : null;
    if (provenance && "liveFeed" in provenance) delete provenance.liveFeed;
    const { liveFeed: _lf, liveFeedEnded: _ended, ...rest } = sheet;
    next[sheetId] = {
      ...rest,
      ...(saveMeta ? { saveMeta } : {}),
      ...(provenance ? { provenance } : {}),
      liveFeedEnded: null,
    };
  }
  return next;
}

/**
 * @param {string} dataSetId
 */
async function syncDashboardsLiveFlag(dataSetId) {
  const live = await datasetHasActivePersistedLiveFeeds(dataSetId);
  await markDashboardsLiveBacked({ dataSetId: String(dataSetId), liveBacked: live });
}

/**
 * @param {object} doc lean or mongoose LiveFeed
 * @returns {import("@/lib/liveFeeds/feedConfig").LiveFeedConfig | null}
 */
export function liveFeedConfigFromDoc(doc) {
  if (!doc) return null;
  return createLiveFeedConfig({
    ...(doc.config && typeof doc.config === "object" ? doc.config : {}),
    id: doc.feed_id,
    integration: doc.integration,
    endpoint: doc.endpoint,
    status: doc.status === "paused" || doc.status === "persisted" ? doc.status : "persisted",
    pollIntervalMs: doc.poll_interval_ms,
  });
}

/**
 * @param {string} dataSetId
 * @param {(sheets: Record<string, object>, cfg: import("@/lib/liveFeeds/feedConfig").LiveFeedConfig) => Record<string, object>} mutator
 * @param {import("@/lib/liveFeeds/feedConfig").LiveFeedConfig} cfg
 */
async function mutateDataSetSheets(dataSetId, cfg, mutator) {
  const dataSet = await DataSet.findById(dataSetId);
  if (!dataSet) return null;
  const sheets =
    dataSet.data_sheets && typeof dataSet.data_sheets === "object" ? dataSet.data_sheets : {};
  dataSet.data_sheets = mutator(sheets, cfg);
  dataSet.markModified("data_sheets");
  dataSet.last_saved_date = new Date();
  await dataSet.save();
  return dataSet;
}

/**
 * @param {{ feedId: string; userId: string; action: "pause" | "resume" | "stop" | "restart" | "delete" }} opts
 */
export async function managePersistedLiveFeed({ feedId, userId, action }) {
  const id = String(feedId || "").trim();
  const uid = String(userId || "").trim();
  if (!id || !uid) {
    return { ok: false, status: 400, message: "feedId and userId are required" };
  }

  const doc = await LiveFeed.findOne({ feed_id: id, user_id: uid });
  if (!doc) {
    return { ok: false, status: 404, message: "Live feed not found" };
  }

  const cfg = liveFeedConfigFromDoc(doc);
  if (!cfg) {
    return { ok: false, status: 400, message: "Invalid live feed config" };
  }

  const dataSetId = String(doc.data_set_id);
  const now = new Date();

  if (action === "pause") {
    if (doc.status === "ended") {
      return { ok: false, status: 400, message: "Stopped feeds must be restarted before pausing." };
    }
    doc.status = "paused";
    doc.config = { ...(doc.config || {}), ...cfg, status: "paused", isPaused: true, isRunning: false };
    doc.updated_at = now;
    await doc.save();
    await mutateDataSetSheets(dataSetId, cfg, (sheets) =>
      patchLiveFeedStatusOnSheets(sheets, cfg, "paused"),
    );
    await syncDashboardsLiveFlag(dataSetId);
    return { ok: true, feed: serializeLiveFeedDoc(doc) };
  }

  if (action === "resume") {
    if (doc.status === "ended") {
      return { ok: false, status: 400, message: "Stopped feeds must be restarted." };
    }
    doc.status = "persisted";
    doc.last_error = null;
    doc.config = {
      ...(doc.config || {}),
      ...cfg,
      status: "persisted",
      isPaused: false,
      isRunning: true,
      lastError: null,
    };
    doc.updated_at = now;
    await doc.save();
    await mutateDataSetSheets(dataSetId, cfg, (sheets) =>
      patchLiveFeedStatusOnSheets(clearLiveFeedEndedOnSheets(sheets, cfg), cfg, "persisted"),
    );
    await syncDashboardsLiveFlag(dataSetId);
    return { ok: true, feed: serializeLiveFeedDoc(doc) };
  }

  if (action === "stop") {
    const ended = buildLiveFeedEndedStamp(cfg, {
      reason: "user_stopped",
      message: "Live feed stopped",
      closedTickers: Object.keys(cfg.sheets?.marketSheetIdsByTicker || {}),
    });
    doc.status = "ended";
    doc.config = {
      ...(doc.config || {}),
      ...cfg,
      status: "ended",
      isRunning: false,
      isPaused: false,
      endedReason: "user_stopped",
      liveFeedEnded: ended,
    };
    doc.updated_at = now;
    await doc.save();
    await mutateDataSetSheets(dataSetId, cfg, (sheets) =>
      stampLiveFeedEndedOnSheets(sheets, cfg, ended),
    );
    await syncDashboardsLiveFlag(dataSetId);
    return { ok: true, feed: serializeLiveFeedDoc(doc) };
  }

  if (action === "restart") {
    doc.status = "persisted";
    doc.last_error = null;
    doc.config = {
      ...(doc.config || {}),
      ...cfg,
      status: "persisted",
      isPaused: false,
      isRunning: true,
      lastError: null,
      endedReason: null,
      liveFeedEnded: null,
    };
    doc.updated_at = now;
    await doc.save();
    await mutateDataSetSheets(dataSetId, cfg, (sheets) => {
      let next = clearLiveFeedEndedOnSheets(sheets, cfg);
      next = patchLiveFeedStatusOnSheets(next, cfg, "persisted", {
        endedReason: null,
        liveFeedEnded: null,
      });
      return next;
    });
    await syncDashboardsLiveFlag(dataSetId);
    return { ok: true, feed: serializeLiveFeedDoc(doc) };
  }

  if (action === "delete") {
    await mutateDataSetSheets(dataSetId, cfg, (sheets) => removeLiveFeedStampsFromSheets(sheets, cfg));
    await LiveFeed.deleteOne({ _id: doc._id });
    await syncDashboardsLiveFlag(dataSetId);
    return { ok: true, deleted: true, feedId: id };
  }

  return { ok: false, status: 400, message: `Unknown action: ${action}` };
}

/**
 * @param {object} doc
 */
export function serializeLiveFeedDoc(doc) {
  const lean = typeof doc.toObject === "function" ? doc.toObject() : doc;
  const pollCount = Math.max(0, Math.floor(Number(lean.poll_count)) || 0);
  const successCount = Math.max(0, Math.floor(Number(lean.success_count)) || 0);
  const errorCount = Math.max(0, Math.floor(Number(lean.error_count)) || 0);
  const successRate =
    pollCount > 0 ? Math.round((successCount / pollCount) * 1000) / 10 : null;
  const cfg = lean.config && typeof lean.config === "object" ? lean.config : {};
  return {
    id: String(lean.feed_id),
    _id: lean._id ? String(lean._id) : null,
    status: lean.status,
    integration: lean.integration,
    endpoint: lean.endpoint,
    pollIntervalMs: lean.poll_interval_ms,
    dataSetId: lean.data_set_id ? String(lean.data_set_id) : null,
    lastPolledAt: lean.last_polled_at || null,
    lastSuccessAt: lean.last_success_at || null,
    lastError: lean.last_error || null,
    createdAt: lean.created_at || null,
    updatedAt: lean.updated_at || null,
    pollCount,
    successCount,
    errorCount,
    successRate,
    candlesReceivedTotal: Math.max(0, Math.floor(Number(lean.candles_received_total)) || 0),
    candlesAddedTotal: Math.max(0, Math.floor(Number(lean.candles_added_total)) || 0),
    candlesUpdatedTotal: Math.max(0, Math.floor(Number(lean.candles_updated_total)) || 0),
    lastTickStats: lean.last_tick_stats || null,
    eventTicker: cfg?.params?.eventTicker || null,
    seriesTicker: cfg?.params?.seriesTicker || null,
    periodInterval: cfg?.periodInterval ?? cfg?.params?.periodInterval ?? null,
    endedReason: cfg?.endedReason || lean.config?.endedReason || null,
  };
}
