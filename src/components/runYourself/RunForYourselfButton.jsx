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
  clearRunSourceContext,
  navigateToRunFlow,
  saveRunSourceContext,
} from "@/lib/runYourself/runSourceContext";
import { RunForYourselfAuthModal } from "@/components/runYourself/RunForYourselfAuthModal";
import { trackJourneyEvent } from "@/lib/analytics/journeyClient";
import { sendTelegramAnalyticsEvent } from "@/lib/telegram/client";
import { cn } from "@/lib/utils";

const FORK_PROMO_TITLE = "Fork this analysis";
const FORK_PROMO_DESCRIPTION =
  "Run this same analysis on another Kalshi/ Polymarket market, category, or time period.";

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
 *   presentation?: "button" | "promo";
 *   forceRunnable?: boolean;
 *   displayName?: string;
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
  presentation = "button",
  forceRunnable = false,
  displayName,
}) {
  const user = useUser();
  const [authOpen, setAuthOpen] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [notRunnable, setNotRunnable] = useState(false);

  const handle = String(ownerHandle || "").trim();
  const runnable = !!handle && (!!chartSlug || !!dashboardSlug || !!chartId);
  const useGenericAnalysisFallback = !forceRunnable && notRunnable;

  useEffect(() => {
    if (!runnable || !handle) return;
    let cancelled = false;
    const params = new URLSearchParams({ ownerHandle: handle });
    if (chartSlug) params.set("chartSlug", chartSlug);
    if (dashboardSlug) params.set("dashboardSlug", dashboardSlug);
    if (chartId) params.set("chartId", chartId);
    if (kind === "dashboard") params.set("replicateDashboard", "1");

    if (!forceRunnable) {
      fetch(`/api/run-yourself/resolve?${params}`)
        .then((r) => r.json())
        .then((j) => {
          if (cancelled) return;
          if (j?.data?.runnable === false) setNotRunnable(true);
        })
        .catch(() => {});
    }

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
  }, [handle, chartSlug, dashboardSlug, chartId, kind, runnable, forceRunnable]);

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
    if (useGenericAnalysisFallback) {
      clearRunSourceContext();
      navigateToRunFlow("/try?generic=1");
      return;
    }
    saveRunSourceContext(ctx);
    navigateToRunFlow(buildTryUrlFromContext(ctx));
  }, [ctx, useGenericAnalysisFallback]);

  const handleClick = useCallback(() => {
    if (!runnable) return;

    trackJourneyEvent("fork_click", {
      path: typeof window !== "undefined" ? window.location.pathname : undefined,
      meta: {
        kind: ctx.kind,
        displayName,
        ownerHandle: handle,
        chartSlug,
        dashboardSlug,
        genericAnalysisFallback: useGenericAnalysisFallback,
        isLoggedIn: !!user,
        userEmail: user?.email,
      },
    });

    sendTelegramAnalyticsEvent("fork_click", {
      kind: ctx.kind,
      displayName,
      ownerHandle: handle,
      chartSlug,
      dashboardSlug,
      genericAnalysisFallback: useGenericAnalysisFallback,
      isLoggedIn: !!user,
      userEmail: user?.email,
    });

    if (user && userRunYourselfQuotaExceeded(user) && !userHasPaidAccess(user)) {
      navigateToRunFlow("/#pricing");
      return;
    }

    if (user) {
      goToTry();
      return;
    }

    if (!useGenericAnalysisFallback) {
      saveRunSourceContext(ctx);
    } else {
      clearRunSourceContext();
    }
    setAuthOpen(true);
  }, [
    user,
    runnable,
    goToTry,
    ctx,
    displayName,
    handle,
    chartSlug,
    dashboardSlug,
    useGenericAnalysisFallback,
  ]);

  if (!runnable) return null;

  const displayLabel =
    label ||
    (useGenericAnalysisFallback
      ? "Run your own analysis"
      : variant === "dashboard"
        ? "Run this dashboard"
        : "Run for yourself");

  const disabled =
    !!user && quotaExceeded && !userHasPaidAccess(user);

  const disabledTooltip = useGenericAnalysisFallback
    ? "This legacy chart can't be forked directly yet, but you can run one of the supported analyses."
    : notRunnable
      ? "This chart uses data that cannot be replayed yet"
      : "Upgrade to Pro to run more analyses";

  const goButton = (
    <Button
      type="button"
      size={presentation === "promo" ? "sm" : variant === "dashboard" ? "sm" : "default"}
      className={
        presentation === "promo"
          ? cn("shrink-0 px-5 font-semibold", className)
          : className ||
            (variant === "chart"
              ? "shadow-lg gap-1.5 rounded-full px-4 font-semibold"
              : "gap-1.5 font-semibold")
      }
      onClick={handleClick}
      disabled={disabled}
    >
      {presentation === "promo" ? (
        "Go"
      ) : (
        <>
          <Play className="h-4 w-4 fill-current" aria-hidden />
          {displayLabel}
        </>
      )}
    </Button>
  );

  const trigger = disabled ? (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{goButton}</TooltipTrigger>
        <TooltipContent>{disabledTooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ) : (
    goButton
  );

  return (
    <>
      {presentation === "promo" ? (
        <div className="flex flex-col gap-3 rounded-lg border border-border/70 bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="min-w-0 text-left">
            <p className="text-sm font-medium text-foreground">{FORK_PROMO_TITLE}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              {FORK_PROMO_DESCRIPTION}
            </p>
          </div>
          {trigger}
        </div>
      ) : (
        trigger
      )}
      <RunForYourselfAuthModal
        open={authOpen}
        onOpenChange={setAuthOpen}
        onAuthenticated={goToTry}
      />
    </>
  );
}
