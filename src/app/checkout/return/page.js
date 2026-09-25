"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Login from "@/components/login";
import { useUser } from "@/lib/hooks";

export default function CheckoutReturnPage() {
  const user = useUser();
  const router = useRouter();
  const started = useRef(false);

  useEffect(() => {
    if (!user || started.current) return;
    started.current = true;
    (async () => {
      try {
        await fetch("/api/checkout/claim", { method: "POST" });
      } catch {
        // Login already attaches the payment. Claim is a second chance for an existing session.
      }
      router.push("/dashboard");
    })();
  }, [user, router]);

  return (
    <div className="flex h-screen w-screen">
      <Login fromHome />
    </div>
  );
}
