import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const MEDIA =
  "/Users/rikeshthapa/Library/Application Support/Cursor/AgentStores/cursor_agent_stores/bc-433d0a24-d126-43b8-810b-24aadd50e5d0/files/media/jarvis-nav-banner";
const ART =
  "/Users/rikeshthapa/Library/Application Support/Cursor/User/globalStorage/anysphere.cursor-agent-worker/worker-data/cursor-agent-worker-ca20ae616a/artifacts";
const BASE = process.env.E2E_BASE || "http://127.0.0.1:3026";
const TIP = process.env.E2E_TIP || "unknown";
const QUERY = "next president of finland";

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

async function readState(page) {
  return page.evaluate(() => {
    const root = document.querySelector("[data-war-room-theme]") || document.body;
    const text = (root?.textContent || "").replace(/\s+/g, " ");
    return {
      hasAllTradable: /ALL TRADABLE MARKETS BY VOLUME/i.test(text),
      hasSortMarkets: /SORT MARKETS BY/i.test(text),
      hasExploreFlood: /Just listed|By liquidity|Competitive/i.test(text),
      hasFinland: /Finland|Finnish|Helsinki|president/i.test(text),
      hasLeftDetail:
        /Price|Move|Vol 24h|Region|Research Market|Research Holders|Trades/i.test(text) || /¢/.test(text),
      hasAgentFlood: /fetch_markets RUNNING|update_rails RUNNING/i.test(text) && /40\.\d+s/.test(text),
      sample: text.slice(0, 400),
    };
  });
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(90000);

await page.goto(`${BASE}/war-room`, { waitUntil: "domcontentloaded", timeout: 180000 });
await page.waitForTimeout(3000);

const search = page
  .locator(
    "header input[aria-label='Search markets, holders, news, and price feeds'], input[aria-label='Search markets, holders, news, and price feeds']",
  )
  .first();
await search.click();
await search.fill(QUERY);
const foundUi = await page
  .waitForFunction(
    () => {
      const links = [...document.querySelectorAll("div.absolute a")];
      return links.some((a) => {
        const t = (a.textContent || "").replace(/\s+/g, " ");
        const href = a.getAttribute("href") || "";
        return (
          href.includes("market=polymarket") &&
          /finland|finnish/i.test(t) &&
          /president|prime\s*minister|stubb|haavisto|orpo|lindtman/i.test(t)
        );
      });
    },
    null,
    { timeout: 90000 },
  )
  .then(() => true)
  .catch(() => false);
record("ui_finland_hit_appeared", foundUi, foundUi ? "ok" : "will fallback to direct pick");

const STUBB =
  "polymarket:0xe91b26e02e0a35d164b243a1b1a70d5886441084e9da1f3f664f052730030cbb";
const ORPO =
  "polymarket:0x8ba32f3dd80456ecacd4d05f68c4b43b4689bbd3bb562352bf2d2b30501b65a0";

const links = page.locator("div.absolute a");
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
    /finland|finnish/i.test(text) &&
    /president|prime\s*minister|stubb|haavisto|orpo|lindtman/i.test(text)
  ) {
    hit = a;
    hitText = text;
    hitHref = href;
    break;
  }
}
record(
  "find_finland_polymarket_ui",
  Boolean(hit),
  hit ? `${hitText.slice(0, 120)} | ${hitHref.slice(0, 100)}` : "UI miss — direct pick fallback",
);

if (hit) {
  await hit.click();
} else {
  // Same contract as requestWarRoomMarketPick (sticky lens + event).
  await page.evaluate(
    ({ marketId, title }) => {
      const detail = { marketId, selectOnly: true, title, venue: "Polymarket", at: Date.now() };
      try {
        sessionStorage.setItem("lychee:war-room-pick-lens", JSON.stringify(detail));
      } catch {}
      const href = `/war-room?market=${encodeURIComponent(marketId)}`;
      if (location.pathname + location.search !== href) history.replaceState(null, "", href);
      window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent("lychee:war-room-market-pick", { detail }));
      }, 0);
    },
    { marketId: ORPO, title: "Will Petteri Orpo be the next Prime Minister of Finland?" },
  );
}
void STUBB;

// Critical window: select-only must hold BEFORE post-focus desk stream (~1.6s).
await page.waitForTimeout(900);
const early = await readState(page);
record("early_select_only_no_all_tradable", !early.hasAllTradable, early.hasAllTradable ? "RAIL" : "ok");
record("early_select_only_no_explore", !early.hasSortMarkets && !early.hasExploreFlood, "");
record("early_left_panel", early.hasLeftDetail && early.hasFinland, early.sample.slice(0, 160));
record("url_has_market", /market=polymarket/i.test(page.url()), page.url().slice(0, 140));

await shot(page, "e2e-finland-president.png");

// After focus stream: left panel must remain; desk may appear — but prove we did not lose the pick.
await page.waitForTimeout(2500);
const late = await readState(page);
record("late_left_panel_persists", late.hasLeftDetail && late.hasFinland, late.sample.slice(0, 160));
record("stayed_on_war_room", /\/war-room/.test(page.url()), page.url());

await browser.close();
const fails = results.filter((r) => !r.pass);
console.log("\n=== SUMMARY ===");
console.log(`pass ${results.filter((r) => r.pass).length}/${results.length}`);
for (const f of fails) console.log("FAIL", f.name, f.detail);
fs.writeFileSync(
  path.join(MEDIA, "e2e-finland-results.json"),
  JSON.stringify(
    { tip: TIP, base: BASE, query: QUERY, at: new Date().toISOString(), results, fails: fails.map((r) => r.name) },
    null,
    2,
  ),
);
process.exit(fails.length ? 1 : 0);
