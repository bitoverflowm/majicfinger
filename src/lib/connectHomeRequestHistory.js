/** @typedef {{ sheetId: string; sheet: object; cards: object[]; rowCount: number }} ConnectHomeSheetHistoryEntry */

export function sortConnectSheetIds(dataSheets) {
  return Object.keys(dataSheets || {}).sort((a, b) => {
    const na = parseInt(String(a).replace(/\D/g, ""), 10) || 0;
    const nb = parseInt(String(b).replace(/\D/g, ""), 10) || 0;
    return na - nb;
  });
}

/** Sheets with loaded rows and/or saved request cards (cross-integration history). */
export function listConnectHomeSheetHistory(dataSheets) {
  /** @type {ConnectHomeSheetHistoryEntry[]} */
  const out = [];
  for (const sheetId of sortConnectSheetIds(dataSheets)) {
    const sheet = dataSheets[sheetId];
    if (!sheet) continue;
    const cards = Array.isArray(sheet.requestCards) ? sheet.requestCards.filter((c) => c?.id) : [];
    const rowCount = Array.isArray(sheet.data) ? sheet.data.length : 0;
    if (rowCount === 0 && cards.length === 0) continue;
    out.push({ sheetId, sheet, cards, rowCount });
  }
  return out;
}

export function integrationLabelFromLake(lake) {
  const key = String(lake || "").toLowerCase();
  if (key === "kalshi") return "Kalshi Historical";
  if (key === "polymarket") return "Polymarket Historical";
  return key ? `${key.charAt(0).toUpperCase()}${key.slice(1)}` : "Data Lake";
}

export function requestCardSummaryLabel(card, sheet) {
  const prov = sheet?.provenance;
  const lake = prov?.lake || card?.lake;
  const table = prov?.table || card?.table;
  const integration = integrationLabelFromLake(lake);
  if (table) return `${integration} · ${table}`;
  return integration;
}
