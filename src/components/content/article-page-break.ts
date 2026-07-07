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

/** Grey strip between white article blocks — matches LycheeContentShell. */
export const ARTICLE_PAGE_BREAK_SHELL_CLASS = cn(
  "relative w-full bg-[#F5F5F5]/20 dark:bg-background",
  "py-8 md:py-10",
);

/** Inner width for page-break demos (query builder, etc.). */
export const ARTICLE_PAGE_BREAK_INNER_CLASS =
  "mx-auto w-full max-w-6xl px-4 sm:px-6 md:px-8";
