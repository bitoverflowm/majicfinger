"use client";

import { useCallback, type MouseEvent } from "react";

import { HubCtaButton } from "@/components/hubs/HubCtaButton";
import { trackJourneyEvent } from "@/lib/analytics/journeyClient";
import { getOrCreateVisitorSessionId } from "@/lib/analytics/visitorSession";
import { useUser } from "@/lib/hooks";
import { userHasPaidAccess } from "@/lib/runYourself/hasPaidAccess";
import { sendTelegramAnalyticsEvent } from "@/lib/telegram/client";
import { cn } from "@/lib/utils";

import { useCompareLiveDashboardOptional } from "./CompareLiveDashboardContext";

const PRIMARY =
  "inline-flex h-10 items-center justify-center rounded-full border border-white/[0.12] bg-secondary px-6 text-sm font-medium tracking-wide text-primary-foreground shadow-[inset_0_1px_2px_rgba(255,255,255,0.25),0_3px_3px_-1.5px_rgba(16,24,40,0.06),0_1px_1px_rgba(16,24,40,0.08)] transition-all ease-out hover:bg-secondary/80 active:scale-[0.98] dark:text-secondary-foreground";

const OPEN_DASHBOARD_CTA = {
  href: "#dashboard-preview",
  eventLabel: "open_live_compare_dashboard",
} as const;

function resolveUserState(user: ReturnType<typeof useUser>): "anonymous" | "logged in" | "paid" {
  if (!user) return "anonymous";
  if (userHasPaidAccess(user)) return "paid";
  return "logged in";
}

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
  const user = useUser();

  const trackOpen = useCallback(() => {
    const pagePath = typeof window !== "undefined" ? window.location.pathname || "" : "";
    const sessionId = getOrCreateVisitorSessionId();
    const meta = {
      eventLabel: OPEN_DASHBOARD_CTA.eventLabel,
      buttonText: label,
      href: OPEN_DASHBOARD_CTA.href,
      page: pagePath,
      pagePath,
      destination: OPEN_DASHBOARD_CTA.href,
      userState: resolveUserState(user),
      sessionId,
      referrer: typeof document !== "undefined" ? document.referrer || "" : "",
      userEmail: user?.email,
      isLoggedIn: !!user,
    };
    trackJourneyEvent("hero_cta_click", {
      path: pagePath,
      label: OPEN_DASHBOARD_CTA.eventLabel,
      meta,
    });
    sendTelegramAnalyticsEvent("hero_cta_click", meta, { sessionId });
  }, [label, user]);

  const handleClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      trackOpen();
      dashboard?.openDashboard();
    },
    [dashboard, trackOpen],
  );

  if (!dashboard) {
    return (
      <HubCtaButton
        cta={{
          label,
          href: OPEN_DASHBOARD_CTA.href,
          requiresAuth: false,
          ariaLabel: ariaLabel || label,
          eventLabel: OPEN_DASHBOARD_CTA.eventLabel,
          tracking: {
            destination: OPEN_DASHBOARD_CTA.href,
          },
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
