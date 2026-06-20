import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  buildProductLandingMetadata,
  ProductLandingShell,
} from "@/components/marketing/ProductLandingShell";
import { IntegrationLayout } from "@/components/content/IntegrationLayout";
import { MDXContent } from "@/lib/content/mdx";
import { getContentBySlug, getAllSlugs } from "@/lib/content";
import { extractMdxHeadingsForToc } from "@/lib/content/extract-mdx-headings";
import {
  buildContentMetadata,
  buildArticleJsonLd,
  buildBreadcrumbJsonLd,
  buildOrganizationJsonLd,
} from "@/lib/content/metadata";
import {
  getAllIntegrationHubSlugs,
  getIntegrationHubPage,
} from "@/lib/integrations/integration-hub-pages";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const mdxSlugs = getAllSlugs("integrations");
  const catalogSlugs = getAllIntegrationHubSlugs();
  const slugs = [...new Set([...mdxSlugs, ...catalogSlugs])];
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;

  const mdx = getContentBySlug("integrations", slug);
  if (mdx) {
    return buildContentMetadata(mdx.frontmatter, "integrations", slug);
  }

  const catalog = getIntegrationHubPage(slug);
  if (!catalog) return {};

  return buildProductLandingMetadata({
    title: `${catalog.label} Integration`,
    description: catalog.description,
    path: catalog.href,
  });
}

export default async function IntegrationPage({ params }: PageProps) {
  const { slug } = await params;
  const mdx = getContentBySlug("integrations", slug);

  if (mdx) {
    const { frontmatter, content } = mdx;
    const tocItems = extractMdxHeadingsForToc(content);
    const SITE_URL =
      process.env.NEXT_PUBLIC_SITE_URL || "https://lycheedata.com";

    const articleJsonLd = buildArticleJsonLd(frontmatter, "integrations", slug);
    const breadcrumbJsonLd = buildBreadcrumbJsonLd(
      [
        { label: "Home", href: "/" },
        { label: "Integrations", href: "/integrations" },
        { label: frontmatter.title },
      ],
      SITE_URL,
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
        <IntegrationLayout
          slug={slug}
          frontmatter={frontmatter}
          tocItems={tocItems}
        >
          <MDXContent source={content} />
        </IntegrationLayout>
      </>
    );
  }

  const catalog = getIntegrationHubPage(slug);
  if (!catalog) notFound();

  return (
    <ProductLandingShell
      title={`${catalog.label} Integration`}
      description={catalog.description}
      path={catalog.href}
    />
  );
}
