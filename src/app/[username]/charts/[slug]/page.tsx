import type { Metadata } from "next";
import PublicChartEmbedClient from "@/components/publicEmbed/PublicChartEmbedClient";
import { getPublicChartMeta } from "@/lib/server/publicChartMeta";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://lycheedata.com";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string; slug: string }>;
}): Promise<Metadata> {
  const { username, slug } = await params;
  const meta = await getPublicChartMeta(username, slug);
  const title = meta?.chart_name ? `${meta.chart_name} · ${username}` : `Chart · ${username}`;
  const description = meta?.chart_name
    ? `Interactive chart "${meta.chart_name}" by @${username} on Lychee.`
    : `Interactive chart by @${username} on Lychee Data.`;
  const path = `/${encodeURIComponent(username)}/charts/${encodeURIComponent(slug)}`;
  const canonical = `${SITE}${path}`;
  const ogImage = meta?.og_image_url
    ? `${SITE}${meta.og_image_url.startsWith("/") ? meta.og_image_url : `/${meta.og_image_url}`}`
    : `${SITE}/ogImage2.png`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "Lychee Data",
      type: "website",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
    robots: {
      index: true,
      follow: true,
    },
    keywords: ["charts", "interactive charts", "data visualization", username, meta?.chart_name].filter(Boolean),
  };
}

export default async function PublicChartPage({
  params,
}: {
  params: Promise<{ username: string; slug: string }>;
}) {
  const { username, slug } = await params;
  const meta = await getPublicChartMeta(username, slug);
  const path = `/${encodeURIComponent(username)}/charts/${encodeURIComponent(slug)}`;
  const canonical = `${SITE}${path}`;
  const title = meta?.chart_name ? `${meta.chart_name} · ${username}` : `Chart · ${username}`;
  const description = meta?.chart_name
    ? `Interactive chart "${meta.chart_name}" by @${username} on Lychee.`
    : `Interactive chart by @${username} on Lychee Data.`;
  const ogImage = meta?.og_image_url
    ? `${SITE}${meta.og_image_url.startsWith("/") ? meta.og_image_url : `/${meta.og_image_url}`}`
    : `${SITE}/ogImage2.png`;
  const chartJsonLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: title,
    description,
    url: canonical,
    image: ogImage,
    creator: {
      "@type": "Person",
      name: username,
    },
    publisher: {
      "@type": "Organization",
      name: "Lychee",
      url: SITE,
    },
  };
  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(chartJsonLd) }}
      />
      <PublicChartEmbedClient username={username} slug={slug} />
    </div>
  );
}
