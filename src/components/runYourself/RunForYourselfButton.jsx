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
 *   chartId?: string;
 *   layoutColumnKey?: string;
 *   kind?: "chart" | "dashboard" | "dashboard_chart";
 *   label?: string;
 *   className?: string;
 *   variant?: "chart" | "dashboard";
 * }} props
 */
export function RunForYourselfButton({
  ownerHandle,
  chartSlug,
  dashboardSlug,
  chartId,
  layoutColumnKey,
  kind = chartSlug ? "chart" : dashboardSlug ? "dashboard" : "chart",
  label,
  className,
  variant = "chart",
}) {
  const user = useUser();
  const [authOpen, setAuthOpen] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [notRunnable, setNotRunnable] = useState(false);

  const handle = String(ownerHandle || "").trim();
  const runnable = !!handle && (!!chartSlug || !!dashboardSlug || !!chartId);

  useEffect(() => {
    if (!runnable || !handle) return;
    let cancelled = false;
    const params = new URLSearchParams({ ownerHandle: handle });
    if (chartSlug) params.set("chartSlug", chartSlug);
    if (dashboardSlug) params.set("dashboardSlug", dashboardSlug);
    if (chartId) params.set("chartId", chartId);
    if (kind === "dashboard") params.set("replicateDashboard", "1");

    fetch(`/api/run-yourself/resolve?${params}`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (j?.data?.runnable === false) setNotRunnable(true);
      })
      .catch(() => {});

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
  }, [handle, chartSlug, dashboardSlug, chartId, kind, runnable]);

  const ctx = {
    kind:
      kind === "dashboard_chart"
        ? "dashboard_chart"
        : kind === "dashboard" || (dashboardSlug && !chartSlug && !chartId)
          ? "dashboard"
          : "chart",
    ownerHandle: handle,
    ...(chartSlug ? { chartSlug } : {}),
    ...(dashboardSlug ? { dashboardSlug } : {}),
    ...(chartId ? { chartId } : {}),
    ...(layoutColumnKey ? { layoutColumnKey } : {}),
  };

  const goToTry = useCallback(() => {
    saveRunSourceContext(ctx);
    navigateToRunFlow(buildTryUrlFromContext(ctx));
  }, [ctx]);

  const handleClick = useCallback(() => {
    if (!runnable || notRunnable) return;

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
  }, [user, runnable, notRunnable, goToTry, ctx]);

  if (!runnable) return null;

  const displayLabel =
    label || (variant === "dashboard" ? "Run this dashboard" : "Run for yourself");

  const disabled = notRunnable || (!!user && quotaExceeded && !userHasPaidAccess(user));

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
            <TooltipContent>
              {notRunnable
                ? "This chart uses data that cannot be replayed yet"
                : "Upgrade to Pro to run more analyses"}
            </TooltipContent>
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
