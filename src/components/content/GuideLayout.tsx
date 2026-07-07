import { cn } from "@/lib/utils";
import { GuideArticleThemeToggle } from "./GuideArticleThemeToggle";
import { GuideTakeawayCta } from "./GuideTakeawayCta";
import { ArticleMetaBar } from "./ArticleMetaBar";
import { RelatedContentSection } from "./RelatedContentSection";
import {
  ARTICLE_TEXT_COLUMN_CLASS,
  ArticleLead,
  ArticleHeaderRule,
  ArticleTitle,
} from "./article-prose";
import { ArticleBodySegments } from "./ArticleBodySegments";
import { getRelatedContent } from "@/lib/content/related";
import type { TocItem } from "@/lib/content/extract-mdx-headings";
import type { BaseContent, ContentType } from "@/lib/content/types";
import { ContentTocNav } from "./ContentTocNav";
import {
  ArticleChartLoadProvider,
  type ArticleChartLoadPlanEntry,
} from "./ArticleChartLoadProvider";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://lycheedata.com";

function resolveShareUrl(slug: string, frontmatter: BaseContent) {
  if (frontmatter.canonicalUrl?.trim()) return frontmatter.canonicalUrl.trim();
  return `${SITE_URL.replace(/\/$/, "")}/guides/${slug}`;
}

interface GuideLayoutProps {
  slug: string;
  frontmatter: BaseContent;
  contentType?: ContentType;
  tocItems?: TocItem[];
  chartLoadPlan?: ArticleChartLoadPlanEntry[];
  mdxSource: string;
}

export async function GuideLayout({
  slug,
  frontmatter,
  contentType = "guides",
  tocItems = [],
  chartLoadPlan = [],
  mdxSource,
}: GuideLayoutProps) {
  const related = getRelatedContent(contentType, slug, frontmatter, 6);
  const hasToc = tocItems.length > 0;

  return (
    <div className="min-w-0 flex-1 px-5 py-6 sm:px-8 sm:py-8 md:px-10 lg:px-12 lg:py-10 xl:px-10 2xl:px-12">
      <div
        className={
          hasToc
            ? "mx-auto flex w-full max-w-[56rem] items-start gap-6 xl:max-w-[72rem] xl:gap-10 2xl:max-w-[76rem] 2xl:gap-12"
            : "mx-auto w-full max-w-[56rem] 2xl:max-w-[58rem]"
        }
      >
        <div
          className={cn(
            "min-w-0 w-full flex-1",
            hasToc
              ? "max-w-[56rem] xl:max-w-[52rem] 2xl:max-w-[56rem]"
              : "max-w-[56rem] 2xl:max-w-[58rem]",
          )}
        >
          <div className="mb-2 flex justify-end sm:mb-3">
            <GuideArticleThemeToggle />
          </div>
          <article id="main-article" className="relative w-full min-w-0">
            <ArticleChartLoadProvider plan={chartLoadPlan}>
              <ArticleBodySegments
                mdxSource={mdxSource}
                header={
                  <div className={ARTICLE_TEXT_COLUMN_CLASS}>
                    <header className="not-prose mb-6 w-full max-w-full overflow-hidden pt-4 sm:mb-8 sm:pt-6 md:pt-8">
                      <ArticleMetaBar
                        author={frontmatter.author}
                        publishedAt={frontmatter.publishedAt}
                        readingTime={frontmatter.readingTime}
                        title={frontmatter.title}
                        shareUrl={resolveShareUrl(slug, frontmatter)}
                      />
                      <ArticleTitle>{frontmatter.title}</ArticleTitle>
                      {frontmatter.description && (
                        <ArticleLead>{frontmatter.description}</ArticleLead>
                      )}
                      <ArticleHeaderRule />
                    </header>
                  </div>
                }
                footer={
                  <div className={ARTICLE_TEXT_COLUMN_CLASS}>
                    <div className="mt-10 w-full min-w-0 font-sans sm:mt-14">
                      <GuideTakeawayCta />
                    </div>
                    <RelatedContentSection items={related} />
                  </div>
                }
              />
            </ArticleChartLoadProvider>
          </article>
        </div>

        {hasToc ? (
          <aside className="sticky top-20 hidden min-w-0 shrink-0 xl:block xl:w-[13rem] xl:pl-2 2xl:pl-3">
            <ContentTocNav items={tocItems} />
          </aside>
        ) : null}
      </div>
    </div>
  );
}
