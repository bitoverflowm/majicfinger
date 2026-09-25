"use client";

import { useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import Link from "next/link";

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

function referralFromWindow(initialReferral) {
  if (initialReferral) return initialReferral;
  try {
    if (typeof window !== "undefined" && window.promotekit_referral) {
      return String(window.promotekit_referral);
    }
    const current = new URLSearchParams(window.location.search);
    const own = current.get("ref") || current.get("client_reference_id");
    if (own) return own;
    if (document.referrer) {
      const from = new URL(document.referrer);
      return from.searchParams.get("ref") || from.searchParams.get("client_reference_id") || "";
    }
  } catch {
    return "";
  }
  return "";
}

export default function CheckoutClient({ plan, cycle, referral }) {
  const [clientSecret, setClientSecret] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/checkout/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plan,
            cycle,
            referral: referralFromWindow(referral),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (data.fallbackUrl) {
          window.location.assign(data.fallbackUrl);
          return;
        }
        if (!res.ok || !data.clientSecret) {
          setError("We couldn't open checkout. Please try again.");
          return;
        }
        setClientSecret(data.clientSecret);
      } catch {
        if (!cancelled) setError("We couldn't open checkout. Please try again.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [plan, cycle, referral]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <Link href="/#pricing" className="text-sm text-muted-foreground hover:text-foreground">
          Back to pricing
        </Link>
      </div>
      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : clientSecret && stripePromise ? (
        <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret }}>
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      ) : (
        <p className="text-sm text-muted-foreground">Loading checkout…</p>
      )}
    </div>
  );
}
