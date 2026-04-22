const SCOPED_SEP = "::";

/**
 * Line chart Y keys may be scoped as `sheet-1::ColumnName`. UI should show `ColumnName` only.
 */
export function stripSheetScopedColumnKey(key) {
  const s = String(key ?? "").trim();
  if (!s) return s;
  const i = s.indexOf(SCOPED_SEP);
  if (i <= 0 || i >= s.length - SCOPED_SEP.length) return s;
  const tail = s.slice(i + SCOPED_SEP.length).trim();
  return tail || s;
}
