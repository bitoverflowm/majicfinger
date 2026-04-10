"use client";

import { useEffect, useRef, useState } from "react";

const MAX_ROWS = 8;
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

function pickQuestion(used: Set<string>): string {
  const fresh = QUESTION_POOL.filter((q) => !used.has(q));
  const pool = fresh.length > 0 ? fresh : QUESTION_POOL;
  return pool[Math.floor(Math.random() * pool.length)]!;
}

function randomSplit(): { yes: number; no: number } {
  const yes = Math.floor(Math.random() * 101);
  return { yes, no: 100 - yes };
}

type Row = { id: number; question: string; yes: number; no: number };

export function FeatureExplorationProbabilityTable() {
  const [rows, setRows] = useState<Row[]>([]);
  const idRef = useRef(0);

  useEffect(() => {
    const tick = () => {
      setRows((prev) => {
        const used = new Set(prev.map((r) => r.question));
        const nextRow: Row = {
          id: ++idRef.current,
          question: pickQuestion(used),
          ...randomSplit(),
        };
        if (prev.length < MAX_ROWS) return [...prev, nextRow];
        return [...prev.slice(1), nextRow];
      });
    };
    tick();
    const t = window.setInterval(tick, ADD_INTERVAL_MS);
    return () => window.clearInterval(t);
  }, []);

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden p-1 pt-6 md:p-2 md:pt-7">
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full border-collapse text-left text-[10px] md:text-xs">
          <thead>
            <tr className="border-b border-border/80">
              <th
                scope="col"
                className="pb-1.5 pr-2 font-medium text-muted-foreground"
              >
                will x happen?
              </th>
              <th
                scope="col"
                className="w-[3.75rem] pb-1.5 pr-2 text-right font-medium text-muted-foreground md:w-[4.5rem]"
              >
                yes
              </th>
              <th
                scope="col"
                className="w-[3.75rem] pb-1.5 text-right font-medium text-muted-foreground md:w-[4.5rem]"
              >
                no
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className="border-b border-border/40 last:border-b-0"
              >
                <td className="py-1 pr-2 font-medium text-foreground">
                  {r.question}
                </td>
                <td className="py-1 pr-2 text-right tabular-nums font-medium text-emerald-600 dark:text-emerald-400">
                  {r.yes}%
                </td>
                <td className="py-1 text-right tabular-nums font-medium text-red-600 dark:text-red-400">
                  {r.no}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
