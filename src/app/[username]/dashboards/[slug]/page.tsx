import type { Metadata } from "next";
import PublicDashboardEmbedClient from "@/components/publicEmbed/PublicDashboardEmbedClient";
import { getPublicDashboardMeta } from "@/lib/server/publicDashboardMeta";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://lycheedata.com";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string; slug: string }>;
}): Promise<Metadata> {
  const { username, slug } = await params;
  const meta = await getPublicDashboardMeta(username, slug);
  const title = meta?.project_name ? `${meta.project_name} · ${username}` : `Dashboard · ${username}`;
  const path = `/${encodeURIComponent(username)}/dashboards/${encodeURIComponent(slug)}`;
  const canonical = `${SITE}${path}`;
  return {
    title,
    description: `Dashboard by @${username} on Lychee Data.`,
    alternates: { canonical },
    openGraph: {
      title,
      url: canonical,
      siteName: "Lychee",
      type: "website",
    },
  };
}

export default async function PublicDashboardPage({
  params,
}: {
  params: Promise<{ username: string; slug: string }>;
}) {
  const { username, slug } = await params;
  return (
    <div className="min-h-screen bg-background">
      <PublicDashboardEmbedClient username={username} slug={slug} />
    </div>
  );
}
