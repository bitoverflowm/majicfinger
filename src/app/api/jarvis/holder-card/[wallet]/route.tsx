import { ImageResponse } from "next/og";
import { getPolymarketTrader } from "@/lib/mcp/data/providers";
import { getLycheeSkillScore } from "@/lib/mcp/data/traderScoreMcp";

export const runtime = "nodejs";
export const maxDuration = 30;

const W = 1200;
const H = 630;
const GREEN = "#16a34a";
const RED = "#e11d48";
const INK = "#18181b";
const MUTED = "#71717a";

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

/** PnL curve as an SVG polyline path inside a w×h box. */
function curve(points: number[], w: number, h: number) {
  if (points.length < 2) return null;
  const min = Math.min(...points, 0);
  const max = Math.max(...points, 0);
  const span = max - min || 1;
  const xy = points.map((v, i) => [(i / (points.length - 1)) * w, h - ((v - min) / span) * h]);
  return {
    line: xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" "),
    zeroY: h - ((0 - min) / span) * h,
  };
}

function tierColor(score: number | null) {
  if (score == null) return MUTED;
  if (score >= 10) return "#10b981";
  if (score >= 0) return "#84cc16";
  if (score >= -10) return "#f59e0b";
  return RED;
}

/** Social card for one Polymarket wallet, drawn like the Holder Terminal. `?market=` pins that position first. */
export async function GET(req: Request, { params }: { params: { wallet: string } }) {
  const wallet = String(params.wallet || "").toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(wallet)) return new Response("bad wallet", { status: 400 });
  const market = new URL(req.url).searchParams.get("market")?.toLowerCase() || "";

  const [trader, skill, logo] = await Promise.all([
    withTimeout(getPolymarketTrader(wallet, { limit: 50 }), 12000),
    withTimeout(getLycheeSkillScore(wallet), 8000),
    withTimeout(
      fetch(new URL("/logo.png", req.url)).then(async (r) =>
        r.ok ? `data:image/png;base64,${Buffer.from(await r.arrayBuffer()).toString("base64")}` : null,
      ),
      3000,
    ),
  ]);

  const positions: any[] = (trader?.positions || []).filter((p: any) => Number(p.current_value) > 0);
  positions.sort((a, b) => Number(b.current_value) - Number(a.current_value));
  const pinned = market ? positions.find((p) => String(p.condition_id).toLowerCase() === market) : null;
  const rows = [pinned, ...positions.filter((p) => p !== pinned)].filter(Boolean).slice(0, 4);
  const name = clip(
    rows[0]?.name || trader?.activity?.[0]?.name || trader?.activity?.[0]?.pseudonym || `${wallet.slice(0, 6)}…${wallet.slice(-4)}`,
    40,
  );
  const series = (trader?.pnl || []).map((p: any) => Number(p.economic_pnl)).filter((n: number) => Number.isFinite(n));
  const lifetime = Number(trader?.pnl_summary?.economic_pnl);
  const value = Number(trader?.portfolio_value?.data?.value ?? trader?.portfolio_value?.value);
  const score = skill?.score != null ? Math.round(Number(skill.score)) : null;
  const chart = curve(series.slice(-180), 560, 150);
  const up = !Number.isFinite(lifetime) || lifetime >= 0;

  return new ImageResponse(
    (
      <div style={{ width: W, height: H, display: "flex", background: "#f4f3f1", fontFamily: "sans-serif", color: INK }}>
        <div style={{ width: 470, display: "flex", flexDirection: "column", padding: "56px 0 48px 64px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {logo ? <img src={logo} width={44} height={44} style={{ borderRadius: 10 }} /> : null}
            <div style={{ fontSize: 30, fontWeight: 600 }}>Lychee</div>
          </div>
          <div style={{ marginTop: 52, fontSize: 18, letterSpacing: 3, color: MUTED }}>HOLDER TERMINAL</div>
          <div style={{ marginTop: 14, fontSize: name.length > 22 ? 44 : 54, fontWeight: 700, lineHeight: 1.08 }}>{name}</div>
          <div style={{ marginTop: 10, fontSize: 20, color: MUTED }}>{`${wallet.slice(0, 6)}…${wallet.slice(-4)} · Polymarket`}</div>
          <div style={{ marginTop: 34, display: "flex", flexDirection: "column", gap: 14 }}>
            <Stat label="Lifetime PnL" value={money(lifetime, true)} color={up ? GREEN : RED} />
            <Stat label="Portfolio" value={money(value)} color={INK} />
            <Stat label="Skill Score" value={score == null ? "—" : `${score > 0 ? "+" : ""}${score}`} color={tierColor(score)} />
          </div>
          <div style={{ marginTop: "auto", fontSize: 17, letterSpacing: 3, color: "#3f3f46" }}>MARKETS. HOLDERS. TRADERS.</div>
        </div>

        <div
          style={{
            marginTop: 64,
            width: 660,
            height: 620,
            display: "flex",
            flexDirection: "column",
            background: "#fff",
            borderRadius: 18,
            border: "1px solid #e4e4e7",
            boxShadow: "0 20px 50px rgba(0,0,0,0.10)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "16px 22px", borderBottom: "1px solid #f0f0f0" }}>
            {["#f87171", "#fbbf24", "#4ade80"].map((c) => (
              <div key={c} style={{ width: 12, height: 12, borderRadius: 6, background: c }} />
            ))}
            <div style={{ marginLeft: 16, fontSize: 16, color: MUTED }}>{`Holder Terminal · ${clip(name, 30)}`}</div>
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, fontSize: 15, color: INK }}>
              <div style={{ width: 8, height: 8, borderRadius: 4, background: GREEN }} />
              Live
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", padding: "18px 26px 0" }}>
            <div style={{ fontSize: 21, fontWeight: 600 }}>PnL over time</div>
            <div style={{ marginTop: 12, height: 160, display: "flex", border: "1px solid #f0f0f0", borderRadius: 10, padding: 5 }}>
              {chart ? (
                <svg width={598} height={150} viewBox="0 0 560 150" preserveAspectRatio="none">
                  <line x1="0" x2="560" y1={chart.zeroY} y2={chart.zeroY} stroke="#e4e4e7" strokeDasharray="4 4" />
                  <path d={chart.line} fill="none" stroke={up ? GREEN : RED} strokeWidth="3" />
                </svg>
              ) : (
                <div style={{ margin: "auto", color: MUTED, fontSize: 18 }}>No PnL history yet</div>
              )}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", padding: "16px 26px 0" }}>
            <div style={{ fontSize: 15, letterSpacing: 2, color: MUTED }}>TOP POSITIONS</div>
            {rows.length ? (
              rows.map((p: any, i: number) => (
                <div
                  key={i}
                  style={{
                    marginTop: 8,
                    display: "flex",
                    alignItems: "center",
                    padding: "8px 12px",
                    borderRadius: 10,
                    border: p === pinned ? "2px solid #f59e0b" : "1px solid #f0f0f0",
                    background: p === pinned ? "#fffbeb" : "#fff",
                  }}
                >
                  <div style={{ width: 330, fontSize: 16 }}>{clip(p.title, 40)}</div>
                  <div
                    style={{
                      width: 56,
                      fontSize: 14,
                      fontWeight: 600,
                      color: /^no$/i.test(p.outcome) ? RED : /^yes$/i.test(p.outcome) ? GREEN : INK,
                    }}
                  >
                    {clip(String(p.outcome || ""), 8)}
                  </div>
                  <div style={{ width: 80, fontSize: 16, display: "flex", justifyContent: "flex-end" }}>{money(p.current_value)}</div>
                  <div
                    style={{
                      width: 90,
                      fontSize: 16,
                      display: "flex",
                      justifyContent: "flex-end",
                      color: Number(p.total_pnl) >= 0 ? GREEN : RED,
                    }}
                  >
                    {money(p.total_pnl, true)}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ marginTop: 10, fontSize: 16, color: MUTED }}>No open positions</div>
            )}
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

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
      <div style={{ width: 150, fontSize: 20, color: MUTED }}>{label}</div>
      <div style={{ fontSize: 34, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}
