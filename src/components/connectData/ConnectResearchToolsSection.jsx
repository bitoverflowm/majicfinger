"use client";

import { motion } from "framer-motion";

import { CONNECT_RESEARCH_TOOLS } from "@/lib/connectResearchTools";
import { ConnectRandomSamplePanel } from "@/components/connectData/ConnectRandomSamplePanel";
import { cn } from "@/lib/utils";

/** Mathematical sample-size symbol (n) used as the Random Sample card icon. */
function SampleNIcon({ className }) {
  return (
    <span
      className={cn(
        "font-serif text-[13px] font-medium italic leading-none tracking-tight",
        className,
      )}
      aria-hidden
    >
      (n)
    </span>
  );
}

const RESEARCH_TOOL_ICONS = {
  random_sample: SampleNIcon,
};

/**
 * Card grid for historical research helpers (Kalshi Historical V1 / Polymarket Historical).
 *
 * @param {{
 *   selectedCount: number;
 *   className?: string;
 *   tools?: import("@/lib/connectResearchTools").ConnectResearchTool[];
 *   title?: string;
 *   description?: string;
 *   randomSampleEnabled?: boolean;
 *   setRandomSampleEnabled?: (next: boolean | ((prev: boolean) => boolean)) => void;
 *   randomSampleSize?: string | number;
 *   setRandomSampleSize?: (value: string) => void;
 *   randomSampleError?: string | null;
 *   onEnableRandomSample?: () => void;
 * }} props
 */
export function ConnectResearchToolsSection({
  selectedCount,
  className,
  tools = CONNECT_RESEARCH_TOOLS,
  title = "Research tools",
  description = "Useful tools to move your research along",
  randomSampleEnabled = false,
  setRandomSampleEnabled,
  randomSampleSize = "",
  setRandomSampleSize,
  randomSampleError = null,
  onEnableRandomSample,
}) {
  if (selectedCount <= 0 || !tools?.length) return null;

  const toggleRandomSample = () => {
    if (randomSampleEnabled) {
      setRandomSampleEnabled?.(false);
      return;
    }
    onEnableRandomSample?.();
    setRandomSampleEnabled?.(true);
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className={cn("mt-8 scroll-mt-6 border-t border-border/40 pt-6", className)}
      aria-label={title}
    >
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="space-y-3 pb-4"
      >
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2 className="text-xs font-semibold tracking-tight text-foreground">{title}</h2>
          <p className="mt-1 max-w-prose text-[11px] leading-snug text-muted-foreground">
            {description}
          </p>
        </motion.div>

        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool, i) => {
            const Icon = RESEARCH_TOOL_ICONS[tool.id] || SampleNIcon;
            const hasDescription = Boolean(tool.description?.trim());
            const isRandom = tool.id === "random_sample";
            const selected = isRandom && randomSampleEnabled;
            const interactive = isRandom && typeof setRandomSampleEnabled === "function";

            return (
              <motion.li
                key={tool.id}
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
                  disabled={!interactive}
                  aria-disabled={!interactive}
                  aria-pressed={interactive ? selected : undefined}
                  title={interactive ? (selected ? "Disable Random Sample" : "Enable Random Sample") : "Coming soon"}
                  onClick={interactive ? toggleRandomSample : undefined}
                  className={cn(
                    "flex h-full w-full flex-col rounded-lg border bg-card p-3 text-left",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    interactive
                      ? selected
                        ? "border-foreground/40 ring-1 ring-foreground/15"
                        : "border-border/60 hover:border-border"
                      : "border-border/60 opacity-90",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                        selected ? "bg-foreground/10 text-foreground" : "bg-muted/50 text-muted-foreground",
                      )}
                    >
                      <Icon className={selected ? "text-foreground" : "text-muted-foreground"} />
                    </span>
                    <span className="text-[11px] font-semibold tracking-tight text-foreground">
                      {tool.title}
                    </span>
                  </span>
                  {hasDescription ? (
                    <span className="mt-2 text-[10px] leading-snug text-muted-foreground">
                      {tool.description}
                    </span>
                  ) : null}
                </button>
              </motion.li>
            );
          })}
        </ul>

        {randomSampleEnabled ? (
          <ConnectRandomSamplePanel
            sampleSize={randomSampleSize}
            onSampleSizeChange={setRandomSampleSize}
            error={randomSampleError}
          />
        ) : null}
      </motion.div>
    </motion.section>
  );
}
