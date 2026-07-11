"use client";

import { useCallback, useMemo } from "react";
import { usePathname } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

/** Slugs classified as research in `content/lychee-content-registry.json`. */
const RESEARCH_GUIDE_SLUGS = new Set([
  "kalshi-political-prediction-market-accuracy",
  "kalshi-political-prediction-markets-analysis",
  "kalshi-historical-political-prediction-market-accuracy-lifecycle",
  "kalshi-weather-prediction-markets-analysis",
]);

export type KalshiDemoReadingKind = "research" | "guide";

function readingKindFromPathname(pathname: string | null): KalshiDemoReadingKind {
  if (!pathname) return "guide";
  const match = pathname.match(/\/guides\/([^/?#]+)/);
  const slug = match?.[1] ?? "";
  return RESEARCH_GUIDE_SLUGS.has(slug) ? "research" : "guide";
}

function scrollPastDemoSection(sectionId: string) {
  const afterDemo = document.getElementById("article-after-demo");
  if (afterDemo) {
    afterDemo.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  const section = document.getElementById(sectionId);
  if (!section) return;

  const shell = section.parentElement;
  const next = shell?.nextElementSibling;
  if (next instanceof HTMLElement) {
    next.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  section.scrollIntoView({ behavior: "smooth", block: "end" });
}

/**
 * Badge + continue link shown above the Kalshi explorer title on guide/research pages.
 */
export function KalshiExplorerDemoChrome({
  sectionId,
  readingKind: readingKindProp,
  className,
}: {
  sectionId: string;
  readingKind?: KalshiDemoReadingKind;
  className?: string;
}) {
  const pathname = usePathname();
  const readingKind = useMemo(
    () => readingKindProp ?? readingKindFromPathname(pathname),
    [readingKindProp, pathname],
  );

  const continueLabel =
    readingKind === "research"
      ? "Continue reading research"
      : "Continue reading guide";

  const onContinue = useCallback(() => {
    scrollPastDemoSection(sectionId);
  }, [sectionId]);

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center gap-x-4 gap-y-2",
        className,
      )}
    >
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-sky-200/80 bg-sky-50/90",
          "px-2.5 py-1 font-mono text-[0.625rem] font-medium uppercase tracking-wide text-sky-700",
          "dark:border-sky-500/25 dark:bg-sky-500/10 dark:text-sky-300",
        )}
      >
        <Sparkles className="size-3 shrink-0" strokeWidth={2} aria-hidden />
        Optional interactive demo
      </span>
      <button
        type="button"
        onClick={onContinue}
        className={cn(
          "inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors",
          "hover:text-foreground",
        )}
      >
        {continueLabel}
        <ArrowRight className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
      </button>
    </div>
  );
}
