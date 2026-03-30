import { useEffect, useMemo, useState, useCallback } from "react";

import { useMyStateV2  } from '@/context/stateContextV2'

import { AgGridReact } from 'ag-grid-react'; // React Grid Logic
import "ag-grid-community/styles/ag-grid.css"; // Core CSS
import "ag-grid-community/styles/ag-theme-quartz.css"; // Theme


import { PlusIcon } from "@radix-ui/react-icons"
import { toast } from "sonner"

import { Menu } from './menu'

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
import { Alert } from '@/components/ui/alert'
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
  Download,
  BarChart2,
  Sigma,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import * as XLSX from 'xlsx';


const DATE_LIKE = /^\d{4}-\d{2}-\d{2}/;
// Labels produced by the Athena compose "dateBucket" formatter.
// Examples: "Q1 '24", "2024-03", "2024"
const QUARTER_LIKE = /^Q([1-4])\s*'?\s*(\d{2})$/i;
const MONTH_LIKE = /^(\d{4})-(\d{2})$/;
const YEAR_LIKE = /^(\d{4})$/;

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

const GridView = ({startNew}) => {

    const contextStateV2 = useMyStateV2()

    let connectedCols = contextStateV2?.connectedCols || []
    let setConnectedCols = contextStateV2?.setConnectedCols || []
    let connectedData = contextStateV2?.connectedData || []
    let setConnectedData = contextStateV2?.setConnectedData || []
    const replaceCurrentSheetData = contextStateV2?.replaceCurrentSheetData
    let dataSheets = contextStateV2?.dataSheets || {}
    
    const [columnName, setColumnName] = useState('');
    const [colAddOpen, setColAddOpen] = useState()
    const [gridExpanded, setGridExpanded] = useState()

    const [summarizeOpen, setSummarizeOpen] = useState(false);
    const [mathDialogOpen, setMathDialogOpen] = useState(false);
    const [mathOp, setMathOp] = useState("add");
    const [mathColA, setMathColA] = useState("");
    const [mathColB, setMathColB] = useState("");
    const [mathOutCol, setMathOutCol] = useState("result");

    // Combine Sheets (client-side join across already-loaded sheets)
    const [combineSheetsDialogOpen, setCombineSheetsDialogOpen] = useState(false);
    const [combineJoinType, setCombineJoinType] = useState("inner"); // inner | left | right | full | cross
    const [combineLeftSheetId, setCombineLeftSheetId] = useState(null);
    const [combineRightSheetId, setCombineRightSheetId] = useState(null);
    const [combineLeftKeyCol, setCombineLeftKeyCol] = useState("");
    const [combineRightKeyCol, setCombineRightKeyCol] = useState("");

    // Remove duplicates (row-level)
    const [removeDupsDialogOpen, setRemoveDupsDialogOpen] = useState(false);
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

    const applySheetMathOperation = useCallback(() => {
      const rows = Array.isArray(connectedData) ? [...connectedData] : [];
      if (!rows.length) {
        toast.error("Load sheet data before running a column calculation.");
        return;
      }
      const a = String(mathColA || "").trim();
      const b = String(mathColB || "").trim();
      const out = String(mathOutCol || "").trim();
      if (!a || !b || !out) {
        toast.error("Choose two columns and an output column name.");
        return;
      }
      const next = rows.map((row) => {
        if (!row || typeof row !== "object") return row;
        const x = Number(row[a]);
        const y = Number(row[b]);
        let v = NaN;
        if (mathOp === "add") v = x + y;
        else if (mathOp === "subtract") v = x - y;
        else if (mathOp === "multiply") v = x * y;
        else if (mathOp === "divide") v = y === 0 ? NaN : x / y;
        return { ...row, [out]: Number.isFinite(v) ? v : null };
      });
      replaceCurrentSheetData?.(next);
      setConnectedData?.(next);
      toast.success("Applied calculation to sheet.");
      setMathDialogOpen(false);
    }, [connectedData, mathColA, mathColB, mathOp, mathOutCol, replaceCurrentSheetData, setConnectedData]);

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

    const applyCombineSheets = useCallback(() => {
      setCombineSheetsDialogOpen(false);
      try {
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
            toast.error("Selected join keys must exist in both sheets.");
            return;
          }
        }

        const rightSuffixRaw = rightSheet?.name || combineRightSheetId || "right";
        const rightSuffix = String(rightSuffixRaw).replace(/[^a-zA-Z0-9_]/g, "_") || "right";

        const getRightOutKey = (col) => {
          // Only suffix for right-side column name collisions with left columns.
          return leftCols.includes(col) ? `${col}__${rightSuffix}` : col;
        };

        const outRows = [];

        if (joinType === "cross") {
          // Cartesian product; we always include right join keys too (since there is no "ON").
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
          const rightKeyIndex = new Map(); // keyStr -> array of { idx, row }
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

          const leftKeyOutCol = leftKeyCol; // left base naming

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

          // LEFT loop: emits matched rows and (if needed) unmatched left rows.
          for (const l of leftData) {
            const lKeyVal = l?.[leftKeyCol];
            const lKeyStr = lKeyVal === null || lKeyVal === undefined ? "NULL" : typeof lKeyVal === "object" ? JSON.stringify(lKeyVal) : String(lKeyVal);
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

          // RIGHT side unmatched rows: only for RIGHT/FULL.
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

        replaceCurrentSheetData?.(outRows);
        setConnectedData?.(outRows);
        toast.success("Sheets combined.");
      } finally {
        // ensure modal closes even if something throws
        setCombineSheetsDialogOpen(false);
      }
    }, [
      combineJoinType,
      combineLeftKeyCol,
      combineLeftSheetId,
      combineRightKeyCol,
      combineRightSheetId,
      dataSheets,
      replaceCurrentSheetData,
      setConnectedData,
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
    const defaultColDef = useMemo(() => ({
        filter: true, // Enable filtering on all columns
        //maxWidth: 120,
        editable: true,
        background: {visible: false},
        resizable: true,
        singleClickEdit: true,
        stopEditingWhenCellsLoseFocus : true,
    }))

    const autoSizeStrategy = {
        type: 'fitGridWidth',
        defaultMinWidth: 100,
    };

    const gridOptions = useMemo(()=> ({
        onCellClicked: (e) => toast(`Hit Enter to accept change`, {
            duration: 5000
        }),
    }))

    const updateCellData = (rowIndex, field, newValue) => {
        if (field === '_origIndex') return;
        if (newValue === "PRETTY PLEASE DELETE ROW") {
            handleDeleteRow(rowIndex);
            return;
        }
        const row = displayData[rowIndex];
        const origIndex = row && row._origIndex;
        if (origIndex == null) return;
        setConnectedData((prevData) => {
          const newData = prevData.map((item, index) =>
            index === origIndex ? { ...item, [field]: newValue } : item
          );
          return newData;
        });
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

    const handleDeleteRow = (displayRowIndex) => {
        const row = displayData[displayRowIndex];
        const origIndex = row && row._origIndex;
        if (origIndex == null) return;
        setConnectedData((prevData) => prevData.filter((_, index) => index !== origIndex));
        toast('Row deleted!', { duration: 5000 });
    };
    

    useEffect(()=>{
        startNew && setConnectedData([])
    }, [startNew])

    return (
        <div className="ag-theme-quartz" style={{ height: '100%', width: '100%' }}>
            <Alert className="mt-4 sm:hidden">
                <div className="flex gap-2 place-items-center"><TrafficCone className="w-8 h-8"/>
                    <div className="">
                        <p className="text-xs">Looks like you're on-the-go!</p>
                        <p className="text-xs text-muted-foreground">I tried to keep it mobile-friendly, but Lychee really flexes its muscles on bigger screens.</p>
                    </div>
                </div>
            </Alert>  
            {connectedData && connectedData.length > 0 && (
            <Tabs defaultValue="table" className="w-full min-w-0">
              <div className="flex flex-wrap items-center gap-2 py-2 border-b">
                <TabsList className="h-9">
                  <TabsTrigger value="table" className="text-xs">Table</TabsTrigger>
                  <TabsTrigger value="sort-filter" className="text-xs gap-1">
                    <Filter className="h-3.5 w-3.5" />
                    Sort & filter
                  </TabsTrigger>
                </TabsList>
                <div className="h-4 w-px bg-border shrink-0" />
                <Menu compact />
                <Dialog open={colAddOpen} onOpenChange={setColAddOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                      <PlusIcon className="h-3.5 w-3.5" />
                      Add Column
                    </Button>
                  </DialogTrigger>
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
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={handleAddRow}>
                  <PlusIcon className="h-3.5 w-3.5" />
                  Add Row
                </Button>
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
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Mathematics Operations</DialogTitle>
                      <DialogDescription>
                        Row-wise math on the current sheet (like an Excel formula). Pick two numeric columns and an
                        output column name.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-3 sm:grid-cols-2 py-2">
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
                            <SelectItem value="divide">Divide (A ÷ B)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Output column name</Label>
                        <Input
                          className="h-9 text-xs"
                          value={mathOutCol}
                          onChange={(e) => setMathOutCol(e.target.value)}
                          spellCheck={false}
                          placeholder="result"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Column A</Label>
                        <Select value={mathColA || "__"} onValueChange={(v) => setMathColA(v === "__" ? "" : v)}>
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="Select column" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__">—</SelectItem>
                            {sheetColumnNamesForMath.map((c) => (
                              <SelectItem key={c} value={c} className="font-mono text-xs">
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Column B</Label>
                        <Select value={mathColB || "__"} onValueChange={(v) => setMathColB(v === "__" ? "" : v)}>
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="Select column" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__">—</SelectItem>
                            {sheetColumnNamesForMath.map((c) => (
                              <SelectItem key={`math-b-${c}`} value={c} className="font-mono text-xs">
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                      <Button type="button" variant="outline" onClick={() => setMathDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="button" onClick={applySheetMathOperation}>
                        Apply to sheet
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
                        Join multiple already-loaded sheets (like SQL JOIN) to create a new combined sheet.
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
                        </div>
                      );
                    })()}

                    <DialogFooter className="gap-2 sm:gap-0">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setCombineSheetsDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="button" onClick={applyCombineSheets}>
                        Combine
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
              </div>
              <TabsContent value="sort-filter" className="mt-3">
                <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg border bg-muted/30">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
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
              <TabsContent value="table" className="mt-0" />
            </Tabs>
            )}
            <div className={gridExpanded ? 'h-[750px]' :'h-[550px]'}>
                <AgGridReact 
                    defaultColDef={defaultColDef} 
                    rowData={displayData} 
                    columnDefs={columnDefsWithMeta} 
                    pagination={true}
                    onCellValueChanged={(event) => {
                        const rowIndex = event.rowIndex;
                        const field = event.colDef?.field;
                        const newValue = event.newValue;
                        if (field) updateCellData(rowIndex, field, newValue);
                    }}
                    gridOptions={gridOptions}
                    autoSizeStrategy={autoSizeStrategy}
                    />
            </div>
        </div>
    )



}

export default GridView;