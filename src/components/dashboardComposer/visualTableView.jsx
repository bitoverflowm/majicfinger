"use client";

import { Check, MoreVertical } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DestructiveConfirmMenuItem } from "@/components/ui/destructive-confirm-menu-item";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { sheetRecords } from "@/lib/visualizations/datasetDescriptor";
import {
  buildVisualTable,
  formatShares,
  formatSignedUsd,
  shortWallet,
  traderInitials,
} from "@/lib/visualizations/visualTable";
import { cn } from "@/lib/utils";

function Meter({ share, tone }) {
  return (
    <span className="h-1.5 w-8 shrink-0 overflow-hidden rounded-full bg-muted" aria-hidden>
      <span
        className="block h-full rounded-full"
        style={{ width: `${Math.max(0, Math.min(1, share)) * 100}%`, background: tone }}
      />
    </span>
  );
}

function ColumnHead({ column, align, readOnly, onHide }) {
  return (
    <th className={cn("group/col px-2 py-1.5 font-medium whitespace-nowrap", align === "right" && "text-right", align === "center" && "text-center")}>
      <span className={cn("inline-flex items-center gap-0.5", align === "right" && "flex-row-reverse")}>
        <span title={column.id === "handle" ? "X username" : column.label}>{column.label}</span>
        {readOnly ? null : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={`Actions for ${column.label}`}
                className="inline-flex h-4 w-0 items-center justify-center overflow-hidden rounded-sm text-muted-foreground opacity-0 pointer-events-none transition-[opacity,width] group-hover/col:w-4 group-hover/col:opacity-100 group-hover/col:pointer-events-auto data-[state=open]:w-4 data-[state=open]:opacity-100 data-[state=open]:pointer-events-auto"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => event.stopPropagation()}
              >
                <MoreVertical className="size-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-[560] w-40 rounded-xl p-1 shadow-lg" onPointerDown={(event) => event.stopPropagation()}>
              <DestructiveConfirmMenuItem deleteLabel="Hide column" onConfirm={() => onHide?.(column.id)} />
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </span>
    </th>
  );
}

export function VisualTableView({ sheet, dataset, hidden = [], readOnly = false, onHideColumn }) {
  const hiddenIds = new Set(hidden || []);
  const model = buildVisualTable(sheetRecords(sheet), dataset);
  const columns = model.columns.filter((column) => !hiddenIds.has(column.id));
  if (!model.rows.length) {
    return <p className="px-3 text-[12px] text-muted-foreground">This leaderboard has no traders to show yet.</p>;
  }
  if (!columns.length) {
    return <p className="px-3 text-[12px] text-muted-foreground">Every column is hidden on this visual. The sheet still has the data.</p>;
  }
  return (
    <div data-visual-table="" className="flex min-h-0 flex-1 flex-col px-3 pb-3">
      {model.caption.length ? (
        <p className="px-0.5 pb-2 pt-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{model.caption.join(" · ")}</p>
      ) : null}
      <div data-visual-scroll="" className="min-h-0 flex-1 overflow-auto overscroll-contain">
        <table className="w-max border-collapse text-left text-[13px]">
          <thead className="sticky top-0 z-[1] bg-background text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <tr>
              {columns.map((column) => (
                <ColumnHead
                  key={column.id}
                  column={column}
                  align={column.id === "pnl" || column.id === "volume" ? "right" : column.id === "verified" ? "center" : "left"}
                  readOnly={readOnly}
                  onHide={onHideColumn}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {model.rows.map((row, index) => {
              const pnlTone = row.pnl != null && row.pnl < 0 ? "#fb7185" : "#28CC95";
              return (
                <tr key={`${row.wallet || row.name}-${index}`} className="border-t border-border/60">
                  {columns.map((column) => {
                    if (column.id === "rank") {
                      return (
                        <td key={column.id} className="px-2 py-1.5 font-mono text-[12px] tabular-nums text-muted-foreground">
                          {row.rank != null && row.rank > 0 ? row.rank : ""}
                        </td>
                      );
                    }
                    if (column.id === "trader") {
                      return (
                        <td key={column.id} className="px-2 py-1.5">
                          <div className="flex min-w-0 items-center gap-2">
                            <Avatar className="size-6">
                              {row.avatar ? <AvatarImage src={row.avatar} alt="" /> : null}
                              <AvatarFallback className="text-[9px] font-medium">{traderInitials(row.name, row.wallet)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="max-w-[8.5rem] truncate font-medium leading-tight">{row.name}</p>
                              {row.wallet ? <p className="max-w-[8.5rem] truncate text-[11px] text-muted-foreground">{shortWallet(row.wallet)}</p> : null}
                            </div>
                          </div>
                        </td>
                      );
                    }
                    if (column.id === "pnl") {
                      return (
                        <td key={column.id} className="px-2 py-1.5">
                          <div className="flex items-center justify-end gap-1.5">
                            <Meter share={row.pnlShare} tone={pnlTone} />
                            <span className="font-mono text-[12px] tabular-nums" style={{ color: row.pnl == null ? undefined : pnlTone }}>
                              {formatSignedUsd(row.pnl)}
                            </span>
                          </div>
                        </td>
                      );
                    }
                    if (column.id === "volume") {
                      return (
                        <td key={column.id} className="px-2 py-1.5">
                          <div className="flex items-center justify-end gap-1.5">
                            <Meter share={row.volumeShare} tone="#94a3b8" />
                            <span className="font-mono text-[12px] tabular-nums">{formatShares(row.volume)}</span>
                          </div>
                        </td>
                      );
                    }
                    if (column.id === "verified") {
                      return (
                        <td key={column.id} className="px-2 py-1.5 text-center text-emerald-600">
                          {row.verified ? <Check className="mx-auto size-3.5" aria-label="Verified" /> : null}
                        </td>
                      );
                    }
                    return (
                      <td key={column.id} className="max-w-[6.5rem] truncate px-2 py-1.5 text-[12px] text-muted-foreground">
                        {row.handle ? `@${row.handle}` : ""}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
