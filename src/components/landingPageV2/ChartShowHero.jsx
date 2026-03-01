"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Play } from "lucide-react";
import { ChartShow } from "@/app/charts/showcase/chart1";

export default function ChartShowHero({ className }) {
  const [isInteractive, setIsInteractive] = useState(false);

  return (
    <div className={cn("relative w-full flex flex-col items-center gap-4", className)}>
      <AnimatePresence>
        {!isInteractive && (
          <motion.h3
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center text-lg font-medium text-foreground/90"
          >
            Click to see how easy charting is with us
          </motion.h3>
        )}
      </AnimatePresence>
      <div
        className={cn(
          "relative rounded-md p-2 ring-1 ring-slate-200/50 dark:bg-gray-900/70 dark:ring-white/10 w-full overflow-hidden",
          !isInteractive && "cursor-pointer group backdrop-blur-md",
          isInteractive && "backdrop-blur-none"
        )}
      >
        <div
          className={cn(
            "relative w-full rounded-md border bg-muted overflow-hidden transition-[filter] duration-300",
            !isInteractive && "max-h-[70vh] [filter:blur(12px)]",
            isInteractive && "[filter:none]"
          )}
        >
          <div className={cn(!isInteractive && "max-h-[70vh] overflow-hidden")}>
            <ChartShow demo={!isInteractive} />
          </div>
        </div>
        <AnimatePresence>
          {!isInteractive && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors rounded-md"
              onClick={() => setIsInteractive(true)}
            >
              <div className="z-30 bg-primary/10 flex items-center justify-center rounded-full backdrop-blur-md size-28 group-hover:scale-105 transition-transform">
                <div className="flex items-center justify-center bg-gradient-to-b from-primary/30 to-primary shadow-md rounded-full size-20 transition-all ease-out duration-200 relative group-hover:scale-[1.2] scale-100">
                  <Play
                    className="size-8 text-white fill-white"
                    style={{
                      filter:
                        "drop-shadow(0 4px 3px rgb(0 0 0 / 0.07)) drop-shadow(0 2px 2px rgb(0 0 0 / 0.06))",
                    }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
