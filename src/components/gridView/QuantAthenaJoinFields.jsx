"use client";

import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { getColumnMetaForLakeTable } from "@/lib/dataLake/lakeTableColumns";

const JOIN_TABLE_OPTIONS = [
  { lake: "kalshi", table: "trades", label: "Kalshi trades" },
  { lake: "polymarket", table: "trades", label: "Polymarket trades" },
];

/**
 * Minimal join config for quant Athena pulls (join sheet → trades).
 */
export function QuantAthenaJoinFields({
  lake,
  joinTable,
  onLakeTableChange,
  leftKeyColumn,
  onLeftKeyChange,
  rightKeyColumn,
  onRightKeyChange,
  joinType,
  onJoinTypeChange,
  selectedJoinColumns,
  onToggleJoinColumn,
  baseColumnNames = [],
}) {
  const joinColumns = useMemo(
    () => getColumnMetaForLakeTable(lake, joinTable).map((c) => c.name),
    [lake, joinTable],
  );

  return (
    <div className="space-y-3 rounded-lg border border-border/70 bg-muted/15 p-3">
      <div className="space-y-1">
        <Label className="text-xs font-medium">Join trades table (cloud)</Label>
        <p className="text-[10px] text-muted-foreground leading-snug">
          Expand one row per market into trade-level history on Athena, then snapshot checkpoints server-side.
          Output stays small (groups × checkpoints).
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">Join table</Label>
          <Select
            value={`${lake}:${joinTable}`}
            onValueChange={(v) => {
              const [l, t] = String(v).split(":");
              onLakeTableChange?.(l, t);
            }}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {JOIN_TABLE_OPTIONS.map((o) => (
                <SelectItem key={`${o.lake}:${o.table}`} value={`${o.lake}:${o.table}`}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Join type</Label>
          <Select value={joinType || "inner"} onValueChange={onJoinTypeChange}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="inner">Inner join</SelectItem>
              <SelectItem value="left">Left join</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Sheet key column</Label>
          <Select value={leftKeyColumn || "__"} onValueChange={(v) => onLeftKeyChange?.(v === "__" ? "" : v)}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="e.g. ticker" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__">—</SelectItem>
              {baseColumnNames.map((c) => (
                <SelectItem key={`left-${c}`} value={c} className="font-mono text-xs">
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Trades key column</Label>
          <Select value={rightKeyColumn || "__"} onValueChange={(v) => onRightKeyChange?.(v === "__" ? "" : v)}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="e.g. ticker" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__">—</SelectItem>
              {joinColumns.map((c) => (
                <SelectItem key={`right-${c}`} value={c} className="font-mono text-xs">
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Columns to pull from trades</Label>
        <div className="max-h-32 overflow-y-auto rounded-md border border-border/60 p-2 space-y-1">
          {joinColumns.map((c) => (
            <label key={`join-col-${c}`} className="flex items-center gap-2 text-xs">
              <Checkbox
                checked={selectedJoinColumns.includes(c)}
                onCheckedChange={() => onToggleJoinColumn?.(c)}
              />
              <span className="font-mono">{c}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
