import { notFound } from "next/navigation";
import { GuideLayout } from "@/components/content/GuideLayout";
import { ArticleViewTracker } from "@/components/analytics/ArticleViewTracker";
import { getContentBySlug, getAllSlugs } from "@/lib/content";
import { extractMdxHeadingsForToc } from "@/lib/content/extract-mdx-headings";
import { stripDuplicateMdxTitleHeading } from "@/lib/content/strip-duplicate-mdx-title";
import {
  buildContentMetadata,
  buildArticleJsonLd,
  buildBreadcrumbJsonLd,
  buildOrganizationJsonLd,
} from "@/lib/content/metadata";
import { LessonScrollTracker, UniversityLessonKicker } from "@/lib/university/progress";
import { clusterLabel } from "@/lib/university/lessons";

export async function generateStaticParams() {
  return getAllSlugs("university").map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = getContentBySlug("university", slug);
  if (!data) return {};
  return buildContentMetadata(data.frontmatter, "university", slug, {
    publicPath: `/university/${slug}`,
  });
}

export default async function UniversityLessonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = getContentBySlug("university", slug);
  if (!data) notFound();

  const { frontmatter, content } = data;
  const bodyContent = stripDuplicateMdxTitleHeading(content, frontmatter.title);
  const tocItems = extractMdxHeadingsForToc(bodyContent);
  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://lycheedata.com";
  const publicPath = `/university/${slug}`;
  const lesson = typeof frontmatter.lesson === "number" ? frontmatter.lesson : 1;

  return (
    <>
      <ArticleViewTracker title={frontmatter.title} slug={slug} path={publicPath} />
      <LessonScrollTracker slug={slug} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            buildArticleJsonLd(frontmatter, "university", slug, { publicPath }),
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            buildBreadcrumbJsonLd(
              [
                { label: "Home", href: "/" },
                { label: "University", href: "/university" },
                { label: frontmatter.title },
              ],
              SITE_URL,
            ),
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildOrganizationJsonLd()),
        }}
      />
      <GuideLayout
        slug={slug}
        frontmatter={frontmatter}
        contentType="university"
        tocItems={tocItems}
        mdxSource={bodyContent}
        kicker={
          <UniversityLessonKicker
            slug={slug}
            lesson={lesson}
            clusterLabel={clusterLabel(frontmatter.cluster || "predictions")}
          />
        }
      />
    </>
  );
}
