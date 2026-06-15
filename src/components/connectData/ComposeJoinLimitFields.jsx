"use client";

import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ATHENA_SAMPLE_ROW_LIMIT } from "@/config/dataLakeParquetSamples";
import { cn } from "@/lib/utils";

/**
 * Row limit controls with optional join-aware scope (primary table vs full result).
 */
export function ComposeJoinLimitFields({
  className,
  composeLimitRuleOpen,
  setComposeLimitRuleOpen,
  composeLimitRuleValue,
  setComposeLimitRuleValue,
  composeLimitScope = "primary",
  setComposeLimitScope,
  hasTableJoin = false,
  primaryTableLabel = "primary table",
  showSetLimitButton = true,
  inputClassName,
}) {
  const scope = composeLimitScope === "result" ? "result" : "primary";

  return (
    <div className={cn("space-y-2", className)}>
      {composeLimitRuleOpen ? (
        <>
          <Label className="text-xs text-muted-foreground">Maximum rows</Label>
          <motion.div className="flex flex-wrap items-center gap-2">
            <Input
              type="number"
              min={1}
              className={cn("h-8 w-32 text-xs", inputClassName)}
              value={composeLimitRuleValue}
              onChange={(e) => {
                setComposeLimitRuleOpen?.(true);
                setComposeLimitRuleValue?.(e.target.value);
              }}
              placeholder={`e.g. ${ATHENA_SAMPLE_ROW_LIMIT}`}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-[11px]"
              onClick={() => {
                setComposeLimitRuleOpen?.(false);
                setComposeLimitRuleValue?.("");
              }}
            >
              Clear limit
            </Button>
          </motion.div>
          {hasTableJoin ? (
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Apply limit to</Label>
              <Select
                value={scope}
                onValueChange={(v) => setComposeLimitScope?.(v === "result" ? "result" : "primary")}
              >
                <SelectTrigger className="h-8 w-full text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary" className="text-xs">
                    {primaryTableLabel} only (then expand joined rows)
                  </SelectItem>
                  <SelectItem value="result" className="text-xs">
                    Full result after join
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] leading-snug text-muted-foreground">
                {scope === "primary"
                  ? `Limits how many ${primaryTableLabel} rows are kept before the join; all matching trades (or other joined rows) are included for each.`
                  : "Limits the final row count after the join (e.g. LIMIT 2 returns only 2 joined rows total)."}
              </p>
            </div>
          ) : null}
        </>
      ) : showSetLimitButton ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={() => {
            setComposeLimitRuleOpen?.(true);
            setComposeLimitRuleValue?.((v) =>
              String(v || "").trim() ? v : String(ATHENA_SAMPLE_ROW_LIMIT),
            );
          }}
        >
          Set row limit
        </Button>
      ) : null}
    </div>
  );
}
