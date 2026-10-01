"use client";

import { motion, useReducedMotion } from "framer-motion";

import { BorderBeam } from "@/components/magicui/border-beam";
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

function tabClass(selected) {
  return cn(
    "relative -ml-px shrink-0 border border-border/70 px-2 py-1 text-left text-[11px] font-medium leading-none first:ml-0",
    selected ? "z-10 border-[#0d99ff] bg-[#0d99ff]/10 text-[#0d99ff]" : "bg-background text-muted-foreground",
  );
}

/** The tab that appears while Join is hovered. It is not a real sheet. */
export function JoinExplainerTabs() {
  const reduce = useReducedMotion();
  return (
    <div className="overflow-hidden px-4 pb-1 pt-4">
      <div className="flex">
        <span className={tabClass(false)}>Markets</span>
        <motion.span
          initial={reduce ? false : { clipPath: "inset(0 100% 0 0)", opacity: 0 }}
          animate={{ clipPath: "inset(0 0% 0 0)", opacity: 1 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className={tabClass(true)}
        >
          Trades
        </motion.span>
      </div>
    </div>
  );
}

/**
 * Hover explanation for Join. Plays inside the new Trades tab.
 * Every market cell points at its own trades table. Nothing here is queried.
 */
export function JoinExplainer() {
  const reduce = useReducedMotion();

  return (
    <div className="relative flex h-full min-h-[280px] flex-col justify-center overflow-hidden rounded-xl border border-border/70 bg-background px-5 py-6 shadow-sm">
      <BorderBeam size={90} duration={8} borderWidth={1.2} colorFrom={KALSHI} colorTo="#0d99ff" />
      <p className="relative z-10 max-w-xl text-[13px] leading-relaxed text-muted-foreground">{JOIN_EXPLAINER_COPY}</p>
      <div className="relative z-10 mt-5">
        <div className="mb-1.5 grid grid-cols-[minmax(0,8.5rem)_2rem_minmax(0,1fr)] gap-x-0">
          <p className="text-[11px] font-semibold text-foreground">Markets</p>
          <span />
          <p className="text-[11px] font-semibold text-foreground">Trades tables</p>
        </div>
        <div className="flex flex-col">
          {SAMPLE.map((market, index) => (
            <div key={market.ticker} className="grid grid-cols-[minmax(0,8.5rem)_2rem_minmax(0,1fr)] items-stretch">
              <div
                className={cn(
                  "flex min-h-[52px] items-center border-x border-b border-border/70 bg-background px-2",
                  index === 0 && "border-t",
                )}
              >
                <span className="truncate font-mono text-[11px] text-foreground">{market.ticker}</span>
              </div>
              <div className="flex items-center">
                <motion.span
                  className="h-px w-full origin-left bg-[#28CC95]"
                  initial={reduce ? false : { scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.15 + index * 0.1, duration: 0.35 }}
                />
              </div>
              <motion.div
                className="mb-1.5 overflow-hidden border border-border/70 bg-background"
                initial={reduce ? false : { opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.28 + index * 0.1, duration: 0.3 }}
              >
                <p className="border-b border-border/60 px-2 py-1 text-[11px] font-semibold text-foreground">
                  Trades · <span className="font-mono font-medium">{market.ticker}</span>
                </p>
                {market.fills.map((fill) => (
                  <div
                    key={fill.join("-")}
                    className="flex items-center justify-between px-2 py-0.5 font-mono text-[10px] text-muted-foreground"
                  >
                    <span>{fill[0]}</span>
                    <span className="text-foreground">{fill[1]}</span>
                    <span>{fill[2]}</span>
                  </div>
                ))}
              </motion.div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
