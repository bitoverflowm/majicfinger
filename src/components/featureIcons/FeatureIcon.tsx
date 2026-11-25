"use client";

import { Download, MoreHorizontal, Network, Sparkles } from "lucide-react";

import {
  FEATURE_ICON_CATALOG,
  type FeatureIconDef,
  type FeatureIconId,
} from "@/components/featureIcons/catalog";
import { cn } from "@/lib/utils";

const GLYPHS = {
  export: Download,
  jarvis: Sparkles,
  mcp: Network,
  more: MoreHorizontal,
} as const;

const SIZE = {
  sm: "size-4 rounded-[4px] [&_svg]:size-2.5 [&_img]:size-full",
  md: "size-5 rounded-[5px] [&_svg]:size-3 [&_img]:size-full",
  lg: "size-6 rounded-md [&_svg]:size-3.5 [&_img]:size-full",
} as const;

export type FeatureIconSize = keyof typeof SIZE;

type FeatureIconProps = {
  id?: FeatureIconId;
  def?: FeatureIconDef;
  size?: FeatureIconSize;
  className?: string;
  title?: string;
};

export function FeatureIcon({ id, def, size = "md", className, title }: FeatureIconProps) {
  const icon = def ?? (id ? FEATURE_ICON_CATALOG[id] : undefined);
  if (!icon) return null;

  const Glyph = icon.glyph ? GLYPHS[icon.glyph] : undefined;
  const label = title ?? icon.label;

  return (
    <span
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden",
        SIZE[size],
        icon.tileClass,
        className,
      )}
    >
      {icon.logoSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={icon.logoSrc} alt="" className="object-contain" />
      ) : Glyph ? (
        <Glyph strokeWidth={2} aria-hidden />
      ) : null}
    </span>
  );
}
