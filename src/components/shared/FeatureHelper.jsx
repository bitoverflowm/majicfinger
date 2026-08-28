"use client";

import { useState } from "react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { filterFeatureHelperGuideLinks } from "@/lib/featureHelper";
import { cn } from "@/lib/utils";

/**
 * @typedef {{ label: string; href: string }} FeatureHelperGuideLink
 * @typedef {{
 *   type: "paragraph" | "heading" | "unordered_list" | "ordered_list" | "code";
 *   content?: string;
 *   items?: string[];
 *   language?: string;
 *   caption?: string;
 * }} FeatureHelperSection
 */

/**
 * @param {{
 *   introduction?: string | string[];
 *   sections?: FeatureHelperSection[];
 *   guideLinks?: FeatureHelperGuideLink[];
 * }} props
 */
export function FeatureHelperBody({ introduction, sections = [], guideLinks = [] }) {
  const introBlocks = Array.isArray(introduction)
    ? introduction.filter((s) => String(s || "").trim())
    : introduction
      ? [String(introduction)]
      : [];
  const links = filterFeatureHelperGuideLinks(guideLinks);

  return (
    <div className="space-y-3 text-[12px] leading-snug text-muted-foreground">
      {introBlocks.map((p, i) => (
        <p key={`intro-${i}`}>{p}</p>
      ))}
      {(sections || []).map((section, i) => {
        const type = section?.type || "paragraph";
        if (type === "heading") {
          return (
            <h4 key={`sec-${i}`} className="pt-1 text-[12px] font-semibold text-foreground">
              {section.content}
            </h4>
          );
        }
        if (type === "unordered_list") {
          return (
            <ul key={`sec-${i}`} className="list-disc space-y-1.5 pl-4">
              {(section.items || []).map((item, j) => (
                <li key={j}>{item}</li>
              ))}
            </ul>
          );
        }
        if (type === "ordered_list") {
          return (
            <ol key={`sec-${i}`} className="list-decimal space-y-1.5 pl-4">
              {(section.items || []).map((item, j) => (
                <li key={j}>{item}</li>
              ))}
            </ol>
          );
        }
        if (type === "code") {
          return (
            <div key={`sec-${i}`} className="space-y-1.5">
              {section.caption ? <p>{section.caption}</p> : null}
              <pre
                className="max-w-full overflow-x-auto rounded-md bg-muted/60 p-2.5 font-mono text-[11px] leading-relaxed text-foreground"
                tabIndex={0}
              >
                <code>{section.content}</code>
              </pre>
            </div>
          );
        }
        return <p key={`sec-${i}`}>{section.content}</p>;
      })}
      {links.length > 0 ? (
        <div className="space-y-1.5 border-t border-border/40 pt-3">
          <p className="font-semibold text-foreground">Guides</p>
          <ul className="space-y-1.5">
            {links.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  className="text-foreground underline-offset-2 hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Shared, data-driven helper in a right-side slide-out panel.
 * Pass controlled `open` / `onOpenChange` from the parent when enabling a research tool.
 *
 * @param {{
 *   label?: string;
 *   title: string;
 *   introduction?: string | string[];
 *   sections?: FeatureHelperSection[];
 *   guideLinks?: FeatureHelperGuideLink[];
 *   className?: string;
 *   defaultOpen?: boolean;
 *   open?: boolean;
 *   onOpenChange?: (open: boolean) => void;
 * }} props
 */
export function FeatureHelper({
  label = "Helper",
  title,
  introduction,
  sections = [],
  guideLinks = [],
  className,
  defaultOpen = false,
  open: openProp,
  onOpenChange,
}) {
  const [internalOpen, setInternalOpen] = useState(!!defaultOpen);
  const open = openProp !== undefined ? openProp : internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const heading = title ? `${label} · ${title}` : label;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className={cn(
          "flex w-full flex-col gap-0 p-0 sm:max-w-md",
          "border-l border-border/60 bg-background",
          className,
        )}
      >
        <SheetHeader className="space-y-1 border-b border-border/50 px-4 py-3 text-left">
          <SheetTitle className="text-sm font-semibold tracking-tight">{heading}</SheetTitle>
          <SheetDescription className="text-[11px] text-muted-foreground">
            How this feature works in your query. Close the panel anytime to return to composing.
          </SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <FeatureHelperBody
            introduction={introduction}
            sections={sections}
            guideLinks={guideLinks}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
