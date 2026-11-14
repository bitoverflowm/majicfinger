"use client";

import { useMemo, useRef, useState } from "react";
import { ChevronRight, TrendingDown, TrendingUp } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Sector } from "recharts";

import { seriesVarsClassName } from "@/components/spectrumui/charts/chart-engine";
import { EASE, GuideAnimationFigure, ScaledStage, useGuidePhases } from "@/components/content/guide-animations/guide-animation-kit";
import { InteractiveFigure, PillButton } from "@/components/university/expected-wins-animations";
import { Eyebrow, Frames, Panel } from "@/components/university/pythagorean-animations";
import { GREEN, RED } from "@/components/sections/features/feature-kit";
import { cn } from "@/lib/utils";

const WIN = GREEN;
const LOSS = RED;
const SLICE_COLORS = [
  "var(--spectrum-series-1)",
  "var(--spectrum-series-2)",
  "var(--spectrum-series-3)",
  "var(--spectrum-series-4)",
  "var(--spectrum-series-5)",
];
const OTHER_COLOR = "var(--spectrum-series-6)";

function dollars(value: number, { signed = false }: { signed?: boolean } = {}) {
  const abs = Math.abs(value);
  const text = abs.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (!signed) return `${value < 0 ? "−" : ""}$${text}`;
  if (abs === 0) return "$0";
  return `${value > 0 ? "+" : "−"}$${text}`;
}

const toneOf = (value: number) => (value > 0 ? WIN : value < 0 ? LOSS : "var(--muted-foreground)");

function ActiveSlice(props: Record<string, unknown>) {
  const outer = Number(props.outerRadius) || 0;
  return <Sector {...props} outerRadius={outer + 4} />;
}

/* -------------------------------------------------------------------------- */
/* 1. Both sides of one question                                              */
/* -------------------------------------------------------------------------- */

const MARKETS = [
  {
    id: "bolsonaro",
    title: "Will Flávio Bolsonaro win the 2026 Brazilian presidential election?",
    yes: -16348,
    no: 145322,
    label: "Biggest win",
  },
  {
    id: "yashar",
    title: "Will Yashar win the most seats in Israel’s legislative election?",
    yes: -37572,
    no: 1633,
    label: "Biggest loss",
  },
] as const;

export function BothSidesMarketNet() {
  const [id, setId] = useState<(typeof MARKETS)[number]["id"]>("bolsonaro");
  const market = MARKETS.find((item) => item.id === id) ?? MARKETS[0];
  const net = market.yes + market.no;
  const rootRef = useRef<HTMLElement>(null);
  const { phase } = useGuidePhases([1200, 1600, 1800, 3600], rootRef, 3);
  const showYes = phase >= 1;
  const showNo = phase >= 2;
  const showNet = phase >= 3;

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      plain
      label="Two outcomes on one Polymarket question. A Yes position and a No position net together into the question's contribution. Toggle between the Bolsonaro win and the Yashar loss."
      caption="November 14, 2026 snapshot. Each question nets every outcome the wallet traded."
    >
      <Frames />
      <div className="flex flex-wrap gap-2">
        {MARKETS.map((item) => (
          <PillButton key={item.id} active={item.id === id} onClick={() => setId(item.id)}>
            {item.label}
          </PillButton>
        ))}
      </div>
      <p className="mt-4 text-[14px] font-medium leading-snug text-foreground">{market.title}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Panel
          className="px-4 py-3"
          style={{ opacity: showYes ? 1 : 0.25, transition: `opacity 400ms ${EASE}` }}
        >
          <Eyebrow>Closed Yes</Eyebrow>
          <p className="mt-1 font-mono text-[22px] font-semibold tabular-nums" style={{ color: toneOf(market.yes) }}>
            {dollars(market.yes, { signed: true })}
          </p>
        </Panel>
        <Panel
          className="px-4 py-3"
          style={{ opacity: showNo ? 1 : 0.25, transition: `opacity 400ms ${EASE}` }}
        >
          <Eyebrow>Closed No</Eyebrow>
          <p className="mt-1 font-mono text-[22px] font-semibold tabular-nums" style={{ color: toneOf(market.no) }}>
            {dollars(market.no, { signed: true })}
          </p>
        </Panel>
        <Panel
          className="px-4 py-3"
          style={{ opacity: showNet ? 1 : 0.25, transition: `opacity 400ms ${EASE}` }}
        >
          <Eyebrow>Question net</Eyebrow>
          <p className="mt-1 font-mono text-[22px] font-semibold tabular-nums" style={{ color: toneOf(net) }}>
            {dollars(net, { signed: true })}
          </p>
        </Panel>
      </div>
      <p className="mt-4 text-[13px] leading-relaxed text-muted-foreground" style={{ opacity: showNet ? 1 : 0, transition: "opacity 400ms ease" }}>
        {id === "bolsonaro"
          ? "The headline win hides a $16,348 Yes loss on the same question."
          : "The headline loss includes a $1,633 No gain on the same question."}
      </p>
    </GuideAnimationFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. Holder Terminal–style PnL by question donuts (snapshot)                 */
/* -------------------------------------------------------------------------- */

type Slice = {
  key: string;
  title: string;
  amount: number;
  pnl: number;
  pct: number;
  color: string;
  other?: boolean;
  outcomes?: { name: string; index: number }[];
};

const PROFIT_TOTAL = 762616;
const LOSS_TOTAL = 207591;

const PROFIT_SLICES: Slice[] = (() => {
  const named = [
    { key: "bolsonaro", title: "Will Flávio Bolsonaro win the 2026 Brazilian presidential election?", pnl: 128974, outcomes: [{ name: "No", index: 1 }, { name: "Yes", index: 0 }] },
    { key: "lula", title: "Will Lula win the 2026 Brazilian presidential election?", pnl: 66594, outcomes: [{ name: "No", index: 1 }] },
    { key: "texas", title: "Texas Senate race", pnl: 59513, outcomes: [{ name: "No", index: 1 }] },
  ];
  const namedSum = named.reduce((sum, item) => sum + item.pnl, 0);
  const other = PROFIT_TOTAL - namedSum;
  const rows = [
    ...named.map((item, at) => ({ ...item, amount: item.pnl, color: SLICE_COLORS[at] })),
    { key: "other", other: true, title: "Other winning questions", amount: other, pnl: other, color: OTHER_COLOR, outcomes: [] as { name: string; index: number }[] },
  ];
  return rows.map((row) => ({ ...row, pct: (row.amount / PROFIT_TOTAL) * 100 }));
})();

const LOSS_SLICES: Slice[] = (() => {
  const named = [
    { key: "yashar", title: "Will Yashar win the most seats in Israel’s legislative election?", pnl: -35939, outcomes: [{ name: "Yes", index: 0 }, { name: "No", index: 1 }] },
  ];
  const namedAbs = named.reduce((sum, item) => sum + Math.abs(item.pnl), 0);
  const other = LOSS_TOTAL - namedAbs;
  const rows = [
    ...named.map((item, at) => ({ ...item, amount: Math.abs(item.pnl), color: SLICE_COLORS[at] })),
    { key: "other", other: true, title: "Other (losing questions)", amount: other, pnl: -other, color: OTHER_COLOR, outcomes: [] as { name: string; index: number }[] },
  ];
  return rows.map((row) => ({ ...row, pct: (row.amount / LOSS_TOTAL) * 100 }));
})();

function SnapshotDonut({ kind, slices, total }: { kind: "profit" | "loss"; slices: Slice[]; total: number }) {
  const [active, setActive] = useState(-1);
  const profit = kind === "profit";
  const Icon = profit ? TrendingUp : TrendingDown;
  const focus = slices[active] || null;
  const tone = profit ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400";
  const signedTotal = profit ? total : -total;

  return (
    <figure aria-label={`Overall PnL by question, ${kind}`} className="min-w-0 rounded-xl border border-border/70 bg-background p-4 shadow-sm">
      <figcaption className="flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
        Overall PnL by question: {profit ? "Profit" : "Loss"}
        <Icon className={cn("size-4", profit ? "text-emerald-500" : "text-rose-500")} aria-hidden />
        <span className="ml-auto text-[12px] font-normal text-muted-foreground">
          {profit ? "winning side" : "losing side"}
        </span>
      </figcaption>
      <div className="mt-3 flex flex-col items-center gap-5 sm:flex-row sm:items-start">
        <div className="relative size-[200px] shrink-0" onMouseLeave={() => setActive(-1)}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={slices}
                dataKey="amount"
                nameKey="title"
                startAngle={90}
                endAngle={-270}
                innerRadius="68%"
                outerRadius="92%"
                paddingAngle={2.5}
                cornerRadius={5}
                stroke="none"
                activeIndex={active}
                activeShape={ActiveSlice}
                onMouseEnter={(_, at) => setActive(at)}
                isAnimationActive={false}
              >
                {slices.map((slice, at) => (
                  <Cell
                    key={slice.key}
                    fill={slice.color}
                    fillOpacity={active < 0 || active === at ? 1 : 0.35}
                    className="transition-[fill-opacity] duration-200"
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
            <span className={cn("font-mono text-[20px] font-semibold tabular-nums tracking-tight", focus ? "text-foreground" : tone)}>
              {focus ? `${focus.pct.toFixed(1)}%` : dollars(signedTotal, { signed: true })}
            </span>
            <span className="line-clamp-2 max-w-[120px] text-[11px] leading-snug text-muted-foreground">
              {focus ? focus.title : profit ? "total profit" : "total loss"}
            </span>
          </div>
        </div>
        <ul className="w-full min-w-0 flex-1 space-y-2.5 text-[12px]">
          {slices.map((slice, at) => {
            const dim = active >= 0 && active !== at;
            return (
              <li
                key={slice.key}
                onMouseEnter={() => setActive(at)}
                onMouseLeave={() => setActive(-1)}
                className={cn("transition-opacity duration-200", dim && "opacity-40")}
              >
                <div className="flex items-center gap-2">
                  <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: slice.color }} aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-foreground">{slice.title}</span>
                  <span className="font-mono tabular-nums text-foreground">{slice.pct.toFixed(1)}%</span>
                </div>
                <div className="ml-4 mt-1 h-1 overflow-hidden rounded-full bg-[var(--spectrum-track)]">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, slice.pct)}%`, backgroundColor: slice.color }} />
                </div>
                <div className="ml-4 mt-1 flex min-w-0 items-center gap-2">
                  <span className={cn("font-mono text-[11px] tabular-nums", tone)}>{dollars(slice.pnl, { signed: true })}</span>
                  {slice.outcomes?.length ? (
                    <span className="flex min-w-0 items-center gap-1.5 overflow-hidden text-[11px] text-muted-foreground">
                      {slice.outcomes.map((outcome) => (
                        <span key={outcome.name} className="inline-flex min-w-0 items-center gap-1">
                          <span className={cn("size-1.5 rounded-full", outcome.index === 0 ? "bg-emerald-500" : "bg-rose-500")} aria-hidden />
                          <span className="max-w-[96px] truncate">{outcome.name}</span>
                        </span>
                      ))}
                    </span>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </figure>
  );
}

export function ContestablePnlByQuestionSnapshot() {
  return (
    <figure data-article-bleed className={cn("not-prose mx-auto my-8 w-full font-sans sm:my-10", seriesVarsClassName)}>
      <div className="grid gap-4 lg:grid-cols-2">
        <SnapshotDonut kind="profit" slices={PROFIT_SLICES} total={PROFIT_TOTAL} />
        <SnapshotDonut kind="loss" slices={LOSS_SLICES} total={LOSS_TOTAL} />
      </div>
      <figcaption className="mx-auto mt-3 max-w-[42rem] text-center text-xs leading-relaxed text-muted-foreground">
        Contestable-Parfait · November 14, 2026 snapshot · Holder Terminal “PnL by question.” Named slices are markets in this guide; Other groups the rest. Hover a slice.
      </figcaption>
    </figure>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. Remove the biggest win                                                  */
/* -------------------------------------------------------------------------- */

const BOOK = [
  { id: "bolsonaro", name: "Bolsonaro presidential", pnl: 128974, biggest: true },
  { id: "lula", name: "Lula presidential", pnl: 66594 },
  { id: "texas", name: "Texas Senate", pnl: 59513 },
  { id: "other-win", name: "Other winning questions", pnl: 507535 },
  { id: "losses", name: "All losing questions", pnl: -207591 },
] as const;

export function RemoveBiggestMarketExplorer() {
  const [removed, setRemoved] = useState(false);
  const total = useMemo(
    () => BOOK.reduce((sum, row) => sum + (removed && "biggest" in row && row.biggest ? 0 : row.pnl), 0),
    [removed],
  );
  const scale = Math.max(...BOOK.map((row) => Math.abs(row.pnl)));

  return (
    <InteractiveFigure caption="November 14 snapshot. Net P&L is $555,024 with Bolsonaro included and $426,050 without it.">
      <Panel className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <PillButton active={!removed} onClick={() => setRemoved(false)}>
              Full book
            </PillButton>
            <PillButton active={removed} onClick={() => setRemoved(true)}>
              Without Bolsonaro
            </PillButton>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-muted-foreground">Net P&amp;L</p>
            <p className="font-mono text-[26px] font-medium leading-none tabular-nums" style={{ color: toneOf(total), transition: "color 300ms ease" }}>
              {dollars(total, { signed: true })}
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-2">
          {BOOK.map((row) => {
            const gone = removed && "biggest" in row && row.biggest;
            const width = (Math.abs(row.pnl) / scale) * 50;
            return (
              <div
                key={row.id}
                className="grid grid-cols-[11rem_minmax(0,1fr)_5.5rem] items-center gap-3 text-[13px]"
                style={{ opacity: gone ? 0.3 : 1, transition: "opacity 400ms ease" }}
              >
                <span className={cn("truncate text-foreground", gone && "line-through")}>{row.name}</span>
                <div className="relative h-5">
                  <div className="absolute inset-y-[-3px] left-1/2 w-px bg-border" />
                  <div
                    className="absolute inset-y-0 rounded-sm"
                    style={{
                      background: row.pnl > 0 ? WIN : LOSS,
                      width: `${gone ? 0 : width}%`,
                      left: row.pnl > 0 ? "50%" : `${50 - (gone ? 0 : width)}%`,
                      transition: `width 500ms ${EASE}, left 500ms ${EASE}`,
                    }}
                  />
                </div>
                <span className="text-right font-mono tabular-nums" style={{ color: toneOf(row.pnl) }}>
                  {dollars(row.pnl, { signed: true })}
                </span>
              </div>
            );
          })}
        </div>

        <p className="mt-5 rounded-lg border border-border px-3 py-2.5 text-[13px] leading-relaxed text-foreground" aria-live="polite">
          {removed ? (
            <>
              <span className="font-semibold" style={{ color: WIN }}>
                Still {dollars(426050, { signed: true })}
              </span>{" "}
              after removing 16.9% of the gains from profitable questions.
            </>
          ) : (
            <>
              Bolsonaro is <span className="font-semibold">16.9%</span> of the $762,616 from profitable questions. Take it out and check what remains.
            </>
          )}
        </p>
      </Panel>
    </InteractiveFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. Politics category table (Holder Terminal style)                         */
/* -------------------------------------------------------------------------- */

type CatRow = {
  label: string;
  bets: number | null;
  pnl: number;
  muted?: boolean;
};

const POLITICS: CatRow = { label: "Politics", bets: 440, pnl: 255289 };
const POLITICS_SUBS: CatRow[] = [
  { label: "US Election", bets: null, pnl: 326920, muted: true },
  { label: "Midterms", bets: null, pnl: 9639, muted: true },
  { label: "Global Elections", bets: null, pnl: -78951, muted: true },
  { label: "Other Politics rows", bets: null, pnl: -2319, muted: true },
];

export function PoliticsCategoryExplorer() {
  const [open, setOpen] = useState(true);
  const otherLoss = 71631;

  return (
    <InteractiveFigure caption="November 14 snapshot · Holder Terminal “By category and sub-category.” Finished Politics bets only. Bet counts for sub-rows were not in the published snapshot.">
      <section aria-label="PnL by category and sub-category" className="overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse">
            <thead className="border-b border-border/60 bg-muted/30">
              <tr>
                <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Category</th>
                <th className="px-3 py-2 text-right text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Bets</th>
                <th className="px-3 py-2 text-right text-[11px] font-medium uppercase tracking-wide text-muted-foreground">PnL</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-border/60 bg-muted/20">
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => setOpen((value) => !value)}
                    aria-expanded={open}
                    className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-foreground"
                  >
                    <ChevronRight className={cn("size-3.5 text-muted-foreground transition-transform", open && "rotate-90")} aria-hidden />
                    {POLITICS.label}
                    <span className="text-[11.5px] font-normal text-muted-foreground">{POLITICS_SUBS.length}</span>
                  </button>
                </td>
                <td className="px-3 py-2 text-right font-mono text-[12.5px] tabular-nums text-muted-foreground">
                  {POLITICS.bets?.toLocaleString()}
                </td>
                <td className="px-3 py-2 text-right font-mono text-[12.5px] font-semibold tabular-nums" style={{ color: toneOf(POLITICS.pnl) }}>
                  {dollars(POLITICS.pnl, { signed: true })}
                </td>
              </tr>
              {open
                ? POLITICS_SUBS.map((sub) => (
                    <tr key={sub.label} className="border-t border-border/40">
                      <td className="py-1.5 pl-9 pr-3 text-[12.5px] text-muted-foreground">{sub.label}</td>
                      <td className="px-3 py-1.5 text-right font-mono text-[12.5px] tabular-nums text-muted-foreground">—</td>
                      <td className="px-3 py-1.5 text-right font-mono text-[12.5px] tabular-nums" style={{ color: toneOf(sub.pnl) }}>
                        {dollars(sub.pnl, { signed: true })}
                      </td>
                    </tr>
                  ))
                : null}
            </tbody>
          </table>
        </div>
        <p className="border-t border-border/60 px-3 py-2.5 text-[12.5px] leading-relaxed text-muted-foreground">
          US Election alone earned more than Politics as a whole. The other Politics rows together lost{" "}
          <span className="font-mono tabular-nums" style={{ color: LOSS }}>
            {dollars(-otherLoss, { signed: true })}
          </span>
          , led by Global Elections.
        </p>
      </section>
    </InteractiveFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 5. Tiny intro strip: gains vs losses                                       */
/* -------------------------------------------------------------------------- */

export function ProfitLossBookAnimation() {
  const rootRef = useRef<HTMLElement>(null);
  const { phase } = useGuidePhases([1400, 1600, 2000, 3800], rootRef, 3);
  const showLoss = phase >= 1;
  const showNet = phase >= 2;
  const showBolsonaro = phase >= 3;

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      plain
      label="Profitable questions contributed 762,616 dollars. Losing questions cost 207,591. Net P and L is 555,024. Bolsonaro is 16.9 percent of the profitable side."
      caption="November 14, 2026 · Contestable-Parfait · 573 questions"
    >
      <Frames />
      <ScaledStage width={860} height={220}>
        <div className="flex h-full flex-col justify-center gap-4 px-2">
          <div className="grid grid-cols-3 gap-3">
            <Panel className="px-4 py-3">
              <Eyebrow>Profitable questions</Eyebrow>
              <p className="mt-1 font-mono text-[22px] font-semibold tabular-nums" style={{ color: WIN }}>
                {dollars(PROFIT_TOTAL, { signed: true })}
              </p>
            </Panel>
            <Panel className="px-4 py-3" style={{ opacity: showLoss ? 1 : 0.3, transition: "opacity 400ms ease" }}>
              <Eyebrow>Losing questions</Eyebrow>
              <p className="mt-1 font-mono text-[22px] font-semibold tabular-nums" style={{ color: LOSS }}>
                {dollars(-LOSS_TOTAL, { signed: true })}
              </p>
            </Panel>
            <Panel className="px-4 py-3" style={{ opacity: showNet ? 1 : 0.3, transition: "opacity 400ms ease" }}>
              <Eyebrow>Net P&amp;L</Eyebrow>
              <p className="mt-1 font-mono text-[22px] font-semibold tabular-nums" style={{ color: WIN }}>
                {dollars(555024, { signed: true })}
              </p>
            </Panel>
          </div>
          <div
            className="h-3 overflow-hidden rounded-full bg-muted"
            style={{ opacity: showBolsonaro ? 1 : 0, transition: "opacity 400ms ease" }}
          >
            <div className="flex h-full">
              <div className="h-full bg-emerald-500/80" style={{ width: "16.9%" }} title="Bolsonaro" />
              <div className="h-full bg-emerald-500/35" style={{ width: "83.1%" }} />
            </div>
          </div>
          <p
            className="text-[13px] text-muted-foreground"
            style={{ opacity: showBolsonaro ? 1 : 0, transition: "opacity 400ms ease" }}
          >
            Bolsonaro is the dark green segment: <span className="font-mono text-foreground">16.9%</span> of gains from profitable questions.
          </p>
        </div>
      </ScaledStage>
    </GuideAnimationFigure>
  );
}
