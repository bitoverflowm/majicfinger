/**
 * Renders the Lychee Open Graph images (1200x630) into public/og/.
 * Run: node scripts/og/render-og.mjs [imageName...]
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
const KALSHI_GREEN = "#28CC95";
const POLY_BLUE = "#2E5CFF";
const SIGNAL_PINK = "#ff5c7a";
const PAPER = "#f6f5f3";

const file = (p) => fs.readFileSync(path.join(root, p));
const svgUri = (svg) => `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
const pngUri = (p) => `data:image/png;base64,${file(p).toString("base64")}`;
const font = (name, weight, p) => ({ name, weight, style: "normal", data: file(p) });

const h = (type, style, ...children) => React.createElement(type, { style }, ...children);
const img = (src, style) => React.createElement("img", { src, style });
const mono = { fontFamily: "Geist Mono" };

const KALSHI_WORDMARK = pngUri("public/kalshi.png");
const POLY_ICON = pngUri("public/polymarket.png");

function Mark({ color = "#fff", height }) {
  const width = height / MARK_ASPECT;
  return img(svgUri(lycheeMarkSvg(color, { size: width, tight: true })), { width, height });
}

function Frame(bg, ...children) {
  return h("div", { position: "relative", display: "flex", width: W, height: H, alignItems: "center", justifyContent: "center", fontFamily: "Geist", overflow: "hidden", ...bg }, ...children);
}

function Sticker(style, ...children) {
  return h("div", { position: "absolute", display: "flex", boxShadow: "0 10px 24px rgba(60,10,20,0.18)", ...style }, ...children);
}

const pulseIcon = (c) =>
  svgUri(`<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><path d="M4 26h9l5-13 9 24 6-16 3 5h8" fill="none" stroke="${c}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`);

const terminalIcon = svgUri(`<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><rect x="2" y="4" width="44" height="40" rx="10" fill="${LYCHEE}"/><path d="M13 18l7 6-7 6" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M24 31h11" stroke="#fff" stroke-width="3.6" stroke-linecap="round"/></svg>`);

const KalshiTile = (hgt) =>
  h("div", { display: "flex", alignItems: "center", justifyContent: "center", width: hgt * 1.9, height: hgt, borderRadius: hgt * 0.26, backgroundColor: KALSHI_GREEN },
    img(KALSHI_WORDMARK, { width: hgt * 1.45, height: hgt * 1.45 * (226 / 772) }));
const PolyTile = (hgt) => img(POLY_ICON, { width: hgt, height: hgt, borderRadius: hgt * 0.26 });
const SignalTile = (hgt) =>
  h("div", { display: "flex", alignItems: "center", justifyContent: "center", width: hgt, height: hgt, borderRadius: hgt * 0.26, backgroundColor: SIGNAL_PINK },
    img(pulseIcon("#fff"), { width: hgt * 0.68, height: hgt * 0.68 }));

function BrandRow({ size = 24 }) {
  return h(
    "div",
    { display: "flex", alignItems: "center", gap: 14 },
    h("div", { display: "flex", alignItems: "center", justifyContent: "center", width: size * 1.75, height: size * 1.75, borderRadius: size * 0.46, backgroundColor: LYCHEE }, Mark({ height: size * 1.12 })),
    h("div", { fontSize: size, fontWeight: 600, letterSpacing: -size * 0.025, color: "#18181b" }, "Lychee"),
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

const productLine = { display: "flex", alignItems: "center", gap: 14, fontWeight: 600, color: "#18181b", fontSize: 56, letterSpacing: -1.8, lineHeight: 1.14 };

const Headline = () =>
  h("div", { position: "absolute", left: 80, top: 168, display: "flex", flexDirection: "column" },
    h("div", productLine, "The research"),
    h("div", productLine, img(terminalIcon, { width: 50, height: 50 }), "terminal for"),
    h("div", productLine, "prediction markets"));

/* The live site OG image. */
const researchTerminal = () =>
  Frame(
    { backgroundColor: PAPER },
    h("div", { position: "absolute", left: 80, top: 70, display: "flex" }, BrandRow({})),
    Headline(),
    h("div", { position: "absolute", left: 80, bottom: 78, display: "flex" }, VenueRow({})),
    ComparePeek({}),
  );

const researchTerminalStickers = () =>
  Frame(
    { backgroundColor: PAPER },
    h("div", { position: "absolute", left: 80, top: 70, display: "flex" }, BrandRow({})),
    Headline(),
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

const wordmark = () =>
  Frame(
    { backgroundColor: PAPER },
    h("div", { position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: W, height: H, marginTop: -16 },
      h("div", { fontSize: 228, fontWeight: 900, letterSpacing: -10, lineHeight: 1, color: "#16080b", paddingBottom: 6 }, "LYCHEE"),
      h("div", { marginTop: 18, ...mono, fontSize: 19, letterSpacing: 4.4, color: "rgba(22,8,11,0.7)" }, "THE RESEARCH TERMINAL FOR PREDICTION MARKETS")),
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
  );

const IMAGES = {
  "lychee-research-terminal": researchTerminal,
  "lychee-research-terminal-stickers": researchTerminalStickers,
  "lychee-wordmark": wordmark,
};

const FONTS = [
  font("Geist", 500, "node_modules/geist/dist/fonts/geist-sans/Geist-Medium.ttf"),
  font("Geist", 600, "node_modules/geist/dist/fonts/geist-sans/Geist-SemiBold.ttf"),
  font("Geist", 900, "node_modules/geist/dist/fonts/geist-sans/Geist-Black.ttf"),
  font("Geist Mono", 500, "node_modules/geist/dist/fonts/geist-mono/GeistMono-Medium.ttf"),
];

const names = process.argv.slice(2);
const outDir = path.join(root, "public/og");

for (const [name, render] of Object.entries(IMAGES)) {
  if (names.length && !names.includes(name)) continue;
  const res = new ImageResponse(render(), { width: W, height: H, fonts: FONTS });
  const out = path.join(outDir, `${name}.png`);
  fs.writeFileSync(out, Buffer.from(await res.arrayBuffer()));
  console.log(`wrote ${path.relative(root, out)}`);
}
