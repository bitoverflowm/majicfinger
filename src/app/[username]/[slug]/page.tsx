import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublishedProjectView } from "@/components/publish/PublishedProjectView";
import { describePublishedTabs, getPublishedProjectPage } from "@/lib/server/publishedProjectPage";
import { canonicalUrl, getSiteUrl } from "@/lib/site";
import { fallbackPublishDescription, publishedProjectPath } from "@/lib/workspacePublish";
import { publishedImageUrl } from "@/lib/workspacePublishClient";

export const dynamic = "force-dynamic";

type Params = Promise<{ username: string; slug: string }>;

type Publication = {
  slug: string;
  title: string;
  description?: string;
  seo_title?: string;
  seo_description?: string;
  keywords?: string[];
  labels?: string[];
  category?: string;
  mode: "live" | "snapshot";
  visibility: "public" | "unlisted";
  password_on?: boolean;
  og_at?: Date | string | null;
  header_at?: Date | string | null;
  snapshot_at?: Date | string | null;
  published_at?: Date | string | null;
  first_published_at?: Date | string | null;
};

function iso(value: unknown): string | undefined {
  if (!value) return undefined;
  const date = new Date(value as string);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function clip(text: string, max: number) {
  const value = text.replace(/\s+/g, " ").trim();
  return value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { username, slug } = await params;
  const page = await getPublishedProjectPage(username, slug);
  if (!page) return { robots: { index: false, follow: false } };
  const { user, content } = page;
  const pub = page.publication as unknown as Publication;
  const path = publishedProjectPath(user.handle, pub.slug);
  const title = pub.seo_title || pub.title;
  const description = clip(
    pub.seo_description || pub.description || fallbackPublishDescription({ title: pub.title, tabs: content?.tabs }),
    170,
  );
  const image = `${getSiteUrl()}${publishedImageUrl(user.handle, pub.slug, "og", pub.og_at)}`;
  const hidden = pub.visibility === "unlisted" || pub.password_on;
  return {
    title,
    description,
    keywords: [...(pub.keywords || []), ...(pub.labels || [])],
    authors: [{ name: `@${user.handle}` }],
    category: pub.category || undefined,
    alternates: { canonical: canonicalUrl(path) },
    robots: hidden ? { index: false, follow: false } : { index: true, follow: true, "max-image-preview": "large" },
    openGraph: {
      type: "article",
      url: canonicalUrl(path),
      siteName: "Lychee",
      title,
      description,
      publishedTime: iso(pub.first_published_at),
      modifiedTime: iso(content?.updatedAt || pub.published_at),
      authors: [`@${user.handle}`],
      tags: pub.labels || [],
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function PublishedProjectPage({ params }: { params: Params }) {
  const { username, slug } = await params;
  const page = await getPublishedProjectPage(username, slug);
  if (!page) notFound();
  const { user, content, inline, unlocked } = page;
  const pub = page.publication as unknown as Publication;
  const path = publishedProjectPath(user.handle, pub.slug);
  const url = canonicalUrl(path);
  const tabs = unlocked ? describePublishedTabs(content) : [];
  const description = pub.description || fallbackPublishDescription({ title: pub.title, tabs: content?.tabs });
  const updatedAt = iso(content?.updatedAt || pub.published_at);
  const image = `${getSiteUrl()}${publishedImageUrl(user.handle, pub.slug, "og", pub.og_at)}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${url}#page`,
        url,
        name: pub.seo_title || pub.title,
        description: clip(pub.seo_description || description, 300),
        isPartOf: { "@type": "WebSite", name: "Lychee", url: getSiteUrl() },
        primaryImageOfPage: image,
        datePublished: iso(pub.first_published_at),
        dateModified: updatedAt,
        breadcrumb: { "@id": `${url}#breadcrumb` },
        mainEntity: { "@id": `${url}#dashboard` },
      },
      {
        "@type": "Dataset",
        "@id": `${url}#dashboard`,
        name: pub.title,
        description: clip(description, 5000),
        url,
        image,
        creator: { "@type": "Person", name: `@${user.handle}`, alternateName: user.handle },
        publisher: { "@type": "Organization", name: "Lychee", url: getSiteUrl() },
        keywords: [...(pub.keywords || []), ...(pub.labels || []), pub.category].filter(Boolean),
        isAccessibleForFree: !pub.password_on,
        datePublished: iso(pub.first_published_at),
        dateModified: updatedAt,
        temporalCoverage: pub.mode === "snapshot" ? iso(pub.snapshot_at) : undefined,
        variableMeasured: tabs.flatMap((tab) => tab.pieces).slice(0, 30),
        about: tabs.map((tab) => tab.about).filter(Boolean).map((name) => ({ "@type": "Thing", name })),
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Lychee", item: getSiteUrl() },
          { "@type": "ListItem", position: 2, name: pub.title, item: url },
        ],
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PublishedProjectView
        handle={user.handle}
        picture={user.picture}
        slug={pub.slug}
        title={pub.title}
        description={description}
        labels={pub.labels || []}
        category={pub.category || ""}
        mode={pub.mode}
        updatedAt={updatedAt || ""}
        headerUrl={pub.header_at ? publishedImageUrl(user.handle, pub.slug, "header", pub.header_at) : ""}
        locked={!unlocked}
        initialDoc={inline}
        summary={tabs}
      />
    </>
  );
}
