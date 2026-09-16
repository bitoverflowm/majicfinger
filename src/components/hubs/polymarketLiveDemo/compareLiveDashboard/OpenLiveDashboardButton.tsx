"use client";

import { useCallback, type MouseEvent } from "react";

import { HubCtaButton } from "@/components/hubs/HubCtaButton";
import { cn } from "@/lib/utils";

import { useCompareLiveDashboardOptional } from "./CompareLiveDashboardContext";

const PRIMARY =
  "inline-flex h-10 items-center justify-center rounded-full border border-white/[0.12] bg-secondary px-6 text-sm font-medium tracking-wide text-primary-foreground shadow-[inset_0_1px_2px_rgba(255,255,255,0.25),0_3px_3px_-1.5px_rgba(16,24,40,0.06),0_1px_1px_rgba(16,24,40,0.08)] transition-all ease-out hover:bg-secondary/80 active:scale-[0.98] dark:text-secondary-foreground";

export function OpenLiveDashboardButton({
  label,
  ariaLabel,
  className,
}: {
  label: string;
  ariaLabel?: string;
  className?: string;
}) {
  const dashboard = useCompareLiveDashboardOptional();

  const handleClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      dashboard?.openDashboard();
    },
    [dashboard],
  );

  if (!dashboard) {
    return (
      <HubCtaButton
        cta={{
          label,
          href: "#dashboard-preview",
          requiresAuth: false,
          ariaLabel: ariaLabel || label,
        }}
        variant="primary"
      />
    );
  }

  return (
    <button
      type="button"
      className={cn(PRIMARY, className)}
      aria-label={ariaLabel || label}
      onClick={handleClick}
    >
      {label}
    </button>
  );
}
