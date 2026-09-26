"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import CheckoutAccountStep from "@/components/checkout/CheckoutAccountStep";
import { rememberCheckoutWelcome } from "@/components/checkout/CheckoutWelcome";
import { membershipTierLabel } from "@/lib/membershipLabel";

export default function CheckoutReturnPage() {
  const router = useRouter();

  const finish = useCallback(async ({ planKey, subscriptionTier } = {}) => {
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
    router.push("/dashboard");
  }, [router]);

  return (
    <div className="flex min-h-screen w-screen">
      <CheckoutAccountStep onComplete={finish} />
    </div>
  );
}
