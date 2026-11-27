"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";

import { cn } from "@/lib/utils";

import {
  WarRoomDetailCard,
  type WarRoomDetailTarget,
  type WarRoomNavigateRequest,
} from "./WarRoomDetailCard";
import type { ActivityRow } from "./ActivityPane";
import type { MarketRow } from "./MarketsPane";
import { useWarRoomTheme } from "./useWarRoomTheme";

/**
 * Compact homepage War Room: market/news/trade detail as a viewport-fixed sheet
 * instead of swapping away from the globe.
 */
export function WarRoomMobileDetailModal({
  open,
  target,
  activityFeed,
  onOpenChange,
  onNavigate,
  onSelectRelatedMarket,
  onSelectActivity,
}: {
  open: boolean;
  target: WarRoomDetailTarget | null;
  activityFeed?: ActivityRow[];
  onOpenChange: (open: boolean) => void;
  onNavigate?: (request: WarRoomNavigateRequest) => void;
  onSelectRelatedMarket?: (market: MarketRow) => void;
  onSelectActivity?: (row: ActivityRow) => void;
}) {
  const { dark } = useWarRoomTheme();

  if (!open || !target) return null;

  return (
    <DialogPrimitive.Root open onOpenChange={(next) => (next ? null : onOpenChange(false))}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[70] bg-black/55 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:duration-200" />
        <DialogPrimitive.Content
          onOpenAutoFocus={(e) => e.preventDefault()}
          className={cn(
            "fixed inset-x-0 bottom-0 z-[70] flex max-h-[min(88dvh,40rem)] flex-col overflow-hidden rounded-t-2xl border border-b-0 shadow-2xl outline-none",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-4 data-[state=open]:duration-250",
            dark ? "border-white/10 bg-[#07090f] text-slate-100" : "border-border bg-background text-foreground",
          )}
        >
          <DialogPrimitive.Title className="sr-only">Market details</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Market price, recent news, and trades for the selected ping.
          </DialogPrimitive.Description>
          <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-white/20" aria-hidden />
          <div className="min-h-0 flex-1 overflow-hidden" data-war-room-theme={dark ? "dark" : "light"}>
            <WarRoomDetailCard
              open={open}
              target={target}
              activityFeed={activityFeed}
              onOpenChange={onOpenChange}
              onNavigate={onNavigate}
              onSelectRelatedMarket={onSelectRelatedMarket}
              onSelectActivity={onSelectActivity}
            />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
