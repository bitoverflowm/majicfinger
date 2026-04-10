"use client";

import { useState } from "react";

import { AnimatedSpan, Terminal, TypingAnimation } from "@/components/ui/terminal";
import { pickTweetSamples } from "@/lib/feature-signals-tweets";
import { cn } from "@/lib/utils";

type FeatureSignalsTerminalProps = {
  className?: string;
};

export function FeatureSignalsTerminal({ className }: FeatureSignalsTerminalProps) {
  const [tweets] = useState(() =>
    pickTweetSamples(6, Math.floor(Math.random() * 0x7fffffff)),
  );

  return (
    <Terminal
      sequence
      startOnView
      className={cn("min-h-0 text-left", className)}
    >
      <TypingAnimation className="text-foreground">
        {"> initializing connection to X"}
      </TypingAnimation>

      <AnimatedSpan className="text-emerald-600 dark:text-emerald-400">
        ✔ Resolver: stream.twitter.com · API v2 · gzip
      </AnimatedSpan>

      <TypingAnimation className="text-muted-foreground">
        {"> PING upstream keepalive…"}
      </TypingAnimation>

      <AnimatedSpan className="text-emerald-600 dark:text-emerald-400">
        ← PONG received · session 7f3a…e21d · RTT 41ms
      </AnimatedSpan>

      {tweets.map((t, idx) => (
        <AnimatedSpan key={idx} className="text-xs leading-snug">
          <span className="font-medium text-sky-600 dark:text-sky-400">@{t.handle}</span>
          <span className="text-muted-foreground"> · {t.at}</span>
          <span className="mt-0.5 block text-foreground">{t.text}</span>
        </AnimatedSpan>
      ))}
    </Terminal>
  );
}
