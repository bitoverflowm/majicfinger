"use client";

import { useMemo, useState } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Sector } from "recharts";
import { seriesVarsClassName } from "@/components/spectrumui/charts/chart-engine";
import { cn } from "@/lib/utils";
import { isResolved, num, signedUsd } from "./traderPositionsTable";
import { MarketIcon } from "./traderTradesTable";

/** Questions with their own slice; the rest share "Other". */
const TOP = 5;
const SLICE_COLORS = ["var(--spectrum-series-1)", "var(--spectrum-series-2)", "var(--spectrum-series-3)", "var(--spectrum-series-4)", "var(--spectrum-series-5)"];
const OTHER_COLOR = "var(--spectrum-series-6)";
const OUTCOME_DOT = ["bg-emerald-500", "bg-rose-500"];

/**
 * Net PnL per question across finished bets and open positions. Both outcomes of a question net
 * together, so a hedged market shows what the pair made.
 */
function byQuestion(bets, openRows) {
  const questions = new Map();
  const add = (row, pnl) => {
    if (!Number.isFinite(pnl)) return;
    const key = String(row.condition_id || row.title || "");
    if (!key) return;
    let question = questions.get(key);
    if (!question) {
      question = { key, conditionId: row.condition_id, title: row.title || "Untitled market", slug: row.slug, icon: row.icon, pnl: 0, outcomes: new Map() };
      questions.set(key, question);
    }
    question.pnl += pnl;
    if (row.outcome) question.outcomes.set(row.outcome, Number(row.outcome_index));
  };
  for (const bet of bets) add(bet, bet.pnl);
  for (const row of openRows) {
    if (isResolved(row) || !(num(row.current_size) > 0)) continue;
    add(row, num(row.total_pnl) ?? 0);
  }
  return [...questions.values()];
}

function slicesOf(questions, sign) {
  const side = questions
    .filter((question) => (sign > 0 ? question.pnl > 0.005 : question.pnl < -0.005))
    .map((question) => ({ ...question, amount: Math.abs(question.pnl) }))
    .sort((a, b) => b.amount - a.amount);
  const total = side.reduce((sum, question) => sum + question.amount, 0);
  const top = side.slice(0, TOP).map((question, at) => ({ ...question, color: SLICE_COLORS[at] }));
  const rest = side.slice(TOP);
  const slices = [...top];
  if (rest.length) {
    slices.push({
      key: "other",
      other: true,
      title: `Other (${rest.length.toLocaleString()} questions)`,
      amount: rest.reduce((sum, question) => sum + question.amount, 0),
      pnl: rest.reduce((sum, question) => sum + question.pnl, 0),
      outcomes: new Map(),
      color: OTHER_COLOR,
    });
  }
  return { slices: slices.map((slice) => ({ ...slice, pct: total > 0 ? (slice.amount / total) * 100 : 0 })), total, count: side.length };
}

function ActiveSlice(props) {
  return <Sector {...props} outerRadius={props.outerRadius + 4} />;
}

function OutcomeDots({ outcomes }) {
  if (!outcomes.size) return null;
  return (
    <span className="flex min-w-0 items-center gap-1.5 overflow-hidden text-[11px] text-muted-foreground">
      {[...outcomes].map(([name, index]) => (
        <span key={name} className="inline-flex min-w-0 items-center gap-1">
          <span className={cn("size-1.5 rounded-full", OUTCOME_DOT[index] || "bg-muted-foreground")} aria-hidden />
          <span className="max-w-[96px] truncate">{name}</span>
        </span>
      ))}
    </span>
  );
}

function QuestionDonut({ kind, model, onPickMarket }) {
  const [active, setActive] = useState(-1);
  const profit = kind === "profit";
  const Icon = profit ? TrendingUp : TrendingDown;
  const focus = model.slices[active] || null;
  const tone = profit ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400";
  return (
    <figure aria-label={`Overall PnL by question, ${kind}`} className="min-w-0 rounded-xl border border-border/70 bg-background p-4 shadow-sm">
      <figcaption className="flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
        Overall PnL by question: {profit ? "Profit" : "Loss"}
        <Icon className={cn("size-4", profit ? "text-emerald-500" : "text-rose-500")} aria-hidden />
        <span className="ml-auto text-[12px] font-normal text-muted-foreground">
          {model.count.toLocaleString()} {model.count === 1 ? "question" : "questions"}
        </span>
      </figcaption>
      <div className="mt-3 flex flex-col items-center gap-5 sm:flex-row sm:items-start">
        <div className="relative size-[200px] shrink-0" onMouseLeave={() => setActive(-1)}>
          {model.slices.length ? (
            <>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={model.slices}
                    dataKey="amount"
                    nameKey="title"
                    startAngle={90}
                    endAngle={-270}
                    innerRadius="68%"
                    outerRadius="92%"
                    paddingAngle={model.slices.length > 1 ? 2.5 : 0}
                    cornerRadius={5}
                    stroke="none"
                    activeIndex={active}
                    activeShape={ActiveSlice}
                    onMouseEnter={(_, at) => setActive(at)}
                    isAnimationActive={false}
                  >
                    {model.slices.map((slice, at) => (
                      <Cell key={slice.key} fill={slice.color} fillOpacity={active < 0 || active === at ? 1 : 0.35} className="transition-[fill-opacity] duration-200" />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
                <span className={cn("font-mono text-[20px] font-semibold tabular-nums tracking-tight", focus ? "text-foreground" : tone)}>
                  {focus ? `${focus.pct.toFixed(1)}%` : signedUsd(profit ? model.total : -model.total)}
                </span>
                <span className="line-clamp-2 max-w-[120px] text-[11px] leading-snug text-muted-foreground">
                  {focus ? focus.title : profit ? "total profit" : "total loss"}
                </span>
              </div>
            </>
          ) : (
            <div className="flex size-full items-center justify-center rounded-full border-[14px] border-muted px-6 text-center text-[12px] text-muted-foreground">
              {profit ? "No winning questions yet" : "No losing questions yet"}
            </div>
          )}
        </div>
        <ul className="w-full min-w-0 flex-1 space-y-2.5 text-[12px]">
          {model.slices.map((slice, at) => {
            const dim = active >= 0 && active !== at;
            const canOpen = !slice.other && slice.conditionId && onPickMarket;
            return (
              <li
                key={slice.key}
                onMouseEnter={() => setActive(at)}
                onMouseLeave={() => setActive(-1)}
                className={cn("transition-opacity duration-200", dim && "opacity-40")}
              >
                <div className="flex items-center gap-2">
                  <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: slice.color }} aria-hidden />
                  {slice.other ? null : <MarketIcon src={slice.icon} title={slice.title} size={16} />}
                  {canOpen ? (
                    <button
                      type="button"
                      onClick={() => onPickMarket({ kind: "market", conditionId: slice.conditionId, title: slice.title, slug: slice.slug })}
                      title={`Open ${slice.title} in the terminal`}
                      className="min-w-0 flex-1 truncate text-left text-foreground hover:underline"
                    >
                      {slice.title}
                    </button>
                  ) : (
                    <span className="min-w-0 flex-1 truncate text-foreground">{slice.title}</span>
                  )}
                  <span className="font-mono tabular-nums text-foreground">{slice.pct.toFixed(1)}%</span>
                </div>
                <div className="ml-4 mt-1 h-1 overflow-hidden rounded-full bg-[var(--spectrum-track)]">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, slice.pct)}%`, backgroundColor: slice.color }} />
                </div>
                <div className="ml-4 mt-1 flex min-w-0 items-center gap-2">
                  <span className={cn("font-mono text-[11px] tabular-nums", tone)}>{signedUsd(slice.pnl)}</span>
                  <OutcomeDots outcomes={slice.outcomes} />
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </figure>
  );
}

/**
 * Where a trader's money was made and lost: one donut of winning questions, one of losing ones,
 * each question netting its finished bets and open positions.
 */
export function TraderPnlByQuestion({ bets, openRows, onPickMarket }) {
  const questions = useMemo(() => byQuestion(bets, openRows), [bets, openRows]);
  const profit = useMemo(() => slicesOf(questions, 1), [questions]);
  const loss = useMemo(() => slicesOf(questions, -1), [questions]);
  return (
    <div className={cn("grid gap-4 lg:grid-cols-2", seriesVarsClassName)}>
      <QuestionDonut kind="profit" model={profit} onPickMarket={onPickMarket} />
      <QuestionDonut kind="loss" model={loss} onPickMarket={onPickMarket} />
    </div>
  );
}