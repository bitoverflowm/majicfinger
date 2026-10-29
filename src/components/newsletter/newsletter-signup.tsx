"use client";

import { ArrowRight, Check, Loader2 } from "lucide-react";
import { useCallback, useEffect, useId, useState, type FormEvent } from "react";

import {
  useNewsletterState,
  useNewsletterSubmit,
  type EmailCapture,
  type NewsletterSource,
} from "@/lib/newsletter/client";
import { MAX_EMAIL_LENGTH } from "@/lib/newsletter/validate";
import { cn } from "@/lib/utils";

export const NEWSLETTER_SUCCESS = {
  title: "You’re on the list.",
  body: "We’ll keep you posted on new research, useful workflows, and what’s coming next—including Black Friday.",
};

/** Off-screen field real visitors never fill; bots that autofill every input do. */
function Honeypot({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div aria-hidden className="pointer-events-none absolute -left-[10000px] top-auto h-px w-px overflow-hidden">
      <label>
        Website
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
    </div>
  );
}

type FieldProps = {
  placeholder?: string;
  buttonLabel?: string;
  /** "embedded": Subscribe sits inside the field. "stacked": label, field, full-width button. */
  layout?: "embedded" | "stacked";
  label?: string;
  onSuccess?: () => void;
};

export function NewsletterField({ source, ...props }: FieldProps & { source: NewsletterSource }) {
  return <EmailCaptureField capture={useNewsletterSubmit(source)} {...props} />;
}

export function EmailCaptureField({
  capture,
  placeholder = "Your email address",
  buttonLabel = "Subscribe",
  layout = "embedded",
  label = "Email address",
  onSuccess,
}: FieldProps & { capture: EmailCapture }) {
  const id = useId();
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const { status, error, submit, clearError } = capture;
  const submitting = status === "submitting";
  const errorId = `${id}-error`;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await submit(email, website);
  };

  useEffect(() => {
    if (status === "success") onSuccess?.();
  }, [status, onSuccess]);

  if (status === "success") return null;

  const input = (
    <input
      id={`${id}-email`}
      type="email"
      name="email"
      inputMode="email"
      autoComplete="email"
      autoCapitalize="off"
      spellCheck={false}
      maxLength={MAX_EMAIL_LENGTH}
      required
      placeholder={placeholder}
      value={email}
      onChange={(e) => {
        setEmail(e.target.value);
        clearError();
      }}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? errorId : undefined}
      disabled={submitting}
      className={cn(
        "min-w-0 bg-transparent text-sm text-primary outline-none placeholder:text-muted-foreground disabled:opacity-60",
        layout === "embedded" && "h-full flex-1",
        layout === "stacked" && "h-11 w-full rounded-lg border bg-background px-3.5 transition-colors focus:border-[#2f6fed]",
        layout === "stacked" && (error ? "border-[#e5484d]" : "border-border"),
      )}
    />
  );

  const errorNode = (
    <p id={errorId} role="alert" className={cn("text-xs text-[#e5484d]", error ? (layout === "embedded" ? "mt-2" : "") : "sr-only")}>
      {error}
    </p>
  );

  return (
    <form onSubmit={onSubmit} noValidate className="relative w-full">
      <Honeypot value={website} onChange={setWebsite} />
      {layout === "embedded" ? (
        <div
          className={cn(
            "flex h-11 items-center gap-2 rounded-lg border bg-background pl-3.5 pr-1 transition-colors focus-within:border-[#2f6fed]",
            error ? "border-[#e5484d]" : "border-border",
          )}
        >
          <label htmlFor={`${id}-email`} className="sr-only">
            {label}
          </label>
          {input}
          <button
            type="submit"
            disabled={submitting}
            className={cn(
              "inline-flex h-8 shrink-0 items-center gap-1 rounded-md px-2.5 text-sm transition-colors disabled:cursor-wait",
              email ? "text-primary hover:bg-muted" : "text-muted-foreground hover:bg-muted hover:text-primary",
            )}
          >
            {submitting ? <Loader2 className="size-3.5 animate-spin" /> : null}
            {buttonLabel}
            {submitting ? null : <ArrowRight className="size-3.5" />}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <label htmlFor={`${id}-email`} className="text-sm font-medium text-primary">
            {label}
          </label>
          {input}
          {errorNode}
          <button
            type="submit"
            disabled={submitting}
            className="mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-full border border-white/[0.12] bg-secondary px-6 text-[15px] font-normal text-primary-foreground shadow-[inset_0_1px_2px_rgba(255,255,255,0.25),0_3px_3px_-1.5px_rgba(16,24,40,0.06),0_1px_1px_rgba(16,24,40,0.08)] transition-all ease-out hover:bg-secondary/80 active:scale-[0.98] disabled:cursor-wait disabled:opacity-80 dark:text-secondary-foreground"
          >
            {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
            {buttonLabel}
          </button>
        </div>
      )}
      {layout === "embedded" ? errorNode : null}
    </form>
  );
}

export function NewsletterSuccess({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <div role="status" className={cn("flex items-start gap-3 animate-in fade-in-0 duration-500", className)}>
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full bg-[#10b981] text-white",
          compact ? "mt-0.5 size-5" : "mt-0.5 size-7",
        )}
      >
        <Check className={compact ? "size-3" : "size-4"} strokeWidth={3} />
      </span>
      <div className="min-w-0">
        <p className={cn("font-medium text-primary", compact ? "text-sm" : "text-[15px]")}>{NEWSLETTER_SUCCESS.title}</p>
        <p className={cn("mt-1 text-muted-foreground", compact ? "text-xs leading-relaxed" : "text-sm leading-relaxed")}>
          {NEWSLETTER_SUCCESS.body}
        </p>
      </div>
    </div>
  );
}

/** Hidden for logged-in users and for visitors who already subscribed on this device. */
function useVisible() {
  const { ready, eligible } = useNewsletterState();
  const [done, setDone] = useState(false);
  const markDone = useCallback(() => setDone(true), []);
  return { show: done || (ready && eligible), done, markDone };
}

export function NewsletterInline({
  layout = "row",
  band = false,
  className,
}: {
  /** "row" puts copy and field side by side on wide screens; "stacked" suits narrow article columns. */
  layout?: "row" | "stacked";
  /** Wrap in a full-width page section (for landing / hub pages); renders nothing at all when hidden. */
  band?: boolean;
  className?: string;
}) {
  const { show, done, markDone } = useVisible();
  if (!show) return null;

  const card = (
    <aside
      aria-label="Newsletter signup"
      className={cn("not-prose w-full rounded-xl border border-border bg-accent p-5 font-sans sm:p-6", className)}
    >
      {done ? (
        <NewsletterSuccess />
      ) : (
        <div
          className={cn(
            "flex flex-col gap-4",
            layout === "row" && "md:flex-row md:items-center md:justify-between md:gap-10",
          )}
        >
          <div className={cn("min-w-0", layout === "row" && "md:max-w-md")}>
            <p className="text-[15px] font-medium tracking-tight text-primary">Your next research idea starts here.</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              New research, practical guides, feature releases, and subscriber offers from Lychee.
            </p>
          </div>
          <div className={cn("w-full", layout === "row" && "md:max-w-sm")}>
            <NewsletterField source="inline" onSuccess={markDone} />
            <p className="mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-orange-500" />
              Psst. You’ll want to be on the list before Black Friday.
            </p>
          </div>
        </div>
      )}
    </aside>
  );

  if (!band) return card;
  return (
    <section className="w-full">
      <div className="mx-auto w-full max-w-[min(100%,84rem)] px-6 py-10 sm:px-8 md:py-12 lg:px-10">{card}</div>
    </section>
  );
}

/** For MDX: `<NewsletterSignup />` anywhere in an article body. */
export function NewsletterSignup() {
  return <NewsletterInline layout="stacked" className="my-8" />;
}

export function NewsletterFooterSignup({ className }: { className?: string }) {
  const { show, done, markDone } = useVisible();
  if (!show) return null;

  return (
    <div className={cn("w-full max-w-sm", className)}>
      {done ? (
        <NewsletterSuccess compact />
      ) : (
        <>
          <p className="text-sm font-semibold text-primary">Stay in the Lychee loop.</p>
          <p className="mt-1 text-sm text-muted-foreground">Research, guides, product updates, and occasional offers.</p>
          <div className="mt-3">
            <NewsletterField source="footer" onSuccess={markDone} />
          </div>
        </>
      )}
    </div>
  );
}
