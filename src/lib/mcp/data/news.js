import { cleanTerms } from "@/lib/newsQuery";
import {
  googleNewsUrl,
  parseGoogleNewsRss,
  withinWindow,
  gdeltUrl,
  gdeltArticles,
  readGdelt,
  GDELT_REACH_MS,
} from "@/lib/newsSources";
import { archiveConfigured, fromArchive } from "@/lib/newsArchive";

const FETCH_TIMEOUT_MS = 20_000;
const USER_AGENT = "Lychee MCP news";

async function fromGoogle(terms, start, end) {
  const res = await fetch(googleNewsUrl(terms, start, end), {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`Google News answered ${res.status}. Retry shortly; do not scrape other sites.`);
  }
  return withinWindow(parseGoogleNewsRss(await res.text()), start, end);
}

async function fromGdeltLive(terms, start, end) {
  const reach = Date.now() - GDELT_REACH_MS;
  if (end < reach) return { status: "out_of_range", articles: [] };
  const from = Math.max(start, reach);
  const res = await fetch(gdeltUrl("artlist", terms, from, end), {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  const read = readGdelt(await res.text());
  if (read.limited || read.message) {
    return { status: read.limited ? "limited" : "error", articles: [], message: read.message || "GDELT limited" };
  }
  return { status: "ok", articles: withinWindow(gdeltArticles(read.json), start, end) };
}

/**
 * Headline search for MCP.
 * Prefers Lychee news archive (Athena gdelt_news_articles) when configured,
 * else Google News RSS (+ optional GDELT live). Same backend family as /api/news.
 */
export async function searchNewsHeadlines({
  terms = [],
  query = "",
  days = 14,
  limit = 25,
  source = "auto",
} = {}) {
  const cleaned = cleanTerms([
    ...(Array.isArray(terms) ? terms : [terms]),
    ...(query ? String(query).split(/[,\s]+/) : []),
  ]);
  if (!cleaned.length) {
    throw new Error("Pass terms or query (e.g. Fed, FOMC, rates).");
  }

  const end = Date.now();
  const start = end - Math.min(90, Math.max(1, Number(days) || 14)) * 24 * 60 * 60 * 1000;
  const want = String(source || "auto").toLowerCase();
  let provider = "google_news";
  let articles = [];
  let status = "ok";
  let message = null;

  if ((want === "auto" || want === "archive" || want === "gdelt") && archiveConfigured()) {
    try {
      const archived = await fromArchive("gdelt", cleaned, start, end);
      status = archived.status || "ok";
      message = archived.message || null;
      if (archived.status === "ok" && Array.isArray(archived.articles) && archived.articles.length) {
        articles = archived.articles;
        provider = "lychee_news_archive";
      }
    } catch (err) {
      if (want === "archive") throw err;
      message = err?.message || "archive unavailable";
    }
  }

  if (!articles.length && want !== "archive") {
    if (want === "gdelt") {
      const live = await fromGdeltLive(cleaned, start, end);
      status = live.status || "ok";
      message = live.message || message;
      articles = live.articles || [];
      provider = "gdelt_live";
    } else {
      articles = await fromGoogle(cleaned, start, end);
      provider = "google_news";
    }
  }

  const clipped = articles.slice(0, Math.min(80, Math.max(5, limit))).map((a) => ({
    title: a.title || null,
    url: a.url || null,
    source: a.source || a.domain || null,
    published_at: a.t || a.published_at || null,
    provider: a.provider || provider,
    copies: a.copies || null,
  }));

  return {
    source: `lychee:news/${provider}`,
    provider,
    archive_configured: archiveConfigured(),
    status,
    message,
    terms: cleaned,
    window: { start, end, days: Math.round((end - start) / 86400000) },
    count: clipped.length,
    articles: clipped,
    rows: clipped.map((a) => ({
      title: a.title,
      source: a.source,
      published_at: a.published_at,
      url: a.url,
      provider: a.provider,
    })),
    next: {
      compose: "add_sheet_with_chart",
      chart_view: "activity",
      note: "Overlay headline times vs trader first_ts/last_ts from analyze_trader_theme — correlation ≠ private info. Call explain_lychee_platform for archive vs Connect-UI gaps.",
    },
  };
}
