"use client";

import { useEffect } from "react";
import { FeatureIconLabel, PrimaryIntegrationIconStrip } from "@/components/featureIcons";
import { LandingDemoViewportOverlay } from "@/components/dashboardComposer/landingDemoViewportOverlay";
import { Button } from "@/components/ui/button";
import { exitLandingDemoToSection } from "@/lib/landingDemoSession";

function isExportFeature(feature) {
  const text = String(feature || "").toLowerCase();
  return text.includes("export") || text.includes("download");
}

function membersOnlyHeadline(feature) {
  if (isExportFeature(feature)) return "Export and downloads are pro features";
  const label = String(feature || "").trim();
  if (!label) return "This is a pro feature";
  return `${label} is a pro feature`;
}

/** Landing demo upsell for pro-only actions (e.g. Export). Escape goes back instead of exiting the demo. */
export function LandingDemoMembersOnlyDialog({ feature = "New tab", onBack, onUpgrade, className }) {
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

  const stop = (event) => event.stopPropagation();

  return (
    <LandingDemoViewportOverlay open className={className} onBackdropClick={onBack}>
      <div
        role="dialog"
        aria-labelledby="landing-demo-members-only-title"
        aria-describedby="landing-demo-members-only-lead"
        className="w-full max-w-md rounded-xl border border-border/70 bg-background p-6 shadow-sm"
        onClick={stop}
      >
        <h2 id="landing-demo-members-only-title" className="text-[15px] font-semibold text-foreground">
          Members only
        </h2>
        <p id="landing-demo-members-only-lead" className="mt-2 text-[14px] font-medium leading-snug text-foreground">
          {membersOnlyHeadline(feature)}
        </p>
        <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">Once you upgrade you can:</p>
        <ul className="mt-2.5 flex flex-col gap-2.5">
          <li>
            <FeatureIconLabel id="export" labelClassName="text-muted-foreground">
              download csv, xlsx, json
            </FeatureIconLabel>
          </li>
          <li>
            <FeatureIconLabel id="jarvis" labelClassName="text-muted-foreground" showBadge>
              Jarvis: early access to Lychee&apos;s native AI
            </FeatureIconLabel>
          </li>
          <li>
            <FeatureIconLabel id="mcp" labelClassName="text-muted-foreground">
              MCP: bring Lychee&apos;s entire data connections and knowledge base straight to ChatGPT, Claude, etc
            </FeatureIconLabel>
          </li>
          <li className="flex min-w-0 flex-col gap-1.5 pl-0">
            <span className="text-[13px] leading-snug text-muted-foreground">every integration</span>
            <PrimaryIntegrationIconStrip size="md" className="flex-wrap" />
          </li>
          <li>
            <FeatureIconLabel id="more" labelClassName="text-muted-foreground">
              and much more
            </FeatureIconLabel>
          </li>
        </ul>
        <div className="mt-5 flex items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={onBack}>
            Keep exploring
          </Button>
          <Button type="button" className="bg-[#0d99ff] text-white hover:bg-[#0d99ff]/90" onClick={upgrade}>
            View Plans →
          </Button>
        </div>
      </div>
    </LandingDemoViewportOverlay>
  );
}

/** Renders the upsell fixed to the viewport, above the nav pills and dock. */
export function LandingDemoMembersOnlyPortal({ open, feature, onClose }) {
  if (!open) return null;
  return <LandingDemoMembersOnlyDialog feature={feature} onBack={onClose} onUpgrade={onClose} className="z-[550]" />;
}
