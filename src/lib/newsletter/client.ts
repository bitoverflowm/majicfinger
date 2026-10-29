"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useUser } from "@/lib/hooks";
import { parseNewsletterEmail } from "@/lib/newsletter/validate";

export type NewsletterSource = "popup" | "inline" | "footer";

const SUBSCRIBED_KEY = "lychee:newsletter:subscribed";
const DISMISSED_KEY = "lychee:newsletter:popup-dismissed";
const CHANGE_EVENT = "lychee:newsletter-change";
/** `?newsletter=preview` shows every capture surface regardless of login or saved state. */
const PREVIEW_PARAM = "newsletter";

function readFlag(key: string) {
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function writeFlag(key: string) {
  try {
    window.localStorage.setItem(key, "1");
  } catch {
    /* storage blocked: state just won't persist */
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export const markNewsletterSubscribed = () => writeFlag(SUBSCRIBED_KEY);
export const markNewsletterPopupDismissed = () => writeFlag(DISMISSED_KEY);

export function isNewsletterPreview() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get(PREVIEW_PARAM) === "preview";
}

type NewsletterState = {
  /** False until login state and saved flags are known; render nothing before then. */
  ready: boolean;
  /** Anonymous visitor who hasn't subscribed on this device. */
  eligible: boolean;
  popupDismissed: boolean;
  preview: boolean;
};

export function useNewsletterState(): NewsletterState {
  const user = useUser();
  const [flags, setFlags] = useState<{ subscribed: boolean; dismissed: boolean; preview: boolean } | null>(null);

  useEffect(() => {
    const sync = () =>
      setFlags({
        subscribed: readFlag(SUBSCRIBED_KEY),
        dismissed: readFlag(DISMISSED_KEY),
        preview: isNewsletterPreview(),
      });
    sync();
    const onStorage = (e: StorageEvent) => {
      if (e.key === SUBSCRIBED_KEY || e.key === DISMISSED_KEY) sync();
    };
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  if (!flags) return { ready: false, eligible: false, popupDismissed: false, preview: false };
  if (flags.preview) return { ready: true, eligible: true, popupDismissed: false, preview: true };
  if (user === undefined) return { ready: false, eligible: false, popupDismissed: flags.dismissed, preview: false };
  return { ready: true, eligible: !user && !flags.subscribed, popupDismissed: flags.dismissed, preview: false };
}

export type SubmitStatus = "idle" | "submitting" | "success" | "error";

const ERROR_COPY: Record<string, string> = {
  invalid_email: "Enter a valid email address.",
  rate_limited: "Too many attempts. Try again in a few minutes.",
  network: "Couldn't reach Lychee. Check your connection and try again.",
  default: "Something went wrong. Please try again.",
};

export type EmailCapture = ReturnType<typeof useEmailCapture>;

/** Posts an email to one of the capture endpoints (which share validation, honeypot and timing checks). */
export function useEmailCapture(endpoint: string, extra: Record<string, string>, onSaved?: (email: string) => void) {
  const startedAt = useRef(0);
  const extraRef = useRef(extra);
  extraRef.current = extra;
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  const submit = useCallback(
    async (rawEmail: string, honeypot: string) => {
      if (status === "submitting") return;
      const email = parseNewsletterEmail(rawEmail);
      if (!email) {
        setStatus("error");
        setError(ERROR_COPY.invalid_email);
        return;
      }
      setStatus("submitting");
      setError(null);
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            ...extraRef.current,
            email,
            path: window.location.pathname,
            website: honeypot,
            elapsedMs: Date.now() - startedAt.current,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.ok) {
          setStatus("error");
          setError(ERROR_COPY[data?.error] ?? ERROR_COPY.default);
          return;
        }
        setStatus("success");
        onSavedRef.current?.(email);
      } catch {
        setStatus("error");
        setError(ERROR_COPY.network);
      }
    },
    [endpoint, status],
  );

  const clearError = useCallback(() => {
    if (status === "error") {
      setStatus("idle");
      setError(null);
    }
  }, [status]);

  return { status, error, submit, clearError };
}

export function useNewsletterSubmit(source: NewsletterSource) {
  return useEmailCapture("/api/newsletter/subscribe", { source }, markNewsletterSubscribed);
}
