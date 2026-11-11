"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PRIMARY_CTA } from "@/components/holderLanding/holderLandingRail";
import { NewsList, NewsTermsBar, NewsVolumeBars, newsVolume } from "@/components/terminals/holder/marketNews";
import { useMarketNews } from "@/components/terminals/holder/useMarketNews";
import { cleanTerms } from "@/lib/newsQuery";
import { cn } from "@/lib/utils";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const SNAP_MS = 15 * 60_000;
const BARS_LEFT = 52;
const RANGES = [
  { id: "1d", label: "24 hours", ms: DAY, live: true },
  { id: "7d", label: "7 days", ms: 7 * DAY, live: true },
  { id: "30d", label: "30 days", ms: 30 * DAY },
  { id: "90d", label: "90 days", ms: 90 * DAY },
  { id: "1y", label: "1 year", ms: 365 * DAY },
];
const DATE = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
const DATE_TIME = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export function NewsArchiveHeroActions() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <a href="#search" className={cn(PRIMARY_CTA, "h-11 px-6 text-[15px] font-normal")}>
        Search the archive <span aria-hidden>↓</span>
      </a>
      <Link
        href="/polymarket-holder-terminal"
        className="flex h-11 items-center justify-center gap-1.5 rounded-full border border-border bg-background/80 px-6 text-[15px] font-normal text-primary backdrop-blur transition-all ease-out hover:bg-muted active:scale-95"
      >
        Open the Holder Terminal <span aria-hidden>→</span>
      </Link>
    </div>
  );
}

function RangeToggle({ ranges, value, onChange }) {
  return (
    <div role="radiogroup" aria-label="Time range" className="inline-flex flex-wrap items-center gap-1 rounded-full border border-border bg-muted/60 p-1">
      {ranges.map((range) => {
        const active = range.id === value;
        return (
          <button
            key={range.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(range.id)}
            className={cn(
              "h-7 rounded-full px-3 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40",
              active ? "bg-background text-foreground shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {range.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Keyword search over Google News and Lychee's GDELT archive: trending topics to start from,
 * article counts over the range (click a bar to read that stretch), and the matching headlines.
 * `?q=word&q=word` in the URL opens on those words.
 */
export function NewsArchiveSearch({ topics, archiveStart }) {
  const initial = topics[0]?.terms || [];
  const [terms, setTerms] = useState(initial);
  const [rangeId, setRangeId] = useState("7d");
  const [focus, setFocus] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const termsKey = terms.join("\u0001");

  useEffect(() => {
    const fromUrl = cleanTerms(new URLSearchParams(window.location.search).getAll("q"));
    if (fromUrl.length) setTerms(fromUrl.slice(0, 5));
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => setFocus(null), [termsKey, rangeId]);

  const ranges = useMemo(
    () => (archiveStart ? [...RANGES, { id: "all", label: `Since ${new Date(archiveStart).getUTCFullYear()}`, from: archiveStart }] : RANGES),
    [archiveStart],
  );
  const range = ranges.find((item) => item.id === rangeId) || ranges[1];
  const end = Math.ceil(now / SNAP_MS) * SNAP_MS;
  const start = range.from ?? end - range.ms;
  const win = useMemo(() => ({ start, end, live: !!range.live }), [start, end, range.live]);
  const domain = useMemo(() => [start, end], [start, end]);

  const news = useMarketNews(terms, terms.length ? win : null);
  const { volume } = useMemo(() => newsVolume(news, domain), [news, domain]);
  const edited = termsKey !== initial.join("\u0001");
  const label = (t) => (end - start > 2 * DAY ? DATE : DATE_TIME).format(t);

  return (
    <div className="rounded-2xl border border-border bg-background p-4 shadow-[0_12px_32px_-20px_rgba(16,24,40,0.25)] sm:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[12px] font-medium text-muted-foreground">Trending</span>
          {topics.map((topic) => {
            const active = topic.terms.join("\u0001") === termsKey;
            return (
              <button
                key={topic.terms.join("|")}
                type="button"
                title={topic.title}
                onClick={() => setTerms(topic.terms)}
                className={cn(
                  "max-w-[16rem] truncate rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors",
                  active
                    ? "border-amber-500/50 bg-amber-500/10 text-amber-800 dark:text-amber-200"
                    : "border-border text-foreground/80 hover:border-amber-500/40 hover:text-foreground",
                )}
              >
                {topic.terms.join(" + ")}
              </button>
            );
          })}
        </div>
        <RangeToggle ranges={ranges} value={range.id} onChange={setRangeId} />
      </div>

      <div className="mt-5">
        <NewsTermsBar news={news} terms={terms} suggestions={[]} edited={edited} onChange={setTerms} onReset={() => setTerms(initial)} />
      </div>

      <div className="mt-5 rounded-xl border border-border/70 bg-muted/30 px-3 pb-2 pt-3">
        <NewsVolumeBars volume={volume} domain={domain} left={BARS_LEFT} right={0} height={88} label="Articles" onPick={(from, to) => setFocus([from, to])} />
        <div className="mt-1.5 flex justify-between text-[11px] tabular-nums text-muted-foreground" style={{ paddingLeft: BARS_LEFT }}>
          <span>{label(start)}</span>
          <span>{range.live ? "Now" : label(end)}</span>
        </div>
      </div>

      <p className="mt-2 min-h-[1.25rem] text-[12px] text-muted-foreground">
        {focus ? (
          <>
            Reading {label(focus[0])} to {label(focus[1])}.{" "}
            <button type="button" onClick={() => setFocus(null)} className="font-medium text-foreground underline-offset-2 hover:underline">
              Show the whole range
            </button>
          </>
        ) : (
          "Click a bar to read the stories from that stretch."
        )}
      </p>

      <div className="mt-2">
        <NewsList
          articles={news.articles}
          terms={terms}
          domain={focus || undefined}
          arrivals={news.arrivals}
          now={now}
          empty={
            !terms.length
              ? "Add a word to search the news."
              : news.loading
                ? "Searching the news…"
                : "No headlines mention all of these words in this range. Try fewer words or a longer range."
          }
        />
      </div>
    </div>
  );
}
