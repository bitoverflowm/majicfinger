"use client";

import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { composeSourceColumnLabel } from "@/lib/dataLakeComposeHelpers";
import { getKalshiColumnDisplayLabel } from "@/lib/kalshiConnectColumns";

function columnLabel(col) {
  return getKalshiColumnDisplayLabel({ name: col }) || composeSourceColumnLabel(col);
}

export function ConnectComposeSumCaseEditor({
  item,
  updateComposeItem,
  availableColumns,
  numericColumns,
  kindForColumn,
}) {
  return (
    <div className="space-y-2">
      {(item.sumCase?.branches || []).map((b, idx) => {
        const whenCol = String(b?.when?.column || "");
        const whenKind = kindForColumn(whenCol);
        const whenOp = String(b?.when?.op || "eq");
        const whenVal = b?.when?.value ?? "";
        const thenCol = String(b?.thenColumn || "");
        const ops =
          whenKind === "string"
            ? [
                { id: "eq", label: "=" },
                { id: "neq", label: "!=" },
              ]
            : [
                { id: "gt", label: ">" },
                { id: "lt", label: "<" },
                { id: "eq", label: "=" },
                { id: "neq", label: "!=" },
              ];

        return (
          <div key={`sumcase-${item.id}-${idx}`} className="flex flex-wrap items-center gap-1">
            <span className="min-w-8 text-[11px] font-medium text-muted-foreground">
              {idx === 0 ? "if" : "else if"}
            </span>
            <Select
              value={whenCol}
              onValueChange={(v) => {
                const next = (item.sumCase?.branches || []).map((x, j) =>
                  j === idx ? { ...x, when: { ...(x.when || {}), column: v } } : x,
                );
                updateComposeItem(item.id, { sumCase: { ...item.sumCase, branches: next } });
              }}
            >
              <SelectTrigger className="h-7 w-28 text-[11px]">
                <SelectValue placeholder="Column" />
              </SelectTrigger>
              <SelectContent>
                {availableColumns.map((c) => (
                  <SelectItem key={`${idx}-${c}`} value={c} className="text-[13px]">
                    {columnLabel(c)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={whenOp}
              onValueChange={(v) => {
                const next = (item.sumCase?.branches || []).map((x, j) =>
                  j === idx ? { ...x, when: { ...(x.when || {}), op: v } } : x,
                );
                updateComposeItem(item.id, { sumCase: { ...item.sumCase, branches: next } });
              }}
            >
              <SelectTrigger className="h-7 w-16 text-[11px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ops.map((o) => (
                  <SelectItem key={o.id} value={o.id} className="text-[13px]">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type={whenKind === "number" ? "number" : "text"}
              className="h-7 w-24 text-[11px]"
              value={String(whenVal)}
              onChange={(e) => {
                const raw = e.target.value;
                const nextVal = whenKind === "number" ? (raw === "" ? "" : Number(raw)) : raw;
                const next = (item.sumCase?.branches || []).map((x, j) =>
                  j === idx ? { ...x, when: { ...(x.when || {}), value: nextVal } } : x,
                );
                updateComposeItem(item.id, { sumCase: { ...item.sumCase, branches: next } });
              }}
              placeholder="value"
            />
            <span className="text-[11px] text-muted-foreground">then</span>
            <Select
              value={thenCol}
              onValueChange={(v) => {
                const next = (item.sumCase?.branches || []).map((x, j) =>
                  j === idx ? { ...x, thenColumn: v } : x,
                );
                updateComposeItem(item.id, { sumCase: { ...item.sumCase, branches: next } });
              }}
            >
              <SelectTrigger className="h-7 w-28 text-[11px]">
                <SelectValue placeholder="Column" />
              </SelectTrigger>
              <SelectContent>
                {numericColumns.map((c) => (
                  <SelectItem key={`then-${idx}-${c}`} value={c} className="text-[13px]">
                    {columnLabel(c)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {idx > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => {
                  const next = (item.sumCase?.branches || []).filter((_, j) => j !== idx);
                  updateComposeItem(item.id, { sumCase: { ...item.sumCase, branches: next } });
                }}
                aria-label="remove else if"
              >
                <X className="h-3 w-3" />
              </Button>
            ) : null}
          </div>
        );
      })}

      <div className="flex flex-wrap items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="h-7 text-[11px]">
              <Plus className="mr-1 h-3 w-3" />
              add else
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44">
            <DropdownMenuItem
              className="text-[13px]"
              disabled={!!item.sumCase?.elseColumn}
              onSelect={() => {
                updateComposeItem(item.id, {
                  sumCase: { ...item.sumCase, elseColumn: numericColumns[0] || "" },
                });
              }}
            >
              else
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-[13px]"
              onSelect={() => {
                const next = [
                  ...(item.sumCase?.branches || []),
                  {
                    when: { column: availableColumns[0] || "", op: "eq", value: "" },
                    thenColumn: numericColumns[0] || "",
                  },
                ];
                updateComposeItem(item.id, { sumCase: { ...item.sumCase, branches: next } });
              }}
            >
              else if
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {item.sumCase?.elseColumn ? (
          <div className="flex items-center gap-1">
            <span className="min-w-8 text-[11px] font-medium text-muted-foreground">else</span>
            <Select
              value={String(item.sumCase.elseColumn || "")}
              onValueChange={(v) =>
                updateComposeItem(item.id, { sumCase: { ...item.sumCase, elseColumn: v } })
              }
            >
              <SelectTrigger className="h-7 w-28 text-[11px]">
                <SelectValue placeholder="Column" />
              </SelectTrigger>
              <SelectContent>
                {numericColumns.map((c) => (
                  <SelectItem key={`else-${c}`} value={c} className="text-[13px]">
                    {columnLabel(c)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => updateComposeItem(item.id, { sumCase: { ...item.sumCase, elseColumn: "" } })}
              aria-label="remove else"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            Add an <span className="font-medium">else</span> branch to avoid nulls.
          </p>
        )}
      </div>
    </div>
  );
}
