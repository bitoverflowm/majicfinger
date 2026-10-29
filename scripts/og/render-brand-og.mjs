/**
 * Renders the brand Open Graph card variants (1200x630).
 * Prepare backgrounds first: python3 scripts/og/prepare-backgrounds.py
 * Run: node scripts/og/render-brand-og.mjs [outDir] [variantId...]
 */
import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const require = createRequire(import.meta.url);
const React = require("react");
const { ImageResponse } = require("next/dist/compiled/@vercel/og/index.node.js");

const W = 1200;
const H = 630;
const INK = "#09090b";

const VARIANTS = [
  { id: "orchard-fade-ticker", bg: "orchard", layout: "fade", footer: "ticker" },
  { id: "orchard-glass-quote", bg: "orchard", layout: "glass", footer: "quote" },
  { id: "orchard-glass-pillars", bg: "orchard", layout: "glass", footer: "pillars" },
  { id: "dusk-fade-quote", bg: "dusk", layout: "fade", footer: "quote" },
  { id: "dusk-fade-pillars", bg: "dusk", layout: "fade", footer: "pillars" },
  { id: "dusk-glass-quote", bg: "dusk", layout: "glass", footer: "quote" },
  { id: "dusk-glass-pillars", bg: "dusk", layout: "glass", footer: "pillars" },
  { id: "dawn-glass-quote", bg: "dawn", layout: "glass", footer: "quote" },
  { id: "dawn-glass-pillars", bg: "dawn", layout: "glass", footer: "pillars" },
  { id: "night-lake-glass-quote", bg: "night-lake", layout: "glass", footer: "quote" },
  { id: "sunset-lake-glass-pillars", bg: "sunset-lake", layout: "glass", footer: "pillars" },
  { id: "terraces-glass-quote", bg: "terraces", layout: "glass", footer: "quote" },
  ...["orchard", "dusk", "dusk-framed", "night-lake", "dawn", "sunset-lake", "terraces"].flatMap((bg) =>
    ["quote", "pillars"].map((footer) => ({ id: `${bg}-center-${footer}`, bg, layout: "glass", align: "center", footer })),
  ),
];

const file = (p) => fs.readFileSync(path.join(root, p));
const dataUri = (p, mime) => `data:${mime};base64,${file(p).toString("base64")}`;
const svgUri = (svg) => `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
const font = (name, weight, p) => ({ name, weight, style: "normal", data: file(p) });
const bgUri = (name, blur = false) => dataUri(`scripts/og/backgrounds/${name}${blur ? "-blur" : ""}.jpg`, "image/jpeg");

const h = (type, style, ...children) => React.createElement(type, { style }, ...children);
const img = (src, style) => React.createElement("img", { src, style });
const fill = (w, h) => ({ position: "absolute", left: 0, top: 0, width: w, height: h, display: "flex" });

const mono = { fontFamily: "Geist Mono" };
const LOGO = dataUri("public/logo.png", "image/png");

function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pathFrom(points) {
  return points.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
}

function gridSvg(w, hgt, { step = 48, strong = 0.075, fadeAt = 0.8 } = {}) {
  return svgUri(`
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${hgt}">
  <defs>
    <linearGradient id="fade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#fff" stop-opacity="${strong}"/>
      <stop offset="${fadeAt * 0.7}" stop-color="#fff" stop-opacity="${strong * 0.55}"/>
      <stop offset="${fadeAt}" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <pattern id="grid" width="${step}" height="${step}" patternUnits="userSpaceOnUse">
      <path d="M${step} 0H0V${step}" fill="none" stroke="url(#fade)" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#grid)"/>
</svg>`);
}

function signalSvg(w, hgt, { x0, x1, top, bottom }) {
  const rand = mulberry32(7);
  const n = 64;
  let v = 0.18;
  const pts = Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    v += (rand() - 0.47) * 0.09 + 0.012;
    v = Math.max(0.05, Math.min(0.95, v));
    v = v * 0.82 + (0.12 + t * 0.8) * 0.18;
    return [x0 + t * (x1 - x0), bottom - v * (bottom - top)];
  });
  const line = pathFrom(pts);
  const [ex, ey] = pts[pts.length - 1];
  return svgUri(`
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${hgt}">
  <defs>
    <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ff5c7a" stop-opacity="0.22"/>
      <stop offset="1" stop-color="#ff5c7a" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="stroke" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#ff5c7a" stop-opacity="0"/>
      <stop offset="0.35" stop-color="#ff5c7a" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#ff8fa8" stop-opacity="1"/>
    </linearGradient>
    <filter id="glow" x="-10%" y="-50%" width="120%" height="200%">
      <feGaussianBlur stdDeviation="6"/>
    </filter>
  </defs>
  <path d="${line} L${ex.toFixed(1)} ${bottom + 14} L${x0} ${bottom + 14} Z" fill="url(#area)"/>
  <path d="${line}" fill="none" stroke="#ff5c7a" stroke-opacity="0.6" stroke-width="5" filter="url(#glow)"/>
  <path d="${line}" fill="none" stroke="url(#stroke)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
  <line x1="${ex}" y1="${ey}" x2="${ex}" y2="${bottom + 14}" stroke="#ff8fa8" stroke-opacity="0.35" stroke-dasharray="3 4"/>
  <circle cx="${ex}" cy="${ey}" r="14" fill="#ff5c7a" fill-opacity="0.35" filter="url(#glow)"/>
  <circle cx="${ex}" cy="${ey}" r="4.5" fill="#fff"/>
</svg>`);
}

function seriesPath(values, w, hgt, pad = 2) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const step = (w - pad * 2) / (values.length - 1);
  return pathFrom(values.map((v, i) => [pad + i * step, pad + (1 - (v - min) / (max - min || 1)) * (hgt - pad * 2)]));
}

const spark = (values, color) =>
  svgUri(`
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="22" viewBox="0 0 64 22">
  <path d="${seriesPath(values, 64, 22)}" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`);

const TICKS = [
  { venue: "KALSHI", color: "#28CC95", market: "FED CUT · DEC", price: "70¢", move: "+22", up: true, series: [48, 47, 50, 49, 53, 52, 57, 60, 59, 64, 66, 70] },
  { venue: "POLYMARKET", color: "#5B7FFF", market: "BTC UP · 15M", price: "54¢", move: "+3", up: true, series: [51, 49, 50, 48, 50, 52, 51, 53, 52, 54] },
  { venue: "CHAINLINK", color: "#6C8BF0", market: "BTC / USD", price: "112,480", move: "+0.8%", up: true, series: [10, 12, 11, 13, 12, 15, 14, 16, 18, 17, 19] },
  { venue: "KALSHI", color: "#28CC95", market: "CAT 4 LANDFALL", price: "18¢", move: "−5", up: false, series: [26, 25, 27, 24, 23, 24, 21, 20, 19, 18] },
];

const PILLARS = [
  ["Live data.", "#34d399"],
  ["Historical data.", "#7b96ff"],
  ["Real-world signals.", "#ff5c7a"],
];

const QUOTE = "“Without data, you’re just another person with an opinion.”";
const QUOTE_BY = "W. EDWARDS DEMING";

function Brand() {
  return h(
    "div",
    { display: "flex", alignItems: "center", gap: 16 },
    img(LOGO, { width: 44, height: 44, borderRadius: 11, boxShadow: "0 0 0 1px rgba(255,255,255,0.12), 0 8px 32px rgba(186,11,49,0.55)" }),
    h("div", { fontSize: 24, fontWeight: 600, letterSpacing: 7, color: "#fff" }, "LYCHEE"),
  );
}

function Headline({ size, taglineGap = 34, centered = false }) {
  const line = { fontSize: size, fontWeight: 600, letterSpacing: -size * 0.026, lineHeight: 1.04 };
  return h(
    "div",
    { display: "flex", flexDirection: "column", alignItems: centered ? "center" : "flex-start" },
    h("div", { ...line, color: "#fff" }, "THE RESEARCH TERMINAL"),
    h(
      "div",
      { ...line, backgroundImage: "linear-gradient(90deg, #ffffff 0%, #ffd9e1 45%, #ff8fa8 100%)", backgroundClip: "text", color: "transparent" },
      "FOR PREDICTION MARKETS",
    ),
    h(
      "div",
      { display: "flex", alignItems: "center", gap: 22, marginTop: taglineGap, ...mono, fontSize: 19, letterSpacing: 3.2, color: "rgba(255,255,255,0.8)" },
      ...[
        ["KALSHI.", "#28CC95"],
        ["POLYMARKET.", "#5B7FFF"],
        ["EVERY SIGNAL.", "#ff5c7a"],
      ].map(([label, color]) =>
        h("div", { display: "flex", alignItems: "center", gap: 10 }, h("div", { width: 9, height: 9, borderRadius: 2, backgroundColor: color }), label),
      ),
    ),
  );
}

function Tick({ venue, color, market, price, move, up, series }) {
  return h(
    "div",
    { display: "flex", alignItems: "center", gap: 14, paddingLeft: 28, paddingRight: 28, height: "100%", borderRight: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 },
    h("div", { width: 8, height: 8, borderRadius: 2, backgroundColor: color }),
    h("div", { ...mono, fontSize: 13, letterSpacing: 1.4, color: "rgba(255,255,255,0.5)" }, venue),
    h("div", { ...mono, fontSize: 14, letterSpacing: 0.6, color: "rgba(255,255,255,0.92)" }, market),
    img(spark(series, up ? "#34d399" : "#fb7185"), { width: 64, height: 22 }),
    h("div", { ...mono, fontSize: 15, color: "#fff" }, price),
    h("div", { ...mono, fontSize: 13, color: up ? "#34d399" : "#fb7185" }, `${up ? "▲" : "▼"} ${move}`),
  );
}

function Ticker() {
  return [
    h(
      "div",
      { display: "flex", alignItems: "center", gap: 10, height: "100%", paddingLeft: 72, paddingRight: 24, borderRight: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 },
      h("div", { width: 7, height: 7, borderRadius: 9999, backgroundColor: "#34d399", boxShadow: "0 0 10px #34d399" }),
      h("div", { ...mono, fontSize: 13, letterSpacing: 1.6, color: "#34d399" }, "LIVE"),
    ),
    ...TICKS.map((t) => Tick(t)),
    h("div", { position: "absolute", right: 0, top: 0, width: 260, height: "100%", display: "flex", backgroundImage: "linear-gradient(90deg, rgba(9,9,11,0) 0%, rgba(9,9,11,0.96) 85%)" }),
  ];
}

function Quote({ size = 20, centered = false }) {
  return h(
    "div",
    { display: "flex", alignItems: "center", justifyContent: centered ? "center" : "space-between", width: "100%", gap: centered ? 18 : 24 },
    h("div", { fontSize: size, fontWeight: 500, letterSpacing: -0.2, color: "rgba(255,255,255,0.9)" }, QUOTE),
    h("div", { ...mono, fontSize: 12, letterSpacing: 1.8, color: "rgba(255,255,255,0.45)", flexShrink: 0 }, `— ${QUOTE_BY}`),
  );
}

function Pillars({ size = 20, centered = false }) {
  return h(
    "div",
    { display: "flex", alignItems: "center", justifyContent: centered ? "center" : "flex-start", width: "100%", height: "100%" },
    ...PILLARS.map(([label, color], i) =>
      h(
        "div",
        {
          display: "flex", alignItems: "center", gap: 12, height: "100%",
          ...(centered ? { paddingLeft: 30, paddingRight: 30 } : { flexGrow: 1, paddingLeft: i ? 28 : 0 }),
          borderLeft: i ? "1px solid rgba(255,255,255,0.1)" : "none",
        },
        h("div", { width: 8, height: 8, borderRadius: 9999, backgroundColor: color, boxShadow: `0 0 12px ${color}` }),
        h("div", { fontSize: size, fontWeight: 500, letterSpacing: -0.2, color: "rgba(255,255,255,0.92)" }, label),
      ),
    ),
  );
}

function FadeCard({ bg, footer }) {
  const barH = 72;
  return h(
    "div",
    { position: "relative", display: "flex", width: W, height: H, backgroundColor: INK, fontFamily: "Geist", overflow: "hidden" },
    img(bgUri(bg), { ...fill(W, H), objectFit: "cover" }),
    h("div", { ...fill(W, H), backgroundImage: `linear-gradient(90deg, ${INK} 0%, rgba(9,9,11,0.97) 30%, rgba(9,9,11,0.82) 50%, rgba(9,9,11,0.35) 72%, rgba(9,9,11,0.05) 100%)` }),
    h("div", { ...fill(W, H), backgroundImage: "linear-gradient(0deg, rgba(9,9,11,0.9) 0%, rgba(9,9,11,0) 32%)" }),
    img(gridSvg(W, H), fill(W, H)),
    img(signalSvg(W, H, { x0: 0, x1: 820, top: 408, bottom: H - barH - 14 }), fill(W, H)),
    h("div", { position: "absolute", left: -260, top: -300, width: 760, height: 760, borderRadius: 9999, display: "flex", backgroundImage: "radial-gradient(circle, rgba(186,11,49,0.32) 0%, rgba(186,11,49,0) 65%)" }),
    h("div", { position: "absolute", left: 72, top: 64, display: "flex" }, Brand()),
    h("div", { position: "absolute", left: 72, top: 172, display: "flex" }, Headline({ size: 62 })),
    h(
      "div",
      {
        position: "absolute", left: 0, bottom: 0, width: W, height: barH, display: "flex", alignItems: "center",
        backgroundColor: "rgba(9,9,11,0.78)", borderTop: "1px solid rgba(255,255,255,0.1)",
        paddingLeft: footer === "ticker" ? 0 : 72, paddingRight: footer === "ticker" ? 0 : 72,
      },
      ...(footer === "ticker" ? Ticker() : [footer === "quote" ? Quote({}) : Pillars({})]),
    ),
  );
}

const GLASS_TINT = {
  dawn: "rgba(28,14,30,0.52)",
  "sunset-lake": "rgba(22,12,16,0.55)",
  terraces: "rgba(22,14,10,0.55)",
};

function GlassCard({ bg, footer, align = "left" }) {
  const centered = align === "center";
  const CY = 48;
  const CW = centered ? 860 : 820;
  const CX = centered ? (W - CW) / 2 : 48;
  const CH = H - CY * 2;
  const PAD = 44;
  const footH = 76;
  const row = (top, child) =>
    centered
      ? h("div", { position: "absolute", left: 0, top, width: CW, display: "flex", justifyContent: "center" }, child)
      : h("div", { position: "absolute", left: PAD, top, display: "flex" }, child);
  return h(
    "div",
    { position: "relative", display: "flex", width: W, height: H, backgroundColor: INK, fontFamily: "Geist", overflow: "hidden" },
    img(bgUri(bg), { ...fill(W, H), objectFit: "cover" }),
    h("div", {
      ...fill(W, H),
      backgroundImage: centered
        ? "radial-gradient(ellipse at center, rgba(9,9,11,0.35) 0%, rgba(9,9,11,0.1) 55%, rgba(9,9,11,0.3) 100%)"
        : "linear-gradient(90deg, rgba(9,9,11,0.35) 0%, rgba(9,9,11,0) 60%)",
    }),
    h(
      "div",
      {
        position: "absolute", left: CX, top: CY, width: CW, height: CH, display: "flex", overflow: "hidden",
        borderRadius: 28, border: "1px solid rgba(255,255,255,0.18)",
        boxShadow: "0 30px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(0,0,0,0.25)",
      },
      img(bgUri(bg, true), { position: "absolute", left: -CX, top: -CY, width: W, height: H }),
      h("div", { ...fill(CW, CH), backgroundColor: GLASS_TINT[bg] || "rgba(10,10,14,0.56)" }),
      h("div", { ...fill(CW, CH), backgroundImage: "linear-gradient(160deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.02) 35%, rgba(255,255,255,0) 60%)" }),
      img(gridSvg(CW, CH, { step: 44, strong: 0.06, fadeAt: 1 }), fill(CW, CH)),
      img(signalSvg(CW, CH, { x0: 0, x1: CW - 70, top: CH - footH - 150, bottom: CH - footH - 18 }), fill(CW, CH)),
      centered
        ? h("div", { position: "absolute", left: CW / 2 - 360, top: -380, width: 720, height: 620, borderRadius: 9999, display: "flex", backgroundImage: "radial-gradient(ellipse, rgba(186,11,49,0.3) 0%, rgba(186,11,49,0) 65%)" })
        : h("div", { position: "absolute", left: -220, top: -260, width: 640, height: 640, borderRadius: 9999, display: "flex", backgroundImage: "radial-gradient(circle, rgba(186,11,49,0.28) 0%, rgba(186,11,49,0) 65%)" }),
      row(PAD, Brand()),
      row(138, Headline({ size: 56, taglineGap: 28, centered })),
      h(
        "div",
        {
          position: "absolute", left: 0, bottom: 0, width: CW, height: footH, display: "flex", alignItems: "center",
          paddingLeft: PAD, paddingRight: PAD, borderTop: "1px solid rgba(255,255,255,0.12)", backgroundColor: "rgba(9,9,11,0.28)",
        },
        footer === "quote" ? Quote({ size: 18, centered }) : Pillars({ size: 19, centered }),
      ),
    ),
  );
}

const FONTS = [
  font("Geist", 500, "node_modules/geist/dist/fonts/geist-sans/Geist-Medium.ttf"),
  font("Geist", 600, "node_modules/geist/dist/fonts/geist-sans/Geist-SemiBold.ttf"),
  font("Geist Mono", 500, "node_modules/geist/dist/fonts/geist-mono/GeistMono-Medium.ttf"),
];

const [outArg, ...ids] = process.argv.slice(2);
const outDir = path.resolve(root, outArg || "public/og/variants");
fs.mkdirSync(outDir, { recursive: true });

for (const v of VARIANTS.filter((v) => !ids.length || ids.includes(v.id))) {
  const el = v.layout === "glass" ? GlassCard(v) : FadeCard(v);
  const res = new ImageResponse(el, { width: W, height: H, fonts: FONTS });
  const out = path.join(outDir, `${v.id}.png`);
  fs.writeFileSync(out, Buffer.from(await res.arrayBuffer()));
  console.log(`wrote ${path.relative(root, out)}`);
}
