import Link from "next/link";

import { siteConfig } from "@/lib/config";

export function GrowthSection() {
  const { title, description, items } = siteConfig.growthSection;

  return (
    <section id="growth" className="relative w-full scroll-mt-28">
      <div className="mx-auto w-full max-w-[min(100%,84rem)] px-6 py-12 sm:px-8 md:py-16 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-2xl font-normal tracking-tight text-primary sm:text-3xl">{title}</h2>
          <p className="mt-2 text-balance text-muted-foreground">
            {description}{" "}
            <Link
              href="/kalshi-vs-polymarket-odds"
              className="text-primary underline-offset-4 hover:underline"
            >
              Compare Kalshi vs Polymarket live odds
            </Link>
            .
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 md:mt-10 md:grid-cols-2">
          {items.map((item) => (
            <article key={item.id} className="flex flex-col rounded-xl bg-muted p-2 sm:p-3">
              <div className="px-3 pb-6 pt-3 text-[1.0625rem] leading-snug tracking-tight sm:px-4 sm:pt-4">
                <h3 className="font-normal text-primary">{item.title}</h3>
                <p className="max-w-xl text-muted-foreground">{item.description}</p>
              </div>
              <div className="relative mt-auto h-[28rem] overflow-hidden rounded-lg bg-black/[0.04] dark:bg-white/[0.04]">
                <div className="absolute inset-x-5 -bottom-px top-6 sm:inset-x-8 sm:top-8 [&>div>div]:rounded-b-none">
                  {item.content}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
