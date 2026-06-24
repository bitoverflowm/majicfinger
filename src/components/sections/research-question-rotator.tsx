"use client";

import {
  getResearchQuestionCta,
  researchQuestions,
  type ResearchQuestion,
} from "@/lib/research-questions";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

const ROTATE_MIN_MS = 4000;
const ROTATE_MAX_MS = 6000;

function randomRotateDelay() {
  return ROTATE_MIN_MS + Math.random() * (ROTATE_MAX_MS - ROTATE_MIN_MS);
}

const slideVariants = {
  enter: {
    opacity: 0,
    y: 10,
    filter: "blur(6px)",
  },
  center: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
  },
  exit: {
    opacity: 0,
    y: -10,
    filter: "blur(6px)",
  },
};

const badgeClassName =
  "inline-flex items-center rounded-full border border-border/70 bg-background/55 px-2.5 py-0.5 text-xs font-medium text-foreground/85 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-background/35 dark:text-foreground/90";

function QuestionSlide({ item }: { item: ResearchQuestion }) {
  const cta = getResearchQuestionCta(item);

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-balance text-center text-xl font-medium leading-snug tracking-tight text-primary sm:text-2xl md:text-[1.65rem] md:leading-tight">
        {item.question}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
        {item.badges.map((badge) => (
          <span key={badge} className={badgeClassName}>
            {badge}
          </span>
        ))}
      </div>

      <Link
        href={item.href}
        className={cn(
          "text-sm font-medium text-foreground/80 underline-offset-4 transition-colors",
          "hover:text-primary hover:underline",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:rounded-sm",
        )}
      >
        {cta}
      </Link>
    </div>
  );
}

export function ResearchQuestionRotator() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const advance = useCallback(() => {
    setIndex((current) => (current + 1) % researchQuestions.length);
  }, []);

  useEffect(() => {
    if (paused || researchQuestions.length <= 1) return;

    timeoutRef.current = setTimeout(advance, randomRotateDelay());

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [advance, index, paused]);

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
      <p className="mb-4 text-center text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
        Explore research questions
      </p>

      <div
        className="relative min-h-[9.5rem] sm:min-h-[8.75rem]"
        aria-live="polite"
        aria-atomic="true"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={item.question}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              duration: 0.55,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="absolute inset-x-0 top-0"
          >
            <QuestionSlide item={item} />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
