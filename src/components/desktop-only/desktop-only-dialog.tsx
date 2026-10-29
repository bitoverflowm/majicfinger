"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Check, Laptop, SquareTerminal, X } from "lucide-react";
import { useEffect, useState } from "react";

import { EmailCaptureField } from "@/components/newsletter/newsletter-signup";
import { DESKTOP_ONLY_EVENT } from "@/lib/desktopOnly";
import { useUser } from "@/lib/hooks";
import { useEmailCapture } from "@/lib/newsletter/client";

const REQUESTED_KEY = "lychee:desktop-link:email";

function readRequestedEmail() {
  try {
    return window.localStorage.getItem(REQUESTED_KEY);
  } catch {
    return null;
  }
}

function saveRequestedEmail(email: string) {
  try {
    window.localStorage.setItem(REQUESTED_KEY, email);
  } catch {
    /* storage blocked: the form just shows again next time */
  }
}

/** Shown instead of the live demo when someone hits "Try For Free" on a phone or small tablet. */
export function DesktopOnlyDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(DESKTOP_ONLY_EVENT, show);
    return () => window.removeEventListener(DESKTOP_ONLY_EVENT, show);
  }, []);

  if (!open) return null;
  return <DesktopOnlyContent onClose={() => setOpen(false)} />;
}

function DesktopOnlyContent({ onClose }: { onClose: () => void }) {
  const user = useUser();
  const [doneEmail, setDoneEmail] = useState<string | null>(() => readRequestedEmail());

  return (
    <DialogPrimitive.Root open onOpenChange={(next) => (next ? null : onClose())}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[90] bg-black/50 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:duration-300" />
        <DialogPrimitive.Content
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="fixed inset-0 z-[90] m-auto h-fit max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[26rem] overflow-y-auto rounded-2xl border border-border bg-background font-sans text-foreground shadow-2xl outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.97] data-[state=open]:duration-300"
        >
          <BiggerScreenArt />

          <DialogPrimitive.Close
            aria-label="Close"
            className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full bg-background/80 text-muted-foreground transition-colors hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-4" />
          </DialogPrimitive.Close>

          <div className="p-6">
            {user ? (
              <>
                <Eyebrow />
                <DialogPrimitive.Title className="mt-3 text-[1.375rem] font-medium leading-tight tracking-tight text-primary">
                  Pick up at your desk.
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                  Lychee needs a laptop or desktop screen. You’re signed in, so open lycheedata.com there and your
                  workspace will be waiting.
                </DialogPrimitive.Description>
                <CloseButton onClose={onClose} label="Got it" />
              </>
            ) : doneEmail ? (
              <div role="status" className="animate-in fade-in-0 duration-500">
                <span className="flex size-9 items-center justify-center rounded-full bg-[#10b981] text-white">
                  <Check className="size-[1.125rem]" strokeWidth={3} />
                </span>
                <DialogPrimitive.Title className="mt-4 text-[1.375rem] font-medium leading-tight tracking-tight text-primary">
                  We’ll send it over.
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                  Look for an email from Lychee at <span className="font-medium text-primary">{doneEmail}</span>. Open
                  the link on your laptop or desktop to start exploring.
                </DialogPrimitive.Description>
                <div className="mt-6 flex items-center justify-between gap-3">
                  <CloseButton onClose={onClose} label="Keep browsing" inline />
                  <button
                    type="button"
                    onClick={() => setDoneEmail(null)}
                    className="rounded-md text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Use a different email
                  </button>
                </div>
              </div>
            ) : (
              <>
                <Eyebrow />
                <DialogPrimitive.Title className="mt-3 text-[1.375rem] font-medium leading-tight tracking-tight text-primary">
                  Lychee needs a bit more room.
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                  Sheets, charts, and live terminals don’t fit on a phone yet. Leave your email and we’ll send you a
                  link to open Lychee on your laptop or desktop.
                </DialogPrimitive.Description>
                <div className="mt-5">
                  <DesktopLinkForm onSaved={setDoneEmail} />
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <CloseButton onClose={onClose} label="Keep browsing" inline />
                  <span className="text-xs text-muted-foreground">Just the link. No spam.</span>
                </div>
              </>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function DesktopLinkForm({ onSaved }: { onSaved: (email: string) => void }) {
  const capture = useEmailCapture("/api/desktop-link/request", {}, (email) => {
    saveRequestedEmail(email);
    onSaved(email);
  });
  return (
    <EmailCaptureField capture={capture} layout="stacked" placeholder="you@example.com" buttonLabel="Send me the link" />
  );
}

function Eyebrow() {
  return (
    <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
      <Laptop className="size-3.5" aria-hidden />
      Best on laptop and desktop
    </p>
  );
}

function CloseButton({ onClose, label, inline = false }: { onClose: () => void; label: string; inline?: boolean }) {
  if (inline) {
    return (
      <button
        type="button"
        onClick={onClose}
        className="rounded-md text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {label}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClose}
      className="mt-6 flex h-11 w-full items-center justify-center rounded-full border border-border bg-muted px-5 text-[15px] text-primary transition-colors hover:bg-accent"
    >
      {label}
    </button>
  );
}

/** A desktop window that runs off the edge of the card, echoing the cropped demo on the page. */
function BiggerScreenArt() {
  return (
    <div aria-hidden className="relative h-36 overflow-hidden border-b border-border bg-muted">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(127,127,127,0.12)_1px,transparent_1px),linear-gradient(to_bottom,rgba(127,127,127,0.12)_1px,transparent_1px)] bg-[size:22px_22px] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      <div className="absolute -right-16 left-6 top-7 h-40 overflow-hidden rounded-xl border border-black/10 bg-background shadow-[0_18px_40px_-18px_rgba(15,23,42,0.45)] dark:border-white/10">
        <div className="flex h-7 items-center gap-1.5 border-b border-border bg-muted/60 px-3">
          <span className="size-2 rounded-full bg-neutral-300 dark:bg-neutral-600" />
          <span className="size-2 rounded-full bg-neutral-300 dark:bg-neutral-600" />
          <span className="size-2 rounded-full bg-neutral-300 dark:bg-neutral-600" />
          <span className="ml-3 flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
            <SquareTerminal className="size-3" />
            Lychee Terminal
          </span>
        </div>
        <div className="flex">
          <div className="w-24 shrink-0 space-y-1.5 border-r border-border p-2.5">
            <span className="block h-1.5 w-12 rounded bg-neutral-200 dark:bg-neutral-700" />
            <span className="block h-1.5 w-16 rounded bg-[#2f6fed]/30" />
            <span className="block h-1.5 w-10 rounded bg-neutral-200 dark:bg-neutral-700" />
            <span className="block h-1.5 w-14 rounded bg-neutral-200 dark:bg-neutral-700" />
          </div>
          <svg viewBox="0 0 300 90" className="h-[5.5rem] flex-1" preserveAspectRatio="none">
            <path
              d="M0 70 L30 64 L60 67 L90 55 L120 58 L150 44 L180 47 L210 30 L240 34 L270 20 L300 14"
              fill="none"
              stroke="#2f6fed"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d="M0 76 L30 73 L60 75 L90 66 L120 69 L150 58 L180 60 L210 47 L240 50 L270 38 L300 33"
              fill="none"
              stroke="#a855f7"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
