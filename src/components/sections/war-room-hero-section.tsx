"use client";

import Link from "next/link";
import { useMemo } from "react";

import { siteConfig } from "@/lib/config";
import { isCompactScreen } from "@/lib/desktopOnly";
import { useWarRoomPreview } from "@/components/warRoom/useWarRoomData";
import { GlobeStage } from "@/components/warRoom/GlobeStage";
import { StoryCard, type StoryLike } from "@/components/warRoom/StoryCard";
import { CompanyShowcase } from "./company-showcase";
import { JarvisHeroCallout } from "./jarvis-hero-callout";
import { HeroDescription } from "./hero-description";

const POSTER_BOX = "relative aspect-[4/3] w-full overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#070b14] sm:aspect-[5/4] lg:aspect-auto lg:min-h-[28rem]";

export function WarRoomHeroSection({ fixture = false }: { fixture?: boolean }) {
  const { hero } = siteConfig;
  const { preview, error } = useWarRoomPreview(fixture);
  const featured = (preview?.featured || preview?.stories?.[0] || null) as StoryLike | null;
  const status = String(preview?.status || (error ? "empty" : "loading"));

  const features = useMemo(() => {
    const geometry = featured?.geometry;
    if (!featured?.id || !geometry || geometry.type !== "Point") {
      return { type: "FeatureCollection" as const, features: [] };
    }
    return {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          id: featured.id,
          geometry,
          properties: {
            id: featured.id,
            title: featured.title,
            venue: featured.venue,
            marker: featured.category === "weather" ? "weather" : "geopolitics",
          },
        },
      ],
    };
  }, [featured]);

  return (
    <section id="hero" className="relative w-full overflow-visible">
      <div className="relative z-10 mx-auto grid w-full max-w-[min(100%,84rem)] gap-8 px-6 pb-10 pt-28 sm:px-8 md:pt-32 lg:grid-cols-[minmax(0,28rem)_minmax(0,1fr)] lg:items-center lg:px-10">
        <div className="flex flex-col gap-5">
          <div className="flex max-w-[34rem] flex-col gap-3 text-left">
            <h1 className="text-balance text-[1.5rem] font-normal leading-[1.25] tracking-tight text-primary sm:text-[1.625rem]">
              {hero.title}
              {hero.subtitle ? (
                <span className="block text-muted-foreground lg:whitespace-nowrap">{hero.subtitle}</span>
              ) : null}
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-[0.9375rem]">
              <HeroDescription text={hero.description} terms={hero.descriptionTerms} />
            </p>
          </div>

          {featured ? (
            <StoryCard
              story={featured}
              asOf={typeof preview?.asOf === "string" ? preview.asOf : null}
              stale={Boolean(preview?.stale)}
              fixtureLabel={typeof preview?.fixtureLabel === "string" ? preview.fixtureLabel : null}
            />
          ) : (
            <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
              <p className="text-sm text-muted-foreground">
                {status === "empty" || error
                  ? "Live markets are unavailable. The globe is up — open War Room anyway, or check back in a moment."
                  : "Loading the featured market…"}
              </p>
              <Link
                href="/war-room"
                className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-secondary px-5 text-sm font-medium text-primary-foreground"
              >
                Open War Room
              </Link>
            </div>
          )}

          {hero.cta.jarvis ? <JarvisHeroCallout cta={hero.cta.jarvis} /> : null}
        </div>

        <div className={POSTER_BOX}>
          <GlobeStage
            enhance="auto"
            features={features}
            selectedMarketId={featured?.id || null}
            interactive={false}
            onTapPoster={() => {
              if (typeof window === "undefined") return;
              if (isCompactScreen()) window.location.assign(featured?.href || "/war-room");
            }}
            className="absolute inset-0"
          />
        </div>
      </div>
      <CompanyShowcase />
    </section>
  );
}
