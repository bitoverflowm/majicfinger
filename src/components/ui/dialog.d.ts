import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";

export declare const Dialog: typeof DialogPrimitive.Root;
export declare const DialogTrigger: typeof DialogPrimitive.Trigger;
export declare const DialogPortal: typeof DialogPrimitive.Portal;
export declare const DialogClose: typeof DialogPrimitive.Close;

export declare const DialogOverlay: React.ForwardRefExoticComponent<
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay> &
    React.RefAttributes<React.ElementRef<typeof DialogPrimitive.Overlay>>
>;

export declare const DialogContent: React.ForwardRefExoticComponent<
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> &
    React.RefAttributes<React.ElementRef<typeof DialogPrimitive.Content>>
>;

export declare function DialogHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element;

export declare function DialogFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element;

export declare const DialogTitle: React.ForwardRefExoticComponent<
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title> &
    React.RefAttributes<React.ElementRef<typeof DialogPrimitive.Title>>
>;

export declare const DialogDescription: React.ForwardRefExoticComponent<
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description> &
    React.RefAttributes<React.ElementRef<typeof DialogPrimitive.Description>>
>;
