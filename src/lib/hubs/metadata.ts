import type { Metadata } from "next";
import type { HubPageConfig } from "@/types/hub";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://lycheedata.com";

export function buildHubMetadata(config: HubPageConfig): Metadata {
  const canonical = `${SITE_URL}/${config.slug}`;
  const ogImage = config.ogImage
    ? config.ogImage.startsWith("http")
      ? config.ogImage
      : `${SITE_URL}${config.ogImage}`
    : `${SITE_URL}/ogImage2.png`;

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      absolute: `${config.title} — Lychee`,
    },
    description: config.description,
    keywords: config.keywords,
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
      title: config.title,
      description: config.description,
      type: "website",
      url: canonical,
      siteName: "Lychee",
      locale: "en",
      images: [{ url: ogImage, alt: config.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: config.title,
      description: config.description,
      images: [{ url: ogImage, alt: config.title }],
    },
  };
}

export function buildHubJsonLd(config: HubPageConfig) {
  const url = `${SITE_URL}/${config.slug}`;

  const collectionPage = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: config.title,
    description: config.description,
    url,
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
