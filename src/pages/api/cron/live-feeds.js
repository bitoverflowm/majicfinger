import dbConnect from "@/lib/dbConnect";
import LiveFeed from "@/models/LiveFeeds";
import DataSet from "@/models/DataSets";
import { createLiveFeedConfig, extractPersistedLiveFeedsFromSheets } from "@/lib/liveFeeds/feedConfig";
import { getLiveFeedEndpointDef, isLiveFeedAllowed } from "@/lib/liveFeeds/registry";
import { fetchKalshiLiveEventCandlesticksIncrementalServer } from "@/lib/liveFeeds/fetchEventCandlesticksIncrementalServer";
import { applyKalshiCandlestickUpsertToSheets } from "@/lib/liveFeeds/merge/kalshiCandlestickUpsert";
import {
  buildLiveFeedEndedStamp,
  evaluateTrackedMarketsClosure,
  stampLiveFeedEndedOnSheets,
} from "@/lib/liveFeeds/marketClosure";
import { markDashboardsLiveBacked } from "@/lib/liveFeeds/syncLiveFeedIndex";

export const config = {
  maxDuration: 60,
};

/**
 * Verify cron auth via CRON_SECRET (Authorization: Bearer …) or Vercel cron header.
 * @param {import("next").NextApiRequest} req
 */
function assertCronAuthorized(req) {
  const secret = String(process.env.CRON_SECRET || "").trim();
  if (secret) {
    const auth = String(req.headers.authorization || "");
    if (auth === `Bearer ${secret}`) return true;
  }
  // Vercel Cron sends this header on scheduled invocations
  if (req.headers["x-vercel-cron"] === "1") return true;
  // Allow in development without secret for local testing
  if (process.env.NODE_ENV !== "production" && !secret) return true;
  return false;
}

/**
 * GET/POST /api/cron/live-feeds — tick due persisted REST live feeds.
 */
export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!assertCronAuthorized(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    await dbConnect();
    const now = Date.now();
    const due = await LiveFeed.find({ status: "persisted" })
      .sort({ last_polled_at: 1 })
      .limit(40)
      .lean();

    let processed = 0;
    let updated = 0;
    let ended = 0;
    let skipped = 0;
    let errors = 0;

    for (const doc of due) {
      const pollMs = Math.floor(Number(doc.poll_interval_ms)) || 60_000;
      const last = doc.last_polled_at ? new Date(doc.last_polled_at).getTime() : 0;
      if (last && now - last < pollMs - 2000) {
        skipped += 1;
        continue;
      }

      const cfg = createLiveFeedConfig({
        ...(doc.config && typeof doc.config === "object" ? doc.config : {}),
        id: doc.feed_id,
        integration: doc.integration,
        endpoint: doc.endpoint,
        status: "persisted",
        pollIntervalMs: pollMs,
      });
      if (!cfg || !isLiveFeedAllowed(cfg.integration, cfg.endpoint)) {
        skipped += 1;
        continue;
      }

      processed += 1;
      try {
        const dataSet = await DataSet.findById(doc.data_set_id);
        if (!dataSet) {
          await LiveFeed.updateOne(
            { _id: doc._id },
            {
              $set: {
                last_error: "DataSet not found",
                last_polled_at: new Date(),
                updated_at: new Date(),
              },
              $inc: { poll_count: 1, error_count: 1 },
            },
          );
          errors += 1;
          continue;
        }

        const sheets =
          dataSet.data_sheets && typeof dataSet.data_sheets === "object" ? dataSet.data_sheets : {};
        const def = getLiveFeedEndpointDef(cfg.integration, cfg.endpoint);
        const softRowCap = def?.softRowCapPerSheet ?? 2000;
        const lookbackPeriods = def?.lookbackPeriods ?? 3;

        let tick = null;
        if (cfg.integration === "kalshi-live" && cfg.endpoint === "event_candlesticks") {
          tick = await fetchKalshiLiveEventCandlesticksIncrementalServer({
            eventTicker: cfg.params.eventTicker,
            seriesTicker: cfg.params.seriesTicker,
            periodInterval: cfg.params.periodInterval,
            lookbackPeriods,
          });
        }

        if (!tick) {
          skipped += 1;
          continue;
        }

        const nextSheets = applyKalshiCandlestickUpsertToSheets(sheets, cfg, tick, { softRowCap });
        let dataSheetsOut = nextSheets.dataSheets;

        const tracked = Object.keys(cfg.sheets?.marketSheetIdsByTicker || {});
        const closure = evaluateTrackedMarketsClosure(tick.metaRows, tracked, Date.now());

        if (closure.allClosed) {
          const endedStamp = buildLiveFeedEndedStamp(cfg, {
            reason: "markets_closed",
            closedTickers: closure.closedTickers,
          });
          dataSheetsOut = stampLiveFeedEndedOnSheets(dataSheetsOut, cfg, endedStamp);
          dataSet.data_sheets = dataSheetsOut;
          dataSet.last_saved_date = new Date();
          dataSet.markModified("data_sheets");
          await dataSet.save();

          const tickStats = nextSheets.stats || null;
          await LiveFeed.updateOne(
            { _id: doc._id },
            {
              $set: {
                status: "ended",
                last_polled_at: new Date(now),
                last_success_at: new Date(now),
                last_error: null,
                last_tick_stats: tickStats,
                config: {
                  ...cfg,
                  status: "ended",
                  lastPolledAt: now,
                  lastSuccessAt: now,
                  lastError: null,
                  endedReason: "markets_closed",
                  liveFeedEnded: endedStamp,
                },
                updated_at: new Date(),
              },
              $inc: {
                poll_count: 1,
                success_count: 1,
                candles_received_total: Math.max(0, Number(tickStats?.candlesReceived) || 0),
                candles_added_total: Math.max(0, Number(tickStats?.candlesAdded) || 0),
                candles_updated_total: Math.max(0, Number(tickStats?.candlesUpdated) || 0),
              },
            },
          );

          const stillLive = extractPersistedLiveFeedsFromSheets(dataSheetsOut).some(
            (f) => f.status === "persisted",
          );
          if (!stillLive) {
            try {
              await markDashboardsLiveBacked({
                dataSetId: String(doc.data_set_id),
                liveBacked: false,
              });
            } catch (_) {
              /* non-fatal */
            }
          }

          ended += 1;
          continue;
        }

        dataSet.data_sheets = dataSheetsOut;
        dataSet.last_saved_date = new Date();
        dataSet.markModified("data_sheets");
        await dataSet.save();

        const tickStats = nextSheets.stats || null;
        const stamped = {
          ...cfg,
          lastPolledAt: now,
          lastSuccessAt: now,
          lastError: null,
        };
        await LiveFeed.updateOne(
          { _id: doc._id },
          {
            $set: {
              last_polled_at: new Date(now),
              last_success_at: new Date(now),
              last_error: null,
              last_tick_stats: tickStats,
              config: stamped,
              updated_at: new Date(),
            },
            $inc: {
              poll_count: 1,
              success_count: 1,
              candles_received_total: Math.max(0, Number(tickStats?.candlesReceived) || 0),
              candles_added_total: Math.max(0, Number(tickStats?.candlesAdded) || 0),
              candles_updated_total: Math.max(0, Number(tickStats?.candlesUpdated) || 0),
            },
          },
        );
        updated += 1;
      } catch (e) {
        errors += 1;
        const msg = e instanceof Error ? e.message : "Poll failed";
        await LiveFeed.updateOne(
          { _id: doc._id },
          {
            $set: {
              last_polled_at: new Date(),
              last_error: msg.slice(0, 500),
              updated_at: new Date(),
            },
            $inc: { poll_count: 1, error_count: 1 },
          },
        );
      }
    }

    return res.status(200).json({
      ok: true,
      processed,
      updated,
      ended,
      skipped,
      errors,
      checked: due.length,
    });
  } catch (e) {
    return res.status(500).json({
      error: e instanceof Error ? e.message : "Cron live-feeds failed",
    });
  }
}
