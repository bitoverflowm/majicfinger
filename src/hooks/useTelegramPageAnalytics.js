"use client";

import { useEffect, useRef } from "react";
import { trackJourneyEvent } from "@/lib/analytics/journeyClient";
import { getOrCreateVisitorSessionId } from "@/lib/analytics/visitorSession";
import { extractClickTargetFromEvent } from "@/lib/telegram/extractClickTarget";
import { sendTelegramAnalyticsEvent } from "@/lib/telegram/client";

const CLICK_THROTTLE_MS = 2000;
const CLICK_DEDUPE_MS = 15000;

/**
 * Lightweight page analytics: one view on mount, delegated clicks with throttle/dedupe.
 * @param {{
 *   pageType: 'homepage' | 'hub';
 *   pageName: string;
 *   path: string;
 *   trackClicks?: boolean;
 *   enabled?: boolean;
 * }} opts
 */
export function useTelegramPageAnalytics({
  pageType,
  pageName,
  path,
  trackClicks = false,
  enabled = true,
}) {
  const viewSentRef = useRef(false);
  const lastClickAtRef = useRef(0);
  const recentClickKeysRef = useRef(new Map());

  useEffect(() => {
    if (!enabled || !pageName) return;

    if (!viewSentRef.current) {
      viewSentRef.current = true;
      trackJourneyEvent("page_view", {
        path,
        meta: { pageType, pageName },
      });
      sendTelegramAnalyticsEvent("page_view", { pageType, pageName, path });
    }
  }, [enabled, pageName, pageType, path]);

  useEffect(() => {
    if (!enabled || !trackClicks || !pageName) return;

    const onClick = (event) => {
      const meta = extractClickTargetFromEvent(event);
      if (!meta) return;

      const now = Date.now();
      if (now - lastClickAtRef.current < CLICK_THROTTLE_MS) return;

      const dedupeKey = `${meta.targetType}:${meta.label}:${meta.href || ""}:${meta.section || ""}`;
      const lastSeen = recentClickKeysRef.current.get(dedupeKey) || 0;
      if (now - lastSeen < CLICK_DEDUPE_MS) return;

      lastClickAtRef.current = now;
      recentClickKeysRef.current.set(dedupeKey, now);
      if (recentClickKeysRef.current.size > 200) {
        recentClickKeysRef.current.clear();
      }

      const send = () => {
        trackJourneyEvent("page_click", {
          path,
          label: meta.label,
          meta: {
            pageType,
            pageName,
            label: meta.label,
            targetType: meta.targetType,
            href: meta.href,
            section: meta.section,
          },
        });
        sendTelegramAnalyticsEvent("page_click", {
          pageType,
          pageName,
          path,
          label: meta.label,
          targetType: meta.targetType,
          href: meta.href,
          section: meta.section,
          sessionId: getOrCreateVisitorSessionId(),
        });
      };

      if (typeof window.requestIdleCallback === "function") {
        window.requestIdleCallback(send, { timeout: 1500 });
      } else {
        window.setTimeout(send, 0);
      }
    };

    document.addEventListener("click", onClick, { capture: true, passive: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, [enabled, pageName, pageType, path, trackClicks]);
}
