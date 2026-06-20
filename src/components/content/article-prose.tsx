import { cn } from "@/lib/utils";

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
  "prose prose-neutral dark:prose-invert max-w-none w-full font-article",
  "prose-headings:font-article prose-headings:font-normal prose-headings:tracking-tight prose-headings:scroll-mt-28",
  "prose-h1:text-[1.75rem] prose-h1:leading-tight prose-h1:mt-16 prose-h1:mb-6",
  "prose-h2:text-[1.5rem] prose-h2:leading-snug prose-h2:mt-14 prose-h2:mb-5",
  "prose-h3:text-[1.25rem] prose-h3:mt-10 prose-h3:mb-4",
  "prose-h4:text-[1.125rem] prose-h4:mt-8",
  "prose-p:text-[17px] prose-p:leading-[1.75] prose-p:tracking-[0.01em] prose-p:mb-6",
  "prose-li:text-[17px] prose-li:leading-[1.75] prose-li:my-1",
  "prose-a:font-normal prose-a:text-secondary prose-a:underline prose-a:underline-offset-2 prose-a:decoration-secondary/40 hover:prose-a:decoration-secondary",
  "prose-strong:font-semibold",
  "prose-blockquote:border-l-border prose-blockquote:font-normal prose-blockquote:not-italic prose-blockquote:text-muted-foreground",
  "prose-hr:my-12 prose-hr:border-border",
  "prose-pre:bg-muted prose-pre:text-foreground prose-pre:border prose-pre:border-border prose-pre:rounded-lg prose-pre:font-mono prose-pre:text-sm",
  "prose-pre:code:bg-transparent prose-pre:code:p-0 prose-pre:code:font-normal",
  "prose-code:before:content-none prose-code:after:content-none",
  "prose-img:my-10 prose-img:rounded-lg",
  "prose-figcaption:text-center prose-figcaption:text-sm prose-figcaption:text-muted-foreground",
);

export function ArticleTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h1
      className={cn(
        "font-article text-balance text-center text-[2rem] font-normal leading-[1.15] tracking-[-0.02em] text-foreground lg:text-[2.75rem]",
        className,
      )}
    >
      {children}
    </h1>
  );
}

export function ArticleLead({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "mx-auto mt-6 max-w-2xl text-balance text-center font-article text-lg leading-relaxed text-muted-foreground",
        className,
      )}
    >
      {children}
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
