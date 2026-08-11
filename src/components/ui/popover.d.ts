import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";

export declare const Popover: typeof PopoverPrimitive.Root;
export declare const PopoverTrigger: typeof PopoverPrimitive.Trigger;

export declare const PopoverContent: React.ForwardRefExoticComponent<
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> &
    React.RefAttributes<React.ElementRef<typeof PopoverPrimitive.Content>>
>;
