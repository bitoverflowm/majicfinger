import { siteConfig } from "@/lib/config";
import Image from "next/image";

export function CompanyShowcase() {
  const { companyLogos } = siteConfig.companyShowcase;

  return (
    <div
      id="company"
      className="relative z-20 flex w-full flex-col items-center justify-center gap-3 px-6 pb-2 pt-8"
    >
      <p className="text-center text-xs font-medium text-muted-foreground">
        Trusted and actively beta tested by friends at
      </p>

      <div className="grid w-full max-w-5xl grid-cols-4 items-center justify-center overflow-hidden border-y border-border md:grid-cols-8">
        {companyLogos.map((logo) => (
          <div
            key={logo.id}
            className="group relative flex h-14 w-full items-center justify-center p-2 before:absolute before:-left-1 before:top-0 before:z-10 before:h-screen before:w-px before:bg-border before:content-[''] after:absolute after:-top-1 after:left-0 after:z-10 after:h-px after:w-screen after:bg-border after:content-['']"
          >
            <div className="flex h-full w-full translate-y-0 items-center justify-center transition-all duration-300 ease-landing-smooth group-hover:-translate-y-1">
              <Image
                width={120}
                height={48}
                src={logo.src}
                className="h-5 w-14 brightness-0 opacity-70 sm:h-6 sm:w-16 dark:brightness-0 dark:invert dark:hue-rotate-[200deg] dark:saturate-[400%] dark:blue-400"
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
