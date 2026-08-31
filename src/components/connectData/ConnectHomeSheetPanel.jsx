"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Columns3,
  FileJson,
  FileSpreadsheet,
  FileType2,
  Plus,
  Rows3,
  Table2,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useMyStateV2 } from "@/context/stateContextV2";
import { formatConnectRequestCardQuery } from "@/lib/connectHomeRequestQuery";
import { nextNewSheetLabel } from "@/lib/connectHomeAddBlankSheet";
import { parseSpreadsheetFile } from "@/lib/parseSpreadsheetFile";
import {
  applyColumnPolicy,
  colsFromKeys,
  columnKeysFromRows,
  diffImportColumns,
  parseCsvText,
  parseJsonRows,
  parseMarkdownTable,
} from "@/lib/parseSheetImportText";
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
const FORMAT_BTN =
  "h-7 flex-1 min-w-[3.5rem] gap-1 px-1.5 text-[10px] font-medium text-foreground";

/** @typedef {"json"|"csv"|"xlsx"|"markdown"} ImportFormat */
/** @typedef {"append"|"replace"|"new_sheet"} ImportDisposition */
/** @typedef {"disposition"|"input"|"mismatch"} ImportStep */

const FORMAT_META = {
  json: {
    label: "JSON",
    title: "Add JSON",
    Icon: FileJson,
    acceptsPaste: true,
    acceptsUpload: true,
    accept: ".json,application/json",
    pastePlaceholder: '[{"col": "value"}]',
    pasteHint: "Paste a JSON array of objects (or one object).",
  },
  csv: {
    label: "CSV",
    title: "Add CSV",
    Icon: FileSpreadsheet,
    acceptsPaste: true,
    acceptsUpload: true,
    accept: ".csv,text/csv",
    pastePlaceholder: "col_a,col_b\n1,2",
    pasteHint: "Paste CSV text, or upload a .csv file.",
  },
  xlsx: {
    label: "XLSX",
    title: "Add XLSX",
    Icon: FileSpreadsheet,
    acceptsPaste: false,
    acceptsUpload: true,
    accept: ".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    pastePlaceholder: "",
    pasteHint: "Upload an .xlsx workbook (first sheet is used).",
  },
  markdown: {
    label: "Markdown",
    title: "Add Markdown table",
    Icon: Table2,
    acceptsPaste: true,
    acceptsUpload: false,
    accept: "",
    pastePlaceholder:
      "| col_a | col_b |\n| ----- | ----- |\n| 1     | 2     |",
    pasteHint: "Paste a Markdown pipe table (GPT-style tables work).",
  },
};

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

function existingColumnNames(connectedCols, rows) {
  const fromCols = (connectedCols || [])
    .map((c) => (c && typeof c === "object" ? c.field : c))
    .filter(Boolean)
    .map(String);
  if (fromCols.length) return fromCols;
  return columnKeysFromRows(rows);
}

function sheetHasMeaningfulData(rows, cols) {
  if ((cols || []).length > 0) return true;
  if (!Array.isArray(rows) || !rows.length) return false;
  return rows.some((r) => r && typeof r === "object" && Object.keys(r).length > 0);
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
  const addNewSheetAndActivate = ctx?.addNewSheetAndActivate;
  const setConnectHomeCenterView = ctx?.setConnectHomeCenterView;
  const setConnectHomeAnalyzeActive = ctx?.setConnectHomeAnalyzeActive;
  const setRightPanelTab = ctx?.setRightPanelTab;
  const setRightPanelOpen = ctx?.setRightPanelOpen;

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

  /** @type {[ImportFormat|null, Function]} */
  const [importFormat, setImportFormat] = useState(null);
  /** @type {[ImportStep, Function]} */
  const [importStep, setImportStep] = useState("disposition");
  /** @type {[ImportDisposition, Function]} */
  const [disposition, setDisposition] = useState("append");
  const [pasteText, setPasteText] = useState("");
  const [pendingRows, setPendingRows] = useState(null);
  const [columnDiff, setColumnDiff] = useState(null);
  const fileInputRef = useRef(null);

  const existingCols = useMemo(
    () => existingColumnNames(connectedCols, rows),
    [connectedCols, rows],
  );
  const hasSheetData = useMemo(
    () => sheetHasMeaningfulData(rows, existingCols),
    [rows, existingCols],
  );

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

  const colCount = existingCols.length;
  const rowCount = rows.length;

  const resetImportModal = useCallback(() => {
    setImportFormat(null);
    setImportStep("disposition");
    setDisposition(hasSheetData ? "append" : "replace");
    setPasteText("");
    setPendingRows(null);
    setColumnDiff(null);
  }, [hasSheetData]);

  const openImport = useCallback(
    (format) => {
      setImportFormat(format);
      setImportStep("disposition");
      setDisposition(hasSheetData ? "append" : "replace");
      setPasteText("");
      setPendingRows(null);
      setColumnDiff(null);
    },
    [hasSheetData],
  );

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

  const writeRowsToActiveSheet = useCallback(
    (nextRows, { clearProvenance = false } = {}) => {
      if (!activeSheetId || !setDataSheets) return;
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
            ...(clearProvenance ? { provenance: null } : {}),
          },
        };
      });
      setDataConnected?.(true);
    },
    [activeSheetId, setConnectedCols, setConnectedData, setDataConnected, setDataSheets],
  );

  const commitImport = useCallback(
    (incomingRows, columnPolicy) => {
      const existing = existingColumnNames(connectedCols, rows);
      let nextRows = Array.isArray(incomingRows) ? incomingRows : [];

      if (disposition === "append" && columnPolicy === "enforce") {
        nextRows = applyColumnPolicy(nextRows, existing, "enforce");
      }

      if (disposition === "new_sheet") {
        const name = nextNewSheetLabel(dataSheets);
        addNewSheetAndActivate?.(
          () => {
            setConnectHomeCenterView?.("sheet");
            setConnectHomeAnalyzeActive?.(true);
            setDataConnected?.(true);
            setRightPanelTab?.("sheet");
            setRightPanelOpen?.(true);
          },
          { name, data: nextRows, syncActivate: true },
        );
        const keys = columnKeysFromRows(nextRows);
        setTimeout(() => {
          setConnectedCols?.(colsFromKeys(keys));
          setConnectedData?.(nextRows);
        }, 0);
        toast.success(
          `Created ${name} with ${nextRows.length.toLocaleString()} row${nextRows.length === 1 ? "" : "s"}`,
        );
        resetImportModal();
        return;
      }

      if (disposition === "replace") {
        writeRowsToActiveSheet(nextRows, { clearProvenance: true });
        toast.success(
          `Replaced sheet with ${nextRows.length.toLocaleString()} row${nextRows.length === 1 ? "" : "s"}`,
        );
        resetImportModal();
        return;
      }

      const existingRows = Array.isArray(sheet?.data)
        ? sheet.data
        : Array.isArray(connectedData)
          ? connectedData
          : [];
      const paddedExisting =
        columnPolicy === "add"
          ? existingRows.map((r) => {
              const out = { ...r };
              for (const k of columnKeysFromRows(nextRows)) {
                if (!(k in out)) out[k] = "";
              }
              return out;
            })
          : existingRows;
      const paddedIncoming =
        columnPolicy === "add"
          ? nextRows.map((r) => {
              const out = { ...r };
              for (const k of existing) {
                if (!(k in out)) out[k] = "";
              }
              return out;
            })
          : nextRows;
      const merged = [...paddedExisting, ...paddedIncoming];
      writeRowsToActiveSheet(merged);
      toast.success(
        `Appended ${nextRows.length.toLocaleString()} row${nextRows.length === 1 ? "" : "s"}`,
      );
      resetImportModal();
    },
    [
      addNewSheetAndActivate,
      connectedCols,
      connectedData,
      dataSheets,
      disposition,
      resetImportModal,
      rows,
      setConnectHomeAnalyzeActive,
      setConnectHomeCenterView,
      setConnectedCols,
      setConnectedData,
      setDataConnected,
      setRightPanelOpen,
      setRightPanelTab,
      sheet?.data,
      writeRowsToActiveSheet,
    ],
  );

  const maybeHandleMismatchThenCommit = useCallback(
    (incomingRows) => {
      const needsMismatchCheck = disposition === "append" && hasSheetData;
      if (!needsMismatchCheck) {
        commitImport(incomingRows, "add");
        return;
      }
      const diff = diffImportColumns(existingCols, incomingRows);
      if (!diff.hasMismatch) {
        commitImport(incomingRows, "add");
        return;
      }
      setPendingRows(incomingRows);
      setColumnDiff(diff);
      setImportStep("mismatch");
    },
    [commitImport, disposition, existingCols, hasSheetData],
  );

  const parsePasteForFormat = useCallback((format, text) => {
    if (format === "json") return parseJsonRows(text);
    if (format === "markdown") return parseMarkdownTable(text);
    if (format === "csv") return parseCsvText(text, XLSX);
    throw new Error("This format requires a file upload.");
  }, []);

  const handleFormatPaste = useCallback(() => {
    if (!importFormat || importFormat === "xlsx") return;
    try {
      if (importFormat === "json") {
        const parsed = JSON.parse(String(pasteText || "").trim() || "[]");
        setPasteText(JSON.stringify(parsed, null, 2));
        return;
      }
      setPasteText(String(pasteText || "").trim());
      toast.success("Formatted");
    } catch {
      toast.error("Could not format — check your paste");
    }
  }, [importFormat, pasteText]);

  const handleApplyPaste = useCallback(() => {
    if (!importFormat) return;
    try {
      const next = parsePasteForFormat(importFormat, pasteText);
      if (!next.length) {
        toast.error("No rows found in paste");
        return;
      }
      maybeHandleMismatchThenCommit(next);
    } catch (e) {
      toast.error(e?.message || "Could not parse paste");
    }
  }, [importFormat, maybeHandleMismatchThenCommit, parsePasteForFormat, pasteText]);

  const handleFileChosen = useCallback(
    async (file) => {
      if (!file || !importFormat) return;
      try {
        if (importFormat === "json") {
          const text = await file.text();
          const next = parseJsonRows(text);
          if (!next.length) {
            toast.error("JSON file has no rows");
            return;
          }
          maybeHandleMismatchThenCommit(next);
          return;
        }
        if (importFormat === "csv" || importFormat === "xlsx") {
          const result = await parseSpreadsheetFile(file);
          const first = result.sheets?.[result.activeSheetId];
          const next = Array.isArray(first?.data) ? first.data : [];
          if (!next.length) {
            toast.error("File has no rows");
            return;
          }
          maybeHandleMismatchThenCommit(next);
          return;
        }
        toast.error("Upload is not supported for this format");
      } catch (e) {
        toast.error(e?.message || "Could not read file");
      }
    },
    [importFormat, maybeHandleMismatchThenCommit],
  );

  const handleAddRow = useCallback(() => {
    const fields = existingCols;
    if (!fields.length) {
      setConnectedData?.([...(rows || []), {}]);
    } else {
      const newRow = {};
      for (const k of fields) newRow[k] = "";
      setConnectedData?.([...(rows || []), newRow]);
    }
    setDataConnected?.(true);
    toast.success("Row added");
  }, [existingCols, rows, setConnectedData, setDataConnected]);

  const handleAddColumn = useCallback(() => {
    const name = String(newColName || "").trim();
    if (!name) {
      toast.error("Enter a column name");
      return;
    }
    const existing = new Set(existingCols);
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
    existingCols,
    newColName,
    rows,
    setConnectedCols,
    setConnectedData,
    setDataConnected,
    setDataSheets,
  ]);

  const formatMeta = importFormat ? FORMAT_META[importFormat] : null;

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
          Add Data
        </h3>
        <div className="flex flex-wrap gap-1">
          {/** @type {ImportFormat[]} */ (["json", "csv", "xlsx", "markdown"]).map((fmt) => {
            const meta = FORMAT_META[fmt];
            const Icon = meta.Icon;
            return (
              <Button
                key={fmt}
                type="button"
                variant="outline"
                className={FORMAT_BTN}
                onClick={() => openImport(fmt)}
              >
                <Icon className="h-3 w-3 shrink-0" aria-hidden />
                {meta.label}
              </Button>
            );
          })}
        </div>
        <p className={MUTED}>
          Choose a format — you&apos;ll pick append, replace, or a new sheet next.
        </p>
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

      <Dialog
        open={!!importFormat}
        onOpenChange={(open) => {
          if (!open) resetImportModal();
        }}
      >
        <DialogContent className="flex max-h-[min(90dvh,720px)] flex-col gap-3 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">{formatMeta?.title || "Add data"}</DialogTitle>
            <DialogDescription className="text-xs">
              {importStep === "disposition"
                ? "Choose how this data should land on your workbook."
                : importStep === "mismatch"
                  ? "Incoming columns don’t fully match this sheet."
                  : formatMeta?.pasteHint}
            </DialogDescription>
          </DialogHeader>

          {importStep === "disposition" ? (
            <div className="grid gap-2 py-1">
              <p className={cn(PROP_LABEL, "text-foreground")}>Destination</p>
              {[
                {
                  id: "append",
                  label: "Append to current data",
                  desc: "Add rows under what’s already on this sheet.",
                },
                {
                  id: "replace",
                  label: "Wipe and replace current sheet",
                  desc: "Clear this sheet and load the new rows.",
                },
                {
                  id: "new_sheet",
                  label: "Add new sheet",
                  desc: `Create ${nextNewSheetLabel(dataSheets)} with the imported rows.`,
                },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setDisposition(/** @type {ImportDisposition} */ (opt.id))}
                  className={cn(
                    "rounded-md border px-2.5 py-2 text-left transition-colors",
                    disposition === opt.id
                      ? "border-foreground/40 bg-muted/50"
                      : "border-border/70 bg-background hover:bg-muted/30",
                  )}
                >
                  <span className="block text-[11px] font-medium text-foreground">{opt.label}</span>
                  <span className={cn(MUTED, "mt-0.5 block")}>{opt.desc}</span>
                </button>
              ))}
              <DialogFooter className="mt-2 gap-2 sm:justify-between">
                <Button type="button" variant="outline" size="sm" onClick={resetImportModal}>
                  Cancel
                </Button>
                <Button type="button" size="sm" onClick={() => setImportStep("input")}>
                  Next
                </Button>
              </DialogFooter>
            </div>
          ) : null}

          {importStep === "input" && formatMeta ? (
            <div className="grid min-h-0 gap-2 py-1">
              {formatMeta.acceptsPaste ? (
                <div className="grid gap-1">
                  <Label htmlFor="sheet-import-paste" className={PROP_LABEL}>
                    Paste here
                  </Label>
                  <Textarea
                    id="sheet-import-paste"
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    spellCheck={false}
                    className="min-h-[9rem] resize-y px-2 py-1.5 font-mono text-[10px] leading-snug text-foreground"
                    placeholder={formatMeta.pastePlaceholder}
                  />
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-7 flex-1 text-[10px]"
                      onClick={handleFormatPaste}
                    >
                      Format
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 flex-1 text-[10px]"
                      onClick={handleApplyPaste}
                    >
                      Apply paste
                    </Button>
                  </div>
                </div>
              ) : null}

              {formatMeta.acceptsUpload ? (
                <div className="grid gap-1 pt-1">
                  {formatMeta.acceptsPaste ? (
                    <p className={cn(MUTED, "text-center")}>— or —</p>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    className={ACTION_BTN}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <FileType2 className="h-3 w-3 shrink-0" aria-hidden />
                    Upload file
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={formatMeta.accept}
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      void handleFileChosen(file);
                      e.target.value = "";
                    }}
                  />
                </div>
              ) : null}

              <DialogFooter className="mt-2 gap-2 sm:justify-between">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setImportStep("disposition")}
                >
                  Back
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={resetImportModal}>
                  Cancel
                </Button>
              </DialogFooter>
            </div>
          ) : null}

          {importStep === "mismatch" && columnDiff ? (
            <div className="grid gap-2 py-1">
              <p className="text-[11px] leading-snug text-foreground">
                These columns don&apos;t match any existing column
                {columnDiff.unknown.length ? ":" : "."}
              </p>
              {columnDiff.unknown.length ? (
                <ul className="max-h-24 overflow-auto rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1.5">
                  {columnDiff.unknown.map((c) => (
                    <li key={c} className="font-mono text-[10px] text-amber-950 dark:text-amber-100">
                      {c}
                    </li>
                  ))}
                </ul>
              ) : null}
              {columnDiff.overlap.length === 0 ? (
                <p className={cn(MUTED, "text-destructive")}>
                  No overlapping columns with the current sheet.
                </p>
              ) : null}
              {columnDiff.missing.length ? (
                <p className={MUTED}>
                  Missing from import (will stay blank on new rows):{" "}
                  <span className="font-mono text-foreground">
                    {columnDiff.missing.slice(0, 8).join(", ")}
                    {columnDiff.missing.length > 8 ? "…" : ""}
                  </span>
                </p>
              ) : null}
              <DialogFooter className="mt-1 flex-col gap-2 sm:flex-col">
                <Button
                  type="button"
                  className="w-full"
                  size="sm"
                  onClick={() => commitImport(pendingRows, "add")}
                >
                  Add new columns
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  size="sm"
                  onClick={() => commitImport(pendingRows, "enforce")}
                >
                  Enforce match (drop unknown columns)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  size="sm"
                  onClick={() => setImportStep("input")}
                >
                  Back
                </Button>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
