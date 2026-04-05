import type { Metadata } from "next";
import type { BaseContent, ContentType } from "./types";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://lycheedata.com";

export type ContentMetadataOptions = {
  /**
   * Public pathname for this document when it is not `/${contentType}/${slug}`
   * (e.g. guides that also serve blog MDX: `/guides/post-slug`).
   */
  publicPath?: string;
};

function resolveCanonicalUrl(
  frontmatter: BaseContent,
  contentType: ContentType,
  slug: string,
  publicPath?: string
): string {
  if (frontmatter.canonicalUrl?.trim()) return frontmatter.canonicalUrl.trim();
  if (publicPath?.trim()) {
    const path = publicPath.startsWith("/") ? publicPath : `/${publicPath}`;
    return `${SITE_URL}${path}`;
  }
  return `${SITE_URL}/${contentType}/${slug}`;
}

/** Parse "8 min", "8 minutes" → ISO 8601 duration for schema.org timeRequired. */
function readingTimeToIsoDuration(readingTime: string | undefined): string | undefined {
  if (!readingTime?.trim()) return undefined;
  const m = readingTime.trim().match(/^(\d+)\s*min(?:ute)?s?$/i);
  if (m) return `PT${m[1]}M`;
  return undefined;
}

export function buildContentMetadata(
  frontmatter: BaseContent,
  contentType: ContentType,
  slug: string,
  options?: ContentMetadataOptions
): Metadata {
  const canonical = resolveCanonicalUrl(
    frontmatter,
    contentType,
    slug,
    options?.publicPath
  );
  const displayTitle = frontmatter.seoTitle?.trim() || frontmatter.title;
  const ogImage =
    frontmatter.ogImage ||
    frontmatter.coverImage ||
    `${SITE_URL}/ogImage2.png`;
  const ogImageUrl = ogImage.startsWith("http") ? ogImage : `${SITE_URL}${ogImage}`;
  const twitterCard = frontmatter.twitterCard ?? "summary_large_image";

  return {
    title: displayTitle,
    description: frontmatter.description,
    alternates: { canonical },
    openGraph: {
      title: displayTitle,
      description: frontmatter.description,
      url: canonical,
      siteName: "Lychee",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: displayTitle,
        },
      ],
      type: "article",
      publishedTime: frontmatter.publishedAt,
      modifiedTime: frontmatter.updatedAt,
      authors: frontmatter.author ? [frontmatter.author] : undefined,
    },
    twitter: {
      card: twitterCard,
      title: displayTitle,
      description: frontmatter.description,
      images: [ogImageUrl],
    },
    keywords: frontmatter.keywords,
    ...(frontmatter.readingTime?.trim() && {
      other: {
        "reading-time": frontmatter.readingTime.trim(),
      },
    }),
  };
}

export function buildArticleJsonLd(
  frontmatter: BaseContent,
  contentType: ContentType,
  slug: string,
  options?: ContentMetadataOptions
) {
  const url = resolveCanonicalUrl(
    frontmatter,
    contentType,
    slug,
    options?.publicPath
  );
  const displayTitle = frontmatter.seoTitle?.trim() || frontmatter.title;
  const ogImage =
    frontmatter.ogImage ||
    frontmatter.coverImage ||
    `${SITE_URL}/ogImage2.png`;
  const imageUrl = ogImage.startsWith("http") ? ogImage : `${SITE_URL}${ogImage}`;
  const timeRequired = readingTimeToIsoDuration(frontmatter.readingTime);
  const keywords =
    frontmatter.keywords?.length && frontmatter.keywords.join(", ");

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: displayTitle,
    description: frontmatter.description,
    image: imageUrl,
    datePublished: frontmatter.publishedAt,
    dateModified: frontmatter.updatedAt || frontmatter.publishedAt,
    ...(timeRequired && { timeRequired }),
    ...(keywords && { keywords }),
    author: {
      "@type": "Person",
      name: frontmatter.author,
    },
    publisher: {
      "@type": "Organization",
      name: "Lychee",
      url: SITE_URL,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
  };
}

export function buildBreadcrumbJsonLd(
  items: { label: string; href?: string }[],
  baseUrl: string
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      ...(item.href && {
        item: item.href.startsWith("http") ? item.href : `${baseUrl}${item.href}`,
      }),
    })),
  };
}

export function buildOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Lychee",
    url: SITE_URL,
  };
}
