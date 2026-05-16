/** UI-only labels for compose columns (SQL still uses `column` + `alias`). */

export function composeColumnDisplayLabel(item, fallbackLabel = "") {
  const custom = item?.displayName?.trim();
  if (custom) return custom;
  return fallbackLabel || item?.column || "";
}

/** Map grid/chart field keys → header labels from compose rows. */
export function composeFieldDisplayNameMap(items) {
  const map = {};
  for (const item of items || []) {
    const field = String(item?.alias || item?.column || "").trim();
    const label = item?.displayName?.trim();
    if (field && label) map[field] = label;
  }
  return map;
}
