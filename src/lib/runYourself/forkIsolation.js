/**
 * Run-for-yourself fork must never mutate the publisher's Mongo documents.
 * Fork creates new DataSet / Chart / ChartDashboard rows for the runner only.
 */

/**
 * @param {import("mongoose").Types.ObjectId | string} sourceId
 * @param {import("mongoose").Types.ObjectId | string} forkId
 */
export function assertForkCreatedDistinctProject(sourceId, forkId) {
  if (sourceId != null && forkId != null && String(sourceId) === String(forkId)) {
    const err = new Error("Fork isolation violated: fork project id equals source project id");
    err.statusCode = 500;
    throw err;
  }
}

/**
 * Strip internal lineage fields before sending project payloads to clients that should not
 * target the original publisher's ObjectIds (defense in depth when list endpoints leak ids).
 * @param {Record<string, unknown> | null | undefined} dataSet
 * @returns {Record<string, unknown> | null | undefined}
 */
export function redactForkLineageForClient(dataSet) {
  if (!dataSet || typeof dataSet !== "object") return dataSet;
  const out = { ...dataSet };
  delete out.forked_from_data_set_id;
  delete out.forked_from_chart_id;
  delete out.forked_from_user_id;
  return out;
}
