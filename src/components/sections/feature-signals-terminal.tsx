"use client";

/* eslint-disable @next/next/no-img-element */
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import { useInView } from "@/components/sections/features/feature-kit";
import { pickTweetSamples, type TweetSample } from "@/lib/feature-signals-tweets";
import { cn } from "@/lib/utils";

const MAX_VISIBLE = 4;
const ADD_INTERVAL_MS = 2200;

type FeatureSignalsTerminalProps = {
  className?: string;
};

/** Social posts streaming in from X, newest on top. */
export function FeatureSignalsTerminal({ className }: FeatureSignalsTerminalProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, 0.2);
  const [pool] = useState(() => pickTweetSamples(12, Math.floor(Math.random() * 0x7fffffff)));
  const [shown, setShown] = useState<{ id: number; tweet: TweetSample }[]>([]);
  const [connected, setConnected] = useState(false);
  const next = useRef(0);

  useEffect(() => {
    if (!inView) return;
    const add = () => {
      const id = next.current++;
      setShown((s) => [{ id, tweet: pool[id % pool.length]! }, ...s].slice(0, MAX_VISIBLE));
    };
    const connect = window.setTimeout(() => {
      setConnected(true);
      if (next.current === 0) add();
    }, connected ? 0 : 900);
    const t = window.setInterval(add, ADD_INTERVAL_MS);
    return () => {
      window.clearTimeout(connect);
      window.clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, pool]);

  return (
    <div ref={ref} className={cn("flex h-full min-h-0 w-full flex-col", className)}>
      <div className="flex items-center gap-2 border-b border-border px-3 py-2 text-[10.5px]">
        <span className="flex size-4 items-center justify-center overflow-hidden rounded bg-black p-0.5">
          <img src="/landing/logos/x.png" alt="X" className="size-full object-contain" />
        </span>
        <span className="font-medium text-primary">Signals from X</span>
        <span
          className={cn(
            "ml-auto inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-medium transition-colors",
            connected ? "bg-[#10b981]/10 text-[#0f9f6e]" : "bg-[#2f6fed]/10 text-[#2f6fed]",
          )}
        >
          <span className={cn("size-1.5 rounded-full", connected ? "bg-[#10b981]" : "animate-pulse bg-[#2f6fed]")} />
          {connected ? "Streaming · 41ms" : "Connecting…"}
        </span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden p-2">
        <AnimatePresence initial={false}>
          {shown.map(({ id, tweet }) => (
            <motion.div
              key={id}
              layout
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45, ease: [0.165, 0.84, 0.44, 1] }}
              className="flex gap-2 rounded-lg border border-border bg-background p-2"
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-primary">
                {tweet.author.charAt(0)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-1 text-[10.5px]">
                  <span className="truncate font-medium text-primary">{tweet.author}</span>
                  <span className="truncate text-muted-foreground">@{tweet.handle}</span>
                </span>
                <span className="mt-0.5 line-clamp-2 block text-[11px] leading-snug text-primary">{tweet.text}</span>
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
