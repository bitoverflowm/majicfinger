import dbConnect from "@/lib/dbConnect";
import Chart from "@/models/Charts";
import DataSet from "@/models/DataSets";
import User from "@/models/Users";
import { buildPublicChartBundle } from "@/lib/chartBundle";
import { chartHasPublishedSnapshot } from "@/lib/chartPublishStaleness";
import { hydrateDataSetForPublicChartViewer } from "@/lib/server/hydratePublicChartDataset";
import {
  publicChartCacheControl,
  publicPayloadFromPublishedBundle,
} from "@/lib/server/materializeChartBundle";
import { extractPersistedLiveFeedsFromSheets } from "@/lib/liveFeeds/feedConfig";

function datasetHasPersistedLiveFeed(dataSet) {
  const sheets = dataSet?.data_sheets && typeof dataSet.data_sheets === "object" ? dataSet.data_sheets : {};
  return extractPersistedLiveFeedsFromSheets(sheets).some((f) => f.status === "persisted");
}

function minLivePollIntervalMs(dataSet) {
  const sheets = dataSet?.data_sheets && typeof dataSet.data_sheets === "object" ? dataSet.data_sheets : {};
  let minMs = Number.POSITIVE_INFINITY;
  for (const feed of extractPersistedLiveFeedsFromSheets(sheets)) {
    const ms = Math.floor(Number(feed.pollIntervalMs));
    if (Number.isFinite(ms) && ms >= 15_000) minMs = Math.min(minMs, ms);
  }
  return Number.isFinite(minMs) ? minMs : 60_000;
}

export default async function handler(req, res) {
  const { username, slug } = req.query;

  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    await dbConnect();
    const user = await User.findOne({ user_name: String(username || "").trim() })
      .select("user_name name profile_pic")
      .lean();
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const chart = await Chart.findOne({
      user_id: user._id,
      public_slug: String(slug || "").trim(),
      is_public: true,
    }).lean();

    if (!chart) {
      return res.status(404).json({ success: false, message: "Chart not found" });
    }

    const dataSetRaw = await DataSet.findById(chart.data_set_id).lean();
    if (!dataSetRaw) {
      return res.status(404).json({ success: false, message: "Dataset not found" });
    }

    const liveBacked = datasetHasPersistedLiveFeed(dataSetRaw);

    if (!liveBacked) {
      const cached = publicPayloadFromPublishedBundle(chart);
      if (cached) {
        res.setHeader("Cache-Control", publicChartCacheControl(true));
        return res.status(200).json({
          success: true,
          data: {
            chart: cached.chart,
            rows: cached.rows,
            dataSheets: cached.dataSheets,
            owner_handle: user.user_name ? String(user.user_name) : String(username || "").trim(),
            owner_name: user.name ? String(user.name) : null,
            owner_profile_pic: user.profile_pic ? String(user.profile_pic) : null,
            live_backed: false,
          },
        });
      }
    }

    const dataSet = await hydrateDataSetForPublicChartViewer(chart, dataSetRaw);
    const { chart: publicChart, rows, dataSheets } = buildPublicChartBundle(chart, dataSet);

    res.setHeader(
      "Cache-Control",
      liveBacked
        ? "public, s-maxage=15, stale-while-revalidate=30"
        : publicChartCacheControl(chartHasPublishedSnapshot(chart)),
    );
    return res.status(200).json({
      success: true,
      data: {
        chart: publicChart,
        rows,
        dataSheets,
        owner_handle: user.user_name ? String(user.user_name) : String(username || "").trim(),
        owner_name: user.name ? String(user.name) : null,
        owner_profile_pic: user.profile_pic ? String(user.profile_pic) : null,
        live_backed: liveBacked,
        live_poll_interval_ms: liveBacked ? minLivePollIntervalMs(dataSetRaw) : null,
      },
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message || "Server error" });
  }
}
