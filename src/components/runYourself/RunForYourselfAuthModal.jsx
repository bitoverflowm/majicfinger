"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MagicLinkEmailForm } from "@/components/runYourself/MagicLinkEmailForm";

/**
 * @param {{ open: boolean; onOpenChange: (open: boolean) => void; onAuthenticated: () => void }} props
 */
export function RunForYourselfAuthModal({ open, onOpenChange, onAuthenticated }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="sr-only">Sign in to run your analysis</DialogTitle>
        </DialogHeader>
        <MagicLinkEmailForm
          onSuccess={() => {
            onOpenChange(false);
            onAuthenticated();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
