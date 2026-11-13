/** Number formats shared by reply facts, so the writer quotes numbers rather than computing them. */

export function cents(price) {
  if (price == null || !Number.isFinite(Number(price))) return null;
  const n = Number(price);
  const p = n > 1.5 ? n : n * 100;
  if (p > 0 && p < 0.5) return "<1";
  if (p < 100 && p > 99.5) return ">99";
  return Math.round(p);
}

/** Entry price to a tenth of a cent, so "87.5¢" can be seen to match a post's "87c". */
export function entryCents(price) {
  const p = Number(price) * 100;
  if (!Number.isFinite(p)) return "?";
  const r = Math.round(p * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

export function money(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return null;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${Math.round(v / 1e3)}K`;
  return `$${Math.round(v)}`;
}

export function signedMoney(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || Math.abs(v) < 1) return "$0";
  return `${v < 0 ? "-" : "+"}${money(Math.abs(v))}`;
}

export function pct(rate) {
  return rate == null || !Number.isFinite(Number(rate)) ? null : `${Math.round(Number(rate) * 100)}%`;
}

export function shares(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return null;
  return v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${Math.round(v / 1e3)}K` : String(Math.round(v));
}
