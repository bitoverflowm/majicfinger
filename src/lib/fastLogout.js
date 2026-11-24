import { mutate } from "swr";
import { endAuthenticatedSession } from "@/lib/analytics/authJourneyClient";
import { mutateUser } from "@/lib/hooks";

/**
 * Clear the session and leave the app quickly.
 * Does not wait on Magic remote logout — the API clears the cookie first.
 */
export async function fastLogout({ email, userId, liveStreamStop } = {}) {
  try {
    liveStreamStop?.();
  } catch {
    /* ignore */
  }
  endAuthenticatedSession({ email, userId });
  void mutate("/api/user", null, { revalidate: false });

  const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = ctrl ? window.setTimeout(() => ctrl.abort(), 1200) : 0;
  try {
    await fetch("/api/logout", {
      method: "POST",
      credentials: "include",
      signal: ctrl?.signal,
      headers: { Accept: "application/json" },
    });
  } catch {
    // Cookie may already be cleared; still leave the app.
  } finally {
    if (timer) window.clearTimeout(timer);
  }

  void mutateUser();
  window.location.assign("/");
}
