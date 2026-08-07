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
import {
  sanitizeChartLivePublish,
  seedPublicChartLivePayload,
} from "@/lib/liveFeeds/publicChartLivePublish";

function withLiveFlags(data, chart) {
  const liveBacked = !!chart?.live_backed;
  const livePublish = sanitizeChartLivePublish(chart?.live_publish);
  return {
    ...data,
    live_backed: liveBacked,
    live_poll_interval_ms: liveBacked
      ? livePublish?.pollIntervalMs || null
      : null,
    live_overlay_kind: liveBacked ? livePublish?.overlayKind || null : null,
  };
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

    const owner = {
      owner_handle: user.user_name ? String(user.user_name) : String(username || "").trim(),
      owner_name: user.name ? String(user.name) : null,
      owner_profile_pic: user.profile_pic ? String(user.profile_pic) : null,
    };

    const cached = publicPayloadFromPublishedBundle(chart);
    if (cached) {
      const seeded = chart.live_backed
        ? seedPublicChartLivePayload(cached, chart.live_publish)
        : cached;
      res.setHeader(
        "Cache-Control",
        chart.live_backed
          ? "public, s-maxage=30, stale-while-revalidate=60"
          : publicChartCacheControl(true),
      );
      return res.status(200).json({
        success: true,
        data: withLiveFlags(
          {
            chart: seeded.chart,
            rows: seeded.rows,
            dataSheets: seeded.dataSheets,
            ...owner,
          },
          chart,
        ),
      });
    }

    const dataSet = await hydrateDataSetForPublicChartViewer(chart, dataSetRaw);
    const bundle = buildPublicChartBundle(chart, dataSet);
    const seeded = chart.live_backed
      ? seedPublicChartLivePayload(bundle, chart.live_publish)
      : bundle;

    res.setHeader(
      "Cache-Control",
      chart.live_backed
        ? "public, s-maxage=30, stale-while-revalidate=60"
        : publicChartCacheControl(chartHasPublishedSnapshot(chart)),
    );
    return res.status(200).json({
      success: true,
      data: withLiveFlags(
        {
          chart: seeded.chart,
          rows: seeded.rows,
          dataSheets: seeded.dataSheets,
          ...owner,
        },
        chart,
      ),
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message || "Server error" });
  }
}
