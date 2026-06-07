import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PublicDashboardEmbedClient from "@/components/publicEmbed/PublicDashboardEmbedClient";
import { PublicDashboardSeoNav } from "@/components/publicEmbed/PublicDashboardSeoNav";
import { getPublicDashboardMeta } from "@/lib/server/publicDashboardMeta";
import { getPublicDashboardPayload } from "@/lib/server/publicDashboardPayload";
import {
  buildDashboardJsonLd,
  buildDashboardMetadata,
  extractDashboardSeoSummary,
  resolveClusterForDashboardMeta,
} from "@/lib/server/publicDashboardSeo";

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
  const payload = await getPublicDashboardPayload(username, slug);
  const summary = extractDashboardSeoSummary(payload);
  return buildDashboardMetadata(meta, username, slug, summary);
}

export default async function PublicDashboardPage({
  params,
}: {
  params: Promise<{ username: string; slug: string }>;
}) {
  const { username, slug } = await params;
  const [initialPayload, meta] = await Promise.all([
    getPublicDashboardPayload(username, slug),
    getPublicDashboardMeta(username, slug),
  ]);

  if (!initialPayload.success || !meta) {
    notFound();
  }

  const summary = extractDashboardSeoSummary(initialPayload);
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
      <PublicDashboardSeoNav
        username={username}
        slug={slug}
        dashboardTitle={meta.project_name}
        cluster={cluster}
      />
      <PublicDashboardEmbedClient
        username={username}
        slug={slug}
        initialPayload={initialPayload}
        clusterHref={cluster?.href ?? null}
      />
    </div>
  );
}
