"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * @param {{
 *   title: string;
 *   onBegin: () => void;
 *   onCancel: () => void;
 *   className?: string;
 * }} props
 */
export function GuidedWorkflowIntro({ title, onBegin, onCancel, className }) {
  return (
    <div
      className={cn(
        "pointer-events-auto w-[min(100vw-2rem,28rem)] rounded-xl border border-border bg-background p-6 shadow-xl",
        className,
      )}
      role="dialog"
      aria-labelledby="guided-intro-title"
      aria-describedby="guided-intro-body"
    >
      <h2 id="guided-intro-title" className="text-lg font-semibold tracking-tight text-foreground">
        Let&apos;s start: {title}
      </h2>
      <p id="guided-intro-body" className="mt-2 text-sm leading-relaxed text-muted-foreground">
        We will guide you through the exact setup, step by step.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" size="sm" onClick={onBegin}>
          Begin
        </Button>
      </div>
    </div>
  );
}
