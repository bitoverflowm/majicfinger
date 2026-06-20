import { cn } from "@/lib/utils";

/**
 * Compact reading type scale for lychee_content.
 * Single source of truth — adjust sizes here for all articles.
 */
export const LYCHEE_CONTENT_TYPE = {
  /** Page H1 — mt-12 = space above title (below meta bar) */
  title:
    "mt-36 font-article text-balance text-center text-[1.625rem] font-normal leading-[1.2] tracking-[-0.015em] text-foreground lg:text-[1.875rem]",
  /** Subtitle / description below H1 */
  lead: "mx-auto mt-4 max-w-2xl text-balance text-center font-article text-[0.4375rem] leading-relaxed text-muted-foreground md:text-[0.46875rem]",
  /** Body paragraphs — ~50% of prior 0.9375rem scale */
  body: "text-[0.46875rem] leading-[1.65] tracking-normal",
  /** MDX section headings (demoted # lines → h2) */
  sectionH2:
    "mt-10 scroll-mt-28 font-article text-[0.625rem] font-normal leading-snug tracking-tight text-foreground",
  proseH2: "text-[0.625rem] leading-snug",
  proseH3: "text-[0.53125rem] leading-snug",
  proseH4: "text-[0.46875rem] leading-snug",
} as const;

/** White reading surface — Making Software–style card with inset shadow. */
export const ARTICLE_SURFACE_CLASS = cn(
  "relative grid w-full justify-items-center rounded-sm p-8 transition-all duration-150",
  "md:bg-white",
  "md:shadow-[0px_1px_4px_1px_rgba(0,0,0,0.05),0px_1px_1px_0px_rgba(0,0,0,0.5),0px_-1px_1px_1px_#FFF_inset]",
  "dark:md:border dark:md:border-border dark:md:bg-card dark:md:shadow-none",
  "lg:px-16 lg:py-20",
);

/** Centralized MDX body typography for all lychee_content. */
export const ARTICLE_PROSE_CLASS = cn(
  "prose prose-neutral dark:prose-invert max-w-none w-full font-article prose-sm",
  "prose-headings:font-article prose-headings:font-normal prose-headings:tracking-tight prose-headings:scroll-mt-28",
  "prose-h1:text-[0.625rem] prose-h1:leading-snug prose-h1:mt-12 prose-h1:mb-4",
  "prose-h2:mt-10 prose-h2:mb-4",
  LYCHEE_CONTENT_TYPE.proseH2,
  "prose-h3:mt-8 prose-h3:mb-3",
  LYCHEE_CONTENT_TYPE.proseH3,
  "prose-h4:mt-6",
  LYCHEE_CONTENT_TYPE.proseH4,
  "prose-p:mb-4",
  LYCHEE_CONTENT_TYPE.body,
  "prose-li:my-0.5",
  LYCHEE_CONTENT_TYPE.body,
  "prose-a:font-normal prose-a:text-secondary prose-a:underline prose-a:underline-offset-2 prose-a:decoration-secondary/40 hover:prose-a:decoration-secondary",
  "prose-strong:font-semibold",
  "prose-blockquote:border-l-border prose-blockquote:font-normal prose-blockquote:not-italic prose-blockquote:text-muted-foreground",
  "prose-hr:my-10 prose-hr:border-border",
  "prose-pre:bg-muted prose-pre:text-foreground prose-pre:border prose-pre:border-border prose-pre:rounded-lg prose-pre:font-mono prose-pre:text-[0.40625rem]",
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

/** Making Software–style mono dash rule below title + lead. */
export function ArticleHeaderRule({ className }: { className?: string }) {
  return (
    <p
      aria-hidden
      className={cn(
        "mt-6 text-center font-mono text-[0.625rem] text-foreground",
        className,
      )}
    >
      ╌╌╌╌
    </p>
  );
}

type ArticleProseProps = {
  children: React.ReactNode;
  className?: string;
};

export function ArticleProse({ children, className }: ArticleProseProps) {
  return <div className={cn(ARTICLE_PROSE_CLASS, className)}>{children}</div>;
}
