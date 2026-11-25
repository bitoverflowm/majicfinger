"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { ProductsNavDropdown } from "@/components/nav/products-nav-dropdown";
import { NewsNavDropdown } from "@/components/nav/news-nav-dropdown";
import { JarvisNavSearch } from "@/components/nav/jarvis-nav-search";
import { NavMoreMenu, NavMoreMenuInline } from "@/components/nav/nav-more-menu";
import type { ProductsNavData } from "@/lib/nav/products-nav";
import { useUser } from "@/lib/hooks";
import { WORKSPACE_ENTRY_PATH } from "@/lib/workspaceEntry";
import { fastLogout } from "@/lib/fastLogout";

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const drawerVariants = {
  hidden: { opacity: 0, y: 80 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", damping: 22, stiffness: 260 } },
  exit: { opacity: 0, y: 80, transition: { duration: 0.12 } },
};

export function Navbar({ productsNav }: { productsNav: ProductsNavData }) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const user = useUser();
  const pathname = usePathname();
  const pricingHref = pathname === "/" ? "/#pricing" : "/#pricing";

  const handleLogout = () =>
    fastLogout({
      email: user?.email,
      userId: user?._id || user?.userId,
    });

  const closeDrawer = () => setIsDrawerOpen(false);

  return (
    <header className="sticky top-0 z-50 w-full bg-background">
      <div className="relative mx-auto flex h-14 w-full max-w-[min(100%,88rem)] items-center px-3 sm:px-5">
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Link href="/" className="flex shrink-0 items-center gap-2 pr-2">
            <Image
              src="/logo.png"
              alt=""
              width={28}
              height={28}
              className="size-7 rounded-full object-contain"
              priority
            />
            <span className="font-black text-lg leading-none text-primary">Lychee</span>
          </Link>
          <nav className="hidden h-full items-center lg:flex">
            <ul className="flex h-14 items-center">
              <ProductsNavDropdown data={productsNav} />
            </ul>
            <NewsNavDropdown />
            <Link
              href="/jarvis"
              className="ml-1 inline-flex h-full items-center gap-1.5 px-3 text-sm font-medium text-primary/70 transition-colors hover:text-primary"
            >
              MCP
              <span className="rounded-full bg-orange-500 px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none tracking-wide text-white">
                New
              </span>
            </Link>
          </nav>
        </div>

        <div className="min-w-0 flex-1 px-2 lg:hidden">
          <JarvisNavSearch className="max-w-none" />
        </div>
        <div className="hidden min-w-0 flex-1 lg:block" aria-hidden />

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-3 lg:flex">
            <Link href={pricingHref} className="text-sm font-medium text-primary/70 hover:text-primary">
              Pricing
            </Link>
            <span className="text-border" aria-hidden>
              |
            </span>
            {!user ? (
              <Link href="/login" className="text-sm font-medium text-primary/70 hover:text-primary">
                Login
              </Link>
            ) : (
              <Link href={WORKSPACE_ENTRY_PATH} className="text-sm font-medium text-primary/70 hover:text-primary">
                Dashboard
              </Link>
            )}
            <NavMoreMenu />
          </div>
          <button
            className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border lg:hidden"
            onClick={() => setIsDrawerOpen((v) => !v)}
            type="button"
            aria-label={isDrawerOpen ? "Close menu" : "Open menu"}
          >
            {isDrawerOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 hidden h-14 lg:block">
        <div className="pointer-events-auto absolute left-1/2 top-1/2 w-[min(28rem,calc(100vw-32rem))] -translate-x-1/2 -translate-y-1/2">
          <JarvisNavSearch className="mx-auto max-w-none" />
        </div>
      </div>

      <AnimatePresence>
        {isDrawerOpen ? (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/40 lg:hidden"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={overlayVariants}
              onClick={closeDrawer}
            />
            <motion.div
              className="fixed inset-x-3 bottom-3 z-50 rounded-xl border border-border bg-background p-4 shadow-lg lg:hidden"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={drawerVariants}
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium">Menu</span>
                <button type="button" onClick={closeDrawer} aria-label="Close menu">
                  <X className="size-5" />
                </button>
              </div>
              <ul className="overflow-y-auto rounded-md border border-border">
                <ProductsNavDropdown data={productsNav} variant="mobile" />
                <li className="list-none">
                  <NewsNavDropdown variant="mobile" onNavigate={closeDrawer} />
                </li>
                <li className="border-b border-border p-3">
                  <Link href="/jarvis" onClick={closeDrawer} className="inline-flex items-center gap-2 text-sm font-medium">
                    MCP
                    <span className="rounded-full bg-orange-500 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">
                      New
                    </span>
                  </Link>
                </li>
                <li className="border-b border-border p-3">
                  <Link href={pricingHref} onClick={closeDrawer} className="text-sm font-medium">
                    Pricing
                  </Link>
                </li>
              </ul>
              <div className="mt-3 flex flex-col gap-2">
                {!user ? (
                  <Link
                    href="/login"
                    onClick={closeDrawer}
                    className="flex h-9 items-center justify-center rounded-full border border-border text-sm"
                  >
                    Login
                  </Link>
                ) : (
                  <>
                    <Link
                      href={WORKSPACE_ENTRY_PATH}
                      onClick={closeDrawer}
                      className="flex h-9 items-center justify-center rounded-full border border-border text-sm"
                    >
                      Dashboard
                    </Link>
                    <button
                      type="button"
                      onClick={async () => {
                        await handleLogout();
                        closeDrawer();
                      }}
                      className="flex h-9 items-center justify-center rounded-full border border-border text-sm"
                    >
                      Logout
                    </button>
                  </>
                )}
                <NavMoreMenuInline />
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
