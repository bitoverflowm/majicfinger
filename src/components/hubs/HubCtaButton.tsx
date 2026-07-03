"use client";

import Link from "next/link";
import { useCallback, type MouseEvent } from "react";
import { trackJourneyEvent } from "@/lib/analytics/journeyClient";
import { scrollToHashSection } from "@/lib/scrollToHashSection";
import { getOrCreateVisitorSessionId } from "@/lib/analytics/visitorSession";
import { useUser } from "@/lib/hooks";
import { userHasPaidAccess } from "@/lib/runYourself/hasPaidAccess";
import { sendTelegramAnalyticsEvent } from "@/lib/telegram/client";
import type { HubCta } from "@/types/hub";

type HubCtaButtonProps = {
  cta: HubCta;
  variant?: "primary" | "secondary";
};

function resolveUserState(user: ReturnType<typeof useUser>): "anonymous" | "logged in" | "paid" {
  if (!user) return "anonymous";
  if (userHasPaidAccess(user)) return "paid";
  return "logged in";
}

export function HubCtaButton({ cta, variant = "primary" }: HubCtaButtonProps) {
  const user = useUser();

  const className =
    variant === "primary"
      ? "inline-flex h-10 items-center justify-center rounded-full border border-white/[0.12] bg-secondary px-6 text-sm font-medium tracking-wide text-primary-foreground shadow-[inset_0_1px_2px_rgba(255,255,255,0.25),0_3px_3px_-1.5px_rgba(16,24,40,0.06),0_1px_1px_rgba(16,24,40,0.08)] transition-all ease-out hover:bg-secondary/80 active:scale-[0.98] dark:text-secondary-foreground"
      : "inline-flex h-10 items-center justify-center rounded-full border border-border bg-background px-6 text-sm font-medium tracking-wide text-foreground transition-all ease-out hover:bg-muted active:scale-[0.98]";

  const handleClick = useCallback(
    (e: MouseEvent<HTMLAnchorElement>) => {
      if (cta.href.startsWith("#") && cta.href.length > 1) {
        e.preventDefault();
        scrollToHashSection(cta.href);
      }

      if (!cta.eventLabel) return;

      const pagePath =
        typeof window !== "undefined"
          ? window.location.pathname || cta.tracking?.page || ""
          : cta.tracking?.page || "";
      const sessionId = getOrCreateVisitorSessionId();
      const referrer = typeof document !== "undefined" ? document.referrer || "" : "";
      const userState = resolveUserState(user);

      const meta = {
        eventLabel: cta.eventLabel,
        buttonText: cta.label,
        href: cta.href,
        page: cta.tracking?.page || pagePath,
        pagePath,
        destination: cta.tracking?.destination || cta.href,
        userState,
        sessionId,
        referrer,
        userEmail: user?.email,
        isLoggedIn: !!user,
      };

      trackJourneyEvent("hero_cta_click", {
        path: pagePath,
        label: cta.eventLabel,
        meta,
      });

      sendTelegramAnalyticsEvent("hero_cta_click", meta, { sessionId });
    },
    [cta, user],
  );

  return (
    <Link
      href={cta.href}
      className={className}
      prefetch={false}
      aria-label={cta.ariaLabel || cta.label}
      onClick={handleClick}
    >
      {cta.label}
    </Link>
  );
}
