"use client";

import { useEffect } from "react";

import { Input } from "@/components/ui/input";
import { useMyStateV2 } from "@/context/stateContextV2";
import { cn } from "@/lib/utils";

function genFilterId() {
  return `klw-depth-${Date.now().toString(36)}`;
}

/**
 * @param {unknown[]} filters
 */
function readDepth(filters) {
  const row = (Array.isArray(filters) ? filters : []).find((filter) => filter?.column === "depth");
  const depth = Number(row?.value);
  return Number.isFinite(depth) ? Math.min(100, Math.max(0, Math.floor(depth))) : 0;
}

/**
 * @param {unknown[]} prev
 * @param {number} depth
 */
function upsertDepth(prev, depth) {
  const list = Array.isArray(prev) ? [...prev] : [];
  const index = list.findIndex((filter) => filter?.column === "depth");
  const value = Math.min(100, Math.max(0, Math.floor(depth)));

  if (index >= 0) {
    list[index] = { ...list[index], op: "eq", value };
    return list;
  }

  list.push({
    id: genFilterId(),
    column: "depth",
    op: "eq",
    value,
    categoryOtherText: "",
  });
  return list;
}

/**
 * Orderbook-specific query parameters shared by all selected markets.
 *
 * @param {{ className?: string; disabled?: boolean }} props
 */
export function KalshiLiveOrderbookCommonQueries({ className, disabled = false }) {
  const ctx = useMyStateV2() ?? {};
  const {
    connectKalshiLiveWhereFilters = [],
    setConnectKalshiLiveWhereFilters,
  } = ctx;
  const depth = readDepth(connectKalshiLiveWhereFilters);

  useEffect(() => {
    if (!setConnectKalshiLiveWhereFilters) return;
    setConnectKalshiLiveWhereFilters((prev) => {
      const hasDepth = (Array.isArray(prev) ? prev : []).some(
        (filter) => filter?.column === "depth",
      );
      return hasDepth ? prev : upsertDepth(prev, 0);
    });
  }, [setConnectKalshiLiveWhereFilters]);

  return (
    <div className={cn("space-y-2", className)}>
      <h2 className="text-xs font-semibold tracking-tight text-foreground">Orderbook depth</h2>
      <Input
        type="number"
        min={0}
        max={100}
        step={1}
        value={depth}
        disabled={disabled}
        className="h-9 w-32 text-xs"
        onChange={(event) => {
          const next = Number(event.target.value);
          if (!Number.isFinite(next)) return;
          setConnectKalshiLiveWhereFilters?.((prev) => upsertDepth(prev, next));
        }}
      />
      <p className="max-w-2xl text-[11px] leading-snug text-muted-foreground">
        Depth of the orderbook to retrieve (0 or negative means all levels, 1–100 for specific
        depth).
      </p>
      <p className="max-w-2xl text-[11px] leading-snug text-muted-foreground">
        Required range: 0 ≤ x ≤ 100. The same depth will be used for all markets you request. If
        you want different depths, make a separate request for each depth you are interested in.
      </p>
    </div>
  );
}
