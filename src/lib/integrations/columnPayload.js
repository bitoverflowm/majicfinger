/**
 * Column checkboxes choose which fields a sheet shows.
 * A pull keeps every field the endpoint returned. A blank cell means the
 * payload had that field empty, or the field was not in the payload at all.
 */

export function cellValue(value) {
  if (value == null) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return value;
}

/** Read one catalog field from a raw record. `present` is false when the payload omitted the key. */
export function readColumnValue(source, columnId) {
  const id = String(columnId || "");
  if (!source || typeof source !== "object" || !id) return { present: false, value: "" };
  const bare = id.includes(":") ? id.split(":").pop() : id;
  const key = Object.prototype.hasOwnProperty.call(source, id)
    ? id
    : bare && Object.prototype.hasOwnProperty.call(source, bare)
      ? bare
      : "";
  if (!key) return { present: false, value: "" };
  return { present: true, value: cellValue(source[key]) };
}

/**
 * Copy catalog fields that the payload actually included.
 * Omitted keys stay off the row so a later check can tell "not pulled" from "pulled empty".
 */
export function projectAllColumns(records, columns) {
  const present = new Set();
  const rows = (Array.isArray(records) ? records : []).map((record) => {
    const out = {};
    for (const column of columns || []) {
      const read = readColumnValue(record, column?.id);
      if (!read.present) continue;
      present.add(column.id);
      out[column.id] = read.value;
    }
    return out;
  });
  return { rows, presentColumnIds: [...present] };
}

/**
 * One sheet row from a raw record.
 * `columns` is that endpoint's catalog (`{ id }` or `{ name }`).
 * Checkbox selection is ignored: a field stays off the row only when the payload omitted it.
 */
export function projectCatalogRow(source, columns) {
  const catalog = (columns || [])
    .map((column) => ({ id: column?.id || column?.name || "" }))
    .filter((column) => column.id);
  return projectAllColumns([source], catalog).rows[0] || {};
}

/** True when no row carries this field. An empty string still counts as pulled. */
export function columnMissingFromRows(rows, columnId) {
  const id = String(columnId || "");
  const list = Array.isArray(rows) ? rows : [];
  if (!id || !list.length) return false;
  return !list.some((row) => row && Object.prototype.hasOwnProperty.call(row, id));
}
