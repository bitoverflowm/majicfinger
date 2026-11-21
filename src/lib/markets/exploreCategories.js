/**
 * Explore chips shared by Holder Markets Explore and War Room.
 * Feeds rank/list markets; categories filter by Polymarket tags (and title fallbacks).
 */

/** Same feed options as Holder “Markets to show”. */
export const EXPLORE_FEEDS = [
  { id: "tradable", label: "All tradable markets" },
  { id: "new", label: "Just listed" },
  { id: "closed", label: "Recently closed" },
  { id: "volume", label: "By volume" },
  { id: "liquidity", label: "By liquidity" },
  { id: "competitive", label: "Competitive" },
  { id: "trending", label: "Trending" },
];

/** Feeds that sit under the “Top markets by” group label in Explore. */
export const EXPLORE_TOP_FEEDS = new Set(["closed", "volume", "liquidity", "competitive", "trending"]);

export const CATEGORIES = [
  { id: "politics", label: "Politics", tags: ["politics"] },
  { id: "sports", label: "Sports", tags: ["sports"] },
  { id: "crypto", label: "Crypto", tags: ["crypto"] },
  { id: "economics", label: "Economics", tags: ["economy", "economics", "fed", "fed rates", "inflation", "macro"] },
  { id: "finance", label: "Finance", tags: ["finance", "stocks", "equities"] },
  { id: "tech", label: "Tech", tags: ["tech", "ai", "big tech"] },
  { id: "geopolitics", label: "Geopolitics", tags: ["geopolitics", "world", "world affairs"] },
  { id: "elections", label: "Elections", tags: ["elections", "global elections"] },
  { id: "culture", label: "Culture", tags: ["culture", "movies", "music", "awards"] },
  { id: "weather", label: "Weather", tags: ["weather"] },
];

/**
 * War Room chip → Kalshi GET /series `category` values (see kalshiLiveCategories).
 * Polymarket uses Gamma tag slugs; Kalshi uses these series categories.
 */
export const WAR_ROOM_TO_KALSHI_SERIES_CATEGORIES = {
  politics: ["Elections"],
  elections: ["Elections"],
  sports: ["Sports"],
  crypto: ["Crypto"],
  economics: ["Economics"],
  finance: ["Financials"],
  tech: ["Companies & Tech"],
  culture: ["Culture & Entertainment"],
  weather: ["Climate & Weather"],
  geopolitics: ["Elections", "Mentions"],
};

/** Kalshi series.category (lowercased) → War Room category ids. */
const KALSHI_SERIES_TO_WAR_ROOM = new Map([
  ["elections", ["politics", "elections", "geopolitics"]],
  ["sports", ["sports"]],
  ["crypto", ["crypto"]],
  ["economics", ["economics"]],
  ["financials", ["finance"]],
  ["companies & tech", ["tech"]],
  ["climate & weather", ["weather"]],
  ["culture & entertainment", ["culture"]],
  ["mentions", ["geopolitics", "politics"]],
]);

const CATEGORY_TAGS = new Map(CATEGORIES.map((category) => [category.id, new Set(category.tags)]));
const CATEGORY_IDS = new Set(CATEGORIES.map((category) => category.id));
const EXPLORE_FEED_IDS = new Set(EXPLORE_FEEDS.map((feed) => feed.id));

/**
 * @param {string} [kalshiCategory]
 * @returns {string[]}
 */
export function warRoomCategoriesForKalshiSeries(kalshiCategory) {
  const key = String(kalshiCategory || "")
    .trim()
    .toLowerCase();
  if (!key) return [];
  return KALSHI_SERIES_TO_WAR_ROOM.get(key) || [];
}

/**
 * @param {string} [warRoomCategoryId]
 * @returns {string[]}
 */
export function kalshiSeriesCategoriesForWarRoom(warRoomCategoryId) {
  const id = normalizeCategory(warRoomCategoryId);
  if (!id) return [];
  return WAR_ROOM_TO_KALSHI_SERIES_CATEGORIES[id] || [];
}

/**
 * Normalize an Explore feed id. Empty / all → `tradable`.
 * @param {string} [raw]
 */
export function normalizeExploreFeed(raw) {
  const id = String(raw || "").trim().toLowerCase();
  if (!id || id === "all") return "tradable";
  return EXPLORE_FEED_IDS.has(id) ? id : "tradable";
}

/**
 * Right-rail markets heading for War Room — always volume-sorted language.
 * @param {{ exploreFeed?: string | null; category?: string | null }} [opts]
 */
export function exploreMarketsByVolumeLabel({ exploreFeed, category } = {}) {
  const categoryId = normalizeCategory(category);
  if (categoryId) {
    const label = CATEGORIES.find((row) => row.id === categoryId)?.label || categoryId;
    return `${label} markets by volume`;
  }
  const feedId = normalizeExploreFeed(exploreFeed);
  const feed = EXPLORE_FEEDS.find((row) => row.id === feedId);
  const name = feed?.label || "All tradable markets";
  if (feedId === "volume") return "Top markets by volume";
  return `${name} by volume`;
}

/**
 * Right-rail activity heading for War Room.
 * @param {{ exploreFeed?: string | null; category?: string | null }} [opts]
 */
export function exploreActivityLabel({ exploreFeed, category } = {}) {
  const categoryId = normalizeCategory(category);
  if (categoryId) {
    const label = CATEGORIES.find((row) => row.id === categoryId)?.label || categoryId;
    return `${label} trades · news`;
  }
  const feedId = normalizeExploreFeed(exploreFeed);
  if (feedId === "tradable") return "All tradable trades · news";
  if (feedId === "new") return "Just listed trades · news";
  if (feedId === "closed") return "Recently closed trades · news";
  if (feedId === "volume") return "Volume trades · news";
  if (feedId === "liquidity") return "Liquidity trades · news";
  if (feedId === "competitive") return "Competitive trades · news";
  if (feedId === "trending") return "Trending trades · news";
  return "Trades · news";
}

/** @param {unknown} raw */
export function normalizeTags(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  const seen = new Set();
  for (const entry of raw) {
    const tag = String(entry?.label ?? entry?.slug ?? entry ?? "")
      .trim()
      .toLowerCase();
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
  }
  return out;
}

/**
 * @param {{ tags?: string[] }} market
 * @param {string} categoryId
 */
export function inCategory(market, categoryId) {
  const wanted = CATEGORY_TAGS.get(categoryId);
  if (!wanted) return false;
  const tags = normalizeTags(market?.tags);
  return tags.some((tag) => wanted.has(tag));
}

/**
 * @param {{ tags?: string[]; title?: string; category?: string; seriesTicker?: string; region?: string }} market
 */
export function inferCategory(market) {
  const tags = normalizeTags(market?.tags);
  for (const category of CATEGORIES) {
    if (inCategory({ tags }, category.id)) return category.id;
  }
  const rawCategory = String(market?.category || "").trim();
  if (rawCategory && CATEGORY_IDS.has(rawCategory)) return rawCategory;
  const fromKalshi = warRoomCategoriesForKalshiSeries(rawCategory);
  if (fromKalshi[0]) return fromKalshi[0];
  const hay = `${market?.title || ""} ${market?.seriesTicker || ""} ${market?.region || ""}`.toLowerCase();
  for (const category of CATEGORIES) {
    if (category.tags.some((tag) => hay.includes(tag))) return category.id;
  }
  return null;
}

/**
 * @param {{ tags?: string[]; title?: string; category?: string; seriesTicker?: string; region?: string }} market
 * @param {string} [categoryId]
 */
export function matchesCategory(market, categoryId) {
  if (!categoryId) return true;
  if (!CATEGORY_IDS.has(categoryId)) return true;
  const tags = normalizeTags(market?.tags);
  if (inCategory({ tags }, categoryId)) return true;
  if (String(market?.category || "") === categoryId) return true;
  if (warRoomCategoriesForKalshiSeries(market?.category).includes(categoryId)) return true;
  const category = CATEGORIES.find((row) => row.id === categoryId);
  if (!category) return false;
  const hay = `${market?.title || ""} ${market?.region || ""} ${market?.seriesTicker || ""} ${tags.join(" ")}`.toLowerCase();
  return category.tags.some((tag) => hay.includes(tag));
}

/**
 * @param {{ marketId?: string | null; title?: string; summary?: string; data?: { markets?: unknown[] } }} row
 * @param {string} [categoryId]
 * @param {Map<string, Record<string, unknown>>} [marketById]
 */
export function activityMatchesCategory(row, categoryId, marketById) {
  if (!categoryId) return true;
  if (!CATEGORY_IDS.has(categoryId)) return true;

  const marketId = row?.marketId ? String(row.marketId) : "";
  if (marketId && marketById?.has(marketId)) {
    if (matchesCategory(marketById.get(marketId), categoryId)) return true;
  }

  const related = Array.isArray(row?.data?.markets) ? row.data.markets : [];
  for (const entry of related) {
    if (!entry || typeof entry !== "object") continue;
    const relatedMarket = /** @type {Record<string, unknown>} */ (entry);
    if (
      matchesCategory(
        {
          title: String(relatedMarket.title || relatedMarket.question || ""),
          tags: /** @type {string[]} */ (relatedMarket.tags || []),
          category: String(relatedMarket.category || ""),
        },
        categoryId,
      )
    ) {
      return true;
    }
  }

  // Trades/news without a desk market still match by headline keywords.
  const category = CATEGORIES.find((row) => row.id === categoryId);
  if (!category) return false;
  const hay = `${row?.title || ""} ${row?.summary || ""}`.toLowerCase();
  return category.tags.some((tag) => hay.includes(tag));
}

/** @param {string} [raw] */
export function normalizeCategory(raw) {
  const id = String(raw || "").trim().toLowerCase();
  return CATEGORY_IDS.has(id) ? id : "";
}
