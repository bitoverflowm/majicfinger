import { notFound } from "next/navigation";
import { PlaybookLayout } from "@/components/content/PlaybookLayout";
import { MDXContent } from "@/lib/content/mdx";
import { getContentBySlug, getAllSlugs } from "@/lib/content";
import {
  buildContentMetadata,
  buildArticleJsonLd,
  buildBreadcrumbJsonLd,
  buildOrganizationJsonLd,
} from "@/lib/content/metadata";

export async function generateStaticParams() {
  const slugs = getAllSlugs("playbooks");
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = getContentBySlug("playbooks", slug);
  if (!data) return {};
  return buildContentMetadata(data.frontmatter, "playbooks", slug);
}

export default async function PlaybookPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = getContentBySlug("playbooks", slug);
  if (!data) notFound();

  const { frontmatter, content } = data;
  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://lycheedata.com";

  const articleJsonLd = buildArticleJsonLd(frontmatter, "playbooks", slug);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(
    [
      { label: "Home", href: "/" },
      { label: "Playbooks", href: "/playbooks" },
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
      <PlaybookLayout slug={slug} frontmatter={frontmatter}>
        <MDXContent source={content} />
      </PlaybookLayout>
    </>
  );
}
