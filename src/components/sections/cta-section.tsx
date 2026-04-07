import Image from "next/image";
import { siteConfig } from "@/lib/config";
import Link from "next/link";

export function CTASection() {
  const { ctaSection } = siteConfig;

  return (
    <section
      id="cta"
      className="flex flex-col items-center justify-center w-full px-5 md:px-10"
    >
      <div className="w-full max-w-7xl">
        <div className="h-[400px] md:h-[400px] overflow-hidden shadow-xl w-full border border-border rounded-xl bg-secondary relative z-20">
          <Image
            src={ctaSection.backgroundImage}
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-right md:object-center"
            fill
            priority
            sizes="(max-width: 768px) 100vw, min(1280px, 100vw)"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent md:from-black/50" />
          <div className="absolute inset-0 -top-32 md:-top-40 flex flex-col items-center justify-center px-4">
            <h2 className="text-white text-4xl md:text-7xl font-medium tracking-tighter max-w-xs md:max-w-3xl text-center drop-shadow-sm">
              {ctaSection.title}
            </h2>
            <div className="absolute bottom-10 flex flex-col items-center justify-center gap-2">
              <Link
                href={ctaSection.button.href}
                className="bg-white text-black font-semibold text-sm h-10 w-fit px-6 rounded-full flex items-center justify-center shadow-md hover:opacity-95 transition-opacity"
              >
                {ctaSection.button.text}
              </Link>
              <span className="text-white/90 text-sm text-center max-w-md">
                {ctaSection.subtext}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
