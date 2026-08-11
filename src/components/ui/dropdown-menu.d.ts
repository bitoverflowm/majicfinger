import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";

export declare const DropdownMenu: typeof DropdownMenuPrimitive.Root;
export declare const DropdownMenuTrigger: typeof DropdownMenuPrimitive.Trigger;
export declare const DropdownMenuGroup: typeof DropdownMenuPrimitive.Group;
export declare const DropdownMenuPortal: typeof DropdownMenuPrimitive.Portal;
export declare const DropdownMenuSub: typeof DropdownMenuPrimitive.Sub;
export declare const DropdownMenuRadioGroup: typeof DropdownMenuPrimitive.RadioGroup;

export declare const DropdownMenuSubTrigger: React.ForwardRefExoticComponent<
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & {
    inset?: boolean;
  } & React.RefAttributes<React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>>
>;

export declare const DropdownMenuSubContent: React.ForwardRefExoticComponent<
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent> &
    React.RefAttributes<React.ElementRef<typeof DropdownMenuPrimitive.SubContent>>
>;

export declare const DropdownMenuContent: React.ForwardRefExoticComponent<
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content> &
    React.RefAttributes<React.ElementRef<typeof DropdownMenuPrimitive.Content>>
>;

export declare const DropdownMenuItem: React.ForwardRefExoticComponent<
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
    inset?: boolean;
  } & React.RefAttributes<React.ElementRef<typeof DropdownMenuPrimitive.Item>>
>;

export declare const DropdownMenuCheckboxItem: React.ForwardRefExoticComponent<
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem> &
    React.RefAttributes<
      React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>
    >
>;

export declare const DropdownMenuRadioItem: React.ForwardRefExoticComponent<
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem> &
    React.RefAttributes<React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>>
>;

export declare const DropdownMenuLabel: React.ForwardRefExoticComponent<
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & {
    inset?: boolean;
  } & React.RefAttributes<React.ElementRef<typeof DropdownMenuPrimitive.Label>>
>;

export declare const DropdownMenuSeparator: React.ForwardRefExoticComponent<
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator> &
    React.RefAttributes<React.ElementRef<typeof DropdownMenuPrimitive.Separator>>
>;

export declare function DropdownMenuShortcut({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>): React.JSX.Element;
