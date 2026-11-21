import { createRunReporter } from "@/components/dashboardComposer/integrationRunFeed";
import { stampRunSheets } from "@/components/dashboardComposer/integrationProvenance";
import { claimSheetId } from "@/components/dashboardComposer/integrationRunSheets";
import { createRunSheetStage } from "@/components/dashboardComposer/runSheetStage";
import { cleanTerms, mergeArticles } from "@/lib/newsQuery";

const ROW_LIMIT = 80;
const DAY_MS = 24 * 60 * 60 * 1000;

export const NEWS_LIVE_LOOKBACKS = [
  { id: "6h", label: "Last 6 hours", ms: 6 * 60 * 60 * 1000 },
  { id: "24h", label: "Last 24 hours", ms: DAY_MS },
  { id: "7d", label: "Last 7 days", ms: 7 * DAY_MS },
];

export const NEWS_LIVE_COLUMNS = [
  { id: "title", title: "Title", type: "string" },
  { id: "source", title: "Source", type: "string" },
  { id: "published_at", title: "Published", type: "date" },
  { id: "url", title: "URL", type: "string" },
];

function lookbackMs(id) {
  return NEWS_LIVE_LOOKBACKS.find((item) => item.id === id)?.ms || DAY_MS;
}

function articleRows(articles) {
  return (articles || []).slice(0, ROW_LIMIT).map((article) => {
    const published = article.published_at ?? article.t ?? null;
    let iso = null;
    if (published != null) {
      const ms = typeof published === "number" ? published : Date.parse(published);
      if (Number.isFinite(ms)) iso = new Date(ms).toISOString();
    }
    return {
      title: article.title || "",
      source: article.source || article.domain || "",
      published_at: iso || published || "",
      url: article.publisher_url || article.url || "",
    };
  });
}

async function fetchSource(source, terms, start, end, signal) {
  const params = new URLSearchParams({
    source,
    start: String(start),
    end: String(end),
  });
  for (const term of terms) params.append("terms", term);
  const res = await fetch(`/api/news?${params}`, { signal });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.message || `News lookup failed (${res.status}).`);
  const status = String(json?.status || "");
  if (status === "busy" || status === "limited") {
    throw new Error(json?.message || "News feed is busy — try again in a moment.");
  }
  if (status === "unavailable" || status === "error") {
    throw new Error(json?.message || "News feed did not answer.");
  }
  return Array.isArray(json?.articles) ? json.articles : [];
}

/**
 * Live window pull: Google + GDELT merged for the lookback ending now.
 */
export async function pullNewsLive({ terms, lookback = "24h", signal, onProgress } = {}) {
  const cleaned = cleanTerms(Array.isArray(terms) ? terms : [terms]);
  if (!cleaned.length) throw new Error("Add at least one keyword filter.");
  const end = Date.now();
  const start = end - lookbackMs(lookback);
  onProgress?.(`Listening for ${cleaned.join(", ")}…`);

  const [google, gdelt] = await Promise.all([
    fetchSource("google", cleaned, start, end, signal).catch(() => []),
    fetchSource("gdelt", cleaned, start, end, signal).catch(() => []),
  ]);
  const merged = mergeArticles([google, gdelt]);
  const rows = articleRows(merged);
  onProgress?.(`${rows.length.toLocaleString()} live headline${rows.length === 1 ? "" : "s"}`);
  return {
    columns: NEWS_LIVE_COLUMNS,
    rows,
    label: cleaned.join(", "),
    lookback,
    start,
    end,
  };
}

/**
 * Save and Go: close picker, pull the live window, place a sheet on the open tab.
 */
export async function runNewsLive({ terms, lookback = "24h", canvas, close }) {
  const reporter = createRunReporter((feed) => canvas?.reportRun?.(feed));
  const cleaned = cleanTerms(Array.isArray(terms) ? terms : [terms]);
  const windowLabel = NEWS_LIVE_LOOKBACKS.find((item) => item.id === lookback)?.label || lookback;
  canvas?.armReplay?.(() => runNewsLive({ terms: cleaned, lookback, canvas, close: null }));
  reporter.plan(
    [
      { id: "filter", name: "set_filters", status: "pending", args: { keywords: cleaned.join(", "), lookback } },
      { id: "pull", name: "pull_live_headlines", status: "pending", args: { source: "news_live" } },
      { id: "place", name: "place_sheets", status: "pending", args: { charts: "none" } },
    ],
    {
      title: `News Live · ${cleaned.join(", ") || "headlines"}`,
      runningLabel: "Pulling live headlines",
      doneLabel: "Live headlines ready",
      failLabel: "Live headline pull failed",
      readyDetail: "The news sheet is on the canvas behind this card.",
    },
  );
  close?.();

  reporter.start("filter");
  reporter.succeed("filter", { result: `${cleaned.join(", ")} · ${windowLabel}` });

  reporter.start("pull");
  let pulled;
  try {
    pulled = await pullNewsLive({
      terms: cleaned,
      lookback,
      onProgress: (text) => reporter.note("pull", text),
    });
  } catch (err) {
    reporter.fail("pull", err instanceof Error ? err.message : "The pull did not finish.");
    return;
  }
  if (!pulled.rows.length) {
    reporter.fail("pull", "No live headlines matched those filters yet.");
    return;
  }
  reporter.succeed("pull", {
    result: `${pulled.rows.length.toLocaleString()} headline${pulled.rows.length === 1 ? "" : "s"}`,
  });

  reporter.start("place");
  const pageId = canvas?.pageId || "";
  const occupied = new Set(((canvas?.blocksByPage || {})[pageId] || []).map((block) => block?.id).filter(Boolean));
  const sheetId = claimSheetId(
    `run-news-live-${cleaned.join("-").replace(/[^A-Za-z0-9]+/g, "-").slice(0, 40)}`,
    occupied,
    new Map(),
  );
  const sheet = stampRunSheets(
    [
      {
        id: sheetId,
        title: `News Live · ${pulled.label}`,
        columns: pulled.columns,
        rows: pulled.rows,
        rowCount: pulled.rows.length,
        keepAllRows: true,
        span: "full",
        table: "headlines_live",
        integrationId: "newsLive",
        summary: `News Live · ${pulled.label} · ${windowLabel}`,
        pull: {
          table: "headlines_live",
          terms: cleaned,
          lookback,
          limit: ROW_LIMIT,
          live: true,
        },
      },
    ],
    { integrationId: "newsLive" },
  )[0];

  const stage = createRunSheetStage({
    reveal: (list, extra) => canvas?.revealRunSheets?.(list, { ...extra }),
    opensChart: () => false,
  });
  stage.put(sheet);
  await stage.settle();
  reporter.succeed("place", { result: `${sheet.title} on this tab` });
  reporter.finish();
}
