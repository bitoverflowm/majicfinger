import { siteConfig } from "@/lib/config";
import { FeatureCardMedia } from "./feature-card-media";

export function FeatureSection() {
  const { title, description, items } = siteConfig.featureSection;

  return (
    <section id="features" className="relative w-full scroll-mt-28">
      <div className="mx-auto w-full max-w-[min(100%,84rem)] px-6 py-12 sm:px-8 md:py-16 lg:px-10">
        <div className="max-w-2xl">
          <h2 className="text-xl font-normal tracking-tight text-primary sm:text-2xl">{title}</h2>
          <p className="mt-1 text-muted-foreground">{description}</p>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:mt-8 lg:grid-cols-3">
          {items.map((item) => (
            <article key={item.id} className="flex flex-col rounded-xl bg-muted p-2 sm:p-3">
              <div className="px-3 pb-6 pt-3 text-[1.0625rem] leading-snug tracking-tight sm:px-4 sm:pt-4">
                <h3 className="font-normal text-primary">{item.title}</h3>
                <p className="text-muted-foreground">{item.content}</p>
              </div>
              <div className="mt-auto">
                {item.liveMedia ? <FeatureCardMedia media={item.liveMedia} /> : null}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
