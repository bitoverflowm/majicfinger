"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  ArrowUpDown,
  Filter,
  GitMerge,
  ListOrdered,
  Sigma,
  SlidersHorizontal,
} from "lucide-react";

import { useMyStateV2 } from "@/context/stateContextV2";
import { CONNECT_COMPOSE_OPERATIONS } from "@/lib/connectComposeOperations";
import { cn } from "@/lib/utils";

const OPERATION_ICONS = {
  where: Filter,
  join: GitMerge,
  sort: ArrowUpDown,
  row_limit: ListOrdered,
  summarize: Sigma,
  having: SlidersHorizontal,
};

/**
 * @param {{ selectedCount: number; className?: string }} props
 */
export function ConnectDataOperationsSection({ selectedCount, className }) {
  const sectionRef = useRef(null);
  const didScrollRef = useRef(false);
  const { setRightPanelOpen, setRightPanelTab } = useMyStateV2() ?? {};

  const show = selectedCount > 0;

  useEffect(() => {
    if (!show) {
      didScrollRef.current = false;
      return;
    }
    if (didScrollRef.current) return;
    didScrollRef.current = true;
    const t = window.setTimeout(() => {
      sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 280);
    return () => window.clearTimeout(t);
  }, [show]);

  const openIntegrationsPanel = () => {
    setRightPanelOpen?.(true);
    setRightPanelTab?.("integrations");
  };

  if (!show) return null;

  return (
    <motion.section
      ref={sectionRef}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className={cn("mt-8 scroll-mt-6 border-t border-border/40 pt-6", className)}
      aria-label="Data operations"
    >
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="space-y-3"
      >
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2 className="text-xs font-semibold tracking-tight text-foreground">Refine your pull</h2>
          <p className="mt-1 max-w-prose text-[11px] leading-snug text-muted-foreground">
            Optional steps before you run the query. Configure each in the integrations panel on the
            right — tap an operation to jump there.
          </p>
        </motion.div>

        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {CONNECT_COMPOSE_OPERATIONS.map((op, i) => {
            const Icon = OPERATION_ICONS[op.id] || Filter;
            return (
              <motion.li
                key={op.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.22,
                  delay: 0.08 + i * 0.04,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <button
                  type="button"
                  onClick={openIntegrationsPanel}
                  className={cn(
                    "flex h-full w-full flex-col rounded-lg border border-border/60 bg-card p-3 text-left transition-colors duration-150",
                    "hover:border-border hover:bg-muted/20",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted/50 text-muted-foreground">
                      <Icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                    </span>
                    <span className="text-[11px] font-semibold tracking-tight text-foreground">
                      {op.title}
                    </span>
                  </span>
                  <span className="mt-2 text-[10px] leading-snug text-muted-foreground">
                    {op.description}
                  </span>
                </button>
              </motion.li>
            );
          })}
        </ul>
      </motion.div>
    </motion.section>
  );
}
