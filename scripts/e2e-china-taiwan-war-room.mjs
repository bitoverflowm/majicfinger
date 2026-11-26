import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const MEDIA =
  "/Users/rikeshthapa/Library/Application Support/Cursor/AgentStores/cursor_agent_stores/bc-433d0a24-d126-43b8-810b-24aadd50e5d0/files/media/jarvis-nav-banner";
const ART =
  "/Users/rikeshthapa/Library/Application Support/Cursor/User/globalStorage/anysphere.cursor-agent-worker/worker-data/cursor-agent-worker-ca20ae616a/artifacts";
const BASE = process.env.E2E_BASE || "http://127.0.0.1:3025";
const TIP = process.env.E2E_TIP || "unknown";
const QUERY = "will China invade taiwan in 2027";

fs.mkdirSync(MEDIA, { recursive: true });
fs.mkdirSync(ART, { recursive: true });
const results = [];

function record(name, pass, detail = "") {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function shot(page, name) {
  const outMedia = path.join(MEDIA, name);
  const outArt = path.join(ART, name);
  await page.screenshot({ path: outMedia, fullPage: false });
  fs.copyFileSync(outMedia, outArt);
  console.log("shot", name, fs.statSync(outMedia).size);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(90000);

await page.goto(`${BASE}/war-room`, { waitUntil: "domcontentloaded", timeout: 180000 });
await page.waitForTimeout(3500);

const search = page.locator(
  "header input[aria-label='Search markets, holders, news, and price feeds'], input[aria-label='Search markets, holders, news, and price feeds']",
).first();
await search.click();
await search.fill(QUERY);
await page.waitForFunction(
  () => {
    const links = [...document.querySelectorAll("div.absolute a, .pointer-events-auto a")];
    return links.some((a) => {
      const t = (a.textContent || "").replace(/\s+/g, " ");
      const href = a.getAttribute("href") || "";
      return (
        href.includes("market=polymarket") &&
        /invade/i.test(t) &&
        /taiwan/i.test(t) &&
        /2027/i.test(t)
      );
    });
  },
  null,
  { timeout: 60000 },
);

const links = page.locator("div.absolute a, .pointer-events-auto a");
const n = await links.count();
let hit = null;
let hitText = "";
let hitHref = "";
for (let i = 0; i < n; i++) {
  const a = links.nth(i);
  const text = ((await a.innerText().catch(() => "")) || "").replace(/\s+/g, " ");
  const href = (await a.getAttribute("href").catch(() => "")) || "";
  if (
    href.includes("market=polymarket") &&
    /invade/i.test(text) &&
    /taiwan/i.test(text) &&
    /2027/i.test(text)
  ) {
    hit = a;
    hitText = text;
    hitHref = href;
    break;
  }
}
record(
  "find_china_taiwan_polymarket",
  Boolean(hit),
  hit ? `${hitText.slice(0, 120)} | ${hitHref.slice(0, 100)}` : "missing Polymarket invade/taiwan/2027 hit",
);
if (!hit) {
  await shot(page, "e2e-china-taiwan-war-room.png");
  console.log("ABORT: no Polymarket hit");
  process.exit(1);
}

await hit.click();
await page.waitForTimeout(4500);

const url = page.url();
record("stayed_on_war_room", /\/war-room/.test(url), url);
record("market_in_url", /market=/.test(url), url.slice(0, 120));

const state = await page.evaluate(() => {
  const root = document.querySelector("[data-war-room-theme]") || document.body;
  const text = (root?.textContent || "").replace(/\s+/g, " ");
  const canvasPins = document.querySelectorAll("canvas").length;
  return {
    hasAllTradable: /ALL TRADABLE MARKETS BY VOLUME/i.test(text),
    hasSortMarkets: /SORT MARKETS BY/i.test(text),
    hasExploreFlood: /Just listed|By liquidity|Competitive/i.test(text),
    hasChina: /China|Taiwan|invade/i.test(text),
    hasLeftDetail:
      /Price|Move|Vol 24h|Region|Research Market|Research Holders|Trades/i.test(text) || /¢/.test(text),
    sample: text.slice(0, 360),
    canvasPins,
  };
});

record("select_only_no_all_tradable", !state.hasAllTradable, state.hasAllTradable ? "RAIL_VISIBLE" : "hidden");
record("select_only_no_explore_flood", !state.hasSortMarkets && !state.hasExploreFlood, state.hasSortMarkets ? "SORT_VISIBLE" : "ok");
record("left_panel_opens", state.hasLeftDetail && state.hasChina, state.sample.slice(0, 160));
record("title_visible", state.hasChina, "");

await shot(page, "e2e-china-taiwan-war-room.png");

await browser.close();
const fails = results.filter((r) => !r.pass);
console.log("\n=== SUMMARY ===");
console.log(`pass ${results.filter((r) => r.pass).length}/${results.length}`);
for (const f of fails) console.log("FAIL", f.name, f.detail);
fs.writeFileSync(
  path.join(MEDIA, "e2e-china-taiwan-results.json"),
  JSON.stringify(
    { tip: TIP, base: BASE, query: QUERY, at: new Date().toISOString(), results, fails: fails.map((r) => r.name) },
    null,
    2,
  ),
);
process.exit(fails.length ? 1 : 0);
