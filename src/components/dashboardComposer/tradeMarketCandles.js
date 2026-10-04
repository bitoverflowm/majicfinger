/** Turn a Kalshi trades sheet into market candles. Volume is Count fp. */

const TARGET_CANDLES = 48;

function parseChartNumber(value) {
  const raw = String(value ?? "")
    .trim()
    .replace(/[$¢]/g, "")
    .replace(/,/g, "");
  if (!raw) return null;
  const match = raw.match(/^(-?\d+(?:\.\d+)?)\s*([KMB])?$/i);
  if (!match) return null;
  const n = Number(match[1]);
  if (!Number.isFinite(n)) return null;
  const scale = { K: 1e3, M: 1e6, B: 1e9 }[(match[2] || "").toUpperCase()] || 1;
  return n * scale;
}

function findColumn(columns, test) {
  return (columns || []).findIndex((column) =>
    test(String(column?.title || "").trim().toLowerCase(), String(column?.id || "").trim().toLowerCase()),
  );
}

function isCentsColumn(title, id) {
  if (id === "yes_price" || id === "no_price" || id === "last_price") return true;
  if (id.includes("dollar") || title.includes("dollar")) return false;
  return title === "yes price" || title === "no price" || title === "last price";
}

function volumeLabelFor(title, id) {
  if (id === "count_fp" || title === "count fp" || title.includes("count fp")) return "Count fp";
  if (id === "volume_fp" || title === "volume fp") return "Volume fp";
  if (title === "size" || title === "volume" || id === "count" || id === "volume") return "Volume";
  return "";
}

function parseTime(value) {
  if (value == null || value === "") return NaN;
  const n = Number(value);
  if (Number.isFinite(n) && n > 1e9) return n > 1e12 ? n : n * 1000;
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : NaN;
}

/**
 * @param {Array<{ title?: string, id?: string, scale?: string }>} columns
 * @param {unknown[][]} rows
 */
export function tradesToCandles(columns, rows) {
  const timeIndex = findColumn(
    columns,
    (title, id) => title.includes("created") || id.includes("created") || id === "timestamp" || title === "timestamp",
  );
  const priceIndex = findColumn(
    columns,
    (title, id) =>
      id === "yes_price_dollars" ||
      id === "yes_price" ||
      id === "price_dollars" ||
      title === "yes price" ||
      title === "yes price dollars" ||
      title.includes("yes price"),
  );
  const sizeIndex = findColumn(
    columns,
    (title, id) =>
      id === "count_fp" ||
      title === "count fp" ||
      title.includes("count fp") ||
      id === "volume_fp" ||
      title === "volume fp" ||
      title === "size" ||
      title === "volume" ||
      id === "count" ||
      id === "volume",
  );
  const priceColumn = priceIndex >= 0 ? columns[priceIndex] : null;
  const sizeColumn = sizeIndex >= 0 ? columns[sizeIndex] : null;
  const cents = priceColumn
    ? priceColumn.scale === "cents" || isCentsColumn(String(priceColumn.title || "").toLowerCase(), String(priceColumn.id || "").toLowerCase())
    : false;
  const volumeLabel = sizeColumn
    ? volumeLabelFor(String(sizeColumn.title || "").trim().toLowerCase(), String(sizeColumn.id || "").trim().toLowerCase())
    : "";

  const samples = [];
  for (const row of rows || []) {
    const time = parseTime(row?.[timeIndex]);
    const rawPrice = row?.[priceIndex];
    const price = parseChartNumber(rawPrice);
    if (!Number.isFinite(time) || price == null) continue;
    const markedCents = /¢/.test(String(rawPrice ?? ""));
    const size = sizeIndex >= 0 ? parseChartNumber(row?.[sizeIndex]) || 0 : 0;
    samples.push({
      time,
      price: cents || markedCents ? price / 100 : price,
      size,
    });
  }
  samples.sort((a, b) => a.time - b.time);
  if (!samples.length) return { candles: [], volumeLabel };

  const span = Math.max(0, samples[samples.length - 1].time - samples[0].time);
  const bucket = Math.max(1000, Math.ceil((span || 1000) / TARGET_CANDLES));
  const groups = new Map();
  for (const sample of samples) {
    const key = Math.floor(sample.time / bucket) * bucket;
    const group = groups.get(key);
    if (!group) {
      groups.set(key, {
        t: key,
        open: sample.price,
        high: sample.price,
        low: sample.price,
        close: sample.price,
        volume: sample.size,
      });
      continue;
    }
    group.high = Math.max(group.high, sample.price);
    group.low = Math.min(group.low, sample.price);
    group.close = sample.price;
    group.volume += sample.size;
  }
  return { candles: [...groups.values()], volumeLabel };
}

/**
 * One Kalshi candlestick row is already a candle. Volume is Volume fp.
 * @param {Array<{ title?: string, id?: string }>} columns
 * @param {unknown[][]} rows
 */
export function ohlcRowsToCandles(columns, rows) {
  const timeIndex = findColumn(
    columns,
    (title, id) => id === "end_period_ts" || title === "end period ts" || title.includes("end period"),
  );
  const openIndex = findColumn(columns, (title, id) => id === "price_open_dollars" || title === "price open dollars");
  const highIndex = findColumn(columns, (title, id) => id === "price_high_dollars" || title === "price high dollars");
  const lowIndex = findColumn(columns, (title, id) => id === "price_low_dollars" || title === "price low dollars");
  const closeIndex = findColumn(columns, (title, id) => id === "price_close_dollars" || title === "price close dollars");
  const sizeIndex = findColumn(
    columns,
    (title, id) => id === "volume_fp" || title === "volume fp" || title.includes("volume fp"),
  );
  if (closeIndex < 0 || timeIndex < 0) return { candles: [], volumeLabel: "Volume fp" };

  const byTime = new Map();
  for (const row of rows || []) {
    const time = parseTime(row?.[timeIndex]);
    const close = parseChartNumber(row?.[closeIndex]);
    if (!Number.isFinite(time) || close == null) continue;
    const open = parseChartNumber(row?.[openIndex]) ?? close;
    const high = parseChartNumber(row?.[highIndex]) ?? Math.max(open, close);
    const low = parseChartNumber(row?.[lowIndex]) ?? Math.min(open, close);
    byTime.set(time, {
      t: time,
      open,
      high: Math.max(high, open, close),
      low: Math.min(low, open, close),
      close,
      volume: sizeIndex >= 0 ? parseChartNumber(row?.[sizeIndex]) || 0 : 0,
    });
  }
  return { candles: [...byTime.values()].sort((a, b) => a.t - b.t), volumeLabel: "Volume fp" };
}

export function rangesForCandles(candles) {
  const all = { label: "All", ms: null };
  if (!candles?.length) return [all];
  const span = candles[candles.length - 1].t - candles[0].t;
  const options = [
    { label: "1m", ms: 60 * 1000 },
    { label: "5m", ms: 5 * 60 * 1000 },
    { label: "15m", ms: 15 * 60 * 1000 },
    { label: "1H", ms: 60 * 60 * 1000 },
    { label: "1D", ms: 24 * 60 * 60 * 1000 },
  ];
  const useful = options.filter((range) => span > range.ms * 0.6);
  return [...useful.slice(-3), all];
}
