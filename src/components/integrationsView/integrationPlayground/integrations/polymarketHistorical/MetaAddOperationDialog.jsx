"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function operatorSymbol(op) {
  if (op === "gt") return ">";
  if (op === "lt") return "<";
  if (op === "eq" || op === "contains") return "=";
  if (op === "neq" || op === "not_contains") return "!=";
  return "=";
}

/**
 * @param {{
 *   open: boolean;
 *   onOpenChange: (open: boolean) => void;
 *   existingOperations: { id: string; label: string }[];
 *   hasDraftOperation: boolean;
 *   draftLabel: string;
 *   availableColumns: string[];
 *   columnTypeByName: Record<string, string>;
 *   isDateLikeName: (name: string) => boolean;
 *   isDemo?: boolean;
 *   onUpgradeRequest?: (featureName: string) => void;
 *   onComplete: (result: {
 *     intent: "new_sheet" | "append_row" | "merge_and" | "merge_or";
 *     merge?: { targetId: string; predicates: { column: string; kind: string; op: string; value: any }[] };
 *   }) => void;
 * }} props
 */
export function MetaAddOperationDialog({
  open,
  onOpenChange,
  existingOperations = [],
  hasDraftOperation = false,
  draftLabel = "Current operation",
  availableColumns = [],
  columnTypeByName = {},
  isDateLikeName = () => false,
  isDemo = false,
  onUpgradeRequest,
  onComplete,
}) {
  const [step, setStep] = useState(1);
  const [intent, setIntent] = useState(null);
  const [mergeTargetId, setMergeTargetId] = useState("");
  /** @type {{ id: string; column: string; kind: string; op: string; value: any }[]} */
  const [mergePredicates, setMergePredicates] = useState([]);

  useEffect(() => {
    if (!open) {
      setStep(1);
      setIntent(null);
      setMergeTargetId("");
      setMergePredicates([]);
    }
  }, [open]);

  const kindForColumn = useMemo(() => {
    return (columnName) => {
      const t = columnTypeByName[columnName];
      if (!t) return "string";
      const typeNorm = String(t).toLowerCase();
      if ((typeNorm === "bigint" || typeNorm === "int") && isDateLikeName(columnName)) return "date";
      if (typeNorm === "double" || typeNorm === "bigint" || typeNorm === "int") return "number";
      if (typeNorm === "string") return "string";
      return "string";
    };
  }, [columnTypeByName, isDateLikeName]);

  const targetChoices = useMemo(() => {
    const list = [...existingOperations];
    if (hasDraftOperation) {
      list.push({ id: "__draft__", label: `${draftLabel} (current)` });
    }
    return list;
  }, [existingOperations, hasDraftOperation, draftLabel]);

  const handleIntent = (nextIntent) => {
    setIntent(nextIntent);
    if (nextIntent === "merge_and" || nextIntent === "merge_or") {
      setStep(2);
      return;
    }
    onComplete?.({ intent: nextIntent });
    onOpenChange(false);
  };

  const handlePickTarget = () => {
    if (!mergeTargetId) return;
    setStep(3);
  };

  const addMergePredicate = () => {
    const col = availableColumns[0];
    if (!col) return;
    const kind = kindForColumn(col);
    const defaultValue = kind === "date" ? Date.now() : kind === "number" ? 0 : "";
    const defaultOp = kind === "string" ? "contains" : "gt";
    const id = `mp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setMergePredicates((prev) => [...prev, { id, column: col, kind, op: defaultOp, value: defaultValue }]);
  };

  const updatePred = (id, patch) => {
    setMergePredicates((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const removePred = (id) => {
    setMergePredicates((prev) => prev.filter((p) => p.id !== id));
  };

  const mergeIncomplete = mergePredicates.some((p) => {
    if (!p?.column || !p?.op || !p?.kind) return true;
    if (p.kind === "string") return !String(p.value ?? "").trim();
    if (p.kind === "date") return !Number.isFinite(Number(p.value));
    return !Number.isFinite(Number(p.value));
  });

  const handleMergeDone = () => {
    if (!mergeTargetId || mergePredicates.length === 0 || mergeIncomplete) return;
    const predicates = mergePredicates.map(({ column, kind, op, value }) => ({
      column,
      kind,
      op,
      value,
    }));
    onComplete?.({
      intent,
      merge: { targetId: mergeTargetId, predicates },
    });
    onOpenChange(false);
  };

  const renderPredicateRow = (p) => (
    <div key={p.id} className="flex flex-wrap items-center gap-1 border border-border/50 rounded-md p-2">
      <Select
        value={p.column}
        onValueChange={(val) => {
          const kind = kindForColumn(val);
          const defaultValue = kind === "date" ? Date.now() : kind === "number" ? 0 : "";
          const nextOp =
            kind === "string" ? (p.op === "not_contains" ? "not_contains" : "contains") : ["gt", "lt", "eq", "neq"].includes(p.op) ? p.op : "gt";
          updatePred(p.id, { column: val, kind, op: nextOp, value: defaultValue });
        }}
      >
        <SelectTrigger className="h-8 text-xs w-[120px]">
          <SelectValue placeholder="Column" />
        </SelectTrigger>
        <SelectContent>
          {availableColumns.map((col) => (
            <SelectItem key={col} value={col} className="text-xs">
              {col}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={p.op} onValueChange={(op) => updatePred(p.id, { op })}>
        <SelectTrigger className="h-8 text-xs w-[72px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(p.kind === "string"
            ? [
                { id: "contains", label: "is equal to" },
                { id: "not_contains", label: "not equal to" },
              ]
            : [
                { id: "gt", label: "greater than" },
                { id: "lt", label: "less than" },
                { id: "eq", label: "is equal to" },
                { id: "neq", label: "not equal to" },
              ]
          ).map((op) => (
            <SelectItem key={op.id} value={op.id} className="text-xs">
              <span className="inline-flex items-center gap-1">
                <span className="font-mono text-[10px]">{operatorSymbol(op.id)}</span>
                {op.label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {p.kind === "date" ? (
        <Input
          type="datetime-local"
          className="h-8 text-xs flex-1 min-w-[140px]"
          value={Number.isFinite(Number(p.value)) ? new Date(Number(p.value)).toISOString().slice(0, 16) : ""}
          onChange={(e) => {
            const ms = new Date(String(e.target.value)).getTime();
            updatePred(p.id, { value: Number.isFinite(ms) ? ms : "" });
          }}
        />
      ) : p.kind === "number" ? (
        <Input
          type="number"
          className="h-8 text-xs flex-1 min-w-[80px]"
          value={p.value}
          onChange={(e) => updatePred(p.id, { value: e.target.value === "" ? "" : Number(e.target.value) })}
        />
      ) : (
        <Input
          type="text"
          className="h-8 text-xs flex-1 min-w-[100px]"
          value={String(p.value ?? "")}
          onChange={(e) => updatePred(p.id, { value: e.target.value })}
        />
      )}

      <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={() => removePred(p.id)}>
        Remove
      </Button>
    </div>
  );

  if (step === 3 && (intent === "merge_and" || intent === "merge_or")) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {intent === "merge_and" ? "Add AND conditions" : "Add OR conditions"}
            </DialogTitle>
            <DialogDescription>
              {intent === "merge_and"
                ? "Each condition is combined with AND against the selected operation."
                : "Each condition forms an OR branch against the selected operation."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            {mergePredicates.length === 0 && (
              <p className="text-xs text-muted-foreground">Add at least one condition, then choose Done.</p>
            )}
            {mergePredicates.map(renderPredicateRow)}
            <Button type="button" variant="outline" size="sm" className="w-full text-xs" onClick={addMergePredicate} disabled={!availableColumns.length}>
              + Add condition
            </Button>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 flex-col sm:flex-row">
            <Button variant="ghost" className="w-full sm:w-auto" onClick={() => setStep(2)}>
              Back
            </Button>
            <DialogClose asChild>
              <Button variant="ghost" className="w-full sm:w-auto">
                Cancel
              </Button>
            </DialogClose>
            <Button className="w-full sm:w-auto" onClick={handleMergeDone} disabled={mergePredicates.length === 0 || mergeIncomplete}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (step === 2) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Merge with which operation?</DialogTitle>
            <DialogDescription>
              Choose an existing operation to combine using {intent === "merge_and" ? "AND" : "OR"}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label className="text-xs text-muted-foreground">Operation</Label>
            <Select value={mergeTargetId} onValueChange={setMergeTargetId}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Select operation" />
              </SelectTrigger>
              <SelectContent>
                {targetChoices.map((t) => (
                  <SelectItem key={t.id} value={t.id} className="text-xs">
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setStep(1)}>
              Back
            </Button>
            <DialogClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DialogClose>
            <Button onClick={handlePickTarget} disabled={!mergeTargetId}>
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add another operation</DialogTitle>
          <DialogDescription>Choose how this result should appear relative to your sheet and other operations.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 py-2">
          <Button variant="outline" className="justify-start h-auto min-h-10 px-3 py-2 text-left whitespace-normal" onClick={() => handleIntent("new_sheet")}>
            <span className="text-sm font-medium">1) Add operation result to new sheet</span>
          </Button>
          <Button variant="outline" className="justify-start h-auto min-h-10 px-3 py-2 text-left whitespace-normal" onClick={() => handleIntent("append_row")}>
            <span className="text-sm font-medium">2) Add operation result as a row on the current sheet</span>
          </Button>
          {!isDemo ? (
            <>
              <Button variant="outline" className="justify-start h-auto min-h-10 px-3 py-2 text-left whitespace-normal" onClick={() => handleIntent("merge_and")}>
                <span className="text-sm font-medium">3) Merge into an existing operation (AND)</span>
              </Button>
              <Button variant="outline" className="justify-start h-auto min-h-10 px-3 py-2 text-left whitespace-normal" onClick={() => handleIntent("merge_or")}>
                <span className="text-sm font-medium">4) Merge into an existing operation (OR)</span>
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                className="justify-start h-auto min-h-10 px-3 py-2 text-left whitespace-normal"
                onClick={() => {
                  onUpgradeRequest?.("Merge operations (AND)");
                  onOpenChange(false);
                }}
              >
                <span className="text-sm font-medium">3) Merge into an existing operation (AND) - Pro</span>
              </Button>
              <Button
                variant="outline"
                className="justify-start h-auto min-h-10 px-3 py-2 text-left whitespace-normal"
                onClick={() => {
                  onUpgradeRequest?.("Merge operations (OR)");
                  onOpenChange(false);
                }}
              >
                <span className="text-sm font-medium">4) Merge into an existing operation (OR) - Pro</span>
              </Button>
            </>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
