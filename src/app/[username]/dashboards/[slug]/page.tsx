import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PublicDashboardEmbedClient from "@/components/publicEmbed/PublicDashboardEmbedClient";
import { PublicDashboardChartSeoLayer } from "@/components/publicEmbed/PublicDashboardChartSeoLayer";
import { PublicDashboardSeoNav } from "@/components/publicEmbed/PublicDashboardSeoNav";
import { getPublicDashboardMeta } from "@/lib/server/publicDashboardMeta";
import {
  getPublicDashboardShellPayload,
} from "@/lib/server/publicDashboardPayload";
import {
  buildDashboardJsonLd,
  buildDashboardMetadata,
  extractDashboardSeoSummary,
  resolveClusterForDashboardMeta,
} from "@/lib/server/publicDashboardSeo";

/** HTML shell only — heavy chart/card data loads client-side via API. */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string; slug: string }>;
}): Promise<Metadata> {
  const { username, slug } = await params;
  const meta = await getPublicDashboardMeta(username, slug);
  if (!meta) {
    return { robots: { index: false, follow: false } };
  }
  return buildDashboardMetadata(meta, username, slug);
}

export default async function PublicDashboardPage({
  params,
}: {
  params: Promise<{ username: string; slug: string }>;
}) {
  const { username, slug } = await params;
  const [shellPayload, meta] = await Promise.all([
    getPublicDashboardShellPayload(username, slug),
    getPublicDashboardMeta(username, slug),
  ]);

  if (!shellPayload.success || !meta) {
    notFound();
  }

  const summary = extractDashboardSeoSummary(shellPayload);
  const cluster = resolveClusterForDashboardMeta(meta);
  const jsonLd = buildDashboardJsonLd({ meta, username, slug, summary, cluster });

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd.webPage) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd.breadcrumb) }}
      />
      <PublicDashboardChartSeoLayer layout={shellPayload.data?.layout} />
      <PublicDashboardSeoNav
        username={username}
        slug={slug}
        dashboardTitle={meta.project_name}
        cluster={cluster}
      />
      <PublicDashboardEmbedClient
        username={username}
        slug={slug}
        initialPayload={shellPayload}
        clusterHref={cluster?.href ?? null}
      />
    </div>
  );
}
