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

function RecipePeek({ left = 640, top = 92 }) {
  const BLUE = "#2f6fed";
  const label = { fontSize: 11, color: "#71717a" };
  const rows = [
    ["16:49:41", "300", "0.39", "0.61", "yes"],
    ["16:49:58", "22.38", "0.39", "0.61", "yes"],
    ["16:50:03", "6.29", "0.38", "0.62", "no"],
    ["16:50:07", "13.63", "0.37", "0.63", "no"],
  ];
  const cell = (text, width, color = "#3f3f46") => h("div", { width, ...mono, fontSize: 12, color }, text);
  return h(
    "div",
    { position: "absolute", left, top, width: 760, height: 600, display: "flex", flexDirection: "column", backgroundColor: "#fff", borderRadius: 16, border: "1px solid #e4e4e7", boxShadow: "0 24px 60px rgba(24,24,27,0.10)", overflow: "hidden" },
    h("div", { display: "flex", alignItems: "center", gap: 8, height: 38, paddingLeft: 16, borderBottom: "1px solid #f0f0f2" },
      ...["#ef4444", "#f59e0b", "#22c55e"].map((c) => h("div", { width: 10, height: 10, borderRadius: 9999, backgroundColor: c, opacity: 0.55 })),
      h("div", { marginLeft: 12, fontSize: 12, color: "#71717a" }, "Lychee Terminal")),
    h("div", { display: "flex", flexDirection: "column", padding: "18px 22px", gap: 12 },
      h("div", { ...mono, fontSize: 10, letterSpacing: 1.4, color: "#a1a1aa" }, "RECIPE"),
      h("div", { fontSize: 22, fontWeight: 600, letterSpacing: -0.5, color: "#18181b" }, "Download Kalshi Trade History"),
      h("div", { display: "flex", alignItems: "center", height: 40, padding: "0 14px", border: "1px solid #d4d4d8", borderRadius: 12, fontSize: 14, color: "#18181b" }, "Bitcoin price"),
      h("div", { display: "flex", flexDirection: "column", gap: 3, padding: "10px 14px", border: `1.5px solid ${BLUE}`, borderRadius: 12, backgroundColor: "#e7f0ff", width: 380 },
        h("div", { fontSize: 13, fontWeight: 600, color: "#18181b" }, "Bitcoin price Above/below"),
        h("div", { fontSize: 12, color: "#71717a" }, "$77,300 or above"),
        h("div", { ...mono, fontSize: 10.5, color: "#71717a" }, "KXBTCD-26OCT3108-T77299.99")),
      h("div", { display: "flex", flexDirection: "column", border: "1px solid #ececef", borderRadius: 12, overflow: "hidden", marginTop: 4 },
        h("div", { display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderBottom: "1px solid #ececef" },
          h("div", { fontSize: 12, fontWeight: 600, color: "#18181b" }, "Trades · KXBTCD-26OCT3108-T77299.99"),
          h("div", { ...label, marginLeft: "auto" }, "187 rows")),
        h("div", { display: "flex", backgroundColor: "#fafafa", borderBottom: "1px solid #ececef", padding: "7px 12px", ...mono, fontSize: 10.5, color: "#71717a" },
          ...[["time", 110], ["count", 90], ["yes $", 90], ["no $", 90], ["taker", 90]].map(([c, w]) => h("div", { width: w }, c))),
        ...rows.map((row) =>
          h("div", { display: "flex", padding: "7px 12px", borderBottom: "1px solid #f4f4f5" },
            cell(row[0], 110, "#71717a"), cell(row[1], 90), cell(row[2], 90), cell(row[3], 90), cell(row[4], 90, row[4] === "yes" ? "#0f9f6e" : "#e5484d"))))),
  );
}

/* Cover + OG image for the Download Kalshi Trade History recipe guide. */
const tradeHistoryRecipe = () =>
  Frame(
    { backgroundColor: PAPER },
    h("div", { position: "absolute", left: 80, top: 70, display: "flex" }, BrandRow({})),
    h("div", { position: "absolute", left: 80, top: 176, display: "flex", flexDirection: "column" },
      h("div", { ...mono, fontSize: 15, letterSpacing: 2.4, color: "#71717a", marginBottom: 14 }, "RECIPE GUIDE"),
      h("div", productLine, "Download"),
      h("div", productLine, KalshiTile(52), "trade"),
      h("div", productLine, "history")),
    h("div", { position: "absolute", left: 80, bottom: 78, display: "flex", alignItems: "center", gap: 12, ...mono, fontSize: 17, letterSpacing: 2, color: "#27272a" }, "CSV · EXCEL · JSON · NO CODE"),
    RecipePeek({}),
    Sticker(
      { left: 610, top: 515, transform: "rotate(-7deg)", backgroundColor: KALSHI_GREEN, borderRadius: 10, padding: "10px 16px", flexDirection: "column", gap: 2, border: "2px dashed rgba(255,255,255,0.7)" },
      h("div", { ...mono, fontSize: 11, letterSpacing: 1.8, color: "rgba(255,255,255,0.9)" }, "FULL HISTORY"),
      h("div", { fontSize: 28, fontWeight: 900, color: "#fff", letterSpacing: -0.8 }, "187 TRADES")),
    Sticker(
      { right: 44, top: 60, transform: "rotate(7deg)", backgroundColor: SIGNAL_PINK, borderRadius: 9999, padding: "12px 24px", alignItems: "center", gap: 10 },
      h("div", { width: 9, height: 9, borderRadius: 9999, backgroundColor: "#fff" }),
      h("div", { fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: -0.4 }, "EXPORT .CSV")),
  );

/* Holder Terminal landing pages: the window shows the panel each page walks through. */
const YES = "#10b981";
const NO = "#f43f5e";
const ACCENT = "#0d99ff";
const NEWS = "#f5a524";

function seeded(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

function priceSeries(seed, n, start, drift) {
  const r = seeded(seed);
  const out = [];
  let v = start;
  for (let i = 0; i < n; i++) {
    v += (r() - 0.5) * 0.05 + drift + (i === Math.round(n * 0.62) ? 0.1 : 0);
    v = Math.min(0.94, Math.max(0.06, v));
    out.push(v);
  }
  return out;
}

function HolderWindow({ left, top, width = 720, height = 620, title }, ...children) {
  return h(
    "div",
    { position: "absolute", left, top, width, height, display: "flex", flexDirection: "column", backgroundColor: "#fff", borderRadius: 16, border: "1px solid #e4e4e7", boxShadow: "0 24px 60px rgba(24,24,27,0.10)", overflow: "hidden" },
    h("div", { display: "flex", alignItems: "center", gap: 8, height: 38, paddingLeft: 16, paddingRight: 16, borderBottom: "1px solid #f0f0f2" },
      ...["#ef4444", "#f59e0b", "#22c55e"].map((c) => h("div", { width: 10, height: 10, borderRadius: 9999, backgroundColor: c, opacity: 0.55 })),
      h("div", { marginLeft: 12, fontSize: 12, color: "#71717a" }, `Holder Terminal · ${title}`),
      h("div", { display: "flex", alignItems: "center", gap: 6, marginLeft: 24, fontSize: 11.5, color: "#3f3f46" },
        h("div", { width: 7, height: 7, borderRadius: 9999, backgroundColor: "#22c55e" }), "Live")),
    h("div", { display: "flex", flexDirection: "column", padding: "16px 20px", gap: 12, flexGrow: 1 }, ...children),
  );
}

const panelTitle = (text) => h("div", { fontSize: 15, fontWeight: 600, color: "#18181b", letterSpacing: -0.2 }, text);

function Chip(text, color) {
  return h("div", { display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 9999, border: "1px solid #ececef", fontSize: 11.5, color: "#3f3f46", backgroundColor: color ? `${color}14` : "#fff" },
    color ? h("div", { width: 7, height: 7, borderRadius: 9999, backgroundColor: color }) : null,
    text);
}

function Avatar(color, size = 18) {
  return h("div", { width: size, height: size, borderRadius: 9999, backgroundImage: `linear-gradient(135deg, ${color}, #8b5cf6)` });
}

/** A live alert, styled like the terminal's toasts. */
function AlertCard(style, label, title, detail) {
  return h("div", { position: "absolute", display: "flex", flexDirection: "column", gap: 5, width: 330, padding: "12px 14px", backgroundColor: "#fff", borderRadius: 12, border: "1px solid #e4e4e7", boxShadow: "0 18px 40px rgba(24,24,27,0.16)", ...style },
    h("div", { display: "flex", alignItems: "center", gap: 7, fontSize: 10.5, fontWeight: 600, letterSpacing: 0.8, color: "#0b7fd4" },
      h("div", { width: 7, height: 7, borderRadius: 9999, backgroundColor: ACCENT }), label),
    h("div", { fontSize: 14, fontWeight: 600, color: "#18181b" }, title),
    h("div", { fontSize: 11.5, color: "#71717a" }, detail));
}

function PriceNewsChart({ width, height, seed = 7, pinAt = 0.7, pinned }) {
  const n = 56;
  const yes = priceSeries(seed, n, 0.38, 0.004);
  const x = (i) => (i / (n - 1)) * width;
  const y = (v) => height - v * height;
  const step = (vals) => vals.map((v, i) => `${i ? `H${x(i).toFixed(1)}V` : `M0 `}${y(v).toFixed(1)}`).join(" ");
  const px = x(Math.round((n - 1) * pinAt));
  const svg = svgUri(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    ${[0.25, 0.5, 0.75].map((g) => `<line x1="0" x2="${width}" y1="${height * g}" y2="${height * g}" stroke="#f0f0f2"/>`).join("")}
    <line x1="${px}" x2="${px}" y1="0" y2="${height}" stroke="${NEWS}" stroke-width="1.5" stroke-dasharray="4 4"/>
    <path d="${step(yes.map((v) => 1 - v))}" fill="none" stroke="${NO}" stroke-width="2.2"/>
    <path d="${step(yes)}" fill="none" stroke="${YES}" stroke-width="2.2"/>
  </svg>`);
  const r = seeded(seed + 3);
  const bars = svgUri(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="26" viewBox="0 0 ${width} 26">
    ${Array.from({ length: 70 }, (_, i) => {
      const v = Math.pow(r(), 3) * 22 + (Math.abs(i / 69 - pinAt) < 0.02 ? 16 : 2);
      return `<rect x="${(i / 70) * width}" y="${26 - v}" width="${width / 70 - 2}" height="${v}" rx="1" fill="${NEWS}" opacity="0.75"/>`;
    }).join("")}
  </svg>`);
  const badges = [0.04, 0.16, 0.31, 0.45, pinAt, 0.74, 0.86, 0.95];
  return h("div", { display: "flex", flexDirection: "column", gap: 6, border: "1px solid #ececef", borderRadius: 12, padding: "12px 14px" },
    h("div", { position: "relative", display: "flex", width, height: 18 },
      ...badges.map((at, i) => h("div", { position: "absolute", left: at * width - 9, top: 0, display: "flex", alignItems: "center", justifyContent: "center", width: 18, height: 16, borderRadius: 4, backgroundColor: at === pinAt ? NEWS : `${NEWS}cc`, fontSize: 9.5, fontWeight: 600, color: "#fff" }, String(i + 1)))),
    h("div", { position: "relative", display: "flex", width, height },
      img(svg, { width, height }),
      pinned ? h("div", { position: "absolute", left: px - 252, top: 10, display: "flex", flexDirection: "column", gap: 3, width: 240, padding: "9px 11px", backgroundColor: "#fff", borderRadius: 10, border: `1px solid ${NEWS}66`, boxShadow: "0 10px 24px rgba(24,24,27,0.10)" },
        h("div", { fontSize: 12, fontWeight: 600, color: "#18181b", lineHeight: 1.3 }, pinned[0]),
        h("div", { fontSize: 10.5, color: "#71717a" }, pinned[1])) : null),
    img(bars, { width, height: 26 }),
    h("div", { display: "flex", gap: 16, fontSize: 11, color: "#71717a" },
      h("div", { display: "flex", alignItems: "center", gap: 6 }, h("div", { width: 10, height: 3, backgroundColor: YES }), `Yes ${Math.round(yes[n - 1] * 100)}¢`),
      h("div", { display: "flex", alignItems: "center", gap: 6 }, h("div", { width: 10, height: 3, backgroundColor: NO }), `No ${100 - Math.round(yes[n - 1] * 100)}¢`),
      h("div", { display: "flex", alignItems: "center", gap: 6 }, h("div", { width: 8, height: 8, borderRadius: 2, backgroundColor: NEWS }), "Headlines")));
}

const holderLine = (size, words) => h("div", { ...productLine, fontSize: size, letterSpacing: -size * 0.032 }, ...words);
const word = (text, color) => h("div", { color }, text);

function HolderHeadline(label, lines, footer) {
  return [
    h("div", { position: "absolute", left: 80, top: 70, display: "flex" }, BrandRow({})),
    h("div", { position: "absolute", left: 80, top: 172, display: "flex", flexDirection: "column" },
      h("div", { ...mono, fontSize: 15, letterSpacing: 2.4, color: "#71717a", marginBottom: 14 }, label),
      ...lines),
    h("div", { position: "absolute", left: 80, bottom: 78, display: "flex", alignItems: "center", gap: 12, ...mono, fontSize: 16, letterSpacing: 2, color: "#27272a" }, PolyTile(28), footer),
  ];
}

const holderTerminal = () =>
  Frame(
    { backgroundColor: PAPER },
    ...HolderHeadline(
      "HOLDER TERMINAL",
      [holderLine(54, ["See who's trading"]), holderLine(54, ["on Polymarket"])],
      "MARKETS. HOLDERS. TRADERS.",
    ),
    HolderWindow(
      { left: 636, top: 84, title: "Fed decision in December" },
      panelTitle("Price and news over the market's life"),
      h("div", { display: "flex", gap: 8 }, Chip("Fed", NEWS), Chip("Fed Decision", NEWS), Chip("+ rates")),
      PriceNewsChart({ width: 494, height: 190, pinned: ["Fed signals a pause as inflation cools", "Reuters · via Google News · 2h ago"] }),
      h("div", { display: "flex", gap: 10 },
        ...[["YES", YES, [["whale_42", "16.2%"], ["CharityS", "7.5%"]]], ["NO", NO, [["pako", "21.4%"], ["gokol", "12.0%"]]]].map(([side, color, rows]) =>
          h("div", { display: "flex", flexDirection: "column", gap: 6, width: 256, padding: "10px 12px", border: "1px solid #ececef", borderRadius: 12 },
            h("div", { fontSize: 10.5, fontWeight: 600, letterSpacing: 1, color }, `TOP ${side} HOLDERS`),
            ...rows.map(([name, pct]) =>
              h("div", { display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "#18181b" }, Avatar(color), name, h("div", { marginLeft: "auto", ...mono, fontSize: 11.5, color: "#71717a" }, `${pct} of ${side}`)))))),
    ),
    AlertCard({ left: 560, bottom: 40 }, "LIVE · NEW TRADE", "Yes buy · 12,400 shares at 78¢", "$9,672 · just now · Fed decision in December"),
  );

function Treemap({ width, height, color, tiles, highlight }) {
  const lit = tiles[highlight];
  return h("div", { position: "relative", display: "flex", width, height, borderRadius: 8, backgroundColor: "#e4e4e7" },
    ...tiles.map(([x, y, w, hh, name, pct], i) =>
      h("div", { position: "absolute", left: x * width + 1, top: y * height + 1, width: w * width - 2, height: hh * height - 2, display: "flex", flexDirection: "column", padding: "4px 6px", borderRadius: 3, backgroundColor: name === "more" ? "#d4d4d8" : color, opacity: name === "more" ? 1 : Math.max(0.35, 0.95 - i * 0.09), border: i === highlight ? `2.5px solid ${ACCENT}` : "none" },
        name === "more"
          ? h("div", { fontSize: 11, color: "#3f3f46" }, pct)
          : name && w * width > 54
            ? h("div", { display: "flex", flexDirection: "column" },
                h("div", { fontSize: 11, fontWeight: 600, color: "#0f172a" }, name),
                h("div", { fontSize: 10.5, color: "#0f172a", opacity: 0.75 }, pct))
            : null)),
    lit
      ? h("div", { position: "absolute", left: lit[0] * width - 30, top: (lit[1] + lit[3]) * height + 6, display: "flex", flexDirection: "column", gap: 3, padding: "8px 11px", backgroundColor: "#fff", borderRadius: 10, border: `1px solid ${ACCENT}55`, boxShadow: "0 12px 28px rgba(24,24,27,0.16)" },
          h("div", { fontSize: 12, fontWeight: 600, color: "#18181b" }, `${lit[4]} · ${lit[5]} of Yes`),
          h("div", { fontSize: 11, color: ACCENT }, "Inspect this holder →"))
      : null);
}

const marketHolders = () =>
  Frame(
    { backgroundColor: PAPER },
    ...HolderHeadline(
      "TOP HOLDERS BY MARKET",
      [holderLine(54, ["Who holds"]), holderLine(54, [word("YES", YES), word("and", "#18181b"), word("NO?", NO)])],
      "EVERY WALLET. BOTH SIDES.",
    ),
    HolderWindow(
      { left: 636, top: 84, title: "Fed decision in December" },
      panelTitle("Holder heatmap"),
      h("div", { display: "flex", gap: 8 }, Chip("New wallet 13", ACCENT), Chip("First trade ever", NEWS), Chip("Holds Yes and No 9", "#a855f7")),
      h("div", { display: "flex", gap: 12 },
        ...[
          ["Yes", "860 holders", "Top 10 hold 55%", YES, [[0, 0, 0.42, 0.5, "whale_42", "16.2%"], [0.42, 0, 0.3, 0.3, "CharityS", "7.5%"], [0.72, 0, 0.28, 0.3, "Hugewin", "5.6%"], [0, 0.5, 0.42, 0.22, "truthtell", "5.5%"], [0.42, 0.3, 0.3, 0.22, "MisTKy", "4.5%"], [0.72, 0.3, 0.14, 0.22, "", ""], [0.86, 0.3, 0.14, 0.22, "", ""], [0, 0.72, 1, 0.28, "more", "831 more · 24.5%"]], 4],
          ["No", "229 holders", "Top 10 hold 61%", NO, [[0, 0, 0.55, 0.62, "pako", "21.4%"], [0.55, 0, 0.45, 0.35, "gokol", "12.0%"], [0.55, 0.35, 0.25, 0.27, "classified", "6.1%"], [0.8, 0.35, 0.2, 0.27, "", ""], [0, 0.62, 0.3, 0.16, "leoeagle", "4.0%"], [0.3, 0.62, 0.35, 0.16, "", ""], [0, 0.78, 1, 0.22, "more", "214 more · 22.3%"]], -1],
        ].map(([side, count, top, color, tiles, highlight]) =>
          h("div", { display: "flex", flexDirection: "column", gap: 8, width: 256, padding: "10px 12px", border: "1px solid #ececef", borderRadius: 12 },
            h("div", { display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "#18181b" },
              h("div", { width: 8, height: 8, borderRadius: 9999, backgroundColor: color }), side, h("div", { fontSize: 11, color: "#71717a" }, count)),
            h("div", { fontSize: 11, color: "#71717a" }, top),
            Treemap({ width: 230, height: 316, color, tiles, highlight })))),
    ),
    Sticker(
      { left: 560, top: 522, transform: "rotate(-7deg)", backgroundColor: NO, borderRadius: 10, padding: "10px 16px", flexDirection: "column", gap: 2, border: "2px dashed rgba(255,255,255,0.7)" },
      h("div", { ...mono, fontSize: 11, letterSpacing: 1.8, color: "rgba(255,255,255,0.9)" }, "LARGEST NO HOLDER"),
      h("div", { fontSize: 26, fontWeight: 900, color: "#fff", letterSpacing: -0.6 }, "21.4% OF NO")),
  );

function WalletMovesChart({ width, height }) {
  const n = 56;
  const yes = priceSeries(19, n, 0.34, 0.006);
  const x = (i) => (i / (n - 1)) * width;
  const y = (v) => height - v * height;
  const line = yes.map((v, i) => `${i ? `H${x(i).toFixed(1)}V` : "M0 "}${y(v).toFixed(1)}`).join(" ");
  const moves = [[4, 9, true], [9, 6, true], [14, 12, true], [20, 5, true], [27, 14, true], [33, 7, false], [40, 10, true], [46, 8, false], [51, 11, false]];
  const svg = svgUri(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    ${[0.25, 0.5, 0.75].map((g) => `<line x1="0" x2="${width}" y1="${height * g}" y2="${height * g}" stroke="#f0f0f2"/>`).join("")}
    <path d="${line}" fill="none" stroke="${YES}" stroke-width="2.2"/>
    ${moves.map(([i, r, buy]) => `<circle cx="${x(i)}" cy="${y(yes[i])}" r="${r}" fill="${buy ? YES : "#fff"}" fill-opacity="${buy ? 0.55 : 1}" stroke="${YES}" stroke-width="2"/>`).join("")}
    <circle cx="${x(27)}" cy="${y(yes[27])}" r="18" fill="none" stroke="${ACCENT}" stroke-width="2.5"/>
  </svg>`);
  return h("div", { position: "relative", display: "flex", width, height },
    img(svg, { width, height }),
    h("div", { position: "absolute", left: x(27) + 26, top: y(yes[27]) - 70, display: "flex", flexDirection: "column", gap: 3, width: 210, padding: "9px 11px", backgroundColor: "#fff", borderRadius: 10, border: `1px solid ${ACCENT}55`, boxShadow: "0 10px 24px rgba(24,24,27,0.12)" },
      h("div", { fontSize: 12, fontWeight: 600, color: "#18181b" }, "Bought 42,000 Yes at 44¢"),
      h("div", { fontSize: 10.5, color: "#71717a" }, "$18,480 · Nov 9, 2:46 PM")));
}

const walletTracker = () =>
  Frame(
    { backgroundColor: PAPER },
    ...HolderHeadline(
      "WALLET TRACKER",
      [holderLine(54, ["Where did this"]), holderLine(54, ["trader make"]), holderLine(54, ["their money?"])],
      "POSITIONS. P&L. EVERY MOVE.",
    ),
    HolderWindow(
      { left: 636, top: 84, title: "whale_42" },
      h("div", { display: "flex", gap: 10 },
        ...[["Realized P&L", "+$197.8K", "#0f9f6e"], ["Open P&L", "−$35.2K", "#e5484d"], ["Skill Score", "+24", "#18181b"]].map(([label, value, color]) =>
          h("div", { display: "flex", flexDirection: "column", gap: 4, width: 168, padding: "10px 12px", backgroundColor: "#f7f7f8", borderRadius: 10 },
            h("div", { fontSize: 11, color: "#71717a" }, label),
            h("div", { ...mono, fontSize: 20, fontWeight: 600, color }, value)))),
      h("div", { display: "flex", flexDirection: "column", gap: 8, border: "1px solid #ececef", borderRadius: 12, padding: "12px 14px" },
        h("div", { display: "flex", alignItems: "center", gap: 10 }, panelTitle("Their moves on the price"), Chip("Fed decision in December", ACCENT)),
        WalletMovesChart({ width: 494, height: 190 }),
        h("div", { display: "flex", gap: 16, fontSize: 11, color: "#71717a" },
          h("div", { display: "flex", alignItems: "center", gap: 6 }, h("div", { width: 9, height: 9, borderRadius: 9999, backgroundColor: YES, opacity: 0.6 }), "Buy"),
          h("div", { display: "flex", alignItems: "center", gap: 6 }, h("div", { width: 9, height: 9, borderRadius: 9999, border: `2px solid ${YES}` }), "Sell"),
          "Bigger dots mean more money")),
      h("div", { display: "flex", flexDirection: "column", border: "1px solid #ececef", borderRadius: 12, overflow: "hidden" },
        ...[["4:05 PM", "Fed decision in December", "Buy Yes", "71¢", "$3,550"], ["1:12 PM", "Bitcoin above $120K in Dec?", "Sell No", "64¢", "$3,120"]].map((row) =>
          h("div", { display: "flex", padding: "8px 12px", borderBottom: "1px solid #f4f4f5", ...mono, fontSize: 11.5, color: "#3f3f46" },
            h("div", { width: 66, color: "#71717a" }, row[0]),
            h("div", { width: 210, fontFamily: "Geist", fontSize: 12.5, color: "#18181b" }, row[1]),
            h("div", { width: 76, color: row[2].startsWith("Buy") ? "#0f9f6e" : "#e5484d" }, row[2]),
            h("div", { width: 46 }, row[3]),
            h("div", { width: 70 }, row[4])))),
    ),
    AlertCard({ left: 560, bottom: 36 }, "LIVE · WHALE_42 TRADED", "Yes buy · 5,000 shares at 71¢", "$3,550 · just now · Fed decision in December"),
  );

const IMAGES = {
  "lychee-research-terminal": researchTerminal,
  "lychee-research-terminal-stickers": researchTerminalStickers,
  "lychee-wordmark": wordmark,
  "polymarket-holder-terminal": holderTerminal,
  "polymarket-market-holders": marketHolders,
  "polymarket-wallet-tracker": walletTracker,
};

/** Guide covers, written to public/images/guides/<slug>/main.png (the path guides use for coverImage/ogImage). */
const GUIDE_IMAGES = {
  "download-kalshi-trade-history": tradeHistoryRecipe,
};

const FONTS = [
  font("Geist", 500, "node_modules/geist/dist/fonts/geist-sans/Geist-Medium.ttf"),
  font("Geist", 600, "node_modules/geist/dist/fonts/geist-sans/Geist-SemiBold.ttf"),
  font("Geist", 900, "node_modules/geist/dist/fonts/geist-sans/Geist-Black.ttf"),
  font("Geist Mono", 500, "node_modules/geist/dist/fonts/geist-mono/GeistMono-Medium.ttf"),
];

const names = process.argv.slice(2);
const outDir = path.join(root, "public/og");

const targets = [
  ...Object.entries(IMAGES).map(([name, render]) => [name, render, path.join(outDir, `${name}.png`)]),
  ...Object.entries(GUIDE_IMAGES).map(([slug, render]) => [slug, render, path.join(root, "public/images/guides", slug, "main.png")]),
];

for (const [name, render, out] of targets) {
  if (names.length && !names.includes(name)) continue;
  const res = new ImageResponse(render(), { width: W, height: H, fonts: FONTS });
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, Buffer.from(await res.arrayBuffer()));
  console.log(`wrote ${path.relative(root, out)}`);
}
