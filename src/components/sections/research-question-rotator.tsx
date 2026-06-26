"use client";

import { MorphingText } from "@/components/magicui/morphing-text";
import { DemoScrollLink } from "./demo-scroll-link";
import { ResearchQuestionBadge } from "./research-question-badge";
import { researchQuestions } from "@/lib/research-questions";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useMemo, useState } from "react";

const badgeContainerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.12,
    },
  },
  exit: {
    transition: {
      staggerChildren: 0.04,
      staggerDirection: -1,
    },
  },
};

const badgeVariants = {
  hidden: {
    opacity: 0,
    y: 14,
    scale: 0.92,
    filter: "blur(6px)",
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: {
      type: "spring",
      stiffness: 380,
      damping: 26,
      mass: 0.75,
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    scale: 0.96,
    filter: "blur(4px)",
    transition: {
      duration: 0.22,
      ease: [0.4, 0, 0.2, 1],
    },
  },
};

export function ResearchQuestionRotator() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const questions = useMemo(
    () => researchQuestions.map((item) => item.question),
    [],
  );

  const item = researchQuestions[index];
  const RotatorLink = item.status === "coming_soon" ? DemoScrollLink : Link;

  return (
    <div
      className="mx-auto w-full max-w-3xl px-2 pt-4 sm:px-4"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setPaused(false);
        }
      }}
    >
      <p className="mb-2 text-center text-[9px] font-normal tracking-[0.2em] text-muted-foreground sm:text-xs">
        Find Signal In The Noise
      </p>

      <RotatorLink
        href={item.href}
        aria-label={item.question}
        className={cn(
          "group flex w-full flex-col items-center rounded-sm",
          "transition-colors hover:text-primary/90",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        )}
      >
        <div className="flex w-full flex-col items-center gap-1">
          <MorphingText
            texts={questions}
            morphTime={1.2}
            cooldownTime={3.8}
            paused={paused}
            onIndexChange={setIndex}
            trailingArrow
            className="min-h-[2.5rem] text-balance text-lg font-semibold tracking-tight text-primary sm:min-h-[2.625rem]"
          />

          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              className="flex flex-wrap items-center justify-center gap-2.5"
              variants={badgeContainerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              aria-live="polite"
            >
              {item.badges.map((badge) => (
                <motion.div key={`${index}-${badge}`} variants={badgeVariants}>
                  <ResearchQuestionBadge label={badge} />
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </RotatorLink>
    </div>
  );
}
