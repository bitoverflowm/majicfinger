"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { useTelegramPageAnalytics } from "@/hooks/useTelegramPageAnalytics";
import { resolveHubAnalyticsFromPath } from "@/lib/hubs/analyticsManifest";

/**
 * Tracks homepage + hub marketing pages via one client component in the marketing layout.
 * New hubs in HUB_REGISTRY are picked up automatically for view tracking.
 */
export function TelegramMarketingTracker() {
  const pathname = usePathname() || "/";

  const config = useMemo(() => {
    if (pathname === "/" || pathname === "") {
      return {
        pageType: "homepage" as const,
        pageName: "Lychee homepage",
        path: "/",
        trackClicks: true,
        enabled: true,
      };
    }

    const hub = resolveHubAnalyticsFromPath(pathname);
    if (hub) {
      return {
        pageType: "hub" as const,
        pageName: hub.name,
        path: hub.path,
        trackClicks: true,
        enabled: true,
      };
    }

    return { enabled: false, pageType: "homepage" as const, pageName: "", path: "", trackClicks: false };
  }, [pathname]);

  useTelegramPageAnalytics(config);
  return null;
}
