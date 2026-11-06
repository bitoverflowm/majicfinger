"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useUser } from "@/lib/hooks";
import {
  endVisitorSession,
  flushJourneyQueue,
  linkVisitorIdentity,
  startVisitorSessionIfNeeded,
  trackJourneyEvent,
} from "@/lib/analytics/journeyClient";
import { inferPageNameFromPath, inferPageTypeFromPath } from "@/lib/analytics/sessionStartMeta";

/**
 * Initializes cross-site visitor session tracking for the current tab.
 * Sends session start on domain entry and a journey summary when the tab closes.
 */
export function VisitorJourneyInit() {
  const user = useUser();
  const pathname = usePathname();
  const lastViewedPathRef = useRef(null);
  const linkedEmailRef = useRef(null);
  const identityRef = useRef({ isLoggedIn: false, email: undefined, userId: undefined });

  useEffect(() => {
    identityRef.current = {
      isLoggedIn: !!user,
      email: user?.email,
      userId: user?._id || user?.userId,
    };
  }, [user]);

  useEffect(() => {
    startVisitorSessionIfNeeded(identityRef.current);

    const onPageHide = () => {
      endVisitorSession({ ...identityRef.current, exitReason: "pagehide" });
    };

    // Flush queued steps when the tab backgrounds so a later kill still has them saved.
    // Do not end the session here — switching tabs briefly would cut the journey short.
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushJourneyQueue(false, identityRef.current);
      }
    };

    window.addEventListener("pagehide", onPageHide);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      flushJourneyQueue(false);
    };
  }, []);

  // One page_view per route so the session summary can show the full page path.
  useEffect(() => {
    if (!pathname || lastViewedPathRef.current === pathname) return;
    lastViewedPathRef.current = pathname;
    trackJourneyEvent("page_view", {
      path: pathname,
      meta: {
        pageType: inferPageTypeFromPath(pathname),
        pageName: inferPageNameFromPath(pathname),
      },
    });
  }, [pathname]);

  useEffect(() => {
    if (!user?.email) return;
    if (linkedEmailRef.current === user.email) return;
    linkedEmailRef.current = user.email;
    linkVisitorIdentity({
      email: user.email,
      userId: user._id || user.userId,
      isLoggedIn: true,
    });
  }, [user]);

  return null;
}
