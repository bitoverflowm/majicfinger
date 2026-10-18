"use client";

import { MoreVertical } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DestructiveConfirmMenuItem } from "@/components/ui/destructive-confirm-menu-item";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { sheetRecords } from "@/lib/visualizations/datasetDescriptor";
import { formatShares, formatUsd, marketMonogram, parseVisualNumber } from "@/lib/visualizations/visualTable";
import { catalogRowName, formatVolume, volumeInContracts, volumeLabel } from "@/lib/visualizations/volumeTreemap";
import { cn } from "@/lib/utils";

function text(record, ...keys) {
  for (const key of keys) {
    const value = record?.[key];
    if (value != null && String(value).trim() !== "") return String(value).trim();
  }
  return "";
}

function flag(value) {
  return value === true || value === "true" || value === "True";
}

/** Kalshi markets carry a lifecycle word instead of a closed flag. */
const CLOSED_STATUS = new Set(["closed", "settled", "finalized", "determined", "resolved", "expired"]);

function catalogStatus(record, fields) {
  const raw = record[fields.status] ?? record.closed ?? record["series:closed"] ?? record.event_closed;
  const word = String(raw ?? "").trim().toLowerCase();
  if (flag(raw) || CLOSED_STATUS.has(word)) return "Closed";
  if (flag(record.live ?? record.event_live)) return "Live";
  return "Open";
}

function catalogRows(records, dataset, daily) {
  const fields = dataset?.fields || {};
  const rows = (records || []).map((record) => {
    const volume = parseVisualNumber(record[fields.total])
      ?? parseVisualNumber(record.volume)
      ?? parseVisualNumber(record["series:volume"])
      ?? parseVisualNumber(record.volumeNum);
    const title = catalogRowName(record, fields) || "Untitled";
    const icon = text(record, fields.icon, "image", "icon", "series:image", "series:icon", "imageOptimized");
    return {
      title,
      icon: /^https?:\/\//i.test(icon) ? icon : "",
      status: catalogStatus(record, fields),
      volume24hr: daily
        ? parseVisualNumber(record[fields.value]) ?? parseVisualNumber(record.volume24hr) ?? parseVisualNumber(record["series:volume24hr"])
        : null,
      volume: daily ? volume : parseVisualNumber(record[fields.value]) ?? volume,
      liquidity: fields.depth
        ? parseVisualNumber(record[fields.depth])
        : parseVisualNumber(record.liquidity) ?? parseVisualNumber(record["series:liquidity"]) ?? parseVisualNumber(record.liquidityNum),
    };
  }).filter((row) => row.title);
  const ranked = daily ? "volume24hr" : "volume";
  const max = Math.max(1, ...rows.map((row) => Math.abs(row[ranked] || 0)));
  return rows.map((row) => ({ ...row, share: row[ranked] == null ? 0 : Math.abs(row[ranked]) / max }));
}

function ColumnHead({ label, align, readOnly, onHide, id }) {
  return (
    <th className={cn("group/col px-2 py-1.5 font-medium whitespace-nowrap", align === "right" && "text-right")}>
      <span className={cn("inline-flex items-center gap-0.5", align === "right" && "flex-row-reverse")}>
        <span>{label}</span>
        {readOnly ? null : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={`Actions for ${label}`}
                className="inline-flex h-4 w-0 items-center justify-center overflow-hidden rounded-sm text-muted-foreground opacity-0 pointer-events-none transition-[opacity,width] group-hover/col:w-4 group-hover/col:opacity-100 group-hover/col:pointer-events-auto data-[state=open]:w-4 data-[state=open]:opacity-100 data-[state=open]:pointer-events-auto"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => event.stopPropagation()}
              >
                <MoreVertical className="size-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-[560] w-40 rounded-xl p-1 shadow-lg" onPointerDown={(event) => event.stopPropagation()}>
              <DestructiveConfirmMenuItem deleteLabel="Hide column" onConfirm={() => onHide?.(id)} />
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </span>
    </th>
  );
}

export function CatalogRichTableView({ sheet, dataset, hidden = [], readOnly = false, onHideColumn }) {
  const hiddenIds = new Set(hidden || []);
  const noun = dataset?.datasetType === "events" ? "Event" : dataset?.datasetType === "series" ? "Series" : "Market";
  const daily = volumeLabel(dataset) === "24h volume";
  const ranked = daily ? "volume24hr" : "volume";
  const rows = catalogRows(sheetRecords(sheet), dataset, daily);
  const openInterest = /^open_interest/.test(String(dataset?.fields?.depth || ""));
  const contracts = volumeInContracts(dataset);
  const columns = [
    { id: "title", label: noun, align: "left" },
    { id: "status", label: "Status", align: "left" },
    ...(daily ? [{ id: "volume24hr", label: "24h volume", align: "right" }] : []),
    { id: "volume", label: contracts ? "Contracts" : "Volume", align: "right" },
    { id: "liquidity", label: openInterest ? "Open interest" : "Liquidity", align: "right" },
  ].filter((column) => !hiddenIds.has(column.id));
  if (!rows.length) {
    return <p className="px-3 text-[12px] text-muted-foreground">This list has nothing to show yet.</p>;
  }
  return (
    <div data-visual-table="" className="flex min-h-0 flex-1 flex-col px-3 pb-3">
      <div data-visual-scroll="" className="min-h-0 flex-1 overflow-auto overscroll-contain">
        <table className="w-max border-collapse text-left text-[13px]">
          <thead className="sticky top-0 z-[1] bg-background text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <tr>
              {columns.map((column) => (
                <ColumnHead key={column.id} {...column} readOnly={readOnly} onHide={onHideColumn} />
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.title}-${index}`} className="border-t border-border/60">
                {columns.map((column) => {
                  if (column.id === "title") {
                    return (
                      <td key={column.id} className="px-2 py-1.5">
                        <div className="flex min-w-0 items-center gap-2">
                          <Avatar className="size-6">
                            {row.icon ? <AvatarImage src={row.icon} alt="" /> : null}
                            <AvatarFallback className="text-[10px]">{marketMonogram(row.title)}</AvatarFallback>
                          </Avatar>
                          <span className="max-w-[280px] truncate">{row.title}</span>
                        </div>
                      </td>
                    );
                  }
                  if (column.id === "status") {
                    return <td key={column.id} className="px-2 py-1.5 text-muted-foreground">{row.status}</td>;
                  }
                  if (column.id === ranked) {
                    return (
                      <td key={column.id} className="px-2 py-1.5 text-right font-mono tabular-nums">
                        <span className="inline-flex items-center gap-2">
                          <span className="h-1.5 w-8 overflow-hidden rounded-full bg-muted" aria-hidden>
                            <span className="block h-full rounded-full bg-[#E63946]" style={{ width: `${row.share * 100}%` }} />
                          </span>
                          {formatVolume(row[ranked], dataset)}
                        </span>
                      </td>
                    );
                  }
                  const value = column.id === "volume" ? row.volume : row.liquidity;
                  return (
                    <td key={column.id} className="px-2 py-1.5 text-right font-mono tabular-nums">
                      {column.id === "volume" ? formatVolume(value, dataset) : openInterest ? formatShares(value) : formatUsd(value)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
