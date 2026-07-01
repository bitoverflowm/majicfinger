"use client";

import { NumberTicker } from "@/components/magicui/number-ticker";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { HubProofMetric, HubProofMetricsSection } from "@/types/hub";

const METRIC_CELL_CLASS =
  "group relative flex min-h-28 w-full flex-col items-center justify-center border-border p-4 text-center before:absolute before:-left-1 before:top-0 before:z-10 before:h-screen before:w-px before:bg-border before:content-[''] max-md:[&:nth-child(n+3)]:border-t";

function ProofMetricValue({
  metric,
  size,
}: {
  metric: HubProofMetric;
  size: "primary" | "trust";
}) {
  const valueClass =
    size === "primary"
      ? "text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
      : "text-xl font-semibold tracking-tight text-foreground/90 sm:text-2xl";

  if (metric.static) {
    return (
      <p className={cn(valueClass, "max-w-[12rem] text-balance leading-tight tabular-nums")}>
        {metric.value}
      </p>
    );
  }

  const decimalPlaces = metric.decimalPlaces ?? 0;

  return (
    <p className={cn(valueClass, "tabular-nums leading-none")} aria-label={metric.value}>
      <NumberTicker
        value={metric.tickerValue ?? 0}
        decimalPlaces={decimalPlaces}
        className="text-inherit"
      />
      {metric.suffix ? <span>{metric.suffix}</span> : null}
    </p>
  );
}

function ProofMetricCell({
  metric,
  size,
}: {
  metric: HubProofMetric;
  size: "primary" | "trust";
}) {
  const isPrimary = size === "primary";

  return (
    <div className={METRIC_CELL_CLASS}>
      <ProofMetricValue metric={metric} size={size} />
      <p
        className={cn(
          "mt-2 max-w-[11rem] text-balance leading-snug",
          isPrimary
            ? "text-sm text-muted-foreground"
            : "text-xs text-muted-foreground/90 sm:text-sm",
        )}
      >
        {metric.label}
      </p>
    </div>
  );
}

export function HubProofMetrics({ section }: { section: HubProofMetricsSection }) {
  return (
    <section className="relative z-20 w-full bg-background px-6 pb-12 pt-10 md:pb-16 md:pt-12">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-6 md:gap-7">
        <div className="grid w-full grid-cols-2 items-center justify-center overflow-hidden border-y border-border md:grid-cols-4">
          {section.primaryMetrics.map((metric) => (
            <ProofMetricCell key={`${metric.value}-${metric.label}`} metric={metric} size="primary" />
          ))}
        </div>

        {section.trustMetrics.length > 0 ? (
          <div className="grid w-full max-w-2xl grid-cols-2 items-center justify-center overflow-hidden border-y border-border sm:max-w-3xl">
            {section.trustMetrics.map((metric) => (
              <ProofMetricCell key={`${metric.value}-${metric.label}`} metric={metric} size="trust" />
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          {section.capabilityPills.map((pill) => (
            <Badge
              key={pill}
              variant="outline"
              className="border-border/60 bg-background/70 px-3 py-1 text-xs font-normal text-muted-foreground shadow-none"
            >
              {pill}
            </Badge>
          ))}
        </div>
      </div>
    </section>
  );
}
