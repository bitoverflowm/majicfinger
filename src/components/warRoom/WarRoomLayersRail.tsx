"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  Camera,
  CloudLightning,
  CloudSun,
  Lock,
  TriangleAlert,
  X,
} from "lucide-react";

import {
  WAR_ROOM_OVERLAY_GROUPS,
  type OverlayGroup,
} from "@/lib/warRoom/overlayLayers";
import { cn } from "@/lib/utils";

const GROUP_ICONS: Record<string, typeof CloudSun> = {
  weather: CloudSun,
  hazards: CloudLightning,
  intel: TriangleAlert,
  monitor: Camera,
};

type LockKind = "pro" | "coming-soon";

function lockCopy(kind: LockKind) {
  return kind === "pro" ? "Pro only" : "Coming soon";
}

function DisabledToggle() {
  return (
    <span
      aria-hidden
      className="relative inline-flex h-4 w-7 shrink-0 rounded-full border border-white/15 bg-white/[0.06]"
    >
      <span className="absolute left-0.5 top-0.5 size-3 rounded-full bg-white/25" />
    </span>
  );
}

function LayersPanel({
  group,
  lockKind,
  onClose,
  anchor = "start",
}: {
  group: OverlayGroup;
  lockKind: LockKind;
  onClose: () => void;
  /** Prefer bottom-align for lower rail icons so the panel stays on-screen. */
  anchor?: "start" | "end";
}) {
  const titleId = useId();
  const gate = lockCopy(lockKind);

  return (
    <div
      role="dialog"
      aria-labelledby={titleId}
      className={cn(
        "absolute left-[calc(100%+0.5rem)] z-30 w-[min(16.5rem,calc(100vw-4.5rem))] overflow-hidden rounded-lg border border-white/12 bg-[#0a0d14]/95 shadow-[0_12px_40px_rgba(0,0,0,0.55)] backdrop-blur-md",
        anchor === "end" ? "bottom-0" : "top-0",
      )}
    >
      <div className="flex items-center gap-2 border-b border-white/10 px-2.5 py-2">
        <p
          id={titleId}
          className="min-w-0 flex-1 truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-200"
        >
          {group.label}
        </p>
        <span className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.1em] text-cyan-300/90 ring-1 ring-cyan-400/30">
          {gate}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex size-6 shrink-0 items-center justify-center rounded text-slate-500 hover:bg-white/[0.06] hover:text-slate-200"
          aria-label="Close layers"
        >
          <X className="size-3.5" />
        </button>
      </div>
      <ul className="px-1.5 py-1.5">
        {group.layers.map((layer) => (
          <li key={layer.id}>
            <div
              className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 opacity-55"
              title={`${layer.label} — ${gate}`}
            >
              <DisabledToggle />
              <span className="min-w-0 flex-1 truncate text-[11px] font-medium uppercase tracking-[0.08em] text-slate-300">
                {layer.label}
              </span>
              <Lock className="size-3 shrink-0 text-slate-600" aria-hidden />
            </div>
          </li>
        ))}
      </ul>
      <p className="border-t border-white/10 px-2.5 py-2 text-[10px] leading-snug text-slate-500">
        Overlay feeds from live integrations. {gate} for now.
      </p>
    </div>
  );
}

/**
 * Osiris-style left icon rail for map overlays. Toggles are gated until
 * weather / hazards / intel / monitor integrations ship.
 */
export function WarRoomLayersRail({
  lockKind = "pro",
  className,
}: {
  /** Homepage tease vs in-app /war-room surface. */
  lockKind?: LockKind;
  className?: string;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openId) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenId(null);
    };
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpenId(null);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPointer);
    };
  }, [openId]);

  return (
    <div
      ref={rootRef}
      className={cn(
        "pointer-events-auto absolute left-2 top-1/2 z-20 flex -translate-y-1/2 flex-col",
        className,
      )}
    >
      <nav
        aria-label="Map overlay layers"
        className="relative flex flex-col gap-1 rounded-xl border border-white/10 bg-black/70 p-1 shadow-[0_8px_28px_rgba(0,0,0,0.45)] backdrop-blur-md"
      >
        {WAR_ROOM_OVERLAY_GROUPS.map((group, index) => {
          const Icon = GROUP_ICONS[group.id] || CloudSun;
          const open = openId === group.id;
          const anchor = index >= WAR_ROOM_OVERLAY_GROUPS.length - 2 ? "end" : "start";
          return (
            <div key={group.id} className="relative">
              <button
                type="button"
                aria-expanded={open}
                aria-haspopup="dialog"
                aria-label={`${group.label} layers (${lockCopy(lockKind)})`}
                title={`${group.label} · ${lockCopy(lockKind)}`}
                onClick={() => setOpenId(open ? null : group.id)}
                className={cn(
                  "relative flex size-9 items-center justify-center rounded-lg text-slate-400 transition-colors",
                  open
                    ? "bg-white/10 text-white"
                    : "hover:bg-white/[0.06] hover:text-slate-200",
                )}
              >
                <Icon className="size-[1.15rem] stroke-[1.5]" />
                <span className="absolute -right-0.5 -top-0.5 flex size-3.5 items-center justify-center rounded-full bg-cyan-400/90 text-[7px] font-bold text-slate-950 shadow-[0_0_8px_rgba(34,211,238,0.65)]">
                  <Lock className="size-2" strokeWidth={3} />
                </span>
              </button>
              {open ? (
                <LayersPanel
                  group={group}
                  lockKind={lockKind}
                  anchor={anchor}
                  onClose={() => setOpenId(null)}
                />
              ) : null}
            </div>
          );
        })}
      </nav>
    </div>
  );
}
