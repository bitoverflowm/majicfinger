"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { exitLandingDemoToSection } from "@/lib/landingDemoSession";
import { cn } from "@/lib/utils";

/** Landing demo upsell for pro-only actions (e.g. New tab). Escape goes back instead of exiting the demo. */
export function LandingDemoMembersOnlyDialog({ onBack, onUpgrade, className }) {
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      onBack?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onBack]);

  const upgrade = () => {
    onUpgrade?.();
    exitLandingDemoToSection("pricing");
  };

  return (
    <div className={cn("absolute inset-0 flex items-center justify-center bg-black/40 p-6", className ?? "z-30")}>
      <div
        role="dialog"
        aria-labelledby="landing-demo-members-only-title"
        className="w-full max-w-md rounded-xl border border-border/70 bg-background p-6 shadow-sm"
      >
        <h2 id="landing-demo-members-only-title" className="text-[15px] font-semibold text-foreground">
          Members only
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          New tab is a pro feature. Would you like to upgrade now?
        </p>
        <div className="mt-5 flex items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={onBack}>
            Go back and keep exploring
          </Button>
          <Button type="button" className="bg-[#0d99ff] text-white hover:bg-[#0d99ff]/90" onClick={upgrade}>
            Upgrade
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Renders the upsell over the whole demo window, above the nav pills and dock. */
export function LandingDemoMembersOnlyPortal({ open, onClose }) {
  const [host, setHost] = useState(null);
  useEffect(() => {
    setHost(document.getElementById("demo-mockup"));
  }, []);
  if (!open || !host) return null;
  return createPortal(<LandingDemoMembersOnlyDialog onBack={onClose} onUpgrade={onClose} className="z-[550]" />, host);
}
