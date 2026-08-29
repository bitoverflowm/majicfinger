"use client";

import { useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { Layers, X } from "lucide-react";

import {
  CONNECT_RESEARCH_TOOLS,
  getResearchToolHelperContent,
} from "@/lib/connectResearchTools";
import { ConnectBucketPanel } from "@/components/connectData/ConnectBucketPanel";
import { ConnectRandomSamplePanel } from "@/components/connectData/ConnectRandomSamplePanel";
import { Button } from "@/components/ui/button";
import { createEmptyBucketTab } from "@/lib/bucketSheetTabs";
import { inferBucketColumnProfileFromType } from "@/lib/sheetOperations/inferBucketColumnProfile";
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

function BucketIcon({ className }) {
  return <Layers className={cn("h-3.5 w-3.5", className)} aria-hidden />;
}

const RESEARCH_TOOL_ICONS = {
  random_sample: SampleNIcon,
  bucketing: BucketIcon,
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
 *   columnNames?: string[];
 *   columnTypesByName?: Record<string, string>;
 *   randomSampleEnabled?: boolean;
 *   setRandomSampleEnabled?: (next: boolean | ((prev: boolean) => boolean)) => void;
 *   randomSampleSize?: string | number;
 *   setRandomSampleSize?: (value: string) => void;
 *   randomSampleError?: string | null;
 *   onEnableRandomSample?: () => void;
 *   bucketingEnabled?: boolean;
 *   setBucketingEnabled?: (next: boolean | ((prev: boolean) => boolean)) => void;
 *   bucketConfig?: object | null;
 *   setBucketConfig?: (next: object) => void;
 *   bucketingError?: string | null;
 *   onEnableBucketing?: () => void;
 *   onResearchToolHelperChange?: (toolId: string | null) => void;
 * }} props
 */
export function ConnectResearchToolsSection({
  selectedCount,
  className,
  tools = CONNECT_RESEARCH_TOOLS,
  title = "Research tools",
  description = "Useful tools to move your research along",
  columnNames = [],
  columnTypesByName = {},
  randomSampleEnabled = false,
  setRandomSampleEnabled,
  randomSampleSize = "",
  setRandomSampleSize,
  randomSampleError = null,
  onEnableRandomSample,
  bucketingEnabled = false,
  setBucketingEnabled,
  bucketConfig = null,
  setBucketConfig,
  bucketingError = null,
  onEnableBucketing,
  onResearchToolHelperChange,
}) {
  const openHelperForTool = useCallback(
    (toolId) => {
      const content = getResearchToolHelperContent(toolId);
      if (!content) return;
      onResearchToolHelperChange?.(toolId);
    },
    [onResearchToolHelperChange],
  );

  const closeHelper = useCallback(() => {
    onResearchToolHelperChange?.(null);
  }, [onResearchToolHelperChange]);

  const clearRandomSample = useCallback(() => {
    setRandomSampleEnabled?.(false);
    closeHelper();
  }, [closeHelper, setRandomSampleEnabled]);

  const clearBucketing = useCallback(() => {
    setBucketingEnabled?.(false);
    closeHelper();
  }, [closeHelper, setBucketingEnabled]);

  const bucketColumnProfile = useMemo(() => {
    const col = String(bucketConfig?.bucketColumn || "").trim();
    if (!col) return null;
    const type = columnTypesByName[col];
    return inferBucketColumnProfileFromType(type);
  }, [bucketConfig?.bucketColumn, columnTypesByName]);

  if (selectedCount <= 0 || !tools?.length) return null;

  const enableRandomSample = () => {
    if (randomSampleEnabled) {
      openHelperForTool("random_sample");
      return;
    }
    onEnableRandomSample?.();
    setRandomSampleEnabled?.(true);
    openHelperForTool("random_sample");
  };

  const enableBucketing = () => {
    if (bucketingEnabled) {
      openHelperForTool("bucketing");
      return;
    }
    onEnableBucketing?.();
    setBucketingEnabled?.(true);
    if (!bucketConfig) {
      setBucketConfig?.(createEmptyBucketTab("Bucketed sheet"));
    }
    openHelperForTool("bucketing");
  };

  const toolSelected = (toolId) => {
    if (toolId === "random_sample") return !!randomSampleEnabled;
    if (toolId === "bucketing") return !!bucketingEnabled;
    return false;
  };

  const toolInteractive = (toolId) => {
    if (toolId === "random_sample") return typeof setRandomSampleEnabled === "function";
    if (toolId === "bucketing") return typeof setBucketingEnabled === "function";
    return false;
  };

  const enableTool = (toolId) => {
    if (toolId === "random_sample") enableRandomSample();
    else if (toolId === "bucketing") enableBucketing();
  };

  const clearTool = (toolId) => {
    if (toolId === "random_sample") clearRandomSample();
    else if (toolId === "bucketing") clearBucketing();
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
            const selected = toolSelected(tool.id);
            const interactive = toolInteractive(tool.id);

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
                className="relative"
              >
                <button
                  type="button"
                  disabled={!interactive}
                  aria-disabled={!interactive}
                  aria-pressed={interactive ? selected : undefined}
                  title={
                    interactive
                      ? selected
                        ? `${tool.title} is enabled`
                        : `Enable ${tool.title}`
                      : "Coming soon"
                  }
                  onClick={interactive ? () => enableTool(tool.id) : undefined}
                  className={cn(
                    "flex h-full w-full flex-col rounded-lg border bg-card p-3 text-left",
                    selected && "pr-8",
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
                {selected && interactive ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1.5 top-1.5 h-6 w-6 text-muted-foreground hover:text-foreground"
                    aria-label={`Remove ${tool.title}`}
                    title={`Remove ${tool.title}`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      clearTool(tool.id);
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                ) : null}
              </motion.li>
            );
          })}
        </ul>

        {randomSampleEnabled ? (
          <ConnectRandomSamplePanel
            sampleSize={randomSampleSize}
            onSampleSizeChange={setRandomSampleSize}
            onRemove={clearRandomSample}
            error={randomSampleError}
          />
        ) : null}

        {bucketingEnabled ? (
          <ConnectBucketPanel
            columnNames={columnNames}
            bucketConfig={bucketConfig}
            onBucketConfigChange={setBucketConfig}
            columnProfile={bucketColumnProfile}
            onRemove={clearBucketing}
            error={bucketingError}
          />
        ) : null}
      </motion.div>
    </motion.section>
  );
}
