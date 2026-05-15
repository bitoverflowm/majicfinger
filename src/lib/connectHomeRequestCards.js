/** Collect integration request summary cards from all sheets (same order as DataLakeParquetPanel). */
export function collectRequestCardEntries(dataSheets) {
  const keys = Object.keys(dataSheets || {}).sort((a, b) => {
    const na = parseInt(String(a).replace(/\D/g, ""), 10) || 0;
    const nb = parseInt(String(b).replace(/\D/g, ""), 10) || 0;
    return na - nb;
  });
  const out = [];
  for (const sheetId of keys) {
    const cards = dataSheets[sheetId]?.requestCards;
    if (!Array.isArray(cards)) continue;
    for (const card of cards) {
      out.push({ sheetId, card });
    }
  }
  return out;
}

export function fmtRequestElapsed(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n) || n < 0) return "—";
  if (n < 1000) return `${Math.round(n)}ms`;
  return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}s`;
}
