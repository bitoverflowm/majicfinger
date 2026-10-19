"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import BillingView from "@/components/billing/BillingView";
import { endAuthenticatedSession } from "@/lib/analytics/authJourneyClient";
import { useMyStateV2 } from "@/context/stateContextV2";
import { cn } from "@/lib/utils";

const PILL =
  "bg-white text-neutral-800 shadow-[0_0_0.5px_rgba(0,0,0,0.18),0_1px_3px_rgba(0,0,0,0.1),0_5px_12px_rgba(0,0,0,0.13)] dark:bg-[#2c2c2c] dark:text-neutral-100 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_5px_12px_rgba(0,0,0,0.45)]";

/**
 * What a signed-in user without an active membership sees instead of the
 * dashboard: plans and nothing else.
 */
export function MembershipGate({ user }) {
  const router = useRouter();
  const ctx = useMyStateV2();
  const [leaving, setLeaving] = useState(false);

  const logout = async () => {
    if (leaving) return;
    setLeaving(true);
    try {
      ctx?.liveStreamActions?.stop?.();
      endAuthenticatedSession({ email: user?.email, userId: user?._id || user?.userId });
      await fetch("/api/logout", { method: "POST" });
    } finally {
      router.push("/");
    }
  };

  return (
    <div className="relative flex min-h-svh min-w-0 flex-col bg-[#f5f5f5] dark:bg-[#1e1e1e]">
      <div className={cn("fixed left-2 top-2 z-40 flex h-10 items-center gap-2 rounded-[13px] pl-1.5 pr-3", PILL)}>
        <span className="flex size-[22px] shrink-0 overflow-hidden rounded-full">
          <Image src="/logo.png" width={22} height={22} alt="Lychee" className="size-full object-cover" />
        </span>
        <span className="text-[13px] font-medium tracking-[-0.01em]">Lychee</span>
      </div>
      <div className={cn("fixed right-2 top-2 z-40 flex h-10 items-center rounded-[13px] px-1.5", PILL)}>
        <button
          type="button"
          onClick={() => void logout()}
          disabled={leaving}
          className="inline-flex h-7 items-center rounded-md px-2.5 text-[13px] font-medium text-neutral-700 hover:bg-black/[0.05] disabled:opacity-60 dark:text-neutral-200 dark:hover:bg-white/10"
        >
          {leaving ? "Logging out…" : "Log out"}
        </button>
      </div>
      <div className="h-14 shrink-0" aria-hidden />
      <BillingView user={user} locked />
    </div>
  );
}
