"use client";

import { useState } from "react";
import { Check, Trash2 } from "lucide-react";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/**
 * Two-step delete: the first click turns this row into Confirm.
 * The second click runs onConfirm. Closing the menu resets the step.
 */
export function DestructiveConfirmMenuItem({
  onConfirm,
  deleteLabel = "Delete",
  confirmLabel = "Confirm",
  className,
}) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <DropdownMenuItem
        className={cn(
          "gap-2.5 rounded-md bg-muted px-2 py-2 text-[13px] text-red-500 focus:bg-muted focus:text-red-500",
          className,
        )}
        onSelect={(event) => {
          event.preventDefault();
          onConfirm?.();
        }}
      >
        <Check className="size-4 shrink-0" aria-hidden />
        {confirmLabel}
      </DropdownMenuItem>
    );
  }

  return (
    <DropdownMenuItem
      className={cn(
        "gap-2.5 rounded-md px-2 py-2 text-[13px] text-red-500 focus:bg-red-50 focus:text-red-500 dark:focus:bg-red-950/40",
        className,
      )}
      onSelect={(event) => {
        event.preventDefault();
        setConfirming(true);
      }}
    >
      <Trash2 className="size-4 shrink-0" aria-hidden />
      {deleteLabel}
    </DropdownMenuItem>
  );
}
