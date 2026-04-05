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
  const guideSlugs = getAllSlugs("guides");
  const blogSlugs = getAllSlugs("blog");
  return [...guideSlugs, ...blogSlugs].map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let data = getContentBySlug("guides", slug);
  if (!data) data = getContentBySlug("blog", slug);
  if (!data) return {};
  const publicPath = `/guides/${slug}`;
  return buildContentMetadata(data.frontmatter, "guides", slug, {
    publicPath,
  });
}

export default async function GuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let data = getContentBySlug("guides", slug);
  let contentType: "guides" | "blog" = "guides";
  if (!data) {
    data = getContentBySlug("blog", slug);
    contentType = "blog";
  }
  if (!data) notFound();

  const { frontmatter, content } = data;
  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://lycheedata.com";
  const publicPath = `/guides/${slug}`;

  const articleJsonLd = buildArticleJsonLd(frontmatter, contentType, slug, {
    publicPath,
  });
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
      <GuideLayout slug={slug} frontmatter={frontmatter} contentType={contentType}>
        <MDXContent source={content} />
      </GuideLayout>
    </>
  );
}
