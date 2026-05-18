import { siteConfig } from "@/lib/config";
import Image from "next/image";

export function CompanyShowcase() {
  const { companyLogos } = siteConfig.companyShowcase;

  return (
    <div
      id="company"
      className="relative z-20 flex w-full flex-col items-center justify-center gap-8 px-6 pb-12 pt-4"
    >
      <p className="text-center text-sm font-medium text-muted-foreground">
        Trusted and actively beta tested by friends at
      </p>

      <div className="grid w-full max-w-7xl grid-cols-2 items-center justify-center overflow-hidden border-y border-border md:grid-cols-4">
        {companyLogos.map((logo) => (
          <div
            key={logo.id}
            className="group relative flex h-28 w-full items-center justify-center p-4 before:absolute before:-left-1 before:top-0 before:z-10 before:h-screen before:w-px before:bg-border before:content-[''] after:absolute after:-top-1 after:left-0 after:z-10 after:h-px after:w-screen after:bg-border after:content-['']"
          >
            <div className="flex h-full w-full translate-y-0 items-center justify-center transition-all duration-300 ease-landing-smooth group-hover:-translate-y-4">
              <Image
                width={120}
                height={48}
                src={logo.src}
                className="h-6 w-16 brightness-0 opacity-70 sm:h-8 sm:w-20 dark:brightness-0 dark:invert dark:hue-rotate-[200deg] dark:saturate-[400%] dark:blue-400"
                alt={`${logo.alt} logo`}
                loading="lazy"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
