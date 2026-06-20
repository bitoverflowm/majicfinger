import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Section, Muted, KnowledgeCard } from "@/components/ui";
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
import {
  isKalshiHistoricalHubGuide,
  KALSHI_HISTORICAL_DATA_HUB_PATH,
  KALSHI_HUB_GUIDE_BACK_LINK,
} from "@/lib/hubs/kalshiHubGuides";
import type { TocItem } from "@/lib/content/extract-mdx-headings";
import type { BaseContent, ContentType } from "@/lib/content/types";
import { ContentTocNav } from "./ContentTocNav";

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
  children: React.ReactNode;
}

export function GuideLayout({
  slug,
  frontmatter,
  contentType = "guides",
  tocItems = [],
  children,
}: GuideLayoutProps) {
  const related = getRelatedContent(contentType, slug, frontmatter, 6);
  const showKalshiHubBackLink = isKalshiHistoricalHubGuide(slug);

  return (
    <>
      <ContentTocNav items={tocItems} />
      <div className="w-full justify-self-center pt-8 lg:pt-20">
        <div className="mx-auto w-full max-w-[762px]">
          {showKalshiHubBackLink && (
            <Link
              href={KALSHI_HISTORICAL_DATA_HUB_PATH}
              className="mb-6 inline-flex items-center gap-2 font-sans text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
              {KALSHI_HUB_GUIDE_BACK_LINK}
            </Link>
          )}

          <article id="main-article" className={ARTICLE_SURFACE_CLASS}>
            <header className="not-prose mb-8 w-full">
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

            <ArticleProse>{children}</ArticleProse>

            <div className="mt-14 w-full font-sans">
              <GuideTakeawayCta />
            </div>

            {related.length > 0 && (
              <Section className="mt-14 w-full font-sans">
                <h2 className="mb-5 font-article text-[1.25rem] font-normal leading-snug tracking-tight">
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
      </div>
    </>
  );
}
