import * as React from "react";
import * as SheetPrimitive from "@radix-ui/react-dialog";

export declare const Sheet: typeof SheetPrimitive.Root;
export declare const SheetTrigger: typeof SheetPrimitive.Trigger;
export declare const SheetClose: typeof SheetPrimitive.Close;
export declare const SheetPortal: typeof SheetPrimitive.Portal;

export declare const SheetOverlay: React.ForwardRefExoticComponent<
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay> &
    React.RefAttributes<React.ElementRef<typeof SheetPrimitive.Overlay>>
>;

type SheetSide = "top" | "bottom" | "left" | "right";

export declare const SheetContent: React.ForwardRefExoticComponent<
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content> & {
    side?: SheetSide;
  } & React.RefAttributes<React.ElementRef<typeof SheetPrimitive.Content>>
>;

export declare function SheetHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element;

export declare function SheetFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element;

export declare const SheetTitle: React.ForwardRefExoticComponent<
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title> &
    React.RefAttributes<React.ElementRef<typeof SheetPrimitive.Title>>
>;

export declare const SheetDescription: React.ForwardRefExoticComponent<
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description> &
    React.RefAttributes<React.ElementRef<typeof SheetPrimitive.Description>>
>;
