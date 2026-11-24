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
      google_url: null,
      publisher_url: String(row.url),
      publisher_home: row.domain ? `https://${row.domain}` : null,
      source: String(row.domain || ""),
      domain: String(row.domain || ""),
      t,
      timezone: "UTC",
      timestamp_type: "gdelt_seendate",
      precision: "seen",
      timestamp_note: "GDELT seendate is when the article was crawled (usually within ~15 minutes of publish), not the publisher byline.",
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

/** True when `url` is a news.google.com host (any path). */
export function isGoogleNewsUrl(url) {
  try {
    return /(^|\.)news\.google\.com$/i.test(new URL(String(url || "").trim()).hostname);
  } catch {
    return false;
  }
}

/** Match an http(s) URL in decoded Google article-id bytes (printable ASCII only). */
const EMBEDDED_HTTP_RE = /https?:\/\/[A-Za-z0-9\-._~:/?#[\]@!$&'()*+,;=%]+/;

/** Strip protobuf trailer / junk from an extracted publisher URL. */
function cleanExtractedUrl(raw) {
  const cleaned = String(raw || "")
    .replace(/[^\x20-\x7e].*$/, "") // binary protobuf bytes after the URL
    .replace(/[.,;]+$/, "")
    .trim();
  if (!/^https?:\/\//i.test(cleaned) || isGoogleNewsUrl(cleaned)) return null;
  try {
    return new URL(cleaned).toString();
  } catch {
    return null;
  }
}

/**
 * Older Google News article ids embed the publisher URL in a short protobuf envelope
 * (`0x08 0x13 0x22` + length-prefixed UTF-8). Post-2024 ids (`AU_yqL…`) are opaque.
 */
function publisherFromArticleId(id) {
  const token = String(id || "").split("?")[0].trim();
  if (!token) return null;

  let bytes;
  try {
    const b64 = token.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    bytes = Buffer.from(padded, "base64");
  } catch {
    return null;
  }
  if (!bytes.length) return null;

  // Fast path: any https URL sitting in the decoded bytes (plain base64url or protobuf).
  const asBinary = bytes.toString("latin1");
  const fromBytes = cleanExtractedUrl(asBinary.match(EMBEDDED_HTTP_RE)?.[0]);
  if (fromBytes) return fromBytes;

  // Length-prefixed envelope used through ~2024 (huksley / googlenewsdecoder shape).
  const prefix = Buffer.from([0x08, 0x13, 0x22]);
  let offset = 0;
  if (bytes.length >= 3 && bytes.subarray(0, 3).equals(prefix)) offset = 3;
  if (offset >= bytes.length) return null;

  let len = bytes[offset];
  offset += 1;
  if (len >= 0x80) {
    if (offset >= bytes.length) return null;
    len = (len & 0x7f) + (bytes[offset] << 7);
    offset += 1;
  }
  const end = Math.min(bytes.length, offset + len);
  let slice = bytes.subarray(offset, end);
  if (slice.length >= 3 && slice[slice.length - 3] === 0xd2 && slice[slice.length - 2] === 0x01 && slice[slice.length - 1] === 0x00) {
    slice = slice.subarray(0, slice.length - 3);
  }
  const text = slice.toString("latin1");
  if (text.startsWith("AU_yqL") || text.startsWith("AU_y")) return null;
  return cleanExtractedUrl(text.match(EMBEDDED_HTTP_RE)?.[0] || (/^https?:\/\//i.test(text) ? text : null));
}

/**
 * Google News RSS `<link>` is a google.com wrapper. Sync decode recovers publisher URLs
 * only when they are embedded in the article id (legacy). Modern opaque ids need
 * {@link resolveGoogleNewsUrl}.
 */
export function decodeGoogleNewsUrl(link) {
  const google_url = String(link || "").trim();
  if (!google_url) return { google_url: null, publisher_url: null };
  try {
    const parsed = new URL(google_url);
    if (!/(^|\.)news\.google\.com$/i.test(parsed.hostname)) {
      return { google_url: null, publisher_url: google_url };
    }
    const id = parsed.pathname.split("/").filter(Boolean).pop() || "";
    return { google_url, publisher_url: publisherFromArticleId(id) };
  } catch {
    return { google_url, publisher_url: null };
  }
}

const GN_UA = "Mozilla/5.0 (compatible; LycheeNewsPulse/1.0)";
const GN_BATCH = "https://news.google.com/_/DotsSplashUi/data/batchexecute";
const GN_RESOLVE_TIMEOUT_MS = 6_000;

function parseBatchexecuteBody(text) {
  let body = String(text || "");
  if (body.startsWith(")]}'")) {
    const nl = body.indexOf("\n");
    body = nl >= 0 ? body.slice(nl + 1) : body.slice(4);
  }
  body = body.trim();
  const firstLine = body.split("\n", 1)[0];
  if (/^\d+$/.test(firstLine)) {
    const nl = body.indexOf("\n");
    body = nl >= 0 ? body.slice(nl + 1) : "";
  }
  return JSON.parse(body);
}

/**
 * Resolve a Google News article / rss/articles URL to the publisher origin via the
 * DotsSplashUi batchexecute RPC (needed for post-2024 opaque CBMi… / AU_yqL… ids).
 * Returns `{ google_url, publisher_url }` — `publisher_url` is null when resolve fails.
 */
export async function resolveGoogleNewsUrl(link, { fetchImpl = fetch, timeoutMs = GN_RESOLVE_TIMEOUT_MS } = {}) {
  const sync = decodeGoogleNewsUrl(link);
  if (sync.publisher_url) return sync;
  if (!sync.google_url || !isGoogleNewsUrl(sync.google_url)) return sync;

  let articleId = "";
  try {
    articleId = new URL(sync.google_url).pathname.split("/").filter(Boolean).pop() || "";
    articleId = articleId.split("?")[0];
  } catch {
    return sync;
  }
  if (!articleId) return sync;

  try {
    const signal = AbortSignal.timeout(timeoutMs);
    const pageRes = await fetchImpl(`https://news.google.com/articles/${articleId}?hl=en-US&gl=US&ceid=US:en`, {
      headers: { "User-Agent": GN_UA },
      signal,
      redirect: "follow",
    });
    if (!pageRes.ok) return sync;
    const html = await pageRes.text();
    const signature = html.match(/data-n-a-sg="([^"]+)"/)?.[1];
    const timestamp = html.match(/data-n-a-ts="([^"]+)"/)?.[1];
    if (!signature || !timestamp) return sync;

    const rpcInner = JSON.stringify([
      "garturlreq",
      [
        ["X", "X", ["X", "X"], null, null, 1, 1, "US:en", null, 1, null, null, null, null, null, 0, 1],
        "X",
        "X",
        1,
        [1, 1, 1],
        1,
        1,
        null,
        0,
        0,
        null,
        0,
      ],
      articleId,
      Number(timestamp),
      signature,
    ]);
    const fReq = JSON.stringify([[["Fbv4je", rpcInner, null, "generic"]]]);
    const postRes = await fetchImpl(GN_BATCH, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        Referer: "https://news.google.com/",
        "User-Agent": GN_UA,
      },
      body: new URLSearchParams({ "f.req": fReq }),
      signal,
    });
    if (!postRes.ok) return sync;
    const envelopes = parseBatchexecuteBody(await postRes.text());
    for (const env of envelopes || []) {
      if (!Array.isArray(env) || env[0] !== "wrb.fr" || env[1] !== "Fbv4je" || !env[2]) continue;
      const payload = JSON.parse(env[2]);
      if (Array.isArray(payload) && payload[0] === "garturlres" && typeof payload[1] === "string") {
        const publisher_url = cleanExtractedUrl(payload[1]);
        if (publisher_url) return { google_url: sync.google_url, publisher_url };
      }
    }
  } catch {
    /* network / parse failure → leave publisher_url null */
  }
  return sync;
}

/**
 * Fill `publisher_url` / `url` / `domain` on Google-sourced articles. Never writes a
 * news.google.com host into `url` or `publisher_url` — unresolved rows keep those null.
 */
export async function resolveArticlePublisherUrls(articles, { concurrency = 4, fetchImpl = fetch, timeoutMs = GN_RESOLVE_TIMEOUT_MS } = {}) {
  const list = Array.isArray(articles) ? articles : [];
  const out = list.map((a) => ({ ...a }));
  const pending = [];
  for (let i = 0; i < out.length; i++) {
    const article = out[i];
    const hasPublisher = article.publisher_url && !isGoogleNewsUrl(article.publisher_url);
    if (hasPublisher) {
      article.url = article.publisher_url;
      article.domain = hostOf(article.publisher_url) || article.domain || "";
      continue;
    }
    const googleLink = article.google_url || (isGoogleNewsUrl(article.url) ? article.url : null);
    if (!googleLink) {
      if (isGoogleNewsUrl(article.url)) article.url = null;
      if (isGoogleNewsUrl(article.publisher_url)) article.publisher_url = null;
      continue;
    }
    pending.push({ i, googleLink });
  }

  let cursor = 0;
  async function worker() {
    while (cursor < pending.length) {
      const job = pending[cursor++];
      const resolved = await resolveGoogleNewsUrl(job.googleLink, { fetchImpl, timeoutMs });
      const article = out[job.i];
      article.google_url = resolved.google_url || article.google_url || job.googleLink;
      article.publisher_url = resolved.publisher_url || null;
      article.url = resolved.publisher_url || null;
      if (resolved.publisher_url) {
        article.domain = hostOf(resolved.publisher_url) || article.domain || "";
      } else {
        const domainIsGoogle = !article.domain || /(^|\.)news\.google\.com$/i.test(article.domain);
        if (domainIsGoogle) {
          article.domain = hostOf(article.publisher_home) || "";
        }
      }
    }
  }
  const n = Math.max(1, Math.min(concurrency, pending.length || 1));
  await Promise.all(Array.from({ length: pending.length ? n : 0 }, () => worker()));
  return out;
}

/**
 * Google News stamps older articles with only their date, at midnight US Pacific
 * (07:00 or 08:00 UTC on the dot). Those can't be lined up against a trade to the minute.
 */
function dayOnly(ms) {
  const d = new Date(ms);
  return (d.getUTCHours() === 7 || d.getUTCHours() === 8) && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0;
}

/** Strip RSS/HTML description down to a short plain-text lede. */
export function plainNewsSnippet(raw, max = 320) {
  const text = String(raw || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max - 1).trim()}…` : text;
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
    const decoded = decodeGoogleNewsUrl(link);
    const snippet = plainNewsSnippet(tag(block, "description")?.text || "");
    // Never put news.google.com in `url` / `publisher_url`. Opaque ids stay null until
    // resolveGoogleNewsUrl / resolveArticlePublisherUrls runs.
    out.push({
      title,
      url: decoded.publisher_url,
      google_url: decoded.google_url || (isGoogleNewsUrl(link) ? link : null),
      publisher_url: decoded.publisher_url,
      publisher_home: sourceUrl || null,
      source,
      domain: hostOf(decoded.publisher_url || sourceUrl),
      snippet: snippet && snippet !== title ? snippet : "",
      t,
      timezone: "UTC",
      timestamp_type: "google_rss_pubDate",
      precision: dayOnly(t) ? "day" : "second",
      timestamp_note:
        "Google RSS pubDate is Google's stamp in UTC and can differ from the publisher byline by minutes. Confirm on publisher_url.",
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
