/**
 * Small, real samples for the integration dialog preview.
 * Deep-history pulls go through Athena once per tab; live sources use the existing proxies.
 */

const CACHE_KEY = "lycheeIntegrationPreviewSamples:v3";
const SAMPLE_IDS = [
  "kalshiHistorical",
  "kalshiHistoricalV2",
  "kalshiLive",
  "polymarketHistorical",
  "polymarket",
];

const resolved = new Map();
const inflight = new Map();

function readSessionCache() {
  if (typeof sessionStorage === "undefined") return;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return;
    for (const id of SAMPLE_IDS) {
      if (parsed[id]?.tables) resolved.set(id, parsed[id]);
    }
  } catch {
    /* ignore */
  }
}

function writeSessionCache() {
  if (typeof sessionStorage === "undefined") return;
  try {
    const payload = {};
    for (const id of SAMPLE_IDS) {
      if (resolved.has(id)) payload[id] = resolved.get(id);
    }
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

readSessionCache();

function num(raw) {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function centsToProb(raw) {
  const n = num(raw);
  if (n == null) return null;
  return n / 100;
}

function dollarsToProb(raw) {
  const n = num(raw);
  if (n == null) return null;
  if (n > 1 && n <= 100) return n / 100;
  return n;
}

export function formatProb(prob) {
  if (prob == null || !Number.isFinite(prob)) return "—";
  return `${Math.round(prob * 100)}¢`;
}

export function formatCompact(n, { money = false } = {}) {
  if (n == null || !Number.isFinite(n)) return "—";
  const body = new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
  return money ? `$${body}` : body;
}

function formatTradeTime(raw) {
  const n = num(raw);
  if (n == null) return "—";
  const ms = n > 1e16 ? n / 1e6 : n > 1e12 ? n : n * 1000;
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function tileFrom(ticker, title) {
  const letters = String(ticker || title || "")
    .replace(/^KX/i, "")
    .replace(/[^A-Za-z]/g, "");
  return (letters.slice(0, 2) || "•").toUpperCase();
}

function median(values) {
  const nums = values.filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (!nums.length) return null;
  const mid = Math.floor(nums.length / 2);
  return nums.length % 2 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
}

function rowsToObjects(columns, rows) {
  return (rows || []).map((cells) => {
    const row = {};
    columns.forEach((column, index) => {
      row[column] = cells[index];
    });
    return row;
  });
}

async function postAthena(body) {
  const res = await fetch("/api/data-lake/athena-query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Sample pull failed");
  return rowsToObjects(json.columns || [], json.rows || []);
}

async function getJson(url) {
  const res = await fetch(url, { credentials: "same-origin" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Sample pull failed");
  return json;
}

function volumeStats(label, volumes, { money = false, sentence }) {
  const total = volumes.reduce((sum, n) => sum + (Number.isFinite(n) ? n : 0), 0);
  const peak = volumes.reduce((max, n) => (Number.isFinite(n) && n > max ? n : max), 0);
  return [
    {
      label,
      value: formatCompact(peak || total, { money }),
      sentence,
      tone: "up",
      series: volumes,
    },
  ];
}

async function loadKalshiHistorical() {
  const [markets, trades] = await Promise.all([
    postAthena({
      lake: "kalshi",
      table: "markets",
      queryType: "compose",
      demo: true,
      limit: 6,
      compose: {
        select: [
          { column: "ticker", alias: "ticker" },
          { column: "title", alias: "title" },
          { column: "status", alias: "status" },
          { column: "last_price", alias: "last_price" },
          { column: "volume", alias: "volume" },
        ],
        groupByAliases: [],
        orderBy: [{ alias: "volume", direction: "desc" }],
      },
    }),
    postAthena({
      lake: "kalshi",
      table: "trades",
      queryType: "compose",
      demo: true,
      limit: 6,
      compose: {
        select: [
          { column: "ticker", alias: "ticker" },
          { column: "count", alias: "count" },
          { column: "yes_price", alias: "yes_price" },
          { column: "taker_side", alias: "taker_side" },
          { column: "created_time", alias: "created_time" },
        ],
        groupByAliases: [],
        orderBy: [{ alias: "count", direction: "desc" }],
      },
    }),
  ]);

  const tradeRows = trades.reduce((acc, row) => {
    const ticker = String(row.ticker || "");
    if (!ticker || acc.some((item) => item.title === ticker) || acc.length >= 5) return acc;
    acc.push({
      time: formatTradeTime(row.created_time),
      title: ticker,
      side: String(row.taker_side || "").toLowerCase(),
      price: centsToProb(row.yes_price),
      size: num(row.count),
    });
    return acc;
  }, []);

  const marketRows = markets.slice(0, 6).map((row) => ({
    title: row.title || row.ticker,
    subtitle: row.ticker,
    volume: num(row.volume) || 0,
    price: centsToProb(row.last_price),
    status: row.status || "",
  }));
  const peak = Math.max(1, ...marketRows.map((row) => row.volume));
  const prices = marketRows.map((row) => row.price).filter((n) => n != null);
  const volumes = marketRows.map((row) => row.volume);

  return {
    tables: [
      {
        kind: "rank",
        title: "Top markets",
        caption: "Highest-volume contracts in the deep history",
        rows: marketRows.map((row) => ({
          ...row,
          share: Math.max(8, Math.round((row.volume / peak) * 100)),
        })),
      },
      {
        kind: "audit",
        title: "Trades",
        caption: "A few fills from the historical tape",
        rows: tradeRows,
      },
    ],
    stats: [
      ...volumeStats("Peak volume", volumes, {
        sentence: "largest contract in this sample",
      }),
      {
        label: "Yes price",
        value: formatProb(median(prices)),
        sentence: "median last price",
        tone: "flat",
        series: prices,
      },
      {
        label: "Fills",
        value: String(tradeRows.length),
        sentence: "distinct contracts in this tape",
        tone: "flat",
        series: tradeRows.map((row) => row.size || 0),
      },
    ],
  };
}

async function loadKalshiHistoricalV2() {
  const json = await getJson(
    "/api/integrations/kalshi-live/historical/markets?discovery=1&ticker_scope=general&limit=40&mve_filter=exclude",
  );
  const markets = Array.isArray(json.markets) ? json.markets : [];
  const sorted = [...markets].sort((a, b) => (num(b.volume_fp) || 0) - (num(a.volume_fp) || 0));
  const seen = new Set();
  const picked = [];
  for (const market of sorted) {
    const event = String(market.event_ticker || market.ticker || "");
    if (!event || seen.has(event)) continue;
    seen.add(event);
    picked.push(market);
    if (picked.length >= 6) break;
  }
  const rows = (picked.length ? picked : sorted.slice(0, 6)).map((market) => {
    const last = dollarsToProb(market.last_price_dollars);
    const prev = dollarsToProb(market.previous_price_dollars);
    return {
      tile: tileFrom(market.ticker, market.title),
      title: market.yes_sub_title || market.title || market.ticker,
      subtitle: market.ticker,
      status: market.status || market.result || "",
      result: market.result || "",
      price: last,
      volume: num(market.volume_fp) || 0,
      delta: last != null && prev != null ? last - prev : null,
    };
  });
  const volumes = rows.map((row) => row.volume);
  const prices = rows.map((row) => row.price).filter((n) => n != null);
  return {
    tables: [
      {
        kind: "status",
        title: "Recent history",
        caption: "Settled contracts up to the live cutoff",
        rows,
      },
    ],
    stats: [
      ...volumeStats("Peak volume", volumes, { sentence: "largest contract in this page" }),
      {
        label: "Yes price",
        value: formatProb(median(prices)),
        sentence: "median last price",
        tone: "flat",
        series: prices,
      },
    ],
  };
}

async function loadKalshiLive() {
  const json = await getJson("/api/integrations/kalshi-live/markets/featured?limit=6");
  const markets = (Array.isArray(json.markets) ? json.markets : []).slice(0, 6);
  const rows = markets.map((market) => {
    const bid = dollarsToProb(market.raw?.yes_bid_dollars);
    const ask = dollarsToProb(market.raw?.yes_ask_dollars);
    return {
      tile: tileFrom(market.ticker, market.title),
      title: market.title || market.ticker,
      subtitle: market.ticker,
      price: dollarsToProb(market.lastPriceDollars),
      bid,
      ask,
      volume: num(market.volume24h) || num(market.volume) || 0,
    };
  });
  const spreads = rows
    .map((row) => (row.bid != null && row.ask != null ? row.ask - row.bid : null))
    .filter((n) => n != null);
  const tightest = spreads.length ? Math.min(...spreads) : null;
  return {
    tables: [
      {
        kind: "watchlist",
        title: "Live book",
        caption: "Highest-volume markets on the book right now",
        rows,
      },
    ],
    stats: [
      ...volumeStats("24h volume", rows.map((row) => row.volume), {
        sentence: "busiest market in this sample",
      }),
      {
        label: "Yes price",
        value: formatProb(rows.reduce((max, row) => (row.price != null && row.price > max ? row.price : max), null)),
        sentence: "highest last price",
        tone: "up",
        series: rows.map((row) => row.price).filter((n) => n != null),
      },
      {
        label: "Spread",
        value: tightest == null ? "—" : formatProb(tightest),
        sentence: "tightest bid to ask",
        tone: "flat",
        series: spreads,
      },
    ],
  };
}

async function loadPolymarketHistorical() {
  const markets = await postAthena({
    lake: "polymarket",
    table: "markets",
    queryType: "compose",
    demo: true,
    limit: 6,
    compose: {
      select: [
        { column: "question", alias: "question" },
        { column: "volume", alias: "volume" },
        { column: "outcome_prices", alias: "outcome_prices" },
        { column: "closed", alias: "closed" },
      ],
      groupByAliases: [],
      orderBy: [{ alias: "volume", direction: "desc" }],
    },
  });
  const marketRows = markets.slice(0, 6).map((row) => {
    let yes = null;
    try {
      const prices = JSON.parse(row.outcome_prices || "[]");
      yes = dollarsToProb(Array.isArray(prices) ? prices[0] : null);
    } catch {
      yes = null;
    }
    return {
      title: row.question,
      subtitle: String(row.closed) === "true" ? "Closed" : "Open",
      volume: num(row.volume) || 0,
      price: yes,
      money: true,
    };
  });
  const peak = Math.max(1, ...marketRows.map((row) => row.volume));
  const volumes = marketRows.map((row) => row.volume);
  return {
    tables: [
      {
        kind: "rank",
        title: "Top markets",
        caption: "Highest-volume markets in the historical lake",
        money: true,
        rows: marketRows.map((row) => ({
          ...row,
          share: Math.max(8, Math.round((row.volume / peak) * 100)),
        })),
      },
    ],
    stats: [
      ...volumeStats("Peak volume", volumes, {
        money: true,
        sentence: "largest market in this sample",
      }),
      {
        label: "Yes price",
        value: formatProb(median(marketRows.map((row) => row.price).filter((n) => n != null))),
        sentence: "median outcome price",
        tone: "flat",
        series: marketRows.map((row) => row.price).filter((n) => n != null),
      },
    ],
  };
}

async function loadPolymarketLive() {
  const json = await getJson("/api/integrations/polymarket-live/markets/featured?limit=6");
  const markets = (Array.isArray(json.markets) ? json.markets : []).slice(0, 6);
  const rows = markets.map((market) => {
    const yes = (market.outcomes || []).find((outcome) => /yes/i.test(outcome.outcome));
    const no = (market.outcomes || []).find((outcome) => /no/i.test(outcome.outcome));
    return {
      tile: tileFrom("", market.title),
      title: market.title,
      subtitle: market.eventTitle || (market.tags || [])[0] || "",
      price: dollarsToProb(yes?.lastPrice),
      noPrice: dollarsToProb(no?.lastPrice),
      volume: num(market.volume24h) || 0,
    };
  });
  return {
    tables: [
      {
        kind: "watchlist",
        title: "Live markets",
        caption: "Highest-volume markets on the book right now",
        money: true,
        rows,
      },
    ],
    stats: [
      ...volumeStats("24h volume", rows.map((row) => row.volume), {
        money: true,
        sentence: "busiest market in this sample",
      }),
      {
        label: "Yes price",
        value: formatProb(rows.reduce((max, row) => (row.price != null && row.price > max ? row.price : max), null)),
        sentence: "highest yes in this sample",
        tone: "up",
        series: rows.map((row) => row.price).filter((n) => n != null),
      },
    ],
  };
}

const LOADERS = {
  kalshiHistorical: loadKalshiHistorical,
  kalshiHistoricalV2: loadKalshiHistoricalV2,
  kalshiLive: loadKalshiLive,
  polymarketHistorical: loadPolymarketHistorical,
  polymarket: loadPolymarketLive,
};

export function isLivePreviewId(id) {
  return SAMPLE_IDS.includes(id);
}

export function getCachedIntegrationPreview(id) {
  return resolved.get(id) || null;
}

export function loadIntegrationPreview(id) {
  if (!LOADERS[id]) return Promise.resolve(null);
  if (resolved.has(id)) return Promise.resolve(resolved.get(id));
  if (!inflight.has(id)) {
    const task = LOADERS[id]()
      .then((data) => {
        resolved.set(id, data);
        writeSessionCache();
        return data;
      })
      .finally(() => {
        inflight.delete(id);
      });
    inflight.set(id, task);
  }
  return inflight.get(id);
}

export function prefetchIntegrationPreviews() {
  for (const id of SAMPLE_IDS) loadIntegrationPreview(id);
}
