"use client";

import { FeatureIcon, type FeatureIconSize } from "@/components/featureIcons/FeatureIcon";
import {
  FEATURE_ICON_CATALOG,
  PRIMARY_INTEGRATION_ICON_IDS,
  type FeatureIconId,
  type IntegrationFeatureIconId,
} from "@/components/featureIcons/catalog";
import { cn } from "@/lib/utils";

type FeatureIconStripProps = {
  ids?: readonly FeatureIconId[];
  size?: FeatureIconSize;
  className?: string;
  /** Accessible name for the strip (defaults to joined labels). */
  "aria-label"?: string;
};

/** Tight horizontal ribbon of feature / integration icons. */
export function FeatureIconStrip({
  ids = PRIMARY_INTEGRATION_ICON_IDS as readonly FeatureIconId[],
  size = "md",
  className,
  "aria-label": ariaLabel,
}: FeatureIconStripProps) {
  const labels = ids
    .map((id) => FEATURE_ICON_CATALOG[id]?.label)
    .filter(Boolean)
    .join(", ");

  return (
    <span
      role="img"
      aria-label={ariaLabel ?? labels}
      className={cn("inline-flex items-center gap-1", className)}
    >
      {ids.map((id) => (
        <FeatureIcon key={id} id={id} size={size} />
      ))}
    </span>
  );
}

export function PrimaryIntegrationIconStrip(props: Omit<FeatureIconStripProps, "ids">) {
  return <FeatureIconStrip ids={PRIMARY_INTEGRATION_ICON_IDS as IntegrationFeatureIconId[]} {...props} />;
}
