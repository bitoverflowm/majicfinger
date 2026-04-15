import dbConnect from "@/lib/dbConnect";
import Chart from "@/models/Charts";
import User from "@/models/Users";

/**
 * Lightweight lookup for generateMetadata (title / OG).
 * @param {string} username
 * @param {string} slug
 * @returns {Promise<{ chart_name?: string } | null>}
 */
export async function getPublicChartMeta(username, slug) {
  if (!username || !slug) return null;
  await dbConnect();
  const user = await User.findOne({ user_name: String(username).trim() }).select("_id").lean();
  if (!user) return null;
  const chart = await Chart.findOne({
    user_id: user._id,
    public_slug: String(slug).trim(),
    is_public: true,
  })
    .select("chart_name")
    .lean();
  if (!chart) return null;
  return { chart_name: chart.chart_name || "Chart" };
}
