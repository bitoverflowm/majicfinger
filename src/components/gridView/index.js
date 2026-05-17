import { useEffect, useMemo, useState, useCallback } from "react";

import { useMyStateV2  } from '@/context/stateContextV2'
import { useHtmlDarkClass } from "@/hooks/use-html-dark-class";
import { cn } from "@/lib/utils";

import { AgGridReact } from 'ag-grid-react'; // React Grid Logic
import "ag-grid-community/styles/ag-grid.css"; // Core CSS
import "ag-grid-community/styles/ag-theme-balham.css"; // Theme

import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

import { PlusIcon } from "@radix-ui/react-icons"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { SummarizeDrawer } from "@/components/summarizationView";
import {
  ArrowDownFromLine,
  ArrowUpFromLine,
  TrafficCone,
  Filter,
  RotateCcw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Calendar,
  X,
  Copy,
  Download,
  BarChart2,
  Sigma,
  GripVertical,
  ChevronDown,
  Pencil,
  Trash,
  Database,
  FileJson,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ConnectProgressWithLabel } from "@/components/integrationsView/integrationPlayground/integrations/polymarketHistorical/ConnectProgressWithLabel";
import { DestructiveIconButton } from "@/components/primitives/destructive-icon-button";
import { GridSheetLoadingState } from "@/components/gridView/GridSheetLoadingState";
import { GridToolbarSkeleton } from "@/components/gridView/GridViewLoadingSkeleton";
import { SHEET_GRID_PAGE_SIZE } from "@/config/dataLakeParquetSamples";
import {
  connectGridAgCompactClass,
  connectGridFillViewportClass,
  connectGridToolbarButtonCompactClass,
  connectGridToolbarCompactClass,
} from "@/lib/connectGridCompact";
import { athenaRowsToObjects } from "@/lib/duckdb/duckdbWasmClient";
import { appendSheetOperation, createSheetOperation } from "@/lib/projectPersistence";
import { temporalToMs } from "@/lib/temporalParse";
import * as XLSX from 'xlsx';


const DATE_LIKE = /^\d{4}-\d{2}-\d{2}/;
// Labels produced by the Athena compose "dateBucket" formatter.
// Examples: "Q1 '24", "2024-03", "2024"
const QUARTER_LIKE = /^Q([1-4])\s*'?\s*(\d{2})$/i;
const MONTH_LIKE = /^(\d{4})-(\d{2})$/;
const YEAR_LIKE = /^(\d{4})$/;
const SHEET_JSON_INITIAL_ROWS = 40;
const SHEET_JSON_CHUNK_ROWS = 160;
const BUCKET_TIME_INTERVALS = [
  { value: "second", label: "Seconds", ms: 1000 },
  { value: "minute", label: "Minutes", ms: 60 * 1000 },
  { value: "15_minutes", label: "15 mins", ms: 15 * 60 * 1000 },
  { value: "hour", label: "Hour", ms: 60 * 60 * 1000 },
  { value: "day", label: "Day", ms: 24 * 60 * 60 * 1000 },
  { value: "week", label: "Week", ms: 7 * 24 * 60 * 60 * 1000 },
  { value: "month", label: "Month", calendar: "month" },
  { value: "year", label: "Year", calendar: "year" },
];
const BUCKET_AGG_FILTER_OPERATORS = [
  { value: "=", label: "=" },
  { value: "!=", label: "!=" },
  { value: ">", label: ">" },
  { value: ">=", label: ">=" },
  { value: "<", label: "<" },
  { value: "<=", label: "<=" },
  { value: "contains", label: "contains" },
  { value: "not_contains", label: "does not contain" },
  { value: "is_empty", label: "is empty" },
  { value: "is_not_empty", label: "is not empty" },
];

function stripInternalGridFields(row) {
  if (!row || typeof row !== "object") return row;
  const { _origIndex, ...clean } = row;
  return clean;
}

function serializeRowsAsJson(rows) {
  return JSON.stringify((Array.isArray(rows) ? rows : []).map(stripInternalGridFields), null, 2);
}

function dateBucketToSortKey(val) {
  if (val == null) return null;
  if (typeof val === "number" && Number.isFinite(val)) return val;
  if (typeof val !== "string") return null;
  const s = val.trim();
  if (DATE_LIKE.test(s)) return new Date(s).getTime();

  const q = s.match(QUARTER_LIKE);
  if (q) {
    const quarter = Number(q[1]);
    const yy = Number(q[2]);
    const year = yy >= 70 ? 1900 + yy : 2000 + yy; // 2-digit year heuristic
    const monthIndex = (quarter - 1) * 3; // Jan/Apr/Jul/Oct
    return Date.UTC(year, monthIndex, 1);
  }

  const m = s.match(MONTH_LIKE);
  if (m) {
    const year = Number(m[1]);
    const monthIndex = Number(m[2]) - 1;
    return Date.UTC(year, monthIndex, 1);
  }

  const y = s.match(YEAR_LIKE);
  if (y) {
    const year = Number(y[1]);
    return Date.UTC(year, 0, 1);
  }

  return null;
}
const TOKEN_ID_FIELDS = new Set(['conditionid', 'condition_id', 'clobtokenids', 'clob_token_ids', 'asset_id', 'market', 'market_id']);

function getColKeys(connectedCols) {
  return (connectedCols || []).map((c) => (c && typeof c === 'object' && 'field' in c ? c.field : c)).filter(Boolean);
}

function genRequestCardId() {
  return `req-${Date.now().toString(36)}-${Math.random().toString(16).slice(2)}`;
}

/** Collect finite numeric values from a column for statistics (coerces numeric strings). */
function columnNumericValuesForStats(rows, colKey) {
  const nums = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    if (!row || typeof row !== "object") continue;
    const v = row[colKey];
    if (typeof v === "number" && Number.isFinite(v)) nums.push(v);
    else if (v != null && v !== "") {
      const n = typeof v === "string" ? Number(String(v).trim()) : Number(v);
      if (Number.isFinite(n)) nums.push(n);
    }
  }
  return nums;
}

/** Population standard deviation: sqrt( mean of squared deviations from mean ). */
function populationStandardDeviation(values) {
  if (!values.length) return null;
  const n = values.length;
  const mean = values.reduce((s, x) => s + x, 0) / n;
  const variance = values.reduce((s, x) => s + (x - mean) ** 2, 0) / n;
  return Math.sqrt(variance);
}

/** Single finite number from a cell for stats / row-wise math; otherwise null. */
function parseCellFiniteForStat(row, colKey) {
  if (!row || typeof row !== "object") return null;
  const v = row[colKey];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (v == null || v === "") return null;
  const n = typeof v === "string" ? Number(String(v).trim()) : Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Population σ over a fixed window of consecutive rows ending at rowIndex (inclusive).
 * Returns null if the window is incomplete or any cell in the window is non-numeric.
 */
function rollingPopulationStdDevAtIndex(rows, colKey, rowIndex, windowSize) {
  if (!Number.isFinite(windowSize) || windowSize < 1) return null;
  const start = rowIndex - windowSize + 1;
  if (start < 0) return null;
  const vals = [];
  for (let j = start; j <= rowIndex; j++) {
    const n = parseCellFiniteForStat(rows[j], colKey);
    if (n == null) return null;
    vals.push(n);
  }
  return populationStandardDeviation(vals);
}

function bucketKeyForValue(value) {
  if (value == null || value === "") return "(empty)";
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? "(empty)" : value.toISOString();
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function niceBucketSize(rawSize) {
  const n = Number(rawSize);
  if (!Number.isFinite(n) || n <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(n));
  const scaled = n / power;
  const nice = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10;
  return nice * power;
}

function formatBucketNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(6)));
}

function timeBucketStartMs(ms, intervalValue) {
  const opt = BUCKET_TIME_INTERVALS.find((item) => item.value === intervalValue) || BUCKET_TIME_INTERVALS[4];
  if (!Number.isFinite(ms)) return NaN;
  if (opt.calendar === "year") return Date.UTC(new Date(ms).getUTCFullYear(), 0, 1);
  if (opt.calendar === "month") {
    const d = new Date(ms);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
  }
  const step = Number(opt.ms);
  if (!Number.isFinite(step) || step <= 0) return NaN;
  if (opt.value === "week") {
    const dayStart = Math.floor(ms / (24 * 60 * 60 * 1000)) * (24 * 60 * 60 * 1000);
    const dayOfWeek = new Date(dayStart).getUTCDay();
    const daysSinceMonday = (dayOfWeek + 6) % 7;
    return dayStart - daysSinceMonday * 24 * 60 * 60 * 1000;
  }
  return Math.floor(ms / step) * step;
}

function formatTimeBucketLabel(ms, intervalValue) {
  if (!Number.isFinite(ms)) return "(invalid time)";
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "(invalid time)";
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const min = String(d.getUTCMinutes()).padStart(2, "0");
  const sec = String(d.getUTCSeconds()).padStart(2, "0");
  if (intervalValue === "year") return String(yyyy);
  if (intervalValue === "month") return `${yyyy}-${mm}`;
  if (intervalValue === "day" || intervalValue === "week") return `${yyyy}-${mm}-${dd}`;
  if (intervalValue === "hour") return `${yyyy}-${mm}-${dd} ${hh}:00`;
  if (intervalValue === "minute" || intervalValue === "15_minutes") return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${sec}`;
}

function getBucketForRow(row, config) {
  const bucketColumn = String(config?.bucketColumn || "").trim();
  const raw = row?.[bucketColumn];
  const mode = String(config?.bucketMode || "category");
  if (mode === "time") {
    const ms = temporalToMs(raw);
    const startMs = timeBucketStartMs(ms, config?.timeInterval || "day");
    const label = formatTimeBucketLabel(startMs, config?.timeInterval || "day");
    return { key: `time:${startMs}`, label, sortValue: Number.isFinite(startMs) ? startMs : Number.POSITIVE_INFINITY };
  }
  if (mode === "number") {
    const n = Number(raw);
    if (!Number.isFinite(n)) return { key: "number:(empty)", label: "(empty)", sortValue: Number.POSITIVE_INFINITY };
    const size = Number(config?.numericBucketSize);
    const step = Number.isFinite(size) && size > 0 ? size : 1;
    const start = Math.floor(n / step) * step;
    const end = start + step;
    return {
      key: `number:${start}`,
      label: `${formatBucketNumber(start)}-${formatBucketNumber(end)}`,
      sortValue: start,
    };
  }
  const key = bucketKeyForValue(raw);
  return { key: `category:${key}`, label: raw ?? "", sortValue: key };
}

function rowMatchesAggregationFilter(row, agg) {
  if (!agg?.filterEnabled) return true;
  const column = String(agg.filterColumn || "").trim();
  const operator = String(agg.filterOperator || "=");
  if (!column || !operator) return true;
  const valueNeeded = !["is_empty", "is_not_empty"].includes(operator);
  if (valueNeeded && String(agg.filterValue ?? "").trim() === "") return true;
  return compareMathValues(row?.[column], operator, rawMathValue(agg.filterValue));
}

function aggregateBucketRows(rows, config) {
  const sourceRows = Array.isArray(rows) ? rows : [];
  const bucketColumn = String(config?.bucketColumn || "").trim();
  const bucketOutputColumn = String(config?.bucketOutputColumn || bucketColumn || "bucket").trim();
  const passthroughColumns = Array.isArray(config?.passthroughColumns)
    ? config.passthroughColumns.filter(Boolean)
    : [];
  const aggregations = Array.isArray(config?.aggregations)
    ? config.aggregations.filter((agg) => agg && typeof agg === "object")
    : [];
  if (!bucketColumn || !bucketOutputColumn) return [];

  const groups = new Map();
  for (const row of sourceRows) {
    if (!row || typeof row !== "object") continue;
    const bucket = getBucketForRow(row, config);
    if (!groups.has(bucket.key)) {
      groups.set(bucket.key, { key: bucket.key, rawBucket: bucket.label, sortValue: bucket.sortValue, firstRow: row, rows: [] });
    }
    groups.get(bucket.key).rows.push(row);
  }

  return Array.from(groups.values()).sort((a, b) => {
    const av = a.sortValue;
    const bv = b.sortValue;
    if (typeof av === "number" && typeof bv === "number") return av - bv;
    return String(av ?? "").localeCompare(String(bv ?? ""));
  }).map((group) => {
    const out = { [bucketOutputColumn]: group.rawBucket ?? "" };
    for (const col of passthroughColumns) {
      if (!col || col === bucketColumn || col === "_origIndex") continue;
      out[col] = group.firstRow?.[col] ?? null;
    }
    for (const agg of aggregations) {
      const type = String(agg.type || "count");
      const valueColumn = String(agg.valueColumn || "").trim();
      const weightColumn = String(agg.weightColumn || "").trim();
      const denominatorColumn = String(agg.denominatorColumn || "").trim();
      const outputColumn = String(agg.outputColumn || "").trim();
      if (!outputColumn) continue;
      const rowsForAgg = group.rows.filter((row) => rowMatchesAggregationFilter(row, agg));

      if (type === "count") {
        out[outputColumn] = valueColumn
          ? rowsForAgg.reduce((count, row) => (row?.[valueColumn] == null || row?.[valueColumn] === "" ? count : count + 1), 0)
          : rowsForAgg.length;
        continue;
      }

      let sum = 0;
      let count = 0;
      let weightedSum = 0;
      let weightSum = 0;
      let productSum = 0;
      let productCount = 0;
      for (const row of rowsForAgg) {
        const value = parseCellFiniteForStat(row, valueColumn);
        if (value == null) continue;
        if (type === "sum" || type === "average") {
          sum += value;
          count += 1;
        } else if (type === "weighted_average") {
          const weight = parseCellFiniteForStat(row, weightColumn);
          if (weight == null) continue;
          weightedSum += value * weight;
          weightSum += weight;
        } else if (type === "product_ratio") {
          const weight = parseCellFiniteForStat(row, weightColumn);
          if (weight == null) continue;
          productSum += value * weight;
          productCount += 1;
        }
      }
      if (type === "sum") out[outputColumn] = count > 0 ? sum : null;
      else if (type === "average") out[outputColumn] = count > 0 ? sum / count : null;
      else if (type === "weighted_average") out[outputColumn] = weightSum !== 0 ? weightedSum / weightSum : null;
      else if (type === "product_ratio") {
        const denom = Number(out[denominatorColumn]);
        out[outputColumn] = productCount > 0 && Number.isFinite(denom) && denom !== 0 ? productSum / denom : null;
      }
    }
    return out;
  });
}

function rawMathValue(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  const n = Number(text);
  return Number.isFinite(n) ? n : text;
}

function compareMathValues(left, operator, right) {
  const op = String(operator || "=");
  if (op === "is_empty") return left == null || left === "";
  if (op === "is_not_empty") return left != null && left !== "";
  if (op === "contains" || op === "not_contains") {
    const hit = String(left ?? "").toLowerCase().includes(String(right ?? "").toLowerCase());
    return op === "not_contains" ? !hit : hit;
  }
  const leftNum = Number(left);
  const rightNum = Number(right);
  const numeric = Number.isFinite(leftNum) && Number.isFinite(rightNum);
  const a = numeric ? leftNum : String(left ?? "").toLowerCase();
  const b = numeric ? rightNum : String(right ?? "").toLowerCase();
  if (op === "=" || op === "eq") return a === b;
  if (op === "!=" || op === "ne") return a !== b;
  if (op === ">" || op === "gt") return numeric ? a > b : String(a).localeCompare(String(b)) > 0;
  if (op === ">=" || op === "gte") return numeric ? a >= b : String(a).localeCompare(String(b)) >= 0;
  if (op === "<" || op === "lt") return numeric ? a < b : String(a).localeCompare(String(b)) < 0;
  if (op === "<=" || op === "lte") return numeric ? a <= b : String(a).localeCompare(String(b)) <= 0;
  return false;
}

function applyMathBinaryOp(op, a, b) {
  const left = Number(a);
  const right = Number(b);
  if (!Number.isFinite(left) || !Number.isFinite(right)) return null;
  if (op === "add") return left + right;
  if (op === "subtract") return left - right;
  if (op === "multiply") return left * right;
  if (op === "divide") return right === 0 ? null : left / right;
  return null;
}

function resolveMathOperand(row, operand) {
  const spec = operand && typeof operand === "object" ? operand : { kind: "raw", value: "" };
  if (spec.kind === "column") return row?.[spec.column];
  if (spec.kind === "operation") {
    const base = row?.[spec.column];
    const rhs = spec.operandKind === "column" ? row?.[spec.operandColumn] : rawMathValue(spec.operandValue);
    return applyMathBinaryOp(spec.op, base, rhs);
  }
  return rawMathValue(spec.value);
}

function evaluateIfElseExpression(row, expression) {
  const clauses = Array.isArray(expression?.clauses) ? expression.clauses : [];
  for (const clause of clauses) {
    if (!clause?.condition) continue;
    const left = row?.[clause.condition.leftColumn];
    const right = clause.condition.rightKind === "column"
      ? row?.[clause.condition.rightColumn]
      : rawMathValue(clause.condition.rightValue);
    if (compareMathValues(left, clause.condition.operator, right)) {
      return resolveMathOperand(row, clause.then);
    }
  }
  return resolveMathOperand(row, expression?.else);
}

const GridView = ({ startNew, fillViewport = false }) => {

    const contextStateV2 = useMyStateV2()
    const isDark = useHtmlDarkClass();
    const agThemeClass = isDark ? "ag-theme-balham-dark" : "ag-theme-balham";

    let connectedCols = contextStateV2?.connectedCols || []
    let setConnectedCols = contextStateV2?.setConnectedCols || []
    let connectedData = contextStateV2?.connectedData || []
    let setConnectedData = contextStateV2?.setConnectedData || []
    const replaceCurrentSheetData = contextStateV2?.replaceCurrentSheetData
    const addNewSheetAndActivate = contextStateV2?.addNewSheetAndActivate
    const setSheetData = contextStateV2?.setSheetData
    const setDataSheets = contextStateV2?.setDataSheets
    const setDataTypes = contextStateV2?.setDataTypes
    const dataTypes = contextStateV2?.dataTypes || {}
    let dataSheets = contextStateV2?.dataSheets || {}
    const activeSheetId = contextStateV2?.activeSheetId
    const activeSheet = activeSheetId ? dataSheets?.[activeSheetId] : null;
    const isProvenancePreviewSheet =
      activeSheet?.storageMode === "provenance" && activeSheet?.rehydrationStatus !== "complete";
    const [rehydrateBusy, setRehydrateBusy] = useState(false);
    const connectDataLakePullState = contextStateV2?.connectDataLakePullState ?? {};
    const viewing = contextStateV2?.viewing;
    const connectHomeAnalyzeActive = !!contextStateV2?.connectHomeAnalyzeActive;
    const isConnectPullLoading =
        !!connectDataLakePullState.loading &&
        (viewing === "connectDataHome" || connectHomeAnalyzeActive);
    const activeSheetRowCount = Array.isArray(activeSheet?.data) ? activeSheet.data.length : 0;
    const hasDisplayRows =
        (connectedData?.length ?? 0) > 0 || activeSheetRowCount > 0;
    const pullProgress = Number(connectDataLakePullState.progress) || 0;
    const isConnectAnalyzeViewport =
        fillViewport && connectHomeAnalyzeActive && viewing === "connectDataHome";
    const connectAwaitingSheetData =
        isConnectAnalyzeViewport && !hasDisplayRows && !connectDataLakePullState.error;
    const pullInFlight =
        isConnectPullLoading ||
        (!!connectDataLakePullState.label &&
            pullProgress > 0 &&
            pullProgress < 100);
    /** Never mask an already-loaded sheet with DuckDB boot / stale pull progress UI. */
    const isSheetLoading =
        rehydrateBusy ||
        (!hasDisplayRows &&
            (isConnectPullLoading || (connectAwaitingSheetData && pullInFlight)));
    const sheetLoadingLabel =
        connectDataLakePullState.label || (rehydrateBusy ? "Reloading sheet…" : "Loading data…");
    const sheetLoadingProgress = rehydrateBusy ? pullProgress || 50 : pullProgress;
    const appendActiveSheetOperation = useCallback(
      (type, payload = {}) => {
        if (!activeSheetId || !setDataSheets) return;
        const op = createSheetOperation(type, payload);
        setDataSheets((prev) => appendSheetOperation(prev, activeSheetId, op));
      },
      [activeSheetId, setDataSheets],
    );

    const rehydrateActiveSheet = useCallback(async () => {
      if (!activeSheetId || !activeSheet?.provenance) {
        toast.error("This sheet does not have saved Data Lake provenance.");
        return;
      }
      const sheetGraph = {};
      const safeName = (name, id) => {
        let t = String(name || id || "sheet").replace(/[^a-zA-Z0-9_]+/g, "_");
        if (/^[0-9]/.test(t)) t = `s_${t}`;
        const out = t.slice(0, 60);
        return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(out) ? out : `sheet_${String(id).replace(/\W/g, "")}`.slice(0, 60);
      };
      const collectSheetGraph = (id) => {
        if (!id || sheetGraph[id]) return;
        const sheet = dataSheets?.[id];
        if (!sheet?.provenance) return;
        sheetGraph[id] = { name: safeName(sheet.name, id), provenance: sheet.provenance };
        for (const dep of sheet.provenance.serverSheetJoins || []) {
          if (dep?.targetSheetId) collectSheetGraph(dep.targetSheetId);
        }
      };
      collectSheetGraph(activeSheetId);
      setRehydrateBusy(true);
      try {
        const res = await fetch("/api/data-lake/rehydrate-sheet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            sheetId: activeSheetId,
            provenance: activeSheet.provenance,
            sheetGraph,
            operationHistory: activeSheet.operationHistory || [],
            maxRows: activeSheet.fullRowCount || activeSheet.rowCount || undefined,
            previewRows: activeSheet.data || [],
            saveMeta: activeSheet.saveMeta || null,
          }),
        });
        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.error || res.statusText || `Rehydrate ${res.status}`);
        const rows = Array.isArray(json?.rows) ? json.rows : [];
        setConnectedData?.(rows);
        setDataSheets?.((prev) => {
          const p = prev || {};
          const sheet = p[activeSheetId] || activeSheet;
          return {
            ...p,
            [activeSheetId]: {
              ...sheet,
              data: rows,
              storageMode: "inline",
              rehydrationStatus: "complete",
              rowCount: rows.length,
              fullRowCount: json?.rowCount ?? rows.length,
              columns: Array.isArray(json?.columns) ? json.columns : sheet.columns,
            },
          };
        });
        if (json?.warning) toast.warning(json.warning);
        else toast.success("Reloaded full sheet data from saved query.");
      } catch (e) {
        toast.error(e?.message || "Failed to reload saved query.");
      } finally {
        setRehydrateBusy(false);
      }
    }, [activeSheet, activeSheetId, dataSheets, setConnectedData, setDataSheets]);
    
    const [columnName, setColumnName] = useState('');
    const [colAddOpen, setColAddOpen] = useState()
    const [gridExpanded, setGridExpanded] = useState()

    const [summarizeOpen, setSummarizeOpen] = useState(false);
    const [mathDialogOpen, setMathDialogOpen] = useState(false);
    const [mathBaseCol, setMathBaseCol] = useState("");
    const [mathReferenceMode, setMathReferenceMode] = useState("row_wise");
    const [mathCurrentRowRef, setMathCurrentRowRef] = useState("current_row");
    const [mathOp, setMathOp] = useState("subtract");
    const [mathRelativeRowRef, setMathRelativeRowRef] = useState("prev_row");
    const [mathOutCol, setMathOutCol] = useState("");
    const [mathBasicColA, setMathBasicColA] = useState("");
    const [mathBasicColB, setMathBasicColB] = useState("");
    const [mathDestination, setMathDestination] = useState("current_sheet");
    const [mathDialogTab, setMathDialogTab] = useState("basic");
    const [mathFunctionType, setMathFunctionType] = useState("row_operation");
    const [mathIfClauses, setMathIfClauses] = useState([
      {
        id: "if-1",
        condition: { leftColumn: "", operator: "=", rightKind: "raw", rightColumn: "", rightValue: "" },
        then: { kind: "raw", value: "" },
      },
    ]);
    const [mathElseResult, setMathElseResult] = useState({ kind: "raw", value: "" });
    const [statsStdDevActive, setStatsStdDevActive] = useState(false);
    const [statsStdSourceCol, setStatsStdSourceCol] = useState("");
    const [statsStdOutCol, setStatsStdOutCol] = useState("");
    const [statsStdMode, setStatsStdMode] = useState("full"); // full | rolling
    const [statsRollCount, setStatsRollCount] = useState("4");
    const [statsCumsumActive, setStatsCumsumActive] = useState(false);
    const [statsCumsumSourceCol, setStatsCumsumSourceCol] = useState("");
    const [statsCumsumOutCol, setStatsCumsumOutCol] = useState("");
    const [statsBucketActive, setStatsBucketActive] = useState(false);
    const [statsBucketColumn, setStatsBucketColumn] = useState("");
    const [statsBucketOutputColumn, setStatsBucketOutputColumn] = useState("bucket");
    const [statsBucketSheetName, setStatsBucketSheetName] = useState("");
    const [statsBucketMode, setStatsBucketMode] = useState("category");
    const [statsBucketTimeInterval, setStatsBucketTimeInterval] = useState("day");
    const [statsBucketNumericSize, setStatsBucketNumericSize] = useState("");
    const [statsBucketPassthroughCols, setStatsBucketPassthroughCols] = useState(() => new Set());
    const [statsBucketAggregations, setStatsBucketAggregations] = useState([
      { id: "bucket-agg-1", type: "count", valueColumn: "", weightColumn: "", denominatorColumn: "", outputColumn: "count", filterEnabled: false, filterColumn: "", filterOperator: "=", filterValue: "" },
    ]);

    // Combine Sheets (client-side join across already-loaded sheets)
    const [combineSheetsDialogOpen, setCombineSheetsDialogOpen] = useState(false);
    const [combineJoinType, setCombineJoinType] = useState("inner"); // inner | left | right | full | cross
    const [combineLeftSheetId, setCombineLeftSheetId] = useState(null);
    const [combineRightSheetId, setCombineRightSheetId] = useState(null);
    const [combineLeftKeyCol, setCombineLeftKeyCol] = useState("");
    const [combineRightKeyCol, setCombineRightKeyCol] = useState("");
    const [combineMergeMode, setCombineMergeMode] = useState("browser"); // browser | athena
    const [combineDestination, setCombineDestination] = useState("new_sheet"); // replace | new_sheet
    const [combineOutputName, setCombineOutputName] = useState("");
    const [combineBusy, setCombineBusy] = useState(false);
    const [combineProgress, setCombineProgress] = useState(0);
    const [combineProgressLabel, setCombineProgressLabel] = useState("");

    // Remove duplicates (row-level)
    const [removeDupsDialogOpen, setRemoveDupsDialogOpen] = useState(false);
    const [sheetPropsDialogOpen, setSheetPropsDialogOpen] = useState(false);
    const [editingColIndex, setEditingColIndex] = useState(null);
    const [editingColName, setEditingColName] = useState("");

    useEffect(() => {
      if (!sheetPropsDialogOpen) {
        setEditingColIndex(null);
        setEditingColName("");
      }
    }, [sheetPropsDialogOpen]);

    /** Refine / filter current sheet (preview) or re-query full lake via provenance CTE (Athena). */
    const [refineQueryOpen, setRefineQueryOpen] = useState(false);
    const [refineScope, setRefineScope] = useState("preview"); // preview | athena
    const [refineDestination, setRefineDestination] = useState("replace"); // replace | new_sheet
    const [refineNewSheetName, setRefineNewSheetName] = useState("");
    const [refineSelectedCols, setRefineSelectedCols] = useState(() => new Set());
    const [refineWhereCol, setRefineWhereCol] = useState("");
    const [refineWhereOp, setRefineWhereOp] = useState("gte");
    const [refineWhereVal, setRefineWhereVal] = useState("");
    const [refineBusy, setRefineBusy] = useState(false);
    const [refineProgress, setRefineProgress] = useState(0);
    const [refineProgressLabel, setRefineProgressLabel] = useState("");
    const [sheetJsonViewerOpen, setSheetJsonViewerOpen] = useState(false);
    const [sheetJsonVisibleRows, setSheetJsonVisibleRows] = useState(SHEET_JSON_INITIAL_ROWS);
    const [sheetJsonAppending, setSheetJsonAppending] = useState(false);

    const sheetColumnsForProps = useMemo(() => {
      const row0 = Array.isArray(connectedData) && connectedData.length ? connectedData[0] : null;
      if (!row0 || typeof row0 !== "object") return [];
      return Object.keys(row0)
        .filter((k) => k !== "_origIndex")
        .sort();
    }, [connectedData]);

    useEffect(() => {
      if (!sheetJsonViewerOpen) return;
      setSheetJsonVisibleRows(SHEET_JSON_INITIAL_ROWS);
      setSheetJsonAppending(false);
    }, [sheetJsonViewerOpen, activeSheetId]);

    const activeSheetRowsForJson = Array.isArray(connectedData) ? connectedData : [];
    const sheetJsonLoadedCount = Math.min(sheetJsonVisibleRows, activeSheetRowsForJson.length);
    const sheetJsonLoadPct = activeSheetRowsForJson.length
      ? Math.round((sheetJsonLoadedCount / activeSheetRowsForJson.length) * 100)
      : 100;
    const visibleSheetJsonRows = useMemo(
      () => activeSheetRowsForJson.slice(0, sheetJsonLoadedCount),
      [activeSheetRowsForJson, sheetJsonLoadedCount],
    );
    const loadMoreSheetJsonRows = useCallback(() => {
      if (!sheetJsonViewerOpen || sheetJsonAppending) return;
      setSheetJsonAppending(true);
      window.setTimeout(() => {
        setSheetJsonVisibleRows((prev) => Math.min(activeSheetRowsForJson.length, prev + SHEET_JSON_CHUNK_ROWS));
        setSheetJsonAppending(false);
      }, 0);
    }, [sheetJsonViewerOpen, sheetJsonAppending, activeSheetRowsForJson.length]);
    const handleSheetJsonScroll = useCallback(
      (event) => {
        const el = event.currentTarget;
        if (!el || sheetJsonLoadedCount >= activeSheetRowsForJson.length) return;
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 120) {
          loadMoreSheetJsonRows();
        }
      },
      [activeSheetRowsForJson.length, loadMoreSheetJsonRows, sheetJsonLoadedCount],
    );
    const copySheetJson = useCallback(async () => {
      if (!activeSheetRowsForJson.length) {
        toast.error("No sheet data to copy.");
        return;
      }
      try {
        await navigator.clipboard.writeText(serializeRowsAsJson(activeSheetRowsForJson));
        toast.success("Sheet JSON copied");
      } catch (e) {
        toast.error("Could not copy JSON");
      }
    }, [activeSheetRowsForJson]);
    const downloadSheetJson = useCallback(() => {
      if (!activeSheetRowsForJson.length) {
        toast.error("No sheet data to download.");
        return;
      }
      const blob = new Blob([serializeRowsAsJson(activeSheetRowsForJson)], { type: "application/json;charset=utf-8;" });
      const nm =
        activeSheetId && dataSheets?.[activeSheetId]?.name
          ? String(dataSheets[activeSheetId].name).replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "")
          : "sheet";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${nm || "sheet"}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Sheet JSON downloaded");
    }, [activeSheetRowsForJson, activeSheetId, dataSheets]);

    const getColField = (col) => (col && typeof col === "object" && "field" in col ? col.field : col);
    const setColField = (col, nextField) =>
      col && typeof col === "object" && "field" in col ? { ...col, field: nextField } : nextField;

    const convertDataType = (data, column, newType) => {
      return (data || []).map((row) => {
        let newValue = row?.[column];
        switch (newType) {
          case "number":
            newValue = parseFloat(newValue);
            if (isNaN(newValue)) newValue = null;
            break;
          case "boolean":
            newValue = Boolean(newValue);
            break;
          case "dateString":
            newValue = new Date(newValue).toISOString();
            break;
          case "object":
            try {
              newValue = JSON.parse(newValue);
            } catch {
              newValue = null;
            }
            break;
          case "text":
          default:
            newValue = String(newValue);
            break;
        }
        return { ...row, [column]: newValue };
      });
    };

    const handleDeleteColumn = (index) => {
      const col = connectedCols?.[index];
      const colName = String(getColField(col) || "");
      if (!colName) return;

      const nextCols = (connectedCols || []).filter((_, colIndex) => colIndex !== index);
      setConnectedCols?.(nextCols);

      setConnectedData?.((prevData) =>
        (prevData || []).map((item) => {
          const newItem = { ...(item || {}) };
          delete newItem[colName];
          return newItem;
        }),
      );

      if (setDataTypes) {
        setDataTypes((prevTypes) => {
          const newTypes = { ...(prevTypes || {}) };
          delete newTypes[colName];
          return newTypes;
        });
      }

      if (editingColIndex === index) {
        setEditingColIndex(null);
        setEditingColName("");
      }
      appendActiveSheetOperation("delete.column", { column: colName });
      toast(`Column "${colName}" deleted!`, { duration: 5000 });
    };

    const handleSaveColumnName = (index) => {
      const col = connectedCols?.[index];
      const oldColName = String(getColField(col) || "");
      const nextName = String(editingColName || "").trim();

      if (!oldColName || !nextName) return;
      if (nextName === oldColName) {
        setEditingColIndex(null);
        setEditingColName("");
        return;
      }

      const existing = new Set((connectedCols || []).map((c) => String(getColField(c) || "")));
      if (existing.has(nextName)) {
        toast(`Column "${nextName}" already exists.`, { duration: 5000 });
        return;
      }

      const nextCols = (connectedCols || []).map((c, colIndex) =>
        colIndex === index ? setColField(c, nextName) : c,
      );
      setConnectedCols?.(nextCols);

      setConnectedData?.((prevData) =>
        (prevData || []).map((item) => {
          const newItem = { ...(item || {}) };
          newItem[nextName] = newItem[oldColName];
          delete newItem[oldColName];
          return newItem;
        }),
      );

      if (setDataTypes) {
        setDataTypes((prevTypes) => {
          const newTypes = { ...(prevTypes || {}) };
          newTypes[nextName] = newTypes[oldColName] || "text";
          delete newTypes[oldColName];
          return newTypes;
        });
      }

      setEditingColIndex(null);
      setEditingColName("");
      appendActiveSheetOperation("rename.column", { from: oldColName, to: nextName });
      toast(`Column name updated to "${nextName}"`, { duration: 5000 });
    };

    const handleTypeChange = (index, newType) => {
      const col = connectedCols?.[index];
      const colName = String(getColField(col) || "");
      if (!colName) return;

      const updatedData = convertDataType(connectedData, colName, newType);
      setConnectedData?.(updatedData);

      if (setDataTypes) {
        setDataTypes((prevTypes) => ({
          ...(prevTypes || {}),
          [colName]: newType,
        }));
      }

      appendActiveSheetOperation("cast.column", { column: colName, dataType: newType });
      toast(`Column "${colName}" type updated to "${newType}"`, { duration: 5000 });
    };

    const onDragEnd = (result) => {
      if (!result.destination) return;
      const reorderedCols = Array.from(connectedCols || []);
      const [removed] = reorderedCols.splice(result.source.index, 1);
      reorderedCols.splice(result.destination.index, 0, removed);
      setConnectedCols?.(reorderedCols);
    };

    const [filterState, setFilterState] = useState({
      dateColumn: null,
      dateFrom: '',
      dateTo: '',
      sortKey: null,
      sortDir: 'asc',
      categoryFilters: {},
    });

    const colKeys = useMemo(() => getColKeys(connectedCols), [connectedCols]);

    const sheetColumnNamesForMath = useMemo(() => {
      const row = Array.isArray(connectedData) && connectedData.length ? connectedData[0] : null;
      if (!row || typeof row !== "object") return [];
      return Object.keys(row)
        .filter((k) => k !== "_origIndex")
        .sort();
    }, [connectedData]);

    const nextFreeResultColumnName = useCallback(() => {
      const existing = new Set(sheetColumnNamesForMath);
      let n = 1;
      while (existing.has(`resultCol${n}`)) n += 1;
      return `resultCol${n}`;
    }, [sheetColumnNamesForMath]);

    useEffect(() => {
      if (!mathDialogOpen) return;
      setMathOutCol((prev) => (String(prev || "").trim() ? prev : nextFreeResultColumnName()));
      setMathBaseCol((prev) =>
        prev && sheetColumnNamesForMath.includes(prev) ? prev : sheetColumnNamesForMath[0] || "",
      );
      setMathBasicColA((prev) =>
        prev && sheetColumnNamesForMath.includes(prev) ? prev : sheetColumnNamesForMath[0] || "",
      );
      setMathBasicColB((prev) =>
        prev && sheetColumnNamesForMath.includes(prev)
          ? prev
          : sheetColumnNamesForMath[1] || sheetColumnNamesForMath[0] || "",
      );
      setStatsBucketColumn((prev) =>
        prev && sheetColumnNamesForMath.includes(prev) ? prev : sheetColumnNamesForMath[0] || "",
      );
      setStatsBucketOutputColumn((prev) => (String(prev || "").trim() ? prev : "bucket"));
      setStatsBucketSheetName((prev) => (String(prev || "").trim() ? prev : "Bucketed sheet"));
    }, [mathDialogOpen, sheetColumnNamesForMath, nextFreeResultColumnName]);

    useEffect(() => {
      if (!mathDialogOpen) {
        setMathDialogTab("basic");
        setStatsStdDevActive(false);
        setStatsStdSourceCol("");
        setStatsStdOutCol("");
        setStatsStdMode("full");
        setStatsRollCount("4");
        setStatsBucketActive(false);
        setStatsBucketColumn("");
        setStatsBucketOutputColumn("bucket");
        setStatsBucketSheetName("");
        setStatsBucketMode("category");
        setStatsBucketTimeInterval("day");
        setStatsBucketNumericSize("");
        setStatsBucketPassthroughCols(new Set());
        setStatsBucketAggregations([
          { id: "bucket-agg-1", type: "count", valueColumn: "", weightColumn: "", denominatorColumn: "", outputColumn: "count", filterEnabled: false, filterColumn: "", filterOperator: "=", filterValue: "" },
        ]);
        setMathBasicColA("");
        setMathBasicColB("");
        setMathFunctionType("row_operation");
        setMathIfClauses([
          {
            id: "if-1",
            condition: { leftColumn: "", operator: "=", rightKind: "raw", rightColumn: "", rightValue: "" },
            then: { kind: "raw", value: "" },
          },
        ]);
        setMathElseResult({ kind: "raw", value: "" });
      }
    }, [mathDialogOpen]);

    const statsStdNumericValues = useMemo(
      () => columnNumericValuesForStats(connectedData, statsStdSourceCol),
      [connectedData, statsStdSourceCol],
    );

    const statsRollCountParsed = useMemo(() => {
      const s = String(statsRollCount ?? "").trim();
      if (!/^\d+$/.test(s)) return null;
      const n = parseInt(s, 10);
      if (!Number.isFinite(n) || n < 2) return null;
      return n;
    }, [statsRollCount]);

    const statsStdCanSubmit =
      statsStdDevActive &&
      Boolean(String(statsStdSourceCol || "").trim()) &&
      Boolean(String(statsStdOutCol || "").trim()) &&
      statsStdNumericValues.length > 0 &&
      (statsStdMode !== "rolling" || statsRollCountParsed != null);

    const statsCumsumNumericValues = useMemo(
      () => columnNumericValuesForStats(connectedData, statsCumsumSourceCol),
      [connectedData, statsCumsumSourceCol],
    );

    const statsCumsumCanSubmit =
      statsCumsumActive &&
      Boolean(String(statsCumsumSourceCol || "").trim()) &&
      Boolean(String(statsCumsumOutCol || "").trim()) &&
      statsCumsumNumericValues.length > 0;

    const statsCumsumPreviewHead = useMemo(() => {
      if (!statsCumsumSourceCol || !Array.isArray(connectedData) || !connectedData.length) return null;
      let running = 0;
      const samples = [];
      for (const row of connectedData) {
        const n = parseCellFiniteForStat(row, statsCumsumSourceCol);
        if (n == null) continue;
        running += n;
        samples.push(running);
        if (samples.length >= 4) break;
      }
      return samples.length ? samples : null;
    }, [connectedData, statsCumsumSourceCol]);

    const statsBucketColumnProfile = useMemo(() => {
      const col = String(statsBucketColumn || "").trim();
      const rows = Array.isArray(connectedData) ? connectedData : [];
      const numeric = [];
      let temporalCount = 0;
      let nonEmpty = 0;
      for (const row of rows.slice(0, 2000)) {
        const raw = row?.[col];
        if (raw == null || raw === "") continue;
        nonEmpty += 1;
        const n = Number(raw);
        if (Number.isFinite(n)) numeric.push(n);
        if (Number.isFinite(temporalToMs(raw))) temporalCount += 1;
      }
      const min = numeric.length ? Math.min(...numeric) : null;
      const max = numeric.length ? Math.max(...numeric) : null;
      const key = col.toLowerCase();
      const typedDate = dataTypes?.[col] === "date" || dataTypes?.[col] === "dateString";
      const namedTime = /(time|timestamp|date|datetime|created_at|created|updated_at|ts)/i.test(key);
      const isTemporal = nonEmpty > 0 && (typedDate || namedTime) && temporalCount / nonEmpty >= 0.5;
      const isNumeric = numeric.length > 0 && numeric.length / Math.max(1, nonEmpty) >= 0.7;
      const suggestedSize = isNumeric && max != null && min != null
        ? niceBucketSize(Math.max(1, (max - min) / 10))
        : 1;
      return { isTemporal, isNumeric, min, max, suggestedSize, nonEmpty };
    }, [connectedData, dataTypes, statsBucketColumn]);

    useEffect(() => {
      if (!statsBucketActive || !statsBucketColumn) return;
      if (statsBucketColumnProfile.isTemporal) {
        setStatsBucketMode("time");
        return;
      }
      if (statsBucketColumnProfile.isNumeric) {
        setStatsBucketMode("number");
        setStatsBucketNumericSize((prev) => (String(prev || "").trim() ? prev : String(statsBucketColumnProfile.suggestedSize || 1)));
        return;
      }
      setStatsBucketMode("category");
    }, [statsBucketActive, statsBucketColumn, statsBucketColumnProfile]);

    const updateStatsBucketAggregation = useCallback((id, patch) => {
      setStatsBucketAggregations((prev) =>
        (Array.isArray(prev) ? prev : []).map((agg) => (agg.id === id ? { ...agg, ...patch } : agg)),
      );
    }, []);

    const addStatsBucketAggregation = useCallback(() => {
      setStatsBucketAggregations((prev) => [
        ...(Array.isArray(prev) ? prev : []),
        {
          id: `bucket-agg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: "count",
          valueColumn: "",
          weightColumn: "",
          denominatorColumn: "",
          outputColumn: "count",
          filterEnabled: false,
          filterColumn: "",
          filterOperator: "=",
          filterValue: "",
        },
      ]);
    }, []);

    const removeStatsBucketAggregation = useCallback((id) => {
      setStatsBucketAggregations((prev) => {
        const next = (Array.isArray(prev) ? prev : []).filter((agg) => agg.id !== id);
        return next.length ? next : [{ id: "bucket-agg-1", type: "count", valueColumn: "", weightColumn: "", denominatorColumn: "", outputColumn: "count", filterEnabled: false, filterColumn: "", filterOperator: "=", filterValue: "" }];
      });
    }, []);

    const toggleStatsBucketPassthrough = useCallback((column) => {
      setStatsBucketPassthroughCols((prev) => {
        const next = new Set(prev instanceof Set ? Array.from(prev) : []);
        if (next.has(column)) next.delete(column);
        else next.add(column);
        return next;
      });
    }, []);

    const normalizedStatsBucketAggregations = useMemo(
      () =>
        (Array.isArray(statsBucketAggregations) ? statsBucketAggregations : []).map((agg, idx) => ({
          id: agg.id || `bucket-agg-${idx}`,
          type: agg.type || "count",
          valueColumn: agg.valueColumn || "",
          weightColumn: agg.weightColumn || "",
          denominatorColumn: agg.denominatorColumn || "",
          outputColumn: String(agg.outputColumn || "").trim(),
          filterEnabled: !!agg.filterEnabled,
          filterColumn: agg.filterColumn || "",
          filterOperator: agg.filterOperator || "=",
          filterValue: agg.filterValue ?? "",
        })),
      [statsBucketAggregations],
    );

    const statsBucketCanSubmit = useMemo(() => {
      if (!statsBucketActive) return false;
      if (!String(statsBucketColumn || "").trim()) return false;
      if (!String(statsBucketOutputColumn || "").trim()) return false;
      if (!String(statsBucketSheetName || "").trim()) return false;
      if (statsBucketMode === "number") {
        const size = Number(statsBucketNumericSize || statsBucketColumnProfile.suggestedSize || 1);
        if (!Number.isFinite(size) || size <= 0) return false;
      }
      if (statsBucketMode === "time" && !statsBucketTimeInterval) return false;
      if (!normalizedStatsBucketAggregations.length) return false;
      return normalizedStatsBucketAggregations.every((agg) => {
        if (!agg.outputColumn) return false;
        if (agg.filterEnabled) {
          const needsValue = !["is_empty", "is_not_empty"].includes(agg.filterOperator);
          if (!agg.filterColumn) return false;
          if (needsValue && String(agg.filterValue ?? "").trim() === "") return false;
        }
        if (agg.type === "count") return true;
        if (!agg.valueColumn) return false;
        if (agg.type === "weighted_average") return Boolean(agg.weightColumn);
        if (agg.type === "product_ratio") return Boolean(agg.weightColumn && agg.denominatorColumn);
        return true;
      });
    }, [
      normalizedStatsBucketAggregations,
      statsBucketActive,
      statsBucketColumn,
      statsBucketColumnProfile.suggestedSize,
      statsBucketMode,
      statsBucketNumericSize,
      statsBucketOutputColumn,
      statsBucketSheetName,
      statsBucketTimeInterval,
    ]);

    const statsBucketPreviewRows = useMemo(() => {
      if (!statsBucketActive || !statsBucketColumn || !statsBucketOutputColumn) return [];
      return aggregateBucketRows(connectedData, {
        bucketColumn: statsBucketColumn,
        bucketOutputColumn: statsBucketOutputColumn,
        bucketMode: statsBucketMode,
        timeInterval: statsBucketTimeInterval,
        numericBucketSize: statsBucketNumericSize || statsBucketColumnProfile.suggestedSize || 1,
        passthroughColumns: Array.from(statsBucketPassthroughCols || []),
        aggregations: normalizedStatsBucketAggregations,
      }).slice(0, 3);
    }, [
      connectedData,
      normalizedStatsBucketAggregations,
      statsBucketActive,
      statsBucketColumn,
      statsBucketColumnProfile.suggestedSize,
      statsBucketMode,
      statsBucketNumericSize,
      statsBucketOutputColumn,
      statsBucketPassthroughCols,
      statsBucketTimeInterval,
    ]);

    const updateMathIfClause = useCallback((id, patch) => {
      setMathIfClauses((prev) =>
        (Array.isArray(prev) ? prev : []).map((clause) =>
          clause.id === id
            ? {
                ...clause,
                ...patch,
                condition: { ...(clause.condition || {}), ...(patch.condition || {}) },
                then: { ...(clause.then || {}), ...(patch.then || {}) },
              }
            : clause,
        ),
      );
    }, []);

    const addMathElseIfClause = useCallback(() => {
      setMathIfClauses((prev) => [
        ...(Array.isArray(prev) ? prev : []),
        {
          id: `if-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          condition: { leftColumn: sheetColumnNamesForMath[0] || "", operator: "=", rightKind: "raw", rightColumn: "", rightValue: "" },
          then: { kind: "raw", value: "" },
        },
      ]);
    }, [sheetColumnNamesForMath]);

    const removeMathIfClause = useCallback((id) => {
      setMathIfClauses((prev) => {
        const next = (Array.isArray(prev) ? prev : []).filter((clause) => clause.id !== id);
        return next.length ? next : [
          {
            id: "if-1",
            condition: { leftColumn: "", operator: "=", rightKind: "raw", rightColumn: "", rightValue: "" },
            then: { kind: "raw", value: "" },
          },
        ];
      });
    }, []);

    const normalizeIfElseExpressionForSave = useCallback(() => ({
      kind: "if-else",
      clauses: (Array.isArray(mathIfClauses) ? mathIfClauses : []).map((clause) => ({
        condition: {
          leftColumn: clause?.condition?.leftColumn || "",
          operator: clause?.condition?.operator || "=",
          rightKind: clause?.condition?.rightKind || "raw",
          rightColumn: clause?.condition?.rightColumn || "",
          rightValue: clause?.condition?.rightValue ?? "",
        },
        then: clause?.then || { kind: "raw", value: "" },
      })),
      else: mathElseResult || { kind: "raw", value: "" },
    }), [mathIfClauses, mathElseResult]);

    const ifElseCanSubmit = useMemo(() => {
      if (mathFunctionType !== "if_else") return true;
      const clauses = Array.isArray(mathIfClauses) ? mathIfClauses : [];
      return clauses.some((clause) =>
        String(clause?.condition?.leftColumn || "").trim() &&
        (clause?.condition?.rightKind === "column"
          ? String(clause?.condition?.rightColumn || "").trim()
          : String(clause?.condition?.rightValue ?? "").trim() || ["is_empty", "is_not_empty"].includes(clause?.condition?.operator))
      );
    }, [mathFunctionType, mathIfClauses]);

    const renderMathOperandEditor = (label, value, onChange) => {
      const spec = value && typeof value === "object" ? value : { kind: "raw", value: "" };
      const kind = spec.kind || "raw";
      return (
        <div className="space-y-1">
          {label ? <Label className="text-xs">{label}</Label> : null}
          <div className="grid gap-2 sm:grid-cols-[0.9fr_1.4fr]">
            <Select value={kind} onValueChange={(v) => onChange({ ...spec, kind: v })}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="raw">Raw value</SelectItem>
                <SelectItem value="column">Column value</SelectItem>
                <SelectItem value="operation">Column operation</SelectItem>
              </SelectContent>
            </Select>
            {kind === "column" ? (
              <Select value={spec.column || "__"} onValueChange={(v) => onChange({ ...spec, kind, column: v === "__" ? "" : v })}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select column" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__">—</SelectItem>
                  {sheetColumnNamesForMath.map((c) => (
                    <SelectItem key={`${label}-operand-col-${c}`} value={c} className="font-mono text-xs">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : kind === "operation" ? (
              <div className="grid gap-2 sm:grid-cols-[1fr_0.7fr_0.8fr_1fr]">
                <Select value={spec.column || "__"} onValueChange={(v) => onChange({ ...spec, kind, column: v === "__" ? "" : v })}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Column" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__">—</SelectItem>
                    {sheetColumnNamesForMath.map((c) => (
                      <SelectItem key={`${label}-op-base-${c}`} value={c} className="font-mono text-xs">
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={spec.op || "add"} onValueChange={(v) => onChange({ ...spec, kind, op: v })}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="add">+</SelectItem>
                    <SelectItem value="subtract">-</SelectItem>
                    <SelectItem value="multiply">x</SelectItem>
                    <SelectItem value="divide">/</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={spec.operandKind || "raw"} onValueChange={(v) => onChange({ ...spec, kind, operandKind: v })}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="raw">Raw</SelectItem>
                    <SelectItem value="column">Col</SelectItem>
                  </SelectContent>
                </Select>
                {spec.operandKind === "column" ? (
                  <Select value={spec.operandColumn || "__"} onValueChange={(v) => onChange({ ...spec, kind, operandColumn: v === "__" ? "" : v })}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__">—</SelectItem>
                      {sheetColumnNamesForMath.map((c) => (
                        <SelectItem key={`${label}-op-rhs-${c}`} value={c} className="font-mono text-xs">
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    className="h-9 text-xs"
                    value={spec.operandValue ?? ""}
                    onChange={(e) => onChange({ ...spec, kind, operandValue: e.target.value })}
                    placeholder="Value"
                  />
                )}
              </div>
            ) : (
              <Input
                className="h-9 text-xs"
                value={spec.value ?? ""}
                onChange={(e) => onChange({ ...spec, kind, value: e.target.value })}
                placeholder='e.g. 10 or "Yes"'
              />
            )}
          </div>
        </div>
      );
    };

    const applySheetMathOperation = useCallback(() => {
      const rows = Array.isArray(connectedData) ? [...connectedData] : [];
      if (!rows.length) {
        toast.error("Load sheet data before running a column calculation.");
        return;
      }
      const out = String(mathOutCol || "").trim() || nextFreeResultColumnName();
      if (!out) {
        toast.error("Enter a name for the new column.");
        return;
      }
      const valueOrZero = (v) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
      };

      let next;
      if (mathDialogTab === "functions" && mathFunctionType === "if_else") {
        const expression = normalizeIfElseExpressionForSave();
        if (!ifElseCanSubmit) {
          toast.error("Add at least one valid if / else condition.");
          return;
        }
        next = rows.map((row) => {
          if (!row || typeof row !== "object") return row;
          return { ...row, [out]: evaluateIfElseExpression(row, expression) };
        });
      } else if (mathDialogTab === "basic" || (mathDialogTab === "functions" && mathFunctionType === "column")) {
        const colA = String(mathBasicColA || "").trim();
        const colB = String(mathBasicColB || "").trim();
        const unaryAbs = mathOp === "abs";
        if (!colA || (!unaryAbs && !colB)) {
          toast.error(unaryAbs ? "Choose column A for the absolute value operation." : "Choose column A and column B for the operation.");
          return;
        }
        next = rows.map((row) => {
          if (!row || typeof row !== "object") return row;
          const a = valueOrZero(row[colA]);
          const b = valueOrZero(row[colB]);
          let v = null;
          if (mathOp === "add") v = a + b;
          else if (mathOp === "subtract") v = a - b;
          else if (mathOp === "multiply") v = a * b;
          else if (mathOp === "divide") v = b === 0 ? null : a / b;
          else if (mathOp === "abs") v = Math.abs(a);
          return { ...row, [out]: Number.isFinite(v) ? v : null };
        });
      } else {
        const baseCol = String(mathBaseCol || "").trim();
        if (!baseCol) {
          toast.error("Choose a column for the functions calculation.");
          return;
        }
        next = rows.map((row, idx) => {
          if (!row || typeof row !== "object") return row;
          const refIdx = mathRelativeRowRef === "next_row" ? idx + 1 : idx - 1;
          const refRow = refIdx >= 0 && refIdx < rows.length ? rows[refIdx] : null;

          if (mathOp === "pct_growth") {
            // No previous/next row at the sheet edge — leave blank (NaN breaks number cells in the grid).
            if (refRow == null) {
              return { ...row, [out]: null };
            }
            const current = parseCellFiniteForStat(row, baseCol);
            const relative = parseCellFiniteForStat(refRow, baseCol);
            if (current == null || relative == null) {
              return { ...row, [out]: null };
            }
            if (relative === 0) {
              return { ...row, [out]: null };
            }
            const v = (current - relative) / relative;
            return { ...row, [out]: Number.isFinite(v) ? v : null };
          }

          if (refRow == null) {
            return { ...row, [out]: null };
          }
          const current = parseCellFiniteForStat(row, baseCol);
          const relative = parseCellFiniteForStat(refRow, baseCol);
          if (current == null || relative == null) {
            return { ...row, [out]: null };
          }
          let v = null;
          if (mathOp === "add") v = current + relative;
          else if (mathOp === "subtract") v = current - relative;
          else if (mathOp === "multiply") v = current * relative;
          else if (mathOp === "divide") v = relative === 0 ? null : current / relative;
          return { ...row, [out]: Number.isFinite(v) ? v : null };
        });
      }

      const inferredType = next.some((row) => row?.[out] != null && row?.[out] !== "" && !Number.isNaN(Number(row?.[out])))
        ? "number"
        : "string";
      if (setDataTypes) {
        setDataTypes((prev) => ({ ...(prev || {}), [out]: inferredType }));
      }
      const operation = createSheetOperation("computed.column", {
        column: out,
        expression:
          mathDialogTab === "functions" && mathFunctionType === "if_else"
            ? normalizeIfElseExpressionForSave()
            : (mathDialogTab === "basic" || mathFunctionType === "column")
              ? { kind: "binary", op: mathOp, leftColumn: mathBasicColA, rightColumn: mathOp === "abs" ? "" : mathBasicColB }
              : { kind: "relative-row", op: mathOp, baseColumn: mathBaseCol, rowRef: mathRelativeRowRef },
      });
      if (mathDestination === "new_sheet") {
        const sheetName = `${out} calc`;
        addNewSheetAndActivate?.((newId) => {
          setSheetData?.(newId, next);
          setDataSheets?.((prev) => {
            const p = prev || {};
            const sheet = p[newId];
            if (!sheet) return prev;
            return {
              ...p,
              [newId]: {
                ...sheet,
                name: sheetName.slice(0, 80),
                operationHistory: [...(Array.isArray(sheet.operationHistory) ? sheet.operationHistory : []), operation],
              },
            };
          });
        });
        toast.success("Applied calculation in a new sheet.");
      } else {
        replaceCurrentSheetData?.(next);
        setConnectedData?.(next);
        appendActiveSheetOperation("computed.column", operation);
        toast.success("Applied calculation to current sheet.");
      }
      setMathDialogOpen(false);
    }, [
      connectedData,
      mathDialogTab,
      mathBasicColA,
      mathBasicColB,
      mathBaseCol,
      mathDestination,
      mathFunctionType,
      normalizeIfElseExpressionForSave,
      ifElseCanSubmit,
      mathOp,
      mathOutCol,
      mathRelativeRowRef,
      nextFreeResultColumnName,
      addNewSheetAndActivate,
      replaceCurrentSheetData,
      setConnectedData,
      setDataSheets,
      setDataTypes,
      setSheetData,
      appendActiveSheetOperation,
    ]);

    const applyStatsStdDev = useCallback(() => {
      const rows = Array.isArray(connectedData) ? [...connectedData] : [];
      if (!rows.length) {
        toast.error("Load sheet data before running a column calculation.");
        return;
      }
      const src = String(statsStdSourceCol || "").trim();
      const out = String(statsStdOutCol || "").trim() || nextFreeResultColumnName();
      if (!src || !out) {
        toast.error("Choose a source column and output column name.");
        return;
      }
      const nums = columnNumericValuesForStats(rows, src);
      if (!nums.length) {
        toast.error("Selected column has no numeric values.");
        return;
      }
      let next;
      if (statsStdMode === "rolling") {
        const s = String(statsRollCount ?? "").trim();
        if (!/^\d+$/.test(s)) {
          toast.error("Roll count must be a whole number (digits only).");
          return;
        }
        const rollN = parseInt(s, 10);
        if (!Number.isFinite(rollN) || rollN < 2) {
          toast.error("Roll count must be at least 2.");
          return;
        }
        next = rows.map((row, i) => {
          if (!row || typeof row !== "object") return row;
          const v = rollingPopulationStdDevAtIndex(rows, src, i, rollN);
          return { ...row, [out]: v };
        });
      } else {
        const sigma = populationStandardDeviation(nums);
        const value = Number.isFinite(sigma) ? sigma : null;
        next = rows.map((row) => (row && typeof row === "object" ? { ...row, [out]: value } : row));
      }
      if (setDataTypes) {
        setDataTypes((prev) => ({ ...(prev || {}), [out]: "number" }));
      }
      const operation = createSheetOperation("computed.column", {
        column: out,
        expression: { kind: "standard-deviation", mode: statsStdMode, sourceColumn: src, window: statsStdMode === "rolling" ? Number(statsRollCount) : null },
      });
      if (mathDestination === "new_sheet") {
        const sheetName = statsStdMode === "rolling" ? `${out} rolling σ` : `${out} σ`;
        addNewSheetAndActivate?.((newId) => {
          setSheetData?.(newId, next);
          setDataSheets?.((prev) => {
            const p = prev || {};
            const sheet = p[newId];
            if (!sheet) return prev;
            return {
              ...p,
              [newId]: {
                ...sheet,
                name: sheetName.slice(0, 80),
                operationHistory: [...(Array.isArray(sheet.operationHistory) ? sheet.operationHistory : []), operation],
              },
            };
          });
        });
        toast.success(
          statsStdMode === "rolling"
            ? "Added rolling standard deviation column in a new sheet."
            : "Added standard deviation column in a new sheet.",
        );
      } else {
        replaceCurrentSheetData?.(next);
        setConnectedData?.(next);
        appendActiveSheetOperation("computed.column", operation);
        toast.success(
          statsStdMode === "rolling"
            ? "Added rolling standard deviation column to current sheet."
            : "Added standard deviation column to current sheet.",
        );
      }
      setMathDialogOpen(false);
    }, [
      connectedData,
      statsStdSourceCol,
      statsStdOutCol,
      statsStdMode,
      statsRollCount,
      mathDestination,
      nextFreeResultColumnName,
      addNewSheetAndActivate,
      replaceCurrentSheetData,
      setConnectedData,
      setDataSheets,
      setDataTypes,
      setSheetData,
      appendActiveSheetOperation,
    ]);

    const applyStatsCumsum = useCallback(() => {
      const rows = Array.isArray(connectedData) ? [...connectedData] : [];
      if (!rows.length) {
        toast.error("Load sheet data before running a column calculation.");
        return;
      }
      const src = String(statsCumsumSourceCol || "").trim();
      const out = String(statsCumsumOutCol || "").trim() || "cumsum";
      if (!src || !out) {
        toast.error("Choose a source column and output column name.");
        return;
      }
      const nums = columnNumericValuesForStats(rows, src);
      if (!nums.length) {
        toast.error("Selected column has no numeric values.");
        return;
      }
      let running = 0;
      const next = rows.map((row) => {
        if (!row || typeof row !== "object") return row;
        const n = parseCellFiniteForStat(row, src);
        if (n == null) return { ...row, [out]: null };
        running += n;
        return { ...row, [out]: running };
      });
      if (setDataTypes) {
        setDataTypes((prev) => ({ ...(prev || {}), [out]: "number" }));
      }
      const operation = createSheetOperation("computed.column", {
        column: out,
        expression: { kind: "cumulative-sum", sourceColumn: src },
      });
      if (mathDestination === "new_sheet") {
        const sheetName = `${out} cumsum`.slice(0, 80);
        addNewSheetAndActivate?.((newId) => {
          setSheetData?.(newId, next);
          setDataSheets?.((prev) => {
            const p = prev || {};
            const sheet = p[newId];
            if (!sheet) return prev;
            return {
              ...p,
              [newId]: {
                ...sheet,
                name: sheetName,
                operationHistory: [...(Array.isArray(sheet.operationHistory) ? sheet.operationHistory : []), operation],
              },
            };
          });
        });
        toast.success("Added cumulative sum column in a new sheet.");
      } else {
        replaceCurrentSheetData?.(next);
        setConnectedData?.(next);
        appendActiveSheetOperation("computed.column", operation);
        toast.success("Added cumulative sum column to current sheet.");
      }
      setMathDialogOpen(false);
    }, [
      connectedData,
      statsCumsumSourceCol,
      statsCumsumOutCol,
      mathDestination,
      addNewSheetAndActivate,
      replaceCurrentSheetData,
      setConnectedData,
      setDataSheets,
      setDataTypes,
      setSheetData,
      appendActiveSheetOperation,
    ]);

    const applyStatsBucket = useCallback(() => {
      const rows = Array.isArray(connectedData) ? [...connectedData] : [];
      if (!rows.length) {
        toast.error("Load sheet data before bucketing.");
        return;
      }
      const bucketColumn = String(statsBucketColumn || "").trim();
      const bucketOutputColumn = String(statsBucketOutputColumn || "").trim();
      const sheetName = String(statsBucketSheetName || "").trim();
      if (!bucketColumn || !bucketOutputColumn || !sheetName) {
        toast.error("Choose a bucket column, bucket output name, and new sheet name.");
        return;
      }
      if (!statsBucketCanSubmit) {
        toast.error("Finish configuring each bucket aggregation.");
        return;
      }
      const passthroughColumns = Array.from(statsBucketPassthroughCols || []);
      const aggregations = normalizedStatsBucketAggregations.map((agg) => ({ ...agg }));
      const next = aggregateBucketRows(rows, {
        bucketColumn,
        bucketOutputColumn,
        bucketMode: statsBucketMode,
        timeInterval: statsBucketTimeInterval,
        numericBucketSize: statsBucketNumericSize || statsBucketColumnProfile.suggestedSize || 1,
        passthroughColumns,
        aggregations,
      });
      if (!next.length) {
        toast.error("No bucket rows were generated.");
        return;
      }
      const operation = createSheetOperation("bucket.sheet", {
        sourceSheetId: activeSheetId || null,
        bucketColumn,
        bucketOutputColumn,
        bucketMode: statsBucketMode,
        timeInterval: statsBucketTimeInterval,
        numericBucketSize: statsBucketNumericSize || statsBucketColumnProfile.suggestedSize || 1,
        passthroughColumns,
        aggregations,
        outputSheetName: sheetName,
      });
      addNewSheetAndActivate?.((newId) => {
        setSheetData?.(newId, next);
        setDataSheets?.((prev) => {
          const p = prev || {};
          const sheet = p[newId];
          if (!sheet) return prev;
          return {
            ...p,
            [newId]: {
              ...sheet,
              name: sheetName.slice(0, 80),
              sourceSheetId: activeSheetId || sheet.sourceSheetId,
              operationHistory: [...(Array.isArray(sheet.operationHistory) ? sheet.operationHistory : []), operation],
            },
          };
        });
      });
      toast.success(`Created bucket sheet with ${next.length.toLocaleString()} row${next.length === 1 ? "" : "s"}.`);
      setMathDialogOpen(false);
    }, [
      activeSheetId,
      addNewSheetAndActivate,
      connectedData,
      normalizedStatsBucketAggregations,
      setDataSheets,
      setSheetData,
      statsBucketCanSubmit,
      statsBucketColumn,
      statsBucketColumnProfile.suggestedSize,
      statsBucketMode,
      statsBucketNumericSize,
      statsBucketOutputColumn,
      statsBucketPassthroughCols,
      statsBucketSheetName,
      statsBucketTimeInterval,
    ]);

    const collectColumnNames = (rows) => {
      const set = new Set();
      for (const r of Array.isArray(rows) ? rows : []) {
        if (!r || typeof r !== "object") continue;
        for (const k of Object.keys(r)) {
          if (k === "_origIndex") continue;
          set.add(k);
        }
      }
      return Array.from(set).sort();
    };

    const stableStringify = (v) => {
      if (v === null) return "null";
      if (v === undefined) return "undefined";
      const t = typeof v;
      if (t === "number") return Number.isFinite(v) ? String(v) : "NaN";
      if (t === "string" || t === "boolean") return String(v);
      if (Array.isArray(v)) return `[${v.map(stableStringify).join(",")}]`;
      if (t === "object") {
        const keys = Object.keys(v).sort();
        return `{${keys.map((k) => `${k}:${stableStringify(v[k])}`).join(",")}}`;
      }
      return String(v);
    };

    const applyCombineSheets = useCallback(async () => {
      const leftSheet = combineLeftSheetId ? dataSheets?.[combineLeftSheetId] : null;
      const rightSheet = combineRightSheetId ? dataSheets?.[combineRightSheetId] : null;
      const leftData = leftSheet?.data;
      const rightData = rightSheet?.data;

      if (!leftSheet || !rightSheet) {
        toast.error("Pick two sheets to combine.");
        return;
      }
      if (!Array.isArray(leftData) || leftData.length === 0 || !Array.isArray(rightData) || rightData.length === 0) {
        toast.error("Both selected sheets must have loaded data.");
        return;
      }
      if (combineLeftSheetId === combineRightSheetId) {
        toast.error("Left and right sheets must be different.");
        return;
      }

      const joinType = combineJoinType;
      const leftCols = collectColumnNames(leftData);
      const rightCols = collectColumnNames(rightData);

      if (leftCols.length === 0 || rightCols.length === 0) {
        toast.error("Could not infer columns for one of the sheets.");
        return;
      }

      const leftKeyCol = String(combineLeftKeyCol || "").trim();
      const rightKeyCol = String(combineRightKeyCol || "").trim();

      if (joinType !== "cross") {
        if (!leftKeyCol || !rightKeyCol) {
          toast.error("Select join keys for both sheets (or use Cross join).");
          return;
        }
        if (!leftCols.includes(leftKeyCol) || !rightCols.includes(rightKeyCol)) {
          toast.error("Selected join keys must exist on each sheet.");
          return;
        }
      }

      if (combineMergeMode === "athena") {
        if (joinType === "cross") {
          toast.error("Full dataset does not support cross join. Choose “Loaded sheets only” or use Inner/Left.");
          return;
        }
        if (joinType !== "inner" && joinType !== "left") {
          toast.error(
            "Full dataset supports Inner and Left only. Choose “Loaded sheets only” for Right/Full, or change join type.",
          );
          return;
        }
        const leftProv = leftSheet?.provenance;
        const rightProv = rightSheet?.provenance;
        if (!leftProv || !rightProv || leftProv.kind !== "compose" || rightProv.kind !== "compose") {
          toast.error("Full dataset combine needs both sheets built from Data Lake pulls (saved compose provenance).");
          return;
        }
        if (String(leftProv.lake || "") !== String(rightProv.lake || "")) {
          toast.error("Sheets must be from the same lake for full dataset combine.");
          return;
        }
        if (!addNewSheetAndActivate || !setSheetData) {
          toast.error("Sheet actions are unavailable.");
          return;
        }

        const joinTypeApi = joinType === "left" ? "left" : "inner";

        const cteSafeName = (name, id) => {
          let t = String(name || id || "sheet").replace(/[^a-zA-Z0-9_]+/g, "_");
          if (/^[0-9]/.test(t)) t = `s_${t}`;
          const u = t.slice(0, 60);
          return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(u) ? u : `sheet_${String(id).replace(/\W/g, "")}`.slice(0, 60);
        };

        const sheetGraph = {};
        const walk = (id) => {
          if (sheetGraph[id]) return;
          const s = dataSheets[id];
          const prov = s?.provenance;
          if (!s || !prov || prov.kind !== "compose") return;
          sheetGraph[id] = { name: cteSafeName(s.name, id), provenance: prov };
          for (const d of prov.serverSheetJoins || []) {
            if (d?.targetSheetId && dataSheets[d.targetSheetId]) walk(d.targetSheetId);
          }
        };
        walk(combineLeftSheetId);
        walk(combineRightSheetId);

        if (!sheetGraph[combineLeftSheetId] || !sheetGraph[combineRightSheetId]) {
          toast.error("Could not build a CTE graph for the selected sheets.");
          return;
        }

        setCombineBusy(true);
        let tick = null;
        const joinAthenaStarted =
          typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
        try {
          setCombineProgressLabel("Submitting join to Athena…");
          setCombineProgress(10);
          tick = setInterval(() => {
            setCombineProgress((p) => Math.min(p + 2, 92));
          }, 500);

          const res = await fetch("/api/data-lake/join-sheets-cte", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({
              lake: leftProv.lake,
              table: leftProv.table,
              compose: leftProv.composeSpec,
              filters: leftProv.composeFilters || null,
              joins: [
                {
                  targetSheetId: combineRightSheetId,
                  joinType: joinTypeApi,
                  leftColumn: leftKeyCol,
                  rightColumn: rightKeyCol,
                },
              ],
              sheetGraph,
            }),
          });
          const j = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(j.error || res.statusText || "Join failed");

          if (tick) clearInterval(tick);
          tick = null;
          setCombineProgressLabel("Mapping results…");
          setCombineProgress(96);

          const rawRows = Array.isArray(j.rows) ? j.rows : [];
          const colNames = Array.isArray(j.columns) ? j.columns : [];
          const outRows = athenaRowsToObjects(colNames, rawRows);
          const joinAthenaElapsedMs = Math.max(
            0,
            (typeof performance !== "undefined" && performance.now ? performance.now() : Date.now()) - joinAthenaStarted,
          );

          const joinCard = {
            id: genRequestCardId(),
            kind: "join",
            createdAt: Date.now(),
            elapsedMs: joinAthenaElapsedMs,
            table: String(leftProv.table || ""),
            lake: String(leftProv.lake || ""),
            loadedRowCount: outRows.length,
            join: {
              mode: "server",
              joinType: joinTypeApi,
              leftSheetId: combineLeftSheetId,
              rightSheetId: combineRightSheetId,
              leftSheetLabel: String(leftSheet?.name || combineLeftSheetId),
              rightSheetLabel: String(rightSheet?.name || combineRightSheetId),
              leftColumn: leftKeyCol,
              rightColumn: rightKeyCol,
            },
          };

          const newProv = {
            kind: "compose",
            lake: leftProv.lake,
            table: leftProv.table,
            composeSpec: leftProv.composeSpec,
            composeFilters: leftProv.composeFilters || null,
            serverSheetJoins: [
              ...(Array.isArray(leftProv.serverSheetJoins) ? leftProv.serverSheetJoins : []),
              {
                targetSheetId: combineRightSheetId,
                joinType: joinTypeApi,
                leftColumn: leftKeyCol,
                rightColumn: rightKeyCol,
              },
            ],
            browserSheetJoins: [],
          };

          const defaultName = `Combine · ${String(leftSheet?.name || combineLeftSheetId)} ⟕ ${String(rightSheet?.name || combineRightSheetId)}`;
          const outName = String(combineOutputName || "").trim() || defaultName;

          if (combineDestination === "replace") {
            if (!activeSheetId) throw new Error("Missing active sheet.");
            replaceCurrentSheetData?.(outRows);
            setConnectedData?.(outRows);
            setDataSheets?.((prev) => {
              const p = prev || {};
              const sheet = p[activeSheetId] || { name: outName, data: [] };
              const existing = Array.isArray(sheet.requestCards) ? sheet.requestCards : [];
              return {
                ...p,
                [activeSheetId]: {
                  ...sheet,
                  name: outName.slice(0, 80),
                  provenance: newProv,
                  requestCards: [...existing, joinCard],
                },
              };
            });
            toast.success(`Combined on Athena (${outRows.length} rows).`);
          } else {
            addNewSheetAndActivate((newId) => {
              setSheetData(newId, outRows);
              setDataSheets?.((prev) => {
                const p = prev || {};
                const sheet = p[newId];
                if (!sheet) return prev;
                return {
                  ...p,
                  [newId]: {
                    ...sheet,
                    name: outName.slice(0, 80),
                    provenance: newProv,
                    requestCards: [joinCard],
                  },
                };
              });
            });
            toast.success(`Combined on Athena into a new sheet (${outRows.length} rows).`);
          }

          setCombineProgress(100);
          setCombineProgressLabel("Done");
          setCombineSheetsDialogOpen(false);
        } catch (e) {
          toast.error(e?.message || "Full dataset combine failed.");
        } finally {
          if (tick) clearInterval(tick);
          setCombineBusy(false);
          setCombineProgress(0);
          setCombineProgressLabel("");
        }
        return;
      }

      try {
        const combineBrowserStarted =
          typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
        const rightSuffixRaw = rightSheet?.name || combineRightSheetId || "right";
        const rightSuffix = String(rightSuffixRaw).replace(/[^a-zA-Z0-9_]/g, "_") || "right";

        const getRightOutKey = (col) => {
          return leftCols.includes(col) ? `${col}__${rightSuffix}` : col;
        };

        const outRows = [];

        if (joinType === "cross") {
          const rightOutKeys = rightCols.map((c) => getRightOutKey(c));
          for (const l of leftData) {
            const outBase = {};
            for (const lc of leftCols) outBase[lc] = l?.[lc] ?? null;

            for (const r of rightData) {
              const row = { ...outBase };
              for (let i = 0; i < rightCols.length; i++) {
                const rc = rightCols[i];
                row[rightOutKeys[i]] = r?.[rc] ?? null;
              }
              outRows.push(row);
            }
          }
        } else {
          const rightKeyIndex = new Map();
          for (let i = 0; i < rightData.length; i++) {
            const r = rightData[i];
            const v = r?.[rightKeyCol];
            const keyStr = v === null || v === undefined ? "NULL" : typeof v === "object" ? JSON.stringify(v) : String(v);
            if (!rightKeyIndex.has(keyStr)) rightKeyIndex.set(keyStr, []);
            rightKeyIndex.get(keyStr).push({ idx: i, row: r });
          }

          const rightMatchedIdxs = new Set();

          const rightAddedCols = rightCols.filter((c) => c !== rightKeyCol);
          const rightAddedOutKeys = rightAddedCols.map((c) => getRightOutKey(c));

          const leftKeyOutCol = leftKeyCol;

          const buildLeftBase = (l) => {
            const out = {};
            for (const lc of leftCols) out[lc] = l?.[lc] ?? null;
            return out;
          };

          const buildLeftNullBaseForKey = (rightRow) => {
            const out = {};
            for (const lc of leftCols) out[lc] = null;
            out[leftKeyOutCol] = rightRow?.[rightKeyCol] ?? null;
            return out;
          };

          for (const l of leftData) {
            const lKeyVal = l?.[leftKeyCol];
            const lKeyStr =
              lKeyVal === null || lKeyVal === undefined ? "NULL" : typeof lKeyVal === "object" ? JSON.stringify(lKeyVal) : String(lKeyVal);
            const matches = rightKeyIndex.get(lKeyStr) || [];

            if (matches.length > 0) {
              for (const m of matches) {
                rightMatchedIdxs.add(m.idx);
                const row = buildLeftBase(l);
                for (let i = 0; i < rightAddedCols.length; i++) {
                  row[rightAddedOutKeys[i]] = m.row?.[rightAddedCols[i]] ?? null;
                }
                outRows.push(row);
              }
            } else if (joinType === "left" || joinType === "full") {
              const row = buildLeftBase(l);
              for (let i = 0; i < rightAddedOutKeys.length; i++) row[rightAddedOutKeys[i]] = null;
              outRows.push(row);
            }
          }

          if (joinType === "right" || joinType === "full") {
            for (let i = 0; i < rightData.length; i++) {
              if (rightMatchedIdxs.has(i)) continue;
              const r = rightData[i];
              const row = buildLeftNullBaseForKey(r);
              for (let j = 0; j < rightAddedCols.length; j++) row[rightAddedOutKeys[j]] = r?.[rightAddedCols[j]] ?? null;
              outRows.push(row);
            }
          }
        }

        if (!outRows.length) {
          toast.error("Join produced no rows.");
          return;
        }

        const combineBrowserElapsedMs = Math.max(
          0,
          (typeof performance !== "undefined" && performance.now ? performance.now() : Date.now()) - combineBrowserStarted,
        );
        const joinCard = {
          id: genRequestCardId(),
          kind: "join",
          createdAt: Date.now(),
          elapsedMs: combineBrowserElapsedMs,
          table: "",
          lake: "",
          loadedRowCount: outRows.length,
          join: {
            mode: "browser",
            crossJoin: joinType === "cross",
            joinType,
            leftSheetId: combineLeftSheetId,
            rightSheetId: combineRightSheetId,
            leftSheetLabel: String(leftSheet?.name || combineLeftSheetId),
            rightSheetLabel: String(rightSheet?.name || combineRightSheetId),
            leftColumn: joinType === "cross" ? "" : leftKeyCol,
            rightColumn: joinType === "cross" ? "" : rightKeyCol,
          },
        };

        const defaultName = `Combine · ${String(leftSheet?.name || combineLeftSheetId)} ⟕ ${String(rightSheet?.name || combineRightSheetId)}`;
        const outName = String(combineOutputName || "").trim() || defaultName;
        if (combineDestination === "new_sheet") {
          if (!addNewSheetAndActivate || !setSheetData) {
            toast.error("Sheet actions are unavailable.");
            return;
          }
          addNewSheetAndActivate((newId) => {
            setSheetData(newId, outRows);
            setDataSheets?.((prev) => {
              const p = prev || {};
              const sh = p[newId];
              if (!sh) return prev;
              return {
                ...p,
                [newId]: { ...sh, name: outName.slice(0, 80), provenance: null, requestCards: [joinCard] },
              };
            });
          });
          toast.success("Sheets combined into a new sheet (loaded rows only).");
        } else {
          replaceCurrentSheetData?.(outRows);
          setConnectedData?.(outRows);
          setDataSheets?.((prev) => {
            if (!activeSheetId) return prev;
            const p = prev || {};
            const sh = p[activeSheetId] || { name: outName, data: [] };
            const existing = Array.isArray(sh.requestCards) ? sh.requestCards : [];
            return {
              ...p,
              [activeSheetId]: {
                ...sh,
                name: outName.slice(0, 80),
                requestCards: [...existing, joinCard],
              },
            };
          });
          toast.success("Sheets combined in the current sheet (loaded rows only).");
        }
        setCombineSheetsDialogOpen(false);
      } catch (e) {
        toast.error("Combine failed.");
      }
    }, [
      addNewSheetAndActivate,
      activeSheetId,
      combineDestination,
      combineJoinType,
      combineLeftKeyCol,
      combineLeftSheetId,
      combineMergeMode,
      combineOutputName,
      combineRightKeyCol,
      combineRightSheetId,
      dataSheets,
      replaceCurrentSheetData,
      setConnectedData,
      setDataSheets,
      setSheetData,
    ]);

    const applyRemoveDuplicates = useCallback(() => {
      try {
        const rows = Array.isArray(connectedData) ? [...connectedData] : [];
        if (!rows.length) {
          toast.error("Load sheet data before removing duplicates.");
          return;
        }

        // Row-level dedupe (JSON-stable signature). Extendable later to dedupe on selected columns.
        const cols = collectColumnNames(rows);
        const seen = new Set();
        const unique = [];

        for (const r of rows) {
          const sig = cols.map((c) => `${c}:${stableStringify(r?.[c])}`).join("|");
          if (seen.has(sig)) continue;
          seen.add(sig);
          unique.push(r);
        }

        replaceCurrentSheetData?.(unique);
        setConnectedData?.(unique);
        toast.success("Duplicates removed.");
        setRemoveDupsDialogOpen(false);
      } catch (e) {
        toast.error("Failed to remove duplicates.");
      }
    }, [connectedData, replaceCurrentSheetData, setConnectedData]);

    useEffect(() => {
      if (!refineQueryOpen) return;
      const cols = sheetColumnsForProps;
      setRefineSelectedCols(new Set(cols));
      setRefineWhereCol(cols[0] || "");
      setRefineWhereVal("");
      setRefineNewSheetName("");
    }, [refineQueryOpen, sheetColumnsForProps]);

    const applyRefineQuery = useCallback(async () => {
      const cols = Array.from(refineSelectedCols).filter(Boolean);
      if (!cols.length) {
        toast.error("Select at least one column.");
        return;
      }
      const rows = Array.isArray(connectedData) ? connectedData : [];
      if (!rows.length) {
        toast.error("Load sheet data first.");
        return;
      }

      if (refineScope === "preview") {
        const refinePreviewStarted =
          typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
        let out = rows;
        const wCol = String(refineWhereCol || "").trim();
        const wVal = Number(refineWhereVal);
        if (wCol && Number.isFinite(wVal)) {
          const op = refineWhereOp;
          out = out.filter((r) => {
            const raw = r?.[wCol];
            const n = typeof raw === "number" ? raw : Number(raw);
            if (!Number.isFinite(n)) return false;
            if (op === "gte") return n >= wVal;
            if (op === "lte") return n <= wVal;
            if (op === "gt") return n > wVal;
            if (op === "lt") return n < wVal;
            if (op === "eq") return n === wVal;
            if (op === "neq") return n !== wVal;
            return true;
          });
        }
        const projected = out.map((r) => {
          const o = {};
          for (const c of cols) {
            if (r && typeof r === "object" && c in r) o[c] = r[c];
          }
          return o;
        });
        const baseSheet = dataSheets[activeSheetId];
        const refineElapsedMs = Math.max(
          0,
          (typeof performance !== "undefined" && performance.now ? performance.now() : Date.now()) - refinePreviewStarted,
        );
        const refineCard = {
          id: genRequestCardId(),
          kind: "refine",
          createdAt: Date.now(),
          elapsedMs: refineElapsedMs,
          table: String(baseSheet?.provenance?.table || ""),
          lake: String(baseSheet?.provenance?.lake || ""),
          selectAliases: cols,
          selectColumns: cols,
          loadedRowCount: projected.length,
          refine: {
            scope: "preview",
            sourceSheetId: activeSheetId,
            sourceSheetLabel: String(baseSheet?.name || activeSheetId),
          },
        };
        if (refineDestination === "new_sheet") {
          if (!addNewSheetAndActivate || !setSheetData) {
            toast.error("Sheet actions are unavailable.");
            return;
          }
          const defaultNm = `Refined · ${String(baseSheet?.name || activeSheetId)}`;
          const nm = String(refineNewSheetName || "").trim() || defaultNm;
          addNewSheetAndActivate((newId) => {
            setSheetData(newId, projected);
            setDataSheets?.((prev) => {
              const p = prev || {};
              const sh = p[newId];
              if (!sh) return prev;
              return {
                ...p,
                [newId]: {
                  ...sh,
                  name: nm.slice(0, 80),
                  provenance: baseSheet?.provenance ?? null,
                  requestCards: [refineCard],
                },
              };
            });
          });
          toast.success(`Created new sheet (${projected.length} rows).`);
        } else {
          replaceCurrentSheetData?.(projected);
          setConnectedData?.(projected);
          setDataSheets?.((prev) => {
            if (!activeSheetId) return prev;
            const p = prev || {};
            const sh = p[activeSheetId] || {};
            const existing = Array.isArray(sh.requestCards) ? sh.requestCards : [];
            return {
              ...p,
              [activeSheetId]: { ...sh, requestCards: [...existing, refineCard] },
            };
          });
          toast.success(`Updated sheet (${projected.length} rows).`);
        }
        setRefineQueryOpen(false);
        return;
      }

      if (!activeSheetId) {
        toast.error("Missing active sheet.");
        return;
      }
      const sheet = dataSheets[activeSheetId];
      const prov = sheet?.provenance;
      if (!prov || prov.kind !== "compose") {
        toast.error("Full-dataset refine needs a sheet created from a Data Lake pull (saved provenance).");
        return;
      }

      function cteSafeName(name, id) {
        let t = String(name || id || "sheet").replace(/[^a-zA-Z0-9_]+/g, "_");
        if (/^[0-9]/.test(t)) t = `s_${t}`;
        const u = t.slice(0, 60);
        return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(u) ? u : `sheet_${String(id).replace(/\W/g, "")}`.slice(0, 60);
      }

      const graph = {};
      const walk = (id) => {
        if (graph[id]) return;
        const s = dataSheets[id];
        if (!s?.provenance) return;
        graph[id] = { name: cteSafeName(s.name, id), provenance: s.provenance };
        for (const d of s.provenance.serverSheetJoins || []) {
          if (d?.targetSheetId && dataSheets[d.targetSheetId]) walk(d.targetSheetId);
        }
      };
      walk(activeSheetId);

      if (!graph[activeSheetId]) {
        toast.error("Could not build sheet graph for Athena.");
        return;
      }

      const refineFilters = { and: [] };
      const wCol = String(refineWhereCol || "").trim();
      const wVal = Number(refineWhereVal);
      if (wCol && Number.isFinite(wVal)) {
        refineFilters.and.push({ column: wCol, op: refineWhereOp, value: wVal });
      }

      setRefineBusy(true);
      setRefineProgressLabel("Sending query to Athena…");
      setRefineProgress(8);
      const refineAthenaStarted =
        typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
      let tick = setInterval(() => {
        setRefineProgress((p) => Math.min(p + 2, 90));
      }, 450);
      try {
        const res = await fetch("/api/data-lake/sheet-refine-athena", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sheetGraph: graph,
            rootSheetId: activeSheetId,
            selectColumns: cols,
            refineFilters,
          }),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j.error || res.statusText || "Request failed");
        if (tick) clearInterval(tick);
        tick = null;
        setRefineProgressLabel("Mapping column names…");
        setRefineProgress(96);
        const rawRows = Array.isArray(j.rows) ? j.rows : [];
        const colNames = Array.isArray(j.columns) ? j.columns : [];
        const outRows = athenaRowsToObjects(colNames, rawRows);
        const refineAthenaElapsedMs = Math.max(
          0,
          (typeof performance !== "undefined" && performance.now ? performance.now() : Date.now()) - refineAthenaStarted,
        );
        const baseSheet = dataSheets[activeSheetId];
        const refineCard = {
          id: genRequestCardId(),
          kind: "refine",
          createdAt: Date.now(),
          elapsedMs: refineAthenaElapsedMs,
          table: String(baseSheet?.provenance?.table || ""),
          lake: String(baseSheet?.provenance?.lake || ""),
          selectAliases: cols,
          selectColumns: cols,
          loadedRowCount: outRows.length,
          refine: {
            scope: "athena",
            sourceSheetId: activeSheetId,
            sourceSheetLabel: String(baseSheet?.name || activeSheetId),
          },
        };
        if (refineDestination === "new_sheet") {
          if (!addNewSheetAndActivate || !setSheetData) {
            throw new Error("Sheet actions are unavailable.");
          }
          const defaultNm = `Refined · ${String(baseSheet?.name || activeSheetId)}`;
          const nm = String(refineNewSheetName || "").trim() || defaultNm;
          addNewSheetAndActivate((newId) => {
            setSheetData(newId, outRows);
            setDataSheets?.((prev) => {
              const p = prev || {};
              const sh = p[newId];
              if (!sh) return prev;
              return {
                ...p,
                [newId]: {
                  ...sh,
                  name: nm.slice(0, 80),
                  provenance: baseSheet?.provenance ?? null,
                  requestCards: [refineCard],
                },
              };
            });
          });
          toast.success(`New sheet: ${outRows.length} rows from Athena.`);
        } else {
          replaceCurrentSheetData?.(outRows);
          setConnectedData?.(outRows);
          setDataSheets?.((prev) => {
            if (!activeSheetId) return prev;
            const p = prev || {};
            const sh = p[activeSheetId] || {};
            const existing = Array.isArray(sh.requestCards) ? sh.requestCards : [];
            return {
              ...p,
              [activeSheetId]: { ...sh, requestCards: [...existing, refineCard] },
            };
          });
          toast.success(`Loaded ${outRows.length} rows from Athena.`);
        }
        setRefineProgress(100);
        setRefineProgressLabel("Done");
        setRefineQueryOpen(false);
      } catch (e) {
        toast.error(e?.message || "Refine query failed.");
      } finally {
        if (tick) clearInterval(tick);
        setRefineBusy(false);
        setRefineProgress(0);
        setRefineProgressLabel("");
      }
    }, [
      addNewSheetAndActivate,
      refineDestination,
      refineNewSheetName,
      refineSelectedCols,
      connectedData,
      refineScope,
      refineWhereCol,
      refineWhereOp,
      refineWhereVal,
      activeSheetId,
      dataSheets,
      replaceCurrentSheetData,
      setConnectedData,
      setDataSheets,
      setSheetData,
    ]);

    const dateColumns = useMemo(() => {
      if (!connectedData.length) return [];
      const first = connectedData[0];
      return colKeys.filter((key) => {
        const v = first[key];
        return v != null && typeof v === 'string' && DATE_LIKE.test(v);
      });
    }, [connectedData, colKeys]);

    const displayData = useMemo(() => {
      const withIndex = (connectedData || []).map((r, i) => ({ ...r, _origIndex: i }));
      let out = withIndex;
      const { dateColumn, dateFrom, dateTo, sortKey, sortDir, categoryFilters } = filterState;
      if (dateColumn && (dateFrom || dateTo)) {
        out = out.filter((row) => {
          const raw = row[dateColumn];
          if (raw == null || raw === '') return false;
          const t = typeof raw === 'string' && DATE_LIKE.test(raw) ? new Date(raw).getTime() : Number(raw);
          if (Number.isNaN(t)) return true;
          if (dateFrom) {
            const from = new Date(dateFrom).getTime();
            if (t < from) return false;
          }
          if (dateTo) {
            const to = new Date(dateTo).getTime();
            if (t > to) return false;
          }
          return true;
        });
      }
      const catKeys = Object.keys(categoryFilters || {}).filter((k) => (categoryFilters[k] || []).length > 0);
      if (catKeys.length > 0) {
        out = out.filter((row) =>
          catKeys.every((col) => {
            const allowed = categoryFilters[col];
            const val = row[col];
            const s = val != null ? String(val) : '';
            return allowed.includes(s);
          })
        );
      }
      if (sortKey) {
        out = [...out].sort((a, b) => {
          const va = a[sortKey];
          const vb = b[sortKey];
          if (va == null && vb == null) return 0;
          if (va == null) return 1;
          if (vb == null) return -1;

          const ka = dateBucketToSortKey(va);
          const kb = dateBucketToSortKey(vb);
          const cmp = ka != null && kb != null ? ka - kb : String(va).localeCompare(String(vb), undefined, { numeric: true });
          return sortDir === "asc" ? cmp : -cmp;
        });
      }
      return out;
    }, [connectedData, filterState]);

    const columnDefsWithMeta = useMemo(() => {
      const cols = (connectedCols || []).map((c) => {
        const field = c && typeof c === 'object' && 'field' in c ? c.field : c;
        const fl = field && field.toLowerCase();
        const isTokenId = fl && (TOKEN_ID_FIELDS.has(fl) || fl.endsWith('_conditionid') || fl.endsWith('_condition_id') || fl.endsWith('_asset_id') || fl === 'id' || fl.endsWith('id'));
        const fmt = isTokenId ? (p) => (p?.value != null ? String(p.value) : '') : undefined;
        return typeof c === 'object' && c !== null
          ? { ...c, valueFormatter: isTokenId ? fmt : c.valueFormatter }
          : { field: c, valueFormatter: fmt };
      });
      cols.push({ field: '_origIndex', hide: true, suppressColumnsToolPanel: true });
      return cols;
    }, [connectedCols]);

    const distinctByColumn = useMemo(() => {
      const map = {};
      colKeys.forEach((key) => {
        const set = new Set();
        (connectedData || []).forEach((row) => {
          const v = row[key];
          if (v != null && v !== '') set.add(String(v));
        });
        map[key] = Array.from(set).sort();
      });
      return map;
    }, [connectedData, colKeys]);

    const resetFilters = useCallback(() => {
      setFilterState({
        dateColumn: null,
        dateFrom: '',
        dateTo: '',
        sortKey: null,
        sortDir: 'asc',
        categoryFilters: {},
      });
      toast('Filters reset to original data');
    }, []);

    const setCategoryFilter = useCallback((col, values) => {
      setFilterState((prev) => ({
        ...prev,
        categoryFilters: { ...(prev.categoryFilters || {}), [col]: values },
      }));
    }, []);

    // Export: data to download (displayData without internal _origIndex)
    const exportData = useMemo(() => {
      if (!displayData || !displayData.length) return [];
      return displayData.map(({ _origIndex, ...row }) => row);
    }, [displayData]);

    const downloadFile = useCallback((blob, filename) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }, []);

    const downloadCSV = useCallback(() => {
      if (!exportData.length) {
        toast.error('No data to export');
        return;
      }
      const cols = colKeys.length ? colKeys : Object.keys(exportData[0] || {});
      const escape = (v) => {
        const s = v == null ? '' : String(v);
        if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
        return s;
      };
      const header = cols.map(escape).join(',');
      const rows = exportData.map((row) => cols.map((c) => escape(row[c])).join(','));
      const csv = [header, ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      downloadFile(blob, `export-${Date.now()}.csv`);
      toast.success('CSV downloaded');
    }, [exportData, colKeys, downloadFile]);

    const downloadJSON = useCallback(() => {
      if (!exportData.length) {
        toast.error('No data to export');
        return;
      }
      const json = JSON.stringify(exportData, null, 2);
      const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
      downloadFile(blob, `export-${Date.now()}.json`);
      toast.success('JSON downloaded');
    }, [exportData, downloadFile]);

    const downloadXLSX = useCallback(() => {
      if (!exportData.length) {
        toast.error('No data to export');
        return;
      }
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      XLSX.writeFile(wb, `export-${Date.now()}.xlsx`);
      toast.success('Excel file downloaded');
    }, [exportData]);

    //Apply settings across all columns
    const defaultColDef = useMemo(
        () => ({
            filter: true,
            editable: true,
            background: { visible: false },
            resizable: true,
            singleClickEdit: true,
            stopEditingWhenCellsLoseFocus: true,
            ...(fillViewport
                ? {
                    minWidth: 72,
                    maxWidth: 200,
                    flex: 1,
                  }
                : {}),
        }),
        [fillViewport],
    );

    const autoSizeStrategy = useMemo(
        () => ({
            type: "fitGridWidth",
            defaultMinWidth: fillViewport ? 72 : 100,
        }),
        [fillViewport],
    );

    const gridOptions = useMemo(
        () => ({
            onCellClicked: () =>
                toast(`Hit Enter to accept change`, {
                    duration: 5000,
                }),
            ...(fillViewport ? { rowHeight: 22, headerHeight: 24 } : {}),
        }),
        [fillViewport],
    );

    const updateCellData = (row, field, newValue) => {
        if (field === '_origIndex') return;
        if (newValue === "PRETTY PLEASE DELETE ROW") {
            handleDeleteRow(row);
            return;
        }
        const origIndex = row && row._origIndex;
        if (origIndex == null) return;
        setConnectedData((prevData) => {
          const newData = prevData.map((item, index) =>
            index === origIndex ? { ...item, [field]: newValue } : item
          );
          return newData;
        });
        appendActiveSheetOperation("manual.cell.patch", { rowKey: origIndex, column: field, value: newValue });
        toast('Data updated. Chart updated!', { duration: 5000 });
    };

    const handleAddRow = () => {
        const newRow = {};
        colKeys.forEach((key) => { newRow[key] = ''; });
        setConnectedData([...(connectedData || []), newRow])

        toast(`New Row added!`, {
            duration: 5000
        })   
    }

    const handleAddColumn = (name) => {
        let newCols = [...connectedCols, { field: name }];
        setConnectedCols(newCols);
        //adding col to data as well
        if(connectedData.length > 0){
            setConnectedData(prevData => {
                // Create a new array with updated data
                const newData = prevData.map((item, index) => {
                    return { ...item, [name]: '' }; // Update the specific field value
                });
                return newData;
              });
        }else{
            setConnectedData(prevData => {
                return prevData.map(item => {
                  return { ...item, [name]: '' };
                }).concat([{ [name]: '' }]);
              });
        }
        setColAddOpen(false)
        appendActiveSheetOperation("computed.column", {
            column: name,
            expression: { kind: "manual-empty-column" },
        });

        toast(`New Column added!`, {
            duration: 5000
        })   
    }

    const handleInputChange = (event) => {
        setColumnName(event.target.value);
      };
    
    const handleSubmit = () => {
        if (!columnName?.trim()) return;
        handleAddColumn(columnName.trim());
        setColumnName('');
    };

    const handleDeleteRow = (row) => {
        const origIndex = row && row._origIndex;
        if (origIndex == null) return;
        setConnectedData((prevData) => prevData.filter((_, index) => index !== origIndex));
        appendActiveSheetOperation("manual.row.delete", { rowKey: origIndex });
        toast('Row deleted!', { duration: 5000 });
    };

    const handleClearSheet = () => {
        setConnectedData([]);
        toast("Sheet cleared!", { duration: 3000 });
    };
    

    useEffect(()=>{
        startNew && setConnectedData([])
    }, [startNew])

    return (
        <div
            className={cn(
                "h-full w-full min-w-0 text-foreground",
                fillViewport && "flex min-h-0 flex-1 flex-col",
            )}
            style={{ height: "100%", width: "100%" }}
        >
            <Alert className="mt-4 sm:hidden">
                <div className="flex gap-2 place-items-center"><TrafficCone className="w-8 h-8"/>
                    <div className="">
                        <p className="text-xs">Looks like you're on-the-go!</p>
                        <p className="text-xs text-muted-foreground">I tried to keep it mobile-friendly, but Lychee really flexes its muscles on bigger screens.</p>
                    </div>
                </div>
            </Alert>  
            {(activeSheetId || isSheetLoading) && (
            <Tabs defaultValue="table" className="w-full min-w-0">
              {isSheetLoading ? (
                <GridToolbarSkeleton compact={fillViewport} />
              ) : (
              <>
              <div
                className={cn(
                  "flex flex-wrap items-center gap-2 border-b py-2",
                  fillViewport && connectGridToolbarCompactClass,
                  fillViewport && connectGridToolbarButtonCompactClass,
                )}
              >
                <TabsList className={cn("h-9", fillViewport && "h-7 p-0.5")}>
                  <TabsTrigger value="table" className={cn("text-xs", fillViewport && "px-2 py-1 text-[11px]")}>
                    Table
                  </TabsTrigger>
                  <TabsTrigger
                    value="sort-filter"
                    className={cn("gap-1 text-xs", fillViewport && "px-2 py-1 text-[11px]")}
                  >
                    <Filter className={cn("h-3.5 w-3.5", fillViewport && "h-3 w-3")} />
                    Sort & filter
                  </TabsTrigger>
                </TabsList>
                <div className="h-4 w-px shrink-0 bg-border" />
                {/* Sheet Properties dropdown (keeps existing Add Column dialog code) */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                      Sheet Properties
                      <ChevronDown className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    <DropdownMenuItem
                      className="text-xs"
                      onSelect={(e) => {
                        e.preventDefault();
                        setColAddOpen(true);
                      }}
                    >
                      + Add Column
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-xs"
                      onSelect={(e) => {
                        e.preventDefault();
                        handleAddRow?.();
                      }}
                    >
                      + Add Row
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-xs"
                      onSelect={(e) => {
                        e.preventDefault();
                        setSheetPropsDialogOpen(true);
                      }}
                    >
                      Column Properties
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Dialog open={colAddOpen} onOpenChange={setColAddOpen}>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Add Column</DialogTitle>
                      <DialogDescription>Name your column</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">Name</Label>
                        <Input
                          id="name"
                          value={columnName}
                          onChange={handleInputChange}
                          className="col-span-3"
                          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" onClick={() => handleSubmit()}>Save changes</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={sheetPropsDialogOpen} onOpenChange={setSheetPropsDialogOpen}>
                  <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Column Properties</DialogTitle>
                      <DialogDescription>
                        Manage column order, names, types, and deletes.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[60vh] overflow-y-auto pr-1">
                      <DragDropContext onDragEnd={onDragEnd}>
                        <Droppable droppableId="columns">
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2"
                            >
                              {(connectedCols || []).length ? (
                                (connectedCols || []).map((col, index) => {
                                  const colName = String(getColField(col) || "");
                                  const t = dataTypes?.[colName] || "text";
                                  const isEditing = editingColIndex === index;

                                  return (
                                    <Draggable key={`${colName}::${index}`} draggableId={String(colName)} index={index}>
                                      {(dragProvided) => (
                                        <div
                                          ref={dragProvided.innerRef}
                                          {...dragProvided.draggableProps}
                                          className="rounded-md border bg-muted/20 px-3 py-2"
                                        >
                                          <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                              <GripVertical
                                                className="text-slate-400 w-4 h-4 shrink-0"
                                                {...dragProvided.dragHandleProps}
                                              />
                                              <div className="min-w-0">
                                                {isEditing ? (
                                                  <Input
                                                    className="h-7 text-xs font-mono"
                                                    value={editingColName}
                                                    onChange={(e) => setEditingColName(e.target.value)}
                                                    onKeyDown={(e) => e.key === "Enter" && handleSaveColumnName(index)}
                                                  />
                                                ) : (
                                                  <p className="font-mono text-xs font-medium truncate" title={colName}>
                                                    {colName}
                                                  </p>
                                                )}
                                              </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                              {isEditing ? (
                                                <div
                                                  className="bg-lychee_green/30 p-2 rounded-full flex place-items-center place-content-center text-foreground cursor-pointer hover:bg-lychee_green/40 hover:text-muted-foreground"
                                                  onClick={() => handleSaveColumnName(index)}
                                                >
                                                  Save
                                                </div>
                                              ) : (
                                                <div
                                                  className="bg-yellow-400/30 p-2 w-6 h-6 rounded-full flex place-items-center place-content-center text-foreground cursor-pointer hover:bg-lychee_green/40 hover:text-muted-foreground"
                                                  onClick={() => {
                                                    setEditingColIndex(index);
                                                    setEditingColName(colName);
                                                  }}
                                                  title="Rename column"
                                                >
                                                  <Pencil className="w-3 h-3" />
                                                </div>
                                              )}
                                              <div
                                                className="bg-red-400/30 p-2 w-6 h-6 rounded-full flex place-items-center place-content-center text-foreground cursor-pointer hover:bg-lychee_green/40 hover:text-muted-foreground"
                                                onClick={() => handleDeleteColumn(index)}
                                                title="Delete column"
                                              >
                                                <Trash className="w-3 h-3" />
                                              </div>
                                            </div>
                                          </div>

                                          <div className="mt-2 flex items-center justify-between gap-2">
                                            <p className="text-[11px] text-muted-foreground shrink-0">type</p>
                                            <select
                                              value={t}
                                              onChange={(e) => handleTypeChange(index, e.target.value)}
                                              className="h-7 text-xs rounded-md border bg-background px-2"
                                            >
                                              <option value="text">Text</option>
                                              <option value="number">Number</option>
                                              <option value="boolean">Boolean</option>
                                              <option value="date">Date</option>
                                              <option value="dateString">DateString</option>
                                              <option value="object">Object</option>
                                            </select>
                                          </div>
                                        </div>
                                      )}
                                    </Draggable>
                                  );
                                })
                              ) : (
                                <p className="text-xs text-muted-foreground col-span-2">No columns found.</p>
                              )}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </DragDropContext>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                      <Button type="button" variant="outline" onClick={() => setSheetPropsDialogOpen(false)}>
                        Close
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {isProvenancePreviewSheet ? (
                  <div className="flex flex-wrap items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
                    <span>
                      Preview loaded from saved project.
                      {activeSheet?.fullRowCount != null ? ` Full sheet has ${Number(activeSheet.fullRowCount).toLocaleString()} rows.` : ""}
                    </span>
                    {Array.isArray(activeSheet?.operationHistory) && activeSheet.operationHistory.length > 0 ? (
                      <span className="text-amber-800/80 dark:text-amber-200/80">
                        {activeSheet.operationHistory.length} saved operation{activeSheet.operationHistory.length === 1 ? "" : "s"}.
                      </span>
                    ) : null}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs bg-background"
                      disabled={rehydrateBusy}
                      onClick={rehydrateActiveSheet}
                    >
                      {rehydrateBusy ? "Reloading..." : "Reload full data"}
                    </Button>
                  </div>
                ) : null}

                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        aria-label="Mathematics Operations"
                        onClick={() => setMathDialogOpen(true)}
                      >
                        <Sigma className="h-4 w-4" aria-hidden />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      Mathematics Operations
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Dialog open={mathDialogOpen} onOpenChange={setMathDialogOpen}>
                  <DialogContent className="max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden sm:max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Mathematics Operations</DialogTitle>
                      <DialogDescription>
                        Build a row-wise equation for probability momentum and write the result as a new column.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="min-h-0 space-y-3 overflow-y-auto py-2 pr-1">
                      <Tabs
                        value={mathDialogTab}
                        onValueChange={(v) => {
                          setMathDialogTab(v);
                          if (v !== "stats") {
                            setStatsStdDevActive(false);
                            setStatsCumsumActive(false);
                            setStatsBucketActive(false);
                          }
                          if (v === "basic" && mathOp === "pct_growth") setMathOp("subtract");
                        }}
                        className="w-full"
                      >
                        <TabsList className="w-fit flex-wrap p-0.5 h-auto bg-slate-100 dark:bg-slate-800">
                          <TabsTrigger value="basic" className="h-7 px-2 text-xs">
                            Basic
                          </TabsTrigger>
                          <TabsTrigger value="functions" className="h-7 px-2 text-xs">
                            Functions
                          </TabsTrigger>
                          <TabsTrigger value="stats" className="h-7 px-2 text-xs">
                            Stats
                          </TabsTrigger>
                        </TabsList>
                        <TabsContent value="basic" className="mt-2 space-y-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Operation</Label>
                            <Select value={mathOp} onValueChange={setMathOp}>
                              <SelectTrigger className="h-9 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="add">Add (A + B)</SelectItem>
                                <SelectItem value="subtract">Subtract (A − B)</SelectItem>
                                <SelectItem value="multiply">Multiply (A × B)</SelectItem>
                                <SelectItem value="divide">{"Divide (A \u00f7 B)"}</SelectItem>
                                <SelectItem value="abs">Absolute value (|A|)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className={`grid gap-3 ${mathOp === "abs" ? "" : "sm:grid-cols-2"}`}>
                            <div className="space-y-1">
                              <Label className="text-xs">Column A</Label>
                              <Select
                                value={mathBasicColA || "__"}
                                onValueChange={(v) => setMathBasicColA(v === "__" ? "" : v)}
                              >
                                <SelectTrigger className="h-9 text-xs">
                                  <SelectValue placeholder="Select column" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__">—</SelectItem>
                                  {sheetColumnNamesForMath.map((c) => (
                                    <SelectItem key={`math-basic-a-${c}`} value={c} className="font-mono text-xs">
                                      {c}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            {mathOp !== "abs" ? (
                              <div className="space-y-1">
                                <Label className="text-xs">Column B</Label>
                                <Select
                                  value={mathBasicColB || "__"}
                                  onValueChange={(v) => setMathBasicColB(v === "__" ? "" : v)}
                                >
                                  <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="Select column" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__">—</SelectItem>
                                    {sheetColumnNamesForMath.map((c) => (
                                      <SelectItem key={`math-basic-b-${c}`} value={c} className="font-mono text-xs">
                                        {c}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            ) : null}
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">New column name</Label>
                            <Input
                              className="h-9 text-xs"
                              value={mathOutCol}
                              onChange={(e) => setMathOutCol(e.target.value)}
                              spellCheck={false}
                              placeholder={nextFreeResultColumnName()}
                            />
                          </div>
                          {mathBasicColA && (mathOp === "abs" || mathBasicColB) ? (
                            <div className="space-y-1">
                              <Label className="text-xs">Preview</Label>
                              <div className="rounded-md border border-border/60 bg-muted/20 px-2 py-1.5 text-xs font-mono text-muted-foreground">
                                {mathOp === "abs"
                                  ? `${mathOutCol || nextFreeResultColumnName()} = |${mathBasicColA}| (per row)`
                                  : `${mathOutCol || nextFreeResultColumnName()} = ${mathBasicColA} ${
                                      mathOp === "add" ? "+" : mathOp === "subtract" ? "−" : mathOp === "multiply" ? "×" : "÷"
                                    } ${mathBasicColB} (per row)`}
                              </div>
                            </div>
                          ) : null}
                        </TabsContent>
                        <TabsContent value="functions" className="mt-2">
                          <div className="space-y-3">
                            <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-2 items-end">
                              <div className="space-y-1">
                                <Label className="text-xs">Resulting column name</Label>
                                <Input
                                  className="h-9 text-xs"
                                  value={mathOutCol}
                                  onChange={(e) => setMathOutCol(e.target.value)}
                                  spellCheck={false}
                                  placeholder={nextFreeResultColumnName()}
                                />
                              </div>
                              <div className="h-9 px-2 flex items-center text-sm font-semibold text-muted-foreground">=</div>
                              <div className="space-y-1">
                                <Label className="text-xs">Operation type</Label>
                                <Select
                                  value={mathFunctionType}
                                  onValueChange={(v) => {
                                    setMathFunctionType(v);
                                    if (v === "column" && mathOp === "pct_growth") setMathOp("subtract");
                                  }}
                                >
                                  <SelectTrigger className="h-9 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="row_operation">Basic row operation</SelectItem>
                                    <SelectItem value="column">Column</SelectItem>
                                    <SelectItem value="if_else">If else</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            {mathFunctionType === "column" ? (
                              <>
                                <div className="space-y-1">
                                  <Label className="text-xs">Operation</Label>
                                  <Select value={mathOp} onValueChange={setMathOp}>
                                    <SelectTrigger className="h-9 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="add">Add (A + B)</SelectItem>
                                      <SelectItem value="subtract">Subtract (A − B)</SelectItem>
                                      <SelectItem value="multiply">Multiply (A × B)</SelectItem>
                                      <SelectItem value="divide">{"Divide (A \u00f7 B)"}</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2">
                                  <div className="space-y-1">
                                    <Label className="text-xs">Column A</Label>
                                    <Select value={mathBasicColA || "__"} onValueChange={(v) => setMathBasicColA(v === "__" ? "" : v)}>
                                      <SelectTrigger className="h-9 text-xs">
                                        <SelectValue placeholder="Select column" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="__">—</SelectItem>
                                        {sheetColumnNamesForMath.map((c) => (
                                          <SelectItem key={`math-fn-basic-a-${c}`} value={c} className="font-mono text-xs">
                                            {c}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs">Column B</Label>
                                    <Select value={mathBasicColB || "__"} onValueChange={(v) => setMathBasicColB(v === "__" ? "" : v)}>
                                      <SelectTrigger className="h-9 text-xs">
                                        <SelectValue placeholder="Select column" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="__">—</SelectItem>
                                        {sheetColumnNamesForMath.map((c) => (
                                          <SelectItem key={`math-fn-basic-b-${c}`} value={c} className="font-mono text-xs">
                                            {c}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                              </>
                            ) : mathFunctionType === "if_else" ? (
                              <div className="space-y-3">
                                {(Array.isArray(mathIfClauses) ? mathIfClauses : []).map((clause, idx) => {
                                  const condition = clause.condition || {};
                                  return (
                                    <div key={clause.id} className="space-y-2 rounded-lg border border-border/70 p-2">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                          {idx === 0 ? "If" : `Else if ${idx}`}
                                        </span>
                                        {(mathIfClauses || []).length > 1 ? (
                                          <button
                                            type="button"
                                            className="inline-flex h-2 w-2 items-center justify-center rounded-full bg-red-500 hover:bg-red-600"
                                            aria-label={`Remove condition ${idx + 1}`}
                                            onClick={() => removeMathIfClause(clause.id)}
                                          />
                                        ) : null}
                                      </div>
                                      <div className="grid gap-2 sm:grid-cols-[1.1fr_0.7fr_0.8fr_1.1fr]">
                                        <Select value={condition.leftColumn || "__"} onValueChange={(v) => updateMathIfClause(clause.id, { condition: { leftColumn: v === "__" ? "" : v } })}>
                                          <SelectTrigger className="h-9 text-xs">
                                            <SelectValue placeholder="Column" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="__">—</SelectItem>
                                            {sheetColumnNamesForMath.map((c) => (
                                              <SelectItem key={`if-left-${clause.id}-${c}`} value={c} className="font-mono text-xs">
                                                {c}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                        <Select value={condition.operator || "="} onValueChange={(v) => updateMathIfClause(clause.id, { condition: { operator: v } })}>
                                          <SelectTrigger className="h-9 text-xs">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="=">=</SelectItem>
                                            <SelectItem value="!=">!=</SelectItem>
                                            <SelectItem value=">">&gt;</SelectItem>
                                            <SelectItem value=">=">&gt;=</SelectItem>
                                            <SelectItem value="<">&lt;</SelectItem>
                                            <SelectItem value="<=">&lt;=</SelectItem>
                                            <SelectItem value="contains">contains</SelectItem>
                                            <SelectItem value="not_contains">does not contain</SelectItem>
                                            <SelectItem value="is_empty">is empty</SelectItem>
                                            <SelectItem value="is_not_empty">is not empty</SelectItem>
                                          </SelectContent>
                                        </Select>
                                        <Select value={condition.rightKind || "raw"} onValueChange={(v) => updateMathIfClause(clause.id, { condition: { rightKind: v } })}>
                                          <SelectTrigger className="h-9 text-xs">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="raw">Raw</SelectItem>
                                            <SelectItem value="column">Column</SelectItem>
                                          </SelectContent>
                                        </Select>
                                        {condition.rightKind === "column" ? (
                                          <Select value={condition.rightColumn || "__"} onValueChange={(v) => updateMathIfClause(clause.id, { condition: { rightColumn: v === "__" ? "" : v } })}>
                                            <SelectTrigger className="h-9 text-xs">
                                              <SelectValue placeholder="Column" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="__">—</SelectItem>
                                              {sheetColumnNamesForMath.map((c) => (
                                                <SelectItem key={`if-right-${clause.id}-${c}`} value={c} className="font-mono text-xs">
                                                  {c}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        ) : (
                                          <Input
                                            className="h-9 text-xs"
                                            value={condition.rightValue ?? ""}
                                            onChange={(e) => updateMathIfClause(clause.id, { condition: { rightValue: e.target.value } })}
                                            placeholder='Value, e.g. Yes'
                                            disabled={["is_empty", "is_not_empty"].includes(condition.operator)}
                                          />
                                        )}
                                      </div>
                                      {renderMathOperandEditor("Then", clause.then, (next) => updateMathIfClause(clause.id, { then: next }))}
                                    </div>
                                  );
                                })}
                                <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={addMathElseIfClause}>
                                  + Else if
                                </Button>
                                {renderMathOperandEditor("Else", mathElseResult, setMathElseResult)}
                              </div>
                            ) : (
                              <div className="grid gap-2 sm:grid-cols-[1.3fr_0.8fr_1fr_0.6fr_1fr] items-end">
                                <div className="space-y-1">
                                  <Label className="text-xs">Column</Label>
                                  <Select value={mathBaseCol || "__"} onValueChange={(v) => setMathBaseCol(v === "__" ? "" : v)}>
                                    <SelectTrigger className="h-9 text-xs">
                                      <SelectValue placeholder="Select column" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="__">—</SelectItem>
                                      {sheetColumnNamesForMath.map((c) => (
                                        <SelectItem key={`math-base-${c}`} value={c} className="font-mono text-xs">
                                          {c}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                {mathBaseCol ? (
                                  <div className="space-y-1">
                                    <Label className="text-xs">Mode</Label>
                                    <Select value={mathReferenceMode} onValueChange={setMathReferenceMode}>
                                      <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="row_wise">Row-wise</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                ) : null}
                                {mathBaseCol && mathReferenceMode === "row_wise" ? (
                                <div className="space-y-1">
                                  <Label className="text-xs">Anchor</Label>
                                  <Select value={mathCurrentRowRef} onValueChange={setMathCurrentRowRef}>
                                    <SelectTrigger className="h-9 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="current_row">Current row</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                ) : null}
                                {mathBaseCol && mathReferenceMode === "row_wise" && mathCurrentRowRef === "current_row" ? (
                                <div className="space-y-1">
                                  <Label className="text-xs">Op</Label>
                                  <Select value={mathOp} onValueChange={setMathOp}>
                                    <SelectTrigger className="h-9 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="add">+</SelectItem>
                                      <SelectItem value="subtract">-</SelectItem>
                                      <SelectItem value="divide">/</SelectItem>
                                      <SelectItem value="multiply">x</SelectItem>
                                      <SelectItem value="pct_growth">
                                        % ((current − relative) / relative)
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                ) : null}
                                {mathBaseCol && mathReferenceMode === "row_wise" && mathCurrentRowRef === "current_row" ? (
                                <div className="space-y-1">
                                  <Label className="text-xs">Relative row</Label>
                                  <Select value={mathRelativeRowRef} onValueChange={setMathRelativeRowRef}>
                                    <SelectTrigger className="h-9 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="prev_row">Prev row</SelectItem>
                                      <SelectItem value="next_row">Next row</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                ) : null}
                              </div>
                            )}

                            <div className="space-y-1">
                              <Label className="text-xs">Preview equation</Label>
                              <div className="min-h-9 rounded-md border border-border/60 bg-muted/20 px-2 py-1 text-xs flex items-center font-mono leading-snug">
                                {mathFunctionType === "if_else" ? (
                                  <span className="line-clamp-2">
                                    {`${mathOutCol || nextFreeResultColumnName()} = if ${mathIfClauses?.[0]?.condition?.leftColumn || "column"} ${mathIfClauses?.[0]?.condition?.operator || "="} ${mathIfClauses?.[0]?.condition?.rightKind === "column" ? (mathIfClauses?.[0]?.condition?.rightColumn || "column") : (mathIfClauses?.[0]?.condition?.rightValue || "value")} then ... else ...`}
                                  </span>
                                ) : mathFunctionType === "column" ? (
                                  `${mathOutCol || nextFreeResultColumnName()} = ${mathBasicColA || "Column A"} ${
                                    mathOp === "add" ? "+" : mathOp === "subtract" ? "−" : mathOp === "multiply" ? "×" : "÷"
                                  } ${mathBasicColB || "Column B"} (per row)`
                                ) : mathOp === "pct_growth" ? (
                                  <span className="line-clamp-2">
                                    {`${mathOutCol || nextFreeResultColumnName()} = (${mathBaseCol || "col"} − ${mathBaseCol || "col"}@${mathRelativeRowRef === "next_row" ? "next" : "prev"}) / ${mathBaseCol || "col"}@${mathRelativeRowRef === "next_row" ? "next" : "prev"} · first/last row → blank`}
                                  </span>
                                ) : (
                                  `${mathOutCol || nextFreeResultColumnName()} = ${mathBaseCol || "column"} (current row) ${
                                    mathOp === "add" ? "+" : mathOp === "subtract" ? "-" : mathOp === "multiply" ? "x" : "/"
                                  } ${mathRelativeRowRef === "next_row" ? "next row" : "prev row"}`
                                )}
                              </div>
                            </div>
                          </div>
                        </TabsContent>
                        <TabsContent value="stats" className="mt-2 space-y-4">
                          {!statsStdDevActive && !statsCumsumActive && !statsBucketActive ? (
                            <div className="flex justify-center gap-3 py-2 flex-wrap">
                              <TooltipProvider delayDuration={200}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      className="h-14 w-14 rounded-lg"
                                      aria-label="Standard deviation"
                                      onClick={() => {
                                        setStatsStdDevActive(true);
                                        setStatsCumsumActive(false);
                                        setStatsBucketActive(false);
                                        setStatsStdOutCol((prev) => (String(prev || "").trim() ? prev : nextFreeResultColumnName()));
                                        if (!statsStdSourceCol && sheetColumnNamesForMath.length > 0) {
                                          setStatsStdSourceCol(sheetColumnNamesForMath[0]);
                                        }
                                      }}
                                    >
                                      <Sigma className="h-7 w-7" aria-hidden />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom" className="text-xs">
                                    standard deviation
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <TooltipProvider delayDuration={200}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      className="h-14 w-14 rounded-lg px-1"
                                      aria-label="Cumulative sum"
                                      onClick={() => {
                                        setStatsCumsumActive(true);
                                        setStatsStdDevActive(false);
                                        setStatsBucketActive(false);
                                        setStatsCumsumOutCol((prev) => (String(prev || "").trim() ? prev : "cumsum"));
                                        if (!statsCumsumSourceCol && sheetColumnNamesForMath.length > 0) {
                                          setStatsCumsumSourceCol(sheetColumnNamesForMath[0]);
                                        }
                                      }}
                                    >
                                      <span className="font-mono text-[11px] leading-tight">cumsum()</span>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom" className="text-xs">
                                    cumulative
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <TooltipProvider delayDuration={200}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      className="h-14 w-14 rounded-lg px-1"
                                      aria-label="Bucket"
                                      onClick={() => {
                                        setStatsBucketActive(true);
                                        setStatsStdDevActive(false);
                                        setStatsCumsumActive(false);
                                        const firstCol = sheetColumnNamesForMath[0] || "";
                                        setStatsBucketColumn((prev) => (prev && sheetColumnNamesForMath.includes(prev) ? prev : firstCol));
                                        setStatsBucketOutputColumn((prev) => (String(prev || "").trim() ? prev : "bucket"));
                                        setStatsBucketSheetName((prev) => (String(prev || "").trim() ? prev : "Bucketed sheet"));
                                      }}
                                    >
                                      <span className="font-mono text-[11px] leading-tight">Bucket</span>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom" className="text-xs">
                                    group rows into a new sheet
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          ) : statsStdDevActive ? (
                            <div className="space-y-3">
                              <div className="space-y-1">
                                <Label className="text-xs">Source column</Label>
                                <Select
                                  value={statsStdSourceCol || "__"}
                                  onValueChange={(v) => setStatsStdSourceCol(v === "__" ? "" : v)}
                                >
                                  <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="Select column" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__">—</SelectItem>
                                    {sheetColumnNamesForMath.map((c) => (
                                      <SelectItem key={`stats-src-${c}`} value={c} className="font-mono text-xs">
                                        {c}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              {statsStdSourceCol ? (
                                <div className="space-y-1">
                                  <Label className="text-xs">Calculation</Label>
                                  <div className="flex flex-wrap gap-2">
                                    <Button
                                      type="button"
                                      size="sm"
                                      className="h-8 text-xs"
                                      variant={statsStdMode === "full" ? "default" : "outline"}
                                      onClick={() => setStatsStdMode("full")}
                                    >
                                      Full column
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      className="h-8 text-xs"
                                      variant={statsStdMode === "rolling" ? "default" : "outline"}
                                      onClick={() => {
                                        setStatsStdMode("rolling");
                                        if (!String(statsRollCount || "").trim()) setStatsRollCount("4");
                                      }}
                                    >
                                      Rolling
                                    </Button>
                                  </div>
                                </div>
                              ) : null}
                              {statsStdMode === "rolling" && statsStdSourceCol ? (
                                <TooltipProvider delayDuration={200}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="space-y-1 outline-none" tabIndex={0}>
                                        <Label className="text-xs">(roll count)</Label>
                                        <Input
                                          className="h-9 text-xs"
                                          inputMode="numeric"
                                          autoComplete="off"
                                          value={statsRollCount}
                                          onChange={(e) => setStatsRollCount(e.target.value.replace(/\D/g, ""))}
                                          spellCheck={false}
                                          placeholder="e.g. 4"
                                        />
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="max-w-xs text-xs">
                                      How many rows to include in rolling
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : null}
                              {statsStdSourceCol && statsStdNumericValues.length === 0 ? (
                                <Alert variant="destructive" className="py-2">
                                  <AlertTitle className="text-xs">Not a numeric column</AlertTitle>
                                  <AlertDescription className="text-xs">
                                    This column has no numeric values. Choose a column with numbers to compute standard deviation.
                                  </AlertDescription>
                                </Alert>
                              ) : null}
                              <div className="space-y-1">
                                <Label className="text-xs">New column name</Label>
                                <Input
                                  className="h-9 text-xs"
                                  value={statsStdOutCol}
                                  onChange={(e) => setStatsStdOutCol(e.target.value)}
                                  spellCheck={false}
                                  placeholder={nextFreeResultColumnName()}
                                />
                              </div>
                              {statsStdSourceCol && statsStdNumericValues.length > 0 ? (
                                <div className="space-y-1">
                                  <Label className="text-xs">Preview</Label>
                                  <div className="rounded-md border border-border/60 bg-muted/20 px-2 py-1.5 text-xs font-mono text-muted-foreground">
                                    {statsStdMode === "full" ? (
                                      <>
                                        σ({statsStdSourceCol}) ={" "}
                                        {Number(populationStandardDeviation(statsStdNumericValues)).toLocaleString(undefined, {
                                          maximumFractionDigits: 8,
                                        })}{" "}
                                        <span className="text-[11px]">(same value in every row)</span>
                                      </>
                                    ) : statsRollCountParsed ? (
                                      <span className="text-[11px] leading-snug">
                                        Rolling σ with N = {statsRollCountParsed}: rows 1–{statsRollCountParsed - 1} are blank;
                                        from row {statsRollCountParsed}, each value is population σ of the last{" "}
                                        {statsRollCountParsed} rows in {statsStdSourceCol} (including the current row).
                                      </span>
                                    ) : (
                                      <span className="text-[11px]">
                                        Enter roll count: whole number ≥ 2, digits only.
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          ) : statsBucketActive ? (
                            <div className="space-y-3">
                              <Alert className="py-2">
                                <AlertTitle className="text-xs">Bucket creates a new sheet</AlertTitle>
                                <AlertDescription className="text-xs">
                                  This groups the selected sheet into bucket rows. The current sheet will not be changed.
                                </AlertDescription>
                              </Alert>
                              <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-1">
                                  <Label className="text-xs">Column to bucket</Label>
                                  <Select
                                    value={statsBucketColumn || "__"}
                                    onValueChange={(v) => {
                                      const next = v === "__" ? "" : v;
                                      setStatsBucketColumn(next);
                                      setStatsBucketOutputColumn((prev) => (String(prev || "").trim() && prev !== "bucket" ? prev : next || "bucket"));
                                      setStatsBucketNumericSize("");
                                    }}
                                  >
                                    <SelectTrigger className="h-9 text-xs">
                                      <SelectValue placeholder="Select bucket column" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="__">—</SelectItem>
                                      {sheetColumnNamesForMath.map((c) => (
                                        <SelectItem key={`bucket-col-${c}`} value={c} className="font-mono text-xs">
                                          {c}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">New bucket column name</Label>
                                  <Input
                                    className="h-9 text-xs"
                                    value={statsBucketOutputColumn}
                                    onChange={(e) => setStatsBucketOutputColumn(e.target.value)}
                                    placeholder={statsBucketColumn || "bucket"}
                                    spellCheck={false}
                                  />
                                </div>
                              </div>
                              {statsBucketColumn ? (
                                <div className="space-y-2 rounded-md border border-border/70 p-2">
                                  <div className="grid gap-3 sm:grid-cols-2">
                                    <div className="space-y-1">
                                      <Label className="text-xs">Bucket style</Label>
                                      <Select value={statsBucketMode} onValueChange={setStatsBucketMode}>
                                        <SelectTrigger className="h-9 text-xs">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="category">Exact values</SelectItem>
                                          <SelectItem value="number" disabled={!statsBucketColumnProfile.isNumeric}>
                                            Numeric ranges
                                          </SelectItem>
                                          <SelectItem value="time" disabled={!statsBucketColumnProfile.isTemporal}>
                                            Time intervals
                                          </SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <p className="text-[10px] text-muted-foreground">
                                        {statsBucketColumnProfile.isTemporal
                                          ? "Detected as time-like. Choose the time window."
                                          : statsBucketColumnProfile.isNumeric
                                            ? `Detected numeric range ${formatBucketNumber(statsBucketColumnProfile.min)} to ${formatBucketNumber(statsBucketColumnProfile.max)}.`
                                            : "Buckets will use each distinct value."}
                                      </p>
                                    </div>
                                    {statsBucketMode === "time" ? (
                                      <div className="space-y-1">
                                        <Label className="text-xs">Time bucket</Label>
                                        <Select value={statsBucketTimeInterval} onValueChange={setStatsBucketTimeInterval}>
                                          <SelectTrigger className="h-9 text-xs">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {BUCKET_TIME_INTERVALS.map((opt) => (
                                              <SelectItem key={opt.value} value={opt.value}>
                                                {opt.label}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    ) : statsBucketMode === "number" ? (
                                      <div className="space-y-1">
                                        <Label className="text-xs">Range size</Label>
                                        <div className="flex gap-2">
                                          <Input
                                            className="h-9 min-w-0 text-xs"
                                            inputMode="decimal"
                                            value={statsBucketNumericSize}
                                            onChange={(e) => setStatsBucketNumericSize(e.target.value.replace(/[^0-9.\-]/g, ""))}
                                            placeholder={String(statsBucketColumnProfile.suggestedSize || 1)}
                                          />
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="h-9 shrink-0 text-xs"
                                            onClick={() => {
                                              const curr = Number(statsBucketNumericSize) || statsBucketColumnProfile.suggestedSize || 1;
                                              setStatsBucketNumericSize(String(niceBucketSize(curr / 2)));
                                            }}
                                          >
                                            More granular
                                          </Button>
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="h-9 shrink-0 text-xs"
                                            onClick={() => {
                                              const curr = Number(statsBucketNumericSize) || statsBucketColumnProfile.suggestedSize || 1;
                                              setStatsBucketNumericSize(String(niceBucketSize(curr * 2)));
                                            }}
                                          >
                                            Wider
                                          </Button>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground">
                                          Suggested: {formatBucketNumber(statsBucketColumnProfile.suggestedSize)} per bucket.
                                        </p>
                                      </div>
                                    ) : (
                                      <div className="space-y-1">
                                        <Label className="text-xs">Exact value buckets</Label>
                                        <div className="rounded-md border border-border/60 bg-muted/20 px-2 py-2 text-xs text-muted-foreground">
                                          One output row per distinct {statsBucketColumn} value.
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ) : null}
                              <div className="space-y-1">
                                <Label className="text-xs">New sheet name</Label>
                                <Input
                                  className="h-9 text-xs"
                                  value={statsBucketSheetName}
                                  onChange={(e) => setStatsBucketSheetName(e.target.value)}
                                  placeholder="Bucketed sheet"
                                  spellCheck={false}
                                />
                              </div>
                              <div className="space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <Label className="text-xs">Aggregations</Label>
                                  <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={addStatsBucketAggregation}>
                                    + Add aggregation
                                  </Button>
                                </div>
                                <div className="space-y-2">
                                  {normalizedStatsBucketAggregations.map((agg, idx) => (
                                    <div key={agg.id} className="rounded-lg border border-border/70 p-2">
                                      <div className="mb-2 flex items-center justify-between gap-2">
                                        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                          Aggregation {idx + 1}
                                        </span>
                                        {normalizedStatsBucketAggregations.length > 1 ? (
                                          <button
                                            type="button"
                                            className="inline-flex h-2 w-2 rounded-full bg-red-500 hover:bg-red-600"
                                            aria-label={`Remove aggregation ${idx + 1}`}
                                            onClick={() => removeStatsBucketAggregation(agg.id)}
                                          />
                                        ) : null}
                                      </div>
                                      <div className="grid gap-2 sm:grid-cols-4">
                                        <div className="space-y-1">
                                          <Label className="text-[10px] text-muted-foreground">Type</Label>
                                          <Select
                                            value={agg.type}
                                            onValueChange={(v) => {
                                              const baseName =
                                                v === "weighted_average"
                                                  ? "weighted_avg"
                                                  : v === "product_ratio"
                                                    ? "VWAP_price"
                                                  : v === "average"
                                                    ? "avg"
                                                    : v;
                                              updateStatsBucketAggregation(agg.id, {
                                                type: v,
                                                outputColumn: agg.outputColumn || baseName,
                                              });
                                            }}
                                          >
                                            <SelectTrigger className="h-8 text-xs">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="count">Count</SelectItem>
                                              <SelectItem value="sum">Sum</SelectItem>
                                              <SelectItem value="average">Average</SelectItem>
                                              <SelectItem value="weighted_average">Value weighted avg</SelectItem>
                                              <SelectItem value="product_ratio">SUM(A * B) / aggregation</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>
                                        <div className="space-y-1">
                                          <Label className="text-[10px] text-muted-foreground">
                                            {agg.type === "count" ? "Count column (optional)" : "Value column"}
                                          </Label>
                                          <Select
                                            value={agg.valueColumn || "__rows__"}
                                            onValueChange={(v) => updateStatsBucketAggregation(agg.id, { valueColumn: v === "__rows__" ? "" : v })}
                                          >
                                            <SelectTrigger className="h-8 text-xs">
                                              <SelectValue placeholder="Column" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {agg.type === "count" ? <SelectItem value="__rows__">Rows in bucket</SelectItem> : null}
                                              {sheetColumnNamesForMath.map((c) => (
                                                <SelectItem key={`bucket-agg-val-${agg.id}-${c}`} value={c} className="font-mono text-xs">
                                                  {c}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        </div>
                                        {agg.type === "weighted_average" || agg.type === "product_ratio" ? (
                                          <div className="space-y-1">
                                            <Label className="text-[10px] text-muted-foreground">
                                              {agg.type === "product_ratio" ? "Multiplier column" : "Weight column"}
                                            </Label>
                                            <Select
                                              value={agg.weightColumn || "__"}
                                              onValueChange={(v) => updateStatsBucketAggregation(agg.id, { weightColumn: v === "__" ? "" : v })}
                                            >
                                              <SelectTrigger className="h-8 text-xs">
                                                <SelectValue placeholder="Weight" />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="__">—</SelectItem>
                                                {sheetColumnNamesForMath.map((c) => (
                                                  <SelectItem key={`bucket-agg-weight-${agg.id}-${c}`} value={c} className="font-mono text-xs">
                                                    {c}
                                                  </SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          </div>
                                        ) : (
                                          <div className="hidden sm:block" />
                                        )}
                                        <div className="space-y-1">
                                          <Label className="text-[10px] text-muted-foreground">Generated column</Label>
                                          <Input
                                            className="h-8 text-xs"
                                            value={agg.outputColumn}
                                            onChange={(e) => updateStatsBucketAggregation(agg.id, { outputColumn: e.target.value })}
                                            placeholder={agg.type === "weighted_average" ? "weighted_avg" : agg.type}
                                            spellCheck={false}
                                          />
                                        </div>
                                      </div>
                                      {agg.type === "product_ratio" ? (
                                        <div className="mt-2 space-y-1 rounded-md border border-border/50 bg-muted/10 p-2">
                                          <Label className="text-[10px] text-muted-foreground">
                                            Divide by generated aggregation
                                          </Label>
                                          <Select
                                            value={agg.denominatorColumn || "__"}
                                            onValueChange={(v) => updateStatsBucketAggregation(agg.id, { denominatorColumn: v === "__" ? "" : v })}
                                          >
                                            <SelectTrigger className="h-8 text-xs">
                                              <SelectValue placeholder="Select denominator" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="__">—</SelectItem>
                                              {normalizedStatsBucketAggregations
                                                .filter((other, otherIdx) => otherIdx < idx && other.outputColumn)
                                                .map((other, otherIdx) => (
                                                  <SelectItem key={`bucket-agg-denom-${agg.id}-${other.id}`} value={other.outputColumn}>
                                                    {`Aggregation ${otherIdx + 1}: ${other.outputColumn}`}
                                                  </SelectItem>
                                                ))}
                                            </SelectContent>
                                          </Select>
                                          <p className="text-[10px] text-muted-foreground">
                                            Example: SUM(yes_price * volume) / total_volume = VWAP_price.
                                          </p>
                                        </div>
                                      ) : null}
                                      <div className="mt-2 space-y-2 rounded-md border border-border/50 bg-muted/10 p-2">
                                        <label className="flex items-center gap-2 text-xs">
                                          <Checkbox
                                            checked={!!agg.filterEnabled}
                                            onCheckedChange={(checked) =>
                                              updateStatsBucketAggregation(agg.id, {
                                                filterEnabled: !!checked,
                                                filterColumn: agg.filterColumn || sheetColumnNamesForMath[0] || "",
                                                filterOperator: agg.filterOperator || "=",
                                              })
                                            }
                                          />
                                          <span>Where condition for this aggregation</span>
                                        </label>
                                        {agg.filterEnabled ? (
                                          <div className="grid gap-2 sm:grid-cols-[1fr_0.7fr_1fr]">
                                            <div className="space-y-1">
                                              <Label className="text-[10px] text-muted-foreground">Where column</Label>
                                              <Select
                                                value={agg.filterColumn || "__"}
                                                onValueChange={(v) => updateStatsBucketAggregation(agg.id, { filterColumn: v === "__" ? "" : v })}
                                              >
                                                <SelectTrigger className="h-8 text-xs">
                                                  <SelectValue placeholder="Column" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  <SelectItem value="__">—</SelectItem>
                                                  {sheetColumnNamesForMath.map((c) => (
                                                    <SelectItem key={`bucket-agg-filter-col-${agg.id}-${c}`} value={c} className="font-mono text-xs">
                                                      {c}
                                                    </SelectItem>
                                                  ))}
                                                </SelectContent>
                                              </Select>
                                            </div>
                                            <div className="space-y-1">
                                              <Label className="text-[10px] text-muted-foreground">Op</Label>
                                              <Select
                                                value={agg.filterOperator || "="}
                                                onValueChange={(v) => updateStatsBucketAggregation(agg.id, { filterOperator: v })}
                                              >
                                                <SelectTrigger className="h-8 text-xs">
                                                  <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  {BUCKET_AGG_FILTER_OPERATORS.map((op) => (
                                                    <SelectItem key={op.value} value={op.value}>
                                                      {op.label}
                                                    </SelectItem>
                                                  ))}
                                                </SelectContent>
                                              </Select>
                                            </div>
                                            <div className="space-y-1">
                                              <Label className="text-[10px] text-muted-foreground">Value</Label>
                                              <Input
                                                className="h-8 text-xs"
                                                value={agg.filterValue ?? ""}
                                                onChange={(e) => updateStatsBucketAggregation(agg.id, { filterValue: e.target.value })}
                                                placeholder="e.g. 100"
                                                disabled={["is_empty", "is_not_empty"].includes(agg.filterOperator)}
                                              />
                                            </div>
                                          </div>
                                        ) : null}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs">Transfer columns as-is</Label>
                                <p className="text-[10px] text-muted-foreground">
                                  These values are copied from the first row in each bucket. Use this for labels that are stable inside a bucket.
                                </p>
                                <div className="grid max-h-32 gap-2 overflow-auto rounded-md border border-border/70 p-2 sm:grid-cols-2">
                                  {sheetColumnNamesForMath
                                    .filter((col) => col !== statsBucketColumn)
                                    .map((col) => (
                                      <label key={`bucket-pass-${col}`} className="flex min-w-0 items-center gap-2 text-xs">
                                        <Checkbox
                                          checked={statsBucketPassthroughCols.has(col)}
                                          onCheckedChange={() => toggleStatsBucketPassthrough(col)}
                                        />
                                        <span className="truncate font-mono">{col}</span>
                                      </label>
                                    ))}
                                </div>
                              </div>
                              {statsBucketPreviewRows.length ? (
                                <div className="space-y-1">
                                  <Label className="text-xs">Preview</Label>
                                  <div className="rounded-md border border-border/60 bg-muted/20 px-2 py-1.5 text-[11px] font-mono text-muted-foreground">
                                    {statsBucketPreviewRows.map((row) => JSON.stringify(row)).join(" · ")}
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="space-y-1">
                                <Label className="text-xs">Source column</Label>
                                <Select
                                  value={statsCumsumSourceCol || "__"}
                                  onValueChange={(v) => setStatsCumsumSourceCol(v === "__" ? "" : v)}
                                >
                                  <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="Select column" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__">—</SelectItem>
                                    {sheetColumnNamesForMath.map((c) => (
                                      <SelectItem key={`stats-cumsum-src-${c}`} value={c} className="font-mono text-xs">
                                        {c}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              {statsCumsumSourceCol && statsCumsumNumericValues.length === 0 ? (
                                <Alert variant="destructive" className="py-2">
                                  <AlertTitle className="text-xs">Not a numeric column</AlertTitle>
                                  <AlertDescription className="text-xs">
                                    This column has no numeric values. Choose a column with numbers to compute a cumulative sum.
                                  </AlertDescription>
                                </Alert>
                              ) : null}
                              <div className="space-y-1">
                                <Label className="text-xs">New column name</Label>
                                <Input
                                  className="h-9 text-xs"
                                  value={statsCumsumOutCol}
                                  onChange={(e) => setStatsCumsumOutCol(e.target.value)}
                                  spellCheck={false}
                                  placeholder="cumsum"
                                />
                              </div>
                              {statsCumsumSourceCol && statsCumsumPreviewHead ? (
                                <div className="space-y-1">
                                  <Label className="text-xs">Preview</Label>
                                  <div className="rounded-md border border-border/60 bg-muted/20 px-2 py-1.5 text-xs font-mono text-muted-foreground">
                                    {statsCumsumOutCol || "cumsum"} = cumsum({statsCumsumSourceCol}) → first values:{" "}
                                    {statsCumsumPreviewHead.map((x) => Number(x).toLocaleString(undefined, { maximumFractionDigits: 8 })).join(", ")}
                                    …
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          )}
                        </TabsContent>
                      </Tabs>
                      {!(mathDialogTab === "stats" && statsBucketActive) ? (
                        <div className="space-y-1">
                          <Label className="text-xs">Apply to</Label>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              size="sm"
                              className="h-8 text-xs"
                              variant={mathDestination === "current_sheet" ? "default" : "outline"}
                              onClick={() => setMathDestination("current_sheet")}
                            >
                              Current sheet
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              className="h-8 text-xs"
                              variant={mathDestination === "new_sheet" ? "default" : "outline"}
                              onClick={() => setMathDestination("new_sheet")}
                            >
                              New sheet
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                      <Button type="button" variant="outline" onClick={() => setMathDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        onClick={() => {
                          if (mathDialogTab === "stats") {
                            if (statsBucketActive) applyStatsBucket();
                            else if (statsCumsumActive) applyStatsCumsum();
                            else applyStatsStdDev();
                          } else applySheetMathOperation();
                        }}
                        disabled={
                          (mathDialogTab === "stats" &&
                            ((!statsStdDevActive && !statsCumsumActive && !statsBucketActive) ||
                              (statsStdDevActive && !statsStdCanSubmit) ||
                              (statsCumsumActive && !statsCumsumCanSubmit) ||
                              (statsBucketActive && !statsBucketCanSubmit))) ||
                          (mathDialogTab === "basic" &&
                            (!String(mathBasicColA || "").trim() ||
                              (mathOp !== "abs" && !String(mathBasicColB || "").trim()) ||
                              !String(mathOutCol || "").trim())) ||
                          (mathDialogTab === "functions" &&
                            (!String(mathOutCol || "").trim() ||
                              (mathFunctionType === "row_operation" && !String(mathBaseCol || "").trim()) ||
                              (mathFunctionType === "column" &&
                                (!String(mathBasicColA || "").trim() || !String(mathBasicColB || "").trim())) ||
                              (mathFunctionType === "if_else" && !ifElseCanSubmit)))
                        }
                      >
                        {mathDialogTab === "stats" && statsBucketActive ? "Create bucket sheet" : "Apply to sheet"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Combine sheets */}
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        aria-label="Combine Sheets"
                        onClick={() => {
                          const entries = Object.entries(dataSheets || {}).filter(([, s]) => Array.isArray(s?.data) && s.data.length > 0);
                          if (entries.length < 2) {
                            toast.error("Load at least two sheets before combining.");
                            return;
                          }
                          setCombineSheetsDialogOpen(true);
                          setCombineMergeMode("browser");
                          setCombineDestination("new_sheet");
                          setCombineBusy(false);
                          setCombineProgress(0);
                          setCombineProgressLabel("");
                          setCombineOutputName("");
                          setCombineLeftSheetId(entries[0][0]);
                          setCombineRightSheetId(entries[1][0]);
                          setCombineJoinType("inner");
                          setCombineLeftKeyCol("");
                          setCombineRightKeyCol("");
                        }}
                      >
                        <BarChart2 className="h-4 w-4" aria-hidden />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      Combine Sheets
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <Dialog open={combineSheetsDialogOpen} onOpenChange={setCombineSheetsDialogOpen}>
                  <DialogContent className="sm:max-w-[520px]">
                    <DialogHeader>
                      <DialogTitle>Combine Sheets</DialogTitle>
                      <DialogDescription>
                        Join two sheets. Use loaded rows only for any join type, or run Inner/Left on the full dataset in Athena
                        (same lake, compose provenance; row cap depends on your plan — subscribers pull larger result sets).
                      </DialogDescription>
                    </DialogHeader>

                    {(() => {
                      const leftSheet = combineLeftSheetId ? dataSheets?.[combineLeftSheetId] : null;
                      const rightSheet = combineRightSheetId ? dataSheets?.[combineRightSheetId] : null;
                      const leftRows = Array.isArray(leftSheet?.data) ? leftSheet.data : [];
                      const rightRows = Array.isArray(rightSheet?.data) ? rightSheet.data : [];

                      const leftCols = collectColumnNames(leftRows);
                      const rightCols = collectColumnNames(rightRows);
                      const suffix = String(rightSheet?.name || combineRightSheetId || "right").replace(/[^a-zA-Z0-9_]/g, "_") || "right";

                      const leftKeyValue = combineLeftKeyCol;
                      const rightKeyValue = combineRightKeyCol;

                      return (
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <Label className="text-xs">Combine using</Label>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant={combineMergeMode === "browser" ? "default" : "outline"}
                                className="h-8 text-xs"
                                disabled={combineBusy}
                                onClick={() => setCombineMergeMode("browser")}
                              >
                                Loaded sheets only
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant={combineMergeMode === "athena" ? "default" : "outline"}
                                className="h-8 text-xs"
                                disabled={combineBusy}
                                onClick={() => setCombineMergeMode("athena")}
                              >
                                Full dataset (Athena)
                              </Button>
                            </div>
                            <p className="text-[10px] text-muted-foreground leading-snug">
                              {combineMergeMode === "browser"
                                ? "Merges the rows already shown in each sheet. No Athena query."
                                : "Rebuilds SQL from saved lake provenance on the server. Inner or Left only."}
                            </p>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Save result to</Label>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                size="sm"
                                className="h-8 text-xs"
                                variant={combineDestination === "replace" ? "default" : "outline"}
                                disabled={combineBusy}
                                onClick={() => setCombineDestination("replace")}
                              >
                                Replace current sheet ({String(dataSheets?.[activeSheetId]?.name || activeSheetId || "—")})
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                className="h-8 text-xs"
                                variant={combineDestination === "new_sheet" ? "default" : "outline"}
                                disabled={combineBusy}
                                onClick={() => setCombineDestination("new_sheet")}
                              >
                                Create new sheet
                              </Button>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground">Output sheet name</Label>
                              <Input
                                className="h-8 text-xs"
                                value={combineOutputName}
                                onChange={(e) => setCombineOutputName(e.target.value)}
                                placeholder="e.g. joined_markets_trades"
                                spellCheck={false}
                                disabled={combineBusy}
                              />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Join type</Label>
                            <Select value={combineJoinType} onValueChange={setCombineJoinType}>
                              <SelectTrigger className="h-9 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="inner">Inner</SelectItem>
                                <SelectItem value="left">Left</SelectItem>
                                <SelectItem value="right">Right</SelectItem>
                                <SelectItem value="full">Full</SelectItem>
                                <SelectItem value="cross">Cross</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs">Left sheet</Label>
                              <Select value={combineLeftSheetId || ""} onValueChange={setCombineLeftSheetId}>
                                <SelectTrigger className="h-9 text-xs">
                                  <SelectValue placeholder="Left sheet" />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(dataSheets || {})
                                    .filter(([, s]) => Array.isArray(s?.data) && s.data.length > 0)
                                    .map(([id, s]) => (
                                      <SelectItem key={id} value={id}>
                                        {s?.name || id}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-1.5">
                              <Label className="text-xs">Right sheet</Label>
                              <Select value={combineRightSheetId || ""} onValueChange={setCombineRightSheetId}>
                                <SelectTrigger className="h-9 text-xs">
                                  <SelectValue placeholder="Right sheet" />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(dataSheets || {})
                                    .filter(([, s]) => Array.isArray(s?.data) && s.data.length > 0)
                                    .map(([id, s]) => (
                                      <SelectItem key={id} value={id}>
                                        {s?.name || id}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {combineJoinType !== "cross" && (
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <Label className="text-xs">Left join key</Label>
                                <Select
                                  value={leftKeyValue || ""}
                                  onValueChange={(v) => setCombineLeftKeyCol(v)}
                                >
                                  <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="Pick key" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {leftCols.map((c) => (
                                      <SelectItem key={c} value={c}>
                                        {c}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-1.5">
                                <Label className="text-xs">Right join key</Label>
                                <Select
                                  value={rightKeyValue || ""}
                                  onValueChange={(v) => setCombineRightKeyCol(v)}
                                >
                                  <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="Pick key" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {rightCols.map((c) => (
                                      <SelectItem key={c} value={c}>
                                        {c}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          )}

                          <div className="text-xs text-muted-foreground leading-snug">
                            {combineJoinType === "cross"
                              ? "Cross join creates every pair of rows (Cartesian product)."
                              : `Match rows where ${combineLeftKeyCol || "leftKey"} = ${combineRightKeyCol || "rightKey"}. (Right-side overlapping column names will be suffixed like name__${suffix}.)`}
                          </div>
                          {combineBusy ? (
                            <ConnectProgressWithLabel
                              label={combineProgressLabel || "Working…"}
                              progress={combineProgress}
                              className="pt-1"
                            />
                          ) : null}
                        </div>
                      );
                    })()}

                    <DialogFooter className="gap-2 sm:gap-0">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setCombineSheetsDialogOpen(false)}
                        disabled={combineBusy}
                      >
                        Cancel
                      </Button>
                      <Button type="button" onClick={() => void applyCombineSheets()} disabled={combineBusy}>
                        {combineBusy ? "Running…" : "Combine"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Remove duplicates */}
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        aria-label="Remove duplicates"
                        onClick={() => setRemoveDupsDialogOpen(true)}
                      >
                        <RotateCcw className="h-4 w-4" aria-hidden />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      Remove duplicates
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        aria-label="Refine query"
                        onClick={() => {
                          if (!Array.isArray(connectedData) || connectedData.length === 0) {
                            toast.error("Load sheet data before refining.");
                            return;
                          }
                          setRefineScope("preview");
                          setRefineDestination("replace");
                          setRefineQueryOpen(true);
                        }}
                      >
                        <Database className="h-4 w-4" aria-hidden />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      Refine query
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        aria-label="View sheet as JSON"
                        onClick={() => {
                          if (!Array.isArray(connectedData)) {
                            toast.error("No sheet data to show.");
                            return;
                          }
                          setSheetJsonViewerOpen(true);
                        }}
                      >
                        <FileJson className="h-4 w-4" aria-hidden />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      View sheet as JSON
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <Dialog open={sheetJsonViewerOpen} onOpenChange={setSheetJsonViewerOpen}>
                  <DialogContent className="sm:max-w-[min(90vw,720px)] max-h-[min(85dvh,640px)] flex flex-col gap-3">
                    <DialogHeader className="pr-20">
                      <DialogTitle>Sheet as JSON</DialogTitle>
                      <DialogDescription>
                        {(() => {
                          const nm =
                            activeSheetId && dataSheets?.[activeSheetId]?.name
                              ? String(dataSheets[activeSheetId].name)
                              : null;
                          const n = activeSheetRowsForJson.length;
                          return nm
                            ? `Active sheet “${nm}” — read-only snapshot of ${n} row${n === 1 ? "" : "s"} loaded in the grid.`
                            : `Active sheet — ${n} row${n === 1 ? "" : "s"} loaded in the grid.`;
                        })()}
                      </DialogDescription>
                      <div className="absolute right-12 top-5 flex items-center gap-1.5">
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                aria-label="Copy sheet JSON"
                                onClick={copySheetJson}
                              >
                                <Copy className="h-4 w-4" aria-hidden />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-xs">
                              Copy JSON
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                aria-label="Download sheet JSON"
                                onClick={downloadSheetJson}
                              >
                                <Download className="h-4 w-4" aria-hidden />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-xs">
                              Download JSON
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </DialogHeader>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                        <span>
                          Showing {sheetJsonLoadedCount.toLocaleString()} of {activeSheetRowsForJson.length.toLocaleString()} rows
                        </span>
                        <span>{sheetJsonLoadPct}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-slate-900 transition-[width] duration-200 dark:bg-slate-100"
                          style={{ width: `${sheetJsonLoadPct}%` }}
                        />
                      </div>
                    </div>
                    <pre
                      className="min-h-0 max-h-[min(55dvh,480px)] flex-1 overflow-auto rounded-md border border-border/60 bg-muted/30 p-3 text-[11px] leading-snug font-mono whitespace-pre break-words"
                      onScroll={handleSheetJsonScroll}
                    >
                      {`[\n`}
                      {visibleSheetJsonRows.map((row, idx) => {
                        let text = "";
                        try {
                          text = JSON.stringify(stripInternalGridFields(row), null, 2)
                            .split("\n")
                            .map((line) => `  ${line}`)
                            .join("\n");
                        } catch (e) {
                          text = `  ${JSON.stringify({ error: "Could not serialize row", detail: String(e?.message || e) })}`;
                        }
                        const hasMoreRows = idx < visibleSheetJsonRows.length - 1;
                        return `${text}${hasMoreRows ? "," : ""}\n`;
                      })}
                      {`]`}
                    </pre>
                    <div className="min-h-4 text-[10px] text-muted-foreground">
                      {sheetJsonAppending
                        ? "Loading more JSON rows..."
                        : sheetJsonLoadedCount < activeSheetRowsForJson.length
                          ? `${(activeSheetRowsForJson.length - sheetJsonLoadedCount).toLocaleString()} more row${activeSheetRowsForJson.length - sheetJsonLoadedCount === 1 ? "" : "s"} available. Scroll to load more.`
                          : "All loaded rows are visible."}
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setSheetJsonViewerOpen(false)}>
                        Close
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={refineQueryOpen} onOpenChange={setRefineQueryOpen}>
                  <DialogContent className="sm:max-w-lg max-h-[min(90dvh,640px)] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Refine query</DialogTitle>
                      <DialogDescription>
                        Select columns and an optional numeric filter. Run on loaded rows only, or re-query the full dataset in
                        Athena using this sheet&apos;s provenance (row cap depends on your plan). Choose
                        whether to replace the active sheet or open a new one with the result.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-xs">Apply result to</Label>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant={refineDestination === "replace" ? "default" : "outline"}
                            className="h-8 text-xs"
                            disabled={refineBusy}
                            onClick={() => setRefineDestination("replace")}
                          >
                            This sheet
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={refineDestination === "new_sheet" ? "default" : "outline"}
                            className="h-8 text-xs"
                            disabled={refineBusy}
                            onClick={() => setRefineDestination("new_sheet")}
                          >
                            New sheet
                          </Button>
                        </div>
                        {refineDestination === "new_sheet" ? (
                          <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground">New sheet name</Label>
                            <Input
                              className="h-8 text-xs"
                              value={refineNewSheetName}
                              onChange={(e) => setRefineNewSheetName(e.target.value)}
                              placeholder="e.g. priced_trades_refined"
                              spellCheck={false}
                              disabled={refineBusy}
                            />
                          </div>
                        ) : null}
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Run against</Label>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant={refineScope === "preview" ? "default" : "outline"}
                            className="h-8 text-xs"
                            onClick={() => setRefineScope("preview")}
                          >
                            This sheet only
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={refineScope === "athena" ? "default" : "outline"}
                            className="h-8 text-xs"
                            onClick={() => setRefineScope("athena")}
                          >
                            Full dataset (Athena)
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Columns to keep</Label>
                        <div className="max-h-40 overflow-y-auto rounded-md border border-border/60 p-2 space-y-2">
                          {sheetColumnsForProps.length === 0 ? (
                            <p className="text-xs text-muted-foreground">No columns found.</p>
                          ) : (
                            sheetColumnsForProps.map((col) => (
                              <label key={col} className="flex items-center gap-2 text-xs cursor-pointer select-none">
                                <Checkbox
                                  checked={refineSelectedCols.has(col)}
                                  onCheckedChange={() => {
                                    setRefineSelectedCols((prev) => {
                                      const n = new Set(prev);
                                      if (n.has(col)) n.delete(col);
                                      else n.add(col);
                                      return n;
                                    });
                                  }}
                                />
                                <span className="font-mono">{col}</span>
                              </label>
                            ))
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Optional numeric filter (WHERE)</Label>
                        <div className="flex flex-wrap gap-2 items-end">
                          <div className="space-y-1 min-w-[7rem] flex-1">
                            <Label className="text-[10px] text-muted-foreground">Column</Label>
                            <Select value={refineWhereCol || ""} onValueChange={setRefineWhereCol}>
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Column" />
                              </SelectTrigger>
                              <SelectContent>
                                {sheetColumnsForProps.map((c) => (
                                  <SelectItem key={c} value={c} className="text-xs font-mono">
                                    {c}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1 min-w-[8rem]">
                            <Label className="text-[10px] text-muted-foreground">Operator</Label>
                            <Select value={refineWhereOp} onValueChange={setRefineWhereOp}>
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="gte" className="text-xs">
                                  ≥
                                </SelectItem>
                                <SelectItem value="lte" className="text-xs">
                                  ≤
                                </SelectItem>
                                <SelectItem value="gt" className="text-xs">
                                  &gt;
                                </SelectItem>
                                <SelectItem value="lt" className="text-xs">
                                  &lt;
                                </SelectItem>
                                <SelectItem value="eq" className="text-xs">
                                  =
                                </SelectItem>
                                <SelectItem value="neq" className="text-xs">
                                  ≠
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1 min-w-[6rem] flex-1">
                            <Label className="text-[10px] text-muted-foreground">Value</Label>
                            <Input
                              className="h-8 text-xs"
                              type="number"
                              value={refineWhereVal}
                              onChange={(e) => setRefineWhereVal(e.target.value)}
                              placeholder="e.g. 100"
                            />
                          </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          Leave value empty to skip the WHERE clause (all rows pass).
                        </p>
                      </div>
                      {refineBusy ? (
                        <ConnectProgressWithLabel label={refineProgressLabel || "Working…"} progress={refineProgress} />
                      ) : null}
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                      <Button type="button" variant="outline" onClick={() => setRefineQueryOpen(false)} disabled={refineBusy}>
                        Cancel
                      </Button>
                      <Button type="button" onClick={() => void applyRefineQuery()} disabled={refineBusy}>
                        {refineBusy ? "Running…" : "Run"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={removeDupsDialogOpen} onOpenChange={setRemoveDupsDialogOpen}>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Remove duplicates</DialogTitle>
                      <DialogDescription>
                        Deduplicate rows in the current sheet (row-level, like SQL DISTINCT).
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                      <Button type="button" variant="outline" onClick={() => setRemoveDupsDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="button" onClick={applyRemoveDuplicates}>
                        Remove duplicates
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <div className="ml-auto" />
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        className={cn(
                          "inline-flex shrink-0 items-center justify-center self-center",
                          fillViewport ? "h-7" : "h-9",
                        )}
                      >
                        <DestructiveIconButton ariaLabel="clear sheet" onClick={handleClearSheet} />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      clear sheet
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <TabsContent value="sort-filter" className="mt-3">
                <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 p-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                        <Filter className="h-3.5 w-3.5" />
                        Sort / Select / Filter
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-52" align="start">
                      <DropdownMenuLabel className="text-xs">Filter & date</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {dateColumns.length > 0 && (
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger className="text-xs">
                            <Calendar className="h-3.5 w-3.5 mr-2" />
                            Date range
                          </DropdownMenuSubTrigger>
                          <DropdownMenuPortal>
                            <DropdownMenuSubContent className="w-56 p-2">
                              <DropdownMenuLabel className="text-xs">Column</DropdownMenuLabel>
                              <Select value={filterState.dateColumn || ''} onValueChange={(v) => setFilterState((p) => ({ ...p, dateColumn: v || null }))}>
                                <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="Pick column" /></SelectTrigger>
                                <SelectContent>
                                  {dateColumns.map((col) => (
                                    <SelectItem key={col} value={col} className="text-xs">{col}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Label className="text-[10px] text-muted-foreground mt-2 block">From</Label>
                              <Input type="date" className="h-8 text-xs mt-0.5" value={filterState.dateFrom} onChange={(e) => setFilterState((p) => ({ ...p, dateFrom: e.target.value }))} />
                              <Label className="text-[10px] text-muted-foreground mt-1 block">To</Label>
                              <Input type="date" className="h-8 text-xs mt-0.5" value={filterState.dateTo} onChange={(e) => setFilterState((p) => ({ ...p, dateTo: e.target.value }))} />
                            </DropdownMenuSubContent>
                          </DropdownMenuPortal>
                        </DropdownMenuSub>
                      )}
                      {colKeys.map((col) => {
                        const options = distinctByColumn[col] || [];
                        if (options.length === 0 || options.length > 100) return null;
                        return (
                          <DropdownMenuSub key={col}>
                            <DropdownMenuSubTrigger className="text-xs">
                              <span className="truncate">Filter: {col}</span>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                              <DropdownMenuSubContent className="max-h-[220px] w-56 overflow-y-auto">
                                <DropdownMenuGroup>
                                  <DropdownMenuLabel className="text-xs">Values</DropdownMenuLabel>
                                  {(options.slice(0, 60)).map((val) => {
                                    const selected = filterState.categoryFilters?.[col] || [];
                                    const isChecked = selected.includes(val);
                                    return (
                                      <DropdownMenuCheckboxItem
                                        key={val}
                                        checked={isChecked}
                                        onCheckedChange={(checked) => {
                                          const next = checked ? [...selected, val] : selected.filter((x) => x !== val);
                                          setCategoryFilter(col, next);
                                        }}
                                      >
                                        <span className="truncate">{String(val).slice(0, 40)}{String(val).length > 40 ? '…' : ''}</span>
                                      </DropdownMenuCheckboxItem>
                                    );
                                  })}
                                  {options.length > 60 && <div className="px-2 py-1 text-[10px] text-muted-foreground">+{options.length - 60} more</div>}
                                </DropdownMenuGroup>
                              </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                          </DropdownMenuSub>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <div className="flex items-center gap-1.5">
                    <Label className="text-xs text-muted-foreground whitespace-nowrap">Sort by</Label>
                    <Select value={filterState.sortKey || ''} onValueChange={(v) => setFilterState((p) => ({ ...p, sortKey: v || null }))}>
                      <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue placeholder="Column" /></SelectTrigger>
                      <SelectContent>
                        {colKeys.map((col) => (
                          <SelectItem key={col} value={col} className="text-xs">{col}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {filterState.sortKey && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 shrink-0"
                        onClick={() => setFilterState((p) => ({ ...p, sortDir: p.sortDir === 'asc' ? 'desc' : 'asc' }))}
                        title={filterState.sortDir === 'asc' ? 'Descending' : 'Ascending'}
                      >
                        {filterState.sortDir === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
                      </Button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 ml-auto min-w-0">
                    {filterState.dateColumn && (filterState.dateFrom || filterState.dateTo) && (
                      <Badge variant="secondary" className="text-[10px] gap-1 pr-1 pl-2 py-0.5">
                        <Calendar className="h-3 w-3" />
                        {filterState.dateColumn}: {filterState.dateFrom || '…'} → {filterState.dateTo || '…'}
                        <button type="button" className="rounded-full hover:bg-muted p-0.5" onClick={() => setFilterState((p) => ({ ...p, dateColumn: null, dateFrom: '', dateTo: '' }))} aria-label="Remove date filter">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )}
                    {filterState.sortKey && (
                      <Badge variant="secondary" className="text-[10px] gap-1 pr-1 pl-2 py-0.5">
                        <ArrowUpDown className="h-3 w-3" />
                        {filterState.sortKey} {filterState.sortDir === 'asc' ? '↑' : '↓'}
                        <button type="button" className="rounded-full hover:bg-muted p-0.5" onClick={() => setFilterState((p) => ({ ...p, sortKey: null, sortDir: 'asc' }))} aria-label="Remove sort">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )}
                    {Object.entries(filterState.categoryFilters || {}).map(([col, values]) => {
                      if (!values?.length) return null;
                      return (
                        <Badge key={col} variant="secondary" className="text-[10px] gap-1 pr-1 pl-2 py-0.5">
                          {col}: {values.length} selected
                          <button type="button" className="rounded-full hover:bg-muted p-0.5" onClick={() => setCategoryFilter(col, [])} aria-label={`Remove filter ${col}`}>
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              </TabsContent>
              </>
              )}
              <TabsContent value="table" className="mt-0" />
            </Tabs>
            )}
            {isSheetLoading ? (
              <GridSheetLoadingState
                fillViewport={fillViewport}
                compact={fillViewport}
                label={sheetLoadingLabel}
                progress={sheetLoadingProgress}
              />
            ) : (
            <div
                className={cn(
                    agThemeClass,
                    fillViewport && connectGridAgCompactClass,
                    fillViewport ? connectGridFillViewportClass : gridExpanded ? "h-[750px]" : "h-[550px]",
                )}
            >
                <AgGridReact 
                    defaultColDef={defaultColDef} 
                    rowData={displayData} 
                    columnDefs={columnDefsWithMeta} 
                    pagination={true}
                    paginationPageSize={SHEET_GRID_PAGE_SIZE}
                    onCellValueChanged={(event) => {
                        const field = event.colDef?.field;
                        const newValue = event.newValue;
                        if (field && event.data) updateCellData(event.data, field, newValue);
                    }}
                    gridOptions={gridOptions}
                    autoSizeStrategy={autoSizeStrategy}
                    />
            </div>
            )}
        </div>
    )



}

export default GridView;