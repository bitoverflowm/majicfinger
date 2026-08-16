"use client";

import { useEffect, useMemo } from "react";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMyStateV2 } from "@/context/stateContextV2";
import {
  emptyPolymarketPublicProfilesComposeState,
  normalizePolymarketPublicProfilesComposeState,
} from "@/lib/polymarketLive/publicProfilesCompose";
import { cn } from "@/lib/utils";

export function PolymarketLivePublicProfilesFields({ className, disabled = false }) {
  const ctx = useMyStateV2() ?? {};
  const raw = ctx.connectPolymarketLivePublicProfilesCompose;
  const setCompose = ctx.setConnectPolymarketLivePublicProfilesCompose;
  const state = useMemo(
    () =>
      normalizePolymarketPublicProfilesComposeState(
        raw || emptyPolymarketPublicProfilesComposeState(),
      ),
    [raw],
  );

  useEffect(() => {
    if (raw == null) setCompose?.(emptyPolymarketPublicProfilesComposeState());
  }, [raw, setCompose]);

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor="polymarket-profile-addresses" className="text-[11px] text-foreground">
        Wallet address or addresses
      </Label>
      <p className="text-[10px] leading-snug text-muted-foreground dark:text-slate-400">
        Enter proxy wallet or user addresses separated by commas, spaces, or new lines.
      </p>
      <Textarea
        id="polymarket-profile-addresses"
        className="min-h-24 font-mono text-xs"
        disabled={disabled}
        placeholder={"0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b\n0x…"}
        value={state.addresses}
        onChange={(event) =>
          setCompose?.(
            normalizePolymarketPublicProfilesComposeState({
              ...state,
              addresses: event.target.value,
            }),
          )
        }
      />
    </div>
  );
}
