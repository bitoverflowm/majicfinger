"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { BorderBeam } from "@/components/magicui/border-beam";
import { FlickeringGrid } from "@/components/ui/flickering-grid";
import { cn } from "@/lib/utils";

const KALSHI = "#28CC95";

const FALLBACK_MARKETS = [
  { ticker: "KXNBA-25-IND", title: "Indiana Pacers win the NBA Finals" },
  { ticker: "PRES-2024-DJT", title: "Republican wins the Presidency" },
  { ticker: "KXMAYORNYC-25-D", title: "Democrat wins the NYC Mayor race" },
];

const SAMPLE_FILLS = [
  { time: "14:02", side: "Yes", price: "63¢", count: "120" },
  { time: "14:02", side: "No", price: "37¢", count: "40" },
  { time: "14:01", side: "Yes", price: "62¢", count: "15" },
];

/**
 * Hover explanation for Join. Plays in the preview pane.
 * One market you kept becomes its own trades sheet.
 */
export function JoinExplainer({ markets }) {
  const reduce = useReducedMotion();
  const rows = (markets || []).slice(0, 3);
  const shown = rows.length ? rows : FALLBACK_MARKETS;
  const [step, setStep] = useState(reduce ? 2 : 0);

  useEffect(() => {
    if (reduce) return undefined;
    const timer = window.setInterval(() => setStep((current) => (current + 1) % 3), 1700);
    return () => window.clearInterval(timer);
  }, [reduce]);

  const active = shown[Math.min(step, shown.length - 1)] || shown[0];

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
        <div className="flex w-full items-center justify-center gap-3 sm:gap-5">
          <div className="w-[46%] max-w-[240px] overflow-hidden rounded-xl border border-border/70 bg-background/85 shadow-sm backdrop-blur-md">
            <p className="border-b border-border/60 px-3 py-1.5 text-[11px] font-semibold text-foreground">Markets you kept</p>
            <div className="flex flex-col gap-1 p-2">
              {shown.map((market, index) => {
                const on = step >= 1 ? market.ticker === active.ticker : index === 0;
                return (
                  <div
                    key={market.ticker}
                    className={cn(
                      "rounded-lg border px-2 py-1.5 transition-colors duration-300",
                      on ? "border-[#28CC95]/50 bg-[#28CC95]/10" : "border-border/70 bg-background/70",
                    )}
                  >
                    <p className="truncate font-mono text-[10px] text-foreground">{market.ticker}</p>
                    <p className="truncate text-[10px] text-muted-foreground">{market.title}</p>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="relative h-px w-10 shrink-0 overflow-hidden bg-border sm:w-16">
            <motion.span
              className="absolute inset-y-0 left-0 bg-[#28CC95]"
              initial={false}
              animate={{ width: step >= 1 ? "100%" : "0%" }}
              transition={{ duration: 0.45 }}
            />
          </div>
          <div className="relative w-[46%] max-w-[240px]">
            <AnimatePresence mode="wait">
              {step >= 2 || reduce ? (
                <motion.div
                  key={active.ticker}
                  initial={reduce ? false : { opacity: 0, x: 16, scale: 0.96 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.35 }}
                  className="overflow-hidden rounded-xl border border-border/70 bg-background/90 shadow-sm backdrop-blur-md"
                >
                  <BorderBeam size={80} duration={7} borderWidth={1.2} colorFrom={KALSHI} colorTo="#0d99ff" />
                  <p className="border-b border-border/60 px-3 py-1.5 text-[11px] font-semibold text-foreground">
                    Trades · <span className="font-mono font-medium">{active.ticker}</span>
                  </p>
                  <div className="flex flex-col gap-1 p-2">
                    {SAMPLE_FILLS.map((fill, index) => (
                      <motion.div
                        key={`${active.ticker}-${index}`}
                        initial={reduce ? false : { opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.08, duration: 0.25 }}
                        className="flex items-center justify-between rounded-lg border border-border/60 bg-background px-2 py-1 font-mono text-[10px]"
                      >
                        <span className="text-muted-foreground">{fill.time}</span>
                        <span>{fill.side}</span>
                        <span>{fill.price}</span>
                        <span className="text-muted-foreground">{fill.count}</span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="waiting"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex h-[148px] items-center justify-center rounded-xl border border-dashed border-border/80 bg-background/50 text-[11px] text-muted-foreground"
                >
                  A trades sheet per market
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        <p className="max-w-md text-center text-[13px] leading-relaxed text-muted-foreground">
          Each market you kept gets its own trades sheet. The market table stays as it is.
        </p>
      </div>
    </div>
  );
}
