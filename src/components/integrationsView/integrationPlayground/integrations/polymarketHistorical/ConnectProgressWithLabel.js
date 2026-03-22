"use client";

import { useId } from "react";

import { Field, FieldLabel } from "@/components/ui/field";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export function ConnectProgressWithLabel({ label, progress, className }) {
  const id = useId();
  const pct = Math.min(100, Math.max(0, Number(progress) || 0));

  return (
    <Field className={cn("w-full min-w-0 max-w-full overflow-hidden", className)}>
      <div className="w-full min-w-0 max-w-full space-y-1.5 overflow-hidden">
        <FieldLabel
          htmlFor={id}
          className="!flex w-full min-w-0 max-w-full flex-col items-stretch gap-1 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between sm:gap-x-2 sm:gap-y-1"
        >
          <span className="min-w-0 max-w-full whitespace-normal break-words text-left text-xs font-medium leading-snug">
            {label}
          </span>
          <span className="shrink-0 tabular-nums text-xs text-muted-foreground sm:ml-auto">{Math.round(pct)}%</span>
        </FieldLabel>
        <Progress value={pct} id={id} className="h-2 w-full min-w-0 max-w-full shrink-0" />
      </div>
    </Field>
  );
}

/** Alias matching the Field + Progress + label pattern from the design system. */
export const ProgressWithLabel = ConnectProgressWithLabel;
