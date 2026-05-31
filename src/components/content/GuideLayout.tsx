import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  Container,
  ContentWrapper,
  Section,
  Breadcrumb,
  H1,
  P,
  Muted,
  KnowledgeCard,
} from "@/components/ui";
import { GuideTakeawayCta } from "./GuideTakeawayCta";
import { getRelatedContent } from "@/lib/content/related";
import {
  isKalshiHistoricalHubGuide,
  KALSHI_HISTORICAL_DATA_HUB_PATH,
  KALSHI_HUB_GUIDE_BACK_LINK,
} from "@/lib/hubs/kalshiHubGuides";
import type { TocItem } from "@/lib/content/extract-mdx-headings";
import type { BaseContent, ContentType } from "@/lib/content/types";
import { ContentTocNav } from "./ContentTocNav";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
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

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Guides", href: "/guides" },
    { label: frontmatter.title },
  ];

  return (
    <>
    <Container>
      <ContentTocNav items={tocItems} />
      <ContentWrapper>
        <Breadcrumb items={breadcrumbItems} />
        {showKalshiHubBackLink && (
          <Link
            href={KALSHI_HISTORICAL_DATA_HUB_PATH}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
            {KALSHI_HUB_GUIDE_BACK_LINK}
          </Link>
        )}

        <Section>
          <H1>{frontmatter.title}</H1>
          {frontmatter.description && (
            <P className="text-muted-foreground">{frontmatter.description}</P>
          )}
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <Muted>{formatDate(frontmatter.publishedAt)}</Muted>
            {frontmatter.readingTime?.trim() && (
              <Muted>{frontmatter.readingTime.trim()} read</Muted>
            )}
            <Muted>By {frontmatter.author}</Muted>
          </div>
        </Section>

        {frontmatter.coverImage && (
          <Section>
            <div className="px-6">
              <div className="relative w-full aspect-video overflow-hidden rounded-xl border border-border">
                <Image
                  src={frontmatter.coverImage}
                  alt={frontmatter.title}
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            </div>
          </Section>
        )}

        <Section>
          <div
            className="prose prose-neutral dark:prose-invert prose-lg max-w-none
              prose-headings:scroll-mt-24
              prose-headings:font-semibold
              prose-headings:tracking-tight
              prose-h1:text-4xl prose-h1:font-bold
              prose-h2:mt-12 prose-h2:text-2xl
              prose-h3:mt-8 prose-h3:text-xl
              prose-p:leading-8 prose-p:text-base
              prose-a:font-medium prose-a:text-primary
              prose-a:no-underline
              hover:prose-a:underline
              prose-blockquote:border-l-primary
              prose-pre:bg-muted prose-pre:text-foreground prose-pre:border prose-pre:border-border prose-pre:rounded-xl prose-pre:px-4 prose-pre:py-3
              prose-pre:code:bg-transparent prose-pre:code:p-0 prose-pre:code:font-normal
              prose-code:before:content-none prose-code:after:content-none"
          >
            {children}
          </div>
        </Section>

        <Section>
          <GuideTakeawayCta />
        </Section>

        {related.length > 0 && (
          <Section>
            <h2 className="text-2xl font-medium mb-6">Related content</h2>
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
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
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
      </ContentWrapper>
    </Container>
    </>
  );
}
