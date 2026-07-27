"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMyStateV2 } from "@/context/stateContextV2";
import { cn } from "@/lib/utils";

/**
 * Holder profile: look up a public social profile by nickname.
 *
 * @param {{ className?: string; disabled?: boolean }} props
 */
export function KalshiLiveHolderProfileFields({ className, disabled = false }) {
  const ctx = useMyStateV2() ?? {};
  const {
    connectKalshiLiveHolderProfileNickname = "",
    setConnectKalshiLiveHolderProfileNickname,
  } = ctx;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="space-y-2">
        <h2 className="text-xs font-semibold tracking-tight text-foreground">Holder profile</h2>
        <p className="text-[11px] leading-snug text-muted-foreground">
          Public social profile for a Kalshi nickname — followers, bio, join date, and top
          categories. Use a nickname from the Leaderboard (or any known handle).
        </p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[11px] font-medium text-muted-foreground">Nickname</Label>
        <Input
          className="h-9 max-w-md text-xs"
          disabled={disabled}
          placeholder="e.g. RNOne"
          value={connectKalshiLiveHolderProfileNickname}
          onChange={(e) => setConnectKalshiLiveHolderProfileNickname?.(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
        <p className="text-[10px] leading-snug text-muted-foreground">
          Sent as <span className="font-mono text-[10px]">nickname</span> to{" "}
          <span className="font-mono text-[10px]">GET /v1/social/profile</span>. Exact match;
          unknown nicknames return not found.
        </p>
      </div>
    </div>
  );
}
