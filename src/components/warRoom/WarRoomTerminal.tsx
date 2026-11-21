"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

import { holderTerminalHref } from "@/lib/holderLanding/pages";
import { warRoomHref } from "@/lib/warRoom/href";
import { WORKSPACE_ENTRY_PATH } from "@/lib/workspaceEntry";

import { WarRoomView, type WarRoomNavigateRequest } from "./WarRoomView";

/** Full-page War Room. Same shell as the homepage explore tab. */
export function WarRoomTerminal() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const market = searchParams?.get("market") || "";
  const fixture = ["1", "true", "yes"].includes(String(searchParams?.get("fixture") || "").toLowerCase());

  const onMarketChange = useCallback(
    (id: string | null) => {
      const href = warRoomHref({ market: id });
      const suffix = fixture ? `${href.includes("?") ? "&" : "?"}fixture=1` : "";
      router.replace(`${href}${suffix}`, { scroll: false });
    },
    [fixture, router],
  );

  const onNavigate = useCallback(
    (request: WarRoomNavigateRequest) => {
      if (request.type === "holders") {
        router.push(
          holderTerminalHref({
            kind: "market",
            conditionId: request.conditionId,
            title: request.title,
            slug: request.slug || undefined,
          }),
        );
        return;
      }
      if (request.type === "markets") {
        router.push(WORKSPACE_ENTRY_PATH);
      }
    },
    [router],
  );

  return (
    <>
      <WarRoomView
        fixture={fixture}
        market={market}
        onMarketChange={onMarketChange}
        onNavigate={onNavigate}
      />
      <p className="sr-only">{pathname}</p>
    </>
  );
}
