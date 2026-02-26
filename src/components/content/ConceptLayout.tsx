import Image from "next/image";
import Link from "next/link";
import {
  Container,
  ContentWrapper,
  Section,
  Breadcrumb,
  CTASection,
  H1,
  P,
  Muted,
  KnowledgeCard,
} from "@/components/ui";
import { getRelatedContent } from "@/lib/content/related";
import type { BaseContent, ContentType } from "@/lib/content/types";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

interface ConceptLayoutProps {
  slug: string;
  frontmatter: BaseContent;
  children: React.ReactNode;
}

export function ConceptLayout({
  slug,
  frontmatter,
  children,
}: ConceptLayoutProps) {
  const contentType: ContentType = "concepts";
  const related = getRelatedContent(contentType, slug, frontmatter, 6);

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Concepts", href: "/concepts" },
    { label: frontmatter.title },
  ];

  return (
    <Container>
      <ContentWrapper>
        <Breadcrumb items={breadcrumbItems} />
        <Section>
          <H1>{frontmatter.title}</H1>
          {frontmatter.description && (
            <P className="text-muted-foreground">{frontmatter.description}</P>
          )}
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <Muted>{formatDate(frontmatter.publishedAt)}</Muted>
            <Muted>By {frontmatter.author}</Muted>
          </div>
        </Section>

        {frontmatter.coverImage && (
          <Section>
            <div className="relative w-full aspect-video overflow-hidden rounded-xl border border-border">
              <Image
                src={frontmatter.coverImage}
                alt={frontmatter.title}
                fill
                className="object-cover"
                priority
              />
            </div>
          </Section>
        )}

        <Section>
          <div className="prose dark:prose-invert max-w-none prose-headings:scroll-mt-8 prose-headings:font-semibold prose-headings:tracking-tight prose-a:no-underline prose-p:tracking-tight">
            {children}
          </div>
        </Section>

        {related.length > 0 && (
          <Section>
            <h2 className="text-2xl font-medium mb-6">Related content</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {related.map((item) => (
                <Link
                  key={`${item.contentType}-${item.slug}`}
                  href={`/${item.contentType}/${item.slug}`}
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

        <CTASection />
      </ContentWrapper>
    </Container>
  );
}
