import { cn } from "@/lib/utils";

/**
 * Compact reading type scale for lychee_content.
 * Single source of truth — adjust sizes here for all articles.
 */
export const LYCHEE_CONTENT_TYPE = {
  title:
    "mt-16 font-article text-balance text-center text-[1.2rem] font-normal leading-[1.25] tracking-[-0.015em] text-foreground sm:mt-[4.5rem] sm:text-[1.375rem] md:mt-20 md:text-[1.5rem] lg:text-[1.75rem] lg:leading-[1.2] xl:text-[1.875rem]",
  lead: "mx-auto mt-3 max-w-2xl text-balance text-center font-article text-xs leading-relaxed text-muted-foreground text-pretty sm:mt-4 sm:text-sm",
  body: "text-[13px] leading-[1.65] tracking-normal sm:text-sm",
  sectionH2:
    "mt-8 scroll-mt-28 font-article text-[13px] font-bold text-pretty text-gray-700 leading-snug tracking-normal sm:mt-10 sm:text-sm",
  proseH2:
    "prose-h2:text-[13px] prose-h2:font-bold prose-h2:text-pretty prose-h2:text-gray-700 prose-h2:leading-snug prose-h2:tracking-normal sm:prose-h2:text-sm",
  proseH3: "prose-h3:text-[1rem] prose-h3:leading-snug sm:prose-h3:text-[1.0625rem]",
  proseH4: "prose-h4:text-[0.9rem] prose-h4:leading-snug sm:prose-h4:text-[0.9375rem]",
} as const;

/** Fixed reading measure — card grows; text column never widens. */
export const ARTICLE_TEXT_COLUMN_CLASS = "mx-auto w-full max-w-[42.5rem]";

/**
 * Prose children without `data-article-bleed` stay in the reading column.
 * Full-width MDX demos use `data-article-page-break` on ArticleBodySegments instead.
 */
export const ARTICLE_PROSE_INSET_CLASS =
  "[&>:not([data-article-bleed])]:mx-auto [&>:not([data-article-bleed])]:w-full [&>:not([data-article-bleed])]:max-w-[42.5rem]";

/** White reading surface */
export const ARTICLE_SURFACE_CLASS = cn(
  "relative w-full overflow-x-clip rounded-sm bg-white transition-all duration-150",
  "dark:bg-card dark:border dark:border-border",
  "p-5 sm:p-6",
  "md:p-8 md:shadow-[0px_1px_4px_1px_rgba(0,0,0,0.05),0px_1px_1px_0px_rgba(0,0,0,0.5),0px_-1px_1px_1px_#FFF_inset]",
  "dark:md:shadow-none",
  "lg:p-10 xl:p-12",
);

/** Centralized MDX body typography for all lychee_content. */
export const ARTICLE_PROSE_CLASS = cn(
  "prose prose-neutral dark:prose-invert max-w-none w-full min-w-0 overflow-x-clip font-article prose-sm",
  ARTICLE_PROSE_INSET_CLASS,
  "prose-headings:font-article prose-headings:tracking-normal prose-headings:scroll-mt-28",
  "prose-h1:text-[1.125rem] prose-h1:font-normal prose-h1:leading-snug prose-h1:mt-8 prose-h1:mb-3 sm:prose-h1:text-[1.25rem] sm:prose-h1:mt-12 sm:prose-h1:mb-4",
  "prose-h2:mt-8 prose-h2:mb-3 sm:prose-h2:mt-10 sm:prose-h2:mb-4",
  LYCHEE_CONTENT_TYPE.proseH2,
  "[&_h2_a.anchor]:font-bold [&_h2_a.anchor]:text-gray-700 [&_h2_a.anchor]:no-underline [&_h2_a.anchor]:decoration-transparent",
  "prose-h3:mt-6 prose-h3:mb-2 prose-h3:font-normal sm:prose-h3:mt-8 sm:prose-h3:mb-3",
  LYCHEE_CONTENT_TYPE.proseH3,
  "prose-h4:mt-5 prose-h4:font-normal sm:prose-h4:mt-6",
  LYCHEE_CONTENT_TYPE.proseH4,
  "prose-p:mb-4 prose-p:break-words prose-p:text-[13px] prose-p:leading-[1.65] prose-p:tracking-normal sm:prose-p:text-sm",
  "prose-li:my-0.5 prose-li:break-words prose-li:text-[13px] prose-li:leading-[1.65] sm:prose-li:text-sm",
  "prose-a:font-normal prose-a:text-secondary prose-a:underline prose-a:underline-offset-2 prose-a:decoration-secondary/40 hover:prose-a:decoration-secondary",
  "prose-strong:font-semibold",
  "prose-blockquote:border-l-border prose-blockquote:font-normal prose-blockquote:not-italic prose-blockquote:text-muted-foreground",
  "prose-pre:bg-muted prose-pre:text-foreground prose-pre:border prose-pre:border-border prose-pre:rounded-lg prose-pre:font-mono prose-pre:text-[0.8125rem]",
  "prose-pre:code:bg-transparent prose-pre:code:p-0 prose-pre:code:font-normal",
  "prose-code:before:content-none prose-code:after:content-none",
  "prose-img:my-8 prose-img:rounded-lg",
  "prose-figcaption:text-center prose-figcaption:text-xs prose-figcaption:text-muted-foreground",
);

export function ArticleTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <h1 className={cn(LYCHEE_CONTENT_TYPE.title, className)}>{children}</h1>;
}

export function ArticleLead({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <p className={cn(LYCHEE_CONTENT_TYPE.lead, className)}>{children}</p>;
}

/** Making Software–style mono dash divider for lychee_content. */
export const ARTICLE_DIVIDER_CLASS =
  "text-center font-mono text-[0.625rem] text-foreground";

export function ArticleDivider({ className }: { className?: string }) {
  return (
    <p aria-hidden role="separator" className={cn(ARTICLE_DIVIDER_CLASS, className)}>
      ╌╌╌╌
    </p>
  );
}

/** Mono dash rule below title + lead. */
export function ArticleHeaderRule({ className }: { className?: string }) {
  return <ArticleDivider className={cn("mt-12 sm:mt-14 md:mt-16", className)} />;
}

type ArticleProseProps = {
  children: React.ReactNode;
  className?: string;
};

export function ArticleProse({ children, className }: ArticleProseProps) {
  return <div className={cn(ARTICLE_PROSE_CLASS, className)}>{children}</div>;
}
