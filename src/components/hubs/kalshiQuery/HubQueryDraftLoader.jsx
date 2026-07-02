"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useMyStateV2 } from "@/context/stateContextV2";
import { applyHubQueryDraft } from "@/lib/hubs/applyHubQueryDraft";
import { clearHubQueryDraft, loadHubQueryDraft } from "@/lib/hubs/hubQueryDraft";
import { setDataPullSurfaceContext } from "@/lib/analytics/trackDataPull";

/**
 * Loads hub query draft from sessionStorage when ?hubQuery=1 and runs pull on dashboard.
 */
export function HubQueryDraftLoader() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const ctx = useMyStateV2();
  const loadedRef = useRef(false);

  useEffect(() => {
    if (searchParams.get("hubQuery") !== "1") return;
    if (loadedRef.current) return;

    const draft = loadHubQueryDraft();
    if (!draft) {
      router.replace("/dashboard", { scroll: false });
      return;
    }

    loadedRef.current = true;

    setDataPullSurfaceContext({
      hubQueryHandoff: true,
      sourceHubPath: draft.sourceHubPath,
      sourceHubName: draft.sourceHubName,
    });

    try {
      applyHubQueryDraft(ctx, draft, { autoPull: false });
      clearHubQueryDraft();
      window.setTimeout(() => {
        ctx.requestConnectDataLakePull?.();
      }, 400);
    } catch (e) {
      console.error("[HubQueryDraftLoader]", e);
    }

    router.replace("/dashboard", { scroll: false });
  }, [searchParams, ctx, router]);

  return null;
}
