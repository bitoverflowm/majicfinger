"use client";

import { FeatureHelper, FEATURE_HELPER_DRAWER_WIDTH_CLASS } from "@/components/shared/FeatureHelper";
import { getResearchToolHelperContent } from "@/lib/connectResearchTools";
import { cn } from "@/lib/utils";

/**
 * Compose layout that reserves space for the viewport-edge helper drawer.
 * The Run control lives outside this layout and must apply the same inset.
 *
 * @param {{
 *   children: React.ReactNode;
 *   className?: string;
 *   activeHelperToolId?: string | null;
 *   helperOpen?: boolean;
 *   onHelperOpenChange?: (open: boolean) => void;
 * }} props
 */
export function ConnectComposeHelperLayout({
  children,
  className,
  activeHelperToolId = null,
  helperOpen = false,
  onHelperOpenChange,
}) {
  const helperContent = activeHelperToolId
    ? getResearchToolHelperContent(activeHelperToolId)
    : null;

  return (
    <>
      <div
        className={cn(
          "min-w-0 transition-[padding] duration-300 ease-out",
          helperOpen && FEATURE_HELPER_DRAWER_WIDTH_CLASS,
          className,
        )}
      >
        {children}
      </div>
      {helperContent ? (
        <FeatureHelper
          label={helperContent.label}
          title={helperContent.title}
          introduction={helperContent.introduction}
          sections={helperContent.sections}
          guideLinks={helperContent.guideLinks}
          open={helperOpen}
          onOpenChange={onHelperOpenChange}
        />
      ) : null}
    </>
  );
}
