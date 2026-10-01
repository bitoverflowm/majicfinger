"use client";

import { motion, useReducedMotion } from "framer-motion";

import { BorderBeam } from "@/components/magicui/border-beam";
import { FlickeringGrid } from "@/components/ui/flickering-grid";
import { cn } from "@/lib/utils";

const SAMPLE = [
  ["MARKET-A", "63¢", "37¢", "100"],
  ["MARKET-B", "48¢", "52¢", "100"],
  ["MARKET-C", "22¢", "78¢", "100"],
];

export const FUNCTION_EXPLAINER_COPY =
  "Function adds a column to the sheet you pick. Write an equation with the column names, like = Yes Price + No Price.";

function tabClass(selected) {
  return cn(
    "relative -ml-px shrink-0 border border-border/70 px-2 py-1 text-left text-[11px] font-medium leading-none first:ml-0",
    selected ? "z-10 border-[#0d99ff] bg-[#0d99ff]/10 text-[#0d99ff]" : "bg-background text-muted-foreground",
  );
}

export function FunctionExplainerTabs({ sheetTitle = "Markets" }) {
  return (
    <div className="overflow-hidden px-4 pb-1 pt-4">
      <div className="flex">
        <span className={tabClass(true)}>{sheetTitle}</span>
      </div>
    </div>
  );
}

export function FunctionExplainer() {
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
        <p className="max-w-md text-center text-[13px] leading-relaxed text-muted-foreground">{FUNCTION_EXPLAINER_COPY}</p>
        <motion.p
          className="rounded-full border border-[#0d99ff]/30 bg-[#0d99ff]/10 px-3 py-1 font-mono text-[11px] text-[#0d99ff]"
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          = Yes Price + No Price
        </motion.p>
        <div className="flex items-stretch">
          <div className="overflow-hidden rounded-l-xl border border-border/70 bg-background/90 shadow-sm backdrop-blur-md">
            <div className="grid grid-cols-[6.5rem_3.25rem_3.25rem] border-b border-border/60 bg-muted/40 text-[10px] font-semibold text-muted-foreground">
              <span className="px-2.5 py-1.5">Ticker</span>
              <span className="px-2 py-1.5 text-right">Yes</span>
              <span className="px-2 py-1.5 text-right">No</span>
            </div>
            {SAMPLE.map((row) => (
              <div key={row[0]} className="grid grid-cols-[6.5rem_3.25rem_3.25rem] border-b border-border/50 font-mono text-[10px] last:border-b-0">
                <span className="truncate px-2.5 py-1.5 text-foreground">{row[0]}</span>
                <span className="px-2 py-1.5 text-right">{row[1]}</span>
                <span className="px-2 py-1.5 text-right">{row[2]}</span>
              </div>
            ))}
          </div>
          <motion.div
            className="relative overflow-hidden rounded-r-xl border border-[#0d99ff]/50 bg-[#d7ebff] text-[#0b3a66] shadow-sm dark:bg-[#0d99ff]/25 dark:text-[#e8f4ff]"
            initial={reduce ? false : { clipPath: "inset(0 100% 0 0)", opacity: 0 }}
            animate={{ clipPath: "inset(0 0% 0 0)", opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.45, ease: "easeOut" }}
          >
            <BorderBeam size={60} duration={7} borderWidth={1.2} colorFrom="#0d99ff" colorTo="#7cc4ff" />
            <p className="border-b border-[#0d99ff]/30 px-2.5 py-1.5 text-[10px] font-semibold">Yes + No</p>
            {SAMPLE.map((row) => (
              <p key={row[0]} className="border-b border-[#0d99ff]/20 px-2.5 py-1.5 text-right font-mono text-[10px] last:border-b-0">
                {row[3]}
              </p>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
