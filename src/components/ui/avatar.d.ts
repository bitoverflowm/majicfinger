import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";

export declare const Avatar: React.ForwardRefExoticComponent<
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> &
    React.RefAttributes<React.ElementRef<typeof AvatarPrimitive.Root>>
>;

export declare const AvatarImage: React.ForwardRefExoticComponent<
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image> &
    React.RefAttributes<React.ElementRef<typeof AvatarPrimitive.Image>>
>;

export declare const AvatarFallback: React.ForwardRefExoticComponent<
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback> &
    React.RefAttributes<React.ElementRef<typeof AvatarPrimitive.Fallback>>
>;
