/**
 * Upsert LiveFeed index docs after a project save solidifies feeds.
 * @param {{
 *   userId: string;
 *   dataSetId: string;
 *   feeds: import("@/lib/liveFeeds/feedConfig").LiveFeedConfig[];
 * }} opts
 */
export async function upsertLiveFeedIndexDocs({ userId, dataSetId, feeds }) {
  if (!userId || !dataSetId || !Array.isArray(feeds) || feeds.length === 0) {
    return { upserted: 0 };
  }

  const LiveFeed = (await import("@/models/LiveFeeds")).default;
  let upserted = 0;
  const now = new Date();

  for (const feed of feeds) {
    if (!feed?.id || feed.status !== "persisted") continue;
    await LiveFeed.findOneAndUpdate(
      { feed_id: feed.id },
      {
        $set: {
          feed_id: feed.id,
          user_id: userId,
          data_set_id: dataSetId,
          integration: feed.integration,
          endpoint: feed.endpoint,
          status: "persisted",
          poll_interval_ms: feed.pollIntervalMs,
          config: feed,
          updated_at: now,
        },
        $setOnInsert: {
          created_at: now,
        },
      },
      { upsert: true, new: true },
    );
    upserted += 1;
  }

  return { upserted };
}

/**
 * True when this dataset still has an actively persisted REST live feed.
 * Prefers the LiveFeed index; falls back to sheet stamps (saveMeta/provenance).
 * @param {string} dataSetId
 * @param {{ dataSheets?: Record<string, object> | null }} [opts]
 * @returns {Promise<boolean>}
 */
export async function datasetHasActivePersistedLiveFeeds(dataSetId, opts = {}) {
  const id = String(dataSetId || "").trim();
  if (!id) return false;

  try {
    const LiveFeed = (await import("@/models/LiveFeeds")).default;
    const n = await LiveFeed.countDocuments({ data_set_id: id, status: "persisted" });
    if (n > 0) return true;
  } catch {
    /* fall through to sheet stamps */
  }

  let sheets = opts.dataSheets;
  if (!sheets || typeof sheets !== "object") {
    try {
      const DataSet = (await import("@/models/DataSets")).default;
      const ds = await DataSet.findById(id).select("data_sheets").lean();
      sheets = ds?.data_sheets && typeof ds.data_sheets === "object" ? ds.data_sheets : null;
    } catch {
      return false;
    }
  }
  if (!sheets) return false;

  const { extractPersistedLiveFeedsFromSheets } = await import("@/lib/liveFeeds/feedConfig");
  return extractPersistedLiveFeedsFromSheets(sheets).some((f) => f.status === "persisted");
}

/**
 * Fields to set on a ChartDashboard so public embeds stay in sync with live feeds.
 * @param {boolean} liveBacked
 */
export function liveBackedDashboardFields(liveBacked) {
  const on = !!liveBacked;
  return {
    live_backed: on,
    ...(on ? { live_backed_at: new Date() } : {}),
  };
}

/**
 * Mark ChartDashboards for a dataset as live-backed when feeds are persisted.
 * @param {{ dataSetId: string; liveBacked: boolean }} opts
 */
export async function markDashboardsLiveBacked({ dataSetId, liveBacked }) {
  if (!dataSetId) return { modified: 0 };
  const ChartDashboard = (await import("@/models/ChartDashboards")).default;
  const result = await ChartDashboard.updateMany(
    { data_set_id: dataSetId },
    {
      $set: liveBackedDashboardFields(liveBacked),
    },
  );
  return { modified: result?.modifiedCount ?? 0 };
}
