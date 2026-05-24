"use client";

import { useEffect, useRef } from "react";
import { sendTelegramAnalyticsEvent } from "@/lib/telegram/client";

/**
 * Track when someone opens and leaves a chart, dashboard, or article.
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
  const sessionIdRef = useRef(null);
  const openedAtRef = useRef(null);
  const viewSentRef = useRef(false);
  const leaveSentRef = useRef(false);

  useEffect(() => {
    if (!enabled || !name) return;

    if (!sessionIdRef.current) {
      sessionIdRef.current =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `sess-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
    openedAtRef.current = Date.now();

    if (!viewSentRef.current) {
      viewSentRef.current = true;
      sendTelegramAnalyticsEvent("content_view", {
        contentType,
        name,
        path: path || (typeof window !== "undefined" ? window.location.pathname : undefined),
        ownerHandle,
      });
    }

    const sendLeave = () => {
      if (leaveSentRef.current) return;
      leaveSentRef.current = true;
      const durationSeconds = openedAtRef.current
        ? Math.max(1, Math.round((Date.now() - openedAtRef.current) / 1000))
        : undefined;
      sendTelegramAnalyticsEvent(
        "content_leave",
        {
          contentType,
          name,
          path: path || (typeof window !== "undefined" ? window.location.pathname : undefined),
          ownerHandle,
          durationSeconds,
        },
        { sessionId: sessionIdRef.current, keepalive: true },
      );
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") sendLeave();
    };

    window.addEventListener("pagehide", sendLeave);
    window.addEventListener("beforeunload", sendLeave);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("pagehide", sendLeave);
      window.removeEventListener("beforeunload", sendLeave);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      sendLeave();
    };
  }, [contentType, name, path, ownerHandle, enabled]);
}
