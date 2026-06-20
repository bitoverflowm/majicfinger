import dbConnect from "@/lib/dbConnect";
import Chart from "@/models/Charts";
import DataSet from "@/models/DataSets";
import User from "@/models/Users";
import { publicPayloadFromPublishedBundle } from "@/lib/server/materializeChartBundle";
import { sheetNeedsLakeRehydrate } from "@/lib/server/hydratePublicChartDataset";
import { sheetNeedsQuantAthenaReplay } from "@/lib/projectPersistence";
import { collectSheetClosureForCharts } from "@/lib/runYourself/collectSheetClosure";

/** @typedef {"fast" | "slow"} PublicChartLoadTier */

/**
 * Classify whether a public chart needs a live lake / Athena pull on view.
 * Published snapshot bundles and inline-only datasets are "fast".
 *
 * @param {string} username
 * @param {string} slug
 * @returns {Promise<PublicChartLoadTier>}
 */
export async function getPublicChartLoadTier(username, slug) {
  if (!username || !slug) return "fast";

  await dbConnect();
  const user = await User.findOne({ user_name: String(username).trim() }).select("_id").lean();
  if (!user) return "fast";

  const chart = await Chart.findOne({
    user_id: user._id,
    public_slug: String(slug).trim(),
    is_public: true,
  }).lean();
  if (!chart) return "fast";

  if (publicPayloadFromPublishedBundle(chart)) return "fast";

  const dataSetRaw = await DataSet.findById(chart.data_set_id).lean();
  if (!dataSetRaw) return "fast";

  const dataSheets =
    dataSetRaw?.data_sheets && typeof dataSetRaw.data_sheets === "object"
      ? dataSetRaw.data_sheets
      : {};
  const closureOrder = collectSheetClosureForCharts(dataSheets, [chart]);

  for (const sheetId of closureOrder) {
    const sheet = dataSheets[sheetId];
    if (sheetNeedsLakeRehydrate(sheet)) return "slow";
    if (sheetNeedsQuantAthenaReplay(sheet)) return "slow";
  }

  return "fast";
}

/**
 * @param {Array<{ username: string; slug: string; order: number }>} refs
 * @returns {Promise<Array<{ id: string; username: string; slug: string; order: number; tier: PublicChartLoadTier }>>}
 */
export async function resolvePublicChartLoadPlan(refs) {
  const tiers = await Promise.all(
    refs.map((ref) => getPublicChartLoadTier(ref.username, ref.slug)),
  );

  return refs.map((ref, index) => ({
    id: `${ref.username}/${ref.slug}#${ref.order}`,
    username: ref.username,
    slug: ref.slug,
    order: ref.order,
    tier: tiers[index],
  }));
}
