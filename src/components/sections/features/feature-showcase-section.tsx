import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { SectionHeader } from "@/components/section-header";
import { siteConfig } from "@/lib/config";
import { cn } from "@/lib/utils";
import automateBackdrop from "../../../../public/landing/feature-automate.jpg";
import connectBackdrop from "../../../../public/landing/feature-connect.jpg";
import dashboardsBackdrop from "../../../../public/landing/feature-dashboards.jpg";
import insightsBackdrop from "../../../../public/landing/feature-insights.jpg";
import { AutomateDemo } from "./automate-demo";
import { ConnectDemo } from "./connect-demo";
import { DashboardDemo } from "./dashboard-demo";
import { InsightsDemo } from "./insights-demo";

/** Demo, backdrop and link for each `siteConfig.bentoSection` item, keyed by item id. */
const SHOWCASE: Record<string, { demo: ReactNode; backdrop: StaticImageData; href: string; cta: string }> = {
  "1": { demo: <ConnectDemo />, backdrop: connectBackdrop, href: "/integrations", cta: "Explore integrations" },
  "2": { demo: <DashboardDemo />, backdrop: dashboardsBackdrop, href: "/dashboards-gallery", cta: "Browse dashboards" },
  "3": { demo: <InsightsDemo />, backdrop: insightsBackdrop, href: "/quant-analysis", cta: "See quant analysis" },
  "4": { demo: <AutomateDemo />, backdrop: automateBackdrop, href: "/kalshi-live-data", cta: "Explore live data" },
};

const KEYFRAMES = `
@keyframes fx-rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
@keyframes fx-word { from { opacity: 0; transform: translateY(4px); filter: blur(4px); } to { opacity: 1; transform: none; filter: none; } }
@keyframes fx-draw { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }
@keyframes fx-grow { from { transform: scaleY(0); } to { transform: scaleY(1); } }
@keyframes fx-fill { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes fx-fade-out { to { opacity: 0; } }
@keyframes fx-slide-in { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: none; } }
@keyframes fx-flash { from { box-shadow: 0 0 0 0 rgba(47,111,237,.45); border-color: #2f6fed; } to { box-shadow: 0 0 0 7px rgba(47,111,237,0); } }
@keyframes fx-shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
.fx-skeleton { background: linear-gradient(90deg, var(--muted) 25%, var(--border) 50%, var(--muted) 75%); background-size: 200% 100%; animation: fx-shimmer 1.2s linear infinite; }
.fx-shimmer-text { background: linear-gradient(90deg, var(--muted-foreground) 0%, var(--primary) 50%, var(--muted-foreground) 100%); background-size: 200% 100%; -webkit-background-clip: text; background-clip: text; color: transparent; animation: fx-shimmer 1.8s linear infinite; }
.fx-morph { transition: d .6s cubic-bezier(.165,.84,.44,1); }
.fx-bar { transition: y .6s cubic-bezier(.165,.84,.44,1), height .6s cubic-bezier(.165,.84,.44,1); }
@media (prefers-reduced-motion: reduce) {
  #features-showcase [class*="fx-"] { animation: none !important; transition: none !important; }
  #features-showcase .fx-skel { display: none; }
}
`;

export function FeatureShowcaseSection() {
  const { title, description, items } = siteConfig.bentoSection;

  return (
    <section id="bento" className="relative w-full scroll-mt-28">
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />
      <SectionHeader>
        <h2 className="text-balance pb-1 text-center text-3xl font-medium tracking-tighter md:text-4xl">{title}</h2>
        <p className="text-balance text-center font-medium text-muted-foreground">{description}</p>
      </SectionHeader>

      <div
        id="features-showcase"
        className="mx-auto flex w-full max-w-[min(100%,84rem)] flex-col gap-6 px-6 py-10 sm:px-8 md:py-14 lg:gap-8 lg:px-10"
      >
        {items.map((item, index) => {
          const showcase = SHOWCASE[item.id];
          if (!showcase) return null;
          const flip = index % 2 === 1;
          return (
            <article key={item.id} className="grid overflow-hidden rounded-xl bg-muted lg:grid-cols-3">
              <div
                className={cn(
                  "flex flex-col justify-center gap-4 p-6 sm:p-8 lg:px-10",
                  flip && "lg:order-2",
                )}
              >
                <div className="max-w-md text-xl leading-snug tracking-tight sm:text-[1.3rem]">
                  <h3 className="font-normal text-primary">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
                <Link
                  href={showcase.href}
                  className="w-fit text-sm text-secondary transition-colors hover:text-primary"
                >
                  {showcase.cta} →
                </Link>
              </div>
              <div className={cn("p-2 sm:p-3 lg:col-span-2", flip && "lg:order-1")}>
                <div className="relative h-[26rem] overflow-hidden rounded-lg sm:h-[30rem] lg:h-[34rem]">
                  <Image
                    src={showcase.backdrop}
                    alt=""
                    fill
                    placeholder="blur"
                    sizes="(min-width: 1344px) 860px, (min-width: 1024px) 64vw, 100vw"
                    className="pointer-events-none select-none object-cover"
                  />
                  <div className="absolute inset-3 sm:inset-8 lg:inset-10">{showcase.demo}</div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
