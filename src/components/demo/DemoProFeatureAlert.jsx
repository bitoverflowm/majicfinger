"use client";

import { MembersOnlyUpgradeDialog } from "@/components/dashboardComposer/landingDemoMembersOnly";

/**
 * Demo / free-tier Pro gate — same Members only dialog as homepage `#demo` Export / locked integrations.
 */
export function DemoProFeatureAlert({
  open,
  onOpenChange,
  featureLabel = "this feature",
  // Kept for call-site compat; shared dialog uses the feature list instead of custom short copy.
  title: _title,
  description: _description,
}) {
  if (!open) return null;

  const close = () => onOpenChange?.(false);

  return (
    <MembersOnlyUpgradeDialog
      feature={featureLabel}
      onBack={close}
      onUpgrade={close}
      className="z-[560]"
      exitDemo={false}
    />
  );
}
