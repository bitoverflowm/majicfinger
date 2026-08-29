/** Round a numeric bucket width to a human-friendly step size. */
export function niceBucketSize(rawSize) {
  const n = Number(rawSize);
  if (!Number.isFinite(n) || n <= 0) return 1;
  const exp = Math.floor(Math.log10(n));
  const mag = 10 ** exp;
  const norm = n / mag;
  if (norm < 1.5) return 1 * mag;
  if (norm < 3) return 2 * mag;
  if (norm < 7) return 5 * mag;
  return 10 * mag;
}
