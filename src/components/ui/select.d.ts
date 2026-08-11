import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";

export declare const Select: typeof SelectPrimitive.Root;
export declare const SelectGroup: typeof SelectPrimitive.Group;
export declare const SelectValue: typeof SelectPrimitive.Value;

export declare const SelectTrigger: React.ForwardRefExoticComponent<
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> &
    React.RefAttributes<React.ElementRef<typeof SelectPrimitive.Trigger>>
>;

export declare const SelectContent: React.ForwardRefExoticComponent<
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content> &
    React.RefAttributes<React.ElementRef<typeof SelectPrimitive.Content>>
>;

export declare const SelectLabel: React.ForwardRefExoticComponent<
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label> &
    React.RefAttributes<React.ElementRef<typeof SelectPrimitive.Label>>
>;

export declare const SelectItem: React.ForwardRefExoticComponent<
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item> &
    React.RefAttributes<React.ElementRef<typeof SelectPrimitive.Item>>
>;

export declare const SelectSeparator: React.ForwardRefExoticComponent<
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator> &
    React.RefAttributes<React.ElementRef<typeof SelectPrimitive.Separator>>
>;

export declare const SelectScrollUpButton: React.ForwardRefExoticComponent<
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton> &
    React.RefAttributes<React.ElementRef<typeof SelectPrimitive.ScrollUpButton>>
>;

export declare const SelectScrollDownButton: React.ForwardRefExoticComponent<
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton> &
    React.RefAttributes<
      React.ElementRef<typeof SelectPrimitive.ScrollDownButton>
    >
>;
