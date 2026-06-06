import mongoose from "mongoose";

/** Sheet fields needed for project list UI (row counts, storage mode) — not row payloads. */
const LIGHTWEIGHT_SHEET_PROJECTION = {
  name: "$$entry.v.name",
  storageMode: "$$entry.v.storageMode",
  rowCount: "$$entry.v.rowCount",
  fullRowCount: "$$entry.v.fullRowCount",
  previewRowCount: "$$entry.v.previewRowCount",
  rehydrationStatus: "$$entry.v.rehydrationStatus",
  saveMeta: "$$entry.v.saveMeta",
};

/**
 * Mongo aggregation: list a user's projects without loading sheet row arrays or provenance blobs.
 *
 * @param {string} userId
 */
export function buildLightweightDataSetListPipeline(userId) {
  const ownerId = new mongoose.Types.ObjectId(String(userId));
  return [
    { $match: { user_id: ownerId } },
    {
      $project: {
        data_set_name: 1,
        created_date: 1,
        last_saved_date: 1,
        labels: 1,
        source: 1,
        user_id: 1,
        save_meta: 1,
        data_sheets: {
          $arrayToObject: {
            $map: {
              input: { $objectToArray: { $ifNull: ["$data_sheets", {}] } },
              as: "entry",
              in: {
                k: "$$entry.k",
                v: LIGHTWEIGHT_SHEET_PROJECTION,
              },
            },
          },
        },
      },
    },
  ];
}
