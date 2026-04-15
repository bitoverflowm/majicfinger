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
  const path = `/${encodeURIComponent(username)}/charts/${encodeURIComponent(slug)}`;
  const canonical = `${SITE}${path}`;
  return {
    title,
    description: `Interactive chart by @${username} on Lychee Data.`,
    alternates: { canonical },
    openGraph: {
      title,
      url: canonical,
      siteName: "Lychee Data",
      type: "website",
    },
  };
}

export default async function PublicChartPage({
  params,
}: {
  params: Promise<{ username: string; slug: string }>;
}) {
  const { username, slug } = await params;
  return (
    <div className="min-h-screen bg-background">
      <PublicChartEmbedClient username={username} slug={slug} />
    </div>
  );
}
