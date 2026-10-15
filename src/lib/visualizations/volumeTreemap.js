import { sheetRecords } from "@/lib/visualizations/datasetDescriptor";
import { parseVisualNumber } from "@/lib/visualizations/visualTable";

function text(record, ...keys) {
  for (const key of keys) {
    if (!key) continue;
    const value = record?.[key];
    if (value != null && String(value).trim() !== "") return String(value).trim();
  }
  return "";
}

/**
 * Tiles for a list of markets or events. Area is 24h volume, then total volume.
 * @param {object | null | undefined} sheet
 * @param {object | null | undefined} dataset
 */
export function volumeTreemapModel(sheet, dataset) {
  const fields = dataset?.fields || {};
  const records = sheetRecords(sheet);
  const tiles = [];
  records.forEach((record, index) => {
    const volume = parseVisualNumber(record?.[fields.value]) ?? parseVisualNumber(record?.volume24hr) ?? parseVisualNumber(record?.volume);
    if (volume == null || volume <= 0) return;
    const label = text(record, fields.label, "question", "title", "slug") || "Market";
    tiles.push({ row: index, label, value: volume });
  });
  tiles.sort((a, b) => b.value - a.value);
  const max = tiles[0]?.value || 1;
  return { tiles, max };
}
