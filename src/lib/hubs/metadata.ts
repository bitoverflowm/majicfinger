import type { Metadata } from "next";
import type { HubPageConfig } from "@/types/hub";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://lycheedata.com";

function readingTimeToIsoDuration(readingTime: string | undefined): string | undefined {
  if (!readingTime?.trim()) return undefined;
  const m = readingTime.trim().match(/^(\d+)\s*min(?:ute)?s?$/i);
  if (m) return `PT${m[1]}M`;
  return undefined;
}

function resolveImageUrl(config: HubPageConfig): string {
  const image = config.ogImage || config.coverImage || `${SITE_URL}/ogImage2.png`;
  return image.startsWith("http") ? image : `${SITE_URL}${image}`;
}

function resolveCanonical(config: HubPageConfig): string {
  if (config.canonical?.trim()) return config.canonical.trim();
  const slug = config.slug.replace(/^\//, "");
  return `${SITE_URL}/${slug}`;
}

export function buildHubMetadata(config: HubPageConfig): Metadata {
  const canonical = resolveCanonical(config);
  const displayTitle = config.seoTitle?.trim() || config.title;
  const ogImageUrl = resolveImageUrl(config);
  const twitterCard = config.twitterCard ?? "summary_large_image";

  return {
    metadataBase: new URL(SITE_URL),
    title: { absolute: displayTitle },
    description: config.description,
    keywords: config.keywords,
    authors: config.author ? [{ name: config.author }] : undefined,
    alternates: { canonical },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      title: displayTitle,
      description: config.description,
      type: "website",
      url: canonical,
      siteName: "Lychee",
      locale: "en",
      ...(config.publishedAt && { publishedTime: config.publishedAt }),
      ...(config.updatedAt && { modifiedTime: config.updatedAt }),
      ...(config.author && { authors: [config.author] }),
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: displayTitle,
        },
      ],
    },
    twitter: {
      card: twitterCard,
      title: displayTitle,
      description: config.description,
      images: [{ url: ogImageUrl, alt: displayTitle }],
    },
    ...(config.readingTime?.trim() && {
      other: { "reading-time": config.readingTime.trim() },
    }),
  };
}

export function buildHubJsonLd(config: HubPageConfig) {
  const url = resolveCanonical(config);
  const displayTitle = config.seoTitle?.trim() || config.title;
  const imageUrl = resolveImageUrl(config);
  const timeRequired = readingTimeToIsoDuration(config.readingTime);
  const keywords =
    config.keywords?.length ? config.keywords.join(", ") : undefined;

  const collectionPage = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: displayTitle,
    description: config.description,
    url,
    image: imageUrl,
    ...(config.publishedAt && { datePublished: config.publishedAt }),
    ...(config.updatedAt && { dateModified: config.updatedAt }),
    ...(config.publishedAt &&
      !config.updatedAt && { dateModified: config.publishedAt }),
    ...(timeRequired && { timeRequired }),
    ...(keywords && { keywords }),
    ...(config.topics?.length && { about: config.topics }),
    ...(config.author && {
      author: { "@type": "Person", name: config.author },
    }),
    isPartOf: {
      "@type": "WebSite",
      name: "Lychee",
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: "LycheeData",
      url: SITE_URL,
    },
  };

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: config.title, item: url },
    ],
  };

  return { collectionPage, breadcrumb };
}
