/**
 * One-shot: builds shadcnChartPalettes.json from Tailwind v3 hex + Tailwind v4 OKLCH (mauve/olive/mist/taupe).
 * Run: node scripts/generate-shadcn-chart-palettes.mjs
 */
import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const twMod = require("tailwindcss/colors");
const tw = twMod.default || twMod;

function oklabToLinearSrgb(L, a, b) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;
  return [
    +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

function linearToSrgb8(x) {
  const v = x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055;
  return Math.round(Math.min(255, Math.max(0, v * 255)));
}

function oklchStringToHex(s) {
  const m = String(s)
    .trim()
    .match(/^oklch\(\s*([^)]+)\s*\)$/i);
  if (!m) return null;
  const parts = m[1].split(/\s+/).filter(Boolean);
  if (parts.length < 3) return null;
  let Ls = parts[0];
  let L;
  if (Ls.endsWith("%")) L = parseFloat(Ls) / 100;
  else L = parseFloat(Ls);
  const C = parseFloat(parts[1]);
  const H = parseFloat(parts[2]);
  if (!Number.isFinite(L) || !Number.isFinite(C) || !Number.isFinite(H)) return null;
  const hr = (H * Math.PI) / 180;
  const a = C * Math.cos(hr);
  const b = C * Math.sin(hr);
  const [lr, lg, lb] = oklabToLinearSrgb(L, a, b);
  const r = linearToSrgb8(lr);
  const g = linearToSrgb8(lg);
  const bl = linearToSrgb8(lb);
  const h = (n) => n.toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(bl)}`;
}

/** Tailwind v4 compat (packages/tailwindcss/src/compat/colors.ts) — OKLCH only for bases missing in tw v3. */
const TW4_OKLCH = {
  mauve: {
    50: "oklch(98.5% 0 0)",
    100: "oklch(96% 0.003 325.6)",
    200: "oklch(92.2% 0.005 325.62)",
    300: "oklch(86.5% 0.012 325.68)",
    400: "oklch(71.1% 0.019 323.02)",
    500: "oklch(54.2% 0.034 322.5)",
    600: "oklch(43.5% 0.029 321.78)",
    700: "oklch(36.4% 0.029 323.89)",
    800: "oklch(26.3% 0.024 320.12)",
    900: "oklch(21.2% 0.019 322.12)",
    950: "oklch(14.5% 0.008 326)",
  },
  olive: {
    50: "oklch(98.8% 0.003 106.5)",
    100: "oklch(96.6% 0.005 106.5)",
    200: "oklch(93% 0.007 106.5)",
    300: "oklch(88% 0.011 106.6)",
    400: "oklch(73.7% 0.021 106.9)",
    500: "oklch(58% 0.031 107.3)",
    600: "oklch(46.6% 0.025 107.3)",
    700: "oklch(39.4% 0.023 107.4)",
    800: "oklch(28.6% 0.016 107.4)",
    900: "oklch(22.8% 0.013 107.4)",
    950: "oklch(15.3% 0.006 107.1)",
  },
  mist: {
    50: "oklch(98.7% 0.002 197.1)",
    100: "oklch(96.3% 0.002 197.1)",
    200: "oklch(92.5% 0.005 214.3)",
    300: "oklch(87.2% 0.007 219.6)",
    400: "oklch(72.3% 0.014 214.4)",
    500: "oklch(56% 0.021 213.5)",
    600: "oklch(45% 0.017 213.2)",
    700: "oklch(37.8% 0.015 216)",
    800: "oklch(27.5% 0.011 216.9)",
    900: "oklch(21.8% 0.008 223.9)",
    950: "oklch(14.8% 0.004 228.8)",
  },
  taupe: {
    50: "oklch(98.6% 0.002 67.8)",
    100: "oklch(96% 0.002 17.2)",
    200: "oklch(92.2% 0.005 34.3)",
    300: "oklch(86.8% 0.007 39.5)",
    400: "oklch(71.4% 0.014 41.2)",
    500: "oklch(54.7% 0.021 43.1)",
    600: "oklch(43.8% 0.017 39.3)",
    700: "oklch(36.7% 0.016 35.7)",
    800: "oklch(26.8% 0.011 36.5)",
    900: "oklch(21.4% 0.009 43.1)",
    950: "oklch(14.7% 0.004 49.3)",
  },
};

const SHADE_KEYS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

const BASE_ORDER = [
  "neutral",
  "stone",
  "zinc",
  "slate",
  "gray",
  "mauve",
  "olive",
  "mist",
  "taupe",
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose",
];

const out = {};
for (const id of BASE_ORDER) {
  out[id] = {};
  if (tw[id] && typeof tw[id] === "object" && tw[id][50]) {
    for (const k of SHADE_KEYS) {
      out[id][k] = tw[id][k];
    }
  } else if (TW4_OKLCH[id]) {
    for (const k of SHADE_KEYS) {
      const hx = oklchStringToHex(TW4_OKLCH[id][k]);
      if (!hx) throw new Error(`bad oklch ${id} ${k}`);
      out[id][k] = hx;
    }
  } else {
    throw new Error(`missing palette for ${id}`);
  }
}

const dest = path.join(__dirname, "../src/components/chartView/panels/shadcnChartPalettes.json");
fs.writeFileSync(dest, `${JSON.stringify(out, null, 2)}\n`);
console.log("wrote", dest);
