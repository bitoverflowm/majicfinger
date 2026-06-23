import Link from "next/link";
import { Section, Muted, KnowledgeCard } from "@/components/ui";
import { GuideArticleThemeToggle } from "./GuideArticleThemeToggle";
import { GuideTakeawayCta } from "./GuideTakeawayCta";
import { ArticleMetaBar } from "./ArticleMetaBar";
import {
  ARTICLE_SURFACE_CLASS,
  ArticleLead,
  ArticleHeaderRule,
  ArticleProse,
  ArticleTitle,
} from "./article-prose";
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
  children: React.ReactNode;
}

export function GuideLayout({
  slug,
  frontmatter,
  contentType = "guides",
  tocItems = [],
  chartLoadPlan = [],
  children,
}: GuideLayoutProps) {
  const related = getRelatedContent(contentType, slug, frontmatter, 6);
  const hasToc = tocItems.length > 0;

  return (
    <div className="min-w-0 flex-1 px-5 py-6 sm:px-8 sm:py-8 md:px-10 lg:px-12 lg:py-10 xl:px-10 2xl:px-12">
      {/* Article + TOC travel together — TOC hugs the article, not the viewport edge */}
      <div
        className={
          hasToc
            ? "mx-auto flex w-full max-w-[68rem] items-start gap-6 xl:gap-8"
            : "mx-auto w-full max-w-[762px]"
        }
      >
        <div className="min-w-0 w-full max-w-[762px] flex-1">
          <div className="mb-2 flex justify-end sm:mb-3">
            <GuideArticleThemeToggle />
          </div>
          <article id="main-article" className={ARTICLE_SURFACE_CLASS}>
            <header className="not-prose mb-6 w-full max-w-full overflow-hidden sm:mb-8">
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

            <ArticleChartLoadProvider plan={chartLoadPlan}>
              <ArticleProse>{children}</ArticleProse>
            </ArticleChartLoadProvider>

            <div className="mt-10 w-full min-w-0 font-sans sm:mt-14">
              <GuideTakeawayCta />
            </div>

            {related.length > 0 && (
              <Section className="mt-10 w-full min-w-0 font-sans sm:mt-14">
                <h2 className="mb-4 font-article text-lg font-normal leading-snug tracking-tight sm:mb-5 sm:text-[1.25rem]">
                  Related content
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {related.map((item) => (
                    <Link
                      key={`${item.contentType}-${item.slug}`}
                      href={`/guides/${item.slug}`}
                      className="group block"
                    >
                      <KnowledgeCard>
                        <h3 className="font-semibold group-hover:underline underline-offset-4">
                          {item.title}
                        </h3>
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {item.description}
                        </p>
                        <Muted className="mt-2 block capitalize">
                          {item.contentType}
                        </Muted>
                      </KnowledgeCard>
                    </Link>
                  ))}
                </div>
              </Section>
            )}
          </article>
        </div>

        {hasToc ? (
          <aside className="sticky top-20 hidden min-w-0 shrink-0 xl:block xl:w-[13rem]">
            <ContentTocNav items={tocItems} />
          </aside>
        ) : null}
      </div>
    </div>
  );
}
