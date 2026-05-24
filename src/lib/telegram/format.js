/** @param {number} n */
export function ordinal(n) {
  const num = Number(n);
  if (!Number.isFinite(num) || num < 1) return String(n);
  const mod100 = num % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${num}th`;
  switch (num % 10) {
    case 1:
      return `${num}st`;
    case 2:
      return `${num}nd`;
    case 3:
      return `${num}rd`;
    default:
      return `${num}th`;
  }
}

/** @param {string | undefined | null} value */
export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** @param {Record<string, string | number | boolean | null | undefined>} fields */
export function formatFieldLines(fields) {
  return Object.entries(fields)
    .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== "")
    .map(([k, v]) => `<b>${escapeHtml(k)}:</b> ${escapeHtml(String(v))}`)
    .join("\n");
}
