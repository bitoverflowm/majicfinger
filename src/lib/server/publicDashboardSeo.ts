import type { Metadata } from "next";
import type { PublicDashboardPayload } from "@/lib/server/publicDashboardPayload";
import { resolveClusterForTags, type DashboardCluster } from "@/lib/server/dashboardClusterMap";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://lycheedata.com";

export type PublicDashboardMetaRecord = {
  project_name: string;
  seo_title: string;
  description: string;
  tags: string[];
  keywords: string[];
  published_at: Date | string | null;
  last_edited_date?: Date | string | null;
  has_og_image_data: boolean;
};

export type DashboardSeoSummary = {
  chartCount: number;
  textBlockCount: number;
  hasNarrative: boolean;
  chartTitles: string[];
  sectionHeadings: string[];
};

function toIsoDate(d: unknown): string | undefined {
  if (!d) return undefined;
  const date = d instanceof Date ? d : new Date(String(d));
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

export function extractDashboardSeoSummary(payload: PublicDashboardPayload): DashboardSeoSummary {
  const rows = Array.isArray(payload.data?.layout?.rows) ? payload.data!.layout!.rows! : [];
  let chartCount = 0;
  let textBlockCount = 0;
  const chartTitles: string[] = [];
  const sectionHeadings: string[] = [];

  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    if (row.type === "text" && String((row as { body?: string }).body || "").trim()) {
      textBlockCount += 1;
    }
    if (row.type === "text" && (row as { textVariant?: string }).textVariant === "heading") {
      const body = String((row as { body?: string }).body || "").trim();
      if (body) sectionHeadings.push(body);
    }
    if (row.type === "cardGrid") {
      const h2 = String((row as { h2?: string }).h2 || "").trim();
      if (h2) sectionHeadings.push(h2);
    }
    if (row.type === "cards" && Array.isArray((row as { columns?: unknown[] }).columns)) {
      for (const col of (row as { columns: Array<Record<string, unknown>> }).columns) {
        if (col?.chart_id || col?.chartPayload) chartCount += 1;
        const h2 = String(col?.h2 || "").trim();
        if (h2) chartTitles.push(h2);
        const chartName = String(
          (col?.chartPayload as { chart?: { chart_name?: string } })?.chart?.chart_name || "",
        ).trim();
        if (chartName && !chartTitles.includes(chartName)) chartTitles.push(chartName);
      }
    }
  }

  const hasNarrative =
    textBlockCount > 0 || Boolean(String(payload.data?.page_subheading || "").trim());

  return { chartCount, textBlockCount, hasNarrative, chartTitles, sectionHeadings };
}

export function buildDashboardPageTitle(meta: PublicDashboardMetaRecord, username: string): string {
  const base = meta.seo_title || meta.project_name;
  const clusterHint = meta.tags.slice(0, 2).join(" · ");
  if (clusterHint && !base.toLowerCase().includes(meta.tags[0]?.toLowerCase() || "")) {
    return `${base} · ${clusterHint} · ${username}`;
  }
  return `${base} · ${username}`;
}

export function buildDashboardDescription(
  meta: PublicDashboardMetaRecord,
  username: string,
  summary: DashboardSeoSummary,
): string {
  const base = meta.description?.trim();
  if (base) return base.slice(0, 300);
  const parts = [
    summary.chartCount
      ? `${summary.chartCount} interactive chart${summary.chartCount === 1 ? "" : "s"}`
      : "",
    meta.tags.length ? meta.tags.slice(0, 3).join(", ") : "",
  ].filter(Boolean);
  const suffix = parts.length ? ` — ${parts.join(" · ")}` : "";
  return `Interactive data dashboard${suffix} by @${username} on Lychee Data.`.slice(0, 300);
}

export function buildDashboardMetadata(
  meta: PublicDashboardMetaRecord,
  username: string,
  slug: string,
  summary?: DashboardSeoSummary,
): Metadata {
  const seoSummary = summary || { chartCount: 0, textBlockCount: 0, hasNarrative: false, chartTitles: [], sectionHeadings: [] };
  const displayTitle = buildDashboardPageTitle(meta, username);
  const description =
    meta.description?.trim().slice(0, 300) ||
    (seoSummary.chartCount
      ? `${displayTitle.split(" · ")[0]} — ${seoSummary.chartCount} chart${seoSummary.chartCount === 1 ? "" : "s"} on ${meta.tags.slice(0, 2).join(", ") || "Lychee Data"}.`
      : `Dashboard by @${username} on Lychee Data.`);

  const path = `/${encodeURIComponent(username)}/dashboards/${encodeURIComponent(slug)}`;
  const canonical = `${SITE}${path}`;
  const dynamicOgImagePath = `/api/public/dashboards/${encodeURIComponent(username)}/${encodeURIComponent(slug)}/og-image`;
  const ogImage = meta.has_og_image_data ? `${SITE}${dynamicOgImagePath}` : `${SITE}/ogImage2.png`;
  const publishedTime = toIsoDate(meta.published_at);
  const modifiedTime = toIsoDate(meta.last_edited_date || meta.published_at);

  return {
    metadataBase: new URL(SITE),
    title: { absolute: displayTitle },
    description,
    alternates: { canonical },
    authors: [{ name: username, url: `${SITE}/${encodeURIComponent(username)}` }],
    keywords: [
      "dashboards",
      "analytics",
      "data visualization",
      username,
      ...meta.tags,
      ...meta.keywords,
      ...(meta.seo_title ? [meta.seo_title] : []),
    ],
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
      description,
      url: canonical,
      siteName: "Lychee",
      type: "website",
      locale: "en",
      ...(publishedTime && { publishedTime }),
      ...(modifiedTime && { modifiedTime }),
      images: [{ url: ogImage, width: 1200, height: 630, alt: displayTitle }],
    },
    twitter: {
      card: "summary_large_image",
      title: displayTitle,
      description,
      images: [ogImage],
    },
  };
}

export function buildDashboardJsonLd(args: {
  meta: PublicDashboardMetaRecord;
  username: string;
  slug: string;
  summary: DashboardSeoSummary;
  cluster: DashboardCluster | null;
}) {
  const { meta, username, slug, summary, cluster } = args;
  const displayTitle = buildDashboardPageTitle(meta, username);
  const path = `/${encodeURIComponent(username)}/dashboards/${encodeURIComponent(slug)}`;
  const canonical = `${SITE}${path}`;
  const description =
    meta.description?.trim().slice(0, 500) ||
    `Interactive data dashboard with ${summary.chartCount || "multiple"} visualizations.`;
  const dynamicOgImagePath = `/api/public/dashboards/${encodeURIComponent(username)}/${encodeURIComponent(slug)}/og-image`;
  const ogImage = meta.has_og_image_data ? `${SITE}${dynamicOgImagePath}` : `${SITE}/ogImage2.png`;
  const publishedTime = toIsoDate(meta.published_at);
  const modifiedTime = toIsoDate(meta.last_edited_date || meta.published_at);
  const keywords = [...meta.tags, ...meta.keywords].filter(Boolean).join(", ");

  const webPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: displayTitle,
    description,
    url: canonical,
    image: ogImage,
    ...(publishedTime && { datePublished: publishedTime }),
    ...(modifiedTime && { dateModified: modifiedTime }),
    ...(keywords && { keywords }),
    author: { "@type": "Person", name: username, url: `${SITE}/${encodeURIComponent(username)}` },
    publisher: { "@type": "Organization", name: "Lychee", url: SITE },
    isPartOf: { "@type": "WebSite", name: "Lychee", url: SITE },
    mainEntity: {
      "@type": "Dataset",
      name: meta.seo_title || meta.project_name,
      description,
      url: canonical,
      ...(meta.tags.length && { keywords: meta.tags.join(", ") }),
      creator: { "@type": "Person", name: username },
    },
    ...(cluster && {
      about: { "@type": "Thing", name: cluster.title, url: `${SITE}${cluster.href}` },
    }),
  };

  const breadcrumbItems = [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE },
    { "@type": "ListItem", position: 2, name: "Dashboards", item: `${SITE}/dashboards-gallery` },
  ];
  if (cluster) {
    breadcrumbItems.push({
      "@type": "ListItem",
      position: 3,
      name: cluster.title,
      item: `${SITE}${cluster.href}`,
    });
    breadcrumbItems.push({
      "@type": "ListItem",
      position: 4,
      name: meta.project_name,
      item: canonical,
    });
  } else {
    breadcrumbItems.push({
      "@type": "ListItem",
      position: 3,
      name: meta.project_name,
      item: canonical,
    });
  }

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbItems,
  };

  return { webPage, breadcrumb };
}

export function resolveClusterForDashboardMeta(meta: PublicDashboardMetaRecord): DashboardCluster | null {
  return resolveClusterForTags(meta.tags);
}
