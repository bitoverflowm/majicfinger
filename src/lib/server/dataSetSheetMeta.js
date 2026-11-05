import mongoose from "mongoose";
import DataSet from "@/models/DataSets";

const TTL_MS = 60_000;
const MAX_ENTRIES = 200;

/** @type {Map<string, { at: number; promise: Promise<Record<string, object>> }>} */
const cache = new Map();

/**
 * Workbook sheets without their row data: name, provenance, columns and at most one row,
 * so "which sheet has data" checks still work. Public live detection only needs this, and a
 * full `data_sheets` read can be several MB per request.
 *
 * @param {string | import("mongoose").Types.ObjectId | null | undefined} dataSetId
 * @returns {Promise<Record<string, object>>}
 */
export function loadDataSetSheetMeta(dataSetId) {
  const id = String(dataSetId || "").trim();
  if (!id || !mongoose.Types.ObjectId.isValid(id)) return Promise.resolve({});

  const now = Date.now();
  const hit = cache.get(id);
  if (hit && now - hit.at < TTL_MS) return hit.promise;

  const promise = DataSet.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(id) } },
    {
      $project: {
        sheets: {
          $arrayToObject: {
            $map: {
              input: { $objectToArray: { $ifNull: ["$data_sheets", {}] } },
              as: "s",
              in: {
                k: "$$s.k",
                v: {
                  name: "$$s.v.name",
                  provenance: "$$s.v.provenance",
                  columns: "$$s.v.columns",
                  dataTypes: "$$s.v.dataTypes",
                  storageMode: "$$s.v.storageMode",
                  rowCount: "$$s.v.rowCount",
                  data: {
                    $cond: [{ $isArray: "$$s.v.data" }, { $slice: ["$$s.v.data", 1] }, []],
                  },
                },
              },
            },
          },
        },
      },
    },
  ])
    .then((docs) => {
      const sheets = docs?.[0]?.sheets;
      return sheets && typeof sheets === "object" ? sheets : {};
    })
    .catch((err) => {
      cache.delete(id);
      throw err;
    });

  if (cache.size >= MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(id, { at: now, promise });
  return promise;
}
