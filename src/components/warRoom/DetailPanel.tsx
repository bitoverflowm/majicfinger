"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";

import { formatWhen, formatCents, formatMove, signalKindLabel, venueLabel } from "./format";

type Detail = {
  status?: string;
  market?: {
    title: string;
    venue: string;
    status: string;
    region?: string | null;
    marketUrl?: string | null;
    weather?: Record<string, unknown> | null;
    thresholds?: Array<{ ticker: string; label: string; price: number | null }>;
  } | null;
  quote?: {
    price?: number | null;
    move?: number | null;
    moveWindow?: string | null;
    sourceTs?: string | null;
    observedTs?: string | null;
    quoteType?: string;
  } | null;
  rules?: {
    primary?: string | null;
    url?: string | null;
    settlementSource?: string | null;
    settlementStation?: string | null;
  } | null;
  timeline?: Array<{
    id: string;
    kind: string;
    summary: string;
    occurredAt: string;
    source?: string;
    data?: Record<string, unknown>;
  }>;
  links?: Array<{ label: string; href: string; stub?: boolean; reason?: string }>;
  fixture?: boolean;
  fixtureLabel?: string | null;
};

export function DetailPanel({
  detail,
  loading,
  emptyReason,
}: {
  detail: Detail | null;
  loading?: boolean;
  emptyReason?: string | null;
}) {
  if (loading && !detail?.market) {
    return <div className="px-4 py-6 text-sm text-slate-400">Loading story…</div>;
  }
  if (!detail?.market) {
    return (
      <div className="px-4 py-6 text-sm text-slate-400">
        {emptyReason === "invalid_market"
          ? "This shared link does not match a market on the current desk."
          : "Select a market from the feed."}
      </div>
    );
  }

  const market = detail.market;
  const quote = detail.quote;
  const weather = market.weather as
    | {
        observedTempF?: number | null;
        observedAt?: string | null;
        forecastHighF?: number | null;
        forecastIssuedAt?: string | null;
        settlementSource?: string | null;
        station?: string | null;
        rulesPrimary?: string | null;
      }
    | null
    | undefined;
  const move = formatMove(quote?.move);
  const resolved = market.status === "resolved" || market.status === "closed" || detail.status === "resolved";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4">
      <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-slate-400">
        <span>{venueLabel(market.venue)}</span>
        {market.region ? <span>· {market.region}</span> : null}
        {resolved ? (
          <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] text-slate-300">Resolved</span>
        ) : null}
        {detail.fixture && detail.fixtureLabel ? (
          <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[10px] text-amber-200">
            {detail.fixtureLabel}
          </span>
        ) : null}
      </div>
      <h2 className="mt-2 text-base font-medium leading-snug text-slate-50">{market.title}</h2>
      <div className="mt-3 flex flex-wrap gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">
            {quote?.quoteType === "last" ? "Last" : "Quote"}
          </div>
          <div className="font-mono text-2xl tabular-nums text-white">{formatCents(quote?.price)}</div>
        </div>
        {move ? (
          <div>
            <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">
              {quote?.moveWindow || "Change"}
            </div>
            <div className={cn("font-mono text-lg", (quote?.move || 0) > 0 ? "text-emerald-300" : "text-rose-300")}>
              {move}
            </div>
          </div>
        ) : null}
      </div>
      <p className="mt-1 text-xs text-slate-500">
        {quote?.sourceTs ? `Source ${formatWhen(quote.sourceTs)}` : "No quote yet"}
        {quote?.observedTs ? ` · Lychee ${formatWhen(quote.observedTs)}` : ""}
      </p>

      {weather ? (
        <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-slate-300">
          <div>
            <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Observed</div>
            <div className="font-mono text-sm text-sky-200">
              {weather.observedTempF != null ? `${weather.observedTempF}°F` : "—"}
            </div>
            <div className="text-slate-500">{weather.observedAt ? formatWhen(weather.observedAt) : "NWS"}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Forecast high</div>
            <div className="font-mono text-sm text-sky-200">
              {weather.forecastHighF != null ? `${weather.forecastHighF}°F` : "—"}
            </div>
            <div className="text-slate-500">{weather.forecastIssuedAt ? formatWhen(weather.forecastIssuedAt) : "NWS"}</div>
          </div>
          <div className="col-span-2 text-slate-500">
            Settles on {detail.rules?.settlementSource || weather.settlementSource || "listed source"}
            {detail.rules?.settlementStation || weather.station ? ` · ${detail.rules?.settlementStation || weather.station}` : ""}
          </div>
        </div>
      ) : null}

      {Array.isArray(market.thresholds) && market.thresholds.length ? (
        <div className="mt-3">
          <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Active thresholds</div>
          <ul className="mt-1 space-y-1 text-xs text-slate-300">
            {market.thresholds.map((row) => (
              <li key={row.ticker} className="flex justify-between gap-3 font-mono">
                <span className="text-slate-400">{row.label}</span>
                <span>{formatCents(row.price)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <section className="mt-4">
        <h3 className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Evidence</h3>
        {detail.timeline?.length ? (
          <ol className="mt-2 space-y-3">
            {detail.timeline.map((row) => (
              <li key={row.id} className="border-l border-white/10 pl-3">
                <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500">
                  {signalKindLabel(row.kind)} · {formatWhen(row.occurredAt)}
                </div>
                <p className="text-sm text-slate-200">{row.summary}</p>
                {row.data?.wallet ? (
                  <p className="font-mono text-[11px] text-slate-500">{String(row.data.wallet)}</p>
                ) : null}
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-2 text-sm text-slate-500">No evidence on this timeline yet.</p>
        )}
      </section>

      <section className="mt-4">
        <h3 className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Contract rules</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          {detail.rules?.primary || weather?.rulesPrimary || "Rules were not returned for this contract."}
        </p>
        {detail.rules?.url ? (
          <a
            href={detail.rules.url}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block text-xs text-sky-300 hover:underline"
          >
            Official rules
          </a>
        ) : null}
      </section>

      <section className="mt-4 pb-4">
        <h3 className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Research</h3>
        <ul className="mt-2 flex flex-col gap-1">
          {(detail.links || []).map((link) => (
            <li key={link.href + link.label}>
              {link.stub ? (
                <span className="text-sm text-slate-500">
                  {link.label} — {link.reason || "Coming later in this launch."}
                </span>
              ) : (
                <Link href={link.href} className="text-sm text-sky-300 hover:underline">
                  {link.label}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
