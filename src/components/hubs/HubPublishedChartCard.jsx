"use client";

import Link from "next/link";
import Image from "next/image";
import { RunForYourselfButton } from "@/components/runYourself/RunForYourselfButton";

/**
 * @param {{
 *   username: string;
 *   slug: string;
 *   title: string;
 *   hasOgImage: boolean;
 *   priority?: boolean;
 * }} props
 */
export function HubPublishedChartCard({ username, slug, title, hasOgImage, priority = false }) {
  const href = `/${encodeURIComponent(username)}/charts/${encodeURIComponent(slug)}`;
  const ogImage = hasOgImage
    ? `/api/public/charts/${encodeURIComponent(username)}/${encodeURIComponent(slug)}/og-image`
    : null;

  return (
    <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card/40 transition-all hover:border-primary/30 hover:shadow-md">
      <Link href={href} className="group block min-w-0 flex-1" prefetch={false}>
        {ogImage ? (
          <div className="relative aspect-[40/21] w-full overflow-hidden border-b border-border/60">
            <Image
              className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              src={ogImage}
              alt={title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              priority={priority}
            />
          </div>
        ) : (
          <div className="flex aspect-[40/21] items-center justify-center border-b border-border/60 bg-muted text-sm text-muted-foreground">
            Chart
          </div>
        )}
        <div className="p-5 pb-3">
          <h3 className="text-base font-medium text-foreground group-hover:text-primary line-clamp-2">
            {title}
          </h3>
          <p className="mt-2 text-xs text-muted-foreground">@{username}</p>
        </div>
      </Link>
      <div className="mt-auto border-t border-border/60 px-5 py-4">
        <RunForYourselfButton
          ownerHandle={username}
          chartSlug={slug}
          kind="chart"
          displayName={title}
          className="w-full justify-center shadow-none gap-1.5 rounded-full px-4 font-semibold"
        />
      </div>
    </article>
  );
}
