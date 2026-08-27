"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
 * Shared, data-driven helper disclosure for query-builder features.
 * Content is passed via props — do not hardcode feature-specific copy here.
 *
 * @param {{
 *   label?: string;
 *   title: string;
 *   introduction?: string | string[];
 *   sections?: FeatureHelperSection[];
 *   guideLinks?: FeatureHelperGuideLink[];
 *   className?: string;
 *   defaultOpen?: boolean;
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
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  const introBlocks = Array.isArray(introduction)
    ? introduction.filter((s) => String(s || "").trim())
    : introduction
      ? [String(introduction)]
      : [];
  const links = filterFeatureHelperGuideLinks(guideLinks);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className={cn("rounded-md border border-border/50", className)}>
      <CollapsibleTrigger
        type="button"
        className={cn(
          "flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left",
          "text-[11px] font-medium text-muted-foreground hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        )}
      >
        <span>
          <span className="text-muted-foreground/80">{label}</span>
          {title ? <span className="text-foreground"> · {title}</span> : null}
        </span>
        <ChevronDown
          className={cn("h-3.5 w-3.5 shrink-0 transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t border-border/40 px-2.5 pb-2.5 pt-2">
        <div className="space-y-2.5 text-[11px] leading-snug text-muted-foreground">
          {introBlocks.map((p, i) => (
            <p key={`intro-${i}`}>{p}</p>
          ))}
          {(sections || []).map((section, i) => {
            const type = section?.type || "paragraph";
            if (type === "heading") {
              return (
                <h4 key={`sec-${i}`} className="pt-1 text-[11px] font-semibold text-foreground">
                  {section.content}
                </h4>
              );
            }
            if (type === "unordered_list") {
              return (
                <ul key={`sec-${i}`} className="list-disc space-y-1 pl-4">
                  {(section.items || []).map((item, j) => (
                    <li key={j}>{item}</li>
                  ))}
                </ul>
              );
            }
            if (type === "ordered_list") {
              return (
                <ol key={`sec-${i}`} className="list-decimal space-y-1 pl-4">
                  {(section.items || []).map((item, j) => (
                    <li key={j}>{item}</li>
                  ))}
                </ol>
              );
            }
            if (type === "code") {
              return (
                <div key={`sec-${i}`} className="space-y-1">
                  {section.caption ? <p>{section.caption}</p> : null}
                  <pre
                    className="max-w-full overflow-x-auto rounded-md bg-muted/60 p-2 font-mono text-[10px] leading-relaxed text-foreground"
                    tabIndex={0}
                  >
                    <code>{section.content}</code>
                  </pre>
                </div>
              );
            }
            return (
              <p key={`sec-${i}`}>{section.content}</p>
            );
          })}
          {links.length > 0 ? (
            <div className="space-y-1 border-t border-border/40 pt-2">
              <p className="font-semibold text-foreground">Guides</p>
              <ul className="space-y-1">
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
      </CollapsibleContent>
    </Collapsible>
  );
}
