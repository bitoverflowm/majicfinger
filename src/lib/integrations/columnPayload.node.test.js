import {
  columnMissingFromRows,
  projectAllColumns,
  readColumnValue,
} from "./columnPayload.js";

const columns = [
  { id: "title" },
  { id: "subtitle" },
  { id: "volume" },
];

const packed = projectAllColumns(
  [
    { title: "Election", volume: 12, extra: "keep-out" },
    { title: "", subtitle: null, volume: 0 },
  ],
  columns,
);

if (!packed.presentColumnIds.includes("title") || !packed.presentColumnIds.includes("volume") || !packed.presentColumnIds.includes("subtitle")) {
  throw new Error(`present columns ${packed.presentColumnIds.join(",")}`);
}
if ("subtitle" in packed.rows[0]) throw new Error("omitted subtitle was written onto the first row");
if (packed.rows[1].subtitle !== "") throw new Error("null subtitle should be an empty pulled value");
if (packed.rows[1].volume !== 0) throw new Error("zero should stay");
if ("extra" in packed.rows[0]) throw new Error("non-catalog fields stay off the sheet row");

const missing = columnMissingFromRows([{ title: "Election" }], "subtitle");
const presentEmpty = columnMissingFromRows([{ subtitle: "" }], "subtitle");
if (!missing) throw new Error("absent key should count as not pulled");
if (presentEmpty) throw new Error("empty string should count as pulled");
if (columnMissingFromRows([], "subtitle")) throw new Error("no rows is not a missing column");

const nested = readColumnValue({ startDate: "2025-01-01" }, "event:startDate");
if (!nested.present || nested.value !== "2025-01-01") throw new Error("prefixed column ids should read the bare field");

console.log("column payload ok");
