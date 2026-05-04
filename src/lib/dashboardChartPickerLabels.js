/**
 * Labels for dashboard chart pickers: "Project name: Chart name".
 */

/**
 * @param {unknown} dataSetId
 * @param {unknown[]|undefined} savedDataSets
 * @param {unknown} [loadedDataMeta]
 * @returns {string}
 */
export function projectNameForDataSetId(dataSetId, savedDataSets, loadedDataMeta) {
  const id = dataSetId != null && dataSetId !== "" ? String(dataSetId) : "";
  if (!id) return "";
  const list = Array.isArray(savedDataSets) ? savedDataSets : [];
  const fromList = list.find((d) => d && String(d._id) === id);
  const n = fromList?.data_set_name;
  if (n != null && String(n).trim() !== "") return String(n).trim();
  if (loadedDataMeta && String(loadedDataMeta._id) === id) {
    const m = loadedDataMeta.data_set_name;
    if (m != null && String(m).trim() !== "") return String(m).trim();
  }
  return "";
}

/**
 * @param {object} chart saved chart row (must include _id, optional chart_name, data_set_id)
 * @param {unknown[]|undefined} savedDataSets
 * @param {unknown} [loadedDataMeta]
 * @returns {string}
 */
export function chartPickerDisplayName(chart, savedDataSets, loadedDataMeta) {
  const chartName = String(chart?.chart_name ?? "").trim() || "Chart";
  const project = projectNameForDataSetId(chart?.data_set_id, savedDataSets, loadedDataMeta);
  return project ? `${project}: ${chartName}` : chartName;
}

/**
 * @param {unknown[]|undefined} savedCharts
 * @param {unknown[]|undefined} savedDataSets
 * @param {unknown} [loadedDataMeta]
 * @returns {{ id: string, name: string }[]}
 */
export function mapSavedChartsToPickerOptions(savedCharts, savedDataSets, loadedDataMeta) {
  const list = Array.isArray(savedCharts) ? savedCharts : [];
  return list.map((c) => ({
    id: String(c._id),
    name: chartPickerDisplayName(c, savedDataSets, loadedDataMeta),
  }));
}
