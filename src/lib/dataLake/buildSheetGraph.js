/** Build Athena CTE sheet graph from workspace data sheets (same shape as sheet-refine-athena). */

export function cteSafeSheetName(name, id) {
  let t = String(name || id || "sheet").replace(/[^a-zA-Z0-9_]+/g, "_");
  if (/^[0-9]/.test(t)) t = `s_${t}`;
  const u = t.slice(0, 60);
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(u) ? u : `sheet_${String(id).replace(/\W/g, "")}`.slice(0, 60);
}

/**
 * @param {string} rootSheetId
 * @param {Record<string, object>} dataSheets
 * @returns {Record<string, { name: string, provenance: object }> | null}
 */
export function buildSheetGraphForAthena(rootSheetId, dataSheets) {
  const rootId = String(rootSheetId || "").trim();
  if (!rootId || !dataSheets?.[rootId]) return null;

  const graph = {};
  const walk = (id) => {
    if (graph[id]) return;
    const sheet = dataSheets[id];
    if (!sheet?.provenance) return;
    graph[id] = { name: cteSafeSheetName(sheet.name, id), provenance: sheet.provenance };
    for (const dep of sheet.provenance.serverSheetJoins || []) {
      if (dep?.targetSheetId && dataSheets[dep.targetSheetId]) walk(dep.targetSheetId);
    }
  };
  walk(rootId);
  return graph[rootId] ? graph : null;
}
