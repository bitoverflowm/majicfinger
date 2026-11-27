"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

/**
 * Viewport-fixed modal chrome for homepage `#demo` overlays.
 * Portals to `document.body` so the panel stays centered in what the user sees,
 * not mid-stage of a tall scrollable mockup.
 */
export function LandingDemoViewportOverlay({
  open = true,
  className,
  children,
  zIndexClassName = "z-[550]",
  onBackdropClick,
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 flex items-center justify-center bg-black/40 p-6",
        zIndexClassName,
        className,
      )}
      onClick={onBackdropClick}
    >
      {children}
    </div>,
    document.body,
  );
}
