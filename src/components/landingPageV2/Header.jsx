"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { landingPageV2Config } from "@/lib/landingPageV2Config";
import Drawer from "./Drawer";
import Menu from "./Menu";
import { Icons } from "./Icons";
import { TwitterLogoIcon } from "@radix-ui/react-icons";

export default function Header() {
  const [addBorder, setAddBorder] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setAddBorder(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className="sticky top-0 z-50 py-2 bg-background/60 backdrop-blur">
      <div className="flex justify-between items-center container mx-auto">
        <Link
          href="/"
          title="brand-logo"
          className="relative mr-6 flex items-center"
        >
          <Icons.logo width={40} height={40} className="w-8 h-8 brightness-0 dark:invert" />
          <span className="font-black text-2xl mt-1">{landingPageV2Config.name}</span>
        </Link>

        <div className="hidden lg:block">
          <div className="flex items-center">
            <nav className="mr-10 flex items-center gap-4">
              <Menu />
              <Link
                href={landingPageV2Config.links.twitter}
                rel="noopener noreferrer"
                target="_blank"
                className="cursor-pointer text-foreground hover:text-primary transition-colors"
              >
                <TwitterLogoIcon className="w-5 h-5" />
              </Link>
            </nav>
            <div className="gap-2 flex">
              <Link href="/login" className={buttonVariants({ variant: "outline" })}>
                Login
              </Link>
              <Link
                href="/#pricing"
                className={cn(
                  buttonVariants({ variant: "default" }),
                  "w-full sm:w-auto text-background flex gap-2"
                )}
              >
                Get Started for Free
              </Link>
            </div>
          </div>
        </div>
        <div className="mt-2 cursor-pointer block lg:hidden">
          <Drawer />
        </div>
      </div>
      <hr
        className={cn(
          "absolute w-full bottom-0 transition-opacity duration-300 ease-in-out",
          addBorder ? "opacity-100" : "opacity-0"
        )}
      />
    </header>
  );
}
