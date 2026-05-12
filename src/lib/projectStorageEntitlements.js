import { PROJECT_PREVIEW_ROW_LIMIT } from "@/lib/projectPersistence";
import { isOwnerFullAccessUser } from "@/lib/ownerFullAccess";

export const ADVANCED_DATA_STORAGE_ROW_LIMIT = PROJECT_PREVIEW_ROW_LIMIT;

export function estimateJsonBytes(value) {
  try {
    const text = JSON.stringify(value ?? null);
    if (typeof TextEncoder !== "undefined") {
      return new TextEncoder().encode(text).length;
    }
    return Buffer.byteLength(text, "utf8");
  } catch {
    return 0;
  }
}

function sheetRowCount(sheet) {
  const rows = Array.isArray(sheet?.data) ? sheet.data : [];
  const n = Number(sheet?.fullRowCount ?? sheet?.rowCount ?? rows.length);
  return Number.isFinite(n) ? Math.max(0, n) : rows.length;
}

function sheetEstimatedBytes(sheet) {
  const savedEstimate = Number(sheet?.saveMeta?.estimatedFullBytes);
  if (Number.isFinite(savedEstimate) && savedEstimate > 0) return savedEstimate;
  return estimateJsonBytes(Array.isArray(sheet?.data) ? sheet.data : []);
}

export function summarizeAdvancedDataStorage(dataSheets, rowLimit = ADVANCED_DATA_STORAGE_ROW_LIMIT) {
  const sheets = dataSheets && typeof dataSheets === "object" ? dataSheets : {};
  const limit = Math.max(1, Math.floor(Number(rowLimit) || ADVANCED_DATA_STORAGE_ROW_LIMIT));
  const largeSheets = Object.entries(sheets)
    .map(([sheetId, sheet]) => ({
      sheetId,
      name: String(sheet?.name || sheetId),
      rows: sheetRowCount(sheet),
      estimatedBytes: sheetEstimatedBytes(sheet),
    }))
    .filter((sheet) => sheet.rows > limit);

  const totalRows = largeSheets.reduce((sum, sheet) => sum + sheet.rows, 0);
  const totalBytes = largeSheets.reduce((sum, sheet) => sum + sheet.estimatedBytes, 0);
  const largestSheet = largeSheets.reduce((largest, sheet) => (!largest || sheet.rows > largest.rows ? sheet : largest), null);

  return {
    requiresAdvancedStorage: largeSheets.length > 0,
    rowLimit: limit,
    sheetCount: largeSheets.length,
    totalRows,
    totalBytes,
    largestSheet,
    largeSheets,
  };
}

export function userCanUseAdvancedDataStorage(userLike) {
  if (!userLike || typeof userLike !== "object") return false;
  if (isOwnerFullAccessUser(userLike)) return true;
  if (userLike.lifetimeMember) return true;
  const tier = String(userLike.subscriptionTier || "").toLowerCase();
  const status = String(userLike.subscriptionStatus || "").toLowerCase();
  return tier === "elite" && (status === "active" || status === "trialing");
}
