const DISPLAY_TZ = "America/New_York";

export function formatCents(price: number | null | undefined) {
  if (price == null || !Number.isFinite(Number(price))) return "—";
  const n = Number(price);
  return `${Math.round(n * 100)}¢`;
}

export function formatMove(move: number | null | undefined) {
  if (move == null || !Number.isFinite(Number(move))) return null;
  const n = Number(move);
  const cents = Math.round(n * 100);
  const sign = cents > 0 ? "+" : "";
  return `${sign}${cents}¢`;
}

export function formatWhen(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
    timeZone: DISPLAY_TZ,
  }).format(d);
}

export function formatAge(iso: string | null | undefined, now = Date.now()) {
  const t = Date.parse(String(iso || ""));
  if (!Number.isFinite(t)) return null;
  const sec = Math.max(0, Math.round((now - t) / 1000));
  if (sec < 45) return "just now";
  if (sec < 90) return "1 min ago";
  if (sec < 3600) return `${Math.round(sec / 60)} min ago`;
  if (sec < 5400) return "1 hr ago";
  if (sec < 86400) return `${Math.round(sec / 3600)} hr ago`;
  return `${Math.round(sec / 86400)}d ago`;
}

export function venueLabel(venue: string | null | undefined) {
  const v = String(venue || "").toLowerCase();
  if (v === "kalshi") return "Kalshi";
  if (v === "polymarket") return "Polymarket";
  if (v === "nws") return "NWS";
  return venue || "Source";
}

export function signalKindLabel(kind: string | null | undefined) {
  switch (kind) {
    case "observation":
      return "Observation";
    case "forecast":
      return "Forecast";
    case "settlement":
      return "Settlement";
    case "fill":
      return "Fill";
    case "quote":
      return "Quote";
    case "headline":
      return "Headline";
    case "attribution":
      return "Wallet";
    default:
      return kind || "Signal";
  }
}
