"use client";

import { Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  defaultRefineOpForKind,
  inferRefineColumnKind,
  refineOpsForKind,
} from "@/lib/sheetOperations/refineQuery";

/**
 * @param {{
 *   clauses: Array<{ id: string; column: string; op: string; kind: string; value: string }>;
 *   columns: string[];
 *   dataTypes: Record<string, string>;
 *   rows: object[];
 *   disabled?: boolean;
 *   onUpdateClause: (id: string, patch: object) => void;
 *   onRemoveClause: (id: string) => void;
 *   onAddClause: (column: string) => void;
 * }} props
 */
export function RefineWhereClausesEditor({
  clauses,
  columns,
  dataTypes,
  rows,
  disabled = false,
  onUpdateClause,
  onRemoveClause,
  onAddClause,
}) {
  return (
    <div className="space-y-2">
      {clauses.length === 0 ? (
        <p className="text-[10px] text-muted-foreground">No filters — all rows pass.</p>
      ) : (
        <div className="space-y-2">
          {clauses.map((clause, idx) => {
            const kind = clause.kind || inferRefineColumnKind(clause.column, dataTypes, rows);
            const ops = refineOpsForKind(kind);
            const opValid = ops.some((op) => op.id === clause.op);
            const op = opValid ? clause.op : defaultRefineOpForKind(kind);

            return (
              <div key={clause.id} className="space-y-1">
                {idx > 0 ? (
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground pl-0.5">AND</p>
                ) : null}
                <div className="flex flex-wrap gap-2 items-end">
                  <div className="space-y-1 min-w-[7rem] flex-1">
                    {idx === 0 ? <Label className="text-[10px] text-muted-foreground">Column</Label> : null}
                    <Select
                      value={clause.column || ""}
                      disabled={disabled}
                      onValueChange={(col) => {
                        const nextKind = inferRefineColumnKind(col, dataTypes, rows);
                        onUpdateClause(clause.id, {
                          column: col,
                          kind: nextKind,
                          op: defaultRefineOpForKind(nextKind),
                          value: nextKind === "boolean" ? "true" : "",
                        });
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Column" />
                      </SelectTrigger>
                      <SelectContent>
                        {columns.map((c) => (
                          <SelectItem key={c} value={c} className="text-xs font-mono">
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 min-w-[8rem]">
                    {idx === 0 ? <Label className="text-[10px] text-muted-foreground">Operator</Label> : null}
                    <Select
                      value={op}
                      disabled={disabled}
                      onValueChange={(nextOp) => onUpdateClause(clause.id, { op: nextOp })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ops.map((item) => (
                          <SelectItem key={item.id} value={item.id} className="text-xs">
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 min-w-[6rem] flex-1">
                    {idx === 0 ? (
                      <Label className="text-[10px] text-muted-foreground">
                        Value
                        <span className="ml-1 font-normal text-muted-foreground/80">({kind})</span>
                      </Label>
                    ) : null}
                    {kind === "boolean" ? (
                      <Select
                        value={clause.value || "__skip__"}
                        disabled={disabled}
                        onValueChange={(v) => onUpdateClause(clause.id, { value: v === "__skip__" ? "" : v })}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__skip__" className="text-xs">
                            —
                          </SelectItem>
                          <SelectItem value="true" className="text-xs">
                            true
                          </SelectItem>
                          <SelectItem value="false" className="text-xs">
                            false
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        className="h-8 text-xs"
                        type={kind === "number" ? "number" : "text"}
                        value={clause.value ?? ""}
                        disabled={disabled}
                        onChange={(e) => onUpdateClause(clause.id, { value: e.target.value })}
                        placeholder={
                          kind === "number"
                            ? "e.g. 100"
                            : kind === "date"
                              ? "e.g. 2024-01-15"
                              : 'e.g. "true"'
                        }
                        spellCheck={false}
                      />
                    )}
                  </div>
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted/60 disabled:opacity-40"
                    disabled={disabled}
                    onClick={() => onRemoveClause(clause.id)}
                    aria-label="Remove filter"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1"
            disabled={disabled || columns.length === 0}
          >
            <Plus className="h-3.5 w-3.5" />
            {clauses.length > 0 ? "Add AND condition" : "Add filter"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-56 overflow-y-auto">
          {columns.map((c) => (
            <DropdownMenuItem key={c} className="text-xs font-mono" onSelect={() => onAddClause(c)}>
              {c}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <p className="text-[10px] text-muted-foreground">
        Multiple conditions are combined with AND. Leave a value empty to skip that condition.
      </p>
    </div>
  );
}
