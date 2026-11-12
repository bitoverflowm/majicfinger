import { cleanTerms } from "@/lib/newsQuery";
import {
  googleNewsUrl,
  parseGoogleNewsRss,
  withinWindow,
} from "@/lib/newsSources";

const FETCH_TIMEOUT_MS = 20_000;
const USER_AGENT = "Lychee MCP news";

/**
 * Headline search for MCP (Google News RSS — same provider as Lychee news UI).
 * Keep windows modest; this is for overlays, not lake dumps.
 */
export async function searchNewsHeadlines({
  terms = [],
  query = "",
  days = 14,
  limit = 25,
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

  const res = await fetch(googleNewsUrl(cleaned, start, end), {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`Google News answered ${res.status}. Retry shortly; do not scrape other sites.`);
  }
  const articles = withinWindow(parseGoogleNewsRss(await res.text()), start, end)
    .slice(0, Math.min(80, Math.max(5, limit)))
    .map((a) => ({
      title: a.title || null,
      url: a.url || null,
      source: a.source || a.domain || null,
      published_at: a.t || null,
      provider: a.provider || "google_news",
    }));

  return {
    source: "lychee:news/google",
    terms: cleaned,
    window: { start, end, days: Math.round((end - start) / 86400000) },
    count: articles.length,
    articles,
    rows: articles.map((a) => ({
      title: a.title,
      source: a.source,
      published_at: a.published_at,
      url: a.url,
    })),
    next: {
      compose: "add_sheet_with_chart",
      chart_view: "activity",
      note: "Overlay headline published_at against trader first_ts/last_ts from analyze_trader_theme — correlation ≠ private info.",
    },
  };
}
