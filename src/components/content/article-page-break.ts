import { isValidElement, type ReactElement, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Set on MDX demo components that should break the white article surface. */
export const ARTICLE_PAGE_BREAK_MARK = Symbol.for("lychee.articlePageBreak");

export type ArticlePageBreakComponent = {
  (props: Record<string, unknown>): ReactNode;
  [ARTICLE_PAGE_BREAK_MARK]?: true;
};

export function markArticlePageBreakComponent<T extends ArticlePageBreakComponent>(component: T): T {
  component[ARTICLE_PAGE_BREAK_MARK] = true;
  return component;
}

export function isArticlePageBreakElement(child: ReactNode): child is ReactElement {
  if (!isValidElement(child)) return false;
  const props = child.props as Record<string, unknown>;
  if (props["data-article-page-break"] != null) return true;
  const type = child.type as ArticlePageBreakComponent;
  return type?.[ARTICLE_PAGE_BREAK_MARK] === true;
}

/**
 * Grey strip between white article blocks — matches LycheeContentShell.
 * Outsets into GuideLayout horizontal padding so the demo reads wider than the white page.
 */
export const ARTICLE_PAGE_BREAK_SHELL_CLASS = cn(
  "relative left-1/2 -translate-x-1/2 bg-[#F5F5F5]/20 dark:bg-background",
  "py-6 md:py-8",
  "w-[calc((100%+2.5rem)*0.97)] sm:w-[calc((100%+4rem)*0.97)]",
  "md:w-[calc((100%+5rem)*0.97)] lg:w-[calc((100%+6rem)*0.97)]",
  "xl:w-[calc((100%+5rem)*0.97)] 2xl:w-[calc((100%+6rem)*0.97)]",
);

/** Inner width for page-break demos (query builder, etc.). */
export const ARTICLE_PAGE_BREAK_INNER_CLASS = "w-full max-w-none";
