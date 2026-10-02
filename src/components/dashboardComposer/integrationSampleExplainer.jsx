"use client";

import { motion, useReducedMotion } from "framer-motion";

import { BorderBeam } from "@/components/magicui/border-beam";
import { FlickeringGrid } from "@/components/ui/flickering-grid";

const ROWS = [
  { ticker: "MARKET-A", keep: true },
  { ticker: "MARKET-B", keep: false },
  { ticker: "MARKET-C", keep: true },
  { ticker: "MARKET-D", keep: false },
  { ticker: "MARKET-E", keep: false },
  { ticker: "MARKET-F", keep: true },
];

export function SampleExplainer() {
  const reduce = useReducedMotion();
  return (
    <div className="relative flex h-full min-h-[280px] items-center justify-center overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm">
      <FlickeringGrid
        className="absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]"
        squareSize={3}
        gridGap={5}
        flickerChance={0.16}
        color="rgb(13, 153, 255)"
        maxOpacity={0.18}
      />
      <div className="relative z-10 flex w-full max-w-xl flex-col items-center gap-4 px-6 py-8">
        <p className="max-w-md text-center text-[13px] leading-relaxed text-muted-foreground">
          Random sample asks Athena for a subset of this query. Seeded keeps the same rows on every pull. Unseeded draws a new set each time.
        </p>
        <div className="relative w-full max-w-xs overflow-hidden rounded-xl border border-border/70 bg-background/90 shadow-sm">
          <BorderBeam size={70} duration={8} borderWidth={1.2} colorFrom="#0d99ff" colorTo="#7cc4ff" />
          <div className="grid grid-cols-[1fr_4.5rem] border-b border-border/60 bg-muted/40 text-[10px] font-semibold text-muted-foreground">
            <span className="px-2.5 py-1.5">Ticker</span>
            <span className="px-2 py-1.5 text-right">Sample</span>
          </div>
          {ROWS.map((row, index) => (
            <motion.div
              key={row.ticker}
              className="grid grid-cols-[1fr_4.5rem] border-b border-border/50 font-mono text-[10px] last:border-b-0"
              initial={reduce ? false : { opacity: 1 }}
              animate={{ opacity: row.keep ? 1 : 0.28 }}
              transition={{ delay: 0.15 + index * 0.08, duration: 0.35 }}
            >
              <span className="px-2.5 py-1.5 text-foreground">{row.ticker}</span>
              <span className={row.keep ? "px-2 py-1.5 text-right text-[#0d99ff]" : "px-2 py-1.5 text-right text-muted-foreground"}>
                {row.keep ? "Kept" : ""}
              </span>
            </motion.div>
          ))}
        </div>
        <div className="flex gap-2 text-[11px] font-medium">
          <span className="rounded-full border border-[#0d99ff]/40 bg-[#0d99ff]/10 px-2.5 py-1 text-[#0d99ff]">Seeded</span>
          <span className="rounded-full border border-border/70 px-2.5 py-1 text-muted-foreground">Unseeded</span>
        </div>
      </div>
    </div>
  );
}
