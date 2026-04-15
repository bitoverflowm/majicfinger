import dbConnect from "@/lib/dbConnect";
import Chart from "@/models/Charts";
import DataSet from "@/models/DataSets";
import User from "@/models/Users";
import { inferDefaultBuilderSnapshot } from "@/lib/inferDefaultBuilderSnapshot";

function stripInternalFromRows(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => {
    if (!row || typeof row !== "object") return row;
    const next = { ...row };
    return next;
  });
}

function normalizeBuilderSnapshot(snapshot, rows) {
  const fallback = inferDefaultBuilderSnapshot(rows);
  const s = snapshot && typeof snapshot === "object" ? { ...snapshot } : { ...fallback };
  const first = Array.isArray(rows) && rows[0] && typeof rows[0] === "object" ? rows[0] : null;
  const keys = first ? Object.keys(first) : [];
  if (!keys.length) return fallback;

  const allowedTypes = new Set(["area", "bar", "line", "pie", "treemap", "liveline"]);
  const type = String(s.selChartType || "").trim();
  s.selChartType = allowedTypes.has(type) ? type : fallback.selChartType;

  const deScope = (k) => {
    const raw = String(k || "");
    const idx = raw.indexOf("::");
    return idx > -1 ? raw.slice(idx + 2) : raw;
  };

  const normalizedX = deScope(s.selX);
  s.selX = keys.includes(normalizedX) ? normalizedX : fallback.selX;

  const rawY = Array.isArray(s.selY) ? s.selY : [];
  const cleanY = rawY
    .map((k) => deScope(k))
    .filter((k) => keys.includes(k));
  s.selY = cleanY.length ? [...new Set(cleanY)] : fallback.selY;

  // Keep per-series visual config aligned when historical snapshots used scoped keys.
  if (s.lineColorOverrides && typeof s.lineColorOverrides === "object") {
    const nextOverrides = {};
    for (const [rawKey, color] of Object.entries(s.lineColorOverrides)) {
      const key = deScope(rawKey);
      if (keys.includes(key) && typeof color === "string" && color.trim()) {
        nextOverrides[key] = color;
      }
    }
    s.lineColorOverrides = nextOverrides;
  }

  if (s.chartConfig && typeof s.chartConfig === "object") {
    const nextCfg = {};
    for (const [rawKey, cfg] of Object.entries(s.chartConfig)) {
      const key = deScope(rawKey);
      if (keys.includes(key) && cfg && typeof cfg === "object") {
        nextCfg[key] = cfg;
      }
    }
    s.chartConfig = nextCfg;
  }

  // Guard against blank render when historical snapshots carried unsupported state.
  if (!s.selX || !Array.isArray(s.selY) || s.selY.length === 0) {
    s.selX = fallback.selX;
    s.selY = fallback.selY;
    s.selChartType = fallback.selChartType;
  }

  return s;
}

export default async function handler(req, res) {
  const { username, slug } = req.query;

  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    await dbConnect();
    const user = await User.findOne({ user_name: String(username || "").trim() }).lean();
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

    const dataSet = await DataSet.findById(chart.data_set_id).lean();
    if (!dataSet || !Array.isArray(dataSet.data)) {
      return res.status(404).json({ success: false, message: "Dataset not found" });
    }

    const cp = Array.isArray(chart.chart_properties) ? chart.chart_properties[0] : chart.chart_properties;
    const rechartsBuilderRaw =
      cp && typeof cp === "object" && cp.rechartsBuilder && cp.rechartsBuilder.v === 1
        ? cp.rechartsBuilder
        : inferDefaultBuilderSnapshot(dataSet.data);
    const rechartsBuilder = normalizeBuilderSnapshot(rechartsBuilderRaw, dataSet.data);

    const publicChart = {
      chart_name: chart.chart_name,
      chart_properties: cp && typeof cp === "object" ? [cp] : [],
      rechartsBuilder,
    };

    return res.status(200).json({
      success: true,
      data: {
        chart: publicChart,
        rows: stripInternalFromRows(dataSet.data),
      },
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message || "Server error" });
  }
}
