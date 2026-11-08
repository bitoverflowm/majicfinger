"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Crosshair, ExternalLink, Loader2, Plus, RotateCcw, X } from "lucide-react";
import { gapLabel, headlineHits, marketNewsTerms, newsAround } from "@/lib/newsQuery";
import { cn } from "@/lib/utils";
import { CLOCK, DAY_CLOCK, DAY_MS, DAY_YEAR, HOUR, MINUTE, timeTicks } from "./chartTime";
import { useMarketNews } from "./useMarketNews";

export const NEWS_COLOR = "#f59e0b";
const TERMS_KEY = "lychee:news-terms:";
/** Markers closer than this many pixels share one. */
const CLUSTER_PX = 14;
const TIP_WIDTH = 320;
const TIP_ROWS = 6;
const LIST_ROWS = 150;
const NEW_FOR_MS = 5 * MINUTE;
const NEARBY_MS = DAY_MS;
const FALLBACK_SPAN_MS = 30 * DAY_MS;
/** The market view's timeline starts this long before the market opened, to catch the news that led up to it. */
const LEAD_IN_MS = DAY_MS;
const PROVIDER_LABEL = { google: "Google News", gdelt: "GDELT" };

function readTerms(conditionId) {
  try {
    const raw = window.localStorage.getItem(TERMS_KEY + conditionId);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed.filter((term) => typeof term === "string") : null;
  } catch {
    return null;
  }
}

/** Search terms for a market: worked out from its title until edited, then remembered per market. */
export function useNewsTerms(meta) {
  const conditionId = meta?.conditionId || "";
  const title = meta?.title || "";
  const subtitle = meta?.subtitle || "";
  const auto = useMemo(() => marketNewsTerms(title, subtitle), [title, subtitle]);
  const [custom, setCustom] = useState(null);
  useEffect(() => setCustom(conditionId ? readTerms(conditionId) : null), [conditionId]);
  const terms = custom ?? auto.terms;
  const save = (next) => {
    setCustom(next);
    try {
      if (next) window.localStorage.setItem(TERMS_KEY + conditionId, JSON.stringify(next));
      else window.localStorage.removeItem(TERMS_KEY + conditionId);
    } catch {
      /* storage full or blocked: the edit still applies for this visit */
    }
  };
  const lower = new Set(terms.map((term) => term.toLowerCase()));
  return {
    terms,
    suggestions: auto.suggestions.filter((item) => !lower.has(item.toLowerCase())),
    edited: custom != null,
    setTerms: save,
    reset: () => save(null),
  };
}

function articleTime(article, short) {
  if (article.precision === "day") return DAY_YEAR.format(article.t);
  return (short ? CLOCK : DAY_CLOCK).format(article.t);
}

function timeNote(article) {
  if (article.precision === "day") return "Google News only has the date for this one";
  if (article.precision === "seen") return "When GDELT first saw it, usually within 15 minutes of publishing";
  return "Published";
}

function sourceSummary(sources, count) {
  const parts = [];
  const warnings = [];
  for (const id of ["google", "gdelt"]) {
    const source = sources[id];
    if (!source) continue;
    if (source.status === "ok") parts.push(`${(source.articles?.length || 0).toLocaleString()} from ${PROVIDER_LABEL[id]}`);
    if (source.message) warnings.push(`${PROVIDER_LABEL[id]}: ${source.message}`);
  }
  const volume = sources.volume;
  if (volume?.message && volume.status !== "ok" && volume.message !== sources.gdelt?.message) warnings.push(`News volume: ${volume.message}`);
  const loading = ["google", "gdelt", "volume"].some((id) => sources[id]?.loading);
  return { line: parts.length ? `${count.toLocaleString()} headlines · ${parts.join(" · ")}` : "", warnings, loading };
}

/**
 * The words every matching article must mention, as removable chips, with an input to add more and
 * related words from the market's title one click away.
 */
export function NewsTermsBar({ news, terms, suggestions, edited, onChange, onReset }) {
  const [draft, setDraft] = useState("");
  const add = (term) => {
    const value = term.replace(/\s+/g, " ").trim();
    if (value.length < 2 || terms.some((item) => item.toLowerCase() === value.toLowerCase())) return;
    onChange([...terms, value].slice(0, 5));
  };
  const summary = sourceSummary(news.sources, news.articles.length);
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-0.5 text-[12px] font-medium text-muted-foreground">News that mentions</span>
        {terms.map((term) => (
          <span
            key={term}
            className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 py-0.5 pl-2.5 pr-1 text-[12px] font-medium text-amber-800 dark:text-amber-200"
          >
            {term}
            <button
              type="button"
              onClick={() => onChange(terms.filter((item) => item !== term))}
              className="rounded-full p-0.5 hover:bg-amber-500/20"
              aria-label={`Remove ${term}`}
            >
              <X className="size-3" aria-hidden />
            </button>
          </span>
        ))}
        {terms.length < 5 ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              add(draft);
              setDraft("");
            }}
          >
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={terms.length ? "and…" : "Add a word or name"}
              aria-label="Add a news search term"
              className="h-6 w-28 rounded-full border border-border/70 bg-transparent px-2.5 text-[12px] outline-none placeholder:text-muted-foreground/70 focus:w-40 focus:border-amber-500/60"
            />
          </form>
        ) : null}
        {suggestions.slice(0, 5).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => add(item)}
            className="inline-flex items-center gap-0.5 rounded-full border border-dashed border-border px-2 py-0.5 text-[11.5px] text-muted-foreground transition-colors hover:border-amber-500/50 hover:text-foreground"
          >
            <Plus className="size-3" aria-hidden />
            {item}
          </button>
        ))}
        {edited ? (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11.5px] text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Go back to the words picked from the market title"
          >
            <RotateCcw className="size-3" aria-hidden />
            Reset
          </button>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11.5px] text-muted-foreground">
        {!terms.length ? <span>Add a word to see matching news.</span> : null}
        {summary.loading ? (
          <span className="inline-flex items-center gap-1">
            <Loader2 className="size-3 animate-spin" aria-hidden />
            Searching the news
          </span>
        ) : null}
        {summary.line ? <span>{summary.line}</span> : null}
        {summary.warnings.map((warning) => (
          <span key={warning} className="text-amber-700 dark:text-amber-300">
            {warning}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Articles on screen grouped into markers no closer than CLUSTER_PX, oldest first inside each. */
function clusterArticles(articles, from, to, left, plotWidth) {
  const span = to - from || 1;
  const placed = [];
  for (const article of articles) {
    if (article.t < from || article.t > to) continue;
    placed.push({ article, x: left + ((article.t - from) / span) * plotWidth });
  }
  placed.sort((a, b) => a.x - b.x);
  const clusters = [];
  for (const item of placed) {
    const last = clusters.at(-1);
    if (last && item.x - last.x0 < CLUSTER_PX) {
      last.items.push(item.article);
      last.x1 = item.x;
    } else {
      clusters.push({ x0: item.x, x1: item.x, items: [item.article] });
    }
  }
  return clusters.map((cluster) => ({
    key: cluster.items[0].id,
    x: (cluster.x0 + cluster.x1) / 2,
    items: cluster.items.sort((a, b) => a.t - b.t),
  }));
}

function NewsTip({ cluster, box, pinned, onClose }) {
  const left = Math.min(Math.max(0, cluster.x - TIP_WIDTH / 2), Math.max(0, box.width - TIP_WIDTH));
  const first = cluster.items[0];
  const last = cluster.items.at(-1);
  const sameDay = new Date(first.t).toDateString() === new Date(last.t).toDateString();
  const range =
    cluster.items.length === 1
      ? articleTime(first, false)
      : sameDay
        ? `${DAY_YEAR.format(first.t)}, ${CLOCK.format(first.t)} to ${CLOCK.format(last.t)}`
        : `${DAY_CLOCK.format(first.t)} to ${DAY_CLOCK.format(last.t)}`;
  const shown = [...cluster.items].reverse().slice(0, TIP_ROWS);
  return (
    <div
      role="dialog"
      aria-label="Headlines"
      style={{ left, top: 22, width: TIP_WIDTH }}
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      className={cn(
        "absolute z-20 rounded-lg border border-border/70 bg-background px-3 py-2.5 text-[12px] shadow-lg",
        pinned ? "pointer-events-auto" : "pointer-events-none",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-medium text-foreground">
            {cluster.items.length === 1 ? "1 headline" : `${cluster.items.length.toLocaleString()} headlines`}
          </div>
          <div className="text-[11px] text-muted-foreground">{range}</div>
        </div>
        {pinned ? (
          <button type="button" onClick={onClose} className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close">
            <X className="size-3.5" aria-hidden />
          </button>
        ) : null}
      </div>
      <ul className="mt-2 space-y-2">
        {shown.map((article) => (
          <li key={article.id} className="leading-snug">
            <div className="text-[11px] text-muted-foreground" title={timeNote(article)}>
              {articleTime(article, sameDay)} · {article.source || article.domain}
            </div>
            {pinned ? (
              <a href={article.url} target="_blank" rel="noreferrer" className="line-clamp-2 font-medium text-foreground hover:underline">
                {article.title}
              </a>
            ) : (
              <div className="line-clamp-2 font-medium text-foreground">{article.title}</div>
            )}
          </li>
        ))}
      </ul>
      {cluster.items.length > TIP_ROWS ? (
        <p className="mt-2 text-[11px] text-muted-foreground">{(cluster.items.length - TIP_ROWS).toLocaleString()} more in the list below.</p>
      ) : null}
      {!pinned ? <p className="mt-2 text-[11px] text-muted-foreground">Click the marker to pin this and open the articles.</p> : null}
    </div>
  );
}

/**
 * Headline markers along the top of a chart whose plot spans `domain` between `left` and `right`
 * insets. Hover shows the headlines, a click pins them; `guideBottom` is where the hover line ends.
 */
export function NewsMarkers({ articles, domain, box, left, right, guideBottom, arrivals, now, pinned, onPin }) {
  const [hover, setHover] = useState(null);
  useEffect(() => setHover(null), [pinned]);
  const [from, to] = domain;
  const plotWidth = Math.max(1, box.width - left - right);
  const clusters = useMemo(() => clusterArticles(articles, from, to, left, plotWidth), [articles, from, to, left, plotWidth]);
  const pinnedCluster = pinned ? clusters.find((cluster) => cluster.key === pinned) : null;
  const shown = pinnedCluster || (hover ? clusters.find((cluster) => cluster.key === hover) : null);
  if (!box.width) return null;
  return (
    <>
      {shown ? (
        <div
          className="pointer-events-none absolute w-px"
          style={{ left: shown.x, top: 16, height: Math.max(0, guideBottom - 16), backgroundImage: `linear-gradient(${NEWS_COLOR} 50%, transparent 50%)`, backgroundSize: "1px 6px", opacity: 0.7 }}
          aria-hidden
        />
      ) : null}
      {clusters.map((cluster) => {
        const fresh = cluster.items.some((article) => now - (arrivals.get(article.id) || 0) < NEW_FOR_MS);
        const active = shown?.key === cluster.key;
        const count = cluster.items.length;
        return (
          <button
            key={cluster.key}
            type="button"
            aria-label={`${count} headline${count === 1 ? "" : "s"}`}
            onPointerDown={(event) => event.stopPropagation()}
            onDoubleClick={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onPin(pinned === cluster.key ? null : cluster.key);
            }}
            onMouseEnter={() => setHover(cluster.key)}
            onMouseLeave={() => setHover(null)}
            className="absolute top-0.5 flex h-[14px] min-w-[14px] -translate-x-1/2 items-center justify-center rounded-[4px] px-[3px] text-[9px] font-semibold leading-none text-white shadow-sm transition-transform hover:scale-110"
            style={{ left: cluster.x, backgroundColor: NEWS_COLOR, opacity: active ? 1 : 0.85, transform: active ? "translateX(-50%) scale(1.15)" : undefined }}
          >
            {fresh ? <span className="absolute inset-0 animate-ping rounded-[4px] opacity-60" style={{ backgroundColor: NEWS_COLOR }} /> : null}
            <span className="relative">{count > 1 ? (count > 99 ? "99+" : count) : ""}</span>
          </button>
        );
      })}
      {shown ? <NewsTip cluster={shown} box={box} pinned={!!pinnedCluster} onClose={() => onPin(null)} /> : null}
    </>
  );
}

/**
 * GDELT's counts when it found anything; otherwise the headlines we did find, counted into about
 * `buckets` bars over `domain`. `counted` says which.
 */
export function newsVolume(news, domain, buckets = 72) {
  if (news.volume.some((point) => point.count > 0)) return { volume: news.volume, counted: false };
  const timed = news.articles.filter((article) => article.precision !== "day");
  if (!timed.length) return { volume: news.volume, counted: false };
  const [from, to] = domain;
  const step = Math.max(MINUTE, (to - from) / buckets);
  const total = Math.ceil((to - from) / step);
  const counts = new Array(total).fill(0);
  for (const article of timed) {
    if (article.t < from || article.t > to) continue;
    counts[Math.min(total - 1, Math.floor((article.t - from) / step))] += 1;
  }
  return { volume: counts.map((count, index) => ({ t: from + index * step, count })), counted: true };
}

function bucketSize(volume) {
  const gaps = [];
  for (let i = 1; i < volume.length; i += 1) gaps.push(volume[i].t - volume[i - 1].t);
  gaps.sort((a, b) => a - b);
  return gaps.length ? gaps[Math.floor(gaps.length / 2)] : 15 * MINUTE;
}

/**
 * How many matching articles came out per time bucket, as bars over `domain`, inset to line up with
 * the chart above. `onPick(start, end)` makes the bars clickable.
 */
export function NewsVolumeBars({ volume, domain, left, right, height = 28, label = "News", onPick }) {
  const [from, to] = domain;
  const span = to - from || 1;
  const bucket = useMemo(() => bucketSize(volume), [volume]);
  const inside = volume.filter((point) => point.t + bucket >= from && point.t <= to);
  const max = inside.reduce((top, point) => Math.max(top, point.count), 0);
  return (
    <div className="relative" style={{ height }}>
      <span
        className="absolute top-1/2 -translate-y-1/2 pr-2 text-right text-[10px] font-medium text-muted-foreground"
        style={{ left: 0, width: left }}
        title={max ? `Up to ${max.toLocaleString()} articles per bar` : undefined}
      >
        {label}
      </span>
      <svg
        className="absolute inset-y-0 h-full overflow-visible"
        style={{ left, right, width: `calc(100% - ${left + right}px)` }}
        viewBox={`0 0 1000 ${height}`}
        preserveAspectRatio="none"
        aria-label="Matching articles over time"
      >
        <line x1={0} x2={1000} y1={height - 0.5} y2={height - 0.5} stroke="currentColor" strokeOpacity={0.12} vectorEffect="non-scaling-stroke" />
        {max
          ? inside.map((point) => {
              const x0 = Math.max(0, ((point.t - from) / span) * 1000);
              const x1 = Math.min(1000, ((point.t + bucket - from) / span) * 1000);
              const h = Math.max(1.5, (point.count / max) * (height - 2));
              return (
                <rect
                  key={point.t}
                  x={x0}
                  width={Math.max(0.6, x1 - x0 - Math.min(0.6, (x1 - x0) * 0.15))}
                  y={height - h}
                  height={h}
                  fill={NEWS_COLOR}
                  fillOpacity={point.count ? 0.6 : 0}
                  className={onPick && point.count ? "cursor-pointer" : undefined}
                  onClick={onPick && point.count ? () => onPick(point.t, point.t + bucket) : undefined}
                >
                  <title>{`${(bucket >= DAY_MS ? DAY_YEAR : DAY_CLOCK).format(point.t)} · ${point.count.toLocaleString()} article${point.count === 1 ? "" : "s"}`}</title>
                </rect>
              );
            })
          : null}
      </svg>
    </div>
  );
}

/** The closest headlines either side of a trade, for its tooltip. */
export function NewsNearMove({ articles, t }) {
  const { before, after } = useMemo(() => newsAround(articles, t, NEARBY_MS), [articles, t]);
  if (!articles.length) return null;
  const row = (article, label) => (
    <div className="leading-snug">
      <div className="text-[11px] text-muted-foreground" title={timeNote(article)}>
        <span className="font-medium" style={{ color: NEWS_COLOR }}>
          {gapLabel(article.t - t)} {label}
        </span>{" "}
        · {article.source || article.domain}
      </div>
      <div className="line-clamp-2 text-[11.5px] text-foreground">{article.title}</div>
    </div>
  );
  return (
    <div className="mt-2 space-y-1.5 border-t border-border/60 pt-2">
      <div className="text-[11px] font-medium text-muted-foreground">News nearby</div>
      {before ? row(before, "before") : null}
      {after ? row(after, "after") : null}
      {!before && !after ? <p className="text-[11px] text-muted-foreground">No matching headline within a day of this move.</p> : null}
    </div>
  );
}

/** Matching headlines, newest first, limited to `domain` when given. */
export function NewsList({ articles, terms, domain, arrivals, now, onShow, empty }) {
  const [headlineOnly, setHeadlineOnly] = useState(false);
  const rows = useMemo(() => {
    const [from, to] = domain || [-Infinity, Infinity];
    return articles.filter((article) => {
      const pad = article.precision === "day" ? DAY_MS : 0;
      if (article.t + pad < from || article.t - pad > to) return false;
      return !headlineOnly || headlineHits(article.title, terms) > 0;
    });
  }, [articles, domain, headlineOnly, terms]);
  return (
    <div className="rounded-xl border border-border/70 bg-background shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
        <span className="text-[12px] font-medium text-foreground">
          {rows.length.toLocaleString()} headline{rows.length === 1 ? "" : "s"}
          {domain ? " in view" : ""}
        </span>
        <label className="inline-flex cursor-pointer items-center gap-1.5 text-[11.5px] text-muted-foreground">
          <input type="checkbox" checked={headlineOnly} onChange={(event) => setHeadlineOnly(event.target.checked)} className="accent-amber-500" />
          Only when the headline names it
        </label>
      </div>
      {rows.length ? (
        <ul className="max-h-[320px] divide-y divide-border/50 overflow-y-auto">
          {rows.slice(0, LIST_ROWS).map((article) => {
            const fresh = now - (arrivals.get(article.id) || 0) < NEW_FOR_MS;
            return (
              <li key={article.id} className="flex items-start gap-3 px-3 py-2 text-[12.5px]">
                <span className="w-[104px] shrink-0 pt-px text-[11.5px] tabular-nums text-muted-foreground" title={timeNote(article)}>
                  {articleTime(article, false)}
                  {article.precision === "day" ? <span className="block text-[10.5px]">date only</span> : null}
                </span>
                <div className="min-w-0 flex-1">
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group inline font-medium leading-snug text-foreground hover:underline"
                  >
                    {fresh ? <span className="mr-1.5 rounded bg-amber-500/15 px-1 py-px text-[10.5px] font-semibold text-amber-700 dark:text-amber-300">New</span> : null}
                    {article.title}
                    <ExternalLink className="ml-1 inline size-3 opacity-0 transition-opacity group-hover:opacity-60" aria-hidden />
                  </a>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    {article.source || article.domain}
                    {article.providers?.length ? ` · via ${article.providers.map((id) => PROVIDER_LABEL[id] || id).join(" and ")}` : ""}
                  </div>
                </div>
                {onShow && article.precision !== "day" ? (
                  <button
                    type="button"
                    onClick={() => onShow(article)}
                    className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label="Show on the chart"
                    title="Show on the chart"
                  >
                    <Crosshair className="size-3.5" aria-hidden />
                  </button>
                ) : null}
              </li>
            );
          })}
          {rows.length > LIST_ROWS ? (
            <li className="px-3 py-2 text-[11.5px] text-muted-foreground">
              Showing the newest {LIST_ROWS}. Zoom the chart in to see the rest.
            </li>
          ) : null}
        </ul>
      ) : (
        <p className="px-3 py-6 text-center text-[12px] text-muted-foreground">{empty}</p>
      )}
    </div>
  );
}

function useBox(ref) {
  const [box, setBox] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const measure = () => setBox({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return box;
}

function useMinuteClock(on) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!on) return undefined;
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, [on]);
  return now;
}

const TIMELINE_LEFT = 12;
const TIMELINE_RIGHT = 12;
const TIMELINE_BARS = 120;

/**
 * A market's news on its own: matching headlines and how many came out when, from the day it opened
 * to now (or to its close). Click a bar to drill into that stretch; it keeps checking for news live.
 */
export function MarketNewsSection({ meta }) {
  const live = !meta.closed;
  const now = useMinuteClock(live);
  const closeAt = meta.closed ? Math.min(meta.closeMs || now, now) : now;
  const listedAt = meta.openMs || closeAt - FALLBACK_SPAN_MS;
  const openAt = listedAt - Math.max(LEAD_IN_MS, (closeAt - listedAt) * 0.1);
  const [focus, setFocus] = useState(null);
  useEffect(() => setFocus(null), [meta.conditionId]);
  const termState = useNewsTerms(meta);
  const win = focus ? { start: focus.start, end: focus.end, live: false } : { start: openAt, end: closeAt, live };
  const news = useMarketNews(termState.terms, win);
  const [pinned, setPinned] = useState(null);
  const wrapRef = useRef(null);
  const box = useBox(wrapRef);
  const domain = [win.start, Math.max(win.end, win.start + HOUR)];
  const bars = newsVolume(news, domain);
  const axis = timeTicks(domain[0], domain[1]);
  const plotWidth = Math.max(1, box.width - TIMELINE_LEFT - TIMELINE_RIGHT);

  return (
    <div className="space-y-3">
      <NewsTermsBar
        news={news}
        terms={termState.terms}
        suggestions={termState.suggestions}
        edited={termState.edited}
        onChange={termState.setTerms}
        onReset={termState.reset}
      />
      <section aria-label="News timeline" className="rounded-xl border border-border/70 bg-background p-3 shadow-sm">
        <div className="flex items-center justify-between gap-2 px-1 pb-1">
          <span className="text-[12px] text-muted-foreground">
            {focus ? `${DAY_CLOCK.format(focus.start)} to ${DAY_CLOCK.format(focus.end)}` : "Whole market"}
          </span>
          <span className="flex items-center gap-3">
            {bars.counted ? (
              <span className="text-[11.5px] text-muted-foreground" title="GDELT's full article counts aren't available right now">
                Bars count the headlines found
              </span>
            ) : null}
            {focus ? (
              <button
                type="button"
                onClick={() => setFocus(null)}
                className="rounded-md px-2 py-1 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                Back to the whole market
              </button>
            ) : (
              <span className="text-[11.5px] text-muted-foreground">Click a bar to look closer</span>
            )}
          </span>
        </div>
        <div ref={wrapRef} className="relative" onClick={() => setPinned(null)}>
          <div className="h-5" />
          <NewsVolumeBars
            volume={bars.volume}
            domain={domain}
            left={TIMELINE_LEFT}
            right={TIMELINE_RIGHT}
            height={TIMELINE_BARS}
            label=""
            onPick={(start, end) => {
              const span = Math.max(end - start, 2 * HOUR);
              const middle = (start + end) / 2;
              setPinned(null);
              setFocus({ start: middle - span / 2, end: Math.min(middle + span / 2, now) });
            }}
          />
          <NewsMarkers
            articles={news.articles}
            domain={domain}
            box={box}
            left={TIMELINE_LEFT}
            right={TIMELINE_RIGHT}
            guideBottom={box.height}
            arrivals={news.arrivals}
            now={now}
            pinned={pinned}
            onPin={setPinned}
          />
          {!bars.volume.length && !news.articles.length ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[12px] text-muted-foreground">
              {news.loading ? "Searching the news" : termState.terms.length ? "No matching news in this stretch yet" : "Add a word to search the news"}
            </div>
          ) : null}
        </div>
        <div className="relative h-5 text-[11px] text-muted-foreground">
          {axis.ticks.map((tick) => (
            <span key={tick} className="absolute top-1 -translate-x-1/2 whitespace-nowrap" style={{ left: TIMELINE_LEFT + ((tick - domain[0]) / (domain[1] - domain[0])) * plotWidth }}>
              {axis.format(tick)}
            </span>
          ))}
        </div>
      </section>
      <NewsList
        articles={news.articles}
        terms={termState.terms}
        domain={focus ? domain : null}
        arrivals={news.arrivals}
        now={now}
        empty={news.loading ? "Searching the news" : "No matching headlines here. Try fewer or different words."}
      />
    </div>
  );
}
