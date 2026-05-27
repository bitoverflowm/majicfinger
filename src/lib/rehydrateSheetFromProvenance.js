/**
 * Re-run a saved Data Lake provenance query into a target sheet (Connect home replay + grid rehydrate).
 */

function safeSheetGraphName(name, id) {
  let t = String(name || id || "sheet").replace(/[^a-zA-Z0-9_]+/g, "_");
  if (/^[0-9]/.test(t)) t = `s_${t}`;
  const out = t.slice(0, 60);
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(out) ? out : `sheet_${String(id).replace(/\W/g, "")}`.slice(0, 60);
}

function buildSheetGraph(dataSheets, rootSheetId) {
  const sheetGraph = {};
  const collect = (id) => {
    if (!id || sheetGraph[id]) return;
    const sheet = dataSheets?.[id];
    if (!sheet?.provenance) return;
    sheetGraph[id] = { name: safeSheetGraphName(sheet.name, id), provenance: sheet.provenance };
    for (const dep of sheet.provenance.serverSheetJoins || []) {
      if (dep?.targetSheetId) collect(dep.targetSheetId);
    }
  };
  collect(rootSheetId);
  return sheetGraph;
}

/**
 * @param {{
 *   targetSheetId: string;
 *   provenance: object;
 *   dataSheets: Record<string, object>;
 *   sourceSheetId?: string;
 * }} args
 */
export async function rehydrateSheetFromProvenance({
  targetSheetId,
  provenance,
  dataSheets,
  sourceSheetId,
}) {
  if (!targetSheetId || !provenance) {
    throw new Error("Missing sheet or saved query to replay.");
  }

  const sourceSheet = sourceSheetId ? dataSheets?.[sourceSheetId] : dataSheets?.[targetSheetId];
  const sheetGraph = buildSheetGraph(dataSheets, sourceSheetId || targetSheetId);

  const res = await fetch("/api/data-lake/rehydrate-sheet", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({
      sheetId: targetSheetId,
      provenance,
      sheetGraph,
      operationHistory: sourceSheet?.operationHistory || [],
      previewRows: sourceSheet?.data || [],
      saveMeta: sourceSheet?.saveMeta || null,
    }),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(json?.error || res.statusText || `Rehydrate ${res.status}`);
  }

  const rows = Array.isArray(json?.rows) ? json.rows : [];
  return { rows, json, sourceSheet };
}
