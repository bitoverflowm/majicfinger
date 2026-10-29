/**
 * Simpler, logo-led Open Graph directions (1200x630).
 * Prepare backgrounds first: python3 scripts/og/prepare-backgrounds.py
 * Run: node scripts/og/render-simple-og.mjs [outDir] [variantId...]
 */
import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { lycheeMarkSvg, MARK_ASPECT } from "./lychee-mark.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const require = createRequire(import.meta.url);
const React = require("react");
const { ImageResponse } = require("next/dist/compiled/@vercel/og/index.node.js");

const W = 1200;
const H = 630;
const LYCHEE = "#BA0B31";
const INK = "#0b0b0d";

const file = (p) => fs.readFileSync(path.join(root, p));
const svgUri = (svg) => `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
const bgUri = (name) => `data:image/jpeg;base64,${file(`scripts/og/backgrounds/${name}.jpg`).toString("base64")}`;
const font = (name, weight, p) => ({ name, weight, style: "normal", data: file(p) });

const h = (type, style, ...children) => React.createElement(type, { style }, ...children);
const img = (src, style) => React.createElement("img", { src, style });
const fill = { position: "absolute", left: 0, top: 0, width: W, height: H, display: "flex" };
const mono = { fontFamily: "Geist Mono" };

function Mark({ color = "#fff", height }) {
  const width = height / MARK_ASPECT;
  return img(svgUri(lycheeMarkSvg(color, { size: width, tight: true })), { width, height });
}

function Lockup({ size = 140, color = "#fff", markColor = color, shadow }) {
  return h(
    "div",
    { display: "flex", alignItems: "center", gap: size * 0.3 },
    Mark({ color: markColor, height: size * 1.08 }),
    h("div", { fontSize: size, fontWeight: 600, letterSpacing: -size * 0.045, lineHeight: 1, color, paddingBottom: size * 0.06, ...(shadow ? { textShadow: shadow } : {}) }, "Lychee"),
  );
}

function Frame(bg, ...children) {
  return h("div", { position: "relative", display: "flex", width: W, height: H, alignItems: "center", justifyContent: "center", fontFamily: "Geist", overflow: "hidden", ...bg }, ...children);
}

const centerCol = (...children) =>
  h("div", { position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: W, height: H }, ...children);

/* Wise / Revolut / Coinbase: logo on the brand colour. */
const solidRed = () =>
  Frame(
    { backgroundColor: LYCHEE },
    h("div", { ...fill, backgroundImage: "radial-gradient(ellipse at 50% 45%, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0) 60%)" }),
    centerCol(Lockup({ size: 150 })),
  );

const solidRedTagline = () =>
  Frame(
    { backgroundColor: LYCHEE },
    h("div", { ...fill, backgroundImage: "radial-gradient(ellipse at 50% 45%, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0) 60%)" }),
    centerCol(
      Lockup({ size: 132 }),
      h("div", { marginTop: 40, fontSize: 30, fontWeight: 500, letterSpacing: -0.4, color: "rgba(255,255,255,0.78)" }, "The research terminal for prediction markets"),
    ),
  );

const solidInk = () =>
  Frame(
    { backgroundColor: INK },
    h("div", { ...fill, backgroundImage: "radial-gradient(ellipse at 50% 50%, rgba(186,11,49,0.22) 0%, rgba(186,11,49,0) 55%)" }),
    centerCol(
      h(
        "div",
        { display: "flex", alignItems: "center", gap: 44 },
        h(
          "div",
          { display: "flex", alignItems: "center", justifyContent: "center", width: 150, height: 150, borderRadius: 36, backgroundColor: LYCHEE, boxShadow: "0 0 0 1px rgba(255,255,255,0.08), 0 20px 60px rgba(186,11,49,0.45)" },
          Mark({ height: 100 }),
        ),
        h("div", { fontSize: 150, fontWeight: 600, letterSpacing: -6.5, lineHeight: 1, color: "#fff", paddingBottom: 8 }, "Lychee"),
      ),
    ),
  );

/* Stripe: rich gradient art, white logo. */
const silk = () =>
  Frame(
    {},
    img(bgUri("silk"), { ...fill, objectFit: "cover" }),
    h("div", { ...fill, backgroundImage: "radial-gradient(ellipse at 50% 50%, rgba(120,0,30,0.18) 0%, rgba(120,0,30,0) 55%)" }),
    centerCol(Lockup({ size: 150, shadow: "0 4px 40px rgba(110,0,30,0.25)" })),
  );

/* Fruitful: soft painted sky, just the mark. */
const blushSkyMark = () =>
  Frame({}, img(bgUri("blush-sky"), { ...fill, objectFit: "cover" }), centerCol(Mark({ color: LYCHEE, height: 210 })));

const blushSkyLockup = () =>
  Frame({}, img(bgUri("blush-sky"), { ...fill, objectFit: "cover" }), centerCol(Lockup({ size: 140, color: LYCHEE })));

/* Parable: logo over a painted scene. */
const duskLockup = () =>
  Frame(
    {},
    img(bgUri("dusk-framed"), { ...fill, objectFit: "cover" }),
    h("div", { ...fill, backgroundImage: "radial-gradient(ellipse at 50% 50%, rgba(10,12,40,0.35) 0%, rgba(10,12,40,0) 50%)" }),
    centerCol(Lockup({ size: 140, shadow: "0 4px 40px rgba(10,10,40,0.4)" })),
  );

/* Magic Beans: headline with inline icons + product peek. */
const chartIcon = (c) =>
  svgUri(`<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><rect x="6" y="26" width="8" height="16" rx="2.5" fill="${c}"/><rect x="20" y="16" width="8" height="26" rx="2.5" fill="${c}"/><rect x="34" y="6" width="8" height="36" rx="2.5" fill="${c}"/></svg>`);
const pulseIcon = (c) =>
  svgUri(`<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><path d="M4 26h9l5-13 9 24 6-16 3 5h8" fill="none" stroke="${c}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`);

function linePath(values, w, hgt) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  return values.map((v, i) => `${i ? "L" : "M"}${((i / (values.length - 1)) * w).toFixed(1)} ${(hgt - ((v - min) / (max - min)) * hgt).toFixed(1)}`).join(" ");
}

function ProductPeek() {
  const series = [48, 47, 50, 49, 53, 52, 51, 55, 57, 56, 60, 59, 62, 64, 63, 66, 68, 67, 70];
  const chart = svgUri(`<svg xmlns="http://www.w3.org/2000/svg" width="460" height="120" viewBox="0 0 460 120">
    <defs><linearGradient id="a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f6fed" stop-opacity="0.18"/><stop offset="1" stop-color="#2f6fed" stop-opacity="0"/></linearGradient></defs>
    <path d="${linePath(series, 460, 110)} L460 120 L0 120 Z" transform="translate(0 5)" fill="url(#a)"/>
    <path d="${linePath(series, 460, 110)}" transform="translate(0 5)" fill="none" stroke="#2f6fed" stroke-width="2.4" stroke-linejoin="round"/>
  </svg>`);
  const rows = [
    ["14:02:11", "yes", "70¢", "1,200"],
    ["14:01:48", "no", "31¢", "300"],
    ["14:01:30", "yes", "69¢", "850"],
    ["14:00:57", "yes", "69¢", "2,000"],
  ];
  const label = { fontSize: 13, color: "#71717a" };
  return h(
    "div",
    { position: "absolute", left: 640, top: 92, width: 700, height: 600, display: "flex", flexDirection: "column", backgroundColor: "#fff", borderRadius: 16, border: "1px solid #e4e4e7", boxShadow: "0 24px 60px rgba(24,24,27,0.10)", overflow: "hidden" },
    h(
      "div",
      { display: "flex", alignItems: "center", gap: 8, height: 40, paddingLeft: 16, borderBottom: "1px solid #f0f0f2" },
      ...["#ef4444", "#f59e0b", "#22c55e"].map((c) => h("div", { width: 10, height: 10, borderRadius: 9999, backgroundColor: c, opacity: 0.55 })),
      h("div", { marginLeft: 12, fontSize: 13, color: "#71717a" }, "Lychee Terminal"),
    ),
    h(
      "div",
      { display: "flex", flexGrow: 1 },
      h(
        "div",
        { display: "flex", flexDirection: "column", width: 190, padding: 16, gap: 10, borderRight: "1px solid #f0f0f2", backgroundColor: "#fafafa" },
        h("div", { ...label, ...mono, fontSize: 11, letterSpacing: 1.2 }, "YOUR RESEARCH"),
        ...[["Fed cut trades", true], ["Election odds gap"], ["BTC 15-min terminal"], ["Hurricane markets"]].map(([t, active]) =>
          h("div", { display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 500, color: active ? "#18181b" : "#52525b", padding: "6px 8px", borderRadius: 8, backgroundColor: active ? "#fff" : "transparent", border: active ? "1px solid #e4e4e7" : "1px solid transparent" },
            h("div", { width: 7, height: 7, borderRadius: 9999, backgroundColor: active ? "#2f6fed" : "#d4d4d8" }), t),
        ),
      ),
      h(
        "div",
        { display: "flex", flexDirection: "column", padding: "20px 24px", gap: 14, flexGrow: 1 },
        h("div", { ...label }, "Research  /  Kalshi Historical"),
        h("div", { fontSize: 26, fontWeight: 600, letterSpacing: -0.6, color: "#18181b" }, "Fed cut trades"),
        h(
          "div",
          { display: "flex", flexDirection: "column", border: "1px solid #ececef", borderRadius: 12, padding: 16, gap: 6 },
          h("div", { ...label }, "Yes price, last 24h"),
          h("div", { display: "flex", alignItems: "baseline", gap: 10 },
            h("div", { fontSize: 30, fontWeight: 600, color: "#18181b", letterSpacing: -0.8 }, "70¢"),
            h("div", { fontSize: 14, fontWeight: 500, color: "#0f9f6e" }, "+22¢")),
          img(chart, { width: 440, height: 115 }),
        ),
        h(
          "div",
          { display: "flex", flexDirection: "column", border: "1px solid #ececef", borderRadius: 12, overflow: "hidden" },
          h("div", { display: "flex", backgroundColor: "#fafafa", borderBottom: "1px solid #ececef", padding: "8px 14px", ...mono, fontSize: 12, color: "#71717a" },
            ...["created_time", "taker_side", "yes_price", "count"].map((c) => h("div", { width: 120 }, c))),
          ...rows.map((r) =>
            h("div", { display: "flex", padding: "8px 14px", borderBottom: "1px solid #f4f4f5", ...mono, fontSize: 13, color: "#3f3f46" },
              ...r.map((c, i) => h("div", { width: 120, color: i === 1 ? (c === "yes" ? "#0f9f6e" : "#e5484d") : "#3f3f46" }, c))),
          ),
        ),
      ),
    ),
  );
}

const magicBeans = () => {
  const line = { display: "flex", alignItems: "center", gap: 14, fontSize: 54, fontWeight: 600, letterSpacing: -1.6, lineHeight: 1.18, color: "#18181b" };
  const icon = (src) => img(src, { width: 46, height: 46 });
  return Frame(
    { backgroundColor: "#f6f5f3", alignItems: "flex-start", justifyContent: "flex-start" },
    h(
      "div",
      { position: "absolute", left: 80, top: 112, display: "flex", flexDirection: "column" },
      h("div", line, "Research", icon(chartIcon("#28CC95")), "Kalshi"),
      h("div", line, "&", icon(pulseIcon("#2E5CFF")), "Polymarket"),
      h("div", line, "in one terminal"),
    ),
    h("div", { position: "absolute", left: 80, bottom: 76, display: "flex", alignItems: "center", gap: 14 },
      h("div", { display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 11, backgroundColor: LYCHEE }, Mark({ height: 28 })),
      h("div", { fontSize: 24, fontWeight: 600, letterSpacing: -0.6, color: "#18181b" }, "Lychee")),
    ProductPeek(),
  );
};

/* Ugly Cash: big type, scattered prediction-market ephemera. */
function Sticker(style, ...children) {
  return h("div", { position: "absolute", display: "flex", boxShadow: "0 10px 24px rgba(60,10,20,0.18)", ...style }, ...children);
}

const intrigue = () =>
  Frame(
    {},
    img(bgUri("blush-sky"), { ...fill, objectFit: "cover" }),
    centerCol(h("div", { fontSize: 230, fontWeight: 900, letterSpacing: -10, lineHeight: 1, color: "#16080b", paddingBottom: 10 }, "LYCHEE")),
    Sticker(
      { left: 70, top: 56, transform: "rotate(-9deg)", backgroundColor: "#28CC95", borderRadius: 10, padding: "14px 20px", flexDirection: "column", gap: 2, border: "2px dashed rgba(255,255,255,0.7)" },
      h("div", { ...mono, fontSize: 13, letterSpacing: 2, color: "rgba(255,255,255,0.85)" }, "KALSHI · FED CUT DEC"),
      h("div", { fontSize: 38, fontWeight: 900, color: "#fff", letterSpacing: -1 }, "YES 70¢"),
    ),
    Sticker(
      { right: 92, top: 48, transform: "rotate(8deg)", backgroundColor: "#d9f99d", padding: "14px 18px", flexDirection: "column", gap: 2 },
      h("div", { fontSize: 22, fontWeight: 900, color: "#1a2e05", letterSpacing: -0.4 }, "LOOK!"),
      h("div", { ...mono, fontSize: 13, color: "#1a2e05", letterSpacing: 1 }, "ODDS MOVED +22¢"),
    ),
    Sticker(
      { left: 112, bottom: 46, transform: "rotate(5deg)", backgroundColor: "#fffdf8", padding: "14px 18px", flexDirection: "column", gap: 4, width: 250 },
      h("div", { ...mono, fontSize: 12, letterSpacing: 1.5, color: "#3f3f46" }, "RECEIPT · 2,400 TRADES"),
      h("div", { ...mono, fontSize: 12, color: "#71717a" }, "KALSHI × POLYMARKET"),
      h("div", { ...mono, fontSize: 12, color: "#71717a" }, "SPREAD ............ 4¢"),
      h("div", { display: "flex", gap: 2, marginTop: 6, height: 26 }, ...Array.from({ length: 38 }, (_, i) => h("div", { width: [1, 2, 3, 1, 2][i % 5], height: "100%", backgroundColor: "#18181b" }))),
    ),
    Sticker(
      { right: 110, bottom: 70, transform: "rotate(-7deg)", backgroundColor: "#ff5c7a", borderRadius: 9999, padding: "14px 28px", alignItems: "center", gap: 10 },
      h("div", { width: 10, height: 10, borderRadius: 9999, backgroundColor: "#fff" }),
      h("div", { fontSize: 26, fontWeight: 900, color: "#fff", letterSpacing: -0.5 }, "EVERY SIGNAL."),
    ),
    Sticker(
      { left: 40, top: 300, transform: "rotate(10deg)", backgroundColor: "#2E5CFF", borderRadius: 12, padding: "10px 16px", flexDirection: "column" },
      h("div", { ...mono, fontSize: 11, letterSpacing: 1.6, color: "rgba(255,255,255,0.8)" }, "POLYMARKET"),
      h("div", { fontSize: 26, fontWeight: 900, color: "#fff" }, "54% chance"),
    ),
    Sticker(
      { right: 40, top: 280, transform: "rotate(-6deg)", backgroundColor: "#111", borderRadius: 10, padding: "10px 16px", alignItems: "center", gap: 10 },
      h("div", { width: 8, height: 8, borderRadius: 9999, backgroundColor: "#34d399" }),
      h("div", { ...mono, fontSize: 15, color: "#fff", letterSpacing: 1 }, "LIVE · BTC 15M"),
    ),
  );

/* ---------- Product clarity + intrigue, built on the brand copy ---------- */

const pngUri = (p) => `data:image/png;base64,${file(p).toString("base64")}`;
const KALSHI_GREEN = "#28CC95";
const POLY_BLUE = "#2E5CFF";
const SIGNAL_PINK = "#ff5c7a";
const PAPER = "#f6f5f3";
const KALSHI_WORDMARK = pngUri("public/kalshi.png");
const POLY_ICON = pngUri("public/polymarket.png");

const KalshiTile = (hgt) =>
  h("div", { display: "flex", alignItems: "center", justifyContent: "center", width: hgt * 1.9, height: hgt, borderRadius: hgt * 0.26, backgroundColor: KALSHI_GREEN },
    img(KALSHI_WORDMARK, { width: hgt * 1.45, height: hgt * 1.45 * (226 / 772) }));
const PolyTile = (hgt) => img(POLY_ICON, { width: hgt, height: hgt, borderRadius: hgt * 0.26 });
const SignalTile = (hgt) =>
  h("div", { display: "flex", alignItems: "center", justifyContent: "center", width: hgt, height: hgt, borderRadius: hgt * 0.26, backgroundColor: SIGNAL_PINK },
    img(pulseIcon("#fff"), { width: hgt * 0.68, height: hgt * 0.68 }));

const terminalIcon = svgUri(`<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><rect x="2" y="4" width="44" height="40" rx="10" fill="${LYCHEE}"/><path d="M13 18l7 6-7 6" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M24 31h11" stroke="#fff" stroke-width="3.6" stroke-linecap="round"/></svg>`);

function BrandRow({ spaced = false, size = 24 }) {
  return h(
    "div",
    { display: "flex", alignItems: "center", gap: 14 },
    h("div", { display: "flex", alignItems: "center", justifyContent: "center", width: size * 1.75, height: size * 1.75, borderRadius: size * 0.46, backgroundColor: LYCHEE }, Mark({ height: size * 1.12 })),
    h("div", { fontSize: size, fontWeight: 600, letterSpacing: spaced ? size * 0.28 : -size * 0.025, color: "#18181b" }, spaced ? "LYCHEE" : "Lychee"),
  );
}

function VenueRow({ size = 15 }) {
  const item = (tile, label) => h("div", { display: "flex", alignItems: "center", gap: 10 }, tile, h("div", { ...mono, fontSize: size, letterSpacing: size * 0.13, color: "#27272a" }, label));
  return h("div", { display: "flex", alignItems: "center", gap: 22 },
    item(KalshiTile(size * 1.9), "KALSHI."),
    item(PolyTile(size * 1.9), "POLYMARKET."),
    item(SignalTile(size * 1.9), "EVERY SIGNAL."));
}

function ComparePeek({ left = 664, top = 84 }) {
  const rand = (seed) => {
    let s = seed;
    return () => ((s = (s * 16807) % 2147483647) / 2147483647);
  };
  const r = rand(11);
  const n = 40;
  const kalshi = [];
  const poly = [];
  let k = 0.44;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    k += (r() - 0.45) * 0.035 + (i === 24 ? 0.09 : 0);
    k = k * 0.9 + (0.44 + t * 0.26) * 0.1;
    kalshi.push(k);
    poly.push(k - 0.035 - Math.sin(i / 4) * 0.012 - (i > 24 ? 0.015 : 0));
  }
  const cw = 420;
  const ch = 132;
  const y = (v) => (ch - ((v - 0.35) / 0.42) * ch).toFixed(1);
  const x = (i) => ((i / (n - 1)) * cw).toFixed(1);
  const path = (vals) => vals.map((v, i) => `${i ? "L" : "M"}${x(i)} ${y(v)}`).join(" ");
  const sx = x(24);
  const chart = svgUri(`<svg xmlns="http://www.w3.org/2000/svg" width="${cw}" height="${ch + 6}" viewBox="0 -3 ${cw} ${ch + 6}">
    ${[0.25, 0.5, 0.75].map((g) => `<line x1="0" x2="${cw}" y1="${ch * g}" y2="${ch * g}" stroke="#f0f0f2"/>`).join("")}
    <line x1="${sx}" x2="${sx}" y1="0" y2="${ch}" stroke="${SIGNAL_PINK}" stroke-width="1.5" stroke-dasharray="4 4"/>
    <path d="${path(poly)}" fill="none" stroke="${POLY_BLUE}" stroke-width="2.4" stroke-linejoin="round"/>
    <path d="${path(kalshi)}" fill="none" stroke="${KALSHI_GREEN}" stroke-width="2.4" stroke-linejoin="round"/>
    <circle cx="${sx}" cy="${y(kalshi[24])}" r="5" fill="#fff" stroke="${SIGNAL_PINK}" stroke-width="2.5"/>
  </svg>`);
  const label = { fontSize: 12, color: "#71717a" };
  const stat = (tile, name, value, sub, subColor) =>
    h("div", { display: "flex", flexDirection: "column", gap: 4, padding: "10px 12px", border: "1px solid #ececef", borderRadius: 10, width: 128 },
      h("div", { display: "flex", alignItems: "center", gap: 6 }, tile, h("div", { ...mono, fontSize: 10, letterSpacing: 1, color: "#71717a" }, name)),
      h("div", { display: "flex", alignItems: "baseline", gap: 6 },
        h("div", { fontSize: 22, fontWeight: 600, letterSpacing: -0.6, color: "#18181b" }, value),
        h("div", { fontSize: 11, fontWeight: 500, color: subColor }, sub)));
  return h(
    "div",
    { position: "absolute", left, top, width: 720, height: 620, display: "flex", flexDirection: "column", backgroundColor: "#fff", borderRadius: 16, border: "1px solid #e4e4e7", boxShadow: "0 24px 60px rgba(24,24,27,0.10)", overflow: "hidden" },
    h("div", { display: "flex", alignItems: "center", gap: 8, height: 38, paddingLeft: 16, borderBottom: "1px solid #f0f0f2" },
      ...["#ef4444", "#f59e0b", "#22c55e"].map((c) => h("div", { width: 10, height: 10, borderRadius: 9999, backgroundColor: c, opacity: 0.55 })),
      h("div", { marginLeft: 12, fontSize: 12, color: "#71717a" }, "Lychee Terminal")),
    h("div", { display: "flex", flexGrow: 1 },
      h("div", { display: "flex", flexDirection: "column", width: 150, padding: 14, gap: 8, borderRight: "1px solid #f0f0f2", backgroundColor: "#fafafa" },
        h("div", { ...mono, fontSize: 10, letterSpacing: 1.2, color: "#a1a1aa" }, "YOUR RESEARCH"),
        ...[["Fed cut in Dec", true], ["Election odds"], ["BTC 15-min"], ["Hurricanes"]].map(([t, active]) =>
          h("div", { display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 500, color: active ? "#18181b" : "#52525b", padding: "5px 7px", borderRadius: 7, backgroundColor: active ? "#fff" : "transparent", border: active ? "1px solid #e4e4e7" : "1px solid transparent" },
            h("div", { width: 6, height: 6, borderRadius: 9999, backgroundColor: active ? LYCHEE : "#d4d4d8" }), t))),
      h("div", { display: "flex", flexDirection: "column", padding: "16px 20px", gap: 12, flexGrow: 1 },
        h("div", { ...label }, "Research  /  Kalshi vs Polymarket"),
        h("div", { fontSize: 22, fontWeight: 600, letterSpacing: -0.5, color: "#18181b" }, "Fed cut in December"),
        h("div", { display: "flex", gap: 10 },
          stat(KalshiTile(14), "KALSHI", "70¢", "+22¢", "#0f9f6e"),
          stat(PolyTile(14), "POLYMARKET", "66¢", "+19¢", "#0f9f6e"),
          stat(SignalTile(14), "SIGNAL", "FOMC", "", SIGNAL_PINK)),
        h("div", { display: "flex", flexDirection: "column", border: "1px solid #ececef", borderRadius: 12, padding: "12px 14px", gap: 8 },
          h("div", { display: "flex", alignItems: "center", gap: 14, ...label },
            h("div", { display: "flex", alignItems: "center", gap: 6 }, h("div", { width: 10, height: 3, borderRadius: 2, backgroundColor: KALSHI_GREEN }), "Kalshi"),
            h("div", { display: "flex", alignItems: "center", gap: 6 }, h("div", { width: 10, height: 3, borderRadius: 2, backgroundColor: POLY_BLUE }), "Polymarket"),
            h("div", { display: "flex", alignItems: "center", gap: 6 }, h("div", { width: 8, height: 8, borderRadius: 9999, border: `2px solid ${SIGNAL_PINK}` }), "Signal")),
          img(chart, { width: cw, height: ch + 6 })),
        h("div", { display: "flex", flexDirection: "column", border: "1px solid #ececef", borderRadius: 12, overflow: "hidden" },
          h("div", { display: "flex", backgroundColor: "#fafafa", borderBottom: "1px solid #ececef", padding: "7px 12px", ...mono, fontSize: 11, color: "#71717a" },
            ...["time", "venue", "side", "price"].map((c) => h("div", { width: 104 }, c))),
          ...[["14:02:11", "kalshi", "yes", "70¢"], ["14:02:09", "poly", "yes", "66¢"], ["14:01:48", "kalshi", "no", "31¢"]].map((row) =>
            h("div", { display: "flex", padding: "7px 12px", borderBottom: "1px solid #f4f4f5", ...mono, fontSize: 12, color: "#3f3f46" },
              ...row.map((c, i) => h("div", { width: 104, color: i === 2 ? (c === "yes" ? "#0f9f6e" : "#e5484d") : i === 1 ? (c === "kalshi" ? "#0f9f6e" : POLY_BLUE) : "#3f3f46" }, c))))))),
  );
}

const productLine = { display: "flex", alignItems: "center", gap: 14, fontWeight: 600, color: "#18181b" };

/* Sentence-case headline with inline icons, venues underneath. */
const productIcons = () =>
  Frame(
    { backgroundColor: PAPER },
    h("div", { position: "absolute", left: 80, top: 70, display: "flex" }, BrandRow({})),
    h("div", { position: "absolute", left: 80, top: 168, display: "flex", flexDirection: "column" },
      h("div", { ...productLine, fontSize: 56, letterSpacing: -1.8, lineHeight: 1.14 }, "The research"),
      h("div", { ...productLine, fontSize: 56, letterSpacing: -1.8, lineHeight: 1.14 }, img(terminalIcon, { width: 50, height: 50 }), "terminal for"),
      h("div", { ...productLine, fontSize: 56, letterSpacing: -1.8, lineHeight: 1.14 }, "prediction markets")),
    h("div", { position: "absolute", left: 80, bottom: 78, display: "flex" }, VenueRow({})),
    ComparePeek({}),
  );

/* Brand copy set in caps, like the source copy. */
const productCaps = () =>
  Frame(
    { backgroundColor: PAPER },
    h("div", { position: "absolute", left: 80, top: 70, display: "flex" }, BrandRow({ spaced: true })),
    h("div", { position: "absolute", left: 80, top: 176, display: "flex", flexDirection: "column" },
      ...["THE RESEARCH", "TERMINAL FOR", "PREDICTION MARKETS"].map((t, i) =>
        h("div", { fontSize: 46, fontWeight: 600, letterSpacing: -1.2, lineHeight: 1.12, color: i === 1 ? LYCHEE : "#18181b" }, t))),
    h("div", { position: "absolute", left: 80, bottom: 78, display: "flex" }, VenueRow({})),
    ComparePeek({}),
  );

/* Product clarity with a little of the sticker energy. */
const productStickers = () =>
  Frame(
    { backgroundColor: PAPER },
    h("div", { position: "absolute", left: 80, top: 70, display: "flex" }, BrandRow({})),
    h("div", { position: "absolute", left: 80, top: 168, display: "flex", flexDirection: "column" },
      h("div", { ...productLine, fontSize: 56, letterSpacing: -1.8, lineHeight: 1.14 }, "The research"),
      h("div", { ...productLine, fontSize: 56, letterSpacing: -1.8, lineHeight: 1.14 }, img(terminalIcon, { width: 50, height: 50 }), "terminal for"),
      h("div", { ...productLine, fontSize: 56, letterSpacing: -1.8, lineHeight: 1.14 }, "prediction markets")),
    h("div", { position: "absolute", left: 80, bottom: 78, display: "flex" }, VenueRow({})),
    ComparePeek({ left: 690, top: 96 }),
    Sticker(
      { left: 632, top: 62, transform: "rotate(-8deg)", backgroundColor: KALSHI_GREEN, borderRadius: 10, padding: "10px 16px", flexDirection: "column", gap: 2, border: "2px dashed rgba(255,255,255,0.7)" },
      h("div", { ...mono, fontSize: 11, letterSpacing: 1.8, color: "rgba(255,255,255,0.9)" }, "KALSHI · FED CUT DEC"),
      h("div", { fontSize: 30, fontWeight: 900, color: "#fff", letterSpacing: -0.8 }, "YES 70¢")),
    Sticker(
      { right: 46, bottom: 52, transform: "rotate(-6deg)", backgroundColor: SIGNAL_PINK, borderRadius: 9999, padding: "12px 24px", alignItems: "center", gap: 10 },
      h("div", { width: 9, height: 9, borderRadius: 9999, backgroundColor: "#fff" }),
      h("div", { fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: -0.4 }, "FOMC MINUTES +22¢")),
  );

function CopyStickers({ full = true }) {
  return [
    Sticker(
      { left: 66, top: 52, transform: "rotate(-9deg)", backgroundColor: KALSHI_GREEN, borderRadius: 12, padding: "14px 20px", flexDirection: "column", gap: 6, border: "2px dashed rgba(255,255,255,0.7)" },
      img(KALSHI_WORDMARK, { width: 92, height: 92 * (226 / 772) }),
      h("div", { fontSize: 36, fontWeight: 900, color: "#fff", letterSpacing: -1 }, "YES 70¢")),
    Sticker(
      { right: 80, top: 46, transform: "rotate(8deg)", backgroundColor: POLY_BLUE, borderRadius: 14, padding: "12px 18px", alignItems: "center", gap: 12 },
      img(POLY_ICON, { width: 40, height: 40, borderRadius: 8 }),
      h("div", { display: "flex", flexDirection: "column" },
        h("div", { ...mono, fontSize: 11, letterSpacing: 1.6, color: "rgba(255,255,255,0.8)" }, "POLYMARKET"),
        h("div", { fontSize: 26, fontWeight: 900, color: "#fff" }, "54% chance"))),
    Sticker(
      { right: 104, bottom: 58, transform: "rotate(-7deg)", backgroundColor: SIGNAL_PINK, borderRadius: 9999, padding: "14px 28px", alignItems: "center", gap: 10 },
      h("div", { width: 10, height: 10, borderRadius: 9999, backgroundColor: "#fff" }),
      h("div", { fontSize: 26, fontWeight: 900, color: "#fff", letterSpacing: -0.5 }, "EVERY SIGNAL.")),
    ...(full
      ? [
          Sticker(
            { left: 100, bottom: 40, transform: "rotate(5deg)", backgroundColor: "#fffdf8", padding: "12px 16px", flexDirection: "column", gap: 4, width: 236 },
            h("div", { ...mono, fontSize: 11, letterSpacing: 1.5, color: "#3f3f46" }, "RECEIPT · 2,400 TRADES"),
            h("div", { ...mono, fontSize: 11, color: "#71717a" }, "KALSHI × POLYMARKET"),
            h("div", { ...mono, fontSize: 11, color: "#71717a" }, "SPREAD ............ 4¢"),
            h("div", { display: "flex", gap: 2, marginTop: 5, height: 22 }, ...Array.from({ length: 36 }, (_, i) => h("div", { width: [1, 2, 3, 1, 2][i % 5], height: "100%", backgroundColor: "#18181b" })))),
          Sticker(
            { left: 34, top: 292, transform: "rotate(-5deg)", backgroundColor: "#111", borderRadius: 10, padding: "10px 16px", alignItems: "center", gap: 10 },
            h("div", { width: 8, height: 8, borderRadius: 9999, backgroundColor: "#34d399" }),
            h("div", { ...mono, fontSize: 14, color: "#fff", letterSpacing: 1 }, "LIVE · BTC 15M")),
          Sticker(
            { right: 40, top: 300, transform: "rotate(6deg)", backgroundColor: "#d9f99d", padding: "12px 16px", flexDirection: "column", gap: 2 },
            h("div", { fontSize: 20, fontWeight: 900, color: "#1a2e05", letterSpacing: -0.4 }, "LOOK!"),
            h("div", { ...mono, fontSize: 12, color: "#1a2e05", letterSpacing: 1 }, "ODDS MOVED +22¢")),
        ]
      : []),
  ];
}

function BigWord({ color, sub }) {
  return h("div", { position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: W, height: H, marginTop: -16 },
    h("div", { fontSize: 228, fontWeight: 900, letterSpacing: -10, lineHeight: 1, color, paddingBottom: 6 }, "LYCHEE"),
    h("div", { marginTop: 20, ...mono, fontSize: 21, letterSpacing: 4.2, color: sub }, "THE RESEARCH TERMINAL FOR PREDICTION MARKETS"));
}

const intrigueCopy = () =>
  Frame({}, img(bgUri("blush-sky"), { ...fill, objectFit: "cover" }), BigWord({ color: "#16080b", sub: "rgba(22,8,11,0.78)" }), ...CopyStickers({}));

const intrigueCalm = () =>
  Frame({ backgroundColor: PAPER }, BigWord({ color: "#16080b", sub: "rgba(22,8,11,0.7)" }), ...CopyStickers({ full: false }));

const intrigueRed = () =>
  Frame(
    { backgroundColor: LYCHEE },
    h("div", { ...fill, backgroundImage: "radial-gradient(ellipse at 50% 45%, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 60%)" }),
    BigWord({ color: "#fff", sub: "rgba(255,255,255,0.82)" }),
    ...CopyStickers({}),
  );

const VARIANTS = {
  "product-icons": productIcons,
  "product-caps": productCaps,
  "product-stickers": productStickers,
  "intrigue-copy": intrigueCopy,
  "intrigue-calm": intrigueCalm,
  "intrigue-red": intrigueRed,
  "solid-red": solidRed,
  "solid-red-tagline": solidRedTagline,
  "solid-ink": solidInk,
  silk,
  "blush-sky-mark": blushSkyMark,
  "blush-sky-lockup": blushSkyLockup,
  "dusk-lockup": duskLockup,
  "magic-beans": magicBeans,
  intrigue,
};

const FONTS = [
  font("Geist", 500, "node_modules/geist/dist/fonts/geist-sans/Geist-Medium.ttf"),
  font("Geist", 600, "node_modules/geist/dist/fonts/geist-sans/Geist-SemiBold.ttf"),
  font("Geist", 900, "node_modules/geist/dist/fonts/geist-sans/Geist-Black.ttf"),
  font("Geist Mono", 500, "node_modules/geist/dist/fonts/geist-mono/GeistMono-Medium.ttf"),
];

const [outArg, ...ids] = process.argv.slice(2);
const outDir = path.resolve(root, outArg || "public/og/variants");
fs.mkdirSync(outDir, { recursive: true });

for (const [id, render] of Object.entries(VARIANTS)) {
  if (ids.length && !ids.includes(id)) continue;
  const res = new ImageResponse(render(), { width: W, height: H, fonts: FONTS });
  const out = path.join(outDir, `${id}.png`);
  fs.writeFileSync(out, Buffer.from(await res.arrayBuffer()));
  console.log(`wrote ${path.relative(root, out)}`);
}
