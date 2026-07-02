"use client";

import { useEffect, useRef } from "react";
import { trackJourneyEvent } from "@/lib/analytics/journeyClient";
import { sendTelegramAnalyticsEvent } from "@/lib/telegram/client";

/**
 * Track when someone opens and leaves a chart, dashboard, or article.
 * Events are batched into the visitor session journey (summary sent at session end).
 * @param {{
 *   contentType: 'chart' | 'dashboard' | 'article';
 *   name?: string | null;
 *   path?: string;
 *   ownerHandle?: string;
 *   enabled?: boolean;
 * }} props
 */
export function useTelegramContentTracker({
  contentType,
  name,
  path,
  ownerHandle,
  enabled = true,
}) {
  const openedAtRef = useRef(null);
  const viewSentRef = useRef(false);
  const leaveSentRef = useRef(false);

  useEffect(() => {
    if (!enabled || !name) return;

    openedAtRef.current = Date.now();

    if (!viewSentRef.current) {
      viewSentRef.current = true;
      const viewPath = path || (typeof window !== "undefined" ? window.location.pathname : undefined);
      trackJourneyEvent("content_view", {
        path: viewPath,
        meta: {
          contentType,
          name,
          ownerHandle,
        },
      });
      sendTelegramAnalyticsEvent("content_view", {
        contentType,
        name,
        path: viewPath,
        ownerHandle,
      });
    }

    const sendLeave = () => {
      if (leaveSentRef.current) return;
      leaveSentRef.current = true;
      const durationSeconds = openedAtRef.current
        ? Math.max(1, Math.round((Date.now() - openedAtRef.current) / 1000))
        : undefined;
      trackJourneyEvent("content_leave", {
        path: path || (typeof window !== "undefined" ? window.location.pathname : undefined),
        meta: {
          contentType,
          name,
          ownerHandle,
          durationSeconds,
        },
      });
      sendTelegramAnalyticsEvent(
        "content_leave",
        {
          contentType,
          name,
          path: path || (typeof window !== "undefined" ? window.location.pathname : undefined),
          ownerHandle,
          durationSeconds,
        },
        { keepalive: true },
      );
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") sendLeave();
    };

    window.addEventListener("pagehide", sendLeave);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("pagehide", sendLeave);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      sendLeave();
    };
  }, [contentType, name, path, ownerHandle, enabled]);
}
