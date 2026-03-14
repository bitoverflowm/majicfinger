import { notFound } from "next/navigation";
import { IntegrationLayout } from "@/components/content/IntegrationLayout";
import { MDXContent } from "@/lib/content/mdx";
import { getContentBySlug, getAllSlugs } from "@/lib/content";
import {
  buildContentMetadata,
  buildArticleJsonLd,
  buildBreadcrumbJsonLd,
  buildOrganizationJsonLd,
} from "@/lib/content/metadata";

export async function generateStaticParams() {
  const slugs = getAllSlugs("integrations");
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = getContentBySlug("integrations", slug);
  if (!data) return {};
  return buildContentMetadata(data.frontmatter, "integrations", slug);
}

export default async function IntegrationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = getContentBySlug("integrations", slug);
  if (!data) notFound();

  const { frontmatter, content } = data;
  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://lycheedata.com";

  const articleJsonLd = buildArticleJsonLd(frontmatter, "integrations", slug);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(
    [
      { label: "Home", href: "/" },
      { label: "Integrations", href: "/integrations" },
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
      <IntegrationLayout slug={slug} frontmatter={frontmatter}>
        <MDXContent source={content} />
      </IntegrationLayout>
    </>
  );
}
