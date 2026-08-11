import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

export declare const TooltipProvider: typeof TooltipPrimitive.Provider;
export declare const Tooltip: typeof TooltipPrimitive.Root;
export declare const TooltipTrigger: typeof TooltipPrimitive.Trigger;

export declare const TooltipContent: React.ForwardRefExoticComponent<
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> &
    React.RefAttributes<React.ElementRef<typeof TooltipPrimitive.Content>>
>;
