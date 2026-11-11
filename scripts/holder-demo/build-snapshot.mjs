#!/usr/bin/env node
/**
 * Turns a Holder Terminal recording of one market and one of its holders into a saved pair the
 * landing page's hero demo plays back.
 *
 *   1. With the dev server running, open
 *      /polymarket-holder-terminal?recordDemo=1&recordMarket=<conditionId>&recordTrader=<wallet>
 *      and wait for the recorder's panels to fill (a few minutes for the holder lookups).
 *   2. Save `JSON.stringify(window.__holderDemo.dump())` to .local/holder-demo/<name>.json.
 *   3. node scripts/holder-demo/build-snapshot.mjs <name> [recording.json]
 *
 * Writes src/lib/holderLanding/demoPairs/<name>.json and copies the images it shows first into
 * public/holder-demo/<name>/, so the demo plays with no network at all. The demo lists its pairs
 * in components/holderLanding/demo/demoSession.jsx.
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const NAME = process.argv[2];
if (!NAME || !/^[a-z0-9-]+$/.test(NAME)) throw new Error("Name the pair, e.g. `node scripts/holder-demo/build-snapshot.mjs newsom`.");
const RAW = resolve(process.argv[3] || join(ROOT, `.local/holder-demo/${NAME}.json`));
const OUT = join(ROOT, `src/lib/holderLanding/demoPairs/${NAME}.json`);
const IMAGE_DIR = join(ROOT, `public/holder-demo/${NAME}`);
const IMAGE_URL = `/holder-demo/${NAME}`;
const IMAGE_PX = 96;

/** What the demo's search shows for the typed query, for pairs the demo searches for. Real markets, picked by hand. */
const SEARCHES = {
  newsom: {
    query: "gavin newsom 2028",
    suggestions: [
      { conditionId: "0x52226ec4393285ffc942019f20e3210e9311fc64cf1c7a9d1e9fbf27237352a6", title: "Will Gavin Newsom announce a Presidential run by December 31, 2026?", volume: 70875, icon: "https://polymarket-upload.s3.us-east-2.amazonaws.com/will-gavin-newsom-announce-presidential-run-by-2pO1J7ud3cLi.jpg" },
      { conditionId: "0xd2401a2ead0226a29901704e04fba02ab6612260e3246bc805830621ea6a8ae9", title: "Newsom flips Vance for 2028 president by March 31?", volume: 9677, icon: "https://polymarket-upload.s3.us-east-2.amazonaws.com/presidential-election-winner-2024-afdda358-219d-448a-abb5-ba4d14118d71.png" },
      { conditionId: "", title: "Gavin Newsom 2028 presidential odds leader on November 30?", volume: 3277, icon: "https://polymarket-upload.s3.us-east-2.amazonaws.com/presidential-election-winner-2024-afdda358-219d-448a-abb5-ba4d14118d71.png" },
    ],
  },
};
const { query: QUERY = "", suggestions: SUGGESTIONS = [] } = SEARCHES[NAME] || {};

const LIMITS = { activity: 200, positions: 150, finished: 300, articles: 150, firstImages: 24 };
const DROP = new Set(["profile_image", "profile_image_optimized", "bio", "source_block", "interval", "fidelity", "source_fidelity"]);

function round(value) {
  if (!Number.isFinite(value) || Number.isInteger(value)) return value;
  return Number(value.toPrecision(7));
}

function lean(value) {
  if (Array.isArray(value)) return value.map(lean);
  if (value && typeof value === "object") {
    const out = {};
    for (const [key, item] of Object.entries(value)) {
      if (DROP.has(key)) continue;
      out[key] = lean(item);
    }
    return out;
  }
  return typeof value === "number" ? round(value) : value;
}

/** Every third daily point, except the last four months, which the period panels read day by day. */
function thinPnl(rows) {
  const keepFrom = rows.length - 120;
  return rows.filter((_, index) => index >= keepFrom || index % 3 === 0);
}

/** Fields every row shares are stored once; the demo spreads `common` back into each row. */
function factor(rows) {
  const common = {};
  for (const [key, value] of Object.entries(rows[0] || {})) {
    if (rows.every((row) => row[key] === value)) common[key] = value;
  }
  return { common, rows: rows.map((row) => Object.fromEntries(Object.entries(row).filter(([key]) => !(key in common)))) };
}

function topBy(rows, limit, score) {
  if (rows.length <= limit) return rows;
  const keep = new Set([...rows].sort((a, b) => score(b) - score(a)).slice(0, limit));
  return rows.filter((row) => keep.has(row));
}

const images = new Map();

function localImage(url) {
  if (!url || !/^https?:\/\//.test(url)) return url;
  if (!images.has(url)) images.set(url, `${IMAGE_URL}/${createHash("sha1").update(url).digest("hex").slice(0, 12)}.png`);
  return images.get(url);
}

async function downloadImages() {
  rmSync(IMAGE_DIR, { recursive: true, force: true });
  mkdirSync(IMAGE_DIR, { recursive: true });
  const failed = [];
  await Promise.all(
    [...images].map(async ([url, path]) => {
      const file = join(ROOT, "public", path);
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(String(res.status));
        const source = `${file}.src`;
        writeFileSync(source, Buffer.from(await res.arrayBuffer()));
        execFileSync("sips", ["-Z", String(IMAGE_PX), "-s", "format", "png", source, "--out", file], { stdio: "ignore" });
        rmSync(source, { force: true });
      } catch (err) {
        rmSync(`${file}.src`, { force: true });
        failed.push({ url, path, reason: err.message });
      }
    }),
  );
  return failed;
}

const raw = JSON.parse(readFileSync(RAW, "utf8"));
const { market, trader, feeds } = raw;
if (!market?.meta || !trader?.profile || !feeds?.trades?.length) throw new Error("The recording is missing the market, the trader, or the trades.");

const meta = { ...market.meta, icon: localImage(market.meta.icon), image: localImage(market.meta.image) };
const stats = { ...market.stats, icon: meta.icon, image: meta.image };

const holderSides = market.holders.sides.map((side) => ({
  ...side,
  rows: side.rows.map((row, index) => ({ ...row, image: index < LIMITS.firstImages ? localImage(row.image) : row.image, changedAt: 0 })),
}));
const supplySides = market.supply.sides.map((side) => ({
  ...side,
  rows: side.rows.map(({ wallet, name, pseudonym, amount, avgPrice, cost, price, value, realized, unrealized, total }) => ({
    wallet,
    name,
    pseudonym,
    amount,
    avgPrice,
    cost,
    price,
    value,
    realized,
    unrealized,
    total,
  })),
}));

const firstIcons = (rows) => rows.map((row, index) => (index < LIMITS.firstImages && row.icon ? { ...row, icon: localImage(row.icon) } : row));
const positions = firstIcons(topBy(trader.positions.rows, LIMITS.positions, (row) => Number(row.current_value) || 0));
const finished = firstIcons(trader.finishedPart.rows.slice(0, LIMITS.finished));
const activity = firstIcons(trader.activity.rows.slice(0, LIMITS.activity));
const profileRows = trader.profile.rows.map((row) => ({ ...row, profileImage: localImage(row.profileImage) }));

const fills = {};
for (const [key, rows] of Object.entries(feeds.fills)) fills[key] = factor(rows.map((row) => ({ ...row, icon: meta.icon })));

const news = {};
for (const [source, entry] of Object.entries(feeds.news)) {
  const result = entry.result?.articles ? { ...entry.result, articles: entry.result.articles.slice(0, LIMITS.articles) } : entry.result;
  news[source] = { params: entry.params, result };
}

const snapshot = lean({
  recordedAt: raw.recordedAt,
  query: QUERY,
  suggestions: [
    { conditionId: meta.conditionId, title: meta.title, volume: Number(meta.volume) || 0, icon: meta.icon, featured: true },
    ...SUGGESTIONS.map((item) => ({ ...item, icon: localImage(item.icon) })),
  ],
  market: {
    subject: { kind: "market", conditionId: meta.conditionId, title: meta.title, slug: meta.slug },
    meta,
    stats,
    status: market.status,
    trades: factor(feeds.trades),
    holders: { sides: holderSides },
    details: market.details,
    supply: { sides: supplySides },
    life: feeds.life,
  },
  trader: {
    subject: { ...trader.subject, title: trader.displayName },
    displayName: trader.displayName,
    profile: { ...trader.profile, rows: profileRows },
    activity: { ...trader.activity, rows: activity },
    pnl: { ...trader.pnl, rows: thinPnl(trader.pnl.rows) },
    skill: trader.skill,
    positions: { ...trader.positions, rows: positions },
    finishedPart: { ...trader.finishedPart, rows: finished, done: true, more: false },
    categories: trader.categories,
  },
  feeds: { prices: feeds.prices, news, markets: { [meta.conditionId]: meta }, fills },
});

const failed = await downloadImages();
let text = JSON.stringify(snapshot);
// An image that didn't download keeps its remote address rather than pointing at a missing file.
for (const { url, path } of failed) text = text.replaceAll(JSON.stringify(path), JSON.stringify(url));
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${text}\n`);

const kb = (bytes) => `${Math.round(bytes / 1024)} KB`;
console.log(`Wrote ${OUT.replace(`${ROOT}/`, "")} (${kb(text.length)}) and ${images.size - failed.length} images.`);
if (failed.length) console.warn(`Couldn't fetch:\n  ${failed.map(({ url, reason }) => `${url} (${reason})`).join("\n  ")}`);
if (meta.icon && !existsSync(join(ROOT, "public", meta.icon))) console.warn("The market icon didn't download.");
