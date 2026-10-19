"use client";

import { useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { useTheme } from "next-themes";
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
  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme === "dark" ? "dark" : resolvedTheme === "light" ? "light" : "";
  const [clientSecret, setClientSecret] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!theme) return undefined;
    let cancelled = false;
    setClientSecret("");
    setError("");
    (async () => {
      try {
        const res = await fetch("/api/checkout/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plan,
            cycle,
            theme,
            referral: referralFromWindow(referral),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (data.code === "ALREADY_MEMBER" && data.redirect) {
          window.location.assign(data.redirect);
          return;
        }
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
  }, [plan, cycle, referral, theme]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 bg-background px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <Link href="/#pricing" className="text-sm text-muted-foreground hover:text-foreground">
          Back to pricing
        </Link>
      </div>
      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : clientSecret && stripePromise ? (
        <div className="overflow-hidden rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-6">
          <div className="overflow-hidden rounded-2xl bg-card">
            <EmbeddedCheckoutProvider key={`${theme}-${clientSecret}`} stripe={stripePromise} options={{ clientSecret }}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Loading checkout…</p>
      )}
    </div>
  );
}
