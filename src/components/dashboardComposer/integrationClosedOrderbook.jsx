"use client";

import { motion, useReducedMotion } from "framer-motion";

import { BorderBeam } from "@/components/magicui/border-beam";
import { FlickeringGrid } from "@/components/ui/flickering-grid";
import { POLYMARKET_CLOSED_ORDERBOOK_MESSAGE } from "@/components/dashboardComposer/polymarketLiveBuild";

const LEVELS = [
  { side: "Buy", price: "0.42", size: "1,240" },
  { side: "Buy", price: "0.41", size: "860" },
  { side: "Sell", price: "0.58", size: "640" },
  { side: "Sell", price: "0.59", size: "410" },
];

export function ClosedOrderbookExplainer() {
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
          {POLYMARKET_CLOSED_ORDERBOOK_MESSAGE}
        </p>
        <div className="relative w-full max-w-xs overflow-hidden rounded-xl border border-border/70 bg-background/90 shadow-sm">
          <BorderBeam size={70} duration={8} borderWidth={1.2} colorFrom="#0d99ff" colorTo="#7cc4ff" />
          <div className="grid grid-cols-[3.2rem_1fr_4rem] border-b border-border/60 bg-muted/40 text-[10px] font-semibold text-muted-foreground">
            <span className="px-2.5 py-1.5">Side</span>
            <span className="px-2 py-1.5 text-right">Price</span>
            <span className="px-2.5 py-1.5 text-right">Size</span>
          </div>
          {LEVELS.map((level, index) => (
            <motion.div
              key={`${level.side}-${level.price}`}
              className="grid grid-cols-[3.2rem_1fr_4rem] border-b border-border/50 font-mono text-[10px] last:border-b-0"
              initial={false}
              animate={reduce ? { opacity: 0.28 } : { opacity: [1, 1, 0.22, 0.22, 1] }}
              transition={
                reduce
                  ? { duration: 0 }
                  : { duration: 4.8, repeat: Infinity, delay: index * 0.08, ease: "easeInOut", times: [0, 0.35, 0.55, 0.82, 1] }
              }
            >
              <span className="px-2.5 py-1.5 text-foreground">{level.side}</span>
              <span className="px-2 py-1.5 text-right text-foreground">{level.price}</span>
              <span className="px-2.5 py-1.5 text-right text-muted-foreground">{level.size}</span>
            </motion.div>
          ))}
        </div>
        <motion.span
          className="rounded-full border border-[#0d99ff]/40 bg-[#0d99ff]/10 px-2.5 py-1 text-[11px] font-medium text-[#0d99ff]"
          initial={false}
          animate={reduce ? { opacity: 1, y: 0 } : { opacity: [0, 0, 1, 1, 0], y: [4, 4, 0, 0, 4] }}
          transition={
            reduce
              ? { duration: 0 }
              : { duration: 4.8, repeat: Infinity, ease: "easeInOut", times: [0, 0.35, 0.55, 0.82, 1] }
          }
        >
          Closed
        </motion.span>
      </div>
    </div>
  );
}
