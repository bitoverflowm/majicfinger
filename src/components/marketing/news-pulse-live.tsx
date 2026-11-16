"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { formatPulsePrice, formatPulsePriceChange } from "@/lib/newsPulseFormat";

const POLL_MS = 30_000;
const REFRESH_EVERY_N = 2; // every other poll asks for a memo bypass (~60s)

const TIME = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
  timeZoneName: "short",
});

export type PulseMarket = {
  venue: string;
  title: string;
  url?: string | null;
  lychee_href?: string | null;
  price?: number | null;
  price_change?: number | null;
  price_change_window?: string | null;
};

export type PulseItem = {
  id: string;
  headline: string;
  url?: string | null;
  source?: string | null;
  t: number;
  markets: PulseMarket[];
};

function venueLabel(venue: string) {
  if (venue === "kalshi") return "Kalshi";
  if (venue === "polymarket") return "Polymarket";
  return venue;
}

function PriceChip({ market }: { market: PulseMarket }) {
  const price = formatPulsePrice(market.price);
  if (!price) return null;
  const change = formatPulsePriceChange(market.price_change ?? NaN);
  const delta = market.price_change;
  const up = typeof delta === "number" && delta > 0.0005;
  const down = typeof delta === "number" && delta < -0.0005;
  const changeClass = up
    ? "text-emerald-700 dark:text-emerald-400"
    : down
      ? "text-rose-700 dark:text-rose-400"
      : "text-muted-foreground";
  const title =
    market.price_change_window === "since_article"
      ? "Change since article time"
      : market.price_change_window === "trailing_6h"
        ? "Change over trailing 6 hours"
        : "Current YES price";

  return (
    <span className="inline-flex shrink-0 items-baseline gap-1 tabular-nums" title={title}>
      <span className="text-foreground">{price}</span>
      {change ? <span className={changeClass}>{change}</span> : null}
    </span>
  );
}

function MarketLinks({ markets }: { markets: PulseMarket[] }) {
  if (!markets?.length) return null;
  return (
    <ul className="mt-3 flex flex-col gap-1.5">
      {markets.map((market) => {
        const href = market.url || market.lychee_href;
        if (!href) return null;
        const external = /^https?:\/\//i.test(href);
        return (
          <li key={`${market.venue}:${market.title}`}>
            <Link
              href={href}
              className="group inline-flex max-w-full flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm leading-snug text-muted-foreground transition-colors hover:text-foreground"
              {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              prefetch={false}
            >
              <span className="shrink-0 font-medium text-amber-700 dark:text-amber-300">{venueLabel(market.venue)}</span>
              <PriceChip market={market} />
              <span className="min-w-0 underline-offset-4 group-hover:underline">{market.title}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

type Props = {
  initialItems: PulseItem[];
  initialAsOf?: string | null;
  demo?: boolean;
};

export function NewsPulseLive({ initialItems, initialAsOf = null, demo = false }: Props) {
  const [items, setItems] = useState<PulseItem[]>(initialItems);
  const [asOf, setAsOf] = useState<string | null>(initialAsOf);
  const knownIds = useRef(new Set(initialItems.map((item) => item.id)));
  const etagRef = useRef<string | null>(null);
  const pollCount = useRef(0);
  const maxT = useRef(initialItems.reduce((m, item) => Math.max(m, Number(item.t) || 0), 0));

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function poll() {
      pollCount.current += 1;
      const refresh = pollCount.current % REFRESH_EVERY_N === 0;
      const params = new URLSearchParams();
      if (refresh) params.set("refresh", "1");
      if (maxT.current > 0) params.set("since", String(maxT.current));
      const qs = params.toString();
      const headers: HeadersInit = { Accept: "application/json" };
      if (etagRef.current) headers["If-None-Match"] = etagRef.current;

      try {
        const res = await fetch(`/api/news/pulse${qs ? `?${qs}` : ""}`, {
          headers,
          cache: "no-store",
        });
        const nextEtag = res.headers.get("etag");
        if (nextEtag) etagRef.current = nextEtag;
        if (res.status === 304 || cancelled) return;
        if (!res.ok) return;
        const body = await res.json();
        const nextItems: PulseItem[] = Array.isArray(body?.items) ? body.items : [];
        if (!nextItems.length && !body?.demo) return;

        const fresh = nextItems.filter((item) => !knownIds.current.has(item.id));
        for (const item of fresh) knownIds.current.add(item.id);
        maxT.current = nextItems.reduce((m, item) => Math.max(m, Number(item.t) || 0), maxT.current);

        if (!cancelled) {
          setItems(nextItems);
          if (body?.as_of) setAsOf(String(body.as_of));
        }

        if (fresh.length === 1) {
          toast.message("New on the pulse", {
            description: fresh[0].headline,
            duration: 6_000,
          });
        } else if (fresh.length > 1) {
          toast.message(`${fresh.length} new headlines`, {
            description: fresh[0].headline,
            duration: 6_000,
          });
        }
      } catch {
        /* network blip — next tick retries */
      }
    }

    function schedule() {
      timer = setTimeout(async () => {
        await poll();
        if (!cancelled) schedule();
      }, POLL_MS);
    }

    schedule();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!items.length) {
    return (
      <div className="rounded-xl bg-muted px-6 py-14 text-center">
        <p className="text-base font-medium text-foreground">No matched headlines right now</p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          The pulse needs a live Polymarket list plus recent Google News (or the Lychee archive). Try again
          shortly, or search the{" "}
          <Link href="/news-archive" className="font-medium text-foreground underline-offset-4 hover:underline">
            news archive
          </Link>
          .
        </p>
        <p className="mt-4 text-[13px] text-muted-foreground">
          Local demo: set <code className="rounded bg-background px-1.5 py-0.5 text-[12px]">NEWS_PULSE_DEMO=1</code>{" "}
          and open <code className="rounded bg-background px-1.5 py-0.5 text-[12px]">/news</code> or{" "}
          <code className="rounded bg-background px-1.5 py-0.5 text-[12px]">/api/news/pulse</code>.
        </p>
      </div>
    );
  }

  return (
    <div>
      <ol className="divide-y divide-border border-y border-border">
        {items.map((item) => (
          <li key={item.id}>
            <article className="flex flex-col gap-1 px-1 py-6 sm:flex-row sm:items-start sm:gap-6 sm:px-2">
              <time
                dateTime={new Date(item.t).toISOString()}
                className="shrink-0 pt-0.5 text-sm tabular-nums text-muted-foreground sm:w-40"
              >
                {TIME.format(item.t)}
              </time>
              <div className="min-w-0 flex-1">
                <h2 className="text-balance text-base font-medium leading-snug text-foreground sm:text-[1.05rem]">
                  {item.url ? (
                    <Link
                      href={item.url}
                      className="underline-offset-4 hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                      prefetch={false}
                    >
                      {item.headline}
                    </Link>
                  ) : (
                    item.headline
                  )}
                </h2>
                {item.source ? <p className="mt-1.5 text-[13px] text-muted-foreground">{item.source}</p> : null}
                <MarketLinks markets={item.markets} />
              </div>
            </article>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-center text-[12px] text-muted-foreground">
        Live · checks about every {POLL_MS / 1000}s
        {asOf ? (
          <>
            {" "}
            · as of{" "}
            <time dateTime={asOf} className="tabular-nums">
              {TIME.format(Date.parse(asOf))}
            </time>
          </>
        ) : null}
        {demo ? (
          <span className="block pt-1 text-amber-700 dark:text-amber-300">
            Showing demo sample data (NEWS_PULSE_DEMO=1).
          </span>
        ) : null}
      </p>
      <p className="mt-2 text-center text-[11px] leading-relaxed text-muted-foreground">
        Prices are YES · change is since the article when history allows, otherwise trailing 6h.
      </p>
    </div>
  );
}
