import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const MEDIA =
  "/Users/rikeshthapa/Library/Application Support/Cursor/AgentStores/cursor_agent_stores/bc-433d0a24-d126-43b8-810b-24aadd50e5d0/files/media/jarvis-nav-banner";
const BASE = process.env.E2E_BASE || "http://127.0.0.1:3023";
const TIP = process.env.E2E_TIP || "unknown";

fs.mkdirSync(MEDIA, { recursive: true });
const results = [];

function record(name, pass, detail = "") {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function shot(page, name) {
  const stage = page.locator("[data-war-room-demo]").first();
  await stage.waitFor({ state: "visible", timeout: 15000 }).catch(() => {});
  const box = await stage.boundingBox();
  const out = path.join(MEDIA, name);
  await page.screenshot({
    path: out,
    clip: box
      ? {
          x: Math.max(0, box.x - 8),
          y: Math.max(0, Math.min(box.y - 56, 40)),
          width: Math.min(1420, box.width + 16),
          height: Math.min(780, box.height + 64),
        }
      : undefined,
  });
  console.log("shot", name, fs.statSync(out).size);
}

async function openSearch(page, q) {
  const search = page.locator(
    ".pointer-events-auto input[aria-label='Search markets, holders, news, and price feeds']",
  );
  await search.click();
  await search.fill(q);
  await page.waitForFunction(
    () => [...document.querySelectorAll(".pointer-events-auto div.absolute a")].length > 0,
    null,
    { timeout: 45000 },
  );
}

async function pickByHref(page, pred) {
  const links = page.locator(".pointer-events-auto div.absolute a");
  const n = await links.count();
  for (let i = 0; i < n; i++) {
    const a = links.nth(i);
    const href = (await a.getAttribute("href")) || "";
    const text = (await a.innerText()).replace(/\s+/g, " ");
    if (pred(href, text)) return { a, href, text };
  }
  return null;
}

async function measureScroll(page, clickEl) {
  // Measure from the browser click event → first scrollY change (exclude Playwright overhead).
  await page.evaluate(() => {
    window.__jarvisScrollProbe = { t0: 0, firstMoveMs: null, y0: window.scrollY };
    window.addEventListener(
      "click",
      () => {
        const probe = window.__jarvisScrollProbe;
        probe.t0 = performance.now();
        probe.y0 = window.scrollY;
        probe.firstMoveMs = null;
        const start = performance.now();
        const tick = () => {
          if (window.scrollY !== probe.y0) {
            probe.firstMoveMs = performance.now() - probe.t0;
            return;
          }
          if (performance.now() - start < 3000) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { capture: true, once: true },
    );
  });
  await clickEl.click();
  let firstMove = null;
  for (let i = 0; i < 80; i++) {
    firstMove = await page.evaluate(() => window.__jarvisScrollProbe?.firstMoveMs ?? null);
    if (firstMove != null) break;
    await page.waitForTimeout(25);
  }
  for (let i = 0; i < 50; i++) {
    const near = await page.evaluate(() => {
      const demo = document.querySelector("#demo");
      if (!demo) return false;
      const top = demo.getBoundingClientRect().top;
      return top < window.innerHeight * 0.35 && top > -80;
    });
    if (near) break;
    await page.waitForTimeout(100);
  }
  return { firstMove, finalY: await page.evaluate(() => window.scrollY) };
}

async function readDemoState(page) {
  return page.evaluate(() => {
    const demo = document.querySelector("[data-war-room-demo]");
    const text = (demo?.textContent || "").replace(/\s+/g, " ");
    return {
      hasRail: /ALL TRADABLE MARKETS BY VOLUME/i.test(text),
      hasNewsRail: /ALL TRADABLE TRADES/i.test(text),
      hasExplore: /Sort markets by/i.test(text),
      hasAgent: /Agent steps/i.test(text),
      hasPardon: /pardon/i.test(text),
      hasTate: /Tate|Andrew/i.test(text),
      hasLeftDetail:
        /Price|Move|Vol 24h|Region/i.test(text) &&
        (/Research Market|Research Holders|Trades/i.test(text) || /¢/.test(text)),
      scrollY: Math.round(window.scrollY),
      demoInView: (() => {
        const el = document.querySelector("#demo");
        if (!el) return false;
        const r = el.getBoundingClientRect();
        return r.top < window.innerHeight * 0.4 && r.bottom > 80;
      })(),
      sample: text.slice(0, 280),
    };
  });
}

async function runCase(page, key, pred) {
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 180000 });
  await page.waitForTimeout(2800);
  await openSearch(page, "Trump pardon");
  const hit = await pickByHref(page, pred);
  if (!hit) {
    record(`${key}.find_hit`, false, "missing");
    return;
  }
  record(`${key}.find_hit`, true, hit.text.slice(0, 90));
  const scroll = await measureScroll(page, hit.a);
  record(
    `${key}.immediate_scroll`,
    scroll.firstMove != null && scroll.firstMove <= 800,
    `firstMoveMs=${scroll.firstMove}`,
  );
  await page.waitForTimeout(4000);
  const st = await readDemoState(page);
  record(`${key}.demo_in_view`, st.demoInView, `y=${st.scrollY}`);
  record(
    `${key}.left_panel_opens`,
    st.hasLeftDetail && st.hasPardon,
    st.hasTate ? "tate" : st.sample,
  );
  record(`${key}.right_rail_hidden`, !st.hasRail && !st.hasNewsRail, "");
  record(`${key}.no_explore_flood_chrome`, !st.hasExplore, "");
  record(`${key}.agent_steps_optional`, true, st.hasAgent ? "visible" : "absent");
  record(`${key}.no_all_tradable_flood`, !st.hasRail, "");
  await shot(page, `e2e-${key}-trump-pardon.png`);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(90000);

await runCase(
  page,
  "poly",
  (href, text) =>
    href.includes("market=polymarket") && (/Andrew Tate/i.test(text) || /pardon/i.test(text)),
);
await runCase(
  page,
  "kalshi",
  (href, text) => href.includes("market=kalshi") && /pardon/i.test(text),
);

await browser.close();
const fails = results.filter((r) => !r.pass);
console.log("\n=== SUMMARY ===");
console.log(`pass ${results.filter((r) => r.pass).length}/${results.length}`);
for (const f of fails) console.log("FAIL", f.name, f.detail);
fs.writeFileSync(
  path.join(MEDIA, "e2e-results.json"),
  JSON.stringify(
    { tip: TIP, base: BASE, at: new Date().toISOString(), results, fails: fails.map((f) => f.name) },
    null,
    2,
  ),
);
process.exit(fails.length ? 1 : 0);
