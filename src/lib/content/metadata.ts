import type { Metadata } from "next";
import type { BaseContent, ContentType } from "./types";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.lycheedata.com";

export function buildContentMetadata(
  frontmatter: BaseContent,
  contentType: ContentType,
  slug: string
): Metadata {
  const canonical = frontmatter.canonicalUrl || `${SITE_URL}/${contentType}/${slug}`;
  const ogImage =
    frontmatter.ogImage ||
    frontmatter.coverImage ||
    `${SITE_URL}/ogImage2.png`;
  const ogImageUrl = ogImage.startsWith("http") ? ogImage : `${SITE_URL}${ogImage}`;

  return {
    title: frontmatter.title,
    description: frontmatter.description,
    alternates: { canonical },
    openGraph: {
      title: frontmatter.title,
      description: frontmatter.description,
      url: canonical,
      siteName: "Lychee",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: frontmatter.title,
        },
      ],
      type: "article",
      publishedTime: frontmatter.publishedAt,
      modifiedTime: frontmatter.updatedAt,
      authors: frontmatter.author ? [frontmatter.author] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: frontmatter.title,
      description: frontmatter.description,
      images: [ogImageUrl],
    },
    keywords: frontmatter.keywords,
  };
}

export function buildArticleJsonLd(
  frontmatter: BaseContent,
  contentType: ContentType,
  slug: string
) {
  const url = `${SITE_URL}/${contentType}/${slug}`;
  const ogImage =
    frontmatter.ogImage ||
    frontmatter.coverImage ||
    `${SITE_URL}/ogImage2.png`;
  const imageUrl = ogImage.startsWith("http") ? ogImage : `${SITE_URL}${ogImage}`;

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: frontmatter.title,
    description: frontmatter.description,
    image: imageUrl,
    datePublished: frontmatter.publishedAt,
    dateModified: frontmatter.updatedAt || frontmatter.publishedAt,
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
