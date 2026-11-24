import { createRunReporter } from "@/components/dashboardComposer/integrationRunFeed";
import { stampRunSheets } from "@/components/dashboardComposer/integrationProvenance";
import { claimSheetId } from "@/components/dashboardComposer/integrationRunSheets";
import { createRunSheetStage } from "@/components/dashboardComposer/runSheetStage";
import { cleanTerms } from "@/lib/newsQuery";

export const HISTORICAL_NEWS_SINCE = "2019-01-01";
const ROW_LIMIT = 80;

export const HISTORICAL_NEWS_COLUMNS = [
  { id: "title", title: "Title", type: "string" },
  { id: "source", title: "Source", type: "string" },
  { id: "published_at", title: "Published", type: "date" },
  { id: "url", title: "URL", type: "string" },
];

function dayStartMs(isoDate) {
  const parts = String(isoDate || "").split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return null;
  return Date.UTC(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
}

function dayEndMs(isoDate) {
  const parts = String(isoDate || "").split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return null;
  return Date.UTC(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999);
}

function todayIso() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
}

/** Default window: 2019-01-01 → today (UTC). */
export function defaultHistoricalNewsRange() {
  return { from: HISTORICAL_NEWS_SINCE, to: todayIso() };
}

/**
 * Pull headlines for every keyword in the window via `/api/news` (archive when configured).
 * @returns {Promise<{ columns: object[], rows: object[], label: string }>}
 */
export async function pullHistoricalNews({ terms, from, to, signal, onProgress } = {}) {
  const cleaned = cleanTerms(Array.isArray(terms) ? terms : [terms]);
  if (!cleaned.length) throw new Error("Add at least one keyword.");
  const start = dayStartMs(from) ?? dayStartMs(HISTORICAL_NEWS_SINCE);
  const end = dayEndMs(to) ?? dayEndMs(todayIso());
  if (!start || !end || end < start) throw new Error("Pick a valid date range.");

  const params = new URLSearchParams({
    source: "gdelt",
    start: String(start),
    end: String(end),
  });
  for (const term of cleaned) params.append("terms", term);

  onProgress?.(`Searching ${cleaned.join(", ")}…`);
  const res = await fetch(`/api/news?${params}`, { signal });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.message || `News lookup failed (${res.status}).`);

  const status = String(json?.status || "");
  if (status === "busy" || status === "limited") {
    throw new Error(json?.message || "News archive is busy — try again in a moment.");
  }
  if (status === "unavailable" || status === "error") {
    throw new Error(json?.message || "News archive did not answer.");
  }
  if (status === "out_of_range") {
    throw new Error("That date range is outside the news archive.");
  }

  const articles = Array.isArray(json?.articles) ? json.articles : [];
  const rows = articles.slice(0, ROW_LIMIT).map((article) => {
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

  onProgress?.(`${rows.length.toLocaleString()} headline${rows.length === 1 ? "" : "s"}`);
  return {
    columns: HISTORICAL_NEWS_COLUMNS,
    rows,
    label: cleaned.join(", "),
  };
}

/**
 * Save and Go: close the picker, pull headlines, place a sheet on the open tab.
 */
export async function runHistoricalNews({ terms, from, to, canvas, close }) {
  const reporter = createRunReporter((feed) => canvas?.reportRun?.(feed));
  const cleaned = cleanTerms(Array.isArray(terms) ? terms : [terms]);
  canvas?.armReplay?.(() => runHistoricalNews({ terms: cleaned, from, to, canvas, close: null }));
  reporter.plan(
    [
      { id: "filter", name: "set_filters", status: "pending", args: { keywords: cleaned.join(", "), from, to } },
      { id: "pull", name: "pull_headlines", status: "pending", args: { source: "historical_news" } },
      { id: "place", name: "place_sheets", status: "pending", args: { charts: "none" } },
    ],
    {
      title: `Historical News · ${cleaned.join(", ") || "headlines"}`,
      runningLabel: "Pulling headlines",
      doneLabel: "Headlines ready",
      failLabel: "Headline pull failed",
      readyDetail: "The news sheet is on the canvas behind this card.",
    },
  );
  close?.();

  reporter.start("filter");
  reporter.succeed("filter", { result: `${cleaned.join(", ")} · ${from} → ${to}` });

  reporter.start("pull");
  let pulled;
  try {
    pulled = await pullHistoricalNews({
      terms: cleaned,
      from,
      to,
      onProgress: (text) => reporter.note("pull", text),
    });
  } catch (err) {
    reporter.fail("pull", err instanceof Error ? err.message : "The pull did not finish.");
    return;
  }
  if (!pulled.rows.length) {
    reporter.fail("pull", "No headlines matched those keywords in that window.");
    return;
  }
  reporter.succeed("pull", {
    result: `${pulled.rows.length.toLocaleString()} headline${pulled.rows.length === 1 ? "" : "s"}`,
  });

  reporter.start("place");
  const pageId = canvas?.pageId || "";
  const occupied = new Set(((canvas?.blocksByPage || {})[pageId] || []).map((block) => block?.id).filter(Boolean));
  const sheetId = claimSheetId(`run-historical-news-${cleaned.join("-").replace(/[^A-Za-z0-9]+/g, "-").slice(0, 40)}`, occupied, new Map());
  const sheet = stampRunSheets(
    [
      {
        id: sheetId,
        title: `News · ${pulled.label}`,
        columns: pulled.columns,
        rows: pulled.rows,
        rowCount: pulled.rows.length,
        keepAllRows: true,
        span: "full",
        table: "headlines",
        integrationId: "historicalNews",
        summary: `Historical News · ${pulled.label} · ${from} → ${to}`,
        pull: {
          table: "headlines",
          terms: cleaned,
          from,
          to,
          limit: ROW_LIMIT,
        },
      },
    ],
    { integrationId: "historicalNews" },
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
