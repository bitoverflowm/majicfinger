import type { TableHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Making Software–inspired table chrome for lychee_content MDX tables. */
export const ARTICLE_TABLE_WRAPPER_CLASS =
  "table-wrapper my-8 w-full overflow-x-auto border-2 border-[#7eb3d4] bg-white";

export const ARTICLE_TABLE_CLASS = cn(
  "w-full border-collapse font-sans text-sm text-gray-600",
  "[&_th]:border [&_th]:border-[#d4e3ed] [&_th]:bg-[#e3eef5] [&_th]:px-4 [&_th]:py-2.5",
  "[&_th]:text-left [&_th]:font-bold [&_th]:text-[#4d6575]",
  "[&_th:not(:first-child)]:text-right",
  "[&_td]:border [&_td]:border-[#d4e3ed] [&_td]:px-4 [&_td]:py-2.5",
  "[&_td]:text-left",
  "[&_td:not(:first-child)]:text-right",
  "[&_tbody_tr:nth-child(odd)]:bg-white",
  "[&_tbody_tr:nth-child(even)]:bg-[#eef4f8]",
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
