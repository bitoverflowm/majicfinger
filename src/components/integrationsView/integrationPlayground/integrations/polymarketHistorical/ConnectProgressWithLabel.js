"use client";

import { Field, FieldLabel } from "@/components/ui/field";
import { Progress } from "@/components/ui/progress";

const PROGRESS_ID = "progress-polymarket-historical-connect";

export function ConnectProgressWithLabel({ label, progress }) {
  const pct = Math.min(100, Math.max(0, Number(progress) || 0));
  return (
    <Field className="w-full max-w-full">
      <FieldLabel htmlFor={PROGRESS_ID} className="text-xs font-medium">
        <span className="min-w-0 flex-1 truncate text-left">{label}</span>
        <span className="ml-auto shrink-0 tabular-nums text-muted-foreground">{Math.round(pct)}%</span>
      </FieldLabel>
      <Progress value={pct} id={PROGRESS_ID} className="h-2" />
    </Field>
  );
}

/** Alias matching the Field + Progress + label pattern from the design system. */
export const ProgressWithLabel = ConnectProgressWithLabel;
