"use client";

import { NumberTicker } from "@/components/magicui/number-ticker";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { HubProofMetric, HubProofMetricsSection } from "@/types/hub";

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
      : "text-lg font-semibold tracking-tight text-foreground/90 sm:text-xl";

  if (metric.static) {
    return (
      <p className={cn(valueClass, "tabular-nums leading-none text-balance")}>{metric.value}</p>
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

function ProofMetricCard({
  metric,
  size,
}: {
  metric: HubProofMetric;
  size: "primary" | "trust";
}) {
  const isPrimary = size === "primary";

  return (
    <div
      className={cn(
        "rounded-lg border shadow-none",
        isPrimary
          ? "border-border/70 bg-background/85 backdrop-blur-sm"
          : "border-border/50 bg-muted/30",
      )}
    >
      <div className={cn(isPrimary ? "p-4 sm:p-5" : "p-3.5 sm:p-4")}>
        <ProofMetricValue metric={metric} size={size} />
        <p
          className={cn(
            "mt-2 leading-snug",
            isPrimary
              ? "text-sm text-muted-foreground"
              : "text-xs text-muted-foreground/90 sm:text-sm",
          )}
        >
          {metric.label}
        </p>
      </div>
    </div>
  );
}

export function HubProofMetrics({ section }: { section: HubProofMetricsSection }) {
  return (
    <section className="relative z-10 w-full px-6 pb-12 md:pb-16">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 md:gap-7">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          {section.primaryMetrics.map((metric) => (
            <ProofMetricCard key={`${metric.value}-${metric.label}`} metric={metric} size="primary" />
          ))}
        </div>

        <div className="mx-auto grid w-full max-w-lg grid-cols-2 gap-3 sm:max-w-xl md:max-w-2xl">
          {section.trustMetrics.map((metric) => (
            <ProofMetricCard key={`${metric.value}-${metric.label}`} metric={metric} size="trust" />
          ))}
        </div>

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
