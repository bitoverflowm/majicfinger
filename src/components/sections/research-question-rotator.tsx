"use client";

import { MorphingText } from "@/components/magicui/morphing-text";
import {
  getResearchQuestionCta,
  researchQuestions,
} from "@/lib/research-questions";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useMemo, useState } from "react";

const badgeClassName =
  "inline-flex items-center rounded-full border border-primary/15 bg-white/35 px-3 py-1 text-xs font-normal text-primary dark:border-white/15 dark:bg-white/[0.06] dark:text-foreground";

export function ResearchQuestionRotator() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const questions = useMemo(
    () => researchQuestions.map((item) => item.question),
    [],
  );

  const item = researchQuestions[index];

  return (
    <div
      className="mx-auto w-full max-w-3xl px-2 pt-2 sm:px-4"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setPaused(false);
        }
      }}
    >
      <p className="mb-5 text-center text-[9px] font-normal tracking-[0.2em] text-muted-foreground sm:text-xs">
        Find Signal In The Noise
      </p>

      <div className="flex flex-col items-center gap-4" aria-live="polite">
        <MorphingText
          texts={questions}
          morphTime={1.2}
          cooldownTime={3.8}
          paused={paused}
          onIndexChange={setIndex}
          className="min-h-[3.25rem] text-balance text-lg font-semibold tracking-tight text-primary sm:min-h-[3.5rem] sm:text-xl"
        />

        <div className="flex flex-wrap items-center justify-center gap-2">
          {item.badges.map((badge) => (
            <span key={badge} className={badgeClassName}>
              {badge}
            </span>
          ))}
        </div>

        <Link
          href={item.href}
          className={cn(
            "text-sm font-medium text-primary transition-colors",
            "hover:text-primary/75",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:rounded-sm",
          )}
        >
          {getResearchQuestionCta(item)}
        </Link>
      </div>
    </div>
  );
}
