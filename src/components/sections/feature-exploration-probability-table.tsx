"use client";

/* eslint-disable @next/next/no-img-element */
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import { useInView } from "@/components/sections/features/feature-kit";

const MAX_ROWS = 7;
const ADD_INTERVAL_MS = 1600;

const QUESTION_POOL = [
  "Fed cuts before Q4?",
  "BTC above $100k?",
  "ETH ETF approved?",
  "Rain in SF tomorrow?",
  "Team wins division?",
  "Inflation under 3%?",
  "Shutdown averted?",
  "GDP growth > 2%?",
  "Unemployment dips?",
  "Oil below $70?",
];

const VENUES = [
  { name: "Kalshi", logo: "/kalshi.png", tile: "bg-[#28CC95]" },
  { name: "Polymarket", logo: "/polymarket.png", tile: "bg-[#2E5CFF]" },
] as const;

function pickQuestion(used: Set<string>): string {
  const fresh = QUESTION_POOL.filter((q) => !used.has(q));
  const pool = fresh.length > 0 ? fresh : QUESTION_POOL;
  return pool[Math.floor(Math.random() * pool.length)]!;
}

type Row = { id: number; question: string; yes: number; venue: number };

function nextRow(prev: Row[], id: number): Row {
  return {
    id,
    question: pickQuestion(new Set(prev.map((r) => r.question))),
    yes: 4 + Math.floor(Math.random() * 93),
    venue: Math.round(Math.random()),
  };
}

/** Live market rows streaming in, newest on top. */
export function FeatureExplorationProbabilityTable() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, 0.2);
  const [rows, setRows] = useState<Row[]>([]);
  const idRef = useRef(0);

  useEffect(() => {
    if (!inView) return;
    const tick = () => setRows((prev) => [nextRow(prev, ++idRef.current), ...prev].slice(0, MAX_ROWS));
    if (idRef.current === 0) for (let i = 0; i < 4; i++) tick();
    const t = window.setInterval(tick, ADD_INTERVAL_MS);
    return () => window.clearInterval(t);
  }, [inView]);

  return (
    <div ref={ref} className="flex h-full min-h-0 w-full flex-col text-[11px]">
      <div className="grid grid-cols-[1fr_4.5rem_3rem] items-center gap-2 border-b border-border bg-muted px-3 py-1.5 font-mono text-[10px] text-muted-foreground">
        <span>market</span>
        <span className="text-right">yes</span>
        <span className="text-right">no</span>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <AnimatePresence initial={false}>
          {rows.map((r) => {
            const venue = VENUES[r.venue];
            return (
              <motion.div
                key={r.id}
                layout
                initial={{ opacity: 0, y: -10, backgroundColor: "rgba(47,111,237,0.12)" }}
                animate={{ opacity: 1, y: 0, backgroundColor: "rgba(47,111,237,0)" }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45, ease: [0.165, 0.84, 0.44, 1], backgroundColor: { duration: 1.4 } }}
                className="grid grid-cols-[1fr_4.5rem_3rem] items-center gap-2 border-b border-border px-3 py-1.5"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className={`flex size-4 shrink-0 items-center justify-center rounded p-0.5 ${venue.tile}`}>
                    <img src={venue.logo} alt={venue.name} className="size-full object-contain" />
                  </span>
                  <span className="truncate text-primary">{r.question}</span>
                </span>
                <span className="flex items-center justify-end gap-1.5">
                  <span className="h-1 w-6 overflow-hidden rounded-full bg-muted">
                    <span className="block h-full rounded-full bg-[#10b981]" style={{ width: `${r.yes}%` }} />
                  </span>
                  <span className="w-7 text-right font-mono tabular-nums text-[#0f9f6e] dark:text-emerald-400">
                    {r.yes}¢
                  </span>
                </span>
                <span className="text-right font-mono tabular-nums text-[#e5484d] dark:text-red-400">{100 - r.yes}¢</span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
