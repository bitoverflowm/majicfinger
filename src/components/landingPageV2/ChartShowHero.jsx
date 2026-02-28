"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Play } from "lucide-react";
import { ChartShow } from "@/app/charts/showcase/chart1";

export default function ChartShowHero({ className }) {
  const [isInteractive, setIsInteractive] = useState(false);

  return (
    <div className={cn("relative w-full", className)}>
      <div
        className={cn(
          "relative rounded-md p-2 ring-1 ring-slate-200/50 dark:bg-gray-900/70 dark:ring-white/10 backdrop-blur-md w-full overflow-hidden",
          !isInteractive && "cursor-pointer group"
        )}
      >
        <div className="relative w-full min-h-[400px] rounded-md border bg-muted overflow-hidden">
          <ChartShow demo={!isInteractive} />
        </div>
        <AnimatePresence>
          {!isInteractive && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors rounded-md"
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
              <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm text-white/90 font-medium bg-black/40 px-3 py-1 rounded-full">
                Click to try the chart
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
