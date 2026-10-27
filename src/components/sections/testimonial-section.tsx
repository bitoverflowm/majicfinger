/* eslint-disable @next/next/no-img-element */
import { siteConfig } from "@/lib/config";

export function TestimonialSection() {
  const { testimonials, testimonialSection } = siteConfig;

  return (
    <section id="testimonials" className="relative w-full scroll-mt-28">
      <div className="mx-auto w-full max-w-[min(100%,84rem)] px-6 py-12 sm:px-8 md:py-16 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-2xl font-normal tracking-tight text-primary sm:text-3xl">
            {testimonialSection.title}
          </h2>
          <p className="mt-2 text-balance text-muted-foreground">{testimonialSection.description}</p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 md:mt-10 lg:grid-cols-3">
          {testimonials.map((t) => (
            <a
              key={t.id}
              href={t.src}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col rounded-xl bg-muted p-5 transition-colors hover:bg-black/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:hover:bg-white/[0.07] sm:p-6"
            >
              <div className="text-[0.9375rem] leading-relaxed text-primary [&>p]:after:content-['”'] [&>p]:before:content-['“'] [&_span]:bg-transparent [&_span]:px-[3px] [&_span]:py-0 [&_span]:font-semibold">
                {t.description}
              </div>
              <div className="mt-auto flex items-center gap-3 pt-8">
                <img
                  src={t.img}
                  alt=""
                  loading="lazy"
                  className="size-9 shrink-0 rounded-full bg-background object-cover"
                />
                <div className="min-w-0 text-sm leading-tight">
                  <p className="truncate text-primary">{t.name}</p>
                  <p className="truncate text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
