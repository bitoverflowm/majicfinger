"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { MAX_EQUATION_DEPTH } from "@/lib/dataLake/composeEquationAst";

const BINARY_LABEL = {
  "*": "× multiply",
  "/": "÷ divide",
  "+": "+ add",
  "-": "− subtract",
};

/**
 * @param {object} props
 * @param {string} props.baseColumn
 * @param {{ enabled: boolean; agg?: string; root: any }} props.equation
 * @param {(next: object) => void} props.onEquationChange
 * @param {string[]} props.availableColumns
 * @param {string[]} props.numericColumns
 * @param {(c: string) => string} props.kindForColumn
 * @param {(c: string) => string} props.composeSourceColumnLabel
 */
export default function EquationExprBuilder({
  baseColumn,
  equation,
  onEquationChange,
  availableColumns,
  numericColumns,
  kindForColumn,
  composeSourceColumnLabel,
}) {
  const root = equation?.root;

  if (!Array.isArray(numericColumns) || numericColumns.length === 0) {
    return (
      <p className="text-[11px] text-destructive">
        No numeric columns are available for this table — equation expressions need at least one numeric field.
      </p>
    );
  }

  return (
    <div className="space-y-2 rounded-md border border-border/60 bg-muted/20 p-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-muted-foreground leading-snug">
          <span className="font-mono text-foreground">SUM( … )</span> — build the inner expression stepwise. Depth limit {MAX_EQUATION_DEPTH}.
        </p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="h-7 text-[11px]">
              Replace root…
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="text-xs" align="end">
            <DropdownMenuLabel className="text-xs">Start from</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-xs"
              onClick={() =>
                onEquationChange({
                  ...equation,
                  agg: "sum",
                  root: { type: "col", name: numericColumns[0] || baseColumn },
                })
              }
            >
              Column
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-xs"
              onClick={() =>
                onEquationChange({
                  ...equation,
                  agg: "sum",
                  root: { type: "num", value: 1 },
                })
              }
            >
              Number literal
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-xs"
              onClick={() =>
                onEquationChange({
                  ...equation,
                  agg: "sum",
                  root: {
                    type: "bin",
                    op: "*",
                    left: { type: "col", name: numericColumns[0] || baseColumn },
                    right: { type: "num", value: 1 },
                  },
                })
              }
            >
              Binary operation (× ÷ + −)
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-xs"
              onClick={() =>
                onEquationChange({
                  ...equation,
                  agg: "sum",
                  root: { type: "grp", inner: { type: "col", name: numericColumns[0] || baseColumn } },
                })
              }
            >
              ( Parentheses )
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-xs"
              onClick={() =>
                onEquationChange({
                  ...equation,
                  agg: "sum",
                  root: {
                    type: "case",
                    branches: [
                      {
                        when: {
                          column: availableColumns[0] || "",
                          op: "eq",
                          value: "",
                        },
                        then: { type: "col", name: numericColumns[0] || baseColumn },
                      },
                    ],
                    elseNode: { type: "col", name: numericColumns[0] || baseColumn },
                  },
                })
              }
            >
              If / else (CASE)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {root ? (
        <ExprNodeView
          node={root}
          depth={0}
          onChange={(next) => onEquationChange({ ...equation, root: next })}
          baseColumn={baseColumn}
          availableColumns={availableColumns}
          numericColumns={numericColumns}
          kindForColumn={kindForColumn}
          composeSourceColumnLabel={composeSourceColumnLabel}
        />
      ) : (
        <p className="text-[11px] text-destructive">Missing expression root.</p>
      )}
    </div>
  );
}

/**
 * @param {object} p
 * @param {any} p.node
 * @param {(n: any) => void} p.onChange
 * @param {number} p.depth
 */
function ExprNodeView({
  node,
  onChange,
  depth,
  baseColumn,
  availableColumns,
  numericColumns,
  kindForColumn,
  composeSourceColumnLabel,
}) {
  const deep = depth >= MAX_EQUATION_DEPTH - 2;

  return (
    <div
      className={`rounded-md border border-border/50 bg-background/80 p-2 space-y-2 ${depth > 0 ? "ml-1 border-l-2 border-l-primary/30" : ""}`}
    >
      {deep ? (
        <p className="text-[10px] text-amber-700 dark:text-amber-400">Near max nesting depth — simplify if validation fails.</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-1">
        <span className="text-[10px] uppercase text-muted-foreground">Node</span>
        <Select
          value={String(node?.type || "")}
          onValueChange={(v) => {
            switch (v) {
              case "col":
                onChange({ type: "col", name: numericColumns[0] || baseColumn });
                break;
              case "num":
                onChange({ type: "num", value: 0 });
                break;
              case "bin":
                onChange({
                  type: "bin",
                  op: "*",
                  left: { type: "col", name: numericColumns[0] || baseColumn },
                  right: { type: "num", value: 1 },
                });
                break;
              case "grp":
                onChange({ type: "grp", inner: { type: "col", name: numericColumns[0] || baseColumn } });
                break;
              case "case":
                onChange({
                  type: "case",
                  branches: [
                    {
                      when: { column: availableColumns[0] || "", op: "eq", value: "" },
                      then: { type: "col", name: numericColumns[0] || baseColumn },
                    },
                  ],
                  elseNode: { type: "col", name: numericColumns[0] || baseColumn },
                });
                break;
              default:
                break;
            }
          }}
        >
          <SelectTrigger className="h-7 text-[11px] w-[9rem]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="col" className="text-xs">
              Column
            </SelectItem>
            <SelectItem value="num" className="text-xs">
              Literal number
            </SelectItem>
            <SelectItem value="bin" className="text-xs">
              Operation
            </SelectItem>
            <SelectItem value="grp" className="text-xs">
              ( … )
            </SelectItem>
            <SelectItem value="case" className="text-xs">
              If / else
            </SelectItem>
          </SelectContent>
        </Select>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="h-7 text-[11px] px-2">
              Insert…
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="text-xs" align="start">
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="text-xs">Columns</DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="text-xs max-h-64 overflow-y-auto">
                {numericColumns.map((c) => (
                  <DropdownMenuItem key={`ins-col-${c}`} className="text-xs" onClick={() => onChange({ type: "col", name: c })}>
                    {composeSourceColumnLabel(c)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="text-xs">Operations</DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="text-xs">
                {["*", "/", "+", "-"].map((op) => (
                  <DropdownMenuItem
                    key={op}
                    className="text-xs"
                    onClick={() =>
                      onChange({
                        type: "bin",
                        op,
                        left: node,
                        right: { type: "num", value: op === "/" ? 1 : 1 },
                      })
                    }
                  >
                    {BINARY_LABEL[op]}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-xs"
                  onClick={() => onChange({ type: "grp", inner: node })}
                >
                  Wrap in ( … )
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {node?.type === "col" ? (
        <div className="flex flex-wrap items-center gap-2">
          <Label className="text-[11px] text-muted-foreground">Numeric column</Label>
          <Select value={String(node.name || "")} onValueChange={(v) => onChange({ type: "col", name: v })}>
            <SelectTrigger className="h-7 text-[11px] min-w-[10rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-64 overflow-y-auto">
              {numericColumns.map((c) => (
                <SelectItem key={`nc-${c}`} value={c} className="text-xs">
                  {composeSourceColumnLabel(c)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {node?.type === "num" ? (
        <div className="flex flex-wrap items-center gap-2">
          <Label className="text-[11px] text-muted-foreground">Value</Label>
          <Input
            className="h-7 text-[11px] w-28"
            type="number"
            value={Number.isFinite(node.value) ? node.value : ""}
            onChange={(e) => {
              const raw = e.target.value;
              onChange({ type: "num", value: raw === "" ? 0 : Number(raw) });
            }}
          />
        </div>
      ) : null}

      {node?.type === "bin" ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Label className="text-[11px] text-muted-foreground">Operator</Label>
            <Select value={String(node.op || "*")} onValueChange={(v) => onChange({ ...node, op: v })}>
              <SelectTrigger className="h-7 text-[11px] w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["*", "/", "+", "-"].map((op) => (
                  <SelectItem key={op} value={op} className="text-xs">
                    {BINARY_LABEL[op]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Left</Label>
              <ExprNodeView
                node={node.left}
                depth={depth + 1}
                onChange={(next) => onChange({ ...node, left: next })}
                baseColumn={baseColumn}
                availableColumns={availableColumns}
                numericColumns={numericColumns}
                kindForColumn={kindForColumn}
                composeSourceColumnLabel={composeSourceColumnLabel}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Right</Label>
              <ExprNodeView
                node={node.right}
                depth={depth + 1}
                onChange={(next) => onChange({ ...node, right: next })}
                baseColumn={baseColumn}
                availableColumns={availableColumns}
                numericColumns={numericColumns}
                kindForColumn={kindForColumn}
                composeSourceColumnLabel={composeSourceColumnLabel}
              />
            </div>
          </div>
        </div>
      ) : null}

      {node?.type === "grp" ? (
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Inside parentheses</Label>
          <ExprNodeView
            node={node.inner}
            depth={depth + 1}
            onChange={(next) => onChange({ ...node, inner: next })}
            baseColumn={baseColumn}
            availableColumns={availableColumns}
            numericColumns={numericColumns}
            kindForColumn={kindForColumn}
            composeSourceColumnLabel={composeSourceColumnLabel}
          />
        </div>
      ) : null}

      {node?.type === "case" ? (
        <div className="space-y-2">
          {(node.branches || []).map((b, idx) => {
            const whenCol = String(b?.when?.column || "");
            const whenKind = kindForColumn(whenCol);
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
              <div key={`br-${idx}`} className="rounded border border-border/40 p-2 space-y-2 bg-muted/10">
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[11px] font-medium text-muted-foreground w-14">{idx === 0 ? "if" : "else if"}</span>
                  <Select
                    value={whenCol}
                    onValueChange={(v) => {
                      const next = [...(node.branches || [])];
                      next[idx] = { ...b, when: { ...(b.when || {}), column: v } };
                      onChange({ ...node, branches: next });
                    }}
                  >
                    <SelectTrigger className="h-7 text-[11px] w-32">
                      <SelectValue placeholder="Column" />
                    </SelectTrigger>
                    <SelectContent className="max-h-64 overflow-y-auto">
                      {availableColumns.map((c) => (
                        <SelectItem key={`wh-${idx}-${c}`} value={c} className="text-xs">
                          {composeSourceColumnLabel(c)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={String(b?.when?.op || "eq")}
                    onValueChange={(v) => {
                      const next = [...(node.branches || [])];
                      next[idx] = { ...b, when: { ...(b.when || {}), op: v } };
                      onChange({ ...node, branches: next });
                    }}
                  >
                    <SelectTrigger className="h-7 text-[11px] w-14">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ops.map((o) => (
                        <SelectItem key={o.id} value={o.id} className="text-xs">
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    className="h-7 text-[11px] w-28"
                    value={
                      typeof b?.when?.value === "number"
                        ? String(b.when.value)
                        : String(b?.when?.value ?? "")
                    }
                    onChange={(e) => {
                      const raw = e.target.value;
                      const num = Number(raw);
                      const val = raw === "" ? "" : Number.isFinite(num) && whenKind !== "string" ? num : raw;
                      const next = [...(node.branches || [])];
                      next[idx] = { ...b, when: { ...(b.when || {}), value: val } };
                      onChange({ ...node, branches: next });
                    }}
                    placeholder="Value"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">then (numeric)</Label>
                  <ExprNodeView
                    node={b.then}
                    depth={depth + 1}
                    onChange={(nextThen) => {
                      const next = [...(node.branches || [])];
                      next[idx] = { ...b, then: nextThen };
                      onChange({ ...node, branches: next });
                    }}
                    baseColumn={baseColumn}
                    availableColumns={availableColumns}
                    numericColumns={numericColumns}
                    kindForColumn={kindForColumn}
                    composeSourceColumnLabel={composeSourceColumnLabel}
                  />
                </div>
                {idx > 0 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[11px]"
                    onClick={() => {
                      const next = (node.branches || []).filter((_, j) => j !== idx);
                      onChange({ ...node, branches: next });
                    }}
                  >
                    Remove branch
                  </Button>
                ) : null}
              </div>
            );
          })}

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-[11px]"
            onClick={() => {
              const next = [
                ...(node.branches || []),
                {
                  when: { column: availableColumns[0] || "", op: "eq", value: "" },
                  then: { type: "col", name: numericColumns[0] || baseColumn },
                },
              ];
              onChange({ ...node, branches: next });
            }}
          >
            <Plus className="h-3 w-3 mr-1" />
            else if branch
          </Button>

          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">else (numeric)</Label>
            <ExprNodeView
              node={node.elseNode}
              depth={depth + 1}
              onChange={(nextElse) => onChange({ ...node, elseNode: nextElse })}
              baseColumn={baseColumn}
              availableColumns={availableColumns}
              numericColumns={numericColumns}
              kindForColumn={kindForColumn}
              composeSourceColumnLabel={composeSourceColumnLabel}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
