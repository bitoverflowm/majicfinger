"use client";

import { motion, useReducedMotion } from "framer-motion";

import { BorderBeam } from "@/components/magicui/border-beam";
import { FlickeringGrid } from "@/components/ui/flickering-grid";
import { cn } from "@/lib/utils";

const ROWS = [
  ["Dec 1", "10"],
  ["Dec 1", "25"],
  ["Dec 1", "8"],
  ["Dec 1", "4"],
  ["Dec 2", "5"],
  ["Dec 2", "12"],
  ["Dec 2", "3"],
  ["Dec 3", "15"],
  ["Dec 3", "7"],
  ["Dec 3", "6"],
];

const BUCKETS = [
  ["Dec 1", "4", "47"],
  ["Dec 2", "3", "20"],
  ["Dec 3", "3", "28"],
];

function tabClass(selected) {
  return cn(
    "relative -ml-px shrink-0 border border-border/70 px-2 py-1 text-left text-[11px] font-medium leading-none first:ml-0",
    selected ? "z-10 border-[#0d99ff] bg-[#0d99ff]/10 text-[#0d99ff]" : "bg-background text-muted-foreground",
  );
}

export function BucketExplainerTabs({ sheetTitle = "Markets" }) {
  const reduce = useReducedMotion();
  return (
    <div className="overflow-hidden px-4 pb-1 pt-4">
      <div className="flex">
        <span className={tabClass(false)}>{sheetTitle}</span>
        <motion.span
          initial={reduce ? false : { clipPath: "inset(0 100% 0 0)", opacity: 0 }}
          animate={{ clipPath: "inset(0 0% 0 0)", opacity: 1 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className={tabClass(true)}
        >
          Buckets
        </motion.span>
      </div>
    </div>
  );
}

export function BucketExplainer({ measure = "Size" }) {
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
          Bucketing adds a new sheet. Group rows by exact values, numeric ranges, or time intervals, then count, sum, average, min, or max inside each bucket.
        </p>
        <div className="flex items-center gap-3">
          <div className="overflow-hidden rounded-xl border border-border/70 bg-background/90 shadow-sm backdrop-blur-md">
            <div className="grid grid-cols-[4.5rem_3.5rem] border-b border-border/60 bg-muted/40 text-[10px] font-semibold text-muted-foreground">
              <span className="px-2.5 py-1">Date</span>
              <span className="px-2 py-1 text-right">{measure}</span>
            </div>
            {ROWS.map((row, index) => (
              <div key={`${row[0]}-${index}`} className="grid grid-cols-[4.5rem_3.5rem] border-b border-border/50 font-mono text-[10px] last:border-b-0">
                <span className="px-2.5 py-1 text-foreground">{row[0]}</span>
                <span className="px-2 py-1 text-right">{row[1]}</span>
              </div>
            ))}
          </div>
          <motion.div
            className="relative overflow-hidden rounded-xl border border-[#0d99ff]/50 bg-[#d7ebff] text-[#0b3a66] shadow-sm dark:bg-[#0d99ff]/25 dark:text-[#e8f4ff]"
            initial={reduce ? false : { clipPath: "inset(0 100% 0 0)", opacity: 0 }}
            animate={{ clipPath: "inset(0 0% 0 0)", opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.45, ease: "easeOut" }}
          >
            <BorderBeam size={60} duration={7} borderWidth={1.2} colorFrom="#0d99ff" colorTo="#7cc4ff" />
            <p className="border-b border-[#0d99ff]/30 px-2.5 py-1.5 text-[10px] font-semibold">Buckets</p>
            <div className="grid grid-cols-[4.2rem_2.4rem_2.4rem] border-b border-[#0d99ff]/20 text-[10px] font-semibold">
              <span className="px-2.5 py-1">Day</span>
              <span className="px-1 py-1 text-right">Count</span>
              <span className="px-2 py-1 text-right">Sum</span>
            </div>
            {BUCKETS.map((row) => (
              <div key={row[0]} className="grid grid-cols-[4.2rem_2.4rem_2.4rem] border-b border-[#0d99ff]/20 font-mono text-[10px] last:border-b-0">
                <span className="px-2.5 py-1.5">{row[0]}</span>
                <span className="px-1 py-1.5 text-right">{row[1]}</span>
                <span className="px-2 py-1.5 text-right">{row[2]}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
