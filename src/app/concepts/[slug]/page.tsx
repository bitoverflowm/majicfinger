import { notFound } from "next/navigation";
import { ConceptLayout } from "@/components/content/ConceptLayout";
import { MDXContent } from "@/lib/content/mdx";
import { getContentBySlug, getAllSlugs } from "@/lib/content";
import {
  buildContentMetadata,
  buildArticleJsonLd,
  buildBreadcrumbJsonLd,
  buildOrganizationJsonLd,
} from "@/lib/content/metadata";

export async function generateStaticParams() {
  const slugs = getAllSlugs("concepts");
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = getContentBySlug("concepts", slug);
  if (!data) return {};
  return buildContentMetadata(data.frontmatter, "concepts", slug);
}

export default async function ConceptPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = getContentBySlug("concepts", slug);
  if (!data) notFound();

  const { frontmatter, content } = data;
  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://lycheedata.com";

  const articleJsonLd = buildArticleJsonLd(frontmatter, "concepts", slug);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(
    [
      { label: "Home", href: "/" },
      { label: "Concepts", href: "/concepts" },
      { label: frontmatter.title },
    ],
    SITE_URL
  );
  const organizationJsonLd = buildOrganizationJsonLd();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleJsonLd),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationJsonLd),
        }}
      />
      <ConceptLayout slug={slug} frontmatter={frontmatter}>
        <MDXContent source={content} />
      </ConceptLayout>
    </>
  );
}
