import type { Metadata } from "next";
import PublicDashboardEmbedClient from "@/components/publicEmbed/PublicDashboardEmbedClient";
import { getPublicDashboardMeta } from "@/lib/server/publicDashboardMeta";
import { getPublicDashboardPayload } from "@/lib/server/publicDashboardPayload";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://lycheedata.com";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string; slug: string }>;
}): Promise<Metadata> {
  const { username, slug } = await params;
  const meta = await getPublicDashboardMeta(username, slug);
  const baseTitle = meta?.seo_title || meta?.project_name;
  const title = baseTitle ? `${baseTitle} · ${username}` : `Dashboard · ${username}`;
  const description = meta?.description
    ? String(meta.description).slice(0, 300)
    : `Dashboard by @${username} on Lychee Data.`;
  const path = `/${encodeURIComponent(username)}/dashboards/${encodeURIComponent(slug)}`;
  const canonical = `${SITE}${path}`;
  const dynamicOgImagePath = `/api/public/dashboards/${encodeURIComponent(username)}/${encodeURIComponent(slug)}/og-image`;
  const ogImage = meta?.has_og_image_data ? `${SITE}${dynamicOgImagePath}` : `${SITE}/ogImage2.png`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "Lychee",
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
    keywords: [
      "dashboards",
      "analytics",
      username,
      ...(Array.isArray(meta?.tags) ? meta.tags : []),
      ...(Array.isArray(meta?.keywords) ? meta.keywords : []),
      ...(baseTitle ? [baseTitle] : []),
    ],
  };
}

export default async function PublicDashboardPage({
  params,
}: {
  params: Promise<{ username: string; slug: string }>;
}) {
  const { username, slug } = await params;
  const initialPayload = await getPublicDashboardPayload(username, slug);
  return (
    <div className="min-h-screen bg-background">
      <PublicDashboardEmbedClient
        username={username}
        slug={slug}
        initialPayload={initialPayload}
      />
    </div>
  );
}
