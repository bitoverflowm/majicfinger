/**
 * News providers, normalised to one article shape:
 * `{ title, url, source, domain, t, precision, provider }`.
 *
 * `precision` says what `t` is: "exact" is the publish time, "seen" is when GDELT first crawled it
 * (usually within 15 minutes of publishing), "day" means only the date is known.
 */
import { newsQuery } from "./newsQuery.js";

const DAY_MS = 24 * 60 * 60_000;
/** GDELT's search API covers a rolling three months; stay a day inside it. */
export const GDELT_REACH_MS = 89 * DAY_MS;
export const GDELT_MAX_ARTICLES = 250;

function pad(value) {
  return String(value).padStart(2, "0");
}

/** GDELT's YYYYMMDDHHMMSS, in UTC. */
export function gdeltTime(ms) {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`;
}

/** "20261108T193000Z" to epoch ms. */
export function parseGdeltDate(value) {
  const m = /^(\d{4})(\d{2})(\d{2})T?(\d{2})(\d{2})(\d{2})Z?$/.exec(String(value || ""));
  return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) : NaN;
}

/** `mode` is "artlist" for headlines or "timelinevolraw" for article counts over time. English-language sources only. */
export function gdeltUrl(mode, terms, start, end) {
  const params = new URLSearchParams({
    query: `${newsQuery(terms)} sourcelang:english`,
    mode,
    format: "json",
    startdatetime: gdeltTime(start),
    enddatetime: gdeltTime(end),
  });
  if (mode === "artlist") {
    params.set("maxrecords", String(GDELT_MAX_ARTICLES));
    params.set("sort", "hybridrel");
  }
  return `https://api.gdeltproject.org/api/v2/doc/doc?${params.toString()}`;
}

/**
 * GDELT answers problems in plain text rather than JSON. Returns `{ json }`, or `{ limited }`
 * when it's asking us to slow down, or `{ message }` for anything else it said.
 */
export function readGdelt(text) {
  const body = String(text || "").trim();
  if (!body) return { json: {} };
  if (/limit requests/i.test(body)) return { limited: true };
  try {
    return { json: JSON.parse(body) };
  } catch {
    return { message: body.split("\n")[0].slice(0, 200) };
  }
}

export function gdeltArticles(json) {
  const out = [];
  for (const row of json?.articles || []) {
    const t = parseGdeltDate(row.seendate);
    const title = String(row.title || "").trim();
    if (!title || !Number.isFinite(t) || !row.url) continue;
    out.push({
      title,
      url: String(row.url),
      source: String(row.domain || ""),
      domain: String(row.domain || ""),
      t,
      precision: "seen",
      provider: "gdelt",
    });
  }
  return out;
}

/** Article counts per time bucket, oldest first. */
export function gdeltVolume(json) {
  const series = json?.timeline?.[0]?.data || [];
  const out = [];
  for (const point of series) {
    const t = parseGdeltDate(point.date);
    const count = Number(point.value);
    if (Number.isFinite(t) && Number.isFinite(count)) out.push({ t, count });
  }
  return out.sort((a, b) => a.t - b.t);
}

function isoDay(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Google News search over the window, padded a day each side because its date filter works in whole days. */
export function googleNewsUrl(terms, start, end) {
  const q = `${newsQuery(terms)} after:${isoDay(start - DAY_MS)} before:${isoDay(end + DAY_MS)}`;
  const params = new URLSearchParams({ q, hl: "en-US", gl: "US", ceid: "US:en" });
  return `https://news.google.com/rss/search?${params.toString()}`;
}

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

function decode(text) {
  return String(text || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code) => {
      if (code[0] === "#") {
        const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
        return Number.isFinite(n) ? String.fromCodePoint(n) : whole;
      }
      return ENTITIES[code.toLowerCase()] ?? whole;
    })
    .trim();
}

function tag(block, name) {
  const m = new RegExp(`<${name}(\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i").exec(block);
  return m ? { attrs: m[1] || "", text: decode(m[2]) } : null;
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/**
 * Google News stamps older articles with only their date, at midnight US Pacific
 * (07:00 or 08:00 UTC on the dot). Those can't be lined up against a trade to the minute.
 */
function dayOnly(ms) {
  const d = new Date(ms);
  return (d.getUTCHours() === 7 || d.getUTCHours() === 8) && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0;
}

export function parseGoogleNewsRss(xml) {
  const out = [];
  for (const [, block] of String(xml || "").matchAll(/<item>([\s\S]*?)<\/item>/gi)) {
    const rawTitle = tag(block, "title")?.text || "";
    const link = tag(block, "link")?.text || "";
    const t = Date.parse(tag(block, "pubDate")?.text || "");
    const sourceTag = tag(block, "source");
    const source = sourceTag?.text || "";
    const sourceUrl = /url="([^"]+)"/.exec(sourceTag?.attrs || "")?.[1] || "";
    const suffix = source ? ` - ${source}` : "";
    const title = suffix && rawTitle.endsWith(suffix) ? rawTitle.slice(0, -suffix.length).trim() : rawTitle;
    if (!title || !link || !Number.isFinite(t)) continue;
    out.push({
      title,
      url: link,
      source,
      domain: hostOf(sourceUrl),
      t,
      precision: dayOnly(t) ? "day" : "exact",
      provider: "google",
    });
  }
  return out;
}

/** Keeps articles inside [start, end]; date-only ones count if their day overlaps it. */
export function withinWindow(articles, start, end) {
  return articles.filter((article) =>
    article.precision === "day" ? article.t + DAY_MS >= start && article.t - DAY_MS <= end : article.t >= start && article.t <= end,
  );
}
