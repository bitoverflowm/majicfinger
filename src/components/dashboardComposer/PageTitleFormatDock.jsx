"use client";

import { useEffect } from "react";
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

import { useMyStateV2 } from "@/context/stateContextV2";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Dock, DockIcon } from "@/components/ui/dock";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DEFAULT_PAGE_TITLE_THEME, mergePageTitleTheme } from "@/lib/pageTitleTheme";

const FONT_SIZES = [
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

function ToggleIconButton({ active, label, onClick, children }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          aria-pressed={active}
          onClick={onClick}
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon" }),
            "size-12 rounded-full [&_svg]:size-4",
            active && "bg-slate-200 dark:bg-slate-700",
          )}
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
 * @param {{ editorInset: { left: number; width: number } | null }} props
 * When `editorInset` is set, the bar is fixed to the dashboard editor column (not full viewport).
 */
export function PageTitleFormatDock({ editorInset = null }) {
  const {
    chartDashboardDraft,
    setChartDashboardDraft,
    pageTitleFormatDockOpen,
    setPageTitleFormatDockOpen,
  } = useMyStateV2();

  const pt = mergePageTitleTheme(chartDashboardDraft?.theme);

  const patch = (partial) => {
    setChartDashboardDraft?.((prev) => {
      if (!prev) return prev;
      const theme = prev.theme && typeof prev.theme === "object" ? prev.theme : {};
      const pageTitle = { ...DEFAULT_PAGE_TITLE_THEME, ...(theme.pageTitle || {}), ...partial };
      return { ...prev, theme: { ...theme, pageTitle } };
    });
  };

  useEffect(() => {
    if (!pageTitleFormatDockOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setPageTitleFormatDockOpen?.(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [pageTitleFormatDockOpen, setPageTitleFormatDockOpen]);

  if (!pageTitleFormatDockOpen || !chartDashboardDraft) return null;

  const colorValue = pt.color?.trim() ? pt.color : "#0f172a";

  const barPositionStyle = editorInset
    ? { position: "fixed", left: editorInset.left, width: editorInset.width, bottom: 24 }
    : { position: "fixed", left: 0, right: 0, bottom: 24 };

  return (
    <div
      className="pointer-events-auto z-[100] flex justify-center overflow-visible px-4"
      style={barPositionStyle}
      onMouseDown={(e) => e.preventDefault()}
      role="toolbar"
      aria-label="Title formatting"
    >
      <div className="flex max-w-full justify-center overflow-visible">
        {/* Tight row: Dock ships with mx-auto which would push it away from the label in a wide flex parent */}
        <div className="inline-flex max-w-full min-w-0 flex-nowrap items-end gap-2 overflow-x-auto overflow-y-visible overscroll-x-contain">
          <span className="shrink-0 select-none pb-2 text-sm font-medium text-muted-foreground">
            Title
          </span>
          <TooltipProvider delayDuration={200}>
            <Dock
              direction="bottom"
              iconSize={40}
              iconMagnification={58}
              iconDistance={130}
              className="mt-0 shrink-0 flex-nowrap justify-start shadow-lg !mx-0 max-sm:justify-center"
            >
          <DockIcon>
            <ToggleIconButton
              label="Align left"
              active={pt.textAlign === "left"}
              onClick={() => patch({ textAlign: "left" })}
            >
              <AlignLeft className="size-4" />
            </ToggleIconButton>
          </DockIcon>
          <DockIcon>
            <ToggleIconButton
              label="Align center"
              active={pt.textAlign === "center"}
              onClick={() => patch({ textAlign: "center" })}
            >
              <AlignCenter className="size-4" />
            </ToggleIconButton>
          </DockIcon>
          <DockIcon>
            <ToggleIconButton
              label="Align right"
              active={pt.textAlign === "right"}
              onClick={() => patch({ textAlign: "right" })}
            >
              <AlignRight className="size-4" />
            </ToggleIconButton>
          </DockIcon>

          <Separator orientation="vertical" className="mb-2 h-10 w-px shrink-0 self-end" />

          <DockIcon>
            <ToggleIconButton label="Bold" active={pt.bold} onClick={() => patch({ bold: !pt.bold })}>
              <Bold className="size-4" />
            </ToggleIconButton>
          </DockIcon>
          <DockIcon>
            <ToggleIconButton
              label="Italic"
              active={pt.italic}
              onClick={() => patch({ italic: !pt.italic })}
            >
              <Italic className="size-4" />
            </ToggleIconButton>
          </DockIcon>
          <DockIcon>
            <ToggleIconButton
              label="Underline"
              active={pt.underline}
              onClick={() => patch({ underline: !pt.underline })}
            >
              <Underline className="size-4" />
            </ToggleIconButton>
          </DockIcon>
          <DockIcon>
            <ToggleIconButton
              label="Strikethrough"
              active={pt.strikethrough}
              onClick={() => patch({ strikethrough: !pt.strikethrough })}
            >
              <Strikethrough className="size-4" />
            </ToggleIconButton>
          </DockIcon>

          <Separator orientation="vertical" className="mb-2 h-10 w-px shrink-0 self-end" />

          <DockIcon>
            <Popover>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      aria-label="Text color"
                      className={cn(
                        buttonVariants({ variant: "ghost", size: "icon" }),
                        "size-12 shrink-0 rounded-full",
                      )}
                    >
                      <span
                        className="size-6 rounded-full border-2 border-slate-300 shadow-inner dark:border-slate-600"
                        style={{ backgroundColor: pt.color?.trim() ? pt.color : "transparent" }}
                      />
                    </button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  Text color
                </TooltipContent>
              </Tooltip>
              <PopoverContent className="w-auto p-3" align="center" side="top">
                <div className="flex flex-col gap-2">
                  <input
                    type="color"
                    value={colorValue}
                    onChange={(e) => patch({ color: e.target.value })}
                    className="h-10 w-full max-w-[10rem] cursor-pointer rounded border-0 bg-transparent"
                  />
                  <button
                    type="button"
                    className="text-xs text-muted-foreground underline"
                    onClick={() => patch({ color: "" })}
                  >
                    Reset to default
                  </button>
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
                      aria-label="Font size"
                      className={cn(
                        buttonVariants({ variant: "ghost", size: "icon" }),
                        "size-12 shrink-0 rounded-full [&_svg]:size-4",
                      )}
                    >
                      <Type className="size-4" />
                    </button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  Font size
                </TooltipContent>
              </Tooltip>
              <PopoverContent className="w-44 p-2" align="center" side="top">
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
                      className={cn(
                        buttonVariants({ variant: "ghost", size: "icon" }),
                        "size-12 shrink-0 rounded-full font-serif text-xs font-semibold",
                      )}
                    >
                      Aa
                    </button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  Font
                </TooltipContent>
              </Tooltip>
              <PopoverContent className="w-40 p-2" align="center" side="top">
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
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}
