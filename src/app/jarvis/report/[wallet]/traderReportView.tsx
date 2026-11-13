"use client";

import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import { entryCents, money, pct, signedMoney } from "@/lib/mcp/research/format";

const WON = "#10b981";
const LOST = "#f43f5e";
const EARLY = "#6366f1";
const LATE = "#cbd5e1";

const USD_AXIS = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 });
const DAY_FMT = new Intl.DateTimeFormat("en-US", { month: "short", year: "2-digit" });
const LONG_DAY = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

type Headline = { label: string; value: string; tone: "good" | "bad" | "neutral" };
type Meta = { id: string; cluster: string; label: string };
type Props = {
  report: any;
  headlines: Headline[];
  reads: Record<string, string[]>;
  insights: Meta[];
  clusters: Record<string, string>;
};

const cap = (s: string) => String(s || "").replace(/^./, (c) => c.toUpperCase());
const short = (w: string) => `${w.slice(0, 6)}…${w.slice(-4)}`;
const tone = (n: number) => (n > 0 ? "text-emerald-600" : n < 0 ? "text-rose-600" : "text-muted-foreground");
const isoToSec = (d: string) => Math.floor(new Date(`${d}T00:00:00Z`).getTime() / 1000);

/** Every Jarvis trader insight for one wallet, grouped the way the X reply groups them. */
export function TraderReportView({ report, headlines, reads, insights, clusters }: Props) {
  const o = report.overall || {};
  const name = report.name || short(report.wallet);
  const generated = report.generated_at ? LONG_DAY.format(new Date(report.generated_at)) : null;
  const terminal = `/dashboard?terminal=holder&wallet=${report.wallet}`;
  const byCluster = Object.keys(clusters).map((key) => ({
    key,
    label: clusters[key],
    items: insights.filter((m) => m.cluster === key && report.insights?.[m.id] && !report.insights[m.id].error),
  }));

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-10 px-5 py-10 font-sans antialiased sm:px-8">
      <header className="flex flex-col gap-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Jarvis · Ultra deep dive</span>
            <h1 className="text-3xl font-medium tracking-tight text-foreground md:text-4xl">{name}</h1>
            <p className="text-sm text-muted-foreground">
              {short(report.wallet)} · Polymarket{generated ? ` · as of ${generated}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={terminal}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Open in Holder Terminal
            </a>
            <a
              href={`https://polymarket.com/profile/${report.wallet}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              Polymarket profile <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </a>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Lifetime PnL" value={signedMoney(o.lifetime_pnl_usdc)} className={tone(o.lifetime_pnl_usdc)} />
          <Stat label="Volume" value={money(o.volume_usdc) || "—"} />
          <Stat label="Trades" value={o.trade_count ? Number(o.trade_count).toLocaleString("en-US") : "—"} />
          <Stat label="Portfolio" value={money(o.portfolio_value_usdc) || "—"} />
          <Stat label="Skill Score" value={o.skill_score != null ? String(Math.round(o.skill_score)) : "—"} hint={o.skill_tier} />
          <Stat label="Active since" value={o.active_since || "—"} />
        </div>
      </header>

      {headlines.length ? (
        <section aria-label="What stands out" className="flex flex-col gap-3">
          <h2 className="text-lg font-medium tracking-tight">What stands out</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {headlines.map((h) => (
              <div
                key={h.label}
                className={cn(
                  "flex flex-col gap-1 rounded-xl border p-4",
                  h.tone === "good" && "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/30",
                  h.tone === "bad" && "border-rose-200 bg-rose-50/60 dark:border-rose-900 dark:bg-rose-950/30",
                  h.tone === "neutral" && "border-border bg-muted/30",
                )}
              >
                <span className="text-xs text-muted-foreground">{h.label}</span>
                <span className="text-lg font-semibold tracking-tight">{h.value}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {byCluster.map((group) =>
        group.items.length ? (
          <section key={group.key} aria-label={group.label} className="flex flex-col gap-3">
            <h2 className="text-lg font-medium tracking-tight">{group.label}</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {group.items.map((m) => (
                <InsightCard key={m.id} title={m.label} lines={reads[m.id] || []} wide={WIDE.has(m.id)}>
                  {renderInsight(m.id, report.insights[m.id])}
                </InsightCard>
              ))}
            </div>
          </section>
        ) : null,
      )}

      <section aria-label="Record" className="flex flex-col gap-3">
        <h2 className="text-lg font-medium tracking-tight">Record</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <InsightCard title="Biggest wins" lines={[]}>
            <Rows rows={(report.biggest_wins || []).map((w: any) => [w.title, `${w.outcome} · ${entryCents(w.avg_price)}¢`, w.pnl_usdc])} />
          </InsightCard>
          <InsightCard title="Biggest misses" lines={[]}>
            <Rows
              rows={[
                ...(report.biggest_losses || []).map((w: any) => [w.title, `${w.outcome} · ${entryCents(w.avg_price)}¢`, w.pnl_usdc]),
                ...(report.notable_open || [])
                  .filter((p: any) => p.pnl_usdc < 0)
                  .slice(0, 3)
                  .map((p: any) => [p.title, `${p.outcome} · open`, p.pnl_usdc]),
              ]}
            />
          </InsightCard>
        </div>
      </section>

      <footer className="border-t border-border pt-6 text-xs leading-relaxed text-muted-foreground">
        Built by Jarvis from Polymarket&apos;s public data. Timing versus headlines shows what lined up, not why anyone traded. Not
        financial advice. Ask <span className="font-medium text-foreground">@lychee_data</span> on X to &ldquo;go ultra deep&rdquo; on any
        trader.
      </footer>
    </main>
  );
}

const WIDE = new Set(["current_form", "news_timing"]);

function renderInsight(id: string, v: any): ReactNode {
  switch (id) {
    case "current_form":
      return <FormChart v={v} />;
    case "category_pnl":
      return <SignedBars data={(v.categories || []).map((c: any) => ({ name: cap(c.category), value: c.pnl }))} />;
    case "country_edge":
      return (
        <SignedBars
          data={[...(v.countries || [])]
            .sort((a: any, b: any) => Math.abs(b.pnl) - Math.abs(a.pnl))
            .slice(0, 10)
            .sort((a: any, b: any) => b.pnl - a.pnl)
            .map((c: any) => ({ name: c.country, value: c.pnl, note: `${c.bets} bets` }))}
        />
      );
    case "category_ranks":
      return (
        <div className="flex flex-wrap gap-2">
          {(v.ranks || []).map((r: any) => (
            <span key={r.category} className="rounded-full border border-border px-3 py-1 text-sm">
              <span className="font-semibold">#{r.rank_pnl.toLocaleString("en-US")}</span> {cap(r.category)}
              <span className="text-muted-foreground"> · {signedMoney(r.pnl)}</span>
            </span>
          ))}
        </div>
      );
    case "price_buckets":
      return (
        <SignedBars
          vertical
          data={(v.buckets || []).map((b: any) => ({
            name: b.bucket,
            value: b.pnl,
            note: `${b.bets} bets · ${pct(b.win_rate) ?? "—"} won`,
          }))}
        />
      );
    case "concentration":
      return <Concentration v={v} />;
    case "hold_style":
      return (
        <Split
          parts={[
            { label: "Held to resolution", value: v.held_to_resolution, color: EARLY },
            { label: "Exited early", value: v.exited_early, color: LATE },
          ]}
          caption={v.median_hold_days != null ? `Median hold ${v.median_hold_days} days` : undefined}
        />
      );
    case "entry_earliness":
      return <Earliness v={v} />;
    case "news_timing":
      return <NewsTiming v={v} />;
    case "post_entry_drift":
      return (
        <Table
          head={["Bet", "At entry", "24h", "7 days"]}
          rows={(v.bets || []).map((b: any) => [
            b.title,
            `${entryCents(b.price_at_entry)}¢`,
            <Drift key="d1" from={b.price_at_entry} to={b.after_24h} />,
            <Drift key="d7" from={b.price_at_entry} to={b.after_7d} />,
          ])}
        />
      );
    case "buying_now":
      return (
        <Table
          head={["Market", "Side", "Bought", "Avg"]}
          rows={(v.top || []).map((t: any) => [t.title, t.outcome, money(t.bought) || "$0", `${entryCents(t.avg_price)}¢`])}
        />
      );
    case "disagreements":
      return (
        <Table
          head={["Bet", "Paid", "Now", "PnL"]}
          rows={(v.bets || []).map((b: any) => [
            `${b.title} — ${b.outcome}`,
            `${entryCents(b.avg_price)}¢`,
            `${entryCents(b.current_price)}¢`,
            <span key="p" className={tone(b.pnl)}>
              {signedMoney(b.pnl)}
            </span>,
          ])}
        />
      );
    case "copy_check":
      return v.entries ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-semibold tracking-tight">${v.invested.toLocaleString("en-US")}</span>
            <span className="text-muted-foreground">→</span>
            <span className={cn("text-3xl font-semibold tracking-tight", tone(v.value_now - v.invested))}>
              ${v.value_now.toLocaleString("en-US")}
            </span>
          </div>
          <Split
            parts={[
              { label: "Winners", value: v.winners, color: WON },
              { label: "Losers or flat", value: v.entries - v.winners, color: LOST },
            ]}
          />
        </div>
      ) : null;
    case "co_holders":
      return (
        <Table
          head={["Wallet", "Shared", "Lifetime"]}
          rows={(v.wallets || []).map((w: any) => [
            <a key="w" href={`/jarvis/report/${w.wallet}`} className="underline-offset-2 hover:underline">
              {w.name || short(w.wallet)}
            </a>,
            `${w.shared_markets} of ${v.markets_checked}`,
            w.lifetime_pnl != null ? (
              <span key="l" className={tone(w.lifetime_pnl)}>
                {signedMoney(w.lifetime_pnl)}
              </span>
            ) : (
              "—"
            ),
          ])}
        />
      );
    case "whale_alignment":
      return (
        <Table
          head={["His bet", "Biggest other holder", ""]}
          rows={(v.markets || []).map((m: any) => [
            `${m.title} — ${m.outcome} (${money(m.his_value) || "$0"})`,
            m.largest_other
              ? `${m.largest_other.name || "anon"} · ${m.largest_other.outcome} ${money(m.largest_other.value) || "$0"}`
              : "—",
            m.he_is_largest ? (
              <Badge key="b" tone="good">
                He&apos;s largest
              </Badge>
            ) : m.largest_other ? (
              <Badge key="b" tone={m.largest_other.with_him ? "good" : "bad"}>
                {m.largest_other.with_him ? "With" : "Against"}
              </Badge>
            ) : null,
          ])}
        />
      );
    case "followers":
      return v.note ? null : (
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold tracking-tight">{v.repeat_followers}</span>
          <span className="text-sm text-muted-foreground">wallets followed him into 2+ of {v.tested} recent big entries within 6h</span>
        </div>
      );
    default:
      return null;
  }
}

function Stat({ label, value, hint, className }: { label: string; value: string; hint?: string; className?: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl border border-border p-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("text-xl font-semibold tracking-tight", className)}>{value}</span>
      {hint ? <span className="truncate text-[11px] text-muted-foreground">{hint}</span> : null}
    </div>
  );
}

function InsightCard({ title, lines, wide, children }: { title: string; lines: string[]; wide?: boolean; children?: ReactNode }) {
  return (
    <article className={cn("flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-background p-5", wide && "md:col-span-2")}>
      <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
      {lines.length ? <p className="text-sm leading-relaxed text-muted-foreground">{lines[0]}</p> : null}
      {children}
    </article>
  );
}

function Badge({ tone: t, children }: { tone: "good" | "bad"; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium",
        t === "good"
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
          : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
      )}
    >
      {children}
    </span>
  );
}

function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  if (!rows.length) return <p className="text-sm text-muted-foreground">Nothing to show.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            {head.map((h, i) => (
              <th key={i} className={cn("pb-2 font-medium", i > 0 && "pl-3 text-right")}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-border/60 last:border-0">
              {r.map((cell, j) => (
                <td
                  key={j}
                  className={cn("py-2 align-top", j === 0 ? "max-w-[18rem] pr-2" : "whitespace-nowrap pl-3 text-right tabular-nums")}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Rows({ rows }: { rows: [string, string, number][] }) {
  return (
    <Table
      head={["Market", "Side · entry", "PnL"]}
      rows={rows.map(([title, side, pnl]) => [
        title,
        side,
        <span key="p" className={tone(pnl)}>
          {signedMoney(pnl)}
        </span>,
      ])}
    />
  );
}

function Drift({ from, to }: { from: number; to: number | null }) {
  if (to == null) return <span className="text-muted-foreground">—</span>;
  const d = Math.round((to - from) * 100);
  return (
    <span className={tone(d)}>
      {entryCents(to)}¢ ({d >= 0 ? "+" : ""}
      {d}¢)
    </span>
  );
}

function Split({ parts, caption }: { parts: { label: string; value: number; color: string; display?: string }[]; caption?: string }) {
  const total = parts.reduce((a, p) => a + (p.value || 0), 0) || 1;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
        {parts.map((p) => (
          <div key={p.label} style={{ width: `${(100 * (p.value || 0)) / total}%`, background: p.color }} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {parts.map((p) => (
          <span key={p.label} className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
            {p.label} {p.display ?? p.value.toLocaleString("en-US")}
          </span>
        ))}
        {caption ? <span>{caption}</span> : null}
      </div>
    </div>
  );
}

function Concentration({ v }: { v: any }) {
  const life = Math.max(v.lifetime_pnl || 0, 1);
  const top5 = Math.max(v.top5_pnl, 0);
  const next5 = Math.max(v.top10_pnl - v.top5_pnl, 0);
  const rest = Math.max(life - top5 - next5, 0);
  return (
    <div className="flex flex-col gap-3">
      <Split
        parts={[
          { label: "Top 5 bets", value: top5, color: EARLY, display: `${pct(top5 / life)} · ${money(top5)}` },
          { label: "Next 5", value: next5, color: "#a5b4fc", display: `${pct(next5 / life)} · ${money(next5)}` },
          { label: "Everything else", value: rest, color: LATE, display: `${pct(rest / life)} · ${money(rest) || "$0"}` },
        ]}
      />
      <Table
        head={["Top 5", "PnL"]}
        rows={(v.top5 || []).map((t: any) => [
          t.title,
          <span key="p" className={tone(t.pnl)}>
            {signedMoney(t.pnl)}
          </span>,
        ])}
      />
    </div>
  );
}

function SignedBars({ data, vertical }: { data: { name: string; value: number; note?: string }[]; vertical?: boolean }) {
  if (!data.length) return null;
  const tip = (
    <Tooltip
      cursor={{ fill: "rgba(0,0,0,0.04)" }}
      formatter={(value: number, _n: string, item: any) => [
        `${signedMoney(value)}${item?.payload?.note ? ` · ${item.payload.note}` : ""}`,
        "PnL",
      ]}
    />
  );
  if (vertical) {
    return (
      <div className="flex flex-col gap-2">
        <div className="h-56 w-full">
          <ResponsiveContainer>
            <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickFormatter={(n) => USD_AXIS.format(n)} tickLine={false} axisLine={false} fontSize={11} width={56} />
              <ReferenceLine y={0} stroke="#94a3b8" />
              {tip}
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {data.map((d) => (
                  <Cell key={d.name} fill={d.value >= 0 ? WON : LOST} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div
          className="grid text-center text-[11px] text-muted-foreground"
          style={{ gridTemplateColumns: `64px repeat(${data.length}, 1fr) 8px` }}
        >
          <span />
          {data.map((d) => (
            <span key={d.name}>{d.note}</span>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="w-full" style={{ height: Math.max(120, data.length * 30 + 20) }}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis type="number" tickFormatter={(n) => USD_AXIS.format(n)} tickLine={false} axisLine={false} fontSize={11} />
          <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} fontSize={12} width={96} />
          <ReferenceLine x={0} stroke="#94a3b8" />
          {tip}
          <Bar dataKey="value" radius={4}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.value >= 0 ? WON : LOST} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function FormChart({ v }: { v: any }) {
  const series = v.series || [];
  if (series.length < 2) return null;
  const dd = v.worst_drawdown;
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-3 text-sm">
        {[
          ["7 days", v.change_7d],
          ["30 days", v.change_30d],
          ["90 days", v.change_90d],
        ].map(([label, n]) => (
          <div key={label as string} className="flex flex-col">
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className={cn("font-semibold", tone(n as number))}>{signedMoney(n as number)}</span>
          </div>
        ))}
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer>
          <AreaChart data={series} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="pnlFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={WON} stopOpacity={0.25} />
                <stop offset="100%" stopColor={WON} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="t"
              type="number"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(t) => DAY_FMT.format(new Date(t * 1000))}
              tickLine={false}
              axisLine={false}
              fontSize={11}
              minTickGap={40}
            />
            <YAxis tickFormatter={(n) => USD_AXIS.format(n)} tickLine={false} axisLine={false} fontSize={11} width={56} />
            {dd ? <ReferenceArea x1={isoToSec(dd.from)} x2={isoToSec(dd.to)} fill={LOST} fillOpacity={0.08} /> : null}
            <ReferenceLine y={v.all_time_high} stroke="#94a3b8" strokeDasharray="4 4" />
            <Tooltip
              labelFormatter={(t) => LONG_DAY.format(new Date(Number(t) * 1000))}
              formatter={(value: number) => [signedMoney(value), "PnL"]}
            />
            <Area type="monotone" dataKey="v" stroke={WON} strokeWidth={2} fill="url(#pnlFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {dd ? (
        <p className="text-xs text-muted-foreground">
          Shaded: worst drawdown, -{money(dd.drop)} from {dd.from} to {dd.to}
          {dd.recovered ? ", since recovered" : ""}. Dashed line: all-time high.
        </p>
      ) : null}
    </div>
  );
}

function Earliness({ v }: { v: any }) {
  const rows = (v.bets || [])
    .filter((b: any) => b.days_after_open != null && b.days_before_close != null)
    .map((b: any) => ({
      name: b.title.replace(/^Will (the )?/i, "").replace(/\?$/, ""),
      after: b.days_after_open,
      before: b.days_before_close,
    }))
    .map((r: any) => ({ ...r, name: r.name.length > 26 ? `${r.name.slice(0, 25)}…` : r.name }));
  if (!rows.length) return null;
  return (
    <div className="flex flex-col gap-2">
      <div className="w-full" style={{ height: rows.length * 34 + 24 }}>
        <ResponsiveContainer>
          <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} fontSize={11} width={170} />
            <Tooltip formatter={(value: number, key: string) => [`${value} days`, key === "after" ? "After launch" : "Before close"]} />
            <Bar dataKey="after" stackId="life" fill={LATE} radius={[4, 0, 0, 4]} />
            <Bar dataKey="before" stackId="life" fill={EARLY} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: LATE }} />
          Days after the market opened
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: EARLY }} />
          Days left until it closed
        </span>
      </div>
    </div>
  );
}

const VERDICT: Record<string, { label: string; tone: "good" | "bad" | null }> = {
  ahead: { label: "Ahead of the news", tone: "good" },
  reacting: { label: "After a headline", tone: null },
  mixed: { label: "Mixed", tone: null },
  no_coverage: { label: "No coverage found", tone: null },
};

function NewsTiming({ v }: { v: any }) {
  return (
    <ul className="flex flex-col divide-y divide-border/60">
      {(v.bets || []).map((b: any, i: number) => {
        const verdict = VERDICT[b.verdict] || VERDICT.no_coverage;
        return (
          <li key={i} className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {b.title} — {b.outcome}
              </p>
              <p className="text-xs text-muted-foreground">
                Bought {b.entered}
                {b.nearest_before
                  ? ` · ${b.nearest_before.hours_before}h after "${b.nearest_before.title}" (${b.nearest_before.source})`
                  : ""}
                {b.first_after ? ` · ${b.first_after.hours_after}h before "${b.first_after.title}" (${b.first_after.source})` : ""}
              </p>
            </div>
            {verdict.tone ? (
              <Badge tone={verdict.tone}>{verdict.label}</Badge>
            ) : (
              <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {verdict.label}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
