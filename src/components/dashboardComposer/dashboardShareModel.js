/**
 * Turns every sheet on a dashboard into share-card pieces, then suggests
 * combinations (a price story, a book, this tab, the whole workspace).
 */

import { pageIdForTab } from "@/lib/workspaceDashboardDocument";
import { isOrderBookSheet, rowsToOrderBook } from "@/components/dashboardComposer/orderBookLadder";
import { isPriceHistorySheet, priceHistoryPoints } from "@/components/dashboardComposer/priceHistorySeries";
import { sheetMarketCaption, sheetMarketName, sheetMarketSide } from "@/lib/markets/marketLife";

const STORY_LIMIT = 4;
const BOOK_LIMIT = 3;

function clip(value, max) {
  const text = String(value || "").trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function cellsToRows(block) {
  const columns = Array.isArray(block?.columns) ? block.columns : [];
  if (Array.isArray(block?.records) && block.records.length) {
    return block.records.map((row) =>
      columns.map((column) => {
        const value = column?.id ? row?.[column.id] : "";
        return value == null ? "" : value;
      }),
    );
  }
  const cells = block?.cells && typeof block.cells === "object" ? block.cells : {};
  const byRow = new Map();
  for (const [key, value] of Object.entries(cells)) {
    const [colText, rowText] = String(key).split(",");
    const col = Number(colText);
    const row = Number(rowText);
    if (!Number.isFinite(col) || !Number.isFinite(row)) continue;
    if (!byRow.has(row)) byRow.set(row, []);
    byRow.get(row)[col] = value;
  }
  return [...byRow.keys()]
    .sort((a, b) => a - b)
    .map((row) => columns.map((_, index) => byRow.get(row)[index] ?? ""));
}

function rowCount(block) {
  if (Array.isArray(block?.records) && block.records.length) return block.records.length;
  const cells = block?.cells && typeof block.cells === "object" ? block.cells : {};
  const rows = new Set();
  for (const key of Object.keys(cells)) {
    const row = Number(String(key).split(",")[1]);
    if (Number.isFinite(row)) rows.add(row);
  }
  return rows.size;
}

function downsample(points, count = 72) {
  if (points.length <= count) return points;
  const step = (points.length - 1) / (count - 1);
  return Array.from({ length: count }, (_, index) => points[Math.round(index * step)]).filter(Boolean);
}

export function formatSharePrice(value) {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  const digits = abs > 0 && abs < 0.01 ? 4 : abs < 1 ? 3 : 2;
  return value.toLocaleString("en", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function formatShareChange(value) {
  if (!Number.isFinite(value)) return "";
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${Math.abs(value).toFixed(2)}%`;
}

function blankSheet(block) {
  const title = String(block?.title || "").trim();
  const filled = rowCount(block) > 0;
  if (filled) return false;
  return !title || /^data sheet$/i.test(title);
}

function sheetAsset(block, tab) {
  if (!block || block.type !== "sheet" || blankSheet(block)) return null;
  const market = sheetMarketName(block);
  const side = sheetMarketSide(block);
  const caption = sheetMarketCaption(block);
  const base = {
    id: String(block.id),
    tabId: tab.id,
    tabName: tab.name,
    title: String(block.title || "").trim() || "Data sheet",
    market,
    side,
    caption,
    rows: rowCount(block),
  };

  if (isPriceHistorySheet(block)) {
    const full = priceHistoryPoints(block);
    if (full.length >= 2) {
      const first = full[0].price;
      const last = full[full.length - 1].price;
      const changePct = first ? ((last - first) / Math.abs(first)) * 100 : null;
      return {
        ...base,
        kind: "price",
        points: downsample(full),
        pointCount: full.length,
        last,
        changePct: Number.isFinite(changePct) ? changePct : null,
      };
    }
  }

  if (isOrderBookSheet(block)) {
    const book = rowsToOrderBook(block.columns || [], cellsToRows(block));
    const bidSize = book.bids.length ? book.bids[book.bids.length - 1].total : 0;
    const askSize = book.asks.length ? book.asks[book.asks.length - 1].total : 0;
    if (book.bids.length || book.asks.length) {
      return {
        ...base,
        kind: "book",
        mid: book.mid,
        bidSize,
        askSize,
        bids: book.bids.slice(0, 5).map((level) => ({ price: level.price, size: level.size })),
        asks: book.asks.slice(0, 5).map((level) => ({ price: level.price, size: level.size })),
      };
    }
  }

  return { ...base, kind: "sheet" };
}

function bestPrice(assets) {
  return [...assets].sort((a, b) => (b.pointCount || 0) - (a.pointCount || 0))[0] || null;
}

/** One book per market, preferring the book with more resting size. */
function uniqueBooks(books) {
  const byMarket = new Map();
  for (const book of books) {
    const key = (book.market || book.id).toLowerCase();
    const prev = byMarket.get(key);
    const size = (book.bidSize || 0) + (book.askSize || 0);
    const prevSize = prev ? (prev.bidSize || 0) + (prev.askSize || 0) : -1;
    if (!prev || size > prevSize) byMarket.set(key, book);
  }
  return [...byMarket.values()];
}

function configCaption(assets, dashboardName) {
  return shareCaption(assets, dashboardName);
}

/**
 * @param {object[]} assets
 * @param {string} dashboardName
 */
export function shareCaption(assets, dashboardName) {
  const name = String(dashboardName || "").trim() || "Dashboard";
  const prices = (assets || []).filter((asset) => asset.kind === "price" && Number.isFinite(asset.last));
  const books = (assets || []).filter((asset) => asset.kind === "book");
  const lines = [];
  if (prices.length === 1) {
    const price = prices[0];
    lines.push(price.market || price.title);
    const bits = [formatSharePrice(price.last)];
    const change = formatShareChange(price.changePct);
    if (change) bits.push(change);
    if (price.side) bits.push(price.side);
    lines.push(bits.join("  ·  "));
    if (price.caption) lines.push(price.caption);
  } else if (prices.length > 1) {
    lines.push(name);
    for (const price of prices.slice(0, 4)) {
      const change = formatShareChange(price.changePct);
      lines.push(`${price.market || price.title}: ${formatSharePrice(price.last)}${change ? ` (${change})` : ""}`);
    }
  } else if (books.length) {
    const book = books[0];
    lines.push(book.market || book.title);
    lines.push(`Mid ${formatSharePrice(book.mid)}`);
    if (book.caption) lines.push(book.caption);
  } else {
    lines.push(name);
    const titles = (assets || []).slice(0, 4).map((asset) => asset.market || asset.title).filter(Boolean);
    if (titles.length) lines.push(titles.join(" · "));
  }
  lines.push("", "Created with Lychee.", "lycheedata.com");
  return lines.join("\n");
}

/**
 * @param {{ tabs: { id: string, name?: string }[], blocksByPage: Record<string, object[]>, activeTabId?: string, dashboardName?: string }} input
 */
export function buildShareModel({ tabs, blocksByPage, activeTabId, dashboardName }) {
  const name = String(dashboardName || "").trim() || "Untitled";
  const tabList = (Array.isArray(tabs) ? tabs : []).map((tab) => ({
    id: String(tab?.id || ""),
    name: String(tab?.name || "").trim() || "Tab",
  }));
  const pages = blocksByPage && typeof blocksByPage === "object" ? blocksByPage : {};

  /** @type {object[]} */
  const assets = [];
  /** @type {{ id: string, name: string, charts: string[], sheetTitles: string[] }[]} */
  const tabSummaries = [];

  for (const tab of tabList) {
    const blocks = Array.isArray(pages[pageIdForTab(tab.id)]) ? pages[pageIdForTab(tab.id)] : [];
    const charts = blocks
      .filter((block) => block?.type === "chart")
      .map((block) => String(block.title || "Chart").trim() || "Chart");
    const sheetTitles = [];
    for (const block of blocks) {
      const asset = sheetAsset(block, tab);
      if (!asset) continue;
      assets.push(asset);
      sheetTitles.push(asset.market || asset.title);
    }
    if (sheetTitles.length || charts.length) {
      tabSummaries.push({ id: tab.id, name: tab.name, charts, sheetTitles });
    }
  }

  /** @type {object[]} */
  const configs = [];
  const prices = assets.filter((asset) => asset.kind === "price");
  const books = assets.filter((asset) => asset.kind === "book");

  const stories = [];
  const seenMarkets = new Set();
  for (const price of [...prices].sort((a, b) => b.pointCount - a.pointCount)) {
    const key = (price.market || price.id).toLowerCase();
    if (seenMarkets.has(key)) continue;
    seenMarkets.add(key);
    stories.push(price);
    if (stories.length >= STORY_LIMIT) break;
  }

  for (const price of stories) {
    const headline = price.market || price.title;
    configs.push({
      id: `story:${price.id}`,
      label: clip(headline, 48),
      blurb: `${formatSharePrice(price.last)} ${formatShareChange(price.changePct)} · ${price.tabName}`.replace(/\s+/g, " ").trim(),
      emphasis: "hero",
      assetIds: [price.id],
      headline,
    });
  }

  for (const tab of tabList) {
    const onTab = assets.filter((asset) => asset.tabId === tab.id);
    const tabPrices = onTab.filter((asset) => asset.kind === "price");
    const tabBooks = onTab.filter((asset) => asset.kind === "book");
    if (!tabPrices.length || !tabBooks.length) continue;
    const hero = bestPrice(tabPrices);
    const picked = [hero.id, ...uniqueBooks(tabBooks).slice(0, 2).map((book) => book.id)];
    configs.push({
      id: `combo:${tab.id}`,
      label: clip(`${tab.name} · price and book`, 48),
      blurb: "Price path with the resting book",
      emphasis: "hero",
      assetIds: picked,
      headline: hero.market || hero.title,
    });
  }

  for (const book of uniqueBooks(books).slice(0, BOOK_LIMIT)) {
    const headline = book.market || book.title;
    configs.push({
      id: `book:${book.id}`,
      label: clip(headline, 48),
      blurb: `Order book · mid ${formatSharePrice(book.mid)}`,
      emphasis: "books",
      assetIds: [book.id],
      headline,
    });
  }

  const distinct = [];
  const marketKeys = new Set();
  for (const price of [...prices].sort((a, b) => b.pointCount - a.pointCount)) {
    if (!price.market) continue;
    const key = price.market.toLowerCase();
    if (marketKeys.has(key)) continue;
    marketKeys.add(key);
    distinct.push(price);
  }
  if (distinct.length >= 2) {
    const picked = distinct.slice(0, 4);
    configs.push({
      id: "markets",
      label: "Markets side by side",
      blurb: picked.map((price) => clip(price.market || price.title, 24)).join(" · "),
      emphasis: "compare",
      assetIds: picked.map((price) => price.id),
      headline: name,
    });
  }

  if (activeTabId) {
    const onTab = assets.filter((asset) => asset.tabId === activeTabId);
    if (onTab.length) {
      const tab = tabList.find((item) => item.id === activeTabId);
      const hero = bestPrice(onTab.filter((asset) => asset.kind === "price"));
      const booksOnTab = uniqueBooks(onTab.filter((asset) => asset.kind === "book"));
      const noted = onTab.filter((asset) => asset.kind === "sheet" && asset.caption);
      const picked = [
        ...(hero ? [hero.id] : []),
        ...booksOnTab.slice(0, 2).map((asset) => asset.id),
        ...noted.slice(0, 2).map((asset) => asset.id),
      ];
      configs.push({
        id: "tab",
        label: "This tab",
        blurb: tab?.name || "Current tab",
        emphasis: hero ? "hero" : booksOnTab.length ? "books" : "mosaic",
        assetIds: picked.length ? picked : onTab.slice(0, 6).map((asset) => asset.id),
        headline: hero?.market || tab?.name || name,
      });
    }
  }

  if (assets.length) {
    configs.push({
      id: "workspace",
      label: "Whole dashboard",
      blurb: `${tabSummaries.length || tabList.length} tabs · ${assets.length} sheets`,
      emphasis: "mosaic",
      assetIds: assets.slice(0, 12).map((asset) => asset.id),
      headline: name,
    });
  }

  if (!configs.length) {
    configs.push({
      id: "empty",
      label: name,
      blurb: "Add a sheet to build a card",
      emphasis: "empty",
      assetIds: [],
      headline: name,
    });
  }

  const currentFirst = (config) => {
    if (config.id === "workspace" || config.id === "empty") return 2;
    const onCurrent = config.assetIds.some((id) => assets.find((asset) => asset.id === id)?.tabId === activeTabId);
    if (config.id.startsWith("combo") && onCurrent) return 0;
    if (onCurrent) return 1;
    return 2;
  };
  configs.sort((a, b) => currentFirst(a) - currentFirst(b));

  for (const config of configs) {
    const picked = config.assetIds.map((id) => assets.find((asset) => asset.id === id)).filter(Boolean);
    config.caption = configCaption(picked, name);
  }

  return { dashboardName: name, assets, configs, tabs: tabSummaries };
}
