"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Layers, X } from "lucide-react";

import {
  CONNECT_RESEARCH_TOOLS,
  getBucketingHelperToolId,
  getResearchToolHelperContent,
} from "@/lib/connectResearchTools";
import { ConnectBucketDialog } from "@/components/connectData/ConnectBucketDialog";
import { ConnectRandomSampleDialog } from "@/components/connectData/ConnectRandomSampleDialog";
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
 * Tool configuration opens in pop-out dialogs to keep the compose flow uncluttered.
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
 *   randomSampleSeeded?: boolean;
 *   setRandomSampleSeeded?: (next: boolean | ((prev: boolean) => boolean)) => void;
 *   randomSampleError?: string | null;
 *   onEnableRandomSample?: () => void;
 *   bucketingEnabled?: boolean;
 *   setBucketingEnabled?: (next: boolean | ((prev: boolean) => boolean)) => void;
 *   bucketConfig?: object | null;
 *   setBucketConfig?: (next: object) => void;
 *   bucketingError?: string | null;
 *   onEnableBucketing?: () => void;
 *   helperOpen?: boolean;
 *   onResearchToolHelperChange?: (toolId: string | null) => void;
 *   composeDraft?: object | null;
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
  randomSampleSeeded = true,
  setRandomSampleSeeded,
  randomSampleError = null,
  onEnableRandomSample,
  bucketingEnabled = false,
  setBucketingEnabled,
  bucketConfig = null,
  setBucketConfig,
  bucketingError = null,
  onEnableBucketing,
  helperOpen = false,
  onResearchToolHelperChange,
  composeDraft = null,
}) {
  const [configToolId, setConfigToolId] = useState(null);

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
    setConfigToolId((id) => (id === "random_sample" ? null : id));
    closeHelper();
  }, [closeHelper, setRandomSampleEnabled]);

  const clearBucketing = useCallback(() => {
    setBucketingEnabled?.(false);
    setConfigToolId((id) => (id === "bucketing" ? null : id));
    closeHelper();
  }, [closeHelper, setBucketingEnabled]);

  const bucketColumnProfile = useMemo(() => {
    const col = String(bucketConfig?.bucketColumn || "").trim();
    if (!col) return null;
    const type = columnTypesByName[col];
    return inferBucketColumnProfileFromType(type);
  }, [bucketConfig?.bucketColumn, columnTypesByName]);

  // Auto-pick bucket style from schema type (same as sheet workspace).
  useEffect(() => {
    if (!bucketingEnabled || !bucketConfig || !bucketColumnProfile) return;
    const col = String(bucketConfig.bucketColumn || "").trim();
    if (!col) return;
    if (bucketColumnProfile.isTemporal && bucketConfig.bucketMode !== "time") {
      setBucketConfig?.({ ...bucketConfig, bucketMode: "time" });
      return;
    }
    if (
      bucketColumnProfile.isNumeric &&
      !bucketColumnProfile.isTemporal &&
      bucketConfig.bucketMode !== "number"
    ) {
      setBucketConfig?.({
        ...bucketConfig,
        bucketMode: "number",
        numericBucketSize:
          String(bucketConfig.numericBucketSize || "").trim() ||
          String(bucketColumnProfile.suggestedSize || 1),
      });
      return;
    }
    if (
      !bucketColumnProfile.isNumeric &&
      !bucketColumnProfile.isTemporal &&
      bucketConfig.bucketMode !== "category"
    ) {
      setBucketConfig?.({ ...bucketConfig, bucketMode: "category" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    bucketingEnabled,
    bucketConfig?.bucketColumn,
    bucketColumnProfile?.isNumeric,
    bucketColumnProfile?.isTemporal,
    bucketColumnProfile?.suggestedSize,
  ]);

  if (selectedCount <= 0 || !tools?.length) return null;

  const openRandomSample = () => {
    if (!randomSampleEnabled) {
      onEnableRandomSample?.();
      setRandomSampleEnabled?.(true);
    }
    openHelperForTool("random_sample");
    setConfigToolId("random_sample");
  };

  const openBucketing = () => {
    if (!bucketingEnabled) {
      onEnableBucketing?.();
      setBucketingEnabled?.(true);
      if (!bucketConfig) {
        setBucketConfig?.(createEmptyBucketTab("Bucketed sheet"));
      }
    }
    const mode = bucketConfig?.activeMode === "bands" ? "bands" : "buckets";
    openHelperForTool(getBucketingHelperToolId(mode));
    setConfigToolId("bucketing");
  };

  const handleBucketingModeChange = (mode) => {
    openHelperForTool(getBucketingHelperToolId(mode));
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

  const openTool = (toolId) => {
    if (toolId === "random_sample") openRandomSample();
    else if (toolId === "bucketing") openBucketing();
  };

  const clearTool = (toolId) => {
    if (toolId === "random_sample") clearRandomSample();
    else if (toolId === "bucketing") clearBucketing();
  };

  const toolSummary = (toolId) => {
    if (toolId === "random_sample" && randomSampleEnabled) {
      const n = String(randomSampleSize ?? "").trim();
      return n ? `n = ${n}` : "Configure sample size";
    }
    if (toolId === "bucketing" && bucketingEnabled) {
      if (bucketConfig?.activeMode === "bands") {
        const col = String(bucketConfig?.bandsConfig?.bandColumn || "").trim();
        const n = Array.isArray(bucketConfig?.bandsConfig?.bands)
          ? bucketConfig.bandsConfig.bands.length
          : 0;
        if (col && n) return `${n} band${n === 1 ? "" : "s"} on ${col}`;
        if (col) return `Bands on ${col}`;
        return "Configure bands";
      }
      const col = String(bucketConfig?.bucketColumn || "").trim();
      return col ? `Bucket by ${col}` : "Configure bucketing";
    }
    return null;
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
          <p className="mt-1 max-w-prose text-[11px] leading-snug text-muted-foreground dark:text-slate-400">
            {description}
          </p>
        </motion.div>

        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool, i) => {
            const Icon = RESEARCH_TOOL_ICONS[tool.id] || SampleNIcon;
            const hasDescription = Boolean(tool.description?.trim());
            const selected = toolSelected(tool.id);
            const interactive = toolInteractive(tool.id);
            const summary = toolSummary(tool.id);

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
                        ? `Edit ${tool.title}`
                        : `Configure ${tool.title}`
                      : "Coming soon"
                  }
                  onClick={interactive ? () => openTool(tool.id) : undefined}
                  className={cn(
                    "flex h-full w-full flex-col rounded-lg border bg-card p-3 text-left text-card-foreground",
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
                        selected
                          ? "bg-foreground/10 text-foreground"
                          : "bg-muted/50 text-muted-foreground dark:text-slate-400",
                      )}
                    >
                      <Icon
                        className={
                          selected ? "text-foreground" : "text-muted-foreground dark:text-slate-400"
                        }
                      />
                    </span>
                    <span className="text-[11px] font-semibold tracking-tight text-foreground">
                      {tool.title}
                    </span>
                  </span>
                  {summary ? (
                    <span className="mt-2 text-[10px] leading-snug text-muted-foreground dark:text-slate-400">
                      {summary}
                    </span>
                  ) : hasDescription ? (
                    <span className="mt-2 text-[10px] leading-snug text-muted-foreground dark:text-slate-400">
                      {tool.description}
                    </span>
                  ) : null}
                </button>
                {selected && interactive ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1.5 top-1.5 h-6 w-6 text-muted-foreground hover:text-foreground dark:text-slate-400"
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
      </motion.div>

      <ConnectRandomSampleDialog
        open={configToolId === "random_sample"}
        onOpenChange={(open) => {
          if (!open) setConfigToolId((id) => (id === "random_sample" ? null : id));
        }}
        sampleSize={randomSampleSize}
        onSampleSizeChange={setRandomSampleSize}
        seeded={randomSampleSeeded !== false}
        onSeededChange={(next) => setRandomSampleSeeded?.(!!next)}
        onRemove={clearRandomSample}
        error={randomSampleError}
        besideHelper={!!helperOpen}
      />

      <ConnectBucketDialog
        open={configToolId === "bucketing"}
        onOpenChange={(open) => {
          if (!open) setConfigToolId((id) => (id === "bucketing" ? null : id));
        }}
        columnNames={columnNames}
        bucketConfig={bucketConfig}
        onBucketConfigChange={setBucketConfig}
        columnProfile={bucketColumnProfile}
        onRemove={clearBucketing}
        error={bucketingError}
        besideHelper={!!helperOpen}
        onBucketingModeChange={handleBucketingModeChange}
        composeDraft={composeDraft}
      />
    </motion.section>
  );
}
