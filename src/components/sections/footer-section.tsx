"use client";

import { Icons } from "@/components/icons";
import { FlickeringGrid } from "@/components/ui/flickering-grid";
import { useMediaQuery } from "@/hooks/use-media-query";
import { siteConfig } from "@/lib/config";
import { cn } from "@/lib/utils";
import { ChevronRightIcon } from "@radix-ui/react-icons";
import Link from "next/link";

function isExternal(url: string) {
  return /^https?:\/\//i.test(url);
}

export function FooterSection() {
  const tablet = useMediaQuery("(max-width: 1024px)");

  return (
    <footer id="footer" className="w-full pb-0">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between p-10 gap-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col items-start justify-start gap-y-5 max-w-md mx-0">
          <Link href="/" className="flex items-center gap-2">
            <Icons.logo className="size-8 text-primary" />
            <p className="text-xl font-semibold text-primary">{siteConfig.name}</p>
          </Link>
          <p className="tracking-tight text-muted-foreground font-medium text-sm leading-relaxed">
            {siteConfig.hero.description}
          </p>
        </div>
        <div className="pt-0 md:pt-0 md:flex-1 md:max-w-2xl">
          <div className="flex flex-col items-start justify-start md:flex-row md:items-start md:justify-between gap-y-8 lg:pl-6 flex-wrap">
            {siteConfig.footerLinks.map((column) => (
              <ul key={column.title} className="flex flex-col gap-y-2 min-w-[140px]">
                <li className="mb-2 text-sm font-semibold text-primary">
                  {column.title}
                </li>
                {column.links.map((link) => (
                  <li
                    key={link.id}
                    className="group inline-flex cursor-pointer items-center justify-start gap-1 text-[15px]/snug text-muted-foreground"
                  >
                    <Link
                      href={link.url}
                      className="hover:text-foreground transition-colors"
                      {...(isExternal(link.url)
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})}
                    >
                      {link.title}
                    </Link>
                    <div className="flex size-4 items-center justify-center border border-border rounded translate-x-0 transform opacity-0 transition-all duration-300 ease-out group-hover:translate-x-1 group-hover:opacity-100">
                      <ChevronRightIcon className="h-4 w-4" />
                    </div>
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </div>
      </div>

      <div className="w-full h-48 md:h-64 relative mt-16 z-0 border-t border-border/40">
        <div className="absolute inset-0 bg-gradient-to-t from-transparent to-background z-10 from-40%" />
        <div className="absolute inset-0 mx-6 flex items-center justify-center overflow-hidden rounded-lg">
          <FlickeringGrid
            className="h-full w-full"
            squareSize={2}
            gridGap={tablet ? 2 : 3}
            color="#6B7280"
            maxOpacity={0.3}
            flickerChance={0.1}
          />
          <p
            className={cn(
              "pointer-events-none absolute z-[5] text-center font-semibold tracking-tight text-muted-foreground/40 select-none px-4",
              tablet ? "text-5xl" : "text-6xl md:text-7xl",
            )}
          >
            {tablet ? "Lychee" : "From data to insight"}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto border-t border-border py-6 px-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-sm text-muted-foreground">
        <span>
          © {new Date().getFullYear()}{" "}
          <Link href="/" className="text-foreground hover:underline">
            {siteConfig.name}
          </Link>
        </span>
        <ul className="flex flex-wrap gap-x-6 gap-y-2">
          <li>
            <Link href="/privacy" className="hover:text-foreground hover:underline">
              Privacy
            </Link>
          </li>
          <li>
            <Link href="/terms" className="hover:text-foreground hover:underline">
              Terms
            </Link>
          </li>
        </ul>
      </div>
    </footer>
  );
}
