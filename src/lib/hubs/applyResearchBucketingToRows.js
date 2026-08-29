import { aggregateBandRows } from "@/lib/sheetOperations/aggregateBandRows";
import { aggregateBucketRows } from "@/lib/sheetOperations/aggregateBucketRows";
import { bucketRowsConfigFromTab } from "@/lib/bucketSheetTabs";
import { normalizeBandsConfig } from "@/lib/sheetOperations/bandsConfig";

/**
 * Apply research-tool Buckets or Bands to pulled rows.
 *
 * @param {object[]} rows
 * @param {object | null | undefined} bucketConfig
 * @returns {{ rows: object[]; applied: boolean; mode: 'buckets' | 'bands' | null; sheetName: string }}
 */
export function applyResearchBucketingToRows(rows, bucketConfig) {
  const source = Array.isArray(rows) ? rows : [];
  if (!bucketConfig || typeof bucketConfig !== "object") {
    return { rows: source, applied: false, mode: null, sheetName: "" };
  }

  if (bucketConfig.activeMode === "bands") {
    const bandsConfig = normalizeBandsConfig(bucketConfig.bandsConfig);
    if (!String(bandsConfig.bandColumn || "").trim()) {
      return { rows: source, applied: false, mode: null, sheetName: "" };
    }
    const out = aggregateBandRows(source, bandsConfig);
    return {
      rows: out,
      applied: true,
      mode: "bands",
      sheetName: String(bandsConfig.sheetName || bucketConfig.sheetName || "").trim(),
    };
  }

  if (!String(bucketConfig.bucketColumn || "").trim()) {
    return { rows: source, applied: false, mode: null, sheetName: "" };
  }
  const out = aggregateBucketRows(source, bucketRowsConfigFromTab(bucketConfig));
  return {
    rows: out,
    applied: true,
    mode: "buckets",
    sheetName: String(bucketConfig.sheetName || "").trim(),
  };
}
