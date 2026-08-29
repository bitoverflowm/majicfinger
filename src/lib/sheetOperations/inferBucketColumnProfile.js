import { niceBucketSize } from "@/lib/sheetOperations/niceBucketSize";

/**
 * Infer bucket style hints from a schema type string (compose-time) or leave
 * all modes available when type is unknown.
 *
 * @param {string | null | undefined} type
 * @returns {{ isNumeric: boolean; isTemporal: boolean; min: number | null; max: number | null; suggestedSize: number }}
 */
export function inferBucketColumnProfileFromType(type) {
  const t = String(type || "")
    .trim()
    .toLowerCase();
  const isTemporal =
    t.includes("timestamp") ||
    t.includes("datetime") ||
    t === "date" ||
    t === "time";
  const isNumeric =
    !isTemporal &&
    (t.includes("double") ||
      t.includes("float") ||
      t.includes("decimal") ||
      t.includes("numeric") ||
      t.includes("int") ||
      t.includes("bigint") ||
      t.includes("smallint") ||
      t.includes("real") ||
      t === "number");
  return {
    isNumeric,
    isTemporal,
    min: null,
    max: null,
    suggestedSize: niceBucketSize(1),
  };
}
