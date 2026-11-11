import { pickMarkets } from "@/lib/holderLanding/featuredSubjects";
import { holderTerminalHref } from "@/lib/holderLanding/pages";
import { marketNewsTerms } from "@/lib/newsQuery";
import { googleNewsUrl, parseGoogleNewsRss, withinWindow } from "@/lib/newsSources";

/**
 * GET /api/news/headline
 *
 * The newest headline about one of Polymarket's trending markets, for the Products menu:
 * `{ headline: { title, url, source, t }, market: { title, href }, terms } | { headline: null }`.
 */

const MINUTE = 60_000;
const TTL_MS = 10 * MINUTE;
const WINDOW_MS = 48 * 60 * MINUTE;
const MARKETS_TRIED = 4;
const FETCH_TIMEOUT_MS = 8_000;

let memo = { value: null, expires: 0 };
let pending = null;

async function newestHeadline(terms, start, end) {
  const res = await fetch(googleNewsUrl(terms, start, end), {
    headers: { "User-Agent": "Lychee news lookup" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) return null;
  const timed = withinWindow(parseGoogleNewsRss(await res.text()), start, end).filter((article) => article.precision === "exact");
  return timed.sort((a, b) => b.t - a.t)[0] || null;
}

async function pick() {
  const markets = (await pickMarkets()).slice(0, MARKETS_TRIED);
  const end = Date.now();
  const start = end - WINDOW_MS;
  for (const market of markets) {
    const { terms } = marketNewsTerms(market.title);
    if (!terms.length) continue;
    const article = await newestHeadline(terms, start, end).catch(() => null);
    if (!article) continue;
    return {
      headline: { title: article.title, url: article.url, source: article.source || article.domain, t: article.t },
      market: { title: market.title, href: holderTerminalHref(market) },
      terms,
    };
  }
  return { headline: null };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Use GET" });
  }
  if (memo.expires < Date.now()) {
    if (!pending) {
      pending = pick()
        .then((value) => {
          memo = { value, expires: Date.now() + (value.headline ? TTL_MS : MINUTE) };
          return value;
        })
        .catch(() => ({ headline: null }))
        .finally(() => {
          pending = null;
        });
    }
    await pending;
  }
  const value = memo.value || { headline: null };
  res.setHeader("Cache-Control", value.headline ? "public, s-maxage=600, stale-while-revalidate=1800" : "no-store");
  return res.status(200).json(value);
}
