import { siteConfig } from "@/lib/config";
import Link from "next/link";
import Image from "next/image";

export function CompanyShowcase() {
  const { companyShowcase } = siteConfig;
  const visibleLogos = companyShowcase.companyLogos.filter(
    (logo) => !!logo.href && logo.href !== "#",
  );

  if (visibleLogos.length === 0) {
    return null;
  }

  return (
    <section
      id="company"
      className="flex flex-col items-center justify-center gap-10 py-10 pt-20 w-full relative px-6"
    >
      <p className="text-muted-foreground font-medium">
        Trusted and actively beta tested by friends at
      </p>

      <div className="grid w-full max-w-7xl grid-cols-2 md:grid-cols-4 overflow-hidden border-y border-border items-center justify-center z-20">
        {visibleLogos.map((logo) => (
          <Link
            href={logo.href}
            className="group w-full h-28 flex items-center justify-center relative p-4 before:absolute before:-left-1 before:top-0 before:z-10 before:h-screen before:w-px before:bg-border before:content-[''] after:absolute after:-top-1 after:left-0 after:z-10 after:h-px after:w-screen after:bg-border after:content-['']"
            key={logo.id}
          >
            <div className="transition-all duration-300 ease-landing-smooth translate-y-0 group-hover:-translate-y-4 flex items-center justify-center w-full h-full">
              <Image
                width={120}
                height={48}
                src={logo.src}
                className="h-6 w-16 sm:h-8 sm:w-20 brightness-0 opacity-70 dark:brightness-0 dark:invert dark:blue-400 dark:hue-rotate-[200deg] dark:saturate-[400%]"
                alt={logo.alt}
              />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

