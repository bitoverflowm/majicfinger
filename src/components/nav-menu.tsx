"use client";

import {
  getNavLinksForPathname,
  isAbsoluteHomeHashHref,
  navHrefIsInPageScrollSpy,
  navHrefToSectionId,
} from "@/lib/nav-hrefs";
import type { ProductsNavData } from "@/lib/nav/products-nav";
import { ProductsNavDropdown } from "@/components/nav/products-nav-dropdown";
import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import React, { useRef, useState } from "react";

interface NavItem {
  name: string;
  href: string;
}

type NavMenuProps = {
  productsNav: ProductsNavData;
};

export function NavMenu({ productsNav }: NavMenuProps) {
  const ref = useRef<HTMLUListElement>(null);
  const pathname = usePathname();
  const navs = React.useMemo(() => getNavLinksForPathname(pathname), [pathname]);
  const [left, setLeft] = useState(0);
  const [width, setWidth] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [isManualScroll, setIsManualScroll] = useState(false);

  const syncPillToSection = React.useCallback((sectionId: string | null) => {
    if (!sectionId || !ref.current) {
      setIsReady(false);
      return;
    }
    const navItem = ref.current.querySelector(
      `[data-nav-section="${sectionId}"]`,
    )?.parentElement;
    if (!navItem) {
      setIsReady(false);
      return;
    }
    const rect = navItem.getBoundingClientRect();
    setLeft(navItem.offsetLeft);
    setWidth(rect.width);
    setIsReady(true);
  }, []);

  React.useEffect(() => {
    const handleScroll = () => {
      if (isManualScroll) return;

      const sections = navs
        .filter((item) => navHrefIsInPageScrollSpy(item.href, pathname))
        .map((item) => navHrefToSectionId(item.href))
        .filter((id): id is string => Boolean(id));

      if (!sections.length) {
        setActiveSection(null);
        setIsReady(false);
        return;
      }

      let closestSection: string | null = null;
      let minDistance = Infinity;

      for (const section of sections) {
        const element = document.getElementById(section);
        if (!element) continue;
        const rect = element.getBoundingClientRect();
        // Only highlight when the section is near/in the viewport spy band.
        if (rect.bottom < 80 || rect.top > window.innerHeight * 0.65) continue;
        const distance = Math.abs(rect.top - 100);
        if (distance < minDistance) {
          minDistance = distance;
          closestSection = section;
        }
      }

      setActiveSection(closestSection);
      syncPillToSection(closestSection);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isManualScroll, navs, pathname, syncPillToSection]);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, item: NavItem) => {
    e.preventDefault();

    if (isAbsoluteHomeHashHref(item.href)) {
      const hash = item.href.slice(2);
      if (pathname === "/") {
        const element = document.getElementById(hash);
        if (!element) return;
        setIsManualScroll(true);
        setActiveSection(hash);
        syncPillToSection(hash);
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
    syncPillToSection(targetId);

    const elementPosition = element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - 100;
    window.scrollTo({ top: offsetPosition, behavior: "smooth" });

    setTimeout(() => setIsManualScroll(false), 500);
  };

  return (
    <div className="w-full hidden md:block overflow-visible">
      <ul
        className="relative mx-auto flex w-fit rounded-full h-11 px-2 items-center justify-center overflow-visible"
        ref={ref}
      >
        <ProductsNavDropdown data={productsNav} />
        {navs.map((item) => {
          const sectionId = navHrefToSectionId(item.href);
          const isActive =
            Boolean(activeSection) &&
            activeSection === sectionId &&
            navHrefIsInPageScrollSpy(item.href, pathname);

          return (
            <li
              key={item.name}
              className={`z-10 cursor-pointer h-full flex items-center justify-center px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                isActive
                  ? "text-primary"
                  : "text-primary/60 hover:text-primary"
              } tracking-tight`}
            >
              <a
                href={item.href}
                data-nav-section={sectionId ?? undefined}
                onClick={(e) => handleClick(e, item)}
              >
                {item.name}
              </a>
            </li>
          );
        })}
        {isReady && activeSection ? (
          <motion.li
            animate={{ left, width }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="absolute inset-0 my-1.5 rounded-full bg-accent/60 border border-border"
          />
        ) : null}
      </ul>
    </div>
  );
}
