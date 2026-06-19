import dbConnect from "@/lib/dbConnect";
import Chart from "@/models/Charts";
import DataSet from "@/models/DataSets";
import { buildPublicChartBundle } from "@/lib/chartBundle";
import { assertDocumentOwner, requireLoginSession } from "@/lib/resourceOwnership";
import { hydrateDataSetForPublicChartViewer } from "@/lib/server/hydratePublicChartDataset";
import { publicPayloadFromPublishedBundle } from "@/lib/server/materializeChartBundle";

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    await dbConnect();
    const session = await requireLoginSession(req, res);
    if (!session) return;

    const chart = await Chart.findById(id).lean();
    if (!assertDocumentOwner(chart, session, res)) return;
    if (!chart?.data_set_id) {
      return res.status(404).json({ success: false, message: "Chart not found" });
    }

    const cached = publicPayloadFromPublishedBundle(chart);
    if (cached) {
      return res.status(200).json({
        success: true,
        data: {
          chart: cached.chart,
          rows: cached.rows,
          dataSheets: cached.dataSheets,
          rechartsBuilder: cached.chart?.rechartsBuilder,
          _cacheHit: true,
        },
      });
    }

    const dataSetRaw = await DataSet.findById(chart.data_set_id).lean();
    if (!dataSetRaw) {
      return res.status(404).json({ success: false, message: "Dataset not found" });
    }

    const dataSet = await hydrateDataSetForPublicChartViewer(chart, dataSetRaw);
    const bundle = buildPublicChartBundle(chart, dataSet);

    return res.status(200).json({ success: true, data: bundle });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message || "Server error" });
  }
}
