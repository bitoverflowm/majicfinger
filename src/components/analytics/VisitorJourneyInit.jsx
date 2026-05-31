"use client";

import { useEffect, useRef } from "react";
import { useUser } from "@/lib/hooks";
import {
  endVisitorSession,
  flushJourneyQueue,
  linkVisitorIdentity,
  startVisitorSessionIfNeeded,
} from "@/lib/analytics/journeyClient";

/**
 * Initializes cross-site visitor session tracking for the current tab.
 * Sends session start on domain entry and a journey summary when the tab closes.
 */
export function VisitorJourneyInit() {
  const user = useUser();
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
      endVisitorSession(identityRef.current);
    };

    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      flushJourneyQueue(false);
    };
  }, []);

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
