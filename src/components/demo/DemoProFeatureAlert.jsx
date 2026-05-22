"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { scrollToPricingSection } from "@/lib/scrollToPricing";

/**
 * Demo / free-tier gate — copy aligned with dashboard Pro gating.
 */
export function DemoProFeatureAlert({
  open,
  onOpenChange,
  featureLabel = "this feature",
  title,
  description,
}) {
  const dialogTitle = title ?? `${featureLabel} is a Pro feature`;
  const dialogDescription =
    description ??
    `Only Pro users have access to ${featureLabel}. Would you like to view pricing?`;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{dialogTitle}</AlertDialogTitle>
          <AlertDialogDescription>{dialogDescription}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Not now</AlertDialogCancel>
          <AlertDialogAction onClick={() => scrollToPricingSection()}>
            View pricing
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
