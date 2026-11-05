import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PublicDashboardEmbedClient from "@/components/publicEmbed/PublicDashboardEmbedClient";
import { PublicDashboardHeader } from "@/components/publicEmbed/PublicDashboardHeader";
import { PublicDashboardChartSeoLayer } from "@/components/publicEmbed/PublicDashboardChartSeoLayer";
import { PublishedDashboardMoreSection } from "@/components/publicEmbed/PublishedDashboardMoreSection";
import { PublicDashboardSeoNav } from "@/components/publicEmbed/PublicDashboardSeoNav";
import { FooterSection } from "@/components/sections/footer-section";
import { getPublicDashboardPageContext } from "@/lib/server/publicDashboardPageContext";
import { chunkChartIds, layoutChartIds, publicChartChunkUrl } from "@/lib/publicDashboardChartChunks";
import {
  buildDashboardJsonLd,
  buildDashboardMetadata,
  extractDashboardSeoSummary,
  resolveClusterForDashboardMeta,
} from "@/lib/server/publicDashboardSeo";

/** HTML shell only — chart data loads client-side in CDN-cacheable groups. */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string; slug: string }>;
}): Promise<Metadata> {
  const { username, slug } = await params;
  const ctx = await getPublicDashboardPageContext(username, slug);
  if (!ctx?.meta) {
    return { robots: { index: false, follow: false } };
  }
  return buildDashboardMetadata(ctx.meta, username, slug);
}

function isoOrNull(value: unknown): string | null {
  if (!value) return null;
  const date = new Date(value as string);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export default async function PublicDashboardPage({
  params,
}: {
  params: Promise<{ username: string; slug: string }>;
}) {
  const { username, slug } = await params;
  const ctx = await getPublicDashboardPageContext(username, slug);

  if (!ctx?.shellPayload?.success || !ctx.meta) {
    notFound();
  }

  const { shellPayload, meta } = ctx;
  const data = shellPayload.data;

  const summary = extractDashboardSeoSummary(shellPayload);
  const cluster = resolveClusterForDashboardMeta(meta);
  const jsonLd = buildDashboardJsonLd({ meta, username, slug, summary, cluster });
  const firstChunk = chunkChartIds(layoutChartIds(data?.layout))[0];
  const title = data?.page_heading?.trim() || data?.dashboard_name?.trim() || slug.replace(/-/g, " ");

  return (
    <div className="min-h-screen bg-background">
      {firstChunk?.length ? (
        <link
          rel="preload"
          as="fetch"
          href={publicChartChunkUrl(username, slug, firstChunk)}
          crossOrigin="use-credentials"
        />
      ) : null}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd.webPage) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd.breadcrumb) }}
      />
      <PublicDashboardChartSeoLayer layout={data?.layout} />
      <PublicDashboardSeoNav
        username={username}
        slug={slug}
        dashboardTitle={meta.project_name}
        cluster={cluster}
      />
      <PublicDashboardHeader
        username={username}
        slug={slug}
        title={title}
        subheading={data?.page_subheading?.trim() || ""}
        ownerHandle={data?.owner_handle || username}
        ownerPic={data?.owner_profile_pic || null}
        tags={data?.tags || []}
        liveBacked={!!data?.live_backed}
        cluster={cluster ? { title: cluster.title, href: cluster.href } : null}
        updatedAt={isoOrNull(meta.last_edited_date || meta.published_at)}
        displayName={data?.dashboard_name || title}
      />
      <PublicDashboardEmbedClient username={username} slug={slug} initialPayload={shellPayload} />
      <Suspense fallback={null}>
        <PublishedDashboardMoreSection excludeUsername={username} excludeSlug={slug} limit={24} />
      </Suspense>
      <div className="mt-16 border-t border-border/60">
        <FooterSection />
      </div>
    </div>
  );
}
