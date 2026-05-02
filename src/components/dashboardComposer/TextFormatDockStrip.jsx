"use client";

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  Strikethrough,
  Type,
  Underline,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  composerDockPopoverContentZClass,
  composerDockTooltipContentClass,
} from "@/lib/composerDockLayers";
import { buttonVariants } from "@/components/ui/button";
import { ChartColorPalettePopover } from "@/components/chartView/ChartColorPalettePopover";
import { Dock, DockIcon } from "@/components/ui/dock";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const FONT_SIZES = [
  { value: "xs", label: "XS" },
  { value: "sm", label: "Small" },
  { value: "base", label: "Body" },
  { value: "lg", label: "Large" },
  { value: "xl", label: "XL" },
  { value: "2xl", label: "2XL" },
  { value: "3xl", label: "3XL" },
  { value: "4xl", label: "4XL" },
];

const FONT_FAMILIES = [
  { value: "sans", label: "Default" },
  { value: "serif", label: "Serif" },
  { value: "mono", label: "Mono" },
];

export { composerBottomDockChromeClass } from "@/lib/composerBottomDockChromeClass";

export const textFormatDockSegmentClassName =
  "mt-0 h-12 min-h-12 shrink-0 flex-nowrap justify-start gap-1 !px-1.5 !py-1 !mx-0 max-sm:justify-center !border-0 !shadow-none items-end bg-transparent";

const dockIconButtonClass = cn(
  buttonVariants({ variant: "ghost", size: "icon" }),
  "box-border aspect-square h-full w-full min-h-0 min-w-0 shrink-0 rounded-full p-0 [&_svg]:size-3.5",
);

function ToggleIconButton({ active, label, onClick, children }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          aria-pressed={active}
          onClick={onClick}
          className={cn(dockIconButtonClass, active && "bg-slate-200 dark:bg-slate-700")}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Text formatting icons as a Dock segment (often placed beside the chart dock).
 * @param {{ pt: object, patchPartial: (p: object) => void, className?: string }} props
 */
export function TextFormatDockStrip({ pt, patchPartial, className }) {
  const patch = patchPartial;

  return (
    <Dock
      direction="bottom"
      iconSize={36}
      iconMagnification={46}
      iconDistance={110}
      className={cn(textFormatDockSegmentClassName, className)}
    >
      <DockIcon>
        <ToggleIconButton
          label="Align left"
          active={pt.textAlign === "left"}
          onClick={() => patch({ textAlign: "left" })}
        >
          <AlignLeft className="size-3.5" />
        </ToggleIconButton>
      </DockIcon>
      <DockIcon>
        <ToggleIconButton
          label="Align center"
          active={pt.textAlign === "center"}
          onClick={() => patch({ textAlign: "center" })}
        >
          <AlignCenter className="size-3.5" />
        </ToggleIconButton>
      </DockIcon>
      <DockIcon>
        <ToggleIconButton
          label="Align right"
          active={pt.textAlign === "right"}
          onClick={() => patch({ textAlign: "right" })}
        >
          <AlignRight className="size-3.5" />
        </ToggleIconButton>
      </DockIcon>

      <Separator orientation="vertical" className="h-8 w-px shrink-0 self-center" />

      <DockIcon>
        <ToggleIconButton label="Bold" active={pt.bold} onClick={() => patch({ bold: !pt.bold })}>
          <Bold className="size-3.5" />
        </ToggleIconButton>
      </DockIcon>
      <DockIcon>
        <ToggleIconButton label="Italic" active={pt.italic} onClick={() => patch({ italic: !pt.italic })}>
          <Italic className="size-3.5" />
        </ToggleIconButton>
      </DockIcon>
      <DockIcon>
        <ToggleIconButton
          label="Underline"
          active={pt.underline}
          onClick={() => patch({ underline: !pt.underline })}
        >
          <Underline className="size-3.5" />
        </ToggleIconButton>
      </DockIcon>
      <DockIcon>
        <ToggleIconButton
          label="Strikethrough"
          active={pt.strikethrough}
          onClick={() => patch({ strikethrough: !pt.strikethrough })}
        >
          <Strikethrough className="size-3.5" />
        </ToggleIconButton>
      </DockIcon>

      <Separator orientation="vertical" className="h-8 w-px shrink-0 self-center" />

      <DockIcon>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex h-full w-full min-h-0 min-w-0 items-center justify-center [&_button]:!h-full [&_button]:!w-full [&_button]:!min-h-0 [&_button]:!min-w-0">
              <ChartColorPalettePopover
                ariaLabel="Text color"
                value={pt.color?.trim() || undefined}
                onChange={(c) => patch({ color: c })}
                onClear={() => patch({ color: "" })}
                align="center"
                side="top"
                triggerClassName={cn(dockIconButtonClass, "rounded-full")}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className={composerDockTooltipContentClass}>
            Text color
          </TooltipContent>
        </Tooltip>
      </DockIcon>

      <DockIcon>
        <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <button type="button" aria-label="Font size" className={dockIconButtonClass}>
                  <Type className="size-3.5" />
                </button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="top" className={composerDockTooltipContentClass}>
              Font size
            </TooltipContent>
          </Tooltip>
          <PopoverContent
            className={cn(composerDockPopoverContentZClass, "w-44 p-2")}
            align="center"
            side="top"
          >
            <div className="flex flex-col gap-0.5">
              {FONT_SIZES.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={cn(
                    "rounded px-2 py-1.5 text-left text-sm hover:bg-muted",
                    pt.fontSize === opt.value && "bg-muted font-medium",
                  )}
                  onClick={() => patch({ fontSize: opt.value })}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </DockIcon>

      <DockIcon>
        <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="Font"
                  className={cn(dockIconButtonClass, "font-serif text-[11px] font-semibold leading-none")}
                >
                  Aa
                </button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="top" className={composerDockTooltipContentClass}>
              Font
            </TooltipContent>
          </Tooltip>
          <PopoverContent
            className={cn(composerDockPopoverContentZClass, "w-40 p-2")}
            align="center"
            side="top"
          >
            <div className="flex flex-col gap-0.5">
              {FONT_FAMILIES.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={cn(
                    "rounded px-2 py-1.5 text-left text-sm hover:bg-muted",
                    opt.value === "serif" && "font-serif",
                    opt.value === "mono" && "font-mono",
                    pt.fontFamily === opt.value && "bg-muted font-medium",
                  )}
                  onClick={() => patch({ fontFamily: opt.value })}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </DockIcon>
    </Dock>
  );
}
