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
 * Mark ChartDashboards for a dataset as live-backed when feeds are persisted.
 * @param {{ dataSetId: string; liveBacked: boolean }} opts
 */
export async function markDashboardsLiveBacked({ dataSetId, liveBacked }) {
  if (!dataSetId) return { modified: 0 };
  const ChartDashboard = (await import("@/models/ChartDashboards")).default;
  const result = await ChartDashboard.updateMany(
    { data_set_id: dataSetId },
    {
      $set: {
        live_backed: !!liveBacked,
        ...(liveBacked ? { live_backed_at: new Date() } : {}),
      },
    },
  );
  return { modified: result?.modifiedCount ?? 0 };
}
