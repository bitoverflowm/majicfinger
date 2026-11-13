import { ImageResponse } from "next/og";
import { loadTraderReport, reportHeadlines, traderReport } from "@/lib/mcp/research/traderReport";

export const runtime = "nodejs";
export const maxDuration = 60;

const W = 1200;
const H = 630;
const GREEN = "#16a34a";
const RED = "#e11d48";
const INK = "#18181b";
const MUTED = "#71717a";
const TONES: Record<string, { bg: string; border: string; ink: string }> = {
  good: { bg: "#ecfdf5", border: "#a7f3d0", ink: "#047857" },
  bad: { bg: "#fff1f2", border: "#fecdd3", ink: "#be123c" },
  neutral: { bg: "#fafafa", border: "#e4e4e7", ink: INK },
};

function money(n: number | null | undefined, signed = false) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  const a = Math.abs(v);
  const s = a >= 1e6 ? `$${(a / 1e6).toFixed(1)}M` : a >= 1e3 ? `$${Math.round(a / 1e3)}K` : `$${Math.round(a)}`;
  return signed ? `${v < 0 ? "-" : "+"}${s}` : v < 0 ? `-${s}` : s;
}

function clip(s: string, n: number) {
  const t = String(s || "").trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([p.catch(() => null), new Promise<null>((r) => setTimeout(() => r(null), ms))]);
}

function sparkline(points: number[], w: number, h: number) {
  if (points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  return points
    .map((v, i) => `${i ? "L" : "M"}${((i / (points.length - 1)) * w).toFixed(1)},${(h - ((v - min) / span) * h).toFixed(1)}`)
    .join(" ");
}

/** Share card for a Jarvis ultra deep dive: the headline reads as tiles. Uses the saved report when there is one. */
export async function GET(req: Request, { params }: { params: { wallet: string } }) {
  const wallet = String(params.wallet || "").toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(wallet)) return new Response("bad wallet", { status: 400 });

  const [report, logo] = await Promise.all([
    withTimeout(
      loadTraderReport(wallet).then((saved) => saved || traderReport(wallet)),
      40000,
    ),
    withTimeout(
      fetch(new URL("/logo.png", req.url)).then(async (r) =>
        r.ok ? `data:image/png;base64,${Buffer.from(await r.arrayBuffer()).toString("base64")}` : null,
      ),
      3000,
    ),
  ]);

  const name = clip(report?.name || `${wallet.slice(0, 6)}…${wallet.slice(-4)}`, 32);
  const o = report?.overall || {};
  const tiles = report ? reportHeadlines(report).slice(0, 6) : [];
  const series = (report?.insights?.current_form?.series || []).map((p: any) => Number(p.v)).filter(Number.isFinite);
  const every = Math.max(1, Math.ceil(series.length / 240));
  const line = sparkline(
    series.filter((_: number, i: number) => i % every === 0 || i === series.length - 1),
    380,
    70,
  );
  const up = !(Number(o.lifetime_pnl_usdc) < 0);

  return new ImageResponse(
    (
      <div style={{ width: W, height: H, display: "flex", background: "#f4f3f1", fontFamily: "sans-serif", color: INK }}>
        <div style={{ width: 440, display: "flex", flexDirection: "column", padding: "52px 0 44px 60px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {logo ? <img src={logo} width={44} height={44} style={{ borderRadius: 10 }} /> : null}
            <div style={{ fontSize: 30, fontWeight: 600 }}>Lychee</div>
          </div>
          <div style={{ marginTop: 44, fontSize: 18, letterSpacing: 3, color: MUTED }}>JARVIS · ULTRA DEEP DIVE</div>
          <div style={{ marginTop: 12, fontSize: name.length > 18 ? 44 : 56, fontWeight: 700, lineHeight: 1.06 }}>{name}</div>
          <div style={{ marginTop: 10, fontSize: 20, color: MUTED }}>{`${wallet.slice(0, 6)}…${wallet.slice(-4)} · Polymarket`}</div>
          <div style={{ marginTop: 28, display: "flex", alignItems: "baseline", gap: 14 }}>
            <div style={{ fontSize: 46, fontWeight: 700, color: up ? GREEN : RED }}>{money(o.lifetime_pnl_usdc, true)}</div>
            <div style={{ fontSize: 20, color: MUTED }}>lifetime</div>
          </div>
          <div style={{ marginTop: 6, fontSize: 20, color: MUTED }}>
            {[o.volume_usdc ? `${money(o.volume_usdc)} volume` : null, o.trade_count ? `${Number(o.trade_count).toLocaleString("en-US")} trades` : null]
              .filter(Boolean)
              .join(" · ")}
          </div>
          {line ? (
            <svg width={380} height={70} viewBox="0 0 380 70" style={{ marginTop: 22 }}>
              <path d={line} fill="none" stroke={up ? GREEN : RED} strokeWidth="3" />
            </svg>
          ) : null}
          <div style={{ marginTop: "auto", fontSize: 17, letterSpacing: 3, color: "#3f3f46" }}>EDGE. STYLE. BOOK. CROWD.</div>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "52px 56px 44px 20px" }}>
          <div style={{ fontSize: 22, fontWeight: 600, marginBottom: 18 }}>What stands out</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
            {(tiles.length ? tiles : [{ label: "Report", value: "Building…", tone: "neutral" }]).map((t) => {
              const c = TONES[t.tone] || TONES.neutral;
              return (
                <div
                  key={t.label}
                  style={{
                    width: 330,
                    height: 128,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    padding: "0 22px",
                    borderRadius: 16,
                    background: c.bg,
                    border: `2px solid ${c.border}`,
                  }}
                >
                  <div style={{ fontSize: 18, color: MUTED }}>{clip(t.label, 30)}</div>
                  <div style={{ marginTop: 8, fontSize: t.value.length > 18 ? 26 : 32, fontWeight: 700, color: c.ink }}>{clip(t.value, 26)}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      headers: { "Cache-Control": "public, max-age=600, s-maxage=3600, stale-while-revalidate=86400" },
    },
  );
}
