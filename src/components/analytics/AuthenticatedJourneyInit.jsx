"use client";

import { useEffect, useRef } from "react";
import {
  endAuthenticatedSession,
  ensureAuthenticatedSession,
  pauseAuthSessionTracking,
  resumeAuthSessionTracking,
  trackAuthError,
  updateAuthSessionIdentity,
} from "@/lib/analytics/authJourneyClient";
import { useAuthWorkspaceDwell } from "@/hooks/useAuthWorkspaceDwell";

/**
 * Initializes authenticated user session tracking in the dashboard.
 * Tracks integration clicks, dwell time, queries, and errors with 5-min chain updates.
 */
export function AuthenticatedJourneyInit({ user }) {
  const identityRef = useRef({ email: undefined, userId: undefined });

  useEffect(() => {
    identityRef.current = {
      email: user?.email,
      userId: user?._id || user?.userId,
    };
    updateAuthSessionIdentity(identityRef.current);
  }, [user]);

  useEffect(() => {
    if (!user?.email && !user?.userId) return;
    ensureAuthenticatedSession({
      email: user.email,
      userId: user._id || user.userId,
    });
  }, [user]);

  useAuthWorkspaceDwell();

  useEffect(() => {
    let lastErrorAt = 0;
    let hiddenEndTimer = null;

    const shouldReportError = (message) => {
      if (!message || message === "Script error.") return false;
      const now = Date.now();
      if (now - lastErrorAt < 5000) return false;
      lastErrorAt = now;
      return true;
    };

    const onError = (event) => {
      const message = event.message || "Uncaught error";
      if (!shouldReportError(message)) return;
      trackAuthError({
        message,
        source: event.filename ? `${event.filename}:${event.lineno}` : "window.error",
        stack: event.error?.stack,
      });
    };

    const onRejection = (event) => {
      const reason = event.reason;
      const message = reason?.message || String(reason ?? "Unhandled rejection");
      if (!shouldReportError(message)) return;
      trackAuthError({
        message,
        source: "unhandledrejection",
        stack: reason?.stack,
      });
    };

    const endSession = () => {
      endAuthenticatedSession(identityRef.current);
    };

    const onPageHide = () => {
      endSession();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        pauseAuthSessionTracking();
        hiddenEndTimer = window.setTimeout(() => {
          endSession();
        }, 3 * 60 * 1000);
        return;
      }

      if (hiddenEndTimer) {
        clearTimeout(hiddenEndTimer);
        hiddenEndTimer = null;
      }
      resumeAuthSessionTracking();
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    window.addEventListener("pagehide", onPageHide);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (hiddenEndTimer) {
        clearTimeout(hiddenEndTimer);
      }
      endSession();
    };
  }, []);

  return null;
}
