"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";
import { AnimatePresence, motion, useScroll } from "framer-motion";

import { NavMenu } from "@/components/nav-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { siteConfig } from "@/lib/config";
import { isAbsoluteHomeHashHref, navHrefToSectionId } from "@/lib/nav-hrefs";
import { cn } from "@/lib/utils";
import { useUser } from "@/lib/hooks";

const INITIAL_WIDTH = "70rem";
const MAX_WIDTH = "800px";

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const drawerVariants = {
  hidden: { opacity: 0, y: 100 },
  visible: {
    opacity: 1,
    y: 0,
    rotate: 0,
    transition: {
      type: "spring",
      damping: 15,
      stiffness: 200,
      staggerChildren: 0.03,
    },
  },
  exit: {
    opacity: 0,
    y: 100,
    transition: { duration: 0.1 },
  },
};

const drawerMenuContainerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const drawerMenuVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

export function Navbar() {
  const { scrollY } = useScroll();
  const [hasScrolled, setHasScrolled] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("hero");
  const user = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      const sections = siteConfig.nav.links
        .map((item) => navHrefToSectionId(item.href))
        .filter((id): id is string => Boolean(id));

      for (const section of sections) {
        const element = document.getElementById(section);
        if (!element) continue;
        const rect = element.getBoundingClientRect();
        if (rect.top <= 150 && rect.bottom >= 150) {
          setActiveSection(section);
          break;
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    return scrollY.on("change", (latest) => {
      setHasScrolled(latest > 10);
    });
  }, [scrollY]);

  const toggleDrawer = () => setIsDrawerOpen((prev) => !prev);
  const handleOverlayClick = () => setIsDrawerOpen(false);
  const handleLogout = async () => {
    try {
      const response = await fetch("/api/logout", {
        method: "POST",
      });
      if (response.ok) {
        router.push("/");
      } else {
        // eslint-disable-next-line no-console
        console.error("Logout failed");
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("An error occurred during logout", error);
    }
  };

  return (
    <header
      className={cn(
        "sticky z-50 mx-4 flex justify-center transition-all duration-300 md:mx-0",
        hasScrolled ? "top-6" : "top-4 mx-0",
      )}
    >
      <motion.div
        initial={{ width: INITIAL_WIDTH }}
        animate={{ width: hasScrolled ? MAX_WIDTH : INITIAL_WIDTH }}
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <div
          className={cn(
            "mx-auto max-w-7xl rounded-2xl transition-all duration-300 xl:px-0",
            hasScrolled
              ? "px-2 border border-border backdrop-blur-lg bg-background/75"
              : "shadow-none px-7",
          )}
        >
          <div className="flex h-[56px] items-center justify-between p-4">
            <Link href="/" className="flex gap-1.5 items-center pr-3">
              <span className="flex shrink-0 items-center justify-center">
                <Image
                  src="/logo.png"
                  alt="Lychee"
                  width={30}
                  height={30}
                  className="grayscale object-contain block rounded-full"
                  priority
                />
              </span>
              <span className="pt-2 font-black text-xl leading-none text-primary">
                Lychee
              </span>
            </Link>

            <NavMenu />

            <div className="flex flex-row items-center gap-1 md:gap-3 shrink-0">
              <div className="flex items-center space-x-6">
                {!user ? (
                  <>
                    <Link
                      className="bg-secondary h-8 hidden md:flex items-center justify-center text-sm font-normal tracking-wide rounded-full text-primary-foreground dark:text-secondary-foreground w-fit px-4 shadow-[inset_0_1px_2px_rgba(255,255,255,0.25),0_3px_3px_-1.5px_rgba(16,24,40,0.06),0_1px_1px_rgba(16,24,40,0.08)] border border-white/[0.12] hover:bg-secondary/80 transition-all ease-out active:scale-95"
                      href={siteConfig.hero.cta.primary.href}
                    >
                      {siteConfig.hero.cta.primary.text}
                    </Link>
                    <Link
                      className="h-8 hidden md:flex items-center justify-center text-sm font-normal tracking-wide rounded-full w-fit px-4 border border-border bg-background hover:bg-muted transition-all ease-out active:scale-95"
                      href="/login"
                    >
                      Log in
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      className="h-8 hidden md:flex items-center justify-center text-sm font-normal tracking-wide rounded-full w-fit px-4 border border-border bg-background hover:bg-muted transition-all ease-out active:scale-95"
                      href="/dashboard"
                    >
                      Dashboard
                    </Link>
                    <Link
                      href="/dashboard"
                      className="hidden md:flex items-center justify-center h-8 w-8 rounded-full border border-border bg-background hover:bg-muted transition-all ease-out active:scale-95 overflow-hidden"
                      aria-label="Open dashboard"
                    >
                      <Image src={"/avatar.png"} alt="Avatar" height={32} width={32} />
                    </Link>
                  </>
                )}
              </div>
              <ThemeToggle />
              <button
                className="md:hidden border border-border size-8 rounded-md cursor-pointer flex items-center justify-center"
                onClick={toggleDrawer}
                type="button"
                aria-label={isDrawerOpen ? "Close menu" : "Open menu"}
              >
                {isDrawerOpen ? <X className="size-5" /> : <Menu className="size-5" />}
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {isDrawerOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={overlayVariants}
              transition={{ duration: 0.2 }}
              onClick={handleOverlayClick}
            />

            <motion.div
              className="fixed inset-x-0 w-[95%] mx-auto bottom-3 bg-background border border-border p-4 rounded-xl shadow-lg"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={drawerVariants}
            >
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <Link href="/" className="flex gap-1.5 items-center pr-3">
                    <span className="flex shrink-0 items-center justify-center">
                      <Image
                        src="/logo.png"
                        alt="Lychee"
                        width={24}
                        height={24}
                        className="grayscale object-contain block"
                      />
                    </span>
                    <span className="pt-2 font-black text-xl leading-none text-primary">
                      Lychee
                    </span>
                  </Link>
                  <button
                    onClick={toggleDrawer}
                    className="border border-border rounded-md p-1 cursor-pointer"
                    type="button"
                    aria-label="Close menu"
                  >
                    <X className="size-5" />
                  </button>
                </div>

                <motion.ul
                  className="flex flex-col text-sm mb-4 border border-border rounded-md"
                  variants={drawerMenuContainerVariants}
                >
                  <AnimatePresence>
                    {siteConfig.nav.links.map((item) => (
                      <motion.li
                        key={item.id}
                        className="p-2.5 border-b border-border last:border-b-0"
                        variants={drawerMenuVariants}
                      >
                        <a
                          href={item.href}
                          onClick={(e) => {
                            e.preventDefault();
                            if (isAbsoluteHomeHashHref(item.href)) {
                              const hash = item.href.slice(2);
                              if (pathname === "/") {
                                const element = document.getElementById(hash);
                                if (element) {
                                  const top =
                                    element.getBoundingClientRect().top +
                                    window.pageYOffset -
                                    100;
                                  window.scrollTo({ top, behavior: "smooth" });
                                }
                                setIsDrawerOpen(false);
                                return;
                              }
                              window.location.href = item.href;
                              setIsDrawerOpen(false);
                              return;
                            }
                            const id = navHrefToSectionId(item.href);
                            const element = id ? document.getElementById(id) : null;
                            element?.scrollIntoView({ behavior: "smooth" });
                            setIsDrawerOpen(false);
                          }}
                          className={cn(
                            "underline-offset-4 hover:text-primary/80 transition-colors",
                            activeSection === navHrefToSectionId(item.href)
                              ? "text-primary font-medium"
                              : "text-primary/60",
                          )}
                        >
                          {item.name}
                        </a>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </motion.ul>

                <div className="flex flex-col gap-2">
                  {!user ? (
                    <>
                      <Link
                        href={siteConfig.hero.cta.primary.href}
                        className="bg-secondary h-8 flex items-center justify-center text-sm font-normal tracking-wide rounded-full text-primary-foreground dark:text-secondary-foreground w-full px-4 shadow-[inset_0_1px_2px_rgba(255,255,255,0.25),0_3px_3px_-1.5px_rgba(16,24,40,0.06),0_1px_1px_rgba(16,24,40,0.08)] border border-white/[0.12] hover:bg-secondary/80 transition-all ease-out active:scale-95"
                      >
                        {siteConfig.hero.cta.primary.text}
                      </Link>
                      <Link
                        href="/login"
                        className="h-8 flex items-center justify-center text-sm font-normal tracking-wide rounded-full w-full px-4 border border-border bg-background hover:bg-muted transition-all ease-out active:scale-95"
                      >
                        Log in
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/dashboard"
                        className="h-8 flex items-center justify-center text-sm font-normal tracking-wide rounded-full w-full px-4 border border-border bg-background hover:bg-muted transition-all ease-out active:scale-95"
                      >
                        Dashboard
                      </Link>
                      <button
                        type="button"
                        onClick={async () => {
                          await handleLogout();
                          setIsDrawerOpen(false);
                        }}
                        className="h-8 flex items-center justify-center text-sm font-normal tracking-wide rounded-full w-full px-4 border border-border bg-background hover:bg-muted transition-all ease-out active:scale-95"
                      >
                        Logout
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
