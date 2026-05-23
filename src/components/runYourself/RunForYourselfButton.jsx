"use client";

import { useCallback, useEffect, useState } from "react";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useUser } from "@/lib/hooks";
import { isRunnablePublicChart, isRunnablePublicDashboard } from "@/config/runYourselfAnalyses";
import { userHasPaidAccess, userRunYourselfQuotaExceeded } from "@/lib/runYourself/hasPaidAccess";
import {
  buildTryUrlFromContext,
  navigateToRunFlow,
  saveRunSourceContext,
} from "@/lib/runYourself/runSourceContext";
import { RunForYourselfAuthModal } from "@/components/runYourself/RunForYourselfAuthModal";

/**
 * @param {{
 *   ownerHandle: string;
 *   chartSlug?: string;
 *   dashboardSlug?: string;
 *   kind?: "chart" | "dashboard";
 *   label?: string;
 *   className?: string;
 *   variant?: "chart" | "dashboard";
 *   forceRunnable?: boolean;
 * }} props
 */
export function RunForYourselfButton({
  ownerHandle,
  chartSlug,
  dashboardSlug,
  kind = chartSlug ? "chart" : "dashboard",
  label,
  className,
  variant = "chart",
  forceRunnable = false,
}) {
  const user = useUser();
  const [authOpen, setAuthOpen] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  const slug = chartSlug || dashboardSlug || "";
  const runnable =
    forceRunnable ||
    (chartSlug ? isRunnablePublicChart(ownerHandle, chartSlug) : false) ||
    (dashboardSlug ? isRunnablePublicDashboard(ownerHandle, dashboardSlug) : false);

  useEffect(() => {
    if (!runnable || !ownerHandle || !slug) return;
    let cancelled = false;
    const params = new URLSearchParams({
      ownerHandle,
      ...(chartSlug ? { chartSlug } : { dashboardSlug: dashboardSlug || slug }),
    });
    fetch(`/api/run-yourself/eligibility?${params}`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (j?.quotaExceeded) setQuotaExceeded(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [ownerHandle, slug, chartSlug, dashboardSlug, runnable]);

  const ctx = {
    kind: kind === "dashboard" || dashboardSlug ? "dashboard" : "chart",
    ownerHandle,
    ...(chartSlug ? { chartSlug } : {}),
    ...(dashboardSlug ? { dashboardSlug } : {}),
  };

  const goToTry = useCallback(() => {
    saveRunSourceContext(ctx);
    navigateToRunFlow(buildTryUrlFromContext(ctx));
  }, [ctx]);

  const handleClick = useCallback(() => {
    if (!runnable) return;

    if (user && userRunYourselfQuotaExceeded(user) && !userHasPaidAccess(user)) {
      navigateToRunFlow("/#pricing");
      return;
    }

    if (user) {
      goToTry();
      return;
    }

    saveRunSourceContext(ctx);
    setAuthOpen(true);
  }, [user, runnable, goToTry, ctx]);

  if (!runnable) return null;

  const displayLabel =
    label || (variant === "dashboard" ? "Run this dashboard" : "Run for yourself");

  const disabled = !!user && quotaExceeded && !userHasPaidAccess(user);

  const button = (
    <Button
      type="button"
      size={variant === "dashboard" ? "sm" : "default"}
      className={
        className ||
        (variant === "chart"
          ? "shadow-lg gap-1.5 rounded-full px-4 font-semibold"
          : "gap-1.5 font-semibold")
      }
      onClick={handleClick}
      disabled={disabled}
    >
      <Play className="h-4 w-4 fill-current" aria-hidden />
      {displayLabel}
    </Button>
  );

  return (
    <>
      {disabled ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>{button}</TooltipTrigger>
            <TooltipContent>Upgrade to Pro to run more analyses</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        button
      )}
      <RunForYourselfAuthModal
        open={authOpen}
        onOpenChange={setAuthOpen}
        onAuthenticated={goToTry}
      />
    </>
  );
}
