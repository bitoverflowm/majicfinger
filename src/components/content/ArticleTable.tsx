import type { TableHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Making Software–inspired table chrome for lychee_content MDX tables. */
export const ARTICLE_TABLE_WRAPPER_CLASS =
  "table-wrapper my-6 w-full max-w-full overflow-x-auto bg-white dark:bg-card sm:my-8";

export const ARTICLE_TABLE_CLASS = cn(
  "w-full min-w-0 border-collapse font-sans text-xs text-gray-600 dark:text-muted-foreground sm:text-sm",
  "[&_th]:border [&_th]:border-[#d4e3ed] dark:[&_th]:border-border",
  "[&_th]:bg-[#e3eef5] dark:[&_th]:bg-muted",
  "[&_th]:px-2 [&_th]:py-2 sm:[&_th]:px-4 sm:[&_th]:py-2.5",
  "[&_th]:text-center [&_th]:font-bold [&_th]:text-[#4d6575] dark:[&_th]:text-foreground",
  "[&_td]:border [&_td]:border-[#d4e3ed] dark:[&_td]:border-border",
  "[&_td]:px-2 [&_td]:py-2 sm:[&_td]:px-4 sm:[&_td]:py-2.5",
  "[&_td]:text-center dark:[&_td]:text-foreground/90",
  "[&_tbody_tr:nth-child(odd)]:bg-white dark:[&_tbody_tr:nth-child(odd)]:bg-card",
  "[&_tbody_tr:nth-child(even)]:bg-[#eef4f8] dark:[&_tbody_tr:nth-child(even)]:bg-muted/40",
);

/** Centered mono caption below tables (optional MDX sibling). */
export const ARTICLE_TABLE_CAPTION_CLASS =
  "mt-2 text-center font-mono text-[0.625rem] text-muted-foreground";

type ArticleTableProps = TableHTMLAttributes<HTMLTableElement>;

export function ArticleTable({ children, className, ...props }: ArticleTableProps) {
  return (
    <div className={ARTICLE_TABLE_WRAPPER_CLASS}>
      <table {...props} className={cn(ARTICLE_TABLE_CLASS, className)}>
        {children}
      </table>
    </div>
  );
}
