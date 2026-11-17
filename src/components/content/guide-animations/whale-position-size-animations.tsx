"use client";

import { useRef, useState } from "react";

import { BLUE, GREEN, RED } from "@/components/sections/features/feature-kit";
import { EASE, GuideAnimationFigure, ScaledStage, useGuidePhases } from "@/components/content/guide-animations/guide-animation-kit";
import { InteractiveFigure, PillButton } from "@/components/university/expected-wins-animations";
import { AMBER, Eyebrow, Frames, Panel, Reveal, Slider } from "@/components/university/pythagorean-animations";

const CELTICS = AMBER;
const SPURS = BLUE;
const BTC = GREEN;
const SHARE = RED;

function usd(value: number) {
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

function pct(value: number) {
  return `${value.toFixed(1)}%`;
}

/* -------------------------------------------------------------------------- */
/* 1. Bigger dollar ≠ bigger share                                            */
/* -------------------------------------------------------------------------- */

export function DollarVsShareAnimation() {
  const rootRef = useRef<HTMLElement>(null);
  const { phase } = useGuidePhases([1600, 1800, 2000, 4200], rootRef, 3);

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      plain
      label="Two whale positions: a 29,925 dollar Celtics holding that is 19.9 percent of its wallet, and a 6,361 dollar Bitcoin holding that is 68.3 percent of its wallet."
      caption="November 17, 2026 Lychee snapshots. Same question: largest open position vs portfolio share."
    >
      <Frames />
      <div className="grid gap-3 sm:grid-cols-2">
        <Panel
          className="px-4 py-4"
          style={{ opacity: phase >= 0 ? 1 : 0.2, transition: "opacity 400ms ease" }}
        >
          <Eyebrow>BTCGambler247 · Celtics</Eyebrow>
          <p className="mt-2 font-mono text-[28px] font-semibold tabular-nums" style={{ color: CELTICS }}>
            {usd(29925)}
          </p>
          <p className="mt-1 text-[13px] text-muted-foreground">Largest open position</p>
          <Reveal show={phase >= 2}>
            <p className="mt-4 font-mono text-[22px] font-semibold tabular-nums text-foreground">19.9%</p>
            <p className="text-[12.5px] text-muted-foreground">of {usd(150153)} open portfolio</p>
          </Reveal>
        </Panel>
        <Panel
          className="px-4 py-4"
          style={{ opacity: phase >= 1 ? 1 : 0.2, transition: "opacity 400ms ease" }}
        >
          <Eyebrow>Bestpredict0101 · Bitcoin</Eyebrow>
          <p className="mt-2 font-mono text-[28px] font-semibold tabular-nums" style={{ color: BTC }}>
            {usd(6361)}
          </p>
          <p className="mt-1 text-[13px] text-muted-foreground">Largest open position</p>
          <Reveal show={phase >= 3}>
            <p className="mt-4 font-mono text-[22px] font-semibold tabular-nums" style={{ color: SHARE }}>
              68.3%
            </p>
            <p className="text-[12.5px] text-muted-foreground">of {usd(9320)} open portfolio</p>
          </Reveal>
        </Panel>
      </div>
      <Reveal show={phase >= 3}>
        <p className="mt-4 text-[14px] text-foreground">
          The Celtics bet was nearly five times larger in dollars — and a much smaller share of its wallet.
        </p>
      </Reveal>
    </GuideAnimationFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. Celtics vs NBA championship exposure                                    */
/* -------------------------------------------------------------------------- */

export function CelticsNbaExposureExplorer() {
  const [mode, setMode] = useState<"boston" | "nba">("boston");
  const boston = 29925;
  const spurs = 23030;
  const total = 150153;
  const value = mode === "boston" ? boston : boston + spurs;
  const share = (value / total) * 100;

  return (
    <InteractiveFigure caption="November 17 snapshot for BTCGambler247. Toggle Boston alone vs Boston + San Antonio on the same Finals question family.">
      <div className="flex flex-wrap gap-2">
        <PillButton active={mode === "boston"} onClick={() => setMode("boston")}>
          Boston only
        </PillButton>
        <PillButton active={mode === "nba"} onClick={() => setMode("nba")}>
          Boston + San Antonio
        </PillButton>
      </div>
      <Panel className="mt-4 p-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border px-3 py-2.5">
            <p className="text-[11px] text-muted-foreground">Counted value</p>
            <p className="font-mono text-[22px] font-semibold tabular-nums text-foreground">{usd(value)}</p>
          </div>
          <div className="rounded-lg border border-border px-3 py-2.5">
            <p className="text-[11px] text-muted-foreground">Open portfolio</p>
            <p className="font-mono text-[22px] font-semibold tabular-nums text-foreground">{usd(total)}</p>
          </div>
          <div className="rounded-lg border border-border px-3 py-2.5">
            <p className="text-[11px] text-muted-foreground">Share</p>
            <p className="font-mono text-[22px] font-semibold tabular-nums" style={{ color: mode === "nba" ? SPURS : CELTICS }}>
              {pct(share)}
            </p>
          </div>
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-muted">
          <div className="flex h-full">
            <div style={{ width: `${(boston / total) * 100}%`, background: CELTICS, transition: `width 400ms ${EASE}` }} />
            <div
              style={{
                width: mode === "nba" ? `${(spurs / total) * 100}%` : "0%",
                background: SPURS,
                transition: `width 400ms ${EASE}`,
              }}
            />
          </div>
        </div>
        <p className="mt-4 text-[13.5px] leading-relaxed text-muted-foreground" aria-live="polite">
          {mode === "boston"
            ? "Investigating conviction in Boston? Start with the Celtics row — about one-fifth of open value."
            : "Investigating NBA championship exposure? Boston and San Antonio can’t both win. Together they were 35.3% of open holdings."}
        </p>
      </Panel>
    </InteractiveFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. Bitcoin wallet concentration                                            */
/* -------------------------------------------------------------------------- */

const BTC_ROWS = [
  { label: "BTC above $66k · No", value: 6361, color: BTC },
  { label: "Bahrain to win", value: 2686, color: AMBER },
  { label: "Other BTC Up/Down", value: 273, color: BLUE },
] as const;

export function BitcoinConcentrationAnimation() {
  const rootRef = useRef<HTMLElement>(null);
  const { phase } = useGuidePhases([1400, 1400, 1400, 4000], rootRef, 3);
  const total = BTC_ROWS.reduce((sum, row) => sum + row.value, 0);

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      plain
      label="Bestpredict0101 open portfolio: 6,361 dollars on Bitcoin above 66,000 No, 2,686 on Bahrain, and 273 on another Bitcoin market. The first row is 68.3 percent."
      caption="November 17, 2026 snapshot. Three open positions."
    >
      <Frames />
      <ScaledStage width={860} height={280}>
        <div className="flex h-full flex-col justify-center gap-4">
          <div className="flex h-10 overflow-hidden rounded-lg border border-border">
            {BTC_ROWS.map((row, index) => (
              <div
                key={row.label}
                className="flex items-center justify-center px-1 font-mono text-[11px] font-semibold text-white"
                style={{
                  width: phase >= index ? `${(row.value / total) * 100}%` : "0%",
                  background: row.color,
                  transition: `width 700ms ${EASE}`,
                  opacity: phase >= index ? 1 : 0,
                }}
              >
                {phase >= index && row.value >= 2000 ? pct((row.value / total) * 100) : null}
              </div>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {BTC_ROWS.map((row, index) => (
              <div
                key={row.label}
                className="rounded-lg border border-border px-3 py-2.5"
                style={{ opacity: phase >= index ? 1 : 0.2, transition: "opacity 400ms ease" }}
              >
                <p className="truncate text-[12px] text-muted-foreground">{row.label}</p>
                <p className="mt-1 font-mono text-[18px] font-semibold tabular-nums text-foreground">{usd(row.value)}</p>
              </div>
            ))}
          </div>
          <Reveal show={phase >= 3}>
            <p className="text-[13.5px] text-foreground">
              A feed filtered to trades above $10,000 could miss this wallet. The portfolio view is why a researcher might still care.
            </p>
          </Reveal>
        </div>
      </ScaledStage>
    </GuideAnimationFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. Portfolio share calculator                                              */
/* -------------------------------------------------------------------------- */

export function PortfolioShareCalculator() {
  const [position, setPosition] = useState(6361);
  const [portfolio, setPortfolio] = useState(9320);
  const share = portfolio > 0 ? (position / portfolio) * 100 : 0;
  const capped = Math.min(100, Math.max(0, share));

  return (
    <InteractiveFigure caption="Same formula the guide uses: position Value ÷ total open Value. Drag either side.">
      <Panel className="p-5">
        <div className="space-y-4">
          <Slider label="Position value ($)" value={position} min={500} max={50000} step={100} onChange={setPosition} color={CELTICS} />
          <Slider label="Open portfolio value ($)" value={portfolio} min={1000} max={200000} step={100} onChange={setPortfolio} color={SPURS} />
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border px-3 py-2.5">
            <p className="text-[11px] text-muted-foreground">Position</p>
            <p className="font-mono text-[22px] font-semibold tabular-nums text-foreground">{usd(position)}</p>
          </div>
          <div className="rounded-lg border border-border px-3 py-2.5">
            <p className="text-[11px] text-muted-foreground">Portfolio</p>
            <p className="font-mono text-[22px] font-semibold tabular-nums text-foreground">{usd(portfolio)}</p>
          </div>
          <div className="rounded-lg border border-border px-3 py-2.5">
            <p className="text-[11px] text-muted-foreground">Share</p>
            <p className="font-mono text-[22px] font-semibold tabular-nums" style={{ color: capped >= 50 ? SHARE : BTC }}>
              {pct(capped)}
            </p>
          </div>
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full" style={{ width: `${capped}%`, background: SHARE, transition: `width 300ms ${EASE}` }} />
        </div>
        <p className="mt-4 text-[13px] leading-relaxed text-muted-foreground" aria-live="polite">
          Cash, closed bets, and lifetime volume sit outside this denominator. Both numbers should come from the same Active
          positions snapshot.
        </p>
      </Panel>
    </InteractiveFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 5. How the share got large                                                 */
/* -------------------------------------------------------------------------- */

export function HowShareGrewExplorer() {
  const [path, setPath] = useState<"buys" | "price" | "closed">("buys");
  const copy = {
    buys: "The trader kept buying as the position grew. Share count and dollars spent both climbed.",
    price: "The price rose while the share count stayed flat. Mark-to-market value — and portfolio share — expanded without new buys.",
    closed: "Other positions were closed or settled. This row became a larger share of a smaller open portfolio.",
  } as const;

  return (
    <InteractiveFigure caption="Same percentage today can come from different paths. Open the position’s trade history to see which one fits.">
      <div className="flex flex-wrap gap-2">
        <PillButton active={path === "buys"} onClick={() => setPath("buys")}>
          Kept buying
        </PillButton>
        <PillButton active={path === "price"} onClick={() => setPath("price")}>
          Price rose
        </PillButton>
        <PillButton active={path === "closed"} onClick={() => setPath("closed")}>
          Closed others
        </PillButton>
      </div>
      <Panel className="mt-4 p-5">
        <Eyebrow>Path to today’s share</Eyebrow>
        <p className="mt-2 text-[14px] leading-relaxed text-foreground" aria-live="polite">
          {copy[path]}
        </p>
        <p className="mt-3 text-[13px] text-muted-foreground">
          To measure how aggressively someone sized the <span className="font-medium text-foreground">original purchase</span>,
          you need the fill and the wallet’s portfolio value at entry — not only today’s mark.
        </p>
      </Panel>
    </InteractiveFigure>
  );
}

/* -------------------------------------------------------------------------- */
/* 6. How-to steps                                                            */
/* -------------------------------------------------------------------------- */

const STEPS = [
  { title: "Choose a wallet", body: "Search a trader, or open a holder from the market you’re researching." },
  { title: "Read two Values", body: "Position row Value and the total Value above Active positions." },
  { title: "Divide row ÷ total", body: "That percentage is the open portfolio share at the snapshot." },
  { title: "Check related markets", body: "Same election, game, asset, or deadline — decide contract vs event first." },
] as const;

export function MeasurePositionStepsAnimation() {
  const rootRef = useRef<HTMLElement>(null);
  const { phase } = useGuidePhases([1100, 1100, 1100, 1100, 3200], rootRef, 4);

  return (
    <GuideAnimationFigure
      rootRef={rootRef}
      plain
      label="Four steps for measuring a Polymarket position as a share of a wallet: choose a wallet, read two Values, divide, then check related markets."
      caption="Use the same snapshot basis for both numbers."
    >
      <Frames />
      <div className="grid gap-3 sm:grid-cols-2">
        {STEPS.map((step, index) => (
          <Panel
            key={step.title}
            className="px-4 py-4"
            style={{
              opacity: phase >= index ? 1 : 0.2,
              transform: phase >= index ? "none" : "translateY(8px)",
              transition: `opacity 400ms ease, transform 500ms ${EASE}`,
            }}
          >
            <Eyebrow>Step {index + 1}</Eyebrow>
            <p className="mt-1 text-[15px] font-semibold text-foreground">{step.title}</p>
            <p className="mt-1 text-[13px] leading-snug text-muted-foreground">{step.body}</p>
          </Panel>
        ))}
      </div>
      <Reveal show={phase >= 4}>
        <p className="mt-4 text-[14px] text-foreground">
          For Yes and No on the same question, add their values for question exposure — and keep each side visible if you care
          which outcome the wallet favored.
        </p>
      </Reveal>
    </GuideAnimationFigure>
  );
}
