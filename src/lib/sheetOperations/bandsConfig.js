/**
 * Research-tool Bands config (custom mutually exclusive ranges).
 * Prefer Athena CASE + GROUP BY via compileBandsConfigToCompose when possible;
 * otherwise applied as a post-pull pass (live paths / unsupported aggs).
 */

const DEFAULT_AGGREGATIONS = [
  {
    id: "band-agg-1",
    type: "count",
    valueColumn: "",
    weightColumn: "",
    denominatorColumn: "",
    outputColumn: "count",
    filterEnabled: false,
    filterColumn: "",
    filterOperator: "=",
    filterValue: "",
  },
];

/** @typedef {'eq' | 'lt' | 'lte' | 'gt' | 'gte' | 'between'} BandPredicateKind */

export const BAND_PREDICATE_KINDS = [
  { value: "eq", label: "=" },
  { value: "lt", label: "<" },
  { value: "lte", label: "≤" },
  { value: "gt", label: ">" },
  { value: "gte", label: "≥" },
  { value: "between", label: "x … y (range)" },
];

function newId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function normalizeAggregations(aggregations) {
  return (Array.isArray(aggregations) ? aggregations : []).map((agg, idx) => ({
    id: agg?.id || `band-agg-${idx}`,
    type: agg?.type || "count",
    valueColumn: agg?.valueColumn || "",
    weightColumn: agg?.weightColumn || "",
    denominatorColumn: agg?.denominatorColumn || "",
    outputColumn: String(agg?.outputColumn || "").trim(),
    filterEnabled: !!agg?.filterEnabled,
    filterColumn: agg?.filterColumn || "",
    filterOperator: agg?.filterOperator || "=",
    filterValue: agg?.filterValue ?? "",
  }));
}

function normalizeRowFilters(filters) {
  return (Array.isArray(filters) ? filters : [])
    .map((f, idx) => {
      if (!f || typeof f !== "object") return null;
      const column = String(f.column || "").trim();
      if (!column) return null;
      return {
        id: f.id || `band-filter-${idx}`,
        column,
        operator: f.operator || "=",
        value: f.value ?? "",
      };
    })
    .filter(Boolean);
}

function normalizeBands(bands) {
  return (Array.isArray(bands) ? bands : []).map((b, idx) => ({
    id: b?.id || `band-${idx}`,
    label: String(b?.label || "").trim(),
    kind: BAND_PREDICATE_KINDS.some((k) => k.value === b?.kind) ? b.kind : "between",
    value: b?.value != null ? String(b.value) : "",
    min: b?.min != null ? String(b.min) : "",
    max: b?.max != null ? String(b.max) : "",
    minInclusive: b?.minInclusive !== false,
    maxInclusive: b?.maxInclusive === true,
  }));
}

/**
 * @param {string} [sheetName]
 */
export function createEmptyBandsConfig(sheetName = "Banded sheet") {
  const id = newId("bands");
  return {
    id,
    bandColumn: "",
    bandOutputColumn: "band",
    sheetName: String(sheetName || "").trim(),
    rowFilters: [],
    bands: [createEmptyBandDefinition()],
    groupByColumns: [],
    passthroughColumns: [],
    aggregations: DEFAULT_AGGREGATIONS.map((agg) => ({ ...agg, id: `band-agg-${id}` })),
  };
}

export function createEmptyBandDefinition() {
  return {
    id: newId("band"),
    label: "",
    kind: "between",
    value: "",
    min: "",
    max: "",
    minInclusive: true,
    maxInclusive: false,
  };
}

/**
 * @param {unknown} raw
 */
export function normalizeBandsConfig(raw) {
  if (!raw || typeof raw !== "object") return createEmptyBandsConfig();
  const aggregations = normalizeAggregations(raw.aggregations);
  return {
    id: raw.id || newId("bands"),
    bandColumn: String(raw.bandColumn || "").trim(),
    bandOutputColumn: String(raw.bandOutputColumn || "band").trim() || "band",
    sheetName: String(raw.sheetName || "").trim(),
    rowFilters: normalizeRowFilters(raw.rowFilters),
    bands: normalizeBands(raw.bands).length
      ? normalizeBands(raw.bands)
      : [createEmptyBandDefinition()],
    groupByColumns: (Array.isArray(raw.groupByColumns) ? raw.groupByColumns : [])
      .map((c) => String(c || "").trim())
      .filter(Boolean),
    passthroughColumns: Array.isArray(raw.passthroughColumns)
      ? raw.passthroughColumns.map((c) => String(c || "").trim()).filter(Boolean)
      : [],
    aggregations: aggregations.length
      ? aggregations
      : DEFAULT_AGGREGATIONS.map((agg) => ({ ...agg, id: newId("band-agg") })),
  };
}

/** Human-readable label for a band predicate (used when label is empty). */
export function formatBandPredicateLabel(band, column = "value") {
  const col = String(column || "value").trim() || "value";
  const kind = band?.kind || "between";
  if (kind === "eq") return `${col} = ${band.value ?? ""}`.trim();
  if (kind === "lt") return `${col} < ${band.value ?? ""}`.trim();
  if (kind === "lte") return `${col} ≤ ${band.value ?? ""}`.trim();
  if (kind === "gt") return `${col} > ${band.value ?? ""}`.trim();
  if (kind === "gte") return `${col} ≥ ${band.value ?? ""}`.trim();
  const lo = band?.minInclusive !== false ? "≥" : ">";
  const hi = band?.maxInclusive === true ? "≤" : "<";
  return `${band?.min ?? ""} ${lo} ${col} ${hi} ${band?.max ?? ""}`.trim();
}

/**
 * Example volume bands from the product brief (mutually exclusive).
 * @param {string} [column]
 */
export function createVolumeBandPresets(column = "volume") {
  const col = column || "volume";
  return [
    { id: newId("band"), label: `${col} = 0`, kind: "eq", value: "0", min: "", max: "", minInclusive: true, maxInclusive: false },
    {
      id: newId("band"),
      label: `0 < ${col} < 10,000`,
      kind: "between",
      value: "",
      min: "0",
      max: "10000",
      minInclusive: false,
      maxInclusive: false,
    },
    {
      id: newId("band"),
      label: `10,000 ≤ ${col} < 100,000`,
      kind: "between",
      value: "",
      min: "10000",
      max: "100000",
      minInclusive: true,
      maxInclusive: false,
    },
    {
      id: newId("band"),
      label: `100,000 ≤ ${col} < 1,000,000`,
      kind: "between",
      value: "",
      min: "100000",
      max: "1000000",
      minInclusive: true,
      maxInclusive: false,
    },
    {
      id: newId("band"),
      label: `1,000,000 ≤ ${col} < 10,000,000`,
      kind: "between",
      value: "",
      min: "1000000",
      max: "10000000",
      minInclusive: true,
      maxInclusive: false,
    },
    {
      id: newId("band"),
      label: `10,000,000 ≤ ${col} < 100,000,000`,
      kind: "between",
      value: "",
      min: "10000000",
      max: "100000000",
      minInclusive: true,
      maxInclusive: false,
    },
    {
      id: newId("band"),
      label: `${col} ≥ 100,000,000`,
      kind: "gte",
      value: "100000000",
      min: "",
      max: "",
      minInclusive: true,
      maxInclusive: false,
    },
  ];
}
