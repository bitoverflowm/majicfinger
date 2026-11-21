import Link from "next/link";

import { cn } from "@/lib/utils";

import { formatAge, formatCents, formatMove, formatWhen, signalKindLabel, venueLabel } from "./format";

export type StoryLike = {
  id: string;
  title: string;
  venue: string;
  href: string;
  region?: string | null;
  status?: string;
  quote?: {
    price?: number | null;
    move?: number | null;
    moveWindow?: string | null;
    sourceTs?: string | null;
    observedTs?: string | null;
  } | null;
  signal?: { kind?: string; summary?: string; occurredAt?: string; source?: string } | null;
  fixture?: boolean;
  weather?: {
    observedTempF?: number | null;
    forecastHighF?: number | null;
    settlementSource?: string | null;
  } | null;
  geometry?: { type: "Point"; coordinates: [number, number] } | null;
  category?: string;
};

export function StoryCard({
  story,
  asOf,
  stale,
  fixtureLabel,
  className,
  cta = "Open War Room",
}: {
  story: StoryLike;
  asOf?: string | null;
  stale?: boolean;
  fixtureLabel?: string | null;
  className?: string;
  cta?: string;
}) {
  const quoteAt = story.quote?.sourceTs || story.quote?.observedTs;
  const move = formatMove(story.quote?.move ?? null);
  const moveUp = (story.quote?.move || 0) > 0;

  return (
    <article
      className={cn(
        "flex w-full flex-col gap-4 rounded-2xl border border-white/10 bg-[#0b1220] p-5 text-left text-slate-50 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.45)]",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-slate-400">
        <span>{venueLabel(story.venue)}</span>
        {story.region ? <span className="text-slate-600">·</span> : null}
        {story.region ? <span>{story.region}</span> : null}
        {story.fixture && fixtureLabel ? (
          <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[10px] font-medium tracking-wide text-amber-200">
            {fixtureLabel}
          </span>
        ) : null}
        {stale ? (
          <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] text-slate-300">
            Stale snapshot{asOf ? ` · ${formatAge(asOf)}` : ""}
          </span>
        ) : null}
      </div>
      <h2 className="text-balance text-lg font-medium leading-snug text-slate-50 sm:text-xl">{story.title}</h2>
      <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
        <div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Last</div>
          <div className="font-mono text-3xl tabular-nums text-white">{formatCents(story.quote?.price)}</div>
        </div>
        {move ? (
          <div>
            <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">
              {story.quote?.moveWindow || "Move"}
            </div>
            <div
              className={cn(
                "font-mono text-lg tabular-nums",
                moveUp ? "text-emerald-300" : "text-rose-300",
              )}
            >
              {move}
            </div>
          </div>
        ) : null}
        {story.weather?.observedTempF != null ? (
          <div>
            <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">NWS obs</div>
            <div className="font-mono text-lg tabular-nums text-sky-200">{story.weather.observedTempF}°F</div>
          </div>
        ) : null}
        {story.weather?.forecastHighF != null ? (
          <div>
            <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Forecast high</div>
            <div className="font-mono text-lg tabular-nums text-sky-200">{story.weather.forecastHighF}°F</div>
          </div>
        ) : null}
      </div>
      <p className="text-xs text-slate-400">
        {quoteAt ? `As of ${formatWhen(quoteAt)}` : "Quote unavailable"}
        {asOf ? ` · Lychee ${formatAge(asOf)}` : ""}
      </p>
      {story.signal ? (
        <p className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
          <span className="mr-2 text-[11px] uppercase tracking-[0.12em] text-slate-500">
            {signalKindLabel(story.signal.kind)}
          </span>
          {story.signal.summary}
        </p>
      ) : (
        <p className="text-sm text-slate-500">No linked signal yet.</p>
      )}
      <div>
        <Link
          href={story.href}
          className="inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-medium text-slate-950 transition hover:bg-slate-200"
        >
          {cta}
        </Link>
      </div>
    </article>
  );
}
