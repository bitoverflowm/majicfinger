"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BLACK_FRIDAY } from "@/lib/promo/blackFriday";
import { CountdownTiles } from "./CountdownTiles";
import { BLACK_FRIDAY_ANCHOR, SEE_BLACK_FRIDAY_EVENT, useBlackFridayCountdown } from "./useBlackFriday";

const DISMISS_KEY = `lychee:promo-dismissed:${BLACK_FRIDAY.id}`;

/** Full-screen app surfaces and embeds, where a strip above the page would cover fixed chrome. */
const HIDDEN_PREFIXES = ["/dashboard", "/checkout", "/easy/"];

export function BlackFridayBanner() {
  const pathname = usePathname() || "";
  const countdown = useBlackFridayCountdown();
  const [dismissed, setDismissed] = useState(true);
  const [embedded, setEmbedded] = useState(false);

  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
    setEmbedded(new URLSearchParams(window.location.search).has("embed") || window.self !== window.top);
  }, []);

  const hiddenHere = embedded || HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  const dismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Private mode: it stays closed for this page view.
    }
  };

  // Route changes can leave an exiting element mounted, so only the close button animates out.
  if (hiddenHere) return null;

  return (
    <AnimatePresence initial={false}>
      {!dismissed && countdown ? (
        <motion.aside
          key="black-friday-banner"
          aria-label={BLACK_FRIDAY.name}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
          className="relative z-[60] overflow-hidden border-b border-white/10 bg-[#07090f] text-white"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_140%_at_22%_0%,rgba(47,111,237,0.32),transparent_70%),radial-gradient(45%_140%_at_80%_100%,rgba(168,85,247,0.24),transparent_70%)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#2f6fed]/70 to-transparent"
          />

          <div className="relative mx-auto flex max-w-7xl items-center justify-center gap-3 py-2 pl-3 pr-11 sm:gap-5 sm:pl-6">
            <div className="flex min-w-0 items-center gap-2.5">
              <img src="/logo.png" alt="" width={24} height={24} className="hidden size-6 shrink-0 rounded-md ring-1 ring-white/15 sm:block" />
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-2 py-[3px] font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-white/85">
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#10b981] opacity-60" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-[#10b981]" />
                </span>
                {BLACK_FRIDAY.name}
              </span>
              <p className="hidden truncate text-[13px] text-white/75 md:block">
                <span className="font-semibold text-white">{BLACK_FRIDAY.percentOff}% off</span> every annual plan, applied at
                checkout.
              </p>
            </div>

            <CountdownTiles countdown={countdown} tone="inverse" className="hidden shrink-0 sm:flex" />

            <a
              href={`/#${BLACK_FRIDAY_ANCHOR}`}
              onClick={() => window.dispatchEvent(new Event(SEE_BLACK_FRIDAY_EVENT))}
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-r from-secondary to-violet-500 px-3.5 text-[13px] font-medium text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_4px_14px_-4px_rgba(47,111,237,0.7)] transition-all hover:brightness-110 active:scale-[0.98]"
            >
              Get {BLACK_FRIDAY.percentOff}% off
              <ArrowRight className="size-3.5" aria-hidden />
            </a>
          </div>

          <button
            type="button"
            onClick={dismiss}
            aria-label="Close Black Friday offer"
            className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-white/55 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            <X className="size-4" aria-hidden />
          </button>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}
