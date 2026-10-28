"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Check, Gift, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { markNewsletterPopupDismissed, useNewsletterState } from "@/lib/newsletter/client";
import { NewsletterPreview } from "./newsletter-preview";
import { NEWSLETTER_SUCCESS, NewsletterField } from "./newsletter-signup";

/** Visible (foreground-tab) time on the site before the popup appears. Carries across pages in a session. */
const ENGAGED_MS_BEFORE_POPUP = 45_000;
const ENGAGED_KEY = "lychee:newsletter:engaged-ms";
const TICK_MS = 1000;
const PREVIEW_DELAY_MS = 1200;

/** App and transactional routes where an interruption would get in the way. */
const BLOCKED_PREFIXES = ["/dashboard", "/login", "/checkout", "/try", "/easy", "/search", "/embeds", "/privacy", "/terms", "/dataUse"];

function isBlockedPath(pathname: string | null) {
  if (!pathname) return true;
  return BLOCKED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function readEngagedMs() {
  try {
    return Number(window.sessionStorage.getItem(ENGAGED_KEY)) || 0;
  } catch {
    return 0;
  }
}

function writeEngagedMs(ms: number) {
  try {
    window.sessionStorage.setItem(ENGAGED_KEY, String(ms));
  } catch {
    /* ignore */
  }
}

function anotherDialogOpen() {
  return !!document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]');
}

export function NewsletterPopup() {
  const pathname = usePathname();
  const { ready, eligible, popupDismissed, preview } = useNewsletterState();
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(false);
  const [done, setDone] = useState(false);
  const blocked = !preview && isBlockedPath(pathname);
  const armed = ready && eligible && !popupDismissed && !blocked && !shown;

  useEffect(() => {
    if (!armed) return;
    const show = () => {
      setShown(true);
      setOpen(true);
    };
    if (preview) {
      const id = window.setTimeout(show, PREVIEW_DELAY_MS);
      return () => window.clearTimeout(id);
    }
    let engaged = readEngagedMs();
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      engaged += TICK_MS;
      writeEngagedMs(engaged);
      if (engaged >= ENGAGED_MS_BEFORE_POPUP && !anotherDialogOpen()) {
        window.clearInterval(id);
        show();
      }
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [armed, preview]);

  const close = useCallback(() => {
    setOpen(false);
    if (!preview) markNewsletterPopupDismissed();
  }, [preview]);

  const markDone = useCallback(() => setDone(true), []);

  if (!open) return null;

  return (
    <DialogPrimitive.Root open onOpenChange={(next) => (next ? null : close())}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[80] bg-black/55 backdrop-blur-[3px] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:duration-300" />
        <DialogPrimitive.Content
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="fixed inset-0 z-[80] m-auto grid h-fit max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[50rem] overflow-y-auto rounded-2xl border border-border bg-background font-sans text-foreground shadow-2xl outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.97] data-[state=open]:duration-300 sm:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)]"
        >
          <NewsletterPreview className="hidden sm:flex sm:min-h-[30rem] sm:border-r" />

          <div className="relative flex flex-col p-6 sm:p-8">
            <DialogPrimitive.Close
              aria-label="Close"
              className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-4" />
            </DialogPrimitive.Close>

            {done ? (
              <div role="status" className="flex flex-1 flex-col justify-center py-6 animate-in fade-in-0 duration-500">
                <span className="flex size-10 items-center justify-center rounded-full bg-[#10b981] text-white">
                  <Check className="size-5" strokeWidth={3} />
                </span>
                <DialogPrimitive.Title className="mt-5 text-2xl font-medium leading-tight tracking-tight text-primary sm:text-[1.75rem]">
                  {NEWSLETTER_SUCCESS.title}
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-[0.9375rem]">
                  {NEWSLETTER_SUCCESS.body}
                </DialogPrimitive.Description>
                <button
                  type="button"
                  onClick={close}
                  className="mt-7 self-start rounded-full border border-border bg-muted px-5 py-2 text-sm text-primary transition-colors hover:bg-accent"
                >
                  Back to Lychee
                </button>
              </div>
            ) : (
              <>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Lychee updates</p>
                <DialogPrimitive.Title className="mt-3 pr-6 text-2xl font-medium leading-tight tracking-tight text-primary sm:text-[1.75rem]">
                  Get more out of prediction market data.
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-[0.9375rem]">
                  Get new Kalshi and Polymarket research, practical guides, educational content and the latest Lychee
                  features in your inbox. Plus subscriber offers.
                </DialogPrimitive.Description>

                <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-dashed border-orange-500/60 px-3 py-2.5 text-sm text-primary">
                  <Gift className="mt-0.5 size-4 shrink-0 text-orange-500" />
                  <span>Something’s coming for Black Friday. Subscribers get the first look.</span>
                </div>

                <div className="mt-6">
                  <NewsletterField
                    source="popup"
                    layout="stacked"
                    placeholder="Enter your email"
                    buttonLabel="Keep me in the loop"
                    onSuccess={markDone}
                  />
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={close}
                    className="rounded-md text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Not now
                  </button>
                  <span className="text-xs text-muted-foreground">Unsubscribe anytime.</span>
                </div>
              </>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
