/** Kalshi series category values (GET /series `category` param and `series.category`). */

export const KALSHI_LIVE_CATEGORY_OTHER = "__other__";

/** @typedef {{ value: string; label: string; description: string }} KalshiLiveCategoryOption */

/** @type {KalshiLiveCategoryOption[]} */
export const KALSHI_LIVE_SERIES_CATEGORY_OPTIONS = [
  {
    value: "Elections",
    label: "Elections",
    description:
      "Political outcomes — U.S. presidential races, congressional control, global heads of state.",
  },
  {
    value: "Sports",
    label: "Sports",
    description: "Game outcomes, champions, and stats (NFL, NBA, Premier League, …).",
  },
  {
    value: "Economics",
    label: "Economics",
    description: "Fed rates, GDP, inflation, unemployment, recession probabilities.",
  },
  {
    value: "Financials",
    label: "Financials",
    description: "Major indices (S&P 500, NASDAQ) and stock prices.",
  },
  {
    value: "Companies & Tech",
    label: "Companies & Tech",
    description: "Corporate milestones, IPOs, AI, M&A.",
  },
  {
    value: "Climate & Weather",
    label: "Climate & Weather",
    description: "Temperature records, hurricanes, meteorological events.",
  },
  {
    value: "Culture & Entertainment",
    label: "Culture & Entertainment",
    description: "Awards (Oscars, Grammys), charts, streaming viewership.",
  },
  {
    value: "Crypto",
    label: "Crypto",
    description: "Bitcoin, ETF approvals, crypto market trends.",
  },
  {
    value: "Space & Science",
    label: "Space & Science",
    description: "SpaceX launches, NASA missions, scientific breakthroughs.",
  },
  {
    value: "Mentions",
    label: "Mentions",
    description: "Frequency of trending terms, phrases, or viral news cycles.",
  },
  {
    value: "Art",
    label: "Art",
    description: "Art market trends, major auctions, and sales milestones.",
  },
];

export const KALSHI_LIVE_KNOWN_CATEGORY_VALUES = KALSHI_LIVE_SERIES_CATEGORY_OPTIONS.map((c) => c.value);

export function isKalshiLiveKnownCategory(value) {
  const v = String(value ?? "").trim();
  return KALSHI_LIVE_KNOWN_CATEGORY_VALUES.some((k) => k.toLowerCase() === v.toLowerCase());
}
