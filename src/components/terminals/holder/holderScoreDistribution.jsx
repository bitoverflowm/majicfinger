"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { Area, CartesianGrid, ComposedChart, Line, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cn } from "@/lib/utils";
import { SCORE_SHRINK, SCORE_TIERS, scoreTier } from "./traderScore";

const OUTCOME_FILL = ["#10b981", "#f43f5e"];
const OUTCOME_DOT = ["bg-emerald-500", "bg-rose-500"];
/** Kernel width in score points: wide enough to smooth 60 holders, narrow enough to keep clusters apart. */
const BANDWIDTH = 4;
const TYPICAL_SD = 10;

function signed(value, digits = 1) {
  if (!Number.isFinite(value)) return "—";
  return `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(value).toFixed(digits)}`;
}

function pctText(value) {
  return Number.isFinite(value) ? `${(value * 100).toFixed(value >= 0.1 ? 0 : 1)}%` : "—";
}

function normal(x, mean, sd) {
  return Math.exp(-0.5 * ((x - mean) / sd) ** 2) / (sd * Math.sqrt(2 * Math.PI));
}

function sideStats(side, details, limit) {
  const rows = (side?.rows || []).slice(0, limit);
  const loaded = (side?.rows || []).reduce((sum, row) => sum + row.amount, 0);
  // The census refreshes less often than the live list, so it can trail the loaded holders' total.
  const supply = Math.max(loaded, side?.shares || 0);
  const scored = [];
  let pending = 0;
  let unscored = 0;
  for (const row of rows) {
    const detail = details(row.wallet);
    if (detail === undefined) pending += 1;
    else if (!detail.score) unscored += 1;
    else scored.push({ score: detail.score.score, weight: row.amount, name: row.name });
  }
  const weight = scored.reduce((sum, item) => sum + item.weight, 0);
  const aggregate = weight > 0 ? scored.reduce((sum, item) => sum + item.score * item.weight, 0) / weight : null;
  const heldBy = (test) => (supply > 0 ? scored.filter((item) => test(item.score)).reduce((sum, item) => sum + item.weight, 0) / supply : null);
  return {
    outcome: side?.outcome,
    rows: rows.length,
    scored,
    weight,
    aggregate,
    pending,
    unscored,
    coverage: supply > 0 ? weight / supply : null,
    proven: heldBy((score) => score >= 10),
    poor: heldBy((score) => score <= -10),
  };
}

/** Supply-weighted density of holder scores, so a whale's score counts for its share of the side. */
function density(stats, xs) {
  if (!stats.weight) return xs.map(() => 0);
  return xs.map((x) => stats.scored.reduce((sum, item) => sum + item.weight * normal(x, item.score, BANDWIDTH), 0) / stats.weight);
}

function AggregateCard({ stats, index, outcome, limit }) {
  const tier = scoreTier(stats.aggregate);
  return (
    <div className="min-w-0 rounded-xl border border-border/70 bg-background p-4 shadow-sm">
      <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
        <span className={cn("size-2 rounded-full", OUTCOME_DOT[index])} aria-hidden />
        <span className="font-medium text-foreground">{outcome}</span> aggregate score
        {stats.pending ? (
          <span className="ml-auto flex items-center gap-1">
            <Loader2 className="size-3 animate-spin" aria-hidden />
            Scoring {stats.pending}
          </span>
        ) : null}
      </div>
      <div className={cn("mt-1 font-mono text-[32px] font-semibold tabular-nums tracking-tight", tier?.tone || "text-muted-foreground")}>
        {signed(stats.aggregate, 2)}
      </div>
      <p className="truncate text-[12px] text-muted-foreground" title={tier?.label}>
        {tier ? tier.label : "Waiting for the top holders' scores"}
      </p>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
        <div className="rounded-lg bg-black/[0.03] px-2.5 py-2 dark:bg-white/[0.04]">
          <dt className="text-muted-foreground">Supply scored</dt>
          <dd className="mt-0.5 font-mono text-[14px] font-semibold tabular-nums text-foreground">{pctText(stats.coverage)}</dd>
          <dd className="truncate text-muted-foreground">
            {stats.scored.length} of top {Math.min(limit, stats.rows)}
          </dd>
        </div>
        <div className="rounded-lg bg-black/[0.03] px-2.5 py-2 dark:bg-white/[0.04]">
          <dt className="text-muted-foreground">Proven traders</dt>
          <dd className="mt-0.5 font-mono text-[14px] font-semibold tabular-nums text-emerald-500">{pctText(stats.proven)}</dd>
          <dd className="truncate text-muted-foreground">of supply, score +10 up</dd>
        </div>
        <div className="rounded-lg bg-black/[0.03] px-2.5 py-2 dark:bg-white/[0.04]">
          <dt className="text-muted-foreground">Poor traders</dt>
          <dd className="mt-0.5 font-mono text-[14px] font-semibold tabular-nums text-rose-500">{pctText(stats.poor)}</dd>
          <dd className="truncate text-muted-foreground">of supply, score −10 down</dd>
        </div>
      </dl>
    </div>
  );
}

function Explainer() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-border/70 bg-background shadow-sm">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left text-[13px] font-medium text-foreground"
      >
        How the Lychee trader score works
        <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open ? (
        <div className="space-y-3 border-t border-border/70 px-4 py-3 text-[13px] text-muted-foreground">
          <p>
            Every trader gets one score from their finished positions: markets they closed out of, or that resolved, up to their
            most recent 2,000. This market never counts, so the score says how good someone was before they took this position.
          </p>
          <p>
            Each position is judged against the odds the trader paid. If prices were fair, a position bought at an average price
            p would break even on average, with a spread that depends on p. Adding up every position gives a z-score: how many
            standard deviations the trader&apos;s total profit sits above or below break-even. Winning a 95¢ favourite barely
            moves it; hitting a 10¢ long shot moves it a lot; losing costs the same way.
          </p>
          <p>
            A few lucky bets can still look like skill, so the z-score is shrunk by the number of effective independent bets
            (big bets count more, so one huge position is close to one bet): a trader with n effective bets keeps n ÷ (n + {SCORE_SHRINK}) of
            it. It is then scaled by 10 and capped at ±100, so an ordinary trader sits within about ±10 and ±20 is a two-sigma
            outlier.
          </p>
          <ul className="space-y-1">
            {SCORE_TIERS.map((tier) => (
              <li key={tier.min} className="flex gap-2">
                <span className={cn("w-28 shrink-0 font-mono tabular-nums", tier.tone)}>
                  {signed(tier.min, 0)} to {signed(tier.max, 0)}
                </span>
                <span>{tier.label}</span>
              </li>
            ))}
          </ul>
          <p>
            A side&apos;s <span className="font-medium text-foreground">aggregate score</span> weights each top holder&apos;s score by
            the shares they hold, so it reads as the skill behind the average share. Holders with no finished markets are left
            out.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function ChartTooltip({ active, payload, label, outcomes }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  const tier = scoreTier(label);
  return (
    <div className="rounded-md border border-border/70 bg-background px-2.5 py-2 text-[12px] shadow-md">
      <div className="font-medium text-foreground">Score {signed(label, 0)}</div>
      {tier ? <div className="max-w-[220px] text-[11px] text-muted-foreground">{tier.label}</div> : null}
      {[0, 1].map((index) => (
        <div key={index} className="mt-1 flex items-center gap-1.5 tabular-nums text-muted-foreground">
          <span className={cn("size-2 rounded-full", OUTCOME_DOT[index])} aria-hidden />
          <span className="text-foreground">{outcomes[index]}</span>
          {(point[`d${index}`] * 100).toFixed(2)}% of supply per point
        </div>
      ))}
    </div>
  );
}

/**
 * Whether better traders hold one outcome or the other: each side's supply-weighted trader score,
 * and the distribution of its top holders' scores against a typical trader's.
 */
export function HolderScoreDistribution({ sides, details, outcomes, limit }) {
  const stats = [0, 1].map((index) => sideStats(sides?.[index], details, limit));
  const scoreKey = stats.map((side) => side.scored.map((item) => `${item.score}:${Math.round(item.weight)}`).join(",")).join("|");

  const { data, domain } = useMemo(() => {
    const all = stats.flatMap((side) => side.scored.map((item) => item.score));
    const lo = Math.max(-100, Math.floor(Math.min(-40, ...all.map((score) => score - 12)) / 10) * 10);
    const hi = Math.min(100, Math.ceil(Math.max(40, ...all.map((score) => score + 12)) / 10) * 10);
    const xs = [];
    for (let x = lo; x <= hi; x += 1) xs.push(x);
    const d0 = density(stats[0], xs);
    const d1 = density(stats[1], xs);
    return {
      data: xs.map((x, at) => ({ x, d0: d0[at], d1: d1[at], typical: normal(x, 0, TYPICAL_SD) })),
      domain: [lo, hi],
    };
    // `scoreKey` stands for the scores and weights in `stats`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scoreKey]);

  const ready = stats.every((side) => side.aggregate != null);
  const gap = ready ? stats[0].aggregate - stats[1].aggregate : null;
  const lean = gap == null ? null : Math.abs(gap) < 2 ? -1 : gap > 0 ? 0 : 1;
  const hasCurves = stats.some((side) => side.scored.length);

  return (
    <div className="space-y-4">
      <Explainer />
      <div className="grid gap-4 lg:grid-cols-2">
        {[0, 1].map((index) => (
          <AggregateCard key={index} stats={stats[index]} index={index} outcome={outcomes[index]} limit={limit} />
        ))}
      </div>
      {lean != null ? (
        <p className="text-[13px] text-foreground">
          {lean === -1 ? (
            <>Holders on both sides trade about as well: the aggregate scores are within 2 points.</>
          ) : (
            <>
              Better traders lean <span className={cn("font-semibold", lean ? "text-rose-500" : "text-emerald-500")}>{outcomes[lean]}</span>,
              by <span className="font-mono tabular-nums">{Math.abs(gap).toFixed(1)}</span> points of aggregate score.
            </>
          )}
        </p>
      ) : null}
      <section aria-label="Holder score distribution" className="rounded-xl border border-border/70 bg-background p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
          <span className="font-medium text-foreground">Top holders&apos; scores, weighted by supply</span>
          {[0, 1].map((index) => (
            <span key={index} className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm" style={{ backgroundColor: OUTCOME_FILL[index] }} aria-hidden />
              {outcomes[index]}
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <span className="w-4 border-t border-dashed border-muted-foreground" aria-hidden />
            Typical trader
          </span>
        </div>
        <div className="mt-3 h-[340px] text-muted-foreground">
          {hasCurves ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 24, right: 12, bottom: 4, left: 0 }}>
                {SCORE_TIERS.map((tier) => (
                  <ReferenceArea
                    key={tier.min}
                    x1={Math.max(domain[0], tier.min)}
                    x2={Math.min(domain[1], tier.max)}
                    fill={tier.fill}
                    fillOpacity={0.06}
                    ifOverflow="hidden"
                  />
                ))}
                <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.1} />
                <XAxis
                  dataKey="x"
                  type="number"
                  domain={domain}
                  ticks={Array.from({ length: Math.floor((domain[1] - domain[0]) / 10) + 1 }, (_, at) => domain[0] + at * 10)}
                  tickFormatter={(value) => signed(value, 0)}
                  tick={{ fontSize: 11, fill: "currentColor" }}
                  tickLine={false}
                  axisLine={{ stroke: "currentColor", strokeOpacity: 0.2 }}
                />
                <YAxis hide domain={[0, "auto"]} />
                <Tooltip content={<ChartTooltip outcomes={outcomes} />} cursor={{ stroke: "currentColor", strokeOpacity: 0.3 }} />
                <Line dataKey="typical" stroke="currentColor" strokeOpacity={0.5} strokeDasharray="4 4" dot={false} isAnimationActive={false} />
                {[0, 1].map((index) => (
                  <Area
                    key={index}
                    dataKey={`d${index}`}
                    type="monotone"
                    stroke={OUTCOME_FILL[index]}
                    strokeWidth={2}
                    fill={OUTCOME_FILL[index]}
                    fillOpacity={0.18}
                    isAnimationActive={false}
                  />
                ))}
                {[0, 1].map((index) =>
                  stats[index].aggregate != null ? (
                    <ReferenceLine
                      key={`agg-${index}`}
                      x={Math.round(stats[index].aggregate)}
                      stroke={OUTCOME_FILL[index]}
                      strokeDasharray="4 3"
                      strokeWidth={1.5}
                      label={{
                        value: `${outcomes[index]} ${signed(stats[index].aggregate)}`,
                        position: gap == null || index === (gap >= 0 ? 0 : 1) ? "insideTopLeft" : "insideTopRight",
                        fill: OUTCOME_FILL[index],
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    />
                  ) : null,
                )}
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center gap-2 text-[12px]">
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              Scoring the top holders from their finished markets
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
