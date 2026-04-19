"use client";

import { siteConfig } from "@/lib/config";
import { getNavLinksForPathname, isAbsoluteHomeHashHref, navHrefToSectionId } from "@/lib/nav-hrefs";
import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import React, { useRef, useState } from "react";
import { TwitterLogoIcon } from "@radix-ui/react-icons";

interface NavItem {
  name: string;
  href: string;
}

export function NavMenu() {
  const ref = useRef<HTMLUListElement>(null);
  const pathname = usePathname();
  const navs = React.useMemo(() => getNavLinksForPathname(pathname), [pathname]);
  const [left, setLeft] = useState(0);
  const [width, setWidth] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [activeSection, setActiveSection] = useState("hero");
  const [isManualScroll, setIsManualScroll] = useState(false);

  React.useEffect(() => {
    const firstItem = ref.current?.querySelector(`[href="${navs[0]?.href}"]`)?.parentElement;
    if (firstItem) {
      const rect = firstItem.getBoundingClientRect();
      setLeft(firstItem.offsetLeft);
      setWidth(rect.width);
      setIsReady(true);
    }
  }, [navs]);

  React.useEffect(() => {
    const handleScroll = () => {
      if (isManualScroll) return;

      const sections = navs
        .map((item) => navHrefToSectionId(item.href))
        .filter((id): id is string => Boolean(id));
      let closestSection = sections[0] ?? "hero";
      let minDistance = Infinity;

      for (const section of sections) {
        const element = document.getElementById(section);
        if (!element) continue;
        const rect = element.getBoundingClientRect();
        const distance = Math.abs(rect.top - 100);
        if (distance < minDistance) {
          minDistance = distance;
          closestSection = section;
        }
      }

      setActiveSection(closestSection);
      const navItem = ref.current?.querySelector(
        `[data-nav-section="${closestSection}"]`,
      )?.parentElement;
      if (navItem) {
        const rect = navItem.getBoundingClientRect();
        setLeft(navItem.offsetLeft);
        setWidth(rect.width);
      }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isManualScroll, navs]);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, item: NavItem) => {
    e.preventDefault();

    if (isAbsoluteHomeHashHref(item.href)) {
      const hash = item.href.slice(2);
      if (pathname === "/") {
        const element = document.getElementById(hash);
        if (!element) return;
        setIsManualScroll(true);
        setActiveSection(hash);
        const navItem = e.currentTarget.parentElement;
        if (navItem) {
          const rect = navItem.getBoundingClientRect();
          setLeft(navItem.offsetLeft);
          setWidth(rect.width);
        }
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - 100;
        window.scrollTo({ top: offsetPosition, behavior: "smooth" });
        setTimeout(() => setIsManualScroll(false), 500);
      } else {
        window.location.href = item.href;
      }
      return;
    }

    const targetId = item.href.startsWith("#") ? item.href.slice(1) : "";
    if (!targetId) return;
    const element = document.getElementById(targetId);
    if (!element) return;

    setIsManualScroll(true);

    setActiveSection(targetId);
    const navItem = e.currentTarget.parentElement;
    if (navItem) {
      const rect = navItem.getBoundingClientRect();
      setLeft(navItem.offsetLeft);
      setWidth(rect.width);
    }

    const elementPosition = element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - 100;
    window.scrollTo({ top: offsetPosition, behavior: "smooth" });

    setTimeout(() => setIsManualScroll(false), 500);
  };

  return (
    <div className="w-full hidden md:block">
      <ul
        className="relative mx-auto flex w-fit rounded-full h-11 px-2 items-center justify-center"
        ref={ref}
      >
        {navs.map((item) => (
          <li
            key={item.name}
            className={`z-10 cursor-pointer h-full flex items-center justify-center px-4 py-2 text-sm font-medium transition-colors duration-200 ${
              activeSection === navHrefToSectionId(item.href)
                ? "text-primary"
                : "text-primary/60 hover:text-primary"
            } tracking-tight`}
          >
            <a
              href={item.href}
              data-nav-section={navHrefToSectionId(item.href) ?? undefined}
              onClick={(e) => handleClick(e, item)}
            >
              {item.name}
            </a>
          </li>
        ))}
        <li className="z-10 h-full flex items-center justify-center px-3 py-2">
          <a
            href={siteConfig.links.twitter}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary/60 hover:text-primary transition-colors duration-200"
            aria-label="Twitter"
          >
            <TwitterLogoIcon />
          </a>
        </li>
        {isReady && (
          <motion.li
            animate={{ left, width }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="absolute inset-0 my-1.5 rounded-full bg-accent/60 border border-border"
          />
        )}
      </ul>
    </div>
  );
}
