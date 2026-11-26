import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const MEDIA =
  "/Users/rikeshthapa/Library/Application Support/Cursor/AgentStores/cursor_agent_stores/bc-433d0a24-d126-43b8-810b-24aadd50e5d0/files/media/jarvis-nav-banner";
const ART =
  "/Users/rikeshthapa/Library/Application Support/Cursor/User/globalStorage/anysphere.cursor-agent-worker/worker-data/cursor-agent-worker-ca20ae616a/artifacts";
const BASE = process.env.E2E_BASE || "http://127.0.0.1:3024";
const TIP = process.env.E2E_TIP || "unknown";

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
  await page.screenshot({ path: outMedia, clip: { x: 0, y: 0, width: 1440, height: 160 } });
  await page.screenshot({ path: outArt, clip: { x: 0, y: 0, width: 1440, height: 160 } });
  console.log("shot", name, fs.statSync(outMedia).size);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(90000);

await page.goto(`${BASE}/war-room`, { waitUntil: "domcontentloaded", timeout: 180000 });
await page.waitForTimeout(2500);

const headerText = await page.locator("header").first().innerText();
record("logo_lychee_text", /Lychee/i.test(headerText), headerText.slice(0, 80));
record(
  "logo_image",
  (await page.locator('header img[src*="logo"]').count()) > 0,
  "",
);

for (const tab of ["War Room", "Historical", "Present", "Markets", "Holders"]) {
  const n = await page.getByRole("tab", { name: tab }).count();
  record(`tab_${tab.replace(/\s+/g, "_").toLowerCase()}`, n > 0, `count=${n}`);
}

record(
  "get_full_access",
  (await page.getByRole("link", { name: /Get full access/i }).count()) > 0,
  "",
);

const search = page.locator(
  "header input[aria-label='Search markets, holders, news, and price feeds']",
);
record("jarvis_in_header", (await search.count()) > 0, "");

const jarvisBox = await search.first().boundingBox().catch(() => null);
const viewportW = 1440;
if (jarvisBox) {
  const center = jarvisBox.x + jarvisBox.width / 2;
  const centered = Math.abs(center - viewportW / 2) < 180;
  record("jarvis_centered", centered, `center=${Math.round(center)}`);
} else {
  record("jarvis_centered", false, "no box");
}

await shot(page, "war-room-header.png");

// --- News pick on homepage: must not go to /news-archive ---
await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 180000 });
await page.waitForTimeout(2800);
const homeSearch = page.locator(
  ".pointer-events-auto input[aria-label='Search markets, holders, news, and price feeds']",
);
await homeSearch.click();
await homeSearch.fill("Trump");
await page.waitForFunction(
  () => [...document.querySelectorAll(".pointer-events-auto div.absolute a")].length > 0,
  null,
  { timeout: 45000 },
);

const newsLink = page
  .locator(".pointer-events-auto div.absolute a")
  .filter({ hasText: /News for/i })
  .first();
record("news_hit_present", (await newsLink.count()) > 0, "");
if (await newsLink.count()) {
  await newsLink.click();
  await page.waitForTimeout(3500);
  const url = page.url();
  record("news_not_archive", !/news-archive/i.test(url), url);
  const demoNear = await page.evaluate(() => {
    const el = document.querySelector("#demo");
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.top < window.innerHeight * 0.45 && r.bottom > 60;
  });
  record("news_scrolled_demo", demoNear, "");
  const leftNews = await page.evaluate(() => {
    const demo = document.querySelector("[data-war-room-demo]");
    const t = (demo?.textContent || "").replace(/\s+/g, " ");
    return /Related|Publisher|Source|headline|News/i.test(t) || /¢|Research/i.test(t);
  });
  record("news_left_panelish", leftNews, "");
  const stage = page.locator("[data-war-room-demo]").first();
  const box = await stage.boundingBox();
  const newsShot = path.join(MEDIA, "e2e-news-pick.png");
  await page.screenshot({
    path: newsShot,
    clip: box
      ? {
          x: Math.max(0, box.x - 8),
          y: Math.max(0, Math.min(box.y - 56, 40)),
          width: Math.min(1420, box.width + 16),
          height: Math.min(780, box.height + 64),
        }
      : undefined,
  });
  console.log("shot e2e-news-pick.png", fs.statSync(newsShot).size);
}

await browser.close();
const fails = results.filter((r) => !r.pass);
console.log("\n=== SUMMARY ===");
console.log(`pass ${results.filter((r) => r.pass).length}/${results.length}`);
for (const f of fails) console.log("FAIL", f.name, f.detail);
fs.writeFileSync(
  path.join(MEDIA, "e2e-header-results.json"),
  JSON.stringify(
    { tip: TIP, base: BASE, at: new Date().toISOString(), results, fails: fails.map((r) => r.name) },
    null,
    2,
  ),
);
process.exit(fails.length ? 1 : 0);
