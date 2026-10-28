import Link from "next/link";

import { siteConfig } from "@/lib/config";

const LINK_CLASS = "w-fit text-sm text-secondary transition-colors hover:text-primary";

const REDUCED_MOTION = `@media (prefers-reduced-motion: reduce) { #growth [class*="fx-"] { animation: none !important; transition: none !important; } }`;

export function GrowthSection() {
  const { title, items } = siteConfig.growthSection;

  return (
    <section id="growth" className="relative w-full scroll-mt-28">
      <style dangerouslySetInnerHTML={{ __html: REDUCED_MOTION }} />
      <div className="mx-auto w-full max-w-[min(100%,84rem)] px-6 py-12 sm:px-8 md:py-16 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-2xl font-normal tracking-tight text-primary sm:text-3xl">{title}</h2>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 md:mt-10 md:grid-cols-2">
          {items.map((item) => (
            <article key={item.id} className="flex flex-col rounded-xl bg-muted p-2 sm:p-3">
              <div className="px-3 pb-6 pt-3 text-[1.0625rem] leading-snug tracking-tight sm:px-4 sm:pt-4">
                <h3 className="font-normal text-primary">{item.title}</h3>
                <p className="max-w-xl text-muted-foreground">{item.description}</p>
                {item.ctas.length ? (
                  <div className="mt-4 flex flex-col gap-1.5">
                    {item.ctas.map((cta) => (
                      <Link key={cta.href} href={cta.href} className={LINK_CLASS}>
                        {cta.label} →
                      </Link>
                    ))}
                  </div>
                ) : null}
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
