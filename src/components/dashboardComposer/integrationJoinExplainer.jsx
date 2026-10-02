"use client";

import { motion, useReducedMotion } from "framer-motion";

import { BorderBeam } from "@/components/magicui/border-beam";
import { FlickeringGrid } from "@/components/ui/flickering-grid";
import { cn } from "@/lib/utils";

const KALSHI = "#28CC95";

/** Illustration only. These rows are not loaded from Athena. */
const SAMPLE = [
  {
    ticker: "MARKET-A",
    fills: [
      ["14:02", "Yes", "63¢"],
      ["14:01", "No", "37¢"],
    ],
  },
  {
    ticker: "MARKET-B",
    fills: [
      ["09:15", "Yes", "48¢"],
      ["09:14", "Yes", "47¢"],
    ],
  },
  {
    ticker: "MARKET-C",
    fills: [
      ["18:40", "No", "22¢"],
      ["18:39", "Yes", "78¢"],
    ],
  },
];

export const JOIN_EXPLAINER_COPY =
  "Join lets you join your current data table with another data source, like trades.";

const TRADE_SAMPLE = [
  {
    ticker: "MARKET-A",
    fill: ["14:02", "Yes", "63¢"],
    meta: [
      ["Category", "Politics"],
      ["Status", "Finalized"],
      ["Title", "Market A"],
    ],
  },
  {
    ticker: "MARKET-B",
    fill: ["09:15", "Yes", "48¢"],
    meta: [
      ["Category", "Sports"],
      ["Status", "Closed"],
      ["Title", "Market B"],
    ],
  },
  {
    ticker: "MARKET-C",
    fill: ["18:40", "No", "22¢"],
    meta: [
      ["Category", "Weather"],
      ["Status", "Active"],
      ["Title", "Market C"],
    ],
  },
];

export const TRADES_JOIN_EXPLAINER_COPY =
  "Join lets you join this trades table with Kalshi Historical markets and bring market metadata onto each fill.";

function tabClass(selected) {
  return cn(
    "relative -ml-px shrink-0 border border-border/70 px-2 py-1 text-left text-[11px] font-medium leading-none first:ml-0",
    selected ? "z-10 border-[#0d99ff] bg-[#0d99ff]/10 text-[#0d99ff]" : "bg-background text-muted-foreground",
  );
}

/** The tab that appears while Join is hovered. It is not a real sheet. */
export function JoinExplainerTabs({ source = "markets" }) {
  const reduce = useReducedMotion();
  const from = source === "trades" ? "Trades" : "Markets";
  const to = source === "trades" ? "Markets" : "Trades";
  return (
    <div className="overflow-hidden px-4 pb-1 pt-4">
      <div className="flex">
        <span className={tabClass(false)}>{from}</span>
        <motion.span
          initial={reduce ? false : { clipPath: "inset(0 100% 0 0)", opacity: 0 }}
          animate={{ clipPath: "inset(0 0% 0 0)", opacity: 1 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className={tabClass(true)}
        >
          {to}
        </motion.span>
      </div>
    </div>
  );
}

function TradesJoinExplainer() {
  const reduce = useReducedMotion();
  return (
    <div className="relative flex h-full min-h-[280px] items-center justify-center overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm">
      <FlickeringGrid
        className="absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]"
        squareSize={3}
        gridGap={5}
        flickerChance={0.16}
        color="rgb(40, 204, 149)"
        maxOpacity={0.2}
      />
      <div className="relative z-10 flex w-full max-w-2xl flex-col items-center gap-5 px-6 py-8">
        <p className="max-w-md text-center text-[13px] leading-relaxed text-muted-foreground">{TRADES_JOIN_EXPLAINER_COPY}</p>
        <div className="flex w-full flex-col gap-2">
          {TRADE_SAMPLE.map((trade, index) => (
            <div key={trade.ticker} className="grid grid-cols-[minmax(0,1fr)_2.5rem_minmax(0,1.15fr)] items-center gap-x-2">
              <div className="rounded-xl border border-[#28CC95]/50 bg-[#28CC95]/10 px-3 py-2 shadow-sm backdrop-blur-md">
                <p className="font-mono text-[10px] text-foreground">
                  {trade.fill[0]} · {trade.fill[1]} · {trade.fill[2]}
                </p>
                <p className="truncate font-mono text-[10px] text-muted-foreground">{trade.ticker}</p>
              </div>
              <div className="relative h-px overflow-hidden bg-border">
                <motion.span
                  className="absolute inset-y-0 left-0 bg-[#28CC95]"
                  initial={reduce ? false : { width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ delay: 0.15 + index * 0.1, duration: 0.4 }}
                />
              </div>
              <motion.div
                className="relative overflow-hidden rounded-xl border border-border/70 bg-background/90 shadow-sm backdrop-blur-md"
                initial={reduce ? false : { opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.28 + index * 0.1, duration: 0.35 }}
              >
                <BorderBeam size={70} duration={8} delay={index * 1.4} borderWidth={1.2} colorFrom={KALSHI} colorTo="#0d99ff" />
                <p className="border-b border-border/60 px-2.5 py-1 text-[11px] font-semibold text-foreground">
                  Markets · <span className="font-mono font-medium">{trade.ticker}</span>
                </p>
                <div className="flex flex-col gap-1 p-1.5">
                  {trade.meta.map(([label, value]) => (
                    <div
                      key={label}
                      className="flex items-center justify-between rounded-lg border border-border/60 bg-background px-2 py-1 text-[10px]"
                    >
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-medium text-foreground">{value}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MarketsJoinExplainer() {
  const reduce = useReducedMotion();

  return (
    <div className="relative flex h-full min-h-[280px] items-center justify-center overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm">
      <FlickeringGrid
        className="absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]"
        squareSize={3}
        gridGap={5}
        flickerChance={0.16}
        color="rgb(40, 204, 149)"
        maxOpacity={0.2}
      />
      <div className="relative z-10 flex w-full max-w-2xl flex-col items-center gap-5 px-6 py-8">
        <p className="max-w-md text-center text-[13px] leading-relaxed text-muted-foreground">{JOIN_EXPLAINER_COPY}</p>
        <div className="flex w-full flex-col gap-2">
          {SAMPLE.map((market, index) => (
            <div key={market.ticker} className="grid grid-cols-[minmax(0,1fr)_2.5rem_minmax(0,1.15fr)] items-center gap-x-2">
              <div className="rounded-xl border border-[#28CC95]/50 bg-[#28CC95]/10 px-3 py-2 shadow-sm backdrop-blur-md">
                <p className="truncate font-mono text-[10px] text-foreground">{market.ticker}</p>
              </div>
              <div className="relative h-px overflow-hidden bg-border">
                <motion.span
                  className="absolute inset-y-0 left-0 bg-[#28CC95]"
                  initial={reduce ? false : { width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ delay: 0.15 + index * 0.1, duration: 0.4 }}
                />
              </div>
              <motion.div
                className="relative overflow-hidden rounded-xl border border-border/70 bg-background/90 shadow-sm backdrop-blur-md"
                initial={reduce ? false : { opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.28 + index * 0.1, duration: 0.35 }}
              >
                <BorderBeam size={70} duration={8} delay={index * 1.4} borderWidth={1.2} colorFrom={KALSHI} colorTo="#0d99ff" />
                <p className="border-b border-border/60 px-2.5 py-1 text-[11px] font-semibold text-foreground">
                  Trades · <span className="font-mono font-medium">{market.ticker}</span>
                </p>
                <div className="flex flex-col gap-1 p-1.5">
                  {market.fills.map((fill) => (
                    <div
                      key={fill.join("-")}
                      className="flex items-center justify-between rounded-lg border border-border/60 bg-background px-2 py-1 font-mono text-[10px]"
                    >
                      <span className="text-muted-foreground">{fill[0]}</span>
                      <span>{fill[1]}</span>
                      <span>{fill[2]}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Markets points each contract at its trades. Trades points each fill at market metadata. */
export function JoinExplainer({ source = "markets" }) {
  if (source === "trades") return <TradesJoinExplainer />;
  return <MarketsJoinExplainer />;
}
