import { notFound } from "next/navigation";
import { GuideLayout } from "@/components/content/GuideLayout";
import { MDXContent } from "@/lib/content/mdx";
import { getContentBySlug, getAllSlugs } from "@/lib/content";
import {
  buildContentMetadata,
  buildArticleJsonLd,
  buildBreadcrumbJsonLd,
  buildOrganizationJsonLd,
} from "@/lib/content/metadata";

export async function generateStaticParams() {
  const slugs = getAllSlugs("guides");
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = getContentBySlug("guides", slug);
  if (!data) return {};
  return buildContentMetadata(data.frontmatter, "guides", slug);
}

export default async function GuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = getContentBySlug("guides", slug);
  if (!data) notFound();

  const { frontmatter, content } = data;
  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.lych3e.com";

  const articleJsonLd = buildArticleJsonLd(frontmatter, "guides", slug);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(
    [
      { label: "Home", href: "/" },
      { label: "Guides", href: "/guides" },
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
      <GuideLayout slug={slug} frontmatter={frontmatter}>
        <MDXContent source={content} />
      </GuideLayout>
    </>
  );
}
