"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { filterFeatureHelperGuideLinks } from "@/lib/featureHelper";
import { cn } from "@/lib/utils";

/** Matches FeatureHelper panel width (w-72). Used to pad compose content while open. */
export const FEATURE_HELPER_DRAWER_WIDTH_CLASS = "pr-72";

/** Tailwind width of the helper panel — keep in sync with FeatureHelper `w-72`. */
export const FEATURE_HELPER_PANEL_WIDTH_CLASS = "w-72";

/**
 * Dialog overlay/content classes when a FeatureHelper panel is open on the right,
 * so the modal sits in the remaining viewport and both stay visible.
 */
export const DIALOG_BESIDE_HELPER_OVERLAY_CLASS = "right-72";
export const DIALOG_BESIDE_HELPER_CONTENT_CLASS =
  "left-[calc((100vw-18rem)/2)] !max-w-[min(42rem,calc(100vw-18rem-2rem))] sm:!max-w-[min(42rem,calc(100vw-18rem-2rem))]";

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
 * Non-modal right-edge helper panel. Portaled as fixed UI — no Dialog/overlay —
 * so the compose workspace stays fully interactive while it is open.
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
  const [mounted, setMounted] = useState(false);
  const open = openProp !== undefined ? openProp : internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const heading = title ? `${label} · ${title}` : label;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Ensure prior modal drawers cannot leave body pointer-events locked.
  useEffect(() => {
    if (!open || typeof document === "undefined") return undefined;
    document.body.style.pointerEvents = "";
    return () => {
      document.body.style.pointerEvents = "";
    };
  }, [open]);

  if (!open || !mounted || typeof document === "undefined") return null;

  return createPortal(
    <aside
      role="complementary"
      aria-label={heading}
      data-feature-helper-panel=""
      className={cn(
        "pointer-events-auto fixed inset-y-0 right-0 z-[60] flex w-72 max-w-[100vw] flex-col",
        "border-l border-border bg-background shadow-xl",
        "animate-in slide-in-from-right-4 fade-in-0 duration-200",
        className,
      )}
    >
      <div className="relative shrink-0 space-y-1 border-b border-border/50 px-4 py-3 pr-10 text-left">
        <h3 className="text-sm font-semibold tracking-tight text-foreground">{heading}</h3>
        <p className="text-[11px] leading-snug text-muted-foreground">
          How this feature works in your query. Keep composing while you read.
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
          aria-label="Close helper"
          onClick={() => setOpen(false)}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <FeatureHelperBody
          introduction={introduction}
          sections={sections}
          guideLinks={guideLinks}
        />
      </div>
    </aside>,
    document.body,
  );
}
