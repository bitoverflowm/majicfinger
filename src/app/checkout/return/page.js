"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Clock, Loader2 } from "lucide-react";
import CheckoutAccountStep from "@/components/checkout/CheckoutAccountStep";
import { rememberCheckoutWelcome } from "@/components/checkout/CheckoutWelcome";
import { membershipTierLabel } from "@/lib/membershipLabel";
import { mutateUser } from "@/lib/hooks";
import { trackCheckoutStep } from "@/lib/checkout/trackCheckoutStep";

function PaymentNotice({ checkout }) {
  if (!checkout?.found) return null;
  const label = checkout.plan?.label ? `Lychee ${checkout.plan.label}` : "your plan";
  if (checkout.paymentStatus === "paid" || checkout.paymentStatus === "no_payment_required") {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <p className="text-foreground">
          Payment received for {label}. Verify your email to open your account.
        </p>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
      <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
      <p className="text-foreground">
        Your payment for {label} is processing. Set up your account now; access unlocks as soon as it clears.
      </p>
    </div>
  );
}

export default function CheckoutReturnPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutReturn />
    </Suspense>
  );
}

function CheckoutReturn() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams?.get("session_id") || "";
  const [checkout, setCheckout] = useState(sessionId ? null : { found: false });
  const done = useRef(false);

  const onStep = useCallback(
    (step, data, opts) => trackCheckoutStep(sessionId, step, data, opts),
    [sessionId],
  );

  useEffect(() => {
    if (!sessionId) return undefined;
    let cancelled = false;
    fetch(`/api/checkout/status?session_id=${encodeURIComponent(sessionId)}`)
      .then((res) => res.json())
      .catch(() => ({ found: false }))
      .then((data) => {
        if (cancelled) return;
        setCheckout(data || { found: false });
        if (!data?.found) return;
        if (data.status === "open") onStep("return_unpaid", {}, { once: true });
        else onStep("account_step", { paymentStatus: data.paymentStatus }, { once: true });
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId, onStep]);

  useEffect(() => {
    if (!checkout?.found || checkout.status === "open") return undefined;
    const onHide = () => {
      if (!done.current) onStep("left_account_step", { via: "closed or reloaded the tab" }, { keepalive: true });
    };
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, [checkout?.found, checkout?.status, onStep]);

  const finish = useCallback(async ({ planKey, subscriptionTier, existing } = {}) => {
    done.current = true;
    onStep("account_created", { existing: !!existing }, { once: true });
    let key = planKey || "";
    let tier = subscriptionTier || "";
    try {
      const claim = await fetch("/api/checkout/claim", { method: "POST" }).then((res) => res.json());
      if (claim?.planKey) key = claim.planKey;
    } catch {
      // Login already attaches the payment. Claim is a second chance for an existing session.
    }
    if (!key && !tier) {
      try {
        const me = await fetch("/api/user").then((res) => res.json());
        tier = me?.user?.subscriptionTier || "";
      } catch {
        tier = "";
      }
    }
    rememberCheckoutWelcome(membershipTierLabel({ planKey: key, subscriptionTier: tier }));
    await mutateUser();
    router.push("/dashboard");
  }, [router, onStep]);

  if (!checkout) {
    return (
      <div className="flex min-h-dvh w-screen items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Setting up your account…
      </div>
    );
  }

  if (checkout.found && checkout.status === "open") {
    const retry = checkout.plan
      ? `/checkout?plan=${encodeURIComponent(checkout.plan.cycle === "lifetime" ? "lifetime" : checkout.plan.tier)}&cycle=${encodeURIComponent(checkout.plan.cycle)}`
      : "/#pricing";
    return (
      <div className="flex min-h-dvh w-screen items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-3 text-center">
          <h1 className="text-xl font-semibold tracking-tight">Payment not completed</h1>
          <p className="text-sm text-muted-foreground">
            The payment was cancelled or declined, so nothing was charged.
          </p>
          <Link
            href={retry}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-foreground px-4 text-sm font-medium text-background"
          >
            Try again
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-screen">
      <CheckoutAccountStep
        onComplete={finish}
        onStep={checkout.found ? onStep : undefined}
        initialEmail={checkout.email || ""}
        initialName={checkout.name || ""}
        notice={<PaymentNotice checkout={checkout} />}
      />
    </div>
  );
}
