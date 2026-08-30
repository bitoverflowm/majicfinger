import { aggregateBandRows, zeroFillBandAggregateRows } from "@/lib/sheetOperations/aggregateBandRows";
import { aggregateBucketRows } from "@/lib/sheetOperations/aggregateBucketRows";
import { bucketRowsConfigFromTab } from "@/lib/bucketSheetTabs";
import { normalizeBandsConfig } from "@/lib/sheetOperations/bandsConfig";

/**
 * Apply research-tool Buckets or Bands to pulled rows.
 *
 * When `athenaCompiled` is true, Athena already ran CASE+GROUP BY; only zero-fill
 * empty bands (and rename sheet) so the sheet always shows every configured band.
 *
 * @param {object[]} rows
 * @param {object | null | undefined} bucketConfig
 * @param {{ athenaCompiled?: boolean }} [opts]
 * @returns {{ rows: object[]; applied: boolean; mode: 'buckets' | 'bands' | null; sheetName: string }}
 */
export function applyResearchBucketingToRows(rows, bucketConfig, opts = {}) {
  const source = Array.isArray(rows) ? rows : [];
  if (!bucketConfig || typeof bucketConfig !== "object") {
    return { rows: source, applied: false, mode: null, sheetName: "" };
  }

  if (bucketConfig.activeMode === "bands") {
    const bandsConfig = normalizeBandsConfig(bucketConfig.bandsConfig);
    if (!String(bandsConfig.bandColumn || "").trim()) {
      return { rows: source, applied: false, mode: null, sheetName: "" };
    }
    const out = opts.athenaCompiled
      ? zeroFillBandAggregateRows(source, bandsConfig)
      : aggregateBandRows(source, bandsConfig);
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
