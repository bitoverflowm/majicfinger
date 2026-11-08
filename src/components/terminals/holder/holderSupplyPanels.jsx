"use client";

import { Loader2, TrendingDown, TrendingUp } from "lucide-react";
import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Sector } from "recharts";
import { seriesVarsClassName } from "@/components/spectrumui/charts/chart-engine";
import { cn } from "@/lib/utils";

const OUTCOME_DOT = ["bg-emerald-500", "bg-rose-500"];

/** Top 1, the rest of the top 10, everyone else: the Spectrum chart palette, so light and dark both follow the brand. */
const SLICE_COLORS = ["var(--spectrum-series-1)", "var(--spectrum-series-4)", "var(--spectrum-series-6)"];

const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const USD_COMPACT = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 });
const SHARES_COMPACT = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

function usd(value) {
  if (!Number.isFinite(value)) return "—";
  return Math.abs(value) >= 1_000_000 ? USD_COMPACT.format(value) : USD.format(value);
}

function signedUsd(value) {
  if (!Number.isFinite(value) || value === 0) return "$0";
  if (Math.abs(value) < 1) return value > 0 ? "+<$1" : "−<$1";
  const text = Math.abs(value) >= 10_000 ? USD_COMPACT.format(Math.abs(value)) : USD.format(Math.abs(value));
  return value > 0 ? `+${text}` : `−${text}`;
}

function cents(price) {
  return Number.isFinite(price) ? `${Math.round(price * 1000) / 10}¢` : "—";
}

function share(part, whole) {
  if (!whole) return "0%";
  const value = (part / whole) * 100;
  if (value > 0 && value < 0.1) return "<0.1%";
  return `${value.toFixed(1)}%`;
}

function PnlTile({ outcome, kind, bucket, holders }) {
  const profit = kind === "profit";
  const Icon = profit ? TrendingUp : TrendingDown;
  return (
    <div className="rounded-lg bg-black/[0.03] px-3 py-2.5 dark:bg-white/[0.04]">
      <dt className="flex items-center gap-1 text-[11px] text-muted-foreground">
        {outcome} $ in {profit ? "profit" : "loss"}
        <Icon className={cn("size-3", profit ? "text-emerald-500" : "text-rose-500")} aria-hidden />
      </dt>
      <dd className="mt-0.5 truncate text-[22px] font-semibold tabular-nums tracking-tight text-foreground">{usd(bucket.value)}</dd>
      <dd className="truncate text-[12px] text-muted-foreground">
        <span className="tabular-nums text-foreground">{bucket.users.toLocaleString()}</span> {bucket.users === 1 ? "holder" : "holders"} (
        {share(bucket.users, holders)}) {profit ? "making money" : "losing money"}
      </dd>
      <dd
        className={cn(
          "truncate text-[11px] tabular-nums",
          bucket.pnl === 0 ? "text-muted-foreground" : profit ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
        )}
      >
        {signedUsd(bucket.pnl)} unrealized
      </dd>
    </div>
  );
}

/** The hovered segment grows outward a touch, like the rest of the Spectrum charts. */
function ActiveSlice(props) {
  return <Sector {...props} outerRadius={props.outerRadius + 4} />;
}

function OwnershipPie({ side }) {
  const [active, setActive] = useState(-1);
  const slices = side.distribution.map((slice, at) => ({ ...slice, color: SLICE_COLORS[at] })).filter((slice) => slice.shares > 0);
  const focus = slices[active] || null;
  const topTen = side.distribution[0].pct + side.distribution[1].pct;
  return (
    <figure aria-label={`${side.outcome} ownership distribution`} className={cn("mt-4", seriesVarsClassName)}>
      <figcaption className="text-[12px] font-medium text-foreground">{side.outcome} ownership distribution</figcaption>
      <div className="mt-2 flex items-center gap-5">
        <div className="relative size-[200px] shrink-0" onMouseLeave={() => setActive(-1)}>
          {slices.length ? (
            <>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={slices}
                    dataKey="shares"
                    nameKey="label"
                    startAngle={90}
                    endAngle={-270}
                    innerRadius="68%"
                    outerRadius="92%"
                    paddingAngle={slices.length > 1 ? 2.5 : 0}
                    cornerRadius={5}
                    stroke="none"
                    activeIndex={active}
                    activeShape={ActiveSlice}
                    onMouseEnter={(_, at) => setActive(at)}
                    isAnimationActive={false}
                  >
                    {slices.map((slice, at) => (
                      <Cell key={slice.key} fill={slice.color} fillOpacity={active < 0 || active === at ? 1 : 0.35} className="transition-[fill-opacity] duration-200" />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="font-mono text-[24px] font-semibold tabular-nums tracking-tight text-foreground">
                  {(focus ? focus.pct : topTen).toFixed(1)}%
                </span>
                <span className="max-w-[110px] truncate text-[11px] text-muted-foreground">{focus ? focus.label.replace(" (excluding top 1)", "") : "held by top 10"}</span>
              </div>
            </>
          ) : (
            <div className="flex size-full items-center justify-center rounded-full border-[14px] border-muted text-[12px] text-muted-foreground">No holders</div>
          )}
        </div>
        <ul className="min-w-0 flex-1 space-y-3 text-[12px]">
          {side.distribution.map((slice, at) => {
            const index = slices.findIndex((item) => item.key === slice.key);
            const dim = active >= 0 && active !== index;
            return (
              <li
                key={slice.key}
                onMouseEnter={() => setActive(index)}
                onMouseLeave={() => setActive(-1)}
                className={cn("transition-opacity duration-200", dim && "opacity-40")}
              >
                <div className="flex items-baseline gap-2">
                  <span className="size-2 shrink-0 self-center rounded-full" style={{ backgroundColor: SLICE_COLORS[at] }} aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-foreground">{slice.label}</span>
                  <span className="font-mono tabular-nums text-foreground">{slice.pct.toFixed(1)}%</span>
                </div>
                <div className="ml-4 mt-1 h-1 overflow-hidden rounded-full bg-[var(--spectrum-track)]">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, slice.pct)}%`, backgroundColor: SLICE_COLORS[at] }} />
                </div>
                <div className="ml-4 mt-1 truncate text-[11px] text-muted-foreground">
                  {SHARES_COMPACT.format(slice.shares)} shares{slice.holder ? ` · ${slice.holder}` : ""}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </figure>
  );
}

function SupplyCard({ side, index }) {
  const holders = side.profit.users + side.loss.users;
  return (
    <section aria-label={`${side.outcome} supply`} className="min-w-0 rounded-xl border border-border/70 bg-background p-4 shadow-sm">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className={cn("size-2 self-center rounded-full", OUTCOME_DOT[index])} aria-hidden />
        <h4 className="text-[14px] font-semibold text-foreground">{side.outcome}</h4>
        <span
          className="text-[12px] text-muted-foreground"
          title="Every held share weighted by the price its holder paid: the break-even price for the supply as a whole"
        >
          Average entry <span className="font-mono tabular-nums text-foreground">{cents(side.avgEntry)}</span>
          {Number.isFinite(side.price) ? (
            <>
              {" "}
              · now <span className="font-mono tabular-nums text-foreground">{cents(side.price)}</span>
            </>
          ) : null}
        </span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2">
        <PnlTile outcome={side.outcome} kind="profit" bucket={side.profit} holders={holders} />
        <PnlTile outcome={side.outcome} kind="loss" bucket={side.loss} holders={holders} />
      </dl>
      <OwnershipPie side={side} />
      {side.capped ? (
        <p className="mt-3 text-[11px] text-muted-foreground">
          Covers the largest {side.holders.toLocaleString()} holders
          {side.count != null ? ` of ${side.count.toLocaleString()}${side.countCapped ? "+" : ""}` : ""}; the rest hold the smallest positions.
        </p>
      ) : null}
    </section>
  );
}

function SupplySkeleton({ outcome, index }) {
  return (
    <section aria-label={`${outcome} supply`} className="min-w-0 rounded-xl border border-border/70 bg-background p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span className={cn("size-2 rounded-full", OUTCOME_DOT[index])} aria-hidden />
        <h4 className="text-[14px] font-semibold text-foreground">{outcome}</h4>
        <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <Loader2 className="size-3 animate-spin" aria-hidden />
          Reading every holder&apos;s position
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="h-[92px] animate-pulse rounded-lg bg-muted" />
        <div className="h-[92px] animate-pulse rounded-lg bg-muted" />
      </div>
      <div className="mt-4 flex items-center gap-4">
        <div className="size-[200px] shrink-0 animate-pulse rounded-full bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
        </div>
      </div>
    </section>
  );
}

/** Each outcome's supply side by side: dollars in profit and in loss, who is making money, and ownership concentration. */
export function HolderSupplyPanels({ sides, outcomes, error }) {
  if (error && !sides) return <p className="rounded-xl border border-border/70 px-4 py-6 text-[13px] text-muted-foreground">{error}</p>;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {[0, 1].map((index) =>
        sides?.[index] ? (
          <SupplyCard key={index} side={sides[index]} index={index} />
        ) : (
          <SupplySkeleton key={index} outcome={outcomes[index]} index={index} />
        ),
      )}
    </div>
  );
}
