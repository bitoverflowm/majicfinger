"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";

const SCROLL_BOUNDARY = 120;

export function StickyHeader() {
  const [scrollY, setScrollY] = useState(0);
  const headerParentRef = useRef(null);
  const { theme } = useTheme();

  const getBreakpoint = (width) => {
    if (width < 640) return "xs";
    if (width < 768) return "sm";
    if (width < 1024) return "md";
    if (width < 1280) return "lg";
    if (width < 1536) return "xl";
    return "2xl";
  };

  const [breakpoint, setBreakpoint] = useState("xl"); // Default to 'xl' or any other default value

  useEffect(() => {
    // This function will only run in the client-side environment
    const handleResize = () => {
      setBreakpoint(getBreakpoint(window.innerWidth));
    };

    // Set the initial value when the component mounts
    handleResize();

    // Optionally, update the breakpoint on window resize
    window.addEventListener("resize", handleResize);

    // Cleanup the event listener when the component unmounts
    return () => window.removeEventListener("resize", handleResize);
  }, []); // Empty dependency array ensures this effect runs only once on mount

  const active =
    scrollY >= SCROLL_BOUNDARY ||
    breakpoint === "xs" ||
    breakpoint === "sm" ||
    breakpoint === "md";

  useEffect(() => {
    const handleScroll = () => {
      if (headerParentRef.current) {
        setScrollY(headerParentRef.current.scrollTop);
      }
    };

    const parentElement = headerParentRef.current;
    parentElement?.addEventListener("scroll", handleScroll);

    return () => {
      parentElement?.removeEventListener("scroll", handleScroll);
    };
  }, [headerParentRef.current]);

  return (
    <div ref={headerParentRef} className="">
        <header className="mx-auto flex max-w-5xl items-center justify-between bg-transparent px-10 py-7 dark:bg-transparent">
          <div className="hidden flex-row items-center justify-center gap-2 lg:flex">
            <Link href="/" className="cursor-pointer">Katsu</Link>
          </div>
          {/* <h1 className="hidden lg:flex">Logo</h1> */}
          <div className="absolute inset-x-0 top-6 z-50 flex items-center justify-center">
            <motion.div
              initial={{ x: 0 }}
              animate={{
                boxShadow: active
                  ? theme === "dark"
                    ? "0 0 0 1px rgba(255,255,255,.08), 0 1px 2px -1px rgba(255,255,255,.08), 0 2px 4px rgba(255,255,255,.04)"
                    : "0 0 0 1px rgba(17,24,28,.08), 0 1px 2px -1px rgba(17,24,28,.08), 0 2px 4px rgba(17,24,28,.04)"
                  : "none",
              }}
              transition={{
                ease: "linear",
                duration: 0.05,
                delay: 0.05,
              }}
              className={cn(
                "supports-backdrop-blur:bg-white/90 mx-4 flex w-full items-center justify-center overflow-hidden rounded-full bg-white bg-white/40 px-3 py-2.5 backdrop-blur-md transition-all dark:bg-black/20 lg:w-auto lg:p-1.5 lg:py-2",
              )}
            >
              <ul className="flex h-full w-full flex-row justify-between gap-6 lg:flex-row lg:justify-start lg:gap-1">
                <li className="flex items-center justify-center px-2 py-0.5">
                  <Link href="/" className="flex h-8 w-8 lg:hidden cursor-pointer"> Katsu </Link>
                  <a href="/" className="hidden lg:flex">
                    Home
                  </a>
                </li>
                <li className="hidden items-center justify-center px-2 py-0.5 lg:flex">
                  <a href="#">Features</a>
                </li>
                <li className="hidden items-center justify-center px-2 py-0.5 lg:flex">
                  <a href="#">Pricing</a>
                </li>
                <li className="hidden items-center justify-center px-2 py-0.5 lg:flex">
                  <a href="#">Contact</a>
                </li>
                <AnimatePresence>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: active ? "auto" : 0,
                    }}
                    transition={{
                      ease: "easeOut",
                      duration: 0.25,
                      delay: 0.05,
                    }}
                  >
                    <AnimatePresence>
                      {active && (
                        <motion.a
                          initial={{ x: "125%" }}
                          animate={{ x: "0" }}
                          exit={{
                            x: "125%",
                            transition: { ease: "easeOut", duration: 2.2 },
                          }}
                          transition={{ ease: "easeOut", duration: 0.5 }}
                          className="relative inline-flex w-fit shrink-0 items-center justify-center gap-x-1.5 overflow-hidden whitespace-nowrap rounded-full bg-neutral-900 px-3 py-1.5 text-white outline-none dark:bg-white dark:text-black"
                        >
                          Get Started
                        </motion.a>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </AnimatePresence>
              </ul>
            </motion.div>
          </div>

          {/* <div className="flex items-center gap-x-5"> */}
          <a className="relative hidden w-fit items-center justify-center gap-x-1.5 overflow-hidden rounded-full bg-neutral-900 px-3 py-1.5 text-white outline-none dark:bg-white dark:text-black lg:inline-flex">
            Get Started
          </a>
          {/* </div> */}
        </header>
    </div>
  );
}
