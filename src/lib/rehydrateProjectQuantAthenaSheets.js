import { rehydrateQuantAthenaSheetAsync } from "@/lib/dataLake/rehydrateQuantAthenaSheet";
import { sheetNeedsQuantAthenaReplay } from "@/lib/projectPersistence";

function sheetIdSortKey(id) {
  return parseInt(String(id).replace(/\D/g, ""), 10) || 0;
}

/** Quant sheets after their source compose sheet has been rehydrated. */
export function orderQuantAthenaSheetsForReplay(dataSheets) {
  const ids = Object.keys(dataSheets || {}).filter((id) => sheetNeedsQuantAthenaReplay(dataSheets[id]));
  return ids.sort((a, b) => sheetIdSortKey(a) - sheetIdSortKey(b));
}

/**
 * @param {Record<string, object>} dataSheets
 * @param {{ onSheetDone?: (sheetId: string, updated: object, allSheets: Record<string, object>) => void }} [hooks]
 */
export async function rehydrateProjectQuantAthenaSheets(dataSheets, hooks = {}) {
  const base = dataSheets && typeof dataSheets === "object" ? { ...dataSheets } : {};
  const order = orderQuantAthenaSheetsForReplay(base);

  for (const sheetId of order) {
    const sheet = base[sheetId];
    if (!sheet) continue;
    try {
      const { rows, json } = await rehydrateQuantAthenaSheetAsync({
        sheet,
        sheetId,
        dataSheets: base,
      });
      const fullRowCount = Math.max(
        rows.length,
        Math.floor(Number(json?.rowCount) || 0),
        Math.floor(Number(sheet?.fullRowCount) || 0),
      );
      const updated = {
        ...sheet,
        data: rows,
        storageMode: "inline",
        rehydrationStatus: "complete",
        rowCount: rows.length,
        fullRowCount,
        saveMeta: {
          ...(sheet.saveMeta || {}),
          recipeOnly: true,
          persistRows: false,
          fullRowCount,
          rehydratedAt: new Date().toISOString(),
        },
      };
      base[sheetId] = updated;
      hooks.onSheetDone?.(sheetId, updated, { ...base });
    } catch (err) {
      console.warn(`[rehydrateProjectQuantAthenaSheets] ${sheetId}:`, err?.message || err);
    }
  }

  return base;
}
