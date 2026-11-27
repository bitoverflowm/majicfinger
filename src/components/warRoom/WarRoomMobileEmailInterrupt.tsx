"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Check, Gift, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { markNewsletterPopupDismissed, useNewsletterState } from "@/lib/newsletter/client";
import { NEWSLETTER_SUCCESS, NewsletterField } from "@/components/newsletter/newsletter-signup";

/**
 * After the visitor spins the globe / taps a ping for a few seconds, interrupt
 * with the same high-converting newsletter form used by NewsletterPopup.
 */
export const WAR_ROOM_MOBILE_EMAIL_DELAY_MS = 4_000;

const INTERRUPT_KEY = "lychee:war-room-mobile:email-interrupt";

/**
 * Wait only for *other* capture/upsell dialogs — the War Room detail sheet may stay open
 * underneath (this interrupt uses a higher z-index).
 */
function blockingDialogOpen() {
  const nodes = document.querySelectorAll('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]');
  for (const node of nodes) {
    // War Room mobile detail sheet — not a blocker.
    if (node.querySelector?.("[data-war-room-theme]")) continue;
    // Our own interrupt while remounting.
    if (node.getAttribute("data-war-room-email-interrupt") === "1") continue;
    return true;
  }
  return false;
}

function readShown() {
  try {
    return window.sessionStorage.getItem(INTERRUPT_KEY) === "1";
  } catch {
    return false;
  }
}

function writeShown() {
  try {
    window.sessionStorage.setItem(INTERRUPT_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function WarRoomMobileEmailInterrupt({
  armed,
  delayMs = WAR_ROOM_MOBILE_EMAIL_DELAY_MS,
}: {
  /** True once the visitor has interacted with the mobile globe (spin / ping). */
  armed: boolean;
  delayMs?: number;
}) {
  const { ready, eligible, popupDismissed, preview } = useNewsletterState();
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(false);
  const [done, setDone] = useState(false);
  const canArm = ready && eligible && !popupDismissed && !shown && (preview || armed);

  useEffect(() => {
    if (!canArm) return;
    if (!preview && readShown()) {
      setShown(true);
      return;
    }

    let cancelled = false;
    let retryId = 0;
    const tryShow = () => {
      if (cancelled) return;
      if (blockingDialogOpen()) {
        retryId = window.setTimeout(tryShow, 500);
        return;
      }
      setShown(true);
      setOpen(true);
      if (!preview) {
        writeShown();
        markNewsletterPopupDismissed();
      }
    };
    const id = window.setTimeout(tryShow, delayMs);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
      window.clearTimeout(retryId);
    };
  }, [canArm, delayMs, preview]);

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
          data-war-room-email-interrupt="1"
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="fixed inset-0 z-[80] m-auto flex h-fit max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[26rem] flex-col overflow-y-auto rounded-2xl border border-border bg-background font-sans text-foreground shadow-2xl outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.97] data-[state=open]:duration-300"
        >
          <div className="relative flex flex-col p-6">
            <DialogPrimitive.Close
              aria-label="Close"
              className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-4" />
            </DialogPrimitive.Close>

            {done ? (
              <div role="status" className="flex flex-1 flex-col justify-center py-4 animate-in fade-in-0 duration-500">
                <span className="flex size-10 items-center justify-center rounded-full bg-[#10b981] text-white">
                  <Check className="size-5" strokeWidth={3} />
                </span>
                <DialogPrimitive.Title className="mt-5 text-2xl font-medium leading-tight tracking-tight text-primary">
                  {NEWSLETTER_SUCCESS.title}
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {NEWSLETTER_SUCCESS.body}
                </DialogPrimitive.Description>
                <button
                  type="button"
                  onClick={close}
                  className="mt-7 self-start rounded-full border border-border bg-muted px-5 py-2 text-sm text-primary transition-colors hover:bg-accent"
                >
                  Back to War Room
                </button>
              </div>
            ) : (
              <>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Lychee updates</p>
                <DialogPrimitive.Title className="mt-3 pr-6 text-2xl font-medium leading-tight tracking-tight text-primary">
                  Get more out of prediction market data.
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="mt-3 text-sm leading-relaxed text-muted-foreground">
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
