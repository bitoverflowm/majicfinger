"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cn } from "@/lib/utils";

const BINS = 100;
const OUTCOME_FILL = ["#10b981", "#f43f5e"];
const OUTCOME_DOT = ["bg-emerald-500", "bg-rose-500"];

const METRICS = [
  { id: "shares", label: "Shares", title: "Shares held, by the price their holder paid" },
  { id: "value", label: "Value now", title: "What those shares are worth at the live price" },
  { id: "cost", label: "Cost", title: "USDC paid for those shares" },
];

const COMPACT = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const USD_COMPACT = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 });

function formatMetric(metric, value) {
  if (!Number.isFinite(value)) return "—";
  return metric === "shares" ? `${COMPACT.format(value)} shares` : USD_COMPACT.format(value);
}

function binOf(price) {
  return Math.min(BINS - 1, Math.max(0, Math.floor(price * BINS)));
}

function cents(price) {
  return Number.isFinite(price) ? `${Math.round(price * 1000) / 10}¢` : "—";
}

function amountFor(metric, holder, price) {
  if (metric === "cost") return holder.amount * holder.avgPrice;
  if (metric === "value") return Number.isFinite(price) ? holder.amount * price : Number.isFinite(holder.value) ? holder.value : 0;
  return holder.amount;
}

/** Each outcome's holdings bucketed by the price paid, one cent per bucket. */
function entryBins(sides, metric) {
  const bins = Array.from({ length: BINS }, (_, bin) => ({ bin, y0: 0, y1: 0, n0: 0, n1: 0 }));
  const unpriced = [0, 0];
  const totals = [0, 0];
  (sides || []).forEach((side, index) => {
    for (const holder of side?.rows || []) {
      if (!(holder.avgPrice > 0)) {
        unpriced[index] += holder.amount;
        continue;
      }
      const amount = amountFor(metric, holder, side.price);
      const slot = bins[binOf(holder.avgPrice)];
      slot[`y${index}`] += amount;
      slot[`n${index}`] += 1;
      totals[index] += amount;
    }
  });
  const heaviest = [0, 1].map((index) => {
    let best = null;
    for (const slot of bins) if (slot[`y${index}`] > 0 && (!best || slot[`y${index}`] > best[`y${index}`])) best = slot;
    return best ? { bin: best.bin, pct: totals[index] > 0 ? (best[`y${index}`] / totals[index]) * 100 : 0 } : null;
  });
  return { bins, unpriced, heaviest };
}

function BinTooltip({ active, payload, metric, outcomes }) {
  const slot = active ? payload?.[0]?.payload : null;
  if (!slot || (!slot.n0 && !slot.n1)) return null;
  return (
    <div className="rounded-md border border-border/70 bg-background px-2.5 py-2 text-[12px] shadow-md">
      <div className="font-medium text-foreground">
        Bought at {slot.bin}–{slot.bin + 1}¢
      </div>
      {[0, 1].map((index) =>
        slot[`n${index}`] ? (
          <div key={index} className="mt-1 flex items-center gap-1.5 tabular-nums text-muted-foreground">
            <span className={cn("size-2 rounded-full", OUTCOME_DOT[index])} aria-hidden />
            <span className="text-foreground">{outcomes[index]}</span>
            {formatMetric(metric, slot[`y${index}`])} · {slot[`n${index}`].toLocaleString()} {slot[`n${index}`] === 1 ? "holder" : "holders"}
          </div>
        ) : null,
      )}
    </div>
  );
}

/** Labels sit outside the gap between the two lines, unless that would push them off the chart. */
function labelSide(price, other) {
  const bin = binOf(price);
  const lower = !Number.isFinite(other) || price <= other;
  if (lower) return bin < 20 ? "insideTopLeft" : "insideTopRight";
  return bin > 80 ? "insideTopRight" : "insideTopLeft";
}

function priceLine(price, index, outcome, other) {
  if (!Number.isFinite(price)) return null;
  return (
    <ReferenceLine
      key={`price-${index}`}
      x={binOf(price)}
      stroke={OUTCOME_FILL[index]}
      strokeDasharray="4 3"
      strokeWidth={1.5}
      ifOverflow="extendDomain"
      label={{
        value: `${outcome} now ${cents(price)}`,
        position: labelSide(price, other),
        fill: OUTCOME_FILL[index],
        fontSize: 11,
        fontWeight: 600,
      }}
    />
  );
}

/**
 * Where each outcome's supply was bought: shares (or their value, or their cost) stacked by the
 * price their holder paid, with the live price of each outcome marked. Moves live with the holders.
 */
export function HolderEntryHistogram({ sides, outcomes, loading }) {
  const [metric, setMetric] = useState("shares");
  const { bins, unpriced, heaviest } = useMemo(() => entryBins(sides, metric), [metric, sides]);
  const hasBars = bins.some((slot) => slot.n0 || slot.n1);
  const capped = (sides || []).some((side) => side?.capped);

  return (
    <section aria-label="Entry price distribution" className="rounded-xl border border-border/70 bg-background p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {[0, 1].map((index) => (
          <span key={index} className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <span className={cn("size-2.5 rounded-sm", OUTCOME_DOT[index])} aria-hidden />
            <span className="font-medium text-foreground">{outcomes[index]}</span>
            {heaviest[index] ? (
              <span>
                heaviest at{" "}
                <span className="font-mono tabular-nums text-foreground">
                  {heaviest[index].bin}–{heaviest[index].bin + 1}¢
                </span>{" "}
                ({heaviest[index].pct.toFixed(1)}%)
              </span>
            ) : null}
          </span>
        ))}
        <div role="group" aria-label="Measure" className="ml-auto flex rounded-md bg-black/[0.04] p-0.5 dark:bg-white/[0.06]">
          {METRICS.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={metric === option.id}
              title={option.title}
              onClick={() => setMetric(option.id)}
              className={cn(
                "rounded px-2.5 py-1 text-[12px] transition-colors",
                metric === option.id ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 h-[360px] text-muted-foreground">
        {hasBars ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bins} margin={{ top: 22, right: 8, bottom: 4, left: 0 }} barCategoryGap={1}>
              <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.1} />
              <XAxis
                dataKey="bin"
                interval={9}
                tickFormatter={(bin) => `${bin}¢`}
                tick={{ fontSize: 11, fill: "currentColor" }}
                tickLine={false}
                axisLine={{ stroke: "currentColor", strokeOpacity: 0.2 }}
              />
              <YAxis
                width={56}
                tickFormatter={(value) => (metric === "shares" ? COMPACT.format(value) : USD_COMPACT.format(value))}
                tick={{ fontSize: 11, fill: "currentColor" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<BinTooltip metric={metric} outcomes={outcomes} />} cursor={{ fill: "currentColor", fillOpacity: 0.06 }} />
              <Bar dataKey="y0" stackId="entry" fill={OUTCOME_FILL[0]} isAnimationActive={false} />
              <Bar dataKey="y1" stackId="entry" fill={OUTCOME_FILL[1]} radius={[2, 2, 0, 0]} isAnimationActive={false} />
              {[0, 1].map((index) => priceLine(sides?.[index]?.price, index, outcomes[index], sides?.[1 - index]?.price))}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center gap-2 text-[12px]">
            {loading ? (
              <>
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                Reading every holder&apos;s entry price
              </>
            ) : (
              "No entry prices to chart yet"
            )}
          </div>
        )}
      </div>

      {hasBars && (capped || unpriced[0] || unpriced[1]) ? (
        <p className="mt-2 text-[11px] text-muted-foreground">
          {capped ? "Covers each outcome's largest 3,000 holders. " : ""}
          {unpriced[0] || unpriced[1]
            ? `${[0, 1]
                .filter((index) => unpriced[index] > 0)
                .map((index) => `${COMPACT.format(unpriced[index])} ${outcomes[index]} shares`)
                .join(" and ")} with no recorded entry price (split or transferred in) are left out.`
            : ""}
        </p>
      ) : null}
    </section>
  );
}
