import Link from "next/link";

import { getContentBySlug } from "@/lib/content";
import { LANDING_FEATURED_RESOURCE_LINKS } from "@/lib/landingFeaturedResources";
import { FeaturedResourcesActions } from "@/components/sections/featured-resources-actions";
import {
  FeaturedResourcesCarousel,
  type FeaturedResourceCard,
} from "@/components/sections/featured-resources-carousel";

function resolveFeaturedCards(): FeaturedResourceCard[] {
  return LANDING_FEATURED_RESOURCE_LINKS.map((entry): FeaturedResourceCard | null => {
    if (entry.kind === "dashboard") {
      return {
        href: entry.href,
        kind: "dashboard",
        title: entry.title,
        description: entry.description,
        image: entry.image,
      };
    }

    const item = getContentBySlug("guides", entry.slug);
    const fm = item?.frontmatter;
    return {
      href: `/guides/${entry.slug}`,
      kind: "guide",
      title: String(fm?.title || entry.slug),
      description: String(fm?.description || fm?.summary || "").trim(),
      image:
        (fm?.coverImage as string | undefined) ||
        (fm?.image as string | undefined) ||
        null,
    };
  }).filter((card): card is FeaturedResourceCard => Boolean(card?.title && card?.href));
}

export function FeaturedResourcesSection() {
  const items = resolveFeaturedCards();
  if (!items.length) return null;

  return (
    <div
      id="featured-guides"
      className="relative z-20 mx-auto w-full max-w-[min(100%,84rem)] px-6 pb-14 pt-4 sm:px-8 md:pb-16 lg:px-10 lg:pb-20"
    >
      <div className="mx-auto max-w-6xl">
        <div
          id="featured-guides-mockup"
          data-featured-guides-mockup
          className="relative isolate size-full rounded-2xl border border-border bg-background shadow-xl ring-1 ring-border/60"
        >
          <div className="space-y-8 px-5 py-8 sm:px-8 sm:py-10 md:px-10 md:py-12">
            <div className="space-y-3 text-center">
              <h2 className="mx-auto max-w-2xl text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-3xl md:text-4xl">
                Featured workflows, showcase and How-tos
              </h2>
              <p className="mx-auto max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
                Step-by-step guides and published dashboards -- so you know what is possible with
                Lychee
              </p>
            </div>

            <FeaturedResourcesCarousel items={items} />

            <FeaturedResourcesActions />

            <div className="mx-auto max-w-3xl rounded-xl border border-border/70 bg-muted/25 px-5 py-5 text-center sm:px-6 sm:py-6">
              <p className="text-sm leading-relaxed text-muted-foreground md:text-[15px]">
                <span className="font-medium text-foreground">
                  Want your analysis on our homepage?
                </span>{" "}
                Run your analysis in Lychee, publish a chart or dashboard, and we may feature
                standout community work on the homepage.
              </p>
              <div className="mt-4 flex justify-center">
                <Link
                  href="/#pricing"
                  className="inline-flex h-9 items-center justify-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
                  prefetch={false}
                >
                  View pricing
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
