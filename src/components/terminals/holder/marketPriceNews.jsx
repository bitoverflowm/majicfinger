"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DAY_MS, HOUR } from "./chartTime";
import { NewsList, NewsTermsBar, NewsVolumeBars, newsVolume, useNewsTerms } from "./marketNews";
import {
  ChartLegend,
  MoveChart,
  PLOT_LEFT,
  PLOT_RIGHT,
  RangeStrip,
  Waiting,
  ZoomControls,
  newsWindow,
  useChartZoom,
  useNow,
  usePriceWindow,
  useZoomedDomain,
} from "./traderMarketFocus";
import { useMarketNews } from "./useMarketNews";

const NO_MOVES = [];
const FALLBACK_SPAN_MS = 30 * DAY_MS;
/** The chart starts at least this long before the market opened, to catch the news that led up to it. */
const LEAD_IN_MS = DAY_MS;
const NEWS_SPAN_MS = 6 * HOUR;
const MIN_PICK_MS = 2 * HOUR;

function noop() {}

/**
 * A market's price over its whole life with matching headlines on it and how many came out when
 * underneath, so moves can be read against the news. Zoom in to look closer; it follows live while open.
 */
export function MarketPriceNews({ meta, livePrices }) {
  const live = !meta.closed;
  const now = useNow(live ? 5000 : 0);
  const closeMs = meta.closed ? Math.min(meta.closeMs || now, now) : 0;
  const listedAt = meta.openMs || (closeMs || now) - FALLBACK_SPAN_MS;
  const win = useMemo(() => {
    if (live) return { start: listedAt - LEAD_IN_MS, end: now, follow: true };
    return { start: listedAt - Math.max(LEAD_IN_MS, (closeMs - listedAt) * 0.1), end: closeMs, follow: false };
  }, [live, listedAt, closeMs, now]);

  const zoom = useChartZoom(meta.conditionId);
  const prices = usePriceWindow(meta, win, livePrices, zoom.detail);
  const lastLine = prices.lines ? Math.max(prices.lines[0].at(-1)?.t ?? 0, prices.lines[1].at(-1)?.t ?? 0) : 0;
  const full = { start: win.start, end: win.follow ? Math.max(now, lastLine) : win.end, follow: win.follow };
  const { domain, zoomed, changeView, zoomBy, reset } = useZoomedDomain(zoom, full);

  const newsTerms = useNewsTerms(meta);
  const news = useMarketNews(newsTerms.terms, newsWindow(full, zoom.detail));
  const bars = newsVolume(news, domain);
  const [pinnedNews, setPinnedNews] = useState(null);
  useEffect(() => setPinnedNews(null), [meta.conditionId]);
  const chartRef = useRef(null);

  const zoomTo = (start, end, minSpan) => {
    const span = Math.min(Math.max(end - start, minSpan), full.end - full.start);
    const middle = (start + end) / 2;
    changeView(middle - span / 2, middle + span / 2);
    setPinnedNews(null);
  };
  const showNews = (article) => {
    zoomTo(article.t, article.t, NEWS_SPAN_MS);
    chartRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const outcomes = [meta.outcomes?.[0] || "Yes", meta.outcomes?.[1] || "No"];
  const hasTerms = newsTerms.terms.length > 0;

  return (
    <div className="space-y-3">
      <NewsTermsBar
        news={news}
        terms={newsTerms.terms}
        suggestions={newsTerms.suggestions}
        edited={newsTerms.edited}
        onChange={newsTerms.setTerms}
        onReset={newsTerms.reset}
      />

      <section ref={chartRef} aria-label="Market price with the news" className="rounded-xl border border-border/70 bg-background p-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-2">
          {prices.lines ? <ZoomControls zoomed={zoomed} onZoom={zoomBy} onReset={reset} /> : <span />}
          <span className="text-[11.5px] text-muted-foreground">
            {bars.counted ? "News bars count the headlines found · " : ""}
            {hasTerms ? "Click a news bar to look closer" : "Add a word to search the news"}
          </span>
        </div>
        <div className="h-[380px]">
          {prices.lines ? (
            <MoveChart
              meta={meta}
              lines={prices.lines}
              moves={NO_MOVES}
              domain={domain}
              now={now}
              livePrices={livePrices}
              pinned={null}
              setPinned={noop}
              onView={changeView}
              zoomed={zoomed}
              news={news.articles}
              newsArrivals={news.arrivals}
              pinnedNews={pinnedNews}
              setPinnedNews={setPinnedNews}
            />
          ) : prices.error ? (
            <p className="flex h-full items-center justify-center text-[12px] text-muted-foreground">{prices.error}</p>
          ) : (
            <Waiting label="Loading the price history" />
          )}
        </div>
        {prices.lines ? (
          <div className="pt-1">
            {bars.volume.length ? (
              <NewsVolumeBars
                volume={bars.volume}
                domain={domain}
                left={PLOT_LEFT}
                right={PLOT_RIGHT}
                label={bars.counted ? "Found" : "News"}
                onPick={(start, end) => zoomTo(start, end, MIN_PICK_MS)}
              />
            ) : null}
            <div className="h-2" />
            <RangeStrip lines={prices.lines} moves={NO_MOVES} full={full} domain={domain} zoomed={zoomed} onView={changeView} />
            <p className="mt-1.5 text-[11px] text-muted-foreground" style={{ marginLeft: PLOT_LEFT }}>
              Pinch, or hold ⌘ or Ctrl and scroll, to zoom. Drag the chart or scroll sideways to move along it. Drag across the
              strip to pick a range. Double-click to zoom in.
            </p>
          </div>
        ) : null}
        <ChartLegend outcomes={outcomes} livePrices={livePrices} news={hasTerms} moves={false} />
      </section>

      {hasTerms ? (
        <NewsList
          articles={news.articles}
          terms={newsTerms.terms}
          domain={zoomed ? domain : null}
          arrivals={news.arrivals}
          now={now}
          onShow={showNews}
          empty={
            news.loading
              ? "Searching the news"
              : zoomed
                ? "No matching headlines in this stretch. Zoom out, or try fewer or different words."
                : "No matching headlines here. Try fewer or different words."
          }
        />
      ) : null}
    </div>
  );
}
