"use client";

import { cn } from "@/lib/utils";
import { scrollToPricingSection } from "@/lib/scrollToPricing";

export function DemoSignUpBadge({ className }) {
  return (
    <button
      type="button"
      onClick={() => scrollToPricingSection()}
      className={cn(
        "inline-flex max-w-full cursor-pointer items-center rounded-md border border-zinc-400/80 bg-zinc-200/90 px-1.5 py-0.5 text-left text-[9px] font-medium leading-tight text-zinc-900 shadow-sm transition-colors hover:bg-zinc-300/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 sm:text-[10px]",
        className,
      )}
    >
      DEMO: sign up for full access
    </button>
  );
}
