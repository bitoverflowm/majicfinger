"use client";

import { useEffect } from "react";

import { FeatureIconLabel, PrimaryIntegrationIconStrip } from "@/components/featureIcons";
import { LandingDemoViewportOverlay } from "@/components/dashboardComposer/landingDemoViewportOverlay";
import { Button } from "@/components/ui/button";
import { exitLandingDemoToSection } from "@/lib/landingDemoSession";
import { scrollToPricingSection } from "@/lib/scrollToPricing";

function isExportFeature(feature) {
  const text = String(feature || "").toLowerCase();
  return text.includes("export") || text.includes("download");
}

/** Shared headline for Members only / Pro upgrade gates. */
export function membersOnlyHeadline(feature) {
  if (isExportFeature(feature)) return "Export and downloads are pro features";
  const label = String(feature || "").trim();
  if (!label || /^this feature$/i.test(label)) return "This is a Pro feature";
  // Prefer "Pro" casing for locked integrations / actions.
  if (/ is a pro feature\.?$/i.test(label)) {
    return label.replace(/ is a pro feature\.?$/i, " is a Pro feature");
  }
  return `${label} is a Pro feature`;
}

/**
 * Platform-wide Members only / Pro upgrade dialog.
 * Viewport-fixed; same feature list + CTAs everywhere (demo Export, Kalshi Historical v2, etc.).
 */
export function MembersOnlyUpgradeDialog({
  feature = "New tab",
  headline,
  onBack,
  onUpgrade,
  className,
  /** When true (homepage `#demo`), primary CTA exits the demo into pricing. */
  exitDemo = false,
}) {
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
    if (exitDemo) exitLandingDemoToSection("pricing");
    else scrollToPricingSection();
  };

  const stop = (event) => event.stopPropagation();
  const lead = headline || membersOnlyHeadline(feature);

  return (
    <LandingDemoViewportOverlay open className={className} onBackdropClick={onBack}>
      <div
        role="dialog"
        aria-labelledby="members-only-upgrade-title"
        aria-describedby="members-only-upgrade-lead"
        className="w-full max-w-md rounded-xl border border-border/70 bg-background p-6 shadow-sm"
        onClick={stop}
      >
        <h2 id="members-only-upgrade-title" className="text-[15px] font-semibold text-foreground">
          Members only
        </h2>
        <p id="members-only-upgrade-lead" className="mt-2 text-[14px] font-medium leading-snug text-foreground">
          {lead}
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

/** @deprecated Prefer MembersOnlyUpgradeDialog — same UI, landing-demo CTA exit. */
export function LandingDemoMembersOnlyDialog({ feature, onBack, onUpgrade, className, headline }) {
  return (
    <MembersOnlyUpgradeDialog
      feature={feature}
      headline={headline}
      onBack={onBack}
      onUpgrade={onUpgrade}
      className={className}
      exitDemo
    />
  );
}

/** Renders the upsell fixed to the viewport (homepage `#demo` and shared Pro gates). */
export function LandingDemoMembersOnlyPortal({ open, feature, onClose, headline, exitDemo = true }) {
  if (!open) return null;
  return (
    <MembersOnlyUpgradeDialog
      feature={feature}
      headline={headline}
      onBack={onClose}
      onUpgrade={onClose}
      className="z-[550]"
      exitDemo={exitDemo}
    />
  );
}

/** Alias for non-demo / platform Pro gates (scrolls to pricing, does not exit a landing demo). */
export function MembersOnlyUpgradePortal({ open, feature, onClose, headline }) {
  return (
    <LandingDemoMembersOnlyPortal
      open={open}
      feature={feature}
      onClose={onClose}
      headline={headline}
      exitDemo={false}
    />
  );
}
