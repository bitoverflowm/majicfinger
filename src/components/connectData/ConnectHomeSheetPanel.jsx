"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Columns3,
  FileJson,
  FileSpreadsheet,
  FileUp,
  Plus,
  Rows3,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useMyStateV2 } from "@/context/stateContextV2";
import { formatConnectRequestCardQuery } from "@/lib/connectHomeRequestQuery";
import { parseSpreadsheetFile } from "@/lib/parseSpreadsheetFile";
import {
  appendSheetOperation,
  createSheetOperation,
} from "@/lib/projectPersistence";
import { cn } from "@/lib/utils";

const SECTION_LABEL =
  "font-mono text-[10px] font-medium uppercase tracking-wide text-muted-foreground";
const PROP_LABEL = "text-[10px] font-medium leading-tight text-foreground";
const MUTED = "text-[10px] leading-snug text-muted-foreground";
const ACTION_BTN =
  "h-7 w-full justify-start gap-1.5 px-2 text-[11px] font-normal text-foreground";

function columnKeysFromRows(rows) {
  const keys = new Set();
  for (const row of rows || []) {
    if (!row || typeof row !== "object" || Array.isArray(row)) continue;
    for (const k of Object.keys(row)) keys.add(k);
  }
  return [...keys];
}

function colsFromKeys(keys) {
  return keys.map((field) => ({ field, cellDataType: "text" }));
}

function parseJsonRows(text) {
  const raw = String(text || "").trim();
  if (!raw) throw new Error("Paste JSON first.");
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Invalid JSON.");
  }
  if (Array.isArray(parsed)) {
    if (!parsed.length) return [];
    if (!parsed.every((r) => r && typeof r === "object" && !Array.isArray(r))) {
      throw new Error("JSON array must contain objects (rows).");
    }
    return parsed;
  }
  if (parsed && typeof parsed === "object") return [parsed];
  throw new Error("JSON must be an object or an array of objects.");
}

function summarizeEquations(sheet) {
  const out = [];
  const history = Array.isArray(sheet?.operationHistory) ? sheet.operationHistory : [];
  for (const op of history) {
    const type = String(op?.type || "");
    if (type === "computed.column") {
      const col = op?.payload?.column || op?.column;
      const kind = op?.payload?.expression?.kind;
      out.push(col ? `${col}${kind ? ` (${kind})` : ""}` : "Computed column");
      continue;
    }
    if (type === "bucket.sheet" || type === "band.sheet") {
      out.push(type === "band.sheet" ? "Bands" : "Buckets");
      continue;
    }
    if (type.startsWith("quant.") || type.includes("equation")) {
      out.push(type);
    }
  }
  const select = sheet?.provenance?.composeSpec?.select;
  if (Array.isArray(select)) {
    for (const item of select) {
      if (item?.equation) {
        const alias = String(item.alias || item.column || "equation").trim();
        out.push(`Compose · ${alias}`);
      }
    }
  }
  return [...new Set(out.filter(Boolean))];
}

function sheetQuerySummary(sheet) {
  const cards = Array.isArray(sheet?.requestCards) ? sheet.requestCards : [];
  const card = cards.length ? cards[cards.length - 1] : null;
  return String(formatConnectRequestCardQuery(card, sheet) || "").trim();
}

function sheetIsLive(sheet, sheetId, liveFeedState) {
  if (sheet?.provenance?.liveFeed) return true;
  const lake = String(sheet?.provenance?.lake || "").toLowerCase();
  if (lake === "kalshi-live" || lake === "polymarket-live" || lake === "polymarket live") {
    return true;
  }
  const feeds = Object.values(liveFeedState?.feedsById || {});
  return feeds.some((f) => {
    if (!f?.isRunning) return false;
    const ids = [f?.sheetId, f?.targetSheetId, f?.params?.sheetId, f?.params?.targetSheetId]
      .filter(Boolean)
      .map(String);
    return ids.includes(String(sheetId));
  });
}

/**
 * Right-drawer Sheet tab — properties, actions, and import for the active data sheet.
 */
export function ConnectHomeSheetPanel({ className }) {
  const ctx = useMyStateV2();
  const activeSheetId = ctx?.activeSheetId;
  const dataSheets = ctx?.dataSheets || {};
  const setDataSheets = ctx?.setDataSheets;
  const setConnectedData = ctx?.setConnectedData;
  const connectedData = ctx?.connectedData ?? [];
  const connectedCols = ctx?.connectedCols || [];
  const setConnectedCols = ctx?.setConnectedCols;
  const setDataConnected = ctx?.setDataConnected;
  const liveFeedState = ctx?.liveFeedState;

  const sheet = activeSheetId ? dataSheets[activeSheetId] : null;
  const rows = Array.isArray(sheet?.data)
    ? sheet.data
    : Array.isArray(connectedData)
      ? connectedData
      : [];

  const [nameDraft, setNameDraft] = useState("");
  const [editingName, setEditingName] = useState(false);
  const nameInputRef = useRef(null);

  const [addColOpen, setAddColOpen] = useState(false);
  const [newColName, setNewColName] = useState("");

  const [jsonViewerOpen, setJsonViewerOpen] = useState(false);
  const [jsonPaste, setJsonPaste] = useState("[]");

  const [pendingRows, setPendingRows] = useState(null);
  const [importSource, setImportSource] = useState("");
  const [dispositionOpen, setDispositionOpen] = useState(false);

  const csvInputRef = useRef(null);
  const xlsxInputRef = useRef(null);

  useEffect(() => {
    setNameDraft(String(sheet?.name || ""));
    setEditingName(false);
  }, [activeSheetId, sheet?.name]);

  useEffect(() => {
    if (editingName) nameInputRef.current?.focus?.();
  }, [editingName]);

  const queryText = useMemo(() => sheetQuerySummary(sheet), [sheet]);
  const equations = useMemo(() => summarizeEquations(sheet), [sheet]);
  const isLive = useMemo(
    () => sheetIsLive(sheet, activeSheetId, liveFeedState),
    [sheet, activeSheetId, liveFeedState],
  );

  const colCount = useMemo(() => {
    const fromCols = (connectedCols || [])
      .map((c) => (c && typeof c === "object" ? c.field : c))
      .filter(Boolean);
    if (fromCols.length) return fromCols.length;
    return columnKeysFromRows(rows).length;
  }, [connectedCols, rows]);

  const rowCount = rows.length;

  const commitName = useCallback(() => {
    const next = String(nameDraft || "").trim();
    setEditingName(false);
    if (!activeSheetId || !setDataSheets) return;
    if (!next) {
      setNameDraft(String(sheet?.name || ""));
      return;
    }
    if (next === String(sheet?.name || "")) return;
    setDataSheets((prev) => {
      const cur = prev?.[activeSheetId];
      if (!cur) return prev;
      return { ...prev, [activeSheetId]: { ...cur, name: next } };
    });
    toast.success("Sheet renamed");
  }, [activeSheetId, nameDraft, setDataSheets, sheet?.name]);

  const applyRowsToSheet = useCallback(
    (incoming, mode) => {
      if (!activeSheetId || !setDataSheets) return;
      const nextRows = Array.isArray(incoming) ? incoming : [];
      if (mode === "replace") {
        const keys = columnKeysFromRows(nextRows);
        setConnectedData?.(nextRows);
        setConnectedCols?.(colsFromKeys(keys));
        setDataSheets((prev) => {
          const cur = prev?.[activeSheetId] || { name: "Sheet" };
          return {
            ...prev,
            [activeSheetId]: {
              ...cur,
              data: nextRows,
              provenance: null,
            },
          };
        });
        setDataConnected?.(true);
        toast.success(
          `Replaced sheet with ${nextRows.length.toLocaleString()} row${nextRows.length === 1 ? "" : "s"}`,
        );
        return;
      }
      const existing = Array.isArray(sheet?.data)
        ? sheet.data
        : Array.isArray(connectedData)
          ? connectedData
          : [];
      const merged = [...existing, ...nextRows];
      const keys = columnKeysFromRows(merged);
      setConnectedData?.(merged);
      setConnectedCols?.(colsFromKeys(keys));
      setDataSheets((prev) => {
        const cur = prev?.[activeSheetId] || { name: "Sheet" };
        return {
          ...prev,
          [activeSheetId]: {
            ...cur,
            data: merged,
          },
        };
      });
      setDataConnected?.(true);
      toast.success(
        `Appended ${nextRows.length.toLocaleString()} row${nextRows.length === 1 ? "" : "s"}`,
      );
    },
    [
      activeSheetId,
      connectedData,
      setConnectedCols,
      setConnectedData,
      setDataConnected,
      setDataSheets,
      sheet?.data,
    ],
  );

  const openDisposition = useCallback((incoming, sourceLabel) => {
    setPendingRows(incoming);
    setImportSource(sourceLabel);
    setDispositionOpen(true);
  }, []);

  const handleAddRow = useCallback(() => {
    const keys = (connectedCols || [])
      .map((c) => (c && typeof c === "object" ? c.field : c))
      .filter(Boolean);
    const fields = keys.length ? keys : columnKeysFromRows(rows);
    if (!fields.length) {
      setConnectedData?.([...(rows || []), {}]);
    } else {
      const newRow = {};
      for (const k of fields) newRow[k] = "";
      setConnectedData?.([...(rows || []), newRow]);
    }
    setDataConnected?.(true);
    toast.success("Row added");
  }, [connectedCols, rows, setConnectedData, setDataConnected]);

  const handleAddColumn = useCallback(() => {
    const name = String(newColName || "").trim();
    if (!name) {
      toast.error("Enter a column name");
      return;
    }
    const existing = new Set(
      (connectedCols || [])
        .map((c) => (c && typeof c === "object" ? c.field : c))
        .filter(Boolean)
        .map(String),
    );
    for (const k of columnKeysFromRows(rows)) existing.add(k);
    if (existing.has(name)) {
      toast.error("Column already exists");
      return;
    }
    const nextCols = [...(connectedCols || []), { field: name, cellDataType: "text" }];
    setConnectedCols?.(nextCols);
    if ((rows || []).length > 0) {
      setConnectedData?.(rows.map((item) => ({ ...item, [name]: "" })));
    } else {
      setConnectedData?.([{ [name]: "" }]);
    }
    if (activeSheetId && setDataSheets) {
      const op = createSheetOperation("computed.column", {
        column: name,
        expression: { kind: "manual-empty-column" },
      });
      setDataSheets((prev) => appendSheetOperation(prev, activeSheetId, op));
    }
    setDataConnected?.(true);
    setAddColOpen(false);
    setNewColName("");
    toast.success("Column added");
  }, [
    activeSheetId,
    connectedCols,
    newColName,
    rows,
    setConnectedCols,
    setConnectedData,
    setDataConnected,
    setDataSheets,
  ]);

  const handlePrettyJsonPaste = useCallback(() => {
    try {
      const parsed = JSON.parse(String(jsonPaste || "").trim() || "[]");
      setJsonPaste(JSON.stringify(parsed, null, 2));
    } catch {
      toast.error("Invalid JSON — fix before formatting");
    }
  }, [jsonPaste]);

  const handleApplyJsonPaste = useCallback(() => {
    try {
      const next = parseJsonRows(jsonPaste);
      openDisposition(next, "JSON");
    } catch (e) {
      toast.error(e?.message || "Could not parse JSON");
    }
  }, [jsonPaste, openDisposition]);

  const handleFileImport = useCallback(
    async (file, kind) => {
      if (!file) return;
      try {
        const result = await parseSpreadsheetFile(file);
        const firstId = result.activeSheetId;
        const first = result.sheets?.[firstId];
        const nextRows = Array.isArray(first?.data) ? first.data : [];
        openDisposition(nextRows, kind.toUpperCase());
      } catch (e) {
        toast.error(e?.message || `Could not parse ${kind}`);
      }
    },
    [openDisposition],
  );

  if (!activeSheetId || !sheet) {
    return (
      <div className={cn("flex h-full flex-col gap-2 p-1", className)}>
        <p className={MUTED}>No active sheet. Add a sheet from the workspace bar.</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-full min-w-0 flex-col gap-3 overflow-y-auto overflow-x-hidden px-0.5 py-1",
        className,
      )}
    >
      <section className="grid gap-1.5" aria-labelledby="sheet-props-heading">
        <h3 id="sheet-props-heading" className={SECTION_LABEL}>
          Properties
        </h3>

        <div className="grid gap-1">
          <Label htmlFor="sheet-panel-name" className={PROP_LABEL}>
            Sheet name
          </Label>
          {editingName ? (
            <Input
              id="sheet-panel-name"
              ref={nameInputRef}
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitName();
                }
                if (e.key === "Escape") {
                  setNameDraft(String(sheet?.name || ""));
                  setEditingName(false);
                }
              }}
              className="h-7 px-2 text-[11px] text-foreground"
            />
          ) : (
            <button
              type="button"
              id="sheet-panel-name"
              onClick={() => setEditingName(true)}
              className={cn(
                "h-7 w-full truncate rounded-md border border-border/70 bg-background px-2 text-left text-[11px] text-foreground",
                "hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              )}
              title="Click to rename"
            >
              {sheet.name || "Untitled"}
            </button>
          )}
        </div>

        <div className="grid gap-0.5">
          <span className={PROP_LABEL}>Query</span>
          {queryText ? (
            <pre className="max-h-24 overflow-auto whitespace-pre-wrap break-words rounded-md border border-border/60 bg-muted/20 px-1.5 py-1 font-mono text-[10px] leading-snug text-foreground">
              {queryText}
            </pre>
          ) : (
            <p className={MUTED}>No query — blank or imported sheet.</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className={PROP_LABEL}>Live</span>
          <Badge
            variant="secondary"
            className={cn(
              "h-5 px-1.5 text-[9px] font-medium uppercase tracking-wide",
              isLive
                ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200"
                : "text-muted-foreground",
            )}
          >
            {isLive ? "Live" : "Static"}
          </Badge>
        </div>

        <div className="grid gap-0.5">
          <span className={PROP_LABEL}>Equations</span>
          {equations.length ? (
            <ul className="flex flex-col gap-0.5">
              {equations.map((eq) => (
                <li
                  key={eq}
                  className="truncate rounded border border-border/50 bg-muted/15 px-1.5 py-0.5 text-[10px] text-foreground"
                  title={eq}
                >
                  {eq}
                </li>
              ))}
            </ul>
          ) : (
            <p className={MUTED}>None active.</p>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-1 text-[11px] text-foreground">
            <Columns3 className="h-3 w-3 text-muted-foreground" aria-hidden />
            <span className="font-mono tabular-nums">{colCount}</span>
            <span className={MUTED}>cols</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-foreground">
            <Rows3 className="h-3 w-3 text-muted-foreground" aria-hidden />
            <span className="font-mono tabular-nums">{rowCount.toLocaleString()}</span>
            <span className={MUTED}>rows</span>
          </div>
        </div>
      </section>

      <Separator className="bg-border/60" />

      <section className="grid gap-1.5" aria-labelledby="sheet-actions-heading">
        <h3 id="sheet-actions-heading" className={SECTION_LABEL}>
          Actions
        </h3>
        <div className="grid gap-1">
          <Button type="button" variant="outline" className={ACTION_BTN} onClick={handleAddRow}>
            <Plus className="h-3 w-3 shrink-0" aria-hidden />
            Add row
          </Button>
          <Button
            type="button"
            variant="outline"
            className={ACTION_BTN}
            onClick={() => {
              setNewColName("");
              setAddColOpen(true);
            }}
          >
            <Plus className="h-3 w-3 shrink-0" aria-hidden />
            Add column
          </Button>
          <Button
            type="button"
            variant="outline"
            className={ACTION_BTN}
            onClick={() => setJsonViewerOpen(true)}
          >
            <FileJson className="h-3 w-3 shrink-0" aria-hidden />
            View as JSON
          </Button>
        </div>
      </section>

      <Separator className="bg-border/60" />

      <section className="grid gap-1.5" aria-labelledby="sheet-import-heading">
        <h3 id="sheet-import-heading" className={SECTION_LABEL}>
          Add more data
        </h3>

        <div className="grid gap-1">
          <Label htmlFor="sheet-json-paste" className={PROP_LABEL}>
            Paste JSON
          </Label>
          <Textarea
            id="sheet-json-paste"
            value={jsonPaste}
            onChange={(e) => setJsonPaste(e.target.value)}
            onBlur={handlePrettyJsonPaste}
            spellCheck={false}
            className="min-h-[7rem] resize-y px-2 py-1.5 font-mono text-[10px] leading-snug text-foreground"
            placeholder='[{"col": "value"}]'
          />
          <div className="flex gap-1">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-7 flex-1 text-[10px]"
              onClick={handlePrettyJsonPaste}
            >
              Format
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-7 flex-1 text-[10px]"
              onClick={handleApplyJsonPaste}
            >
              Apply JSON
            </Button>
          </div>
        </div>

        <div className="grid gap-1 pt-1">
          <Button
            type="button"
            variant="outline"
            className={ACTION_BTN}
            onClick={() => csvInputRef.current?.click()}
          >
            <FileUp className="h-3 w-3 shrink-0" aria-hidden />
            Upload CSV
          </Button>
          <Button
            type="button"
            variant="outline"
            className={ACTION_BTN}
            onClick={() => xlsxInputRef.current?.click()}
          >
            <FileSpreadsheet className="h-3 w-3 shrink-0" aria-hidden />
            Upload XLSX
          </Button>
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              void handleFileImport(file, "csv");
              e.target.value = "";
            }}
          />
          <input
            ref={xlsxInputRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              void handleFileImport(file, "xlsx");
              e.target.value = "";
            }}
          />
          <p className={cn(MUTED, "pt-0.5")}>
            You&apos;ll choose append or replace after selecting data.
          </p>
        </div>
      </section>

      <Dialog open={addColOpen} onOpenChange={setAddColOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Add column</DialogTitle>
            <DialogDescription className="text-xs">
              New empty column on “{sheet.name}”.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5 py-1">
            <Label htmlFor="sheet-new-col" className="text-xs">
              Column name
            </Label>
            <Input
              id="sheet-new-col"
              value={newColName}
              onChange={(e) => setNewColName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddColumn();
                }
              }}
              className="h-8 text-xs"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setAddColOpen(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={handleAddColumn}>
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={jsonViewerOpen} onOpenChange={setJsonViewerOpen}>
        <DialogContent className="flex max-h-[min(85dvh,640px)] flex-col gap-3 sm:max-w-[min(90vw,640px)]">
          <DialogHeader>
            <DialogTitle className="text-sm">Sheet as JSON</DialogTitle>
            <DialogDescription className="text-xs">
              “{sheet.name}” — {rowCount.toLocaleString()} row{rowCount === 1 ? "" : "s"} (read-only).
            </DialogDescription>
          </DialogHeader>
          <pre className="min-h-0 flex-1 overflow-auto rounded-md border border-border/60 bg-muted/20 p-2 font-mono text-[10px] leading-snug text-foreground">
            {JSON.stringify(rows, null, 2)}
          </pre>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(JSON.stringify(rows, null, 2));
                  toast.success("Copied JSON");
                } catch {
                  toast.error("Could not copy");
                }
              }}
            >
              Copy
            </Button>
            <Button type="button" size="sm" onClick={() => setJsonViewerOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={dispositionOpen} onOpenChange={setDispositionOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>How should this data land?</AlertDialogTitle>
            <AlertDialogDescription>
              {importSource ? `${importSource}: ` : ""}
              {(pendingRows || []).length.toLocaleString()} row
              {(pendingRows || []).length === 1 ? "" : "s"} ready for “{sheet.name}”.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <AlertDialogAction
              className="w-full"
              onClick={() => {
                applyRowsToSheet(pendingRows, "append");
                setPendingRows(null);
              }}
            >
              Append to existing data on sheet
            </AlertDialogAction>
            <AlertDialogAction
              className={cn(
                "w-full",
                "bg-destructive text-destructive-foreground hover:bg-destructive/90",
              )}
              onClick={() => {
                applyRowsToSheet(pendingRows, "replace");
                setPendingRows(null);
              }}
            >
              Wipe and replace data on sheet
            </AlertDialogAction>
            <AlertDialogCancel
              className="w-full"
              onClick={() => {
                setPendingRows(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
