import mongoose from "mongoose";
import DataSet from "@/models/DataSets";
import { stripProvenanceRowPayloadForLoad } from "@/lib/projectPersistence";

/**
 * Remove inline row payloads from every sheet — fork/resolve only need provenance + recipes.
 * @param {Record<string, object> | null | undefined} dataSheets
 */
export function stripAllSheetRowPayloads(dataSheets) {
  if (!dataSheets || typeof dataSheets !== "object") return {};
  return Object.entries(dataSheets).reduce((acc, [sheetId, sheet]) => {
    if (!sheet || typeof sheet !== "object") {
      acc[sheetId] = sheet;
      return acc;
    }
    acc[sheetId] = {
      ...sheet,
      data: [],
      previewRowCount: 0,
    };
    return acc;
  }, {});
}

/**
 * @param {object | null | undefined} dataSet
 */
export function prepareDataSetForRunYourself(dataSet) {
  if (!dataSet || typeof dataSet !== "object") return null;
  const withoutRows = {
    ...dataSet,
    data: [],
    data_sheets: stripAllSheetRowPayloads(dataSet.data_sheets),
  };
  return stripProvenanceRowPayloadForLoad(withoutRows);
}

const RUN_YOURSELF_DATA_SET_PROJECTION = {
  data_set_name: 1,
  user_id: 1,
  forked_from_user_id: 1,
  forked_from_user_handle: 1,
  forked_from_data_set_id: 1,
  forked_from_chart_id: 1,
  forked_at: 1,
  run_yourself_analysis_id: 1,
  last_saved_date: 1,
  data_sheets: {
    $arrayToObject: {
      $map: {
        input: { $ifNull: [{ $objectToArray: "$data_sheets" }, []] },
        as: "entry",
        in: {
          k: "$$entry.k",
          v: {
            $mergeObjects: ["$$entry.v", { data: [], previewRowCount: 0 }],
          },
        },
      },
    },
  },
};

/**
 * Load a project for run-yourself resolve/fork without transferring megabytes of sheet rows.
 * Uses a Mongo aggregation so row arrays are cleared server-side before the wire transfer.
 *
 * @param {import("mongoose").Types.ObjectId | string} dataSetId
 */
export async function loadDataSetForRunYourself(dataSetId) {
  const id = String(dataSetId || "").trim();
  if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;

  try {
    const [doc] = await DataSet.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(id) } },
      { $project: RUN_YOURSELF_DATA_SET_PROJECTION },
    ]);
    if (doc) return prepareDataSetForRunYourself(doc);
  } catch {
    /* fall through to lean load + strip */
  }

  const lean = await DataSet.findById(id)
    .select(
      "data_sheets data_set_name user_id forked_from_user_id forked_from_user_handle forked_from_data_set_id forked_from_chart_id forked_at run_yourself_analysis_id last_saved_date",
    )
    .lean();
  return prepareDataSetForRunYourself(lean);
}
