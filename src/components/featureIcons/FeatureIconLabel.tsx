"use client";

import type { ReactNode } from "react";

import { FeatureIcon, type FeatureIconSize } from "@/components/featureIcons/FeatureIcon";
import {
  FEATURE_ICON_CATALOG,
  type FeatureIconDef,
  type FeatureIconId,
} from "@/components/featureIcons/catalog";
import { cn } from "@/lib/utils";

type FeatureIconLabelProps = {
  id?: FeatureIconId;
  def?: FeatureIconDef;
  size?: FeatureIconSize;
  className?: string;
  labelClassName?: string;
  /** Override catalog label. */
  label?: string;
  showBadge?: boolean;
  children?: ReactNode;
};

/** Icon + label row — the Figma legend / feature-list pattern. */
export function FeatureIconLabel({
  id,
  def,
  size = "md",
  className,
  labelClassName,
  label,
  showBadge = false,
  children,
}: FeatureIconLabelProps) {
  const icon = def ?? (id ? FEATURE_ICON_CATALOG[id] : undefined);
  if (!icon) return null;

  return (
    <span className={cn("inline-flex min-w-0 items-start gap-2", className)}>
      <FeatureIcon def={icon} size={size} className="mt-0.5" />
      <span className={cn("min-w-0 text-[13px] leading-snug text-foreground", labelClassName)}>
        {children ?? label ?? icon.label}
        {showBadge && icon.badge ? (
          <span className="ml-1.5 inline-flex align-middle rounded px-1 py-px text-[10px] font-medium uppercase tracking-wide text-muted-foreground ring-1 ring-inset ring-border">
            {icon.badge}
          </span>
        ) : null}
      </span>
    </span>
  );
}
