"use client";

import { memo, useLayoutEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { formatUsd } from "@/components/dashboardComposer/recipes/polymarketMarketSearch";
import { chosenName, shortWallet, useHolderSession } from "@/components/terminals/holder/holderSession";
import { SCORE_TIERS, SKILL_SCORE_NAME, scoreTier } from "@/components/terminals/holder/traderScore";
import { TerminalPanelFull } from "@/components/terminals/terminalCanvas";
import { retryImport } from "@/lib/retryImport";
import { cn } from "@/lib/utils";
import { PieceSession } from "./shareSessions";

const SheetBlockChart = dynamic(
  () => retryImport(() => import("@/components/dashboardComposer/sheetBlockChart")).then((m) => m.SheetBlockChart),
  { ssr: false, loading: () => <PieceLoading /> },
);

function PieceLoading({ label = "Loading" }) {
  return (
    <div className="flex h-full min-h-24 items-center justify-center gap-2 text-[12px] text-muted-foreground">
      <Loader2 className="size-4 animate-spin" aria-hidden />
      {label}
    </div>
  );
}

/**
 * Lays its child out at `minWidth` or wider and scales it down to the box, so dense panels keep
 * their own proportions on a small card instead of squeezing into a narrow column.
 */
export function ZoomBox({ minWidth = 560, children, className }) {
  const ref = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const scale = size.w ? Math.min(1, size.w / minWidth) : 1;
  return (
    <div ref={ref} className={cn("relative min-h-0 flex-1 overflow-hidden", className)}>
      {size.w ? (
        <div
          className="absolute left-0 top-0 flex flex-col"
          style={{ width: size.w / scale, height: size.h / scale, transform: `scale(${scale})`, transformOrigin: "top left" }}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

function cellRows(block, limit) {
  const columns = Array.isArray(block?.columns) ? block.columns : [];
  if (Array.isArray(block?.records) && block.records.length) {
    return block.records.slice(0, limit).map((row) => columns.map((column) => row?.[column?.id ?? column?.name] ?? ""));
  }
  const cells = block?.cells && typeof block.cells === "object" ? block.cells : {};
  const byRow = new Map();
  for (const [key, value] of Object.entries(cells)) {
    const [col, row] = String(key).split(",").map(Number);
    if (!Number.isFinite(col) || !Number.isFinite(row)) continue;
    if (!byRow.has(row)) byRow.set(row, []);
    byRow.get(row)[col] = value;
  }
  return [...byRow.keys()].sort((a, b) => a - b).slice(0, limit).map((row) => columns.map((_, index) => byRow.get(row)[index] ?? ""));
}

function cellText(value) {
  if (value == null) return "";
  if (typeof value === "number") return Number.isInteger(value) ? value.toLocaleString() : value.toLocaleString(undefined, { maximumFractionDigits: 4 });
  if (typeof value === "object") return value?.value != null ? cellText(value.value) : "";
  return String(value);
}

function MiniTable({ block }) {
  const columns = (Array.isArray(block?.columns) ? block.columns : []).slice(0, 6);
  const rows = cellRows(block, 14).map((row) => row.slice(0, columns.length));
  return (
    <table className="w-full table-fixed border-collapse text-[12px]">
      <thead>
        <tr>
          {columns.map((column, index) => (
            <th key={index} className="truncate border-b border-border px-2 py-1.5 text-left font-medium text-muted-foreground">
              {column?.title || column?.name || column?.id || ""}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={rowIndex} className="border-b border-border/50">
            {row.map((value, index) => (
              <td key={index} className="truncate px-2 py-1.5 font-mono tabular-nums text-foreground">
                {cellText(value)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function num(value) {
  if (value === "" || value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function signedUsd(value) {
  if (value == null) return "—";
  return `${value < 0 ? "−" : value > 0 ? "+" : ""}${formatUsd(Math.abs(value))}`;
}

const GAUGE_SPAN = 30;

/** A trader's Lychee Skill Score as a card of its own. */
function ScoreCard() {
  const session = useHolderSession();
  if (session?.view !== "trader") return <PieceLoading />;
  const { subject, profile, skill } = session;
  const row = profile.rows[0] || {};
  const name = chosenName(row.name) || row.pseudonym || chosenName(subject.title) || shortWallet(subject.address);
  const score = skill.score;
  const tier = score ? scoreTier(score.score) : null;
  const at = score ? ((Math.max(-GAUGE_SPAN, Math.min(GAUGE_SPAN, score.score)) + GAUGE_SPAN) / (2 * GAUGE_SPAN)) * 100 : 50;
  return (
    <div className="flex h-full flex-col justify-between gap-5 p-6">
      <div className="flex items-center gap-3">
        {row.profileImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={row.profileImage} alt="" crossOrigin="anonymous" className="size-12 rounded-full object-cover" />
        ) : (
          <span className="size-12 rounded-full bg-gradient-to-br from-sky-400 to-violet-500" aria-hidden />
        )}
        <div className="min-w-0">
          <p className="truncate text-[20px] font-semibold text-foreground">{name}</p>
          <p className="truncate font-mono text-[12px] text-muted-foreground">{shortWallet(subject.address)}</p>
        </div>
      </div>
      <div>
        <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{SKILL_SCORE_NAME}</p>
        {skill.status === "loading" ? (
          <PieceLoading label="Scoring" />
        ) : score ? (
          <>
            <p className={cn("mt-1 font-mono text-[64px] font-semibold leading-none tabular-nums tracking-tight", tier.tone)}>
              {score.score > 0 ? "+" : ""}
              {score.score.toFixed(1)}
            </p>
            <p className="mt-2 text-[14px] text-muted-foreground">{tier.label}</p>
            <div className="relative mt-4">
              <div className="flex h-2 gap-0.5 overflow-hidden rounded-full" aria-hidden>
                {[...SCORE_TIERS].reverse().map((band) => (
                  <span key={band.min} className="flex-1 opacity-80" style={{ backgroundColor: band.fill }} />
                ))}
              </div>
              <span
                className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background shadow"
                style={{ left: `${at}%`, backgroundColor: tier.fill }}
                aria-hidden
              />
            </div>
          </>
        ) : (
          <p className="mt-2 text-[14px] text-muted-foreground">No finished markets to score yet.</p>
        )}
      </div>
      <dl className="grid grid-cols-2 gap-3">
        {[
          ["Realized PnL", signedUsd(num(row.realized_pnl))],
          ["Volume", formatUsd(num(row.volume_usdc ?? row.volume))],
          ["Won", score ? `${Math.round(score.winRate * 100)}%` : "—"],
          ["Bets scored", score ? score.positions.toLocaleString() : "—"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-border/70 px-3 py-2.5">
            <dt className="text-[11px] text-muted-foreground">{label}</dt>
            <dd className="mt-0.5 font-mono text-[18px] font-semibold tabular-nums text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** One piece's content inside its card slot. Kept out of the card's re-renders: typing a headline doesn't redraw its charts. */
export const SharePiece = memo(function SharePiece({ piece }) {
  if (piece.kind === "panel") {
    return (
      <PieceSession tabId={piece.tabId} fallback={<PieceLoading />}>
        <ZoomBox minWidth={piece.block?.panel?.startsWith("market.stats") || piece.block?.panel === "trader.stats" ? 380 : 640}>
          <TerminalPanelFull block={piece.block} />
        </ZoomBox>
      </PieceSession>
    );
  }
  if (piece.kind === "score") {
    return (
      <PieceSession tabId={piece.tabId} fallback={<PieceLoading />}>
        <ZoomBox minWidth={380}>
          <ScoreCard />
        </ZoomBox>
      </PieceSession>
    );
  }
  if (piece.kind === "chart") {
    return (
      <ZoomBox minWidth={520} className="p-2">
        <SheetBlockChart sheet={piece.source} view={piece.block.chartView || ""} snapshot={piece.block.chart} />
      </ZoomBox>
    );
  }
  if (piece.kind === "price" || piece.kind === "book") {
    return (
      <ZoomBox minWidth={520} className="p-2">
        <SheetBlockChart sheet={piece.block} />
      </ZoomBox>
    );
  }
  if (piece.kind === "sheet") {
    return (
      <ZoomBox minWidth={520} className="px-2 py-1">
        <MiniTable block={piece.block} />
      </ZoomBox>
    );
  }
  if (piece.kind === "text") {
    return <p className="whitespace-pre-line p-5 text-[18px] leading-relaxed text-foreground">{piece.block.body}</p>;
  }
  return null;
});
